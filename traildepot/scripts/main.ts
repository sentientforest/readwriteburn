import { 
  addRoute,
  execute,
  HttpError,
  jsonHandler,
  parsePath,
  query,
  StatusCodes
} from "../trailbase.js";

import {
  BURN_GATEWAY_API,
  BURN_GATEWAY_PUBLIC_KEY_API
} from "../trailbase.env.js";

import * as sanitize from "./sql-sanitizer/modules/sql_injection.js";

// very basic XSS mitigation
// trailbase has a limited JS runtime, so importing a full featured Node.js module 
// is not possible here. This is sufficent for basic, example, non-production use cases
const xssRe = /[<>/"'`;(){}[\]]/g;

const basicXssSanitize = (input: string) => {
  return input.replace(xssRe, '');
};

// copied from trailbase client npm module 

// https://github.com/trailbaseio/trailbase/blob/0f1d38732fde0de3ae261e21deb2a75549ca9536/trailbase-core/js/client/src/index.ts#L530
/// Decode a base64 string to bytes.
export function base64Decode(base64: string): string {
  return atob(base64);
}

// https://github.com/trailbaseio/trailbase/blob/0f1d38732fde0de3ae261e21deb2a75549ca9536/trailbase-core/js/client/src/index.ts#L535
/// Decode a "url-safe" base64 string to bytes.
export function urlSafeBase64Decode(base64: string): string {
  return base64Decode(base64.replace(/_/g, "/").replace(/-/g, "+"));
}

// end copy/paste from trailbase client

function uint8ArrayToHex(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0')) // Convert each byte to a 2-digit hex string
    .join(''); // Join all hex strings together
}

function isValidHexadecimal(str) {
  const hexRegex = /^[0-9A-Fa-f]+$/;
  return hexRegex.test(str);
}

// trailbase uses sqlite uuid7 identifiers stored as binary blobs in sqlite for primary keys 
// in order to reference these binary keys in SQL statements we use a hex representation 
// and the X'' syntax 
function convertIdToHex(id: unknown): string {
  const decodedId = Uint8Array.from(urlSafeBase64Decode(id as string), (c) => c.charCodeAt(0));
  const hexId = uint8ArrayToHex(decodedId);

  if (!isValidHexadecimal(hexId)) {
    throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Invalid id`)
  }

  return hexId;
}

// data shape shared between basic tables that define an entity id, name, description 
function mapBasicRow(row: unknown[]) {
  const [id, name, description] = row;

  return { id, name, description };
}

// write input from client, only needs id of entity to reference for 
// junction table foreign keys 
export interface AssociativeId {
  id: string;
}

// full entity, for responses sent to client which need readable display data 
export interface AssociativeEntity extends AssociativeId {
  name: string;
  description?: string;
}

export interface SavePizzaSelectionDto {
  id: string;
  name: string;
  contributor?: string;
  description?: string;
  crust: AssociativeId;
  sauce: AssociativeId;
  toppings: AssociativeId[];
}

export interface PizzaSelectionResDto {
  id: string;
  name: string;
  contributor: string;
  crust: AssociativeEntity;
  sauce: AssociativeEntity;
  toppings: AssociativeEntity[];
}

export interface BurnGalaDto {

}

export interface BurnAndSavePizzaSelectionDto {
  pizza: SavePizzaSelectionDto;
  burnDto: BurnGalaDto;
}

addRoute(
  "GET",
  "/pizza-menu",
  jsonHandler(async (req) => {
    const crustRows = await query(
      `SELECT id, name, description FROM pizza_crust_styles`,
      []
    );

    const sauceRows = await query(
      `SELECT * FROM pizza_sauces`,
      []
    );

    const toppingRows = await query(
      `SELECT * FROM pizza_toppings`,
      []
    );

    const crusts = crustRows.map(mapBasicRow);
    const sauces = sauceRows.map(mapBasicRow);
    const toppings = toppingRows.map(mapBasicRow);

    return { crusts, sauces, toppings };
  })
);

const samplePizzaRequest = {
  id: "test",
  name: "Pepperoni, Pineapple, Jalapeno",
  contributor: "Billy Bob",
  description: "",
  crust:     {
    id: "AZRHauhlcAKoHiCi4hnU1g==",
    name: "Thin Crust",
    description: "A light and thin crust"
  },
  sauce:     {
    id: "AZRHcPZ9etOhFzyMcW9Jtw==",
    name: "Marinara",
    description: ""
  },
  toppings: [
    // double pepperoni
    { "id": "AZRHdI2BeZKlccM-uBvbRQ==", name: "Pepperoni" },
    { "id": "AZRHdI2BeZKlccM-uBvbRQ==", name: "Pepperoni" },
    { "id": "AZRHd_AadTODHLUZKyJWwQ==", name: "Pineapple" },
    { "id": "AZRHeDKvdMGGbe7MsNCFTA==", name: "Jalapeno" }
  ]
};

async function queryPizzaAndConstructResponse(id: string): Promise<PizzaSelectionResDto> {
  const pizza = await query(
    `SELECT id, name, contributor, description, crust_id, sauce_id 
    FROM pizza 
    WHERE id = FORMAT("[%f]", $1)`,
    [id]
  );

  return samplePizzaRequest;
}

addRoute(
  "GET",
  "/pizza",
  jsonHandler(async (req) => {
    const searchParams = parsePath(req.uri).query;

    const id = searchParams.get("id");

    if (id) {
      return queryPizzaAndConstructResponse(id);
    }

    return samplePizzaRequest;
  })
);

addRoute(
  "POST",
  "/pizza",
  jsonHandler(async (req) => {
    let dto: SavePizzaSelectionDto;

    if (req.body === undefined) {
      throw new HttpError(StatusCodes.BAD_REQUEST, "Bad Request\n");
    } else if(typeof req.body === "string") {
      try {
        dto = JSON.parse(req.body);
      } catch (e) {
        throw new HttpError(StatusCodes.BAD_REQUEST, "Bad Request - invalid JSON\n");
      }
    } else {
      dto = req.body as SavePizzaSelectionDto;
    }

    const name = basicXssSanitize(dto.name);
    const contributor = basicXssSanitize(dto.contributor ?? "");
    const description = basicXssSanitize(dto.description ?? "");
    const crust = basicXssSanitize(dto.crust.id);
    const sauce = basicXssSanitize(dto.sauce.id);

    if (
      sanitize.detectSqlInjection(name) || 
      sanitize.detectSqlInjection(contributor) || 
      sanitize.detectSqlInjection(description) || 
      // fields with base64 encoded UUID7 id foreign keys contain "="
      // setting level to 4 (default 5) slightly loosens the sql injection check 
      sanitize.detectSqlInjection(crust, 4) || 
      sanitize.detectSqlInjection(sauce, 4) || 
      sanitize.detectSqlInjection(dto.toppings.map((t) => t.id).join(""), 4)
    ) {
      console.log(`SQL injection detected: ${name}, ${contributor}, ${description}, ${crust}, ${sauce}`)
      throw new HttpError(StatusCodes.FORBIDDEN);
    }

    const crustId = convertIdToHex(crust);
    const sauceId = convertIdToHex(sauce);

    const toppingIds = dto.toppings.map((t) => convertIdToHex(t.id));

    console.log(`saving pizza with foreign keys: ${crust} / ${crustId}, ${sauce} / ${sauceId}`);
    await execute(`
      INSERT INTO 
      pizzas (id, name, contributor, description, crust_id, sauce_id) 
      VALUES (
        uuid_v7(), '${name}', '${contributor}', '${description}', X'${crustId}', X'${sauceId}'
      );
      `, []);

    console.log("saved pizza");

    const savedRow = await query(`SELECT id FROM pizzas WHERE name = '${name}'`, []);

    console.log("retrieved saved pizza");

    const savedId = savedRow[0][0];

    if (typeof savedId !== "string") {
      throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, `Error saving: ${savedId}`);
    }

    const pizzaId = convertIdToHex(savedId);

    console.log("pizzaId: ", pizzaId);

    for (const toppingId of toppingIds) {
      console.log(`insert association: ${pizzaId}, ${toppingId}`);

      await execute(`INSERT INTO 
        pizza_topping_associations (id, pizza_id, topping_id) 
        VALUES (uuid_v7(), X'${pizzaId}', X'${toppingId}');
      `, []);
    }

    dto.id = savedId;

    return dto;
  })
);

addRoute(
  "GET",
  "/test",
  jsonHandler(async (req) => {
    const data = await fetch("https://gateway-mainnet.galachain.com/api/asset/token-contract/FetchTokenSwapsByInstanceOffered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({"collection": "GALA"})
    })
      .then((response) => response.json())
      .then((data) => data);

    return {
      status: 200,
      menu: data
    }
  })
);



addRoute(
  "GET",
  "/id",
  jsonHandler(async (req) => {
    const toppingRows = await query(
      `SELECT * FROM pizza_toppings`,
      []
    );

    const firstId = toppingRows[0][0];

    const hexId = convertIdToHex(firstId);

    const lookup = await query(
      `SELECT * FROM pizza_toppings 
      WHERE id = X'${hexId}'`,
      []
    )
    return { test: firstId, lookup };
  })
)

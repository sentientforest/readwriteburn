import { ChainUser, RegisterEthUserDto, createValidDTO, createValidSubmitDTO } from "@gala-chain/api";
import { Request, Response } from "express";
import fs from "fs";

let adminPrivateKeyString: string = process.env.CHAIN_ADMIN_SECRET_KEY ?? "";
const adminPrivateKeyPath: string | undefined = process.env.CHAIN_ADMIN_SECRET_KEY_PATH;

export function getAdminPrivateKey() {
  if (!adminPrivateKeyString && !adminPrivateKeyPath) {
    const msg = "Server identity private key not found";
    console.log(msg);
    return "";
  }

  if (adminPrivateKeyString) {
    return adminPrivateKeyString;
  } else if (adminPrivateKeyPath) {
    adminPrivateKeyString = fs.readFileSync(adminPrivateKeyPath).toString();
  }

  return adminPrivateKeyString;
}

export function randomUniqueKey(): string {
  return `${Math.floor(Date.now() * (Math.random() * 1000))}`;
}

export async function registerRandomEthUser(req: Request, res: Response) {
  const adminPrivateKeyString = getAdminPrivateKey();

  if (!adminPrivateKeyString) {
    return res.status(500).json({ message: "Internal Server Error" });
  }

  const apiBase = process.env.CHAIN_API;
  const channel = process.env.PRODUCT_CHANNEL ?? "product";
  const url = `${apiBase}/api/${channel}/PublicKeyContract/RegisterEthUser`;

  const newUser = ChainUser.withRandomKeys();

  const dto = new RegisterEthUserDto();
  dto.publicKey = newUser.publicKey;
  dto.uniqueKey = randomUniqueKey();
  dto.sign(adminPrivateKeyString, false);

  const chainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: dto.serialize()
  });

  if (!chainRes.ok) {
    return res.status(500).send({
      url: url,
      status: chainRes.status,
      body: chainRes.body,
      dto: dto.serialize(),
      user: newUser
    });
  }

  res.json({
    response: await chainRes.json(),
    user: newUser
  });
}

export async function registerEthUser(req: Request, res: Response) {
  const adminPrivateKeyString = getAdminPrivateKey();

  if (!adminPrivateKeyString) {
    return res.status(500).json({ message: "Internal Server Error" });
  }

  const apiBase = process.env.CHAIN_API;
  const channel = process.env.PRODUCT_CHANNEL ?? "product";
  const url = `${apiBase}/api/${channel}/PublicKeyContract/RegisterEthUser`;

  console.log(req.headers);

  const requestBody = req.body;

  if (!requestBody || typeof requestBody.publicKey !== "string") {
    return res.status(400).send("Bad Request\n");
  }

  const dto = await createValidSubmitDTO(RegisterEthUserDto, {
    publicKey: requestBody.publicKey,
    uniqueKey: randomUniqueKey()
  });

  const signedDto = dto.signed(adminPrivateKeyString, false);

  const chainRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: signedDto.serialize()
  });

  if (!chainRes.ok) {
    return res.status(500).send({
      url: url,
      status: chainRes.status,
      body: await chainRes.json(),
      dto: signedDto.serialize()
    });
  }

  res.json(signedDto.serialize());
}

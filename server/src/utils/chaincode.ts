import { GalaChainResponse } from "@gala-chain/api";

export interface ChainResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Submit a transaction to the chaincode (for state-changing operations)
 *
 * @param method - The chaincode method name (e.g., "FireStarter", "ContributeSubmission")
 * @param dto - The signed DTO to submit
 * @param contract - The contract name (defaults to "ReadWriteBurn")
 * @param channel - The channel name (defaults to "product")
 * @returns Promise<ChainResponse<T>>
 */
export async function submitToChaincode<T>(
  method: string,
  dto: any,
  contract = "ReadWriteBurn",
  channel = process.env.PRODUCT_CHANNEL ?? "product"
): Promise<ChainResponse<T>> {
  const apiBase = process.env.CHAIN_API;

  if (!apiBase) {
    return {
      success: false,
      error: "CHAIN_API environment variable not configured"
    };
  }

  const url = `${apiBase}/api/${channel}/${contract}/${method}`;

  try {
    console.log(`Submitting to chaincode: ${url}`);
    console.log(`DTO payload:`, JSON.stringify(dto, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: typeof dto.serialize === 'function' ? dto.serialize() : JSON.stringify(dto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Chaincode HTTP error ${response.status}:`, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`
      };
    }

    const result: GalaChainResponse<T> = await response.json();
    console.log(`Chaincode response for ${method}:`, JSON.stringify(result, null, 2));

    if (!GalaChainResponse.isSuccess(result)) {
      console.error(`Chaincode execution error:`, result.Message);
      return {
        success: false,
        error: `Chaincode error: ${result.Message}`
      };
    }

    return {
      success: true,
      data: result.Data
    };
  } catch (error) {
    console.error(`Chaincode submission failed:`, error);
    return {
      success: false,
      error: `Network error: ${(error as Error).message}`
    };
  }
}

/**
 * Evaluate a chaincode query (for read-only operations)
 *
 * @param method - The chaincode method name (e.g., "FetchFires", "FetchSubmissions")
 * @param dto - The query DTO
 * @param contract - The contract name (defaults to "ReadWriteBurn")
 * @param channel - The channel name (defaults to "product")
 * @returns Promise<ChainResponse<T>>
 */
export async function evaluateChaincode<T>(
  method: string,
  dto: any,
  contract = "ReadWriteBurn",
  channel = process.env.PRODUCT_CHANNEL ?? "product"
): Promise<ChainResponse<T>> {
  const apiBase = process.env.CHAIN_API;

  if (!apiBase) {
    return {
      success: false,
      error: "CHAIN_API environment variable not configured"
    };
  }

  const url = `${apiBase}/api/${channel}/${contract}/${method}`;

  try {
    console.log(`Evaluating chaincode: ${url}`);
    console.log(`Query DTO:`, JSON.stringify(dto, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: typeof dto.serialize === 'function' ? dto.serialize() : JSON.stringify(dto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Chaincode HTTP error ${response.status}:`, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`
      };
    }

    const result: GalaChainResponse<T> = await response.json();
    console.log(`Chaincode evaluation result for ${method}:`, JSON.stringify(result, null, 2));

    if (!GalaChainResponse.isSuccess(result)) {
      console.error(`Chaincode evaluation error:`, result.Message);
      return {
        success: false,
        error: `Chaincode error: ${result.Message}`
      };
    }

    return {
      success: true,
      data: result.Data
    };
  } catch (error) {
    console.error(`Chaincode evaluation failed:`, error);
    return {
      success: false,
      error: `Network error: ${(error as Error).message}`
    };
  }
}

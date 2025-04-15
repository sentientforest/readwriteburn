
// todo: duplicated from chain-client/src/generic/ChainUser.ts
// chain-client breaks some bundlers unless fabric-client is installed 
// this type should be moved to chain-api for easier usage 
import { UserAlias, signatures } from "@gala-chain/api";

/**
 * Represents a user configuration object, containing all the information
 * needed to authenticate and sign transactions.
 *
 * @class ChainUser
 */
export class ChainUser {
  public readonly prefix: string;
  public readonly name: string;
  public readonly identityKey: UserAlias;
  public readonly ethAddress: string;
  public readonly privateKey: string;
  public readonly publicKey: string;

  /**
   * @param {Object} config - Configuration object for the constructor.
   *
   * @param {string} [config.name] - If provided, the resulting prefix will be
   * `client` and identityKey will be `client|${name}`. Otherwise, the prefix
   * will be `eth` and identityKey will be `eth|${ethAddress}`.
   *
   * @param {string} config.privateKey - A secp256k1 private key to be used for
   * cryptographic operations. It will be used to calculate the public key and
   * the ethAddress, and will be used to sign transactions.
   */
  constructor(config: { name?: string; privateKey: string }) {
    this.privateKey = config.privateKey;
    this.publicKey = signatures.getPublicKey(config.privateKey);
    this.ethAddress = signatures.getEthAddress(this.publicKey);

    if (config.name === undefined) {
      this.prefix = "eth";
      this.name = this.ethAddress;
    } else {
      this.prefix = "client";
      this.name = config.name.replace("client|", "");
    }

    this.identityKey = `${this.prefix}|${this.name}` as UserAlias; // safe to cast it
  }

  /**
   * Generates a new ChainUser object with random keys.
   *
   * @param {string} [name] - The name to be used for the ChainUser.
   * If provided, the resulting identityKey will be `client|${name}`.
   * Otherwise, the identityKey will be `eth|${ethAddress}`.
   *
   * @return {ChainUser} - A new ChainUser object with the generated
   * random keys and the provided or default name.
   */
  public static withRandomKeys(name?: string): ChainUser {
    return new ChainUser({ ...signatures.genKeyPair(), name });
  }
}
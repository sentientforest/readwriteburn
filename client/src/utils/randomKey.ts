import { randomBytes, bytesToHex as toHex } from "@noble/hashes/utils";

// todo: fix @gala-chain/api's randomUniqueKey, currently failing with `crypto2.randomBytes is not a function`
export function randomUniqueKey() {
  return toHex(randomBytes(32));
}

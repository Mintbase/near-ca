import { base_decode } from "near-api-js/lib/utils/serialize";
import { ec as EC } from "elliptic";
import { Address, keccak256 } from "viem";

export function najPublicKeyStrToUncompressedHexPoint(
  najPublicKeyStr: string
): string {
  const decodedKey = base_decode(najPublicKeyStr.split(":")[1]!);
  return "04" + Buffer.from(decodedKey).toString("hex");
}

export async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex: string,
  signerId: string,
  path: string = ""
): Promise<string> {
  const ec = new EC("secp256k1");
  const scalar = await sha256Hash(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`
  );

  const scalarHex = sha256StringToScalarLittleEndian(scalar);

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  // Create a point object from X and Y coordinates
  const oldPublicKeyPoint = ec.curve.point(x, y);

  // Multiply the scalar by the generator point G
  const scalarTimesG = ec.g.mul(scalarHex);

  // Add the result to the old public key point
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);
  const newX = newPublicKeyPoint.getX().toString("hex").padStart(64, "0");
  const newY = newPublicKeyPoint.getY().toString("hex").padStart(64, "0");
  return "04" + newX + newY;
}

export function uncompressedHexPointToEvmAddress(
  uncompressedHexPoint: string
): Address {
  const addressHash = keccak256(`0x${uncompressedHexPoint.slice(2)}`);
  // Ethereum address is last 20 bytes of hash (40 characters), prefixed with 0x
  return ("0x" + addressHash.substring(addressHash.length - 40)) as Address;
}

async function sha256Hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sha256StringToScalarLittleEndian(hashString: string): string {
  return hashString.match(/../g)!.reverse().join("");
}

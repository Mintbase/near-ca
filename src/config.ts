import { Common } from "@ethereumjs/common";
// import { ethers } from "ethers";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const config = {
  chainId: 11155111,
  // providerUrl: "https://rpc.sepolia.ethpandaops.io",
  // providerUrl: "https://sepolia.gateway.tenderly.co",
  providerUrl: "https://rpc2.sepolia.org",
  chain: "sepolia",
};

export const common = new Common({ chain: config.chain });
// export const provider = new ethers.JsonRpcProvider(
//   config.providerUrl,
//   config.chainId
// );

export const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

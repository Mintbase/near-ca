import { encodeFunctionData } from "viem";
import { CHAIN_ID, setupNearEthAdapter } from "../../setup";

const run = async (): Promise<void> => {
  const adapter = await setupNearEthAdapter();

  await adapter.signAndSendTransaction({
    to: "0xAA5FcF171dDf9FE59c985A28747e650C2e9069cA",
    data: encodeFunctionData({
      abi: ["function safeMint(address to)"],
      functionName: "safeMint",
      args: ["0xAA5FcF171dDf9FE59c985A28747e650C2e9069cA"],
    }),
    chainId: CHAIN_ID,
  });
};

run();

import dotenv from "dotenv";
import { CHAIN_ID, setupNearEthAdapter } from "./setup";
dotenv.config();

const run = async (): Promise<void> => {
  const evm = await setupNearEthAdapter();
  await evm.signAndSendTransaction({
    // Sending to self.
    to: evm.address,
    // THIS IS ONE WEI!
    value: 1n,
    chainId: 11155420,
  });
};

run();

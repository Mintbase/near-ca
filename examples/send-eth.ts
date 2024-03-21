import dotenv from "dotenv";
import { setupNearEthAdapter } from "./setup";
dotenv.config();

const run = async (): Promise<void> => {
  const evm = await setupNearEthAdapter();

  await evm.signAndSendTransaction({
    receiver: "0x247b317521D7edCfaf9B6D6C21B55217E5c34E0a",
    amount: 0.000001,
  });
};

run();

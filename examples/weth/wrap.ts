import { setupNearEthAdapter } from "../setup";

const run = async (): Promise<void> => {
  const neareth = await setupNearEthAdapter();
  const sepoliaWETH = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
  const ethAmount = 0.01;
  const deposit = "0xd0e30db0";

  await neareth.signAndSendTransaction({
    receiver: sepoliaWETH,
    amount: ethAmount,
    data: deposit,
  });
};

run();

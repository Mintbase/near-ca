import erc1155Abi from "./abis/ERC1155.json";
import { setupNearEthConnection } from "./setup";
import { encodeFunctionData } from "viem";

const run = async (): Promise<void> => {
  const evm = await setupNearEthConnection();
  const amount = 0;
  // TODO retrieve from user:
  const tokenAddress = "0x284c37b0fcb72034ff25855da57fcf097b255474";
  const tokenId = 1;
  const to = "0x8d99F8b2710e6A3B94d9bf465A98E5273069aCBd";
  const from = await evm.getSender();

  const callData = encodeFunctionData({
    abi: erc1155Abi,
    functionName: "safeTransferFrom(address,address,uint256,uint256,bytes)",
    args: [from, to, tokenId, 1, "0x"],
  });

  await evm.signAndSendTransaction({
    receiver: tokenAddress,
    amount,
    data: callData,
  });
};

run();

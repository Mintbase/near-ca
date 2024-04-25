import { createPublicClient, http } from "viem";
import { SEPOLIA_CHAIN_ID, setupNearEthAdapter } from "../examples/setup";
import { NETWORK_MAP, NearEthAdapter } from "../src";
import { getBalance } from "viem/actions";

describe("End To End", () => {
  let adapter: NearEthAdapter;
  const to = "0xdeADBeeF0000000000000000000000000b00B1e5";
  const ONE_WEI = 1n;

  beforeAll(async () => {
    adapter = await setupNearEthAdapter();
  });

  afterAll(async () => {
    clearTimeout();
  });

  it("signAndSendTransaction", async () => {
    await expect(
      adapter.signAndSendTransaction({
        to,
        value: ONE_WEI,
        chainId: SEPOLIA_CHAIN_ID,
      })
    ).resolves.not.toThrow();
  });

  it("Fails to sign and send", async () => {
    const network = NETWORK_MAP[SEPOLIA_CHAIN_ID];
    const client = createPublicClient({
      transport: http(network.rpcUrl),
    });
    const senderBalance = await getBalance(client, {
      address: adapter.address,
    });
    await expect(
      adapter.signAndSendTransaction({
        to,
        value: senderBalance + ONE_WEI,
        chainId: SEPOLIA_CHAIN_ID,
      })
    ).rejects.toThrow();
  });

  it("signMessage", async () => {
    await expect(adapter.signMessage("NearEth")).resolves.not.toThrow();
  });

  it("signTypedData", async () => {
    const message = {
      from: {
        name: "Cow",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    } as const;

    const domain = {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    } as const;

    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    } as const;

    await expect(
      adapter.signTypedData({
        types,
        primaryType: "Mail",
        message,
        domain,
      })
    ).resolves.not.toThrow();
  });
});

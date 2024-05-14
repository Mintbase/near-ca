import { TransactionSerializable, toHex } from "viem";
import {
  EthTransactionParams,
  PersonalSignParams,
  wcRouter,
} from "../src/wallet-connect/handlers";

describe("Wallet Connect", () => {
  const chainId = "eip155:11155111";
  const from = "0xa61d98854f7ab25402e3d12548a2e93a080c1f97";
  const to = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";

  describe("wcRouter: personal_sign", () => {
    it("hello message", async () => {
      const messageString = "Hello!";
      const request = {
        method: "eth_sign",
        params: [toHex(messageString), from],
      };

      const { evmMessage, payload } = await wcRouter(
        request.method,
        chainId,
        request.params as PersonalSignParams
      );
      expect(evmMessage).toEqual(messageString);
      expect(payload).toEqual([
        129, 83, 250, 146, 102, 140, 185, 9, 243, 111, 112, 21, 11, 157, 12, 23,
        202, 85, 99, 164, 77, 162, 209, 137, 199, 133, 194, 59, 178, 150, 153,
        78,
      ]);
    });

    it("opensea login", async () => {
      const request = {
        method: "personal_sign",
        params: [
          "0x57656c636f6d6520746f204f70656e536561210a0a436c69636b20746f207369676e20696e20616e642061636365707420746865204f70656e536561205465726d73206f662053657276696365202868747470733a2f2f6f70656e7365612e696f2f746f732920616e64205072697661637920506f6c696379202868747470733a2f2f6f70656e7365612e696f2f70726976616379292e0a0a5468697320726571756573742077696c6c206e6f742074726967676572206120626c6f636b636861696e207472616e73616374696f6e206f7220636f737420616e792067617320666565732e0a0a57616c6c657420616464726573733a0a3078663131633232643631656364376231616463623662343335343266653861393662393332386463370a0a4e6f6e63653a0a32393731633731312d623739382d343433342d613633312d316333663133656665353365",
          "0xf11c22d61ecd7b1adcb6b43542fe8a96b9328dc7",
        ],
      };

      const { evmMessage, payload } = await wcRouter(
        request.method,
        chainId,
        request.params as PersonalSignParams
      );
      expect(evmMessage).toEqual(
        `Welcome to OpenSea!

Click to sign in and accept the OpenSea Terms of Service (https://opensea.io/tos) and Privacy Policy (https://opensea.io/privacy).

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address:
0xf11c22d61ecd7b1adcb6b43542fe8a96b9328dc7

Nonce:
2971c711-b798-4434-a631-1c3f13efe53e`
      );
      expect(payload).toEqual([
        117, 169, 250, 179, 96, 160, 12, 192, 110, 159, 56, 250, 26, 0, 94, 149,
        231, 16, 139, 84, 211, 16, 67, 147, 12, 120, 184, 111, 151, 108, 56,
        123,
      ]);
    });
  });
  describe("wcRouter: eth_sendTransaction", () => {
    it("with value", async () => {
      const request = {
        method: "eth_sendTransaction",
        params: [
          {
            gas: "0xd31d",
            value: "0x16345785d8a0000",
            from,
            to,
            data: "0xd0e30db0",
          },
        ],
      };

      const { evmMessage } = await wcRouter(
        request.method,
        chainId,
        request.params as EthTransactionParams[]
      );
      const tx = evmMessage as TransactionSerializable;

      delete tx.maxFeePerGas;
      delete tx.maxPriorityFeePerGas;
      delete tx.nonce;

      expect(tx).toEqual({
        account: from,
        chainId: 11155111,
        data: "0xd0e30db0",
        gas: 54045n,
        to,
        value: 100000000000000000n,
      });
      /// can't test payload: its non-deterministic because of gas values!
    });

    it("null value", async () => {
      const request = {
        method: "eth_sendTransaction",
        params: [
          {
            gas: "0xa8c3",
            from,
            to,
            data: "0x2e1a7d4d000000000000000000000000000000000000000000000000002386f26fc10000",
          },
        ],
      };

      const { evmMessage } = await wcRouter(
        request.method,
        chainId,
        request.params as EthTransactionParams[]
      );
      const tx = evmMessage as TransactionSerializable;

      delete tx.maxFeePerGas;
      delete tx.maxPriorityFeePerGas;
      delete tx.nonce;

      expect(tx).toEqual({
        account: from,
        chainId: 11155111,
        data: "0x2e1a7d4d000000000000000000000000000000000000000000000000002386f26fc10000",
        gas: 43203n,
        to,
        value: 0n,
      });
      /// can't test payload: its non-deterministic because of gas values!
    });

    it("null data", async () => {
      const request = {
        method: "eth_sendTransaction",
        params: [
          {
            gas: "0xa8c3",
            from,
            to,
            value: "0x01",
          },
        ],
      };

      const { evmMessage } = await wcRouter(
        request.method,
        chainId,
        request.params as EthTransactionParams[]
      );
      const tx = evmMessage as TransactionSerializable;

      delete tx.maxFeePerGas;
      delete tx.maxPriorityFeePerGas;
      delete tx.nonce;

      expect(tx).toEqual({
        account: from,
        chainId: 11155111,
        data: "0x",
        gas: 43203n,
        to,
        value: 1n,
      });
      /// can't test payload: its non-deterministic because of gas values!
    });
  });

  describe("wcRouter: eth_signTypedData", () => {
    it("Cowswap Order", async () => {
      const jsonStr = `{
      "types": {
        "Permit": [
          {"name": "owner", "type": "address"},
          {"name": "spender", "type": "address"},
          {"name": "value", "type": "uint256"},
          {"name": "nonce", "type": "uint256"},
          {"name": "deadline", "type": "uint256"}
        ],
        "EIP712Domain": [
          {"name": "name", "type": "string"},
          {"name": "version", "type": "string"},
          {"name": "chainId", "type": "uint256"},
          {"name": "verifyingContract", "type": "address"}
        ]
      },
      "domain": {
        "name": "CoW Protocol Token",
        "version": "1",
        "chainId": "11155111",
        "verifyingContract": "0x0625afb445c3b6b7b929342a04a22599fd5dbb59"
      },
      "primaryType": "Permit",
      "message": {
        "owner": "0xa61d98854f7ab25402e3d12548a2e93a080c1f97",
        "spender": "0xc92e8bdf79f0507f65a392b0ab4667716bfe0110",
        "value": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        "nonce": "0",
        "deadline": "1872873982"
      }
    }`;
      const request = {
        method: "eth_signTypedData_v4",
        params: [from, jsonStr],
      };

      const { evmMessage, payload } = await wcRouter(
        request.method,
        chainId,
        request.params as PersonalSignParams
      );
      expect(evmMessage).toEqual(request.params[1]);
      expect(payload).toEqual([
        154, 201, 197, 176, 122, 212, 161, 42, 56, 12, 218, 93, 39, 197, 249,
        144, 53, 126, 250, 19, 85, 168, 82, 131, 104, 184, 46, 112, 237, 228,
        48, 12,
      ]);
    });
  });

  // 0xccf42336792d9c4a7d11c61db813be13707ff354e7d62f82c76c2db0238c53fd490aa752f3e83624165d645bf6e3bee03094ea77a501e860fb1d0d2fd2150fc51b
});

import {
  Address,
  Hex,
  Hash,
  serializeTransaction,
  hashMessage,
  toBytes,
  isBytes,
  SignableMessage,
  verifyMessage,
  verifyTypedData,
  signatureToHex,
  hashTypedData,
  TypedData,
  TypedDataDefinition,
  parseTransaction,
} from "viem";
import {
  BaseTx,
  NearEthAdapterParams,
  NearContractFunctionPayload,
  TxPayload,
  TransactionWithSignature,
} from "../types/types";
import { MultichainContract } from "../mpcContract";
import BN from "bn.js";
import { buildTxPayload, addSignature, populateTx } from "../utils/transaction";
import { Network } from "../network";
import { pickValidSignature } from "../utils/signature";

export class NearEthAdapter {
  readonly mpcContract: MultichainContract;
  readonly address: Address;
  readonly derivationPath: string;

  private constructor(config: {
    mpcContract: MultichainContract;
    derivationPath: string;
    sender: Address;
  }) {
    this.mpcContract = config.mpcContract;
    this.derivationPath = config.derivationPath;
    this.address = config.sender;
  }

  /**
   * @returns Near accountId linked to derived ETH.
   */
  nearAccountId(): string {
    return this.mpcContract.contract.account.accountId;
  }

  /**
   * Constructs an EVM instance with the provided configuration.
   * @param {NearEthAdapterParams} args - The configuration object for the Adapter instance.
   */
  static async fromConfig(args: NearEthAdapterParams): Promise<NearEthAdapter> {
    // Sender is uniquely determined by the derivation path!
    const mpcContract = args.mpcContract;
    const derivationPath = args.derivationPath || "ethereum,1";
    return new NearEthAdapter({
      sender: await mpcContract.deriveEthAddress(derivationPath),
      derivationPath,
      mpcContract,
    });
  }

  /**
   * Takes a minimally declared Ethereum Transaction,
   * builds the full transaction payload (with gas estimates, prices etc...),
   * acquires signature from Near MPC Contract and submits transaction to public mempool.
   *
   * @param {BaseTx} txData - Minimal transaction data to be signed by Near MPC and executed on EVM.
   * @param {BN} nearGas - manually specified gas to be sent with signature request (default 200 TGAS).
   * Note that the signature request is a recursive function.
   */
  async signAndSendTransaction(txData: BaseTx, nearGas?: BN): Promise<Hash> {
    console.log("Creating Payload for sender:", this.address);
    const { transaction, signArgs } = await this.createTxPayload(txData);
    console.log("Requesting signature from Near...");
    const { big_r, big_s } = await this.mpcContract.requestSignature(
      signArgs,
      nearGas
    );
    console.log("Signature received");
    return this.relayTransaction({ transaction, signature: { big_r, big_s } });
  }

  /**
   * Takes a minimally declared Ethereum Transaction,
   * builds the full transaction payload (with gas estimates, prices etc...),
   * acquires signature from Near MPC Contract and submits transaction to public mempool.
   *
   * @param {BaseTx} txData - Minimal transaction data to be signed by Near MPC and executed on EVM.
   * @param {bigint} nearGas - manually specified gas to be sent with signature request (default 200 TGAS).
   * Note that the signature request is a recursive function.
   */
  async getSignatureRequestPayload(
    txData: BaseTx,
    nearGas?: bigint
  ): Promise<{
    transaction: Hex;
    requestPayload: NearContractFunctionPayload;
  }> {
    console.log("Creating Payload for sender:", this.address);
    const { transaction, signArgs } = await this.createTxPayload(txData);
    console.log("Requesting signature from Near...");
    return {
      transaction,
      requestPayload: await this.mpcContract.encodeSignatureRequestTx(
        signArgs,
        nearGas
      ),
    };
  }

  /**
   * Relays valid representation of signed transaction to Etherem mempool for execution.
   *
   * @param {TransactionWithSignature} tx - Signed Ethereum transaction.
   * @returns Hash of relayed transaction.
   */
  async relayTransaction(tx: TransactionWithSignature): Promise<Hash> {
    const signedTx = await this.reconstructSignature(tx);
    return this.relaySignedTransaction(signedTx);
  }

  /**
   * Builds a complete, unsigned transaction (with nonce, gas estimates, current prices)
   * and payload bytes in preparation to be relayed to Near MPC contract.
   *
   * @param {BaseTx} tx - Minimal transaction data to be signed by Near MPC and executed on EVM.
   * @param {number?} nonce - Optional transaction nonce.
   * @returns Transaction and its bytes (the payload to be signed on Near).
   */
  async createTxPayload(tx: BaseTx): Promise<TxPayload> {
    const transaction = await this.buildTransaction(tx);
    console.log("Built (unsigned) Transaction", transaction);
    const signArgs = {
      payload: buildTxPayload(transaction),
      path: this.derivationPath,
      key_version: 0,
    };
    return { transaction, signArgs };
  }

  /**
   * Transforms minimal transaction request data into a fully populated EVM transaction.
   * @param {BaseTx} tx - Minimal transaction request data
   * @returns {Hex} serialized (aka RLP encoded) transaction.
   */
  async buildTransaction(tx: BaseTx): Promise<Hex> {
    const transaction = await populateTx(tx, this.address);
    console.log("Transaction Request", transaction);
    return serializeTransaction(transaction);
  }

  reconstructSignature(tx: TransactionWithSignature): Hex {
    return addSignature(tx, this.address);
  }

  /**
   * Relays signed transaction to Ethereum mem-pool for execution.
   * @param serializedTransaction - Signed Ethereum transaction.
   * @returns Transaction Hash of relayed transaction.
   */
  private async relaySignedTransaction(
    serializedTransaction: Hex
  ): Promise<Hash> {
    const tx = parseTransaction(serializedTransaction);
    const network = Network.fromChainId(tx.chainId!);
    const hash = await network.client.sendRawTransaction({
      serializedTransaction,
    });
    console.log(`Transaction Confirmed: ${network.scanUrl}/tx/${hash}`);
    return hash;
  }
  // Below code is inspired by https://github.com/Connor-ETHSeoul/near-viem

  async signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  >(typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hash> {
    const sigs = await this.sign(hashTypedData(typedData));

    const common = {
      address: this.address,
      types: typedData.types,
      /* eslint-disable @typescript-eslint/no-explicit-any */
      primaryType: typedData.primaryType as any,
      message: typedData.message as any,
      domain: typedData.domain as any,
      /* eslint-enable @typescript-eslint/no-explicit-any */
    };
    const validity = await Promise.all([
      verifyTypedData({
        signature: sigs[0],
        ...common,
      }),
      verifyTypedData({
        signature: sigs[1],
        ...common,
      }),
    ]);
    return pickValidSignature(validity, sigs);
  }

  async signMessage(message: SignableMessage): Promise<Hash> {
    const sigs = await this.sign(hashMessage(message));
    const common = {
      address: this.address,
      message,
    };
    const validity = await Promise.all([
      verifyMessage({
        signature: sigs[0],
        ...common,
      }),
      verifyMessage({
        signature: sigs[1],
        ...common,
      }),
    ]);
    return pickValidSignature(validity, sigs);
  }

  /**
   * Requests signature from Near MPC Contract.
   * @param msgHash - Message Hash to be signed.
   * @returns Two different potential signatures for the hash (one of which is valid).
   */
  async sign(msgHash: `0x${string}` | Uint8Array): Promise<[Hex, Hex]> {
    const hashToSign = isBytes(msgHash) ? msgHash : toBytes(msgHash);

    const { big_r, big_s } = await this.mpcContract.requestSignature({
      path: this.derivationPath,
      payload: Array.from(hashToSign.reverse()),
      key_version: 0,
    });
    const r = `0x${big_r.substring(2)}` as Hex;
    const s = `0x${big_s}` as Hex;

    return [
      signatureToHex({ r, s, yParity: 0 }),
      signatureToHex({ r, s, yParity: 1 }),
    ];
  }
}

import { Contract, Account } from "near-api-js";
import { Address } from "viem";
import {
  deriveChildPublicKey,
  najPublicKeyStrToUncompressedHexPoint,
  uncompressedHexPointToEvmAddress,
} from "./utils/kdf";
import { NO_DEPOSIT, NINTEY_TGAS, getNearAccount } from "./chains/near";
import BN from "bn.js";

interface ChangeMethodArgs<T> {
  args: T;
  gas: BN;
  attachedDeposit: BN;
}

interface SignArgs {
  path: string;
  payload: number[];
}

interface SignResult {
  big_r: string;
  big_s: string;
}

interface MultichainContractInterface extends Contract {
  // Define the signature for the `public_key` view method
  public_key: () => Promise<string>;

  // Define the signature for the `sign` change method
  sign: (args: ChangeMethodArgs<SignArgs>) => Promise<[string, string]>;
}

export class MultichainContract {
  contract: MultichainContractInterface;

  constructor(account: Account, contractId: string) {
    this.contract = new Contract(account, contractId, {
      changeMethods: ["sign"],
      viewMethods: ["public_key"],
      useLocalViewExecution: false,
    }) as MultichainContractInterface;
  }

  static async fromEnv(): Promise<MultichainContract> {
    const account = await getNearAccount();
    return new MultichainContract(
      account,
      process.env.NEAR_MULTICHAIN_CONTRACT!
    );
  }

  deriveEthAddress = async (derivationPath: string): Promise<Address> => {
    const rootPublicKey = await this.contract.public_key();

    const publicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(rootPublicKey),
      this.contract.account.accountId,
      derivationPath
    );

    return uncompressedHexPointToEvmAddress(publicKey);
  };

  requestSignature = async (
    payload: number[],
    path: string
  ): Promise<SignResult> => {
    const [big_r, big_s] = await this.contract.sign({
      args: { path, payload },
      gas: new BN(NINTEY_TGAS),
      attachedDeposit: new BN(NO_DEPOSIT),
    });
    return { big_r, big_s };
  };
}

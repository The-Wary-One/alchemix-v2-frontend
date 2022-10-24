import { ethers } from 'ethers';

import { contractWrapper, externalContractWrapper } from '@helpers/contractWrapper';
import {
  setPendingApproval,
  setPendingWallet,
  setPendingTx,
  setSuccessTx,
  setError,
} from '@helpers/setToast';
import { VaultTypes } from '@stores/v2/types';
import { VaultConstants, chainIds } from '@stores/v2/constants';
import {
  setSubscriberMintAllowance,
  addSubscriberSubscription,
  removeSubscriberSubscription,
} from '@stores/services/self-repaying-ens/stores';
import { DEPLOYMENT_ADDRESS } from './constants';

export async function approve(signer: ethers.Signer) {
  try {
    const chainId = (await signer.provider.getNetwork()).chainId;
    const path = chainIds.find((chain) => parseInt(chain.id) === chainId)?.abiPath;

    // FIXME: should use a store and a typed contract.
    const { instance: alETHAlchemist } = await contractWrapper(
      VaultConstants[VaultTypes.alETH].alchemistContractSelector,
      signer,
      path,
    );

    setPendingApproval();

    const amount = ethers.constants.MaxUint256;
    const tx = (await alETHAlchemist.approveMint(DEPLOYMENT_ADDRESS, amount)) as ethers.ContractTransaction;

    setPendingTx();

    return await tx.wait().then((transaction) => {
      setSuccessTx(transaction.transactionHash);
      // Update signer's mint allowance for srens.
      setSubscriberMintAllowance(amount);
    });
  } catch (error) {
    setError(error.data ? await error.data.originalError.message : error.message, error);
    console.error(`[self-repaying-ens/approve]: ${error}`);
    throw Error(error);
  }
}

export async function subscribe(name: string, signer: ethers.Signer) {
  let srensInterface: ethers.utils.Interface;
  try {
    // FIXME: should use a store and a typed contract.
    const { instance: srens } = await externalContractWrapper('SelfRepayingENS', signer);
    srensInterface = srens.interface;

    setPendingWallet();

    const tx = (await srens.subscribe(name)) as ethers.ContractTransaction;

    setPendingTx();

    return await tx.wait().then(async (transaction) => {
      setSuccessTx(transaction.transactionHash);
      // Update signer's subscription list.
      const subscriber = await signer.getAddress();
      addSubscriberSubscription(subscriber, name);
    });
  } catch (e) {
    let error: any;
    let reason: string;
    // Get contract error if possible.
    if (e.data?.data) {
      try {
        error = srensInterface.getError(e.data.data);
        reason = error.name;
      } catch {
        error = e.data;
        reason = error.message;
      }
    } else {
      error = e;
      reason = (await error.data?.originalError?.message) ?? error.message;
    }
    setError(reason);
    console.error(`[self-repaying-ens/subscribe]: ${JSON.stringify(error)}`);
    throw Error(error);
  }
}

export async function unsubscribe(name: string, signer: ethers.Signer) {
  let srensInterface: ethers.utils.Interface;
  try {
    // FIXME: should use a store and a typed contract.
    const { instance: srens } = await externalContractWrapper('SelfRepayingENS', signer);
    srensInterface = srens.interface;

    setPendingWallet();

    const tx = (await srens.unsubscribe(name)) as ethers.ContractTransaction;

    setPendingTx();

    return await tx.wait().then(async (transaction) => {
      setSuccessTx(transaction.transactionHash);
      // Update signer's subscription list.
      const subscriber = await signer.getAddress();
      removeSubscriberSubscription(subscriber, name);
    });
  } catch (e) {
    let error: any;
    let reason: string;
    // Get contract error if possible.
    if (e.data?.data) {
      try {
        error = srensInterface.getError(e.data.data);
        reason = error.name;
      } catch {
        error = e.data;
        reason = error.message;
      }
    } else {
      error = e;
      reason = (await error.data?.originalError?.message) ?? error.message;
    }
    setError(reason);
    console.error(`[self-repaying-ens/unsubscribe]: ${JSON.stringify(error)}`);
    throw Error(error);
  }
}

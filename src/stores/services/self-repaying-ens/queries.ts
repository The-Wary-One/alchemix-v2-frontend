import type { ethers } from 'ethers';

import { contractWrapper, externalContractWrapper } from '@helpers/contractWrapper';
import { VaultTypes } from '@stores/v2/types';
import { VaultConstants, chainIds } from '@stores/v2/constants';
import {
  setSubscriberSubscriptions,
  setSubscriberMintAllowance,
} from '@stores/services/self-repaying-ens/stores';
import { DEPLOYMENT_ADDRESS, DEPLOYMENT_BLOCK_NUMBER } from './constants';

export async function loadSignerMintAllowance(signer: ethers.Signer) {
  const chainId = (await signer.provider.getNetwork()).chainId;
  const path = chainIds.find((chain) => parseInt(chain.id) === chainId)?.abiPath;

  // FIXME: should use a store and a typed contract.
  const { instance: alETHAlchemist } = await contractWrapper(
    VaultConstants[VaultTypes.alETH].alchemistContractSelector,
    signer,
    path,
  );

  const mintAllowance = await alETHAlchemist.mintAllowance(await signer.getAddress(), DEPLOYMENT_ADDRESS);
  // Update store.
  setSubscriberMintAllowance(mintAllowance);
}

export async function loadSignerSubscriptions(signer: ethers.Signer) {
  if (!signer) {
    console.error(`[fetchSignerSubscriptions]: signer is undefined`);
    return Promise.reject(`[fetchSignerSubscriptions]: signer is undefined`);
  }

  // Get SelfRepayingENS contract.
  // FIXME: should use a store and a typed contract.
  const { instance: srens } = await externalContractWrapper('SelfRepayingENS', signer);

  const subscriber = await signer.getAddress();

  // Get all subscriber's subscriptions.
  // FIXME: Should use an indexer.
  const subscriptionsLogs = await srens.queryFilter(
    srens.filters.Subscribed(subscriber, null, null),
    DEPLOYMENT_BLOCK_NUMBER,
    'latest',
  );

  // Get the list of subscriptions.
  const subscriptions = subscriptionsLogs.map((logs) => logs.args['name'] as string);

  // Remove all "unsubscriptions".
  // FIXME: Should use an indexer.
  const unsubscriptionsLogs = await srens.queryFilter(
    srens.filters.Unsubscribed(subscriber, null, null),
    DEPLOYMENT_BLOCK_NUMBER,
    'latest',
  );
  const unsubscriptions = unsubscriptionsLogs.map((logs) => logs.args['name'] as string);

  const subscriptionsCount = subscriptions.reduce((occurence, sub) => {
    occurence.set(sub, (occurence.get(sub) ?? 0) + 1);
    return occurence;
  }, new Map<string, number>());

  const finalCount = unsubscriptions.reduce((occurence, unsub) => {
    occurence.set(unsub, occurence.get(unsub) - 1);
    return occurence;
  }, new Map(subscriptionsCount.entries()));

  // Can only have one ACTIVE subscription per name.
  const activeSubscriptions = new Set(
    [...finalCount.entries()].filter(([sub, count]) => count === 1).map(([sub, count]) => sub),
  );

  // Update store.
  setSubscriberSubscriptions(subscriber, activeSubscriptions);
}

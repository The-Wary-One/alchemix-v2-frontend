import { writable, derived, Readable } from 'svelte/store';
import { ethers } from 'ethers';

import { signer } from '@stores/v2/derived';

/* --- WRITABLE STORES --- */
export const srensLoading = writable(true);
// Internal. Only helper functions should write to it.
const srensStoreDefault = (): SRENSStore => ({ subscriptions: {} });
const srensStore = writable(srensStoreDefault());

export type SRENSSubscriptions = ReadonlySet<string>;
export type SRENSStore = Readonly<{
  subscriptions: Readonly<{
    [subscriber: string]: SRENSSubscriptions;
  }>;
}>;

const subscriberMintAllowanceStore = writable(ethers.constants.Zero);

/* --- DERIVED STORES --- */
export const signerSubscriptions: Readable<SRENSSubscriptions> = derived(
  [signer, srensStore],
  ([$signer, $srensStore], set) => {
    if (!$signer || !$srensStore?.subscriptions) return;

    $signer.getAddress().then((addr) => {
      const subscriptions = $srensStore.subscriptions[addr];
      if (!subscriptions) return;
      set(subscriptions);
    });
  },
);

export const signerMintAllowance: Readable<ethers.BigNumber> = derived(
  [signer, subscriberMintAllowanceStore],
  ([$signer, $subscriberMintAllowanceStore], set) => {
    if (!$signer || !subscriberMintAllowanceStore) return;
    set($subscriberMintAllowanceStore);
  },
);

/* --- STORES HELPERS --- */
export function setSubscriberSubscriptions(subscriber: string, subscriptions: SRENSSubscriptions) {
  srensStore.update((prev) => ({
    ...prev,
    subscriptions: {
      ...prev.subscriptions,
      [subscriber]: subscriptions,
    },
  }));
}

export function addSubscriberSubscription(subscriber: string, subscription: string) {
  srensStore.update((prev) => {
    const newSubscriptions = new Set(prev.subscriptions[subscriber]);
    newSubscriptions.add(subscription);

    return {
      ...prev,
      subscriptions: {
        ...prev.subscriptions,
        [subscriber]: newSubscriptions,
      },
    };
  });
}

export function removeSubscriberSubscription(subscriber: string, subscription: string) {
  srensStore.update((prev) => {
    const newSubscriptions = new Set(prev.subscriptions[subscriber]);
    newSubscriptions.delete(subscription);

    return {
      ...prev,
      subscriptions: {
        ...prev.subscriptions,
        [subscriber]: newSubscriptions,
      },
    };
  });
}

export function setSubscriberMintAllowance(amount: ethers.BigNumber) {
  subscriberMintAllowanceStore.set(amount);
}

<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { BarLoader } from 'svelte-loading-spinners';

  import PageHeader from '@components/elements/PageHeader.svelte';
  import ViewContainer from '@components/elements/ViewContainer.svelte';
  import ContainerWithHeader from '@components/elements/ContainerWithHeader.svelte';
  import Button from '@components/elements/Button.svelte';
  import Input from '@components/elements/Input.svelte';

  import settings from '@stores/settings';
  import { signer } from '@stores/v2/derived';
  import {
    srensLoading,
    signerMintAllowance,
    signerSubscriptions,
  } from '@stores/services/self-repaying-ens/stores';
  import {
    loadSignerMintAllowance,
    loadSignerSubscriptions,
  } from '@stores/services/self-repaying-ens/queries';
  import { approve, subscribe, unsubscribe } from '@stores/services/self-repaying-ens/actions';

  let newSubscription = '';

  onMount(async () => {
    $srensLoading = true;

    await loadSignerMintAllowance($signer);
    await loadSignerSubscriptions($signer);

    $srensLoading = false;
  });

  async function onApprove() {
    await approve($signer)
      .then(() => {})
      .catch((e) => {
        const log = e.data ? e.data.message : e.message;
        // FIXME: log [Object object] in all logs.
        console.trace(`[onApprove]`, log);
      });
  }

  async function onSubscribe(nameWithSuffix: string) {
    // FIXME: Should check if the name is valid and is not fully expired.
    const name = nameWithSuffix.replace('.eth', '');
    await subscribe(name, $signer)
      .then(() => {
        console.log('[onSubscribe]: Subscription added!');
      })
      .catch((e) => {
        const log = e.data ? e.data.message : e.message;
        console.trace(`[onSubscribe]`, log);
      })
      .finally(() => {
        newSubscription = '';
      });
  }

  async function onUnsubscribe(name: string) {
    await unsubscribe(name, $signer)
      .then(() => {
        console.log('[onUnsubscribe]: Subscriptions updated!');
      })
      .catch((e) => {
        const log = e.data ? e.data.message : e.message;
        console.trace(`[onUnsubscribe]`, log);
      });
  }
</script>

<ViewContainer>
  <div class="flex justify-between" slot="head">
    <!-- FIXME: Replace the values -->
    <PageHeader
      pageIcon="accounts.png"
      pageTitle="Self Repaying ENS"
      pageSubtitle="Use your account to automagically renew a ENS name"
    />
  </div>
  {#if $srensLoading}
    <ContainerWithHeader>
      <div slot="header" class="py-4 px-6 flex space-x-4">
        <p class="inline-block self-center">{$_('fetching_data')}</p>
      </div>
      <svelte:fragment slot="body">
        <div class="flex justify-center my-4">
          <BarLoader color="{$settings.invertColors ? '#6C93C7' : '#F5C59F'}" />
        </div>
      </svelte:fragment>
    </ContainerWithHeader>
  {:else}
    <div class="w-full mb-8">
      <ContainerWithHeader>
        <div slot="header" class="py-4 px-6 flex space-x-4">
          <p class="inline-block self-center">Your subscriptions</p>
        </div>
        <svelte:fragment slot="body">
          {#if $signerSubscriptions?.size > 0}
            <div class="flex space-y-4 px-6 py-4">
              <ul class="flex flex-col w-full">
                {#each [...$signerSubscriptions.values()] as name}
                  <li class="flex flex-row justify-between items-center w-full px-6 py-4">
                    <p>{`${name}.eth`}</p>
                    <Button
                      label="unsubscribe"
                      borderColor="red4"
                      backgroundColor="{$settings.invertColors ? 'red5' : 'red2'}"
                      hoverColor="red3"
                      height="h-12"
                      width=""
                      borderSize="1"
                      fontSize="text-md"
                      solid="{true}"
                      on:clicked="{() => {
                        onUnsubscribe(name);
                      }}"
                    />
                  </li>
                {/each}
              </ul>
            </div>
          {:else}
            <div class="flex justify-center my-4">
              <!-- Use i18n -->
              <p>No names to renew</p>
            </div>
          {/if}
        </svelte:fragment>
      </ContainerWithHeader>
      <ContainerWithHeader>
        <div slot="body" class="py-6 px-12 flex space-x-4 justify-between">
          <Input
            bind:value="{newSubscription}"
            placeholder="Enter a valid .eth"
            class="rounded appearance-none h-full text-l px-4 py-2 {$settings.invertColors
              ? 'bg-grey3inverse'
              : 'bg-grey3'}"
          />
          {#if $signerMintAllowance.isZero()}
            <Button
              label="approve"
              borderColor="green4"
              backgroundColor="{$settings.invertColors ? 'green7' : 'green4'}"
              hoverColor="green4"
              height="h-12"
              width=""
              borderSize="1"
              fontSize="text-md"
              solid="{true}"
              on:clicked="{() => {
                onApprove();
              }}"
            />
          {:else}
            <Button
              label="subscribe"
              borderColor="green4"
              backgroundColor="{$settings.invertColors ? 'green7' : 'black2'}"
              hoverColor="green4"
              height="h-12"
              width=""
              borderSize="1"
              fontSize="text-md"
              solid="{true}"
              disabled="{!newSubscription}"
              on:clicked="{() => {
                onSubscribe(newSubscription);
              }}"
            />
          {/if}
        </div>
      </ContainerWithHeader>
    </div>
  {/if}
</ViewContainer>

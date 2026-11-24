import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { CORRIDOR_CAPACITY, ONCHAIN_TIP, showCkb } from './units.ts';
import { chainCapacity } from './faucet.ts';

const floor = CORRIDOR_CAPACITY + ONCHAIN_TIP;

export const fundingHint =
  `Send at least ${showCkb(floor)} to this address: ${showCkb(CORRIDOR_CAPACITY)} locks the corridor `
  + `and ${showCkb(ONCHAIN_TIP)} covers the on-chain fee.`;

export async function assertFunded(node: FiberBrowserNode): Promise<bigint> {
  const { default_funding_lock_script: script } = await node.nodeInfo();
  const capacity = await chainCapacity(script);
  if (capacity < floor) throw new Error(fundingHint);
  return capacity;
}

import type { FiberWasmFactory } from '@fiber-pay/sdk/browser';

// SDK 0.3.1 still ships an obsolete Testnet CKB Auth cell dependency.
// Replace it with the one from config/testnet/config.yml in Fiber v0.10.1.
const staleAuthTx = '0x5a5288769cecde6451cb5d301416c297a6da43dc3ac2f3253542b4082478b19b';
const liveAuthTx = '0x12c569a258dd9c5bd99f632bb8314b1263b90921ba31496467580d6b79dd14a7';

export async function loadTestnetRuntime(): Promise<FiberWasmFactory> {
  const { Fiber } = await import('@nervosnetwork/fiber-js');
  return (() => {
    const fiber = new Fiber();
    return {
      start: (config: string, ...rest: unknown[]) => {
        const patched = /chain:\s*testnet\b/.test(config)
          ? config.replaceAll(staleAuthTx, liveAuthTx)
          : config;
        return (fiber.start as (cfg: string, ...args: unknown[]) => unknown)(patched, ...rest);
      },
      stop: () => (fiber.stop as () => unknown)(),
      invokeCommand: (name: string, args?: unknown) =>
        (fiber.invokeCommand as (n: string, a?: unknown) => unknown)(name, args),
    };
  }) as FiberWasmFactory;
}

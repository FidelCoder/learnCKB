/** Own a saved browser identity exclusively until its runtime fully stops. */
type Runnable = { readonly isRunning: boolean; stop(): Promise<unknown> };
type Locks = Pick<LockManager, 'request'>;

export class TabConflictError extends Error {
  constructor() {
    super('This identity is already running in another tab. Close that tab, then start it here.');
    this.name = 'TabConflictError';
  }
}

export function makeIdentityGuard(manager: Locks | null = navigator.locks ?? null) {
  let release: (() => Promise<void>) | undefined;
  let live: Runnable | undefined;
  let inFlight: Promise<void> | undefined;
  let tearingDown: Promise<void> | undefined;
  let disposed = false;
  let heldKey: string | undefined;

  async function take(key: string) {
    if (!manager) {
      throw new Error('Web Locks is unavailable. Use a browser that can isolate node identities across tabs.');
    }
    await new Promise<void>((resolve, reject) => {
      const request = manager.request(`cipherpost:rig:${key}`, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(new TabConflictError());
          return;
        }
        await new Promise<void>((done) => {
          release = async () => { done(); await request; };
          heldKey = key;
          resolve();
        });
      });
      void request.catch(reject);
    });
  }

  async function shutdown() {
    await live?.stop();
    live = undefined;
    await release?.();
    release = undefined;
    heldKey = undefined;
  }

  return {
    async boot(key: string, spin: (track: (node: Runnable) => void) => Promise<void>): Promise<void> {
      if (disposed) return Promise.reject(new Error('This desk was closed. Reopen it to start an identity.'));
      if (inFlight) return inFlight;
      const job = async () => {
        if (heldKey && heldKey !== key) throw new Error('Stop the current identity before switching.');
        if (!release) await take(key);
        if (disposed) return;
        try {
          await spin((node) => {
            if (disposed) throw new Error('The desk closed before the identity started.');
            live = node;
          });
        } catch (error) {
          if (!live?.isRunning) await shutdown();
          throw error;
        }
      };
      inFlight = job().finally(() => { inFlight = undefined; });
      return inFlight;
    },
    halt(): Promise<void> {
      if (tearingDown) return tearingDown;
      disposed = true;
      tearingDown = (async () => {
        try { await inFlight; } catch { /* startup failure already surfaced */ }
        await shutdown();
      })();
      return tearingDown;
    },
  };
}

/** Public run-state only. Secret material never lands in these caches. */
export const RUN_SNAPSHOT = 'cipherpost:run-v1';
export const SENDER_ID = 'cipherpost:sender-v1';
export const BUYER_ID = 'cipherpost:buyer-v1';

type Reader = Pick<Storage, 'getItem'>;

export type RunSnapshot = {
  version: 1;
  senderId: string;
  buyerId: string;
  sealedPacket: string;
  inboxText: string;
  ransomHash: string;
  lockProbed: boolean;
};

export function profileId(storage: Reader, key: string): string | null {
  try {
    const row = JSON.parse(storage.getItem(key) ?? 'null');
    return row && /^[0-9a-f]{64}$/i.test(row.fiberKey)
      && /^[0-9a-f]{64}$/i.test(row.ckbKey)
      && typeof row.identifier === 'string' && row.identifier.length > 0
      ? row.identifier
      : null;
  } catch {
    return null;
  }
}

export function loadRunSnapshot(session: Reader, profiles: Reader): RunSnapshot | null {
  try {
    const raw = JSON.parse(session.getItem(RUN_SNAPSHOT) ?? 'null');
    if (!raw || raw.version !== 1
      || !raw.senderId || raw.senderId !== profileId(profiles, SENDER_ID)
      || !raw.buyerId || raw.buyerId !== profileId(profiles, BUYER_ID)
      || typeof raw.sealedPacket !== 'string' || typeof raw.inboxText !== 'string'
      || typeof raw.ransomHash !== 'string'
      || (raw.ransomHash && !/^0x[0-9a-f]{64}$/i.test(raw.ransomHash))
      || typeof raw.lockProbed !== 'boolean') return null;
    return {
      version: 1,
      senderId: raw.senderId,
      buyerId: raw.buyerId,
      sealedPacket: raw.sealedPacket,
      inboxText: raw.inboxText,
      ransomHash: raw.ransomHash,
      lockProbed: raw.lockProbed,
    };
  } catch {
    return null;
  }
}

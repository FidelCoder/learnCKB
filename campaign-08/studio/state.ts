import type { Channel, FiberBrowserNode, GetPaymentResult } from '@fiber-pay/sdk/browser';
import type { Packet } from '../core/packet';

export type Desk = 'sender' | 'buyer';

export type DeskSnapshot = {
  address?: string;
  capacity?: bigint | null;
  capacityNote?: string;
  linked?: boolean;
  lane?: Channel;
};

export type StudioState = {
  booted: boolean;
  busy: boolean;
  ribbon: string;
  alert: string;
  deskError: Partial<Record<Desk | 'relay', string>>;
  desks: Partial<Record<Desk, DeskSnapshot>>;
  manuscript: string;
  sealed: string;
  inbox: string;
  packet: Packet | null;
  ransomHash: string;
  lockOpened: boolean;
  payment: GetPaymentResult | null;
  ransomKey: string;
  openedText: string;
  preimageProof: '' | 'checking' | 'match' | 'mismatch' | 'unavailable';
  relay: {
    stuck: boolean;
    note: string;
    hash: string;
    verify: string;
  };
};

export const initialStudio: StudioState = {
  booted: false,
  busy: false,
  ribbon: '',
  alert: '',
  deskError: {},
  desks: {},
  manuscript: 'Cipherpost desk note\n\nThe ransom cleared. This sealed page is now readable.',
  sealed: '',
  inbox: '',
  packet: null,
  ransomHash: '',
  lockOpened: false,
  payment: null,
  ransomKey: '',
  openedText: '',
  preimageProof: '',
  relay: { stuck: false, note: '', hash: '', verify: '' },
};

export type StudioAction =
  | { type: 'boot'; snapshot: Partial<StudioState> }
  | { type: 'busy'; on: boolean }
  | { type: 'ribbon'; text: string }
  | { type: 'alert'; text: string }
  | { type: 'desk-error'; desk: Desk | 'relay'; text?: string }
  | { type: 'desk'; desk: Desk; patch: DeskSnapshot }
  | { type: 'manuscript'; text: string }
  | { type: 'sealed'; json: string }
  | { type: 'inbox'; text: string }
  | { type: 'packet'; packet: Packet | null }
  | { type: 'ransom-hash'; hash: string }
  | { type: 'lock'; opened: boolean }
  | { type: 'payment'; result: GetPaymentResult | null }
  | { type: 'ransom-key'; key: string }
  | { type: 'opened'; text: string }
  | { type: 'proof'; state: StudioState['preimageProof'] }
  | { type: 'relay'; patch: Partial<StudioState['relay']> }
  | { type: 'reset-exchange' };

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'boot':
      return { ...state, ...action.snapshot, booted: true };
    case 'busy':
      return { ...state, busy: action.on };
    case 'ribbon':
      return { ...state, ribbon: action.text };
    case 'alert':
      return { ...state, alert: action.text };
    case 'desk-error': {
      const next = { ...state.deskError };
      if (action.text) next[action.desk] = action.text;
      else delete next[action.desk];
      return { ...state, deskError: next };
    }
    case 'desk':
      return { ...state, desks: { ...state.desks, [action.desk]: { ...state.desks[action.desk], ...action.patch } } };
    case 'manuscript':
      return { ...state, manuscript: action.text };
    case 'sealed':
      return { ...state, sealed: action.json };
    case 'inbox':
      return { ...state, inbox: action.text, lockOpened: false };
    case 'packet':
      return { ...state, packet: action.packet };
    case 'ransom-hash':
      return { ...state, ransomHash: action.hash };
    case 'lock':
      return { ...state, lockOpened: action.opened };
    case 'payment': {
      const key = action.result?.status === 'Success' ? action.result.payment_preimage ?? '' : state.ransomKey;
      return { ...state, payment: action.result, ransomKey: key };
    }
    case 'ransom-key':
      return { ...state, ransomKey: action.key };
    case 'opened':
      return { ...state, openedText: action.text };
    case 'proof':
      return { ...state, preimageProof: action.state };
    case 'relay':
      return { ...state, relay: { ...state.relay, ...action.patch } };
    case 'reset-exchange':
      return {
        ...state,
        sealed: '', inbox: '', packet: null, ransomHash: '', lockOpened: false,
        payment: null, ransomKey: '', openedText: '', preimageProof: '',
        alert: '', ribbon: 'Fresh packet ready to mint.',
      };
    default:
      return state;
  }
}

export type Rigs = Partial<Record<Desk, FiberBrowserNode>>;

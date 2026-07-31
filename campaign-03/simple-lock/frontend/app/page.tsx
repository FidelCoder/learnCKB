"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  capacityOf,
  formatCkb,
  generateAccount,
  getDevnetTip,
  getHashLockDeployment,
  textToHex,
  unlock,
  waitForCommitted,
  type TransactionStatus,
} from "./hash-lock";
import { hashCkb } from "@ckb-ccc/core";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Database,
  Hash,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

const DEFAULT_PREIMAGE = "FidelCoder Campaign 03";

type FlowState = "idle" | "submitting" | TransactionStatus | "failed";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      className="icon-button"
      type="button"
      onClick={copy}
      disabled={!value}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export default function Home() {
  const deployment = getHashLockDeployment();
  const [preimage, setPreimage] = useState(DEFAULT_PREIMAGE);
  const hash = useMemo(() => hashCkb(textToHex(preimage)).slice(2), [preimage]);
  const lockAccount = useMemo(() => {
    if (!deployment) return undefined;
    try {
      return generateAccount(hash);
    } catch {
      return undefined;
    }
  }, [deployment, hash]);

  const [balance, setBalance] = useState(0n);
  const [tip, setTip] = useState<string>("--");
  const [networkOnline, setNetworkOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toAddr, setToAddr] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_RECEIVER || "",
  );
  const [amountInCKB, setAmountInCKB] = useState("99");
  const [unlockPreimage, setUnlockPreimage] = useState(DEFAULT_PREIMAGE);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [txHash, setTxHash] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [flowError, setFlowError] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const currentTip = await getDevnetTip();
      setTip(currentTip.toString());
      setNetworkOnline(true);
      if (lockAccount) {
        setBalance(await capacityOf(lockAccount.address));
      } else {
        setBalance(0n);
      }
    } catch (error) {
      setNetworkOnline(false);
      setFlowError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [lockAccount]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const onUnlock = async () => {
    if (!lockAccount) return;
    setFlowState("submitting");
    setFlowError("");
    setTxHash("");
    setBlockNumber("");

    try {
      const result = await unlock(
        lockAccount.address,
        toAddr.trim(),
        amountInCKB,
        unlockPreimage,
      );
      setTxHash(result.txHash);
      setFlowState("sent");
      const committed = await waitForCommitted(result.txHash, setFlowState);
      setFlowState("committed");
      setBlockNumber(committed?.blockNumber?.toString() || "");
      await refresh();
    } catch (error) {
      setFlowState("failed");
      setFlowError(errorMessage(error));
    }
  };

  const transferAmount = Number(amountInCKB);
  const canTransfer =
    networkOnline &&
    Boolean(lockAccount) &&
    balance > 0n &&
    toAddr.trim().length > 0 &&
    unlockPreimage.length > 0 &&
    Number.isFinite(transferAmount) &&
    transferAmount >= 61 &&
    !["submitting", "sent", "pending", "proposed"].includes(flowState);

  const activityTone =
    flowState === "committed"
      ? "success"
      : flowState === "failed" || flowState === "rejected"
        ? "danger"
        : flowState === "idle"
          ? "neutral"
          : "working";

  return (
    <main>
      <header className="app-header">
        <div className="header-inner">
          <div className="product-mark" aria-label="CKB Hash Lock">
            <span className="mark-icon">
              <Hash size={19} strokeWidth={2.4} />
            </span>
            <span>CKB HASH LOCK</span>
          </div>
          <div className="network-status">
            <span
              className={networkOnline ? "status-dot online" : "status-dot"}
            />
            <span>LOCAL DEVNET</span>
            <span className="tip-number">TIP {tip}</span>
            <button
              className="icon-button dark"
              type="button"
              onClick={refresh}
              disabled={refreshing}
              title="Refresh devnet state"
              aria-label="Refresh devnet state"
            >
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <section className="page-title">
          <div>
            <p className="eyebrow">FIDELCODER / CAMPAIGN 03</p>
            <h1>Simple lock workbench</h1>
          </div>
          <div className={`deployment-state ${deployment ? "ready" : ""}`}>
            <ShieldCheck size={18} />
            <span>
              {deployment ? "CONTRACT DEPLOYED" : "DEPLOYMENT REQUIRED"}
            </span>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="work-section">
            <div className="section-heading">
              <span className="step-index">01</span>
              <div>
                <h2>Build the lock</h2>
                <p>CKB Blake2b-256 / UTF-8</p>
              </div>
            </div>

            <label className="field-label" htmlFor="builder-preimage">
              Preimage
            </label>
            <input
              id="builder-preimage"
              data-testid="builder-preimage"
              className="text-input"
              value={preimage}
              onChange={(event) => {
                setPreimage(event.target.value);
                setUnlockPreimage(event.target.value);
              }}
              autoComplete="off"
            />

            <div className="data-block">
              <div className="data-label">
                <span>Derived hash</span>
                <CopyButton value={hash} label="derived hash" />
              </div>
              <code data-testid="derived-hash">{hash}</code>
            </div>

            <div className="data-block">
              <div className="data-label">
                <span>Hash-lock address</span>
                <CopyButton
                  value={lockAccount?.address || ""}
                  label="hash-lock address"
                />
              </div>
              <code data-testid="lock-address">
                {lockAccount?.address || "Waiting for a devnet deployment"}
              </code>
            </div>
          </div>

          <div className="work-section balance-section">
            <div className="section-heading">
              <span className="step-index">02</span>
              <div>
                <h2>Live cell balance</h2>
                <p>Indexed by the generated lock script</p>
              </div>
            </div>

            <div className="balance-display">
              <span data-testid="lock-balance">{formatCkb(balance)}</span>
              <small>CKB</small>
            </div>

            <dl className="script-facts">
              <div>
                <dt>Code hash</dt>
                <dd data-testid="code-hash">
                  {deployment?.codeHash || "Not deployed"}
                </dd>
              </div>
              <div>
                <dt>Hash type</dt>
                <dd>{deployment?.hashType || "--"}</dd>
              </div>
              <div>
                <dt>Runtime</dt>
                <dd>CKB-JS-VM</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="transfer-band">
          <div className="section-heading">
            <span className="step-index accent">03</span>
            <div>
              <h2>Unlock and transfer</h2>
              <p>Witness-backed spend from the hash lock</p>
            </div>
          </div>

          <div className="transfer-fields">
            <div className="field wide">
              <label className="field-label" htmlFor="receiver">
                Receiver
              </label>
              <input
                id="receiver"
                data-testid="receiver"
                className="text-input mono"
                value={toAddr}
                onChange={(event) => setToAddr(event.target.value)}
                placeholder="ckt1..."
                spellCheck={false}
              />
            </div>
            <div className="field amount">
              <label className="field-label" htmlFor="amount">
                Amount
              </label>
              <div className="amount-input">
                <input
                  id="amount"
                  data-testid="amount"
                  type="number"
                  min="61"
                  step="1"
                  value={amountInCKB}
                  onChange={(event) => setAmountInCKB(event.target.value)}
                />
                <span>CKB</span>
              </div>
            </div>
            <div className="field preimage">
              <label className="field-label" htmlFor="unlock-preimage">
                Witness preimage
              </label>
              <input
                id="unlock-preimage"
                data-testid="unlock-preimage"
                className="text-input"
                value={unlockPreimage}
                onChange={(event) => setUnlockPreimage(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="transfer-actions">
            <span className="fee-note">NETWORK FEE 0.00001 CKB</span>
            <button
              className="primary-button"
              data-testid="unlock-button"
              type="button"
              onClick={onUnlock}
              disabled={!canTransfer}
            >
              <span>Unlock CKB</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section
          className={`activity-band ${activityTone}`}
          data-testid="activity"
        >
          <div className="activity-icon">
            {activityTone === "success" ? (
              <Check size={20} />
            ) : activityTone === "danger" ? (
              <CircleAlert size={20} />
            ) : activityTone === "working" ? (
              <TerminalSquare size={20} />
            ) : (
              <Database size={20} />
            )}
          </div>
          <div className="activity-copy">
            <span className="activity-label">TRANSACTION ACTIVITY</span>
            <strong>{flowState.replace("_", " ").toUpperCase()}</strong>
            {flowError && <p>{flowError}</p>}
            {blockNumber && <p>Committed at block {blockNumber}</p>}
          </div>
          {txHash && (
            <div className="tx-reference">
              <code data-testid="tx-hash">{txHash}</code>
              <CopyButton value={txHash} label="transaction hash" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

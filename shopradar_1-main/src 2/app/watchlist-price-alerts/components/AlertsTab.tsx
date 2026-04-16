'use client';
import React, { useState } from 'react';
import type { PriceAlert } from './watchlistData';
import AlertAreaChart from './AlertAreaChart';
import AppImage from '@/components/ui/AppImage';
import { Bell, Trash2, Edit3, Check, X, Mail, MailX, Play, Pause, Zap, Clock, TrendingDown } from 'lucide-react';

interface AlertsTabProps {
  alerts: PriceAlert[];
  onDelete: (id: string) => void;
  onToggleEmail: (id: string) => void;
  onUpdateTarget: (id: string, price: number) => void;
  onToggleStatus: (id: string) => void;
}

function AlertStatusBadge({ status }: { status: PriceAlert['status'] }) {
  if (status === 'Active') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      Active
    </span>
  );
  if (status === 'Triggered') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success">
      <Zap size={10} fill="currentColor" /> Triggered!
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      <Pause size={9} /> Paused
    </span>
  );
}

function AlertCard({
  alert,
  onDelete,
  onToggleEmail,
  onUpdateTarget,
  onToggleStatus,
}: {
  alert: PriceAlert;
  onDelete: (id: string) => void;
  onToggleEmail: (id: string) => void;
  onUpdateTarget: (id: string, price: number) => void;
  onToggleStatus: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(alert.targetPrice.toString());

  const gap = alert.currentPrice - alert.targetPrice;
  const gapPct = Math.round((gap / alert.currentPrice) * 100);
  const isTriggered = alert.status === 'Triggered';
  const progress = Math.min(100, Math.max(0, ((alert.originalPrice - alert.currentPrice) / (alert.originalPrice - alert.targetPrice)) * 100));

  const saveEdit = () => {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val > 0) {
      onUpdateTarget(alert.id, val);
    }
    setEditing(false);
  };

  return (
    <div className={`bg-card border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md ${isTriggered ? 'border-success/40 ring-2 ring-success/20' : alert.status === 'Paused' ? 'border-border opacity-70' : 'border-border hover:border-primary/30'}`}>
      {isTriggered && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg">
            <Zap size={14} className="text-success" fill="currentColor" />
            <span className="text-xs font-semibold text-success">
              Price hit your target! Last triggered {alert.lastTriggered}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
            <AppImage
              src={alert.imageUrl}
              alt={`${alert.productName} in ${alert.color} price alert`}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Header info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground truncate">{alert.productName}</h3>
                <p className="text-xs text-muted-foreground">{alert.model} · {alert.color}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.marketplace}</p>
              </div>
              <AlertStatusBadge status={alert.status} />
            </div>
          </div>
        </div>

        {/* Price comparison */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Current price */}
          <div className="bg-muted/50 rounded-lg px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-1">Current best price</p>
            <p className={`text-xl font-bold tabular-nums font-mono ${isTriggered ? 'text-success' : 'text-foreground'}`}>
              ${alert.currentPrice.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground line-through tabular-nums">${alert.originalPrice.toFixed(2)}</p>
          </div>

          {/* Target price */}
          <div className={`rounded-lg px-3 py-2.5 ${isTriggered ? 'bg-success/10' : 'bg-accent/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Your target</p>
              {!editing && !isTriggered && (
                <button
                  onClick={() => { setEditing(true); setEditVal(alert.targetPrice.toString()); }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit3 size={11} />
                </button>
              )}
            </div>
            {editing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-foreground">$</span>
                <input
                  type="number"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  className="w-full text-lg font-bold bg-transparent border-b border-primary text-foreground focus:outline-none tabular-nums font-mono"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                />
                <button onClick={saveEdit} className="p-0.5 text-success hover:text-success/80 transition-colors">
                  <Check size={13} />
                </button>
                <button onClick={() => setEditing(false)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <p className={`text-xl font-bold tabular-nums font-mono ${isTriggered ? 'text-success' : 'text-accent'}`}>
                ${alert.targetPrice.toFixed(2)}
              </p>
            )}
            {!isTriggered && gap > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <TrendingDown size={9} />
                ${gap.toFixed(2)} to go ({gapPct}%)
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isTriggered && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Price progress toward target</span>
              <span className="tabular-nums font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1">30-day price trend · dashed line = your target</p>
          <AlertAreaChart data={alert.priceHistory} targetPrice={alert.targetPrice} currency={alert.currency} />
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} />
            <span>Created {alert.createdAt}</span>
            <span className="mx-1">·</span>
            <span className="flex items-center gap-1">
              {alert.priceDrop}% drop since tracking
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Email toggle */}
            <button
              onClick={() => onToggleEmail(alert.id)}
              title={alert.emailEnabled ? 'Disable email notifications' : 'Enable email notifications'}
              className={`p-2 rounded-lg border transition-all duration-150 ${alert.emailEnabled ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {alert.emailEnabled ? <Mail size={13} /> : <MailX size={13} />}
            </button>

            {/* Pause/Resume */}
            {alert.status !== 'Triggered' && (
              <button
                onClick={() => onToggleStatus(alert.id)}
                title={alert.status === 'Paused' ? 'Resume alert' : 'Pause alert'}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
              >
                {alert.status === 'Paused' ? <Play size={13} /> : <Pause size={13} />}
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => onDelete(alert.id)}
              title="Delete this alert permanently"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-all duration-150"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsTab({ alerts, onDelete, onToggleEmail, onUpdateTarget, onToggleStatus }: AlertsTabProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border rounded-2xl">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Bell size={28} className="text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No price alerts yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Add products to your watchlist and set a target price — we&apos;ll email you the moment it drops
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Emails sent via Supabase Resend
        </p>
      </div>
    );
  }

  const triggered = alerts.filter(a => a.status === 'Triggered');
  const active = alerts.filter(a => a.status === 'Active');
  const paused = alerts.filter(a => a.status === 'Paused');

  return (
    <div className="space-y-6">
      {triggered.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-success uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Zap size={13} fill="currentColor" /> Triggered ({triggered.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3">
            {triggered.map(a => (
              <AlertCard
                key={a.id}
                alert={a}
                onDelete={onDelete}
                onToggleEmail={onToggleEmail}
                onUpdateTarget={onUpdateTarget}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Bell size={13} /> Active ({active.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3">
            {active.map(a => (
              <AlertCard
                key={a.id}
                alert={a}
                onDelete={onDelete}
                onToggleEmail={onToggleEmail}
                onUpdateTarget={onUpdateTarget}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Pause size={13} /> Paused ({paused.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-3">
            {paused.map(a => (
              <AlertCard
                key={a.id}
                alert={a}
                onDelete={onDelete}
                onToggleEmail={onToggleEmail}
                onUpdateTarget={onUpdateTarget}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
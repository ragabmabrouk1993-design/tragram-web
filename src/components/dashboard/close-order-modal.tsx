'use client';

import Home2Image from '@/app/[lang]/marketing/components/marketing-image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CloseOrderModalProps = {
  open: boolean;
  orderName?: string;
  channelName?: string;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isConfirming?: boolean;
};

export function CloseOrderModal({
  open,
  orderName,
  channelName,
  title,
  subtitle,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onClose,
  isConfirming = false,
}: CloseOrderModalProps) {
  if (!open) return null;

  const actionWord = confirmLabel.toLowerCase().includes('delete') ? 'Delete' : 'Close';
  const resolvedTitle = title ?? `Do You Want To ${actionWord} This Order`;
  const resolvedSubtitle =
    subtitle ?? `${orderName ?? 'Order'}${channelName ? ` from ${channelName}` : ''}`;

  return (
    <div className="dashboard-sheet-backdrop" onClick={onClose}>
      <div
        className="dashboard-order-sheet dashboard-close-order-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm order action"
      >
        <div className="dashboard-sheet-handle" aria-hidden="true" />

        <div className="dashboard-close-order-illustration" aria-hidden>
          <Home2Image src="/assets/close-order.svg" alt="" />
        </div>

        <div className="dashboard-close-order-copy">
          <p className="dashboard-close-order-title">{resolvedTitle}</p>
          <p className="dashboard-close-order-subtitle">{resolvedSubtitle}</p>
        </div>

        <div className="dashboard-close-order-actions">
          <Button
            variant="ghost"
            className="dashboard-close-order-btn dashboard-close-order-cancel"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            className={cn('dashboard-close-order-btn dashboard-close-order-confirm')}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

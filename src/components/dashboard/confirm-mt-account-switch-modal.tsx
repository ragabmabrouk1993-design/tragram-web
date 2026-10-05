'use client';

import { Button } from '@/components/ui/button';

type ConfirmMtAccountSwitchModalProps = {
  open: boolean;
  title: string;
  subtitle: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isConfirming?: boolean;
};

export function ConfirmMtAccountSwitchModal({
  open,
  title,
  subtitle,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onClose,
  isConfirming = false,
}: ConfirmMtAccountSwitchModalProps) {
  if (!open) return null;

  return (
    <div className="dashboard-sheet-backdrop" onClick={onClose}>
      <div
        className="dashboard-order-sheet dashboard-close-order-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm switch MT account"
      >
        <div className="dashboard-sheet-handle" aria-hidden="true" />

        <div className="dashboard-close-order-copy dashboard-confirm-switch-copy">
          <p className="dashboard-close-order-title">{title}</p>
          <p className="dashboard-close-order-subtitle">{subtitle}</p>
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
            variant="default"
            className="dashboard-close-order-btn dashboard-confirm-switch-btn"
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

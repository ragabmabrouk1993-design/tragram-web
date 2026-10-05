'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type DeleteMtAccountModalProps = {
  open: boolean;
  title: string;
  subtitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  cancelLabel: string;
  confirmLabel: string;
  typedValue: string;
  onTypedChange: (value: string) => void;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isConfirming?: boolean;
};

export function DeleteMtAccountModal({
  open,
  title,
  subtitle,
  inputLabel,
  inputPlaceholder,
  cancelLabel,
  confirmLabel,
  typedValue,
  onTypedChange,
  onConfirm,
  onClose,
  isConfirming = false,
}: DeleteMtAccountModalProps) {
  if (!open) return null;

  return (
    <div className="dashboard-sheet-backdrop" onClick={onClose}>
      <div
        className="dashboard-order-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete MT account"
      >
        <div className="dashboard-sheet-handle" aria-hidden="true" />

        <div className="dashboard-order-sheet-header">
          <p className="dashboard-order-sheet-title">{title}</p>
          <p className="dashboard-order-sheet-subtitle">{subtitle}</p>
        </div>

        <div className="dashboard-order-sheet-grid">
          <div>
            <p className="dashboard-order-sheet-label">{inputLabel}</p>
            <Input
              value={typedValue}
              onChange={(event) => onTypedChange(event.target.value)}
              placeholder={inputPlaceholder}
              autoComplete="off"
              autoFocus
            />
          </div>
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
            className="dashboard-close-order-btn dashboard-close-order-confirm"
            onClick={onConfirm}
            disabled={isConfirming || typedValue.trim().length === 0}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Sheet } from './Sheet';
import { Button } from './components';

/** Confirmação só para ações destrutivas (folha de ações do iOS). */
export const ConfirmSheet: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ open, title, message, confirmLabel, onConfirm, onClose }) => (
  <Sheet open={open} onClose={onClose} title={title} size="sm">
    <p className="type-subhead text-label-2 text-center px-2 pt-1 pb-5">{message}</p>
    <div className="space-y-2">
      <Button
        variant="destructive"
        size="lg"
        fullWidth
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="gray" size="lg" fullWidth onClick={onClose} data-autofocus>
        Cancelar
      </Button>
    </div>
  </Sheet>
);

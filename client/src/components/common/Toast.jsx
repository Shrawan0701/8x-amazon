import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function Toast({ toast, onClose }) {
  const message = toast?.message?.trim();
  if (!message) return null;

  const type = ['success', 'error', 'info'].includes(toast.type) ? toast.type : 'success';
  const Icon = icons[type];

  return (
    <div className={`toast ${type}`} role="status" aria-live="polite">
      <span className="toast-icon"><Icon size={18} /></span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <X size={15} />
      </button>
    </div>
  );
}

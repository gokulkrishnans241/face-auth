import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const Notification = ({ type = 'success', message, onClose }) => {
  if (!message) return null;

  const styles = {
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-red-950/90 border-red-500/40 text-red-200',
    warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    info: 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200',
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
  };

  return (
    <div
      className={`flex items-start justify-between gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${
        styles[type] || styles.info
      } animate-in fade-in slide-in-from-top-2 duration-200`}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="text-xs font-medium leading-relaxed">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 opacity-70 hover:opacity-100" />
        </button>
      )}
    </div>
  );
};

export default Notification;

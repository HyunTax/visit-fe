interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition leading-none"
      >
        ✕
      </button>
    </div>
  );
}

interface ConfirmToastProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmToast({ message, onConfirm, onCancel }: ConfirmToastProps) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
      <span>{message}</span>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white transition"
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          className="text-red-400 hover:text-red-300 font-semibold transition"
        >
          확인
        </button>
      </div>
    </div>
  );
}

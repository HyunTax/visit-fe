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
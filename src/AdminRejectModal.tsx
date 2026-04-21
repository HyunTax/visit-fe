import { useState } from "react";
import type { AdminReservation } from "./api";
import { cx } from "./FloatingInput";

const PRESETS = ["해당 날짜 마감", "기타"] as const;

const PRESET_MESSAGES: Record<string, string> = {
  "해당 날짜 마감": "해당 날짜에는 이미 예약이 마감되었습니다.",
  "기타": "",
};

function fmtDate(s: string): string {
  const d = new Date(s + "T00:00:00");
  const months = d.getMonth() + 1;
  const days = d.getDate();
  return `${months}월 ${days}일`;
}

interface AdminRejectModalProps {
  reservation: AdminReservation;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function AdminRejectModal({ reservation, onClose, onConfirm }: AdminRejectModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handlePreset = (preset: string) => {
    setSelectedPreset(preset);
    setReason(PRESET_MESSAGES[preset] ?? "");
    if (error) setError(undefined);
  };

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("거절 사유를 입력해주세요");
      return;
    }
    setLoading(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 딤 배경 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* 다이얼로그 */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl px-5 pt-5 pb-6">

        <h2 className="text-[16px] font-bold text-slate-800 mb-1.5">예약 거절</h2>
        <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
          <span className="font-semibold text-slate-700">{reservation.name}</span> (
          {reservation.visitorCount}명, {fmtDate(reservation.visitDate)})
          <br />
        </p>

        {/* 프리셋 태그 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={cx(
                "px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition",
                selectedPreset === preset
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* 사유 텍스트 영역 */}
        <div className="relative mb-4">
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="거절 사유를 직접 입력하거나 위 태그를 선택하세요"
            rows={3}
            className={cx(
              "w-full rounded-xl border px-3.5 py-3 text-[12.5px] text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 transition",
              error ? "border-red-400 focus:ring-red-200" : "border-slate-200 focus:ring-slate-200 bg-slate-50"
            )}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-[13px] font-semibold hover:bg-slate-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition disabled:opacity-50"
          >
            {loading ? "처리 중..." : "거절 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}

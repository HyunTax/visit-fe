import { useState } from "react";
import { FloatingInput } from "./FloatingInput";
import { adminLogin } from "./api";

interface AdminLoginProps {
  onSuccess: (token: string) => void;
  onClose?: () => void;
}

export default function AdminLogin({ onSuccess, onClose }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password) {
      setError("비밀번호를 입력해주세요");
      setShakeKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const token = await adminLogin(password);
      onSuccess(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인 실패");
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 딤 배경 */}
      {onClose && (
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      )}
      {!onClose && (
        <div className="absolute inset-0 bg-[#f4f5f7]" />
      )}

      {/* 카드 */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 flex flex-col gap-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">
              관리자 로그인
            </h1>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* 비밀번호 필드 */}
          <div onKeyDown={handleKeyDown}>
            <FloatingInput<{ password: string }>
              label="관리자 비밀번호"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(undefined);
              }}
              error={error}
              shakeKey={shakeKey}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white font-semibold text-[14px] shadow-[0_6px_14px_-6px_rgba(194,138,90,0.6)] transition disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}

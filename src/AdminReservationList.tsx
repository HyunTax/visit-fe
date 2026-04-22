import { useState, useEffect } from "react";
import type { AdminReservation, ReservationStatus } from "./api";
import { getAdminReservations, approveReservation, rejectReservation } from "./api";
import { cx } from "./FloatingInput";
import AdminRejectModal from "./AdminRejectModal";
import Toast from "./Toast";

type FilterTab = "ALL" | ReservationStatus;

function fmtDate(s: string): string {
  const d = new Date(s + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function AdminStatusBadge({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, { label: string; bg: string; color: string }> = {
    WAIT:    { label: "대기", bg: "#eef2f6", color: "#64748b" },
    CONFIRM: { label: "승인", bg: "#e6f4ea", color: "#16a34a" },
    REJECT:  { label: "거절", bg: "#fdecec", color: "#ef4444" },
    CANCEL:  { label: "취소", bg: "#f1f5f9", color: "#94a3b8" },
  };
  const { label, bg, color } = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

interface AdminReservationListProps {
  token: string;
  onLogout: () => void;
}

export default function AdminReservationList({ token, onLogout }: AdminReservationListProps) {
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [rejectTarget, setRejectTarget] = useState<AdminReservation | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getAdminReservations(token).then(setReservations);
  }, [token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getAdminReservations(token);
      setReservations(data);
    } finally {
      setRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (r: AdminReservation) => {
    setLoadingIds((prev) => new Set(prev).add(r.id));
    try {
      await approveReservation(token, r.id);
      setReservations((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, status: "CONFIRM" } : x))
      );
      showToast(`${r.name}님 예약이 승인되었습니다.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "승인 실패");
    } finally {
      setLoadingIds((prev) => { const s = new Set(prev); s.delete(r.id); return s; });
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    setLoadingIds((prev) => new Set(prev).add(target.id));
    try {
      await rejectReservation(token, target.id, reason);
      setReservations((prev) =>
        prev.map((x) => (x.id === target.id ? { ...x, status: "REJECT" } : x))
      );
      showToast(`${target.name}님 예약이 거절되었습니다.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setLoadingIds((prev) => { const s = new Set(prev); s.delete(target.id); return s; });
    }
  };

  const counts: Record<FilterTab, number> = {
    ALL:     reservations.length,
    WAIT:    reservations.filter((r) => r.status === "WAIT").length,
    CONFIRM: reservations.filter((r) => r.status === "CONFIRM").length,
    REJECT:  reservations.filter((r) => r.status === "REJECT").length,
    CANCEL:  reservations.filter((r) => r.status === "CANCEL").length,
  };

  const filtered = filter === "ALL" ? reservations : reservations.filter((r) => r.status === filter);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "ALL",     label: "전체" },
    { key: "WAIT",    label: "대기" },
    { key: "CONFIRM", label: "승인" },
    { key: "REJECT",  label: "거절" },
    { key: "CANCEL",  label: "취소" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">

      {/* 헤더 */}
      <div className="border-b border-slate-100">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[19px] font-bold text-slate-800 tracking-tight">예약 관리</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-slate-400 hover:text-slate-600 transition disabled:opacity-40"
                aria-label="새로고침"
              >
                <svg
                  width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  className={refreshing ? "animate-spin" : ""}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              메인으로
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-4 mt-3">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cx(
                  "flex items-center gap-1.5 pb-2.5 text-[13px] font-medium border-b-2 transition",
                  filter === key
                    ? "border-slate-800 text-slate-800 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                {label}
                <span
                  className={cx(
                    "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
                    filter === key
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-auto max-h-[70vh] px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[13px] text-slate-400">
            해당 상태의 예약이 없습니다
          </div>
        ) : (
          filtered.map((r) => {
            const busy = loadingIds.has(r.id);
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 mb-2"
              >
                {/* 상단: 이름·인원 / 상태 */}
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <span className="text-[14.5px] font-bold text-slate-800 tracking-tight">
                      {r.name}
                    </span>
                    <span className="text-[12px] text-slate-400 font-medium ml-1.5">
                      · {r.visitorCount}명
                    </span>
                  </div>
                  <AdminStatusBadge status={r.status} />
                </div>

                {/* 전화번호 */}
                <div className="text-[11.5px] text-slate-500 mb-2">{r.phoneNum}</div>

                {/* 방문일 + 알러지 */}
                <div className="flex items-center gap-1.5 text-[12px] text-slate-700 mb-2">
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {fmtDate(r.visitDate)}
                  {r.hasAllergy && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">
                      알러지
                    </span>
                  )}
                </div>

                {/* 메모 */}
                {r.memo && (
                  <div className="text-xs text-slate-500 px-2.5 py-1.5 bg-slate-50 rounded-lg leading-relaxed mb-2.5">
                    {r.memo}
                  </div>
                )}

                {/* 액션 버튼 or 상태 */}
                {r.status === "REJECT" && r.statusMemo && (
                  <div className="px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-100 mb-2.5">
                    <p className="text-[10px] text-red-400 font-semibold mb-0.5">거절 사유</p>
                    <p className="text-[11.5px] text-red-600 leading-relaxed">{r.statusMemo}</p>
                  </div>
                )}
                {r.status === "CANCEL" && r.statusMemo && (
                  <div className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 mb-2.5">
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">취소 사유</p>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">{r.statusMemo}</p>
                  </div>
                )}
                {r.status === "WAIT" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejectTarget(r)}
                      disabled={busy}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition disabled:opacity-50"
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleApprove(r)}
                      disabled={busy}
                      className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold transition disabled:opacity-50"
                    >
                      {busy ? "처리 중..." : "승인"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      </div>{/* 카드 닫기 */}

      {/* 거절 모달 */}
      {rejectTarget && (
        <AdminRejectModal
          reservation={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}

      {/* 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

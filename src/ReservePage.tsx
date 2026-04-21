import { useState, useRef, useEffect, forwardRef } from "react";
import mainImg from "./assets/main.jpg";
import type { ChangeEvent } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ko", ko);
import {
  postAuth,
  postReservation,
  getReservation,
  putReservation,
  deleteReservation,
  UnauthorizedError,
} from "./api";
import type { ReservationDetail, ReservationStatus } from "./api";
import Toast from "./Toast";
import { FloatingInput, cx } from "./FloatingInput";
import AdminLogin from "./AdminLogin";
import AdminReservationList from "./AdminReservationList";

/* ===================== types ===================== */
type ActiveTab = "reserve" | "check";

interface ReserveForm {
  name: string;
  phoneNum: string;
  visitDate: string;
  visitCount: number;
  password: string;
}

interface PreSubmitForm {
  hasAllergy: boolean;
  memo: string;
}

interface CheckForm {
  name: string;
  phoneNum: string;
  password: string;
}

type ReserveError = Partial<Record<keyof ReserveForm, string>>;
type CheckError = Partial<Record<keyof CheckForm, string>>;

interface EditForm {
  visitDate: string;
  visitorCount: number;
  hasAllergy: boolean;
  memo: string;
}

/* ===================== helpers ===================== */
function formatPhoneNumber(value: string): string {
  const n = value.replace(/[^0-9]/g, "");
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`;
  if (n.length <= 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}`;
}

/* ===================== validator ===================== */
function validateField(name: string, value: string | number): string | undefined {
  const str = String(value);
  switch (name) {
    case "name":
      if (!value) return "이름을 입력해주세요";
      break;
    case "phoneNum": {
      if (!value) return "휴대폰 번호를 입력해주세요";
      const phoneOnly = str.replace(/-/g, "");
      if (!/^01[016789]\d{7,8}$/.test(phoneOnly)) return "휴대폰 번호를 확인해주세요";
      break;
    }
    case "password":
      if (!value) return "비밀번호를 입력해주세요";
      if (str.length < 6) return "비밀번호는 6자리 이상이어야 합니다";
      break;
    case "visitDate": {
      if (!value) return "방문 날짜를 선택해주세요";
      const selected = new Date(str + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return "과거 날짜는 선택할 수 없습니다";
      break;
    }
    case "visitCount":
    case "visitorCount": {
      const count = Number(value);
      if (!count) return "방문 인원을 입력해주세요";
      if (count < 1) return "방문 인원은 1명 이상이어야 합니다";
      if (count > 10) return "방문 인원은 10명 이하로 입력해주세요";
      break;
    }
  }
  return undefined;
}

/* ===================== DateFloatingInput ===================== */
interface DateFloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  shakeKey?: number;
}

const CustomDateTrigger = forwardRef<
  HTMLDivElement,
  { value?: string; onClick?: () => void; label: string; error?: boolean }
>(({ value, onClick, label, error }, ref) => (
  <div ref={ref} className="relative" onClick={onClick}>
    <input
      readOnly
      value={value || ""}
      placeholder="날짜를 선택하세요"
      className={cx(
        "peer w-full rounded-xl border px-4 pt-6 pb-2 pr-10 focus:outline-none focus:ring-2 transition cursor-pointer placeholder:text-slate-300",
        error ? "border-red-400 focus:ring-red-200" : "border-[#ece6dc] focus:ring-[#e8d5c0]"
      )}
    />
    <label className="absolute left-4 top-2 text-sm text-slate-400 pointer-events-none">
      {label}
    </label>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </span>
  </div>
));
CustomDateTrigger.displayName = "CustomDateTrigger";

function DateFloatingInput({ label, value, onChange, error, shakeKey }: DateFloatingInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;
    const el = wrapperRef.current?.querySelector("div") as HTMLElement | null;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth;
    el.classList.add("animate-shake");
  }, [error, shakeKey]);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleChange = (date: Date | null) => {
    if (!date) { onChange(""); return; }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
  };

  return (
    <div ref={wrapperRef}>
      <DatePicker
        selected={selected}
        onChange={handleChange}
        locale="ko"
        dateFormat="yyyy년 MM월 dd일"
        minDate={today}
        customInput={<CustomDateTrigger label={label} error={!!error} />}
        popperPlacement="bottom-start"
        calendarClassName="dp-calendar"
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

/* ===================== ReservationModal ===================== */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  );
}

const STATUS_MAP: Record<ReservationStatus, { label: string; className: string }> = {
  WAIT: { label: "승인 대기중", className: "bg-slate-100 text-slate-500" },
  CONFIRM: { label: "승인됨", className: "bg-emerald-100 text-emerald-600" },
  REJECT: { label: "거절됨", className: "bg-red-100 text-red-500" },
  CANCEL: { label: "취소됨", className: "bg-slate-100 text-slate-400" },
};

function StatusBadge({ status }: { status: ReservationStatus }) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP.WAIT;
  return (
    <span className={cx("text-xs px-2 py-0.5 rounded-full font-medium", className)}>
      {label}
    </span>
  );
}

interface ReservationModalProps {
  detail: ReservationDetail;
  token: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (updated: EditForm) => void;
  onUnauthorized: () => void;
  onError: (msg: string) => void;
  onNewReservation: () => void;
}

function ReservationModal({ detail, token, onClose, onDeleted, onUpdated, onUnauthorized, onError, onNewReservation }: ReservationModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    visitDate: detail.visitDate,
    visitorCount: detail.visitorCount,
    hasAllergy: detail.hasAllergy,
    memo: detail.memo,
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [editShakeKey, setEditShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editConfirmMode, setEditConfirmMode] = useState(false);
  const [editConfirmForm, setEditConfirmForm] = useState<{ hasAllergy: boolean; memo: string }>({ hasAllergy: false, memo: "" });
  const [editConfirmMemoError, setEditConfirmMemoError] = useState<string | undefined>(undefined);
  const [editConfirmShakeKey, setEditConfirmShakeKey] = useState(0);

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const inputType = (e.target as HTMLInputElement).type;
    const field = name as keyof EditForm;
    const parsed = inputType === "number" ? Number(value) : value;
    setEditForm((prev) => ({ ...prev, [field]: parsed }));
    setEditErrors((prev) => ({ ...prev, [field]: validateField(field, parsed) }));
  };

  const handleUpdate = () => {
    const errors: Partial<Record<keyof EditForm, string>> = {};
    (["visitDate", "visitorCount"] as (keyof EditForm)[]).forEach((key) => {
      const val = editForm[key];
      if (typeof val === "boolean") return;
      const err = validateField(key, val);
      if (err) errors[key] = err;
    });
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      setEditShakeKey((k) => k + 1);
      return;
    }
    setEditConfirmForm({ hasAllergy: false, memo: detail.memo });
    setEditConfirmMode(true);
  };

  const handleConfirmUpdate = async () => {
    if (editConfirmForm.hasAllergy && !editConfirmForm.memo.trim()) {
      setEditConfirmMemoError("알러지 종류를 입력해주세요.");
      setEditConfirmShakeKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const payload: EditForm = { visitDate: editForm.visitDate, visitorCount: editForm.visitorCount, hasAllergy: editConfirmForm.hasAllergy, memo: editConfirmForm.memo };
      await putReservation(token, detail.id, payload);
      onUpdated(payload);
      setEditMode(false);
      setEditConfirmMode(false);
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else onError(e instanceof Error ? e.message : "예약 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteReservation(token, detail.id);
      onDeleted();
    } catch (e) {
      if (e instanceof UnauthorizedError) onUnauthorized();
      else onError(e instanceof Error ? e.message : "예약 취소 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">
                {confirmDelete ? "예약 취소" : editConfirmMode ? "추가 정보 확인" : editMode ? "예약 수정" : "예약 상세"}
              </h2>
              {!confirmDelete && !editMode && !editConfirmMode && (
                <StatusBadge status={detail.status} />
              )}
            </div>
            {!confirmDelete && !editConfirmMode && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {confirmDelete ? (
            <div className="space-y-5">
              <p className="text-sm text-slate-500 text-center py-2">
                <b>예약을 취소하시겠습니까?</b>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-red-400 hover:bg-red-500 text-white text-sm transition disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "취소 확인"}
                </button>
              </div>
            </div>
          ) : editConfirmMode ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                  <span className="text-sm text-slate-400">알러지가 있으신가요?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditConfirmForm((prev) => ({ ...prev, hasAllergy: !prev.hasAllergy }));
                      setEditConfirmMemoError(undefined);
                    }}
                    className={cx(
                      "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none",
                      editConfirmForm.hasAllergy ? "bg-emerald-400" : "bg-slate-200"
                    )}
                  >
                    <span className={cx(
                      "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
                      editConfirmForm.hasAllergy ? "translate-x-8" : "translate-x-1"
                    )} />
                  </button>
                </div>
                {editConfirmForm.hasAllergy && (
                  <p className="text-xs text-emerald-600 px-1">
                    메모에 알러지 종류를 적어주세요 (예: 견과류, 유제품 등)
                  </p>
                )}
              </div>
              <FloatingInput<{ hasAllergy: boolean; memo: string }>
                label={editConfirmForm.hasAllergy ? "알러지 종류 및 메모" : "메모 (선택)"}
                name="memo"
                value={editConfirmForm.memo}
                onChange={(e) => {
                  setEditConfirmForm((prev) => ({ ...prev, memo: e.target.value }));
                  if (editConfirmMemoError) setEditConfirmMemoError(undefined);
                }}
                error={editConfirmMemoError}
                shakeKey={editConfirmShakeKey}
                as="textarea"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditConfirmMode(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white text-sm transition disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "수정 요청"}
                </button>
              </div>
            </div>
          ) : editMode ? (
            <div className="space-y-5">
              <DateFloatingInput
                label="방문 날짜"
                value={editForm.visitDate}
                onChange={(val) => {
                  setEditForm((prev) => ({ ...prev, visitDate: val }));
                  setEditErrors((prev) => ({ ...prev, visitDate: validateField("visitDate", val) }));
                }}
                error={editErrors.visitDate}
                shakeKey={editShakeKey}
              />
              <FloatingInput<EditForm>
                label="방문 인원"
                name="visitorCount"
                type="number"
                value={editForm.visitorCount}
                onChange={handleEditChange}
                error={editErrors.visitorCount}
                min={1}
                max={10}
                shakeKey={editShakeKey}
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditForm({ visitDate: detail.visitDate, visitorCount: detail.visitorCount, hasAllergy: detail.hasAllergy, memo: detail.memo });
                    setEditErrors({});
                    setEditMode(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 py-3 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white text-sm transition"
                >
                  수정 요청
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <DetailRow label="이름" value={detail.name} />
              <DetailRow label="전화번호" value={detail.phoneNum} />
              <DetailRow label="방문일" value={detail.visitDate} />
              <DetailRow label="방문 인원" value={`${detail.visitorCount}명`} />
              <DetailRow label="알러지" value={detail.hasAllergy ? "있음" : "없음"} />
              {detail.memo && <DetailRow label="메모" value={detail.memo} />}
              {detail.status === "REJECT" && detail.statusMemo && (
                <div className="mt-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[11px] text-red-400 font-semibold mb-0.5">거절 사유</p>
                  <p className="text-[12.5px] text-red-600 leading-relaxed">{detail.statusMemo}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                {detail.status === "WAIT" && (<>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-sm transition disabled:opacity-50"
                  >
                    예약 취소
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 py-3 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white text-sm transition"
                  >
                    예약 수정
                  </button>
                </>)}
                {detail.status === "CONFIRM" && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    className="w-full py-3 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-sm transition disabled:opacity-50"
                  >
                    예약 취소
                  </button>
                )}
                {(detail.status === "REJECT" || detail.status === "CANCEL") && (
                  <button
                    onClick={onNewReservation}
                    className="w-full py-3 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white text-sm transition"
                  >
                    새 예약하기
                  </button>
                )}
              </div>
            </div>
          ) : editMode ? (
              <div className="space-y-5">
                <DateFloatingInput
                  label="방문 날짜"
                  value={editForm.visitDate}
                  onChange={(val) => {
                    setEditForm((prev) => ({ ...prev, visitDate: val }));
                    setEditErrors((prev) => ({ ...prev, visitDate: validateField("visitDate", val) }));
                  }}
                  error={editErrors.visitDate}
                  shakeKey={editShakeKey}
                />
                <FloatingInput<EditForm>
                  label="방문 인원"
                  name="visitorCount"
                  type="number"
                  value={editForm.visitorCount}
                  onChange={handleEditChange}
                  error={editErrors.visitorCount}
                  min={1}
                  max={10}
                  shakeKey={editShakeKey}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditForm({ visitDate: detail.visitDate, visitorCount: detail.visitorCount, hasAllergy: detail.hasAllergy, memo: detail.memo });
                      setEditErrors({});
                      setEditMode(false);
                    }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm transition"
                  >
                    수정 요청
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <DetailRow label="이름" value={detail.name} />
                <DetailRow label="전화번호" value={detail.phoneNum} />
                <DetailRow label="방문일" value={detail.visitDate} />
                <DetailRow label="방문 인원" value={`${detail.visitorCount}명`} />
                <DetailRow label="알러지" value={detail.hasAllergy ? "있음" : "없음"} />
                {detail.memo && <DetailRow label="메모" value={detail.memo} />}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-sm transition disabled:opacity-50"
                  >
                    예약 취소
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm transition"
                  >
                    예약 수정
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

/* ===================== Page ===================== */
const RESERVE_INITIAL: ReserveForm = {
  name: "",
  phoneNum: "",
  visitDate: "",
  visitCount: 1,
  password: "",
};

const PRESUBMIT_INITIAL: PreSubmitForm = {
  hasAllergy: false,
  memo: "",
};

export default function ReservePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("reserve");

  const [reserveForm, setReserveForm] = useState<ReserveForm>(RESERVE_INITIAL);
  const [checkForm, setCheckForm] = useState<CheckForm>({ name: "", phoneNum: "", password: "" });

  const [reserveErrors, setReserveErrors] = useState<ReserveError>({});
  const [checkErrors, setCheckErrors] = useState<CheckError>({});

  const [reserveShakeKey, setReserveShakeKey] = useState(0);
  const [checkShakeKey, setCheckShakeKey] = useState(0);

  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [showPreSubmit, setShowPreSubmit] = useState(false);
  const [preSubmitForm, setPreSubmitForm] = useState<PreSubmitForm>(PRESUBMIT_INITIAL);
  const [preSubmitMemoError, setPreSubmitMemoError] = useState<string | undefined>(undefined);
  const [preSubmitShakeKey, setPreSubmitShakeKey] = useState(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReservationDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showAdminList, setShowAdminList] = useState(false);

  // /admin URL로 직접 접근 시 로그인 팝업 표시
  useEffect(() => {
    if (window.location.pathname === "/admin") {
      setShowAdminLogin(true);
    }
  }, []);

  // 브라우저 뒤로가기/앞으로가기 시 관리자 화면 state 동기화
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === "/admin") {
        setShowAdminLogin(true);
      } else {
        setShowAdminList(false);
        setShowAdminLogin(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /* handlers */
  const handleReserveChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const inputType = (e.target as HTMLInputElement).type;
    const field = name as keyof ReserveForm;
    const parsed = inputType === "number" ? Number(value) : value;
    setReserveForm((prev) => ({ ...prev, [field]: parsed }));
    setReserveErrors((prev) => ({ ...prev, [field]: validateField(field, parsed) }));
  };

  const handleCheckChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const field = name as keyof CheckForm;
    setCheckForm((prev) => ({ ...prev, [field]: value }));
    setCheckErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleReservePhone = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setReserveForm((prev) => ({ ...prev, phoneNum: formatted }));
    setReserveErrors((prev) => ({ ...prev, phoneNum: validateField("phoneNum", formatted) }));
  };

  const handleCheckPhone = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setCheckForm((prev) => ({ ...prev, phoneNum: formatted }));
    setCheckErrors((prev) => ({ ...prev, phoneNum: validateField("phoneNum", formatted) }));
  };

  /* submit */
  const submitReserve = () => {
    const errors: ReserveError = {};
    (Object.keys(reserveForm) as (keyof ReserveForm)[]).forEach((key) => {
      const err = validateField(key, reserveForm[key]);
      if (err) errors[key] = err;
    });
    if (Object.keys(errors).length) {
      setReserveErrors(errors);
      setReserveShakeKey((k) => k + 1);
      return;
    }
    setPreSubmitForm(PRESUBMIT_INITIAL);
    setShowPreSubmit(true);
  };

  const confirmReserve = async () => {
    if (preSubmitForm.hasAllergy && !preSubmitForm.memo.trim()) {
      setPreSubmitMemoError("알러지 종류를 입력해주세요.");
      setPreSubmitShakeKey((k) => k + 1);
      return;
    }
    setReserveLoading(true);
    try {
      await postReservation({
        name: reserveForm.name,
        phoneNum: reserveForm.phoneNum,
        visitDate: reserveForm.visitDate,
        visitorCount: reserveForm.visitCount,
        hasAllergy: preSubmitForm.hasAllergy,
        memo: preSubmitForm.memo,
        password: reserveForm.password,
      });
      setShowPreSubmit(false);
      setReserveSuccess(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "예약 중 오류가 발생했습니다.");
    } finally {
      setReserveLoading(false);
    }
  };

  const handleUnauthorized = () => {
    setAuthToken(null);
    setShowDetail(false);
    setCheckErrors({ password: "세션이 만료되었습니다. 다시 인증해주세요." });
    setCheckShakeKey((k) => k + 1);
  };

  const submitCheck = async () => {
    const errors: CheckError = {};
    (Object.keys(checkForm) as (keyof CheckForm)[]).forEach((key) => {
      const err = validateField(key, checkForm[key]);
      if (err) errors[key] = err;
    });
    if (Object.keys(errors).length) {
      setCheckErrors(errors);
      setCheckShakeKey((k) => k + 1);
      return;
    }
    setCheckLoading(true);
    try {
      const token = await postAuth(checkForm);
      setAuthToken(token);
      const data = await getReservation(token, checkForm);
      setDetail(data);
      setShowDetail(true);
    } catch (e) {
      if (e instanceof UnauthorizedError) handleUnauthorized();
      else showToast(e instanceof Error ? e.message : "예약 조회 중 오류가 발생했습니다.");
    } finally {
      setCheckLoading(false);
    }
  };

  /* UI */
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="w-full flex justify-center py-8">
          <img src={mainImg} alt="메인 사진" className="w-3/4 rounded-2xl shadow-md" />
        </div>
        <div className="p-10 space-y-8">
          <div className="flex bg-white border border-[#f0e8dc] rounded-xl p-1">
            {(["reserve", "check"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cx(
                  "flex-1 py-2 rounded-lg text-sm font-semibold transition",
                  activeTab === tab
                    ? "bg-[#c28a5a] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab === "reserve" ? "예약" : "예약 확인"}
              </button>
            ))}
          </div>

          {activeTab === "reserve" &&
            (reserveSuccess ? (
              <div className="min-h-[480px] flex flex-col items-center justify-center text-center space-y-6 px-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-slate-800">예약이 완료되었습니다</p>
                </div>
                <button
                  onClick={() => {
                    setReserveSuccess(false);
                    setReserveForm(RESERVE_INITIAL);
                    setReserveErrors({});
                  }}
                  className="w-full py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                >
                  새 예약하기
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <FloatingInput<ReserveForm>
                  label="이름"
                  name="name"
                  value={reserveForm.name}
                  onChange={handleReserveChange}
                  error={reserveErrors.name}
                  shakeKey={reserveShakeKey}
                />
                <FloatingInput<ReserveForm>
                  label="휴대폰 번호"
                  name="phoneNum"
                  value={reserveForm.phoneNum}
                  onChange={handleReservePhone}
                  error={reserveErrors.phoneNum}
                  maxLength={13}
                  shakeKey={reserveShakeKey}
                />
                <DateFloatingInput
                  label="방문 날짜"
                  value={reserveForm.visitDate}
                  onChange={(val) => {
                    setReserveForm((prev) => ({ ...prev, visitDate: val }));
                    setReserveErrors((prev) => ({ ...prev, visitDate: validateField("visitDate", val) }));
                  }}
                  error={reserveErrors.visitDate}
                  shakeKey={reserveShakeKey}
                />
                <FloatingInput<ReserveForm>
                  label="방문 인원"
                  name="visitCount"
                  type="number"
                  value={reserveForm.visitCount}
                  onChange={handleReserveChange}
                  error={reserveErrors.visitCount}
                  min={1}
                  max={10}
                  shakeKey={reserveShakeKey}
                />
                <FloatingInput<ReserveForm>
                  label="비밀번호"
                  name="password"
                  type="password"
                  value={reserveForm.password}
                  onChange={handleReserveChange}
                  error={reserveErrors.password}
                  shakeKey={reserveShakeKey}
                />
                <button
                  onClick={submitReserve}
                  disabled={reserveLoading}
                  className="w-full bg-[#c28a5a] hover:bg-[#9c6838] text-white py-3 rounded-xl shadow-[0_6px_14px_-6px_rgba(194,138,90,0.6)] transition disabled:opacity-50"
                >
                  {reserveLoading ? "처리 중" : "예약 요청"}
                </button>
                <div className="text-center -mt-2">
                  <button
                    onClick={() => {
                      history.pushState({}, "", "/admin");
                      setShowAdminLogin(true);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    관리자 로그인
                  </button>
                </div>
              </div>
            ))}

          {activeTab === "check" && (
            <div className="space-y-6">
              <FloatingInput<CheckForm>
                label="이름"
                name="name"
                value={checkForm.name}
                onChange={handleCheckChange}
                error={checkErrors.name}
                shakeKey={checkShakeKey}
              />
              <FloatingInput<CheckForm>
                label="휴대폰 번호"
                name="phoneNum"
                value={checkForm.phoneNum}
                onChange={handleCheckPhone}
                error={checkErrors.phoneNum}
                maxLength={13}
                shakeKey={checkShakeKey}
              />
              <FloatingInput<CheckForm>
                label="비밀번호"
                name="password"
                type="password"
                value={checkForm.password}
                onChange={handleCheckChange}
                error={checkErrors.password}
                shakeKey={checkShakeKey}
              />
              <button
                onClick={submitCheck}
                disabled={checkLoading}
                className="w-full bg-[#c28a5a] hover:bg-[#9c6838] text-white py-3 rounded-xl shadow-[0_6px_14px_-6px_rgba(194,138,90,0.6)] transition disabled:opacity-50"
              >
                {checkLoading ? "처리 중..." : "예약 확인"}
              </button>
              <div className="text-center -mt-2">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 transition"
                >
                  관리자 로그인
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPreSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPreSubmit(false)}
                  className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
                >
                </button>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <span className="text-sm text-slate-400">알러지가 있으신가요?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreSubmitForm((prev) => ({
                          ...prev,
                          hasAllergy: !prev.hasAllergy,
                        }));
                        setPreSubmitMemoError(undefined);
                      }}
                      className={cx(
                        "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none",
                        preSubmitForm.hasAllergy ? "bg-emerald-400" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cx(
                          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300",
                          preSubmitForm.hasAllergy ? "translate-x-8" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                  {preSubmitForm.hasAllergy && (
                    <p className="text-xs text-emerald-600 px-1">
                      메모에 알러지 종류를 적어주세요 (예: 견과류, 유제품 등)
                    </p>
                  )}
                </div>
                <FloatingInput<PreSubmitForm>
                  label={preSubmitForm.hasAllergy ? "알러지 종류 및 메모" : "메모 (선택)"}
                  name="memo"
                  value={preSubmitForm.memo}
                  onChange={(e) => {
                    setPreSubmitForm((prev) => ({ ...prev, memo: e.target.value }));
                    if (preSubmitMemoError) setPreSubmitMemoError(undefined);
                  }}
                  error={preSubmitMemoError}
                  shakeKey={preSubmitShakeKey}
                  as="textarea"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPreSubmit(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmReserve}
                    disabled={reserveLoading}
                    className="flex-1 py-3 rounded-xl bg-[#c28a5a] hover:bg-[#9c6838] text-white text-sm transition disabled:opacity-50"
                  >
                    {reserveLoading ? "처리 중..." : "예약하기"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && detail && authToken && (
        <ReservationModal
          detail={detail}
          token={authToken}
          onClose={() => setShowDetail(false)}
          onUpdated={(updated) =>
            setDetail((prev) => prev && { ...prev, ...updated })
          }
          onDeleted={() => {
            setShowDetail(false);
            setDetail(null);
            setAuthToken(null);
          }}
          onUnauthorized={handleUnauthorized}
          onError={showToast}
          onNewReservation={() => {
            setShowDetail(false);
            setDetail(null);
            setAuthToken(null);
            setActiveTab("reserve");
          }}
        />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {showAdminLogin && (
        <AdminLogin
          onClose={() => {
            setShowAdminLogin(false);
            history.pushState({}, "", "/");
          }}
          onSuccess={(token) => {
            setAdminToken(token);
            setShowAdminLogin(false);
            setShowAdminList(true);
          }}
        />
      )}

      {showAdminList && adminToken && (
        <div className="fixed inset-0 z-40 overflow-auto">
          <AdminReservationList
            token={adminToken}
            onLogout={() => {
              setAdminToken(null);
              setShowAdminList(false);
              history.pushState({}, "", "/");
            }}
          />
        </div>
      )}
    </div>
  );
}

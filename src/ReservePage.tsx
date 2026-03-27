import { useState, useRef, useEffect } from "react";
import mainImg from "./assets/main.jpg";
import type { ChangeEvent } from "react";
import {
  postAuth,
  postReservation,
  getReservation,
  putReservation,
  deleteReservation,
  UnauthorizedError,
} from "./api";
import type { ReservationDetail } from "./api";
import Toast from "./Toast";

/* ===================== types ===================== */
type ActiveTab = "reserve" | "check";

interface ReserveForm {
  name: string;
  phoneNum: string;
  visitDate: string;
  visitCount: number;
  memo: string;
  password: string;
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
  memo: string;
}

interface FloatingInputProps<T> {
  label: string;
  name: keyof T;
  type?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  as?: "input" | "textarea";
  min?: number;
  max?: number;
  maxLength?: number;
  shakeKey?: number;
}

/* ===================== helpers ===================== */
function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

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

/* ===================== FloatingInput ===================== */
function FloatingInput<T>({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  as = "input",
  min,
  max,
  maxLength,
  shakeKey,
}: FloatingInputProps<T>) {
  const fieldId = `field-${String(name)}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  // date/number는 브라우저 기본 UI가 항상 표시되므로 라벨 고정
  const alwaysFloat = type === "date" || type === "number";

  // error 발생 또는 submit 재시도 시 shake 재트리거
  useEffect(() => {
    if (!error) return;
    const el = (as === "textarea" ? textareaRef.current : inputRef.current) as HTMLElement | null;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth; // reflow 강제
    el.classList.add("animate-shake");
  }, [error, shakeKey, as]);

  const inputClass = cx(
    "peer w-full rounded-xl border px-4 pt-6 pb-2 focus:outline-none focus:ring-2 transition",
    error ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-gray-200",
    type === "password" && "pr-12"
  );

  const labelClass = alwaysFloat
    ? "absolute left-4 top-2 text-sm text-slate-400 pointer-events-none"
    : cx(
        "absolute left-4 top-2 text-sm text-slate-400 transition-all pointer-events-none",
        "peer-placeholder-shown:top-4 peer-placeholder-shown:text-base",
        "peer-focus:top-2 peer-focus:text-sm"
      );

  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea
          ref={textareaRef}
          id={fieldId}
          name={String(name)}
          value={value}
          onChange={onChange}
          placeholder=""
          rows={3}
          className={cx(inputClass, "resize-none")}
        />
      ) : (
        <input
          ref={inputRef}
          id={fieldId}
          type={type === "password" && showPassword ? "text" : type}
          name={String(name)}
          value={value}
          onChange={onChange}
          placeholder=""
          min={min}
          max={max}
          maxLength={maxLength}
          className={inputClass}
        />
      )}
      <label htmlFor={fieldId} className={labelClass}>
        {label}
      </label>
      {type === "password" && (
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-5 text-xs text-slate-400 hover:text-slate-600 transition"
        >
          {showPassword ? "숨김" : "표시"}
        </button>
      )}
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

interface ReservationModalProps {
  detail: ReservationDetail;
  token: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (updated: EditForm) => void;
  onUnauthorized: () => void;
  onError: (msg: string) => void;
}

function ReservationModal({ detail, token, onClose, onDeleted, onUpdated, onUnauthorized, onError }: ReservationModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    visitDate: detail.visitDate,
    visitorCount: detail.visitorCount,
    memo: detail.memo,
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [editShakeKey, setEditShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const inputType = (e.target as HTMLInputElement).type;
    const field = name as keyof EditForm;
    const parsed = inputType === "number" ? Number(value) : value;
    setEditForm((prev) => ({ ...prev, [field]: parsed }));
    setEditErrors((prev) => ({ ...prev, [field]: validateField(field, parsed) }));
  };

  const handleUpdate = async () => {
    const errors: Partial<Record<keyof EditForm, string>> = {};
    (Object.keys(editForm) as (keyof EditForm)[]).forEach((key) => {
      const err = validateField(key, editForm[key]);
      if (err) errors[key] = err;
    });
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      setEditShakeKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      await putReservation(token, detail.id, editForm);
      onUpdated(editForm);
      setEditMode(false);
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
            <h2 className="text-lg font-semibold text-slate-800">예약 상세</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {editMode ? (
            <div className="space-y-5">
              <FloatingInput<EditForm>
                label="방문 날짜"
                name="visitDate"
                type="date"
                value={editForm.visitDate}
                onChange={handleEditChange}
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
              <FloatingInput<EditForm>
                label="메모"
                name="memo"
                value={editForm.memo}
                onChange={handleEditChange}
                as="textarea"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-slate-500 text-sm hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm transition disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <DetailRow label="이름" value={detail.name} />
              <DetailRow label="전화번호" value={detail.phoneNum} />
              <DetailRow label="방문일" value={detail.visitDate} />
              <DetailRow label="방문 인원" value={`${detail.visitorCount}명`} />
              {detail.memo && <DetailRow label="메모" value={detail.memo} />}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-sm transition disabled:opacity-50"
                >
                  예약 취소
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex-1 py-3 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm transition"
                >
                  수정
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
  memo: "",
  password: "",
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
  const submitReserve = async () => {
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
    try {
      await postReservation({
        name: reserveForm.name,
        phoneNum: reserveForm.phoneNum,
        visitDate: reserveForm.visitDate,
        visitorCount: reserveForm.visitCount,
        memo: reserveForm.memo,
        password: reserveForm.password,
      });
      setReserveSuccess(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "예약 중 오류가 발생했습니다.");
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
    try {
      const token = await postAuth(checkForm);
      setAuthToken(token);
      const data = await getReservation(token, checkForm);
      setDetail(data);
      setShowDetail(true);
    } catch (e) {
      if (e instanceof UnauthorizedError) handleUnauthorized();
      else showToast(e instanceof Error ? e.message : "예약 조회 중 오류가 발생했습니다.");
    }
  };

  /* UI */
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Image - 3:4 ratio */}
        <div className="w-full flex justify-center py-8">
          <img src={mainImg} alt="메인 사진" className="w-3/4 rounded-2xl shadow-md" />
        </div>

        {/* Card */}
        <div className="p-10 space-y-8">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(["reserve", "check"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cx(
                  "flex-1 py-2 rounded-lg text-sm font-semibold transition",
                  activeTab === tab ? "bg-white shadow text-slate-800" : "text-slate-500"
                )}
              >
                {tab === "reserve" ? "예약" : "예약 확인"}
              </button>
            ))}
          </div>

          {/* Reserve */}
          {activeTab === "reserve" &&
            (reserveSuccess ? (
              <div className="min-h-[480px] flex flex-col items-center justify-center text-center space-y-3">
                <p className="font-semibold text-slate-800 text-lg">예약이 완료되었습니다</p>
                <button
                  onClick={() => {
                    setReserveSuccess(false);
                    setReserveForm(RESERVE_INITIAL);
                    setReserveErrors({});
                  }}
                  className="mt-2 text-sm text-slate-400 underline"
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
                <FloatingInput<ReserveForm>
                  label="방문 날짜"
                  name="visitDate"
                  type="date"
                  value={reserveForm.visitDate}
                  onChange={handleReserveChange}
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
                <FloatingInput<ReserveForm>
                  label="메모"
                  name="memo"
                  value={reserveForm.memo}
                  onChange={handleReserveChange}
                  as="textarea"
                />
                <button
                  onClick={submitReserve}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl transition"
                >
                  예약
                </button>
              </div>
            ))}

          {/* Check */}
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
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl transition"
              >
                예약 확인
              </button>
            </div>
          )}
        </div>
      </div>

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
        />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

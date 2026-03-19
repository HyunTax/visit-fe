import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";

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
    case "visitCount": {
      const count = Number(value);
      if (!count || count < 1) return "방문 인원은 1명 이상이어야 합니다";
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
  const [checkSuccess, setCheckSuccess] = useState(false);

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
    // TODO: API call
    setReserveSuccess(true);
  };

  const submitCheck = () => {
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
    // TODO: API call
    setCheckSuccess(true);
  };

  /* UI */
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Image - 3:4 ratio */}
        <div className="w-full aspect-[3/4] bg-gray-50 flex items-center justify-center">
          <span className="text-gray-300 text-xl font-semibold">사진</span>
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
              <div className="py-8 text-center space-y-3">
                <p className="font-semibold text-slate-800 text-lg">예약이 완료되었습니다</p>
                <p className="text-sm text-slate-500">{reserveForm.name}님, 방문을 기다리고 있을게요.</p>
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
          {activeTab === "check" &&
            (checkSuccess ? (
              <div className="py-8 text-center space-y-3">
                <p className="font-semibold text-slate-800 text-lg">예약 확인 완료</p>
                <p className="text-sm text-slate-500">{checkForm.name}님의 예약을 확인했습니다.</p>
                <button
                  onClick={() => setCheckSuccess(false)}
                  className="mt-2 text-sm text-slate-400 underline"
                >
                  돌아가기
                </button>
              </div>
            ) : (
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
            ))}
        </div>
      </div>
    </div>
  );
}

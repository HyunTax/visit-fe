import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";

export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface FloatingInputProps<T> {
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

export function FloatingInput<T>({
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

  const alwaysFloat = type === "date" || type === "number";

  useEffect(() => {
    if (!error) return;
    const el = (as === "textarea" ? textareaRef.current : inputRef.current) as HTMLElement | null;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth;
    el.classList.add("animate-shake");
  }, [error, shakeKey, as]);

  const inputClass = cx(
    "peer w-full rounded-xl border px-4 pt-6 pb-2 focus:outline-none focus:ring-2 transition",
    error ? "border-red-400 focus:ring-red-200" : "border-[#ece6dc] focus:ring-[#e8d5c0]",
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

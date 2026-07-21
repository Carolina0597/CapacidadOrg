"use client"

/* ============================================================================
 * GCO · CREAR/EDITAR EVENTO — primitivos de formulario
 * Campos accesibles y consistentes con los tokens --gco-*. Sin estado propio:
 * controlados por el modelo del asistente.
 * ========================================================================== */
import type { ReactNode } from "react"
import { AlertCircle, Check, HelpCircle } from "lucide-react"
import { cx } from "../ui"

/* ---- Tooltip informativo ---- */
export function Info({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group align-middle">
      <HelpCircle size={13} style={{ color: "var(--gco-text-3)" }} />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-1.5 w-52 -translate-x-1/2 rounded-[8px] px-2.5 py-1.5 text-[11px] leading-snug opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "var(--gco-navy)", color: "#fff", boxShadow: "var(--gco-sh-pop)" }}
      >
        {text}
      </span>
    </span>
  )
}

/* ---- Envoltura de campo ---- */
export function Field({
  label,
  required,
  hint,
  tip,
  error,
  children,
  className,
}: {
  label?: string
  required?: boolean
  hint?: string
  tip?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && (
        <label className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--gco-text)" }}>
          {label}
          {required && <span style={{ color: "var(--gco-red)" }}>*</span>}
          {tip && <Info text={tip} />}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] mt-1" style={{ color: "var(--gco-text-3)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: "var(--gco-red)" }}>
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

/* ---- Text / number / date / email ---- */
export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  disabled,
  readOnly,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  error?: boolean
  disabled?: boolean
  readOnly?: boolean
}) {
  return (
    <input
      className={cx("in fx", error && "err")}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      style={readOnly ? { background: "var(--gco-surface-2)", color: "var(--gco-text-2)" } : undefined}
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  error?: boolean
}) {
  return (
    <textarea
      className={cx("in fx", error && "err")}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ resize: "vertical", lineHeight: 1.5 }}
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  error,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[] | string[]
  placeholder?: string
  error?: boolean
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o))
  return (
    <select className={cx("in fx", error && "err")} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ---- Interruptor booleano ---- */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  tip,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  tip?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="fx w-full flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors"
      style={{
        border: `1px solid ${checked ? "var(--gco-green)" : "var(--gco-border-strong)"}`,
        background: checked ? "var(--gco-green-soft)" : "var(--gco-surface)",
      }}
      aria-pressed={checked}
    >
      <span
        className="relative inline-flex shrink-0 items-center rounded-full transition-colors"
        style={{ width: 38, height: 22, background: checked ? "var(--gco-green)" : "var(--gco-border-strong)" }}
      >
        <span
          className="absolute rounded-full bg-white transition-all"
          style={{ width: 16, height: 16, top: 3, left: checked ? 19 : 3, boxShadow: "0 1px 2px rgba(0,0,0,.2)" }}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold inline-flex items-center gap-1.5">
          {label}
          {tip && <Info text={tip} />}
        </span>
        {hint && (
          <span className="block text-[11px]" style={{ color: "var(--gco-text-3)" }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}

/* ---- Tarjetas tipo radio ---- */
export function RadioCards({
  value,
  onChange,
  options,
  cols = 2,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; desc?: string }[]
  cols?: 1 | 2 | 3
}) {
  const gc = cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
  return (
    <div className={cx("grid gap-2.5", gc)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="fx text-left rounded-[10px] px-3.5 py-3 transition-colors"
            style={{
              border: `1.5px solid ${on ? "var(--gco-green)" : "var(--gco-border-strong)"}`,
              background: on ? "var(--gco-green-soft)" : "var(--gco-surface)",
            }}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold">{o.label}</span>
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 18,
                  height: 18,
                  border: `1.5px solid ${on ? "var(--gco-green)" : "var(--gco-border-strong)"}`,
                  background: on ? "var(--gco-green)" : "transparent",
                }}
              >
                {on && <Check size={12} color="#fff" strokeWidth={3} />}
              </span>
            </span>
            {o.desc && (
              <span className="block text-[11.5px] mt-1 leading-snug" style={{ color: "var(--gco-text-2)" }}>
                {o.desc}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---- Selección múltiple por chips ---- */
export function ChipSelect({
  values,
  onChange,
  options,
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: string[]
}) {
  const toggle = (o: string) => (values.includes(o) ? onChange(values.filter((v) => v !== o)) : onChange([...values, o]))
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className="fx inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
            style={{
              border: `1px solid ${on ? "var(--gco-green)" : "var(--gco-border-strong)"}`,
              background: on ? "var(--gco-green-soft)" : "var(--gco-surface)",
              color: on ? "var(--gco-green-dark)" : "var(--gco-text-2)",
            }}
          >
            {on && <Check size={12} strokeWidth={3} />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

/* ---- Rejilla responsiva de campos ---- */
export function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
  const gc = cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
  return <div className={cx("grid gap-4", gc)}>{children}</div>
}

/* ---- Subtítulo de grupo dentro de un paso ---- */
export function GroupTitle({ children, tip }: { children: ReactNode; tip?: string }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide mt-1 mb-1" style={{ color: "var(--gco-text-3)" }}>
      {children}
      {tip && <Info text={tip} />}
    </h4>
  )
}

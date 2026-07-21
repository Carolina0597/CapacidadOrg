"use client"

/* ============================================================================
 * GCO · KIT DE COMPONENTES BASE
 * Primitivos reutilizables consistentes con el lenguaje visual (tokens --gco-*).
 * ========================================================================== */
import type { CSSProperties, ReactNode } from "react"
import { AlertCircle, Check, ChevronRight, X, type LucideIcon } from "lucide-react"
import type { Tone } from "@/lib/gco/domain"

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ")

export const cardStyle: CSSProperties = {
  background: "var(--gco-surface)",
  border: "1px solid var(--gco-border)",
  borderRadius: "var(--gco-r-lg)",
  boxShadow: "var(--gco-sh-1)",
}

/** Superficie de tarjeta sin sombra (solo borde sutil) — para grids densos. */
export const cardFlat: CSSProperties = {
  background: "var(--gco-surface)",
  border: "1px solid var(--gco-border)",
  borderRadius: "var(--gco-r-lg)",
}

/* ---- Card ---- */
export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={{ ...cardStyle, ...style }}>
      {children}
    </div>
  )
}

/* ---- Chip ---- */
const TONE: Record<Tone, [string, string]> = {
  success: ["var(--gco-green-dark)", "var(--gco-green-soft)"],
  green: ["var(--gco-green-dark)", "var(--gco-green-soft)"],
  info: ["var(--gco-blue)", "var(--gco-blue-soft)"],
  blue: ["var(--gco-blue)", "var(--gco-blue-soft)"],
  amber: ["#9a7400", "var(--gco-amber-soft)"],
  orange: ["#b5641a", "var(--gco-orange-soft)"],
  red: ["#b5352c", "var(--gco-red-soft)"],
  purple: ["var(--gco-purple)", "var(--gco-purple-soft)"],
  neutral: ["var(--gco-text-2)", "#eef1f5"],
}

export function Chip({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  const [fg, bg] = TONE[tone] || TONE.neutral
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: fg, background: bg }}
    >
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  )
}

export function StatusChip({ map, k }: { map: Record<string, [string, Tone]>; k: string }) {
  const m = map[k] || ["—", "neutral" as Tone]
  return <Chip tone={m[1]}>{m[0]}</Chip>
}

/* ---- Botones ---- */
export function Btn({
  icon: Icon,
  children,
  onClick,
  tone = "green",
  full,
  disabled,
  sm,
  type = "button",
}: {
  icon?: LucideIcon
  children: ReactNode
  onClick?: () => void
  tone?: "green" | "navy" | "red" | "purple"
  full?: boolean
  disabled?: boolean
  sm?: boolean
  type?: "button" | "submit"
}) {
  const bg = {
    green: "var(--gco-green)",
    navy: "var(--gco-navy)",
    red: "var(--gco-red)",
    purple: "var(--gco-purple)",
  }[tone]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "fx inline-flex items-center justify-center gap-2 font-bold text-white rounded-[10px] disabled:opacity-50",
        sm ? "text-xs px-3 py-2" : "text-sm px-4 py-2.5",
        full && "w-full",
      )}
      style={{ background: bg }}
    >
      {Icon && <Icon size={sm ? 14 : 16} />}
      {children}
    </button>
  )
}

export function BtnSoft({
  icon: Icon,
  children,
  onClick,
  full,
  sm,
}: {
  icon?: LucideIcon
  children: ReactNode
  onClick?: () => void
  full?: boolean
  sm?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "fx inline-flex items-center justify-center gap-2 font-semibold rounded-[10px]",
        sm ? "text-xs px-3 py-2" : "text-sm px-4 py-2.5",
        full && "w-full",
      )}
      style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border-strong)", color: "var(--gco-text)" }}
    >
      {Icon && <Icon size={sm ? 14 : 16} />}
      {children}
    </button>
  )
}

/* ---- Bloque de sección con encabezado ---- */
export function Block({
  icon: Icon,
  title,
  sub,
  tone = "navy",
  children,
}: {
  icon: LucideIcon
  title: string
  sub?: string
  tone?: "navy" | "purple"
  children: ReactNode
}) {
  const [chipBg, chipFg] =
    tone === "purple" ? ["var(--gco-purple-soft)", "var(--gco-purple)"] : ["var(--gco-green-soft)", "var(--gco-green-dark)"]
  return (
    <section className="fade" style={cardStyle}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--gco-border)" }}>
        <span
          className="inline-flex items-center justify-center rounded-[9px]"
          style={{ width: 34, height: 34, background: chipBg }}
        >
          <Icon size={17} strokeWidth={2} color={chipFg} />
        </span>
        <div>
          <h3 className="font-bold tracking-tight" style={{ fontSize: 15 }}>
            {title}
          </h3>
          {sub && (
            <p className="text-xs mt-0.5" style={{ color: "var(--gco-text-3)" }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ---- Encabezado de página ---- */
export function PageHeader({
  crumbs,
  title,
  sub,
  right,
}: {
  crumbs?: string[]
  title: string
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-5">
      <div>
        {crumbs && (
          <nav className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: "var(--gco-text-3)" }}>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} />}
                <span
                  style={{
                    color: i === crumbs.length - 1 ? "var(--gco-text-2)" : "var(--gco-text-3)",
                    fontWeight: i === crumbs.length - 1 ? 600 : 400,
                  }}
                >
                  {c}
                </span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-extrabold tracking-tight text-balance" style={{ fontSize: 26 }}>
          {title}
        </h1>
        {sub && (
          <p className="text-sm mt-1 text-pretty" style={{ color: "var(--gco-text-2)" }}>
            {sub}
          </p>
        )}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  )
}

/* ---- Modal ---- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  w = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  w?: number
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
      <div className="absolute inset-0" style={{ background: "rgba(16,24,40,.45)" }} onClick={onClose} />
      <div className="relative w-full pop" style={{ maxWidth: w, ...cardStyle, boxShadow: "var(--gco-sh-pop)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--gco-border)" }}>
          <h3 className="font-bold" style={{ fontSize: 16 }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} className="fx p-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--gco-border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Estado vacío / error inline ---- */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs flex items-center gap-1" style={{ color: "var(--gco-red)" }}>
      <AlertCircle size={12} />
      {children}
    </span>
  )
}

/* ============================================================================
 * PRIMITIVOS DE FORMULARIO (reutilizables en solicitudes y decisiones)
 * ========================================================================== */
const fieldBox: CSSProperties = {
  background: "var(--gco-surface)",
  border: "1px solid var(--gco-border-strong)",
  borderRadius: "10px",
  color: "var(--gco-text)",
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12.5px] font-semibold mb-1.5" style={{ color: "var(--gco-text)" }}>
      {children}
      {required && <span style={{ color: "var(--gco-red)" }}> *</span>}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm outline-none focus:ring-2"
      style={{ ...fieldBox }}
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm outline-none resize-y leading-relaxed"
      style={{ ...fieldBox }}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm outline-none"
      style={{ ...fieldBox }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/** Casilla seleccionable (permiso / tipo de espacio). */
export function CheckItem({
  checked,
  onToggle,
  label,
  desc,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  desc?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fx w-full flex items-start gap-2.5 p-2.5 rounded-[10px] text-left"
      style={{
        border: `1.5px solid ${checked ? "var(--gco-green)" : "var(--gco-border)"}`,
        background: checked ? "var(--gco-green-soft)" : "var(--gco-surface)",
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-[6px] shrink-0 mt-0.5"
        style={{
          width: 18,
          height: 18,
          background: checked ? "var(--gco-green)" : "var(--gco-surface)",
          border: `1.5px solid ${checked ? "var(--gco-green)" : "var(--gco-border-strong)"}`,
        }}
      >
        {checked && <Check size={12} strokeWidth={3} color="#fff" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        {desc && (
          <span className="block text-[11.5px] mt-0.5" style={{ color: "var(--gco-text-3)" }}>
            {desc}
          </span>
        )}
      </span>
    </button>
  )
}

"use client"

/* ============================================================================
 * GCO · CREAR/EDITAR EVENTO — resumen lateral dinámico
 * Se recalcula en cada cambio del modelo: nombre, tipo, prioridad, fecha,
 * sesiones, duración, público, horas-persona, modalidad, cupos, inscripción,
 * alineación y alertas.
 * ========================================================================== */
import { AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react"
import { ACT } from "@/lib/gco/domain"
import {
  detectConflicts,
  horasPersona,
  missingForSend,
  saturacionPct,
  targetPopulation,
  totalDuration,
  type EventModel,
} from "@/lib/gco/event-form"
import { Chip } from "../ui"

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5" style={{ borderBottom: "1px dashed var(--gco-border)" }}>
      <span className="text-[11.5px]" style={{ color: "var(--gco-text-3)" }}>
        {label}
      </span>
      <span
        className="text-[12.5px] font-semibold text-right truncate max-w-[62%]"
        style={{ color: strong ? "var(--gco-text)" : "var(--gco-text-2)" }}
      >
        {value || "—"}
      </span>
    </div>
  )
}

export function EventSummary({ m }: { m: EventModel }) {
  const dur = totalDuration(m)
  const hp = horasPersona(m)
  const pob = targetPopulation(m)
  const conflicts = detectConflicts(m)
  const missing = missingForSend(m)
  const sat = saturacionPct(m)
  const fechas = m.sesiones.filter((s) => s.fecha).map((s) => s.fecha).sort()
  const tipoLabel = m.tipo ? ACT[m.tipo][0] : ""
  const publico = m.publicoAbierto ? "Abierto" : "Cerrado"

  const satTone = sat > 100 ? "red" : sat >= 71 ? "amber" : "green"

  return (
    <div className="space-y-4">
      {/* Encabezado del resumen */}
      <div className="rounded-[12px] p-4" style={{ background: "var(--gco-navy)", color: "#fff" }}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gco-navy-muted)" }}>
          <Sparkles size={13} />
          Resumen del evento
        </div>
        <div className="mt-1.5 text-[15px] font-extrabold leading-tight text-balance">
          {m.nombre || "Evento sin título"}
        </div>
        <div className="mt-1 text-[11.5px]" style={{ color: "var(--gco-navy-text)" }}>
          {m.codigo} · {m.periodo}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tipoLabel && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,.14)" }}>
              {tipoLabel}
            </span>
          )}
          {m.prioridad && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--gco-green)" }}>
              {m.prioridad}
            </span>
          )}
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 gap-2.5">
        <Metric icon={Clock} label="Duración total" value={`${dur} h`} />
        <Metric label="Sesiones" value={String(m.sesiones.length)} />
        <Metric label="Población" value={pob ? String(pob) : "—"} />
        <Metric label="Horas-persona" value={hp ? hp.toLocaleString("es-CO") : "—"} highlight />
      </div>

      {/* Detalle */}
      <div className="rounded-[12px] px-4 py-2" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}>
        <Row label="Fecha" value={fechas[0] ? fechas[0] : ""} strong />
        <Row label="Modalidad" value={m.modalidad} />
        <Row label="Público" value={publico} />
        <Row label="Convocatoria" value={CONV[m.convocatoria] || ""} />
        <Row label="Cupos" value={m.requiereCupos ? m.cuposTotales || "Por definir" : "Sin cupos"} />
        <Row label="Inscripción" value={m.requiereInscripcion ? "Requerida" : "No requiere"} />
        <Row label="Áreas promotoras" value={[m.areaPrincipal, ...m.areasAdicionales].filter(Boolean).join(", ")} />
        <Row label="Responsable" value={m.responsable} />
      </div>

      {/* Saturación estimada */}
      <div className="rounded-[12px] p-3.5" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] font-semibold" style={{ color: "var(--gco-text-2)" }}>
            Saturación estimada
          </span>
          <Chip tone={satTone as any}>{sat}% / mes-persona</Chip>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--gco-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(sat, 100)}%`,
              background: sat > 100 ? "var(--gco-red)" : sat >= 71 ? "var(--gco-amber)" : "var(--gco-green)",
            }}
          />
        </div>
        <p className="text-[10.5px] mt-1.5" style={{ color: "var(--gco-text-3)" }}>
          Sobre la capacidad mensual de 20 h por persona (Ley 1857).
        </p>
      </div>

      {/* Alertas */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--gco-text-3)" }}>
          Alertas
        </div>
        <div className="space-y-1.5">
          {conflicts.length > 0 && (
            <Alert tone="red" icon={AlertTriangle}>
              {conflicts.length} cruce{conflicts.length > 1 ? "s" : ""} de horario
              {m.crossAccepted ? " (aceptado)" : ""}
            </Alert>
          )}
          {m.requierePieza && m.piezaEstado !== "Lista" && (
            <Alert tone="amber" icon={AlertTriangle}>
              Pieza de comunicación pendiente
            </Alert>
          )}
          {!m.responsable && (
            <Alert tone="amber" icon={AlertTriangle}>
              Responsable sin asignar
            </Alert>
          )}
          {missing.length > 0 && (
            <Alert tone="amber" icon={AlertTriangle}>
              {missing.length} campo{missing.length > 1 ? "s" : ""} por completar
            </Alert>
          )}
          {conflicts.length === 0 && missing.length === 0 && m.responsable && (
            <Alert tone="green" icon={CheckCircle2}>
              Listo para enviar a For+
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}

const CONV: Record<string, string> = {
  abierta: "Inscripción abierta",
  asignado: "Público asignado",
  directa: "Invitación directa",
  mixto: "Mixto",
}

function Metric({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon?: typeof Clock
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{
        background: highlight ? "var(--gco-green-soft)" : "var(--gco-surface-2)",
        border: `1px solid ${highlight ? "var(--gco-green)" : "var(--gco-border)"}`,
      }}
    >
      <div className="flex items-center gap-1 text-[10.5px]" style={{ color: "var(--gco-text-3)" }}>
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="text-[16px] font-extrabold mt-0.5" style={{ color: highlight ? "var(--gco-green-dark)" : "var(--gco-text)" }}>
        {value}
      </div>
    </div>
  )
}

function Alert({ tone, icon: Icon, children }: { tone: "red" | "amber" | "green"; icon: typeof AlertTriangle; children: React.ReactNode }) {
  const col = tone === "red" ? "var(--gco-red)" : tone === "amber" ? "#9a7400" : "var(--gco-green-dark)"
  const bg = tone === "red" ? "var(--gco-red-soft)" : tone === "amber" ? "var(--gco-amber-soft)" : "var(--gco-green-soft)"
  return (
    <div className="flex items-center gap-2 rounded-[9px] px-2.5 py-2 text-[11.5px] font-semibold" style={{ background: bg, color: col }}>
      <Icon size={13} />
      {children}
    </div>
  )
}

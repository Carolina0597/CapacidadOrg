"use client"

/* ============================================================================
 * GCO · MI EQUIPO (rol Líder)
 * Capacidad y participación del equipo a cargo. Todos los valores derivan del
 * selector `sel.team` (estado global + catálogo de dominio). El líder no crea
 * eventos: acompaña, aprueba cupos de su gente y vigila la saturación según la
 * Ley 1857 de 2017 (tope mensual de horas de formación).
 * ========================================================================== */
import Link from "next/link"
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardCheck,
  Gauge,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react"
import { CAPACIDAD_MENSUAL_HORAS, TEAM_RISK_LABEL, teamRisk } from "@/lib/gco/domain"
import { sel, useGco } from "@/lib/gco/store"
import { cardStyle, Chip, PageHeader } from "../ui"

function occTone(pct: number): string {
  if (pct > 100) return "var(--gco-red)"
  if (pct >= 75) return "var(--gco-amber)"
  return "var(--gco-green)"
}

function KPI({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  tone: "blue" | "green" | "amber" | "red"
  href?: string
}) {
  const soft = {
    blue: "var(--gco-blue-soft)",
    green: "var(--gco-green-soft)",
    amber: "var(--gco-amber-soft)",
    red: "var(--gco-red-soft)",
  }[tone]
  const fg = {
    blue: "var(--gco-blue)",
    green: "var(--gco-green-dark)",
    amber: "#b98c00",
    red: "var(--gco-red)",
  }[tone]
  const body = (
    <>
      <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: 42, height: 42, background: soft }}>
        <Icon size={20} strokeWidth={2} style={{ color: fg }} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-medium leading-tight" style={{ color: "var(--gco-text-2)" }}>
          {label}
        </div>
        <div className="font-extrabold tracking-tight mt-0.5" style={{ fontSize: 26, lineHeight: 1.05 }}>
          {value}
        </div>
      </div>
    </>
  )
  return href ? (
    <Link href={href} className="fx text-left p-4 flex items-center gap-3.5 fade transition-shadow hover:shadow-[var(--gco-sh-2)]" style={cardStyle}>
      {body}
    </Link>
  ) : (
    <div className="p-4 flex items-center gap-3.5 fade" style={cardStyle}>
      {body}
    </div>
  )
}

export function MiEquipo() {
  const t = useGco(sel.team)

  return (
    <>
      <PageHeader
        crumbs={["Inicio", "Mi equipo"]}
        title="Mi equipo"
        sub="Capacidad y participación de las personas a tu cargo en el periodo activo."
        right={
          <Link
            href="/aprobaciones"
            className="fx inline-flex items-center gap-2 text-[13.5px] font-semibold text-white px-4 py-2.5 rounded-[10px]"
            style={{ background: "var(--gco-navy)" }}
          >
            <ClipboardCheck size={16} />
            Aprobaciones
            {t.pendientes > 0 && (
              <span className="inline-flex items-center justify-center rounded-full text-[11px] font-bold" style={{ minWidth: 20, height: 20, padding: "0 6px", background: "var(--gco-amber)", color: "var(--gco-navy)" }}>
                {t.pendientes}
              </span>
            )}
          </Link>
        }
      />

      {/* KPIs del equipo */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <KPI icon={Users} tone="blue" label="Personas a cargo" value={t.total} />
        <KPI icon={Ticket} tone="green" label="Inscripciones activas" value={t.inscripciones} />
        <KPI icon={ClipboardCheck} tone="amber" label="Pendientes de aprobación" value={t.pendientes} href="/aprobaciones" />
        <KPI icon={AlertTriangle} tone={t.criticos > 0 ? "red" : "green"} label="Personas sobre capacidad" value={t.criticos} />
      </div>

      {/* Ocupación agregada */}
      <section className="mb-6" style={cardStyle}>
        <div className="px-5 pt-5 flex items-center gap-2 font-bold" style={{ fontSize: 15 }}>
          <Gauge size={17} style={{ color: "var(--gco-green-dark)" }} />
          Ocupación del equipo este mes
        </div>
        <div className="px-5 pb-5 pt-3">
          <div className="flex items-end justify-between mb-2">
            <div className="text-[13px]" style={{ color: "var(--gco-text-2)" }}>
              {t.horasMes} h comprometidas de {t.capacidadMes} h disponibles
              <span className="text-[12px]" style={{ color: "var(--gco-text-3)" }}>
                {" "}
                · tope {CAPACIDAD_MENSUAL_HORAS} h/mes por persona (Ley 1857 de 2017)
              </span>
            </div>
            <b style={{ fontSize: 20, color: occTone(t.ocupacion) }}>{t.ocupacion}%</b>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--gco-surface-2)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(t.ocupacion, 100)}%`, background: occTone(t.ocupacion) }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12px]" style={{ color: "var(--gco-text-3)" }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--gco-green)" }} /> Saludable
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--gco-amber)" }} /> Riesgo moderado ({t.moderados})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--gco-red)" }} /> Sobre capacidad ({t.criticos})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck size={13} /> Asistencia promedio <b style={{ color: "var(--gco-text-2)" }}>{t.asistencia}%</b>
            </span>
          </div>
        </div>
      </section>

      {/* Detalle por persona */}
      <section style={cardStyle}>
        <div className="px-5 pt-5 pb-3 flex items-center gap-2 font-bold" style={{ fontSize: 15 }}>
          <Users size={17} style={{ color: "var(--gco-green-dark)" }} />
          Detalle por persona
        </div>
        <div className="px-2 pb-2">
          {t.members.map((m) => {
            const [risk, tone] = teamRisk(m.horasMes)
            const pct = Math.round((m.horasMes / CAPACIDAD_MENSUAL_HORAS) * 100)
            return (
              <div key={m.id} className="flex items-center gap-3 px-3 py-3 rounded-[10px] hover:bg-[color:var(--gco-surface-2)]">
                <span className="inline-flex items-center justify-center rounded-full shrink-0 text-[12px] font-bold" style={{ width: 38, height: 38, background: "var(--gco-green-soft)", color: "var(--gco-green-dark)" }}>
                  {m.ini}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold truncate">{m.nombre}</div>
                  <div className="text-[12px] truncate" style={{ color: "var(--gco-text-3)" }}>
                    {m.cargo}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end w-28">
                  <div className="text-[12px]" style={{ color: "var(--gco-text-3)" }}>
                    {m.horasMes} h · {pct}%
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden mt-1" style={{ background: "var(--gco-surface-2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: occTone(pct) }} />
                  </div>
                </div>
                <div className="hidden md:block text-center w-20">
                  <div className="text-[13px] font-bold">{m.inscripciones}</div>
                  <div className="text-[10.5px]" style={{ color: "var(--gco-text-3)" }}>
                    inscrip.
                  </div>
                </div>
                <div className="w-32 flex justify-end">
                  {m.pendientes > 0 ? (
                    <Chip tone="amber">{m.pendientes} por aprobar</Chip>
                  ) : (
                    <Chip tone={tone}>{TEAM_RISK_LABEL[risk]}</Chip>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

"use client"

/* ============================================================================
 * GCO · HOME role-adaptive
 * For+ → panel de gobierno (KPIs dinámicos del estado global).
 * Otros roles → home de bienvenida con accesos según permisos.
 * ========================================================================== */
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Compass,
  Eye,
  Gauge,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShieldPlus,
  Ticket,
  UserCog,
  Users,
  UserX,
  FileWarning,
  Image as ImageIcon,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { PERIODOS, Role, ROLE_LABEL, TODAY, type Period } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { cardStyle, Chip } from "../ui"
import { CapacityScreen } from "./operations"
import { CalendarioEventos } from "./calendario"
import { GestionEventos } from "./gestion-eventos"

/** Formato de miles es-CO (1235 → "1.235"). Utilitario de presentación. */
const nf = (n: number) => new Intl.NumberFormat("es-CO").format(n)

/** Fecha "última actualización" derivada del reloj de simulación (repositorio). */
function lastUpdateLabel(): string {
  const [y, m, d] = TODAY.split("-")
  return `${d}/${m}/${y} · 8:30 a. m.`
}

/** Color de nivel de ocupación según umbrales de saturación. */
function occTone(pct: number): { bar: string; text: string; label: string } {
  if (pct > 110) return { bar: "var(--gco-red)", text: "var(--gco-red)", label: "Sobre capacidad" }
  if (pct >= 91) return { bar: "var(--gco-orange)", text: "var(--gco-orange)", label: "Alta saturación" }
  if (pct >= 71) return { bar: "var(--gco-amber)", text: "#b98c00", label: "Riesgo moderado" }
  return { bar: "var(--gco-green)", text: "var(--gco-green-dark)", label: "Saludable" }
}

/** Selector de periodo del panel (escribe en el store). */
function PeriodPicker() {
  const periodo = useGco((s) => s.session.periodo)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fx inline-flex items-center gap-2.5 rounded-[10px] pl-3 pr-2.5 py-2 text-left"
        style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border)", boxShadow: "var(--gco-sh-1)" }}
      >
        <span className="inline-flex items-center justify-center rounded-[8px]" style={{ width: 30, height: 30, background: "var(--gco-green-soft)" }}>
          <CalendarDays size={16} style={{ color: "var(--gco-green-dark)" }} />
        </span>
        <span className="leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>
            Periodo
          </span>
          <span className="block text-[13.5px] font-bold" style={{ color: "var(--gco-text)" }}>
            {periodo}
          </span>
        </span>
        <ChevronDown size={15} style={{ color: "var(--gco-text-3)" }} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 py-1.5 pop" style={{ ...cardStyle, boxShadow: "var(--gco-sh-pop)", zIndex: 40 }}>
          {PERIODOS.map((p: Period) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                A.setPeriodo(p)
                setOpen(false)
              }}
              className="fx w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[color:var(--gco-surface-2)]"
              style={{ color: "var(--gco-text)" }}
            >
              {p}
              {p === periodo && <Check size={14} style={{ color: "var(--gco-green-dark)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Donut ICOD ---- */
function Donut({ pct }: { pct: number }) {
  const size = 120,
    th = 16,
    r = (size - th) / 2,
    c = 2 * Math.PI * r,
    len = (pct / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={th} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gco-green)"
          strokeWidth={th}
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-extrabold" style={{ fontSize: 22, color: "var(--gco-green-dark)" }}>
          {pct}%
        </div>
        <div className="text-[10px] font-semibold" style={{ color: "var(--gco-text-3)" }}>
          ICOD
        </div>
      </div>
    </div>
  )
}

function KP({
  icon: Icon,
  tone,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  tone: "blue" | "green" | "amber" | "purple" | "red" | "orange"
  label: string
  value: number | string
  href: string
}) {
  const soft = {
    blue: "var(--gco-blue-soft)",
    green: "var(--gco-green-soft)",
    amber: "var(--gco-amber-soft)",
    purple: "var(--gco-purple-soft)",
    red: "var(--gco-red-soft)",
    orange: "var(--gco-orange-soft)",
  }[tone]
  const fg = {
    blue: "var(--gco-blue)",
    green: "var(--gco-green-dark)",
    amber: "#b98c00",
    purple: "var(--gco-purple)",
    red: "var(--gco-red)",
    orange: "var(--gco-orange)",
  }[tone]
  return (
    <Link
      href={href}
      className="fx text-left p-4 flex items-center gap-3.5 fade transition-shadow hover:shadow-[var(--gco-sh-2)]"
      style={cardStyle}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{ width: 42, height: 42, background: soft }}
      >
        <Icon size={20} strokeWidth={2} style={{ color: fg }} />
      </span>
      <div className="min-w-0">
        <div
          className="text-[12px] font-medium leading-tight"
          style={{
            color: "var(--gco-text-2)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </div>
        <div className="font-extrabold tracking-tight mt-0.5" style={{ fontSize: 26, lineHeight: 1.05 }}>
          {value}
        </div>
      </div>
    </Link>
  )
}

/* ============================================================================
 * HOME FOR+
 * ========================================================================== */
function HomeForPlus() {
  const user = useGco(sel.user)
  const g = useGco(sel.governance)
  const { indicadores: ind, capacidad: cap, tareas: tk, agenda: ag, alertas: al } = g

  const prioridades: [string, string, number, LucideIcon, string][] = [
    ["Eventos que requieren decisión", "Revisar, solicitar ajustes, aprobar o rechazar", tk.porRevisar, Eye, "/gestion-de-eventos?tab=decision"],
    ["Solicitudes de acceso pendientes", "Definir permisos para nuevas áreas promotoras", tk.solicitudes, UserCog, "/solicitudes-de-acceso"],
    ["Revisiones fuera del ANS", "Eventos que superaron el tiempo esperado de respuesta", tk.vencidosANS, Clock, "/gestion-de-eventos?tab=decision"],
    ["Eventos pendientes de cierre", "Confirmar asistencia y resultado final", tk.cierre, CheckSquare, "/gestion-de-eventos?tab=gestion"],
  ]

  const allRiesgos: [string, number, LucideIcon, string][] = [
    ["Cruces de horario", al.cruces, AlertTriangle, "/calendario"],
    ["Pieza de comunicación pendiente", al.sinPieza, ImageIcon, "/gestion-de-eventos"],
    ["Responsable sin definir", al.sinResponsable, UserX, "/gestion-de-eventos"],
    ["Información incompleta", al.datosIncompletos, FileWarning, "/gestion-de-eventos"],
  ]
  const riesgos = allRiesgos.filter(([, count]) => count > 0)

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-extrabold tracking-tight text-balance" style={{ fontSize: 30, lineHeight: 1.1 }}>
            Hola, {user.corto}
          </h1>
          <p className="text-[15px] mt-1.5" style={{ color: "var(--gco-text-2)" }}>
            Aquí tienes las decisiones y alertas que requieren atención del Comité de Capacidad Organizacional.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[12.5px]" style={{ color: "var(--gco-text-3)" }}>
            <span className="inline-flex items-center gap-1.5"><UserCog size={14}/> Rol activo: <b style={{ color: "var(--gco-purple)" }}>{ROLE_LABEL[Role.ForPlus]}</b></span>
            <span className="inline-flex items-center gap-1.5"><RefreshCw size={14}/> Actualizado: <b style={{ color: "var(--gco-text-2)" }}>{lastUpdateLabel()}</b></span>
          </div>
        </div>
        <PeriodPicker />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-7">
        <KP icon={Eye} tone="amber" label="Requieren decisión" value={tk.porRevisar} href="/gestion-de-eventos?tab=decision" />
        <KP icon={Ticket} tone="green" label="Inscripciones abiertas" value={ag.inscripcionesAbiertas} href="/gestion-de-eventos?tab=gestion" />
        <KP icon={CheckSquare} tone="orange" label="Pendientes de cierre" value={tk.cierre} href="/gestion-de-eventos?tab=gestion" />
        <KP icon={Gauge} tone="purple" label="ICOD corporativo" value={`${cap.icod}%`} href="/capacidad" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-7">
        <div className="xl:col-span-2" style={cardStyle}>
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold" style={{ fontSize: 15 }}>
              <ListChecks size={17} style={{ color: "var(--gco-green-dark)" }} /> Prioridades de hoy
            </div>
            <Link href="/gestion-de-eventos" className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: "var(--gco-green-dark)" }}>Ver gestión <ArrowRight size={13}/></Link>
          </div>
          <div className="p-3">
            {prioridades.map(([title, desc, count, Ic, href]) => (
              <Link key={title} href={href} className="fx w-full flex items-center gap-3 px-3 py-3 rounded-[10px] hover:bg-[color:var(--gco-surface-2)]">
                <span className="inline-flex items-center justify-center rounded-[9px]" style={{ width: 36, height: 36, background: count > 0 ? "var(--gco-amber-soft)" : "var(--gco-green-soft)" }}>
                  <Ic size={17} style={{ color: count > 0 ? "#b98c00" : "var(--gco-green-dark)" }}/>
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[13.5px] font-bold">{title}</span>
                  <span className="block text-xs mt-0.5 truncate" style={{ color: "var(--gco-text-2)" }}>{desc}</span>
                </span>
                <Chip tone={count > 0 ? "amber" : "green"}>{count}</Chip>
                <ChevronRight size={15} style={{ color: "var(--gco-text-3)" }}/>
              </Link>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div className="px-5 pt-5 flex items-center gap-2 font-bold" style={{ fontSize: 15 }}>
            <CalendarDays size={17} style={{ color: "var(--gco-green-dark)" }} /> Hitos del periodo
          </div>
          <div className="p-4 space-y-4">
            <ValueRow label="Próximos eventos" value={`${ag.proximos} programados`} />
            <ValueRow label="Fecha de corte" value={ag.fechaCorte} />
            <ValueRow label="Próxima revisión For+" value={ag.sesionPriorizacion} />
            <ValueRow label="Publicación del periodo" value={ag.fechaPublicacion} />
            <Link href="/calendario" className="fx w-full inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-bold" style={{ background: "var(--gco-green-soft)", color: "var(--gco-green-dark)" }}>
              <CalendarDays size={15}/> Abrir calendario
            </Link>
          </div>
        </div>
      </div>

      <SectionTitle icon={Gauge} action={{ label: "Ver capacidad", href: "/capacidad" }}>Capacidad y concentración</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">
        <div className="lg:col-span-2 p-5" style={cardStyle}>
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <Donut pct={cap.icod}/>
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <CapTile icon={Clock} label="Horas comprometidas" value={`${nf(cap.comprometidas)} h`} color="var(--gco-text)" />
                <CapTile icon={Gauge} label="Horas disponibles" value={`${nf(cap.disponibles)} h`} color="var(--gco-green-dark)" />
              </div>
              <p className="text-xs" style={{ color: "var(--gco-text-2)" }}>
                {nf(cap.preventivas)} personas en prevención y {nf(cap.criticas)} en nivel crítico. Usa este dato para decidir antes de aprobar nuevos eventos.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5" style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>Mayor concentración</div>
          <div className="mt-2 text-lg font-extrabold">{cap.areaTop.area}</div>
          <div className="mt-1 text-3xl font-extrabold" style={{ color: "var(--gco-red)" }}>{cap.areaTop.pct}%</div>
          <p className="text-xs mt-2" style={{ color: "var(--gco-text-2)" }}>Área que requiere mayor cuidado al programar o aprobar nuevas actividades.</p>
          <Link href="/capacidad" className="mt-4 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--gco-green-dark)" }}>Ver detalle <ArrowRight size={13}/></Link>
        </div>
      </div>

      <SectionTitle icon={AlertTriangle}>Alertas que requieren acción</SectionTitle>
      <div style={cardStyle}>
        {riesgos.length === 0 ? (
          <div className="p-5 flex items-center gap-3 text-sm" style={{ color: "var(--gco-green-dark)" }}><CheckCircle2 size={18}/> No hay alertas críticas en el periodo.</div>
        ) : (
          <div className="p-3 grid md:grid-cols-2 gap-2">
            {riesgos.map(([label, count, Ic, href]) => (
              <Link key={label} href={href} className="fx flex items-center gap-3 p-3 rounded-[10px] hover:bg-[color:var(--gco-surface-2)]" style={{ borderLeft: "3px solid var(--gco-orange)" }}>
                <Ic size={17} style={{ color: "var(--gco-orange)" }}/>
                <span className="flex-1 text-[13px] font-semibold">{label}</span>
                <Chip tone="orange">{count}</Chip>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>{label}</div><div className="text-[13.5px] font-bold mt-0.5">{value}</div></div>
}

/* ---- Título de sección con ícono y acción opcional ---- */
function SectionTitle({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon
  children: React.ReactNode
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-2 font-bold tracking-tight" style={{ fontSize: 15 }}>
        <Icon size={17} style={{ color: "var(--gco-text-3)" }} />
        {children}
      </h3>
      {action && (
        <Link href={action.href} className="fx text-xs font-semibold inline-flex items-center gap-1" style={{ color: "var(--gco-green-dark)" }}>
          {action.label}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

/* ---- Tile de capacidad ---- */
function CapTile({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] p-3" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} style={{ color: "var(--gco-text-3)" }} />
        <span className="text-[10.5px] font-medium leading-tight" style={{ color: "var(--gco-text-3)" }}>
          {label}
        </span>
      </div>
      <div className="font-extrabold" style={{ fontSize: 19, color }}>
        {value}
      </div>
    </div>
  )
}

/* ============================================================================
 * HOME para roles no-For+
 * ========================================================================== */
function HomeGeneric() {
  const user = useGco(sel.user)
  const role = useGco(sel.role)
  const periodo = useGco((s) => s.session.periodo)
  const k = useGco(sel.kpis)

  const isColab = role === Role.Colaborador
  const isLider = role === Role.Lider
  const isArea = role === Role.AreaPromotora

  const accesos: [string, string, LucideIcon, string][] = []
  if (isColab) {
    accesos.push(
      ["Eventos disponibles", "Inscríbete a la agenda del periodo", Compass, "/eventos-disponibles"],
      ["Mis inscripciones", "Consulta tus inscripciones y citaciones", Ticket, "/mis-inscripciones"],
      ["Mi capacidad", "Radiografía de tu capacidad de aprendizaje", Gauge, "/capacidad"],
    )
  }
  if (isLider) {
    accesos.push(
      ["Mi equipo", "Capacidad y participación de tu equipo", ShieldCheck, "/personas"],
      ["Aprobaciones", "Solicitudes de aprobación asignadas a ti", ListChecks, "/aprobaciones"],
      ["Capacidad", "Saturación por área y vicepresidencia", Gauge, "/capacidad"],
    )
  }
  if (isArea) {
    accesos.push(
      ["Crear evento", "Registra un nuevo espacio de formación", ClipboardList, "/crear-evento"],
      ["Mis eventos", "Gestiona los eventos de tu área", ClipboardList, "/mis-eventos"],
      ["Inscritos y cupos", "Administra inscritos y solicita aprobaciones", ListChecks, "/inscritos-y-cupos"],
    )
  }
  accesos.push(["Solicitar acceso", "Pide permisos como área promotora a For+", ShieldPlus, "/solicitar-acceso"])

  return (
    <>
      <div className="mb-5">
        <h1 className="font-extrabold tracking-tight" style={{ fontSize: 28 }}>
          Hola, {user.corto}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--gco-text-2)" }}>
          {isColab
            ? "Explora la agenda de formación, sensibilización y experiencias."
            : isLider
              ? "Consulta la capacidad y participación de tu equipo."
              : "Gestiona los espacios de tu área promotora."}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs" style={{ color: "var(--gco-text-3)" }}>
          <span className="inline-flex items-center gap-1.5">
            <UserCog size={13} />
            Rol activo: <b style={{ color: "var(--gco-green-dark)" }}>{ROLE_LABEL[role]}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            Periodo: <b style={{ color: "var(--gco-text-2)" }}>{periodo}</b>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <KP icon={CalendarDays} tone="blue" label="Eventos este periodo" value={k.registrados} href="/calendario" />
        <KP icon={CheckCircle2} tone="green" label="Aprobados / publicados" value={k.proximos} href="/calendario" />
        <KP icon={Gauge} tone="purple" label="Capacidad disponible" value="76 h" href="/capacidad" />
      </div>

      <h3 className="text-sm font-bold mb-3">Accesos rápidos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {accesos.map(([title, desc, Ic, href]) => (
          <Link key={title} href={href} className="fx p-4 flex items-start gap-3 hover:-translate-y-0.5 transition-transform" style={cardStyle}>
            <span className="inline-flex items-center justify-center rounded-[12px] shrink-0" style={{ width: 42, height: 42, background: "var(--gco-green-soft)" }}>
              <Ic size={20} style={{ color: "var(--gco-green-dark)" }} />
            </span>
            <span>
              <span className="block text-sm font-bold">{title}</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

/* ============================================================================
 * HOME LÍDER — foco en el equipo a cargo (capacidad, participación y
 * aprobaciones pendientes). El líder no crea eventos.
 * ========================================================================== */
function HomeLider() {
  const user = useGco(sel.user)
  const periodo = useGco((s) => s.session.periodo)
  const t = useGco(sel.team)
  const unread = useGco(sel.unread(Role.Lider))

  const kpis: [LucideIcon, "blue" | "green" | "amber" | "red" | "purple", string, number | string, string][] = [
    [Users, "blue", "Personas a cargo", t.total, "/mi-equipo"],
    [Ticket, "green", "Inscripciones activas", t.inscripciones, "/mi-equipo"],
    [ListChecks, "amber", "Pendientes de aprobación", t.pendientes, "/aprobaciones"],
    [Gauge, t.criticos > 0 ? "red" : "purple", "Ocupación del equipo", `${t.ocupacion}%`, "/mi-equipo"],
  ]

  const accesos: [string, string, LucideIcon, string][] = [
    ["Mi equipo", "Capacidad y participación de tu equipo", Users, "/mi-equipo"],
    ["Aprobaciones", "Solicitudes de aprobación asignadas a ti", ListChecks, "/aprobaciones"],
    ["Calendario", "Agenda de eventos del periodo", CalendarDays, "/calendario"],
    ["Notificaciones", "Avisos e inscripciones de tu equipo", Bell, "/notificaciones"],
  ]

  return (
    <>
      <div className="mb-5">
        <h1 className="font-extrabold tracking-tight" style={{ fontSize: 28 }}>
          Hola, {user.corto}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--gco-text-2)" }}>
          Acompaña la capacidad y participación de tu equipo, y resuelve las aprobaciones pendientes.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs" style={{ color: "var(--gco-text-3)" }}>
          <span className="inline-flex items-center gap-1.5">
            <UserCog size={13} />
            Rol activo: <b style={{ color: "var(--gco-green-dark)" }}>{ROLE_LABEL[Role.Lider]}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            Periodo: <b style={{ color: "var(--gco-text-2)" }}>{periodo}</b>
          </span>
          {unread > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Bell size={13} />
              <b style={{ color: "var(--gco-text-2)" }}>{unread}</b> sin leer
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {kpis.map(([Ic, tone, label, value, href]) => (
          <KP key={label} icon={Ic} tone={tone} label={label} value={value} href={href} />
        ))}
      </div>

      {t.pendientes > 0 && (
        <Link
          href="/aprobaciones"
          className="fx flex items-center gap-3 px-4 py-3.5 mb-5 rounded-[12px] transition-shadow hover:shadow-[var(--gco-sh-2)]"
          style={{ ...cardStyle, borderLeft: "3px solid var(--gco-amber)" }}
        >
          <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: 40, height: 40, background: "var(--gco-amber-soft)" }}>
            <ListChecks size={20} style={{ color: "#b98c00" }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-bold">Tienes {t.pendientes} inscripciones por aprobar</span>
            <span className="block text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>
              Revisa las solicitudes de cupo de tu equipo antes de la fecha de corte.
            </span>
          </span>
          <ChevronRight size={16} style={{ color: "var(--gco-text-3)" }} />
        </Link>
      )}

      <h3 className="text-sm font-bold mb-3">Accesos rápidos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {accesos.map(([title, desc, Ic, href]) => (
          <Link key={title} href={href} className="fx p-4 flex items-start gap-3 hover:-translate-y-0.5 transition-transform" style={cardStyle}>
            <span className="inline-flex items-center justify-center rounded-[12px] shrink-0" style={{ width: 42, height: 42, background: "var(--gco-green-soft)" }}>
              <Ic size={20} style={{ color: "var(--gco-green-dark)" }} />
            </span>
            <span>
              <span className="block text-sm font-bold">{title}</span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function Home() {
  const role = useGco(sel.role)
  if (role === Role.ForPlus) return <GestionEventos />
  if (role === Role.AreaPromotora) return <CalendarioEventos />
  return <CapacityScreen />
}

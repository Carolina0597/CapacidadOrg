"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  Monitor,
  Search,
  Star,
  Users,
  UserCheck,
  X,
} from "lucide-react"
import { ACT, Role, USERS, getEventLifecycle, type ActivityType, type GcoEvent } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Btn, Card, Chip, PageHeader, cx } from "@/components/gco/ui"
import { EventLifecycleLine } from "@/components/gco/event-lifecycle"

type CalendarView = "semana" | "mes" | "lista"

type CalendarItem = {
  id: string
  title: string
  type: ActivityType | ""
  area: string
  status: GcoEvent["estado"]
  date: string
  start: string
  end: string
  modality: string
  location: string
  people: number
  approved: boolean
}

const DEFAULT_TYPE_THEME = { bg: "#edf1f5", border: "#c9d2dd", fg: "#526278" }

const TYPE_THEME: Record<string, { bg: string; border: string; fg: string }> = {
  normativa: { bg: "#eaf2ff", border: "#9fc2f4", fg: "#1761ad" },
  formacion_normativa: { bg: "#eaf2ff", border: "#9fc2f4", fg: "#1761ad" },
  voluntaria: { bg: "#fff4d8", border: "#efc768", fg: "#976000" },
  formacion_voluntaria: { bg: "#fff4d8", border: "#efc768", fg: "#976000" },
  corporativa: { bg: "#e8f6e5", border: "#a7d99d", fg: "#277c27" },
  formacion_corporativa: { bg: "#e8f6e5", border: "#a7d99d", fg: "#277c27" },
  experiencia: { bg: "#f1e9fb", border: "#c8a9eb", fg: "#7241a6" },
  sensibilizacion: { bg: "#e6f7f7", border: "#91d5d8", fg: "#13787d" },
  asesoria: { bg: "#fde9ec", border: "#f3a9b4", fg: "#b33a4d" },
  asesorias: { bg: "#fde9ec", border: "#f3a9b4", fg: "#b33a4d" },
  otras: DEFAULT_TYPE_THEME,
  otra: DEFAULT_TYPE_THEME,
  default: DEFAULT_TYPE_THEME,
}

function normalizeType(value?: string) {
  return (value || "default")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "default"
}

function getTypeTheme(value?: string) {
  return TYPE_THEME[normalizeType(value)] ?? DEFAULT_TYPE_THEME
}


const MANAGEMENT_STATE_THEME: Record<string,{bg:string;border:string;fg:string}> = {
  borrador:{bg:"#f1f5f9",border:"#cbd5e1",fg:"#475569"},
  en_revision:{bg:"#eaf2ff",border:"#93b7f5",fg:"#1d4ed8"},
  devuelto:{bg:"#fff7d6",border:"#f2c94c",fg:"#9a6700"},
  rechazado:{bg:"#fde8ec",border:"#f1a5b2",fg:"#b4233f"},
  priorizado_otro_periodo:{bg:"#f3e8ff",border:"#c4a3e8",fg:"#7e22ce"},
  aprobado:{bg:"#e8f7ec",border:"#9fd2aa",fg:"#247a35"},
  publicado:{bg:"#e8f7ec",border:"#9fd2aa",fg:"#247a35"},
  inscripciones_abiertas:{bg:"#e5f8f0",border:"#83d4b4",fg:"#087f5b"},
  inscripciones_cerradas:{bg:"#fff3dc",border:"#edbd67",fg:"#9a5b00"},
  gestion_participantes:{bg:"#fff3dc",border:"#edbd67",fg:"#9a5b00"},
  en_aprobacion:{bg:"#fff3dc",border:"#edbd67",fg:"#9a5b00"},
  cupos_asignados:{bg:"#edf6ff",border:"#9fc8ef",fg:"#1761ad"},
  citado:{bg:"#edf6ff",border:"#9fc8ef",fg:"#1761ad"},
  en_ejecucion:{bg:"#e8f7ec",border:"#91cf9f",fg:"#247a35"},
  pendiente_cierre:{bg:"#fff0e5",border:"#f2b27f",fg:"#c35b13"},
  cerrado:{bg:"#e9f7ef",border:"#8fd1a6",fg:"#1f7a3f"},
  cancelado:{bg:"#f3f4f6",border:"#cbd5e1",fg:"#64748b"},
}
const PERSONAL_THEME = {
  obligatorio:{bg:"#fff1e6",border:"#f2a65a",fg:"#b45309"},
  inscrito:{bg:"#e8f7ec",border:"#86c995",fg:"#247a35"},
  invitado:{bg:"#f2eaff",border:"#bea0e5",fg:"#7e3fb2"},
  disponible:{bg:"#eef3f7",border:"#cbd5df",fg:"#536274"},
  neutro:{bg:"#f6f7f9",border:"#d9dee5",fg:"#7b8794"},
}

function getActivityLabel(value?: string) {
  if (!value) return "Evento"
  const direct = ACT[value as keyof typeof ACT]
  if (direct) return direct[0]
  const normalized = normalizeType(value)
  const match = Object.entries(ACT).find(([key]) => normalizeType(key) === normalized)
  return match?.[1]?.[0] ?? value
}


function hasUserScheduleConflict(event:GcoEvent,userId:string,events:GcoEvent[],enrollments:any[]){
  const sessions=event.sesiones||[]
  return enrollments.filter(en=>en.userId===userId&&en.eventId!==event.id&&en.estadoInscripcion!=="cancelado").some(en=>{
    const other=events.find(e=>e.id===en.eventId)
    return (other?.sesiones||[]).some(a=>sessions.some(b=>a.fecha===b.fecha&&a.ini<b.fin&&a.fin>b.ini))
  })
}

const DEMO_SCHEDULE = [
  ["08:00", "10:00", "Virtual"],
  ["10:30", "12:00", "Auditorio principal"],
  ["14:00", "16:00", "Sala creativa"],
  ["08:30", "10:30", "Virtual"],
  ["14:30", "16:30", "Auditorio principal"],
] as const

function monthFromPeriod(period: string) {
  const months: Record<string, number> = {
    Enero: 0,
    Febrero: 1,
    Marzo: 2,
    Abril: 3,
    Mayo: 4,
    Junio: 5,
    Julio: 6,
    Agosto: 7,
    Septiembre: 8,
    Octubre: 9,
    Noviembre: 10,
    Diciembre: 11,
  }
  const [name, yearText] = period.split(" ")
  return new Date(Number(yearText) || 2026, months[name] ?? 7, 1)
}

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function itemFromEvent(event: GcoEvent, index: number, visibleMonth: Date): CalendarItem {
  const session = event.sesiones?.[0]
  const fallbackDay = 4 + ((index * 3) % 22)
  const date = session?.fecha || event.fecha || iso(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), fallbackDay))
  const demo = DEMO_SCHEDULE[index % DEMO_SCHEDULE.length]
  const model = (event.model || {}) as Record<string, any>
  return {
    id: event.id,
    title: event.nombre,
    type: event.tipo,
    area: event.area,
    status: event.estado,
    date,
    start: session?.horaInicio || model.horaInicio || demo[0],
    end: session?.horaFin || model.horaFin || demo[1],
    modality: session?.modalidad || model.modalidad || (index % 2 ? "Presencial" : "Virtual"),
    location: session?.lugar || model.lugar || demo[2],
    people: event.publicoObjetivo || event.cupos || 0,
    approved: ["aprobado", "aprobado_condicionado", "publicado", "pendiente_cierre", "cerrado"].includes(event.estado),
  }
}

function Kpi({ icon: Icon, label, value, note, tone }: { icon: typeof CalendarDays; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0 px-4 py-3 border-r last:border-r-0" style={{ borderColor: "var(--gco-border)" }}>
      <span className="shrink-0 grid place-items-center rounded-full" style={{ width: 44, height: 44, background: `${tone}18`, color: tone }}>
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold truncate" style={{ color: "var(--gco-text-2)" }}>{label}</p>
        <p className="text-[24px] font-extrabold leading-tight tracking-tight" style={{ color: "var(--gco-navy)" }}>{value}</p>
        <p className="text-[10px] font-semibold truncate" style={{ color: "var(--gco-green-dark)" }}>{note}</p>
      </div>
    </div>
  )
}

export function CalendarioEventos() {
  const router = useRouter()
  const period = useGco((s) => s.session.periodo)
  const role = useGco((s) => s.session.role)
  const userId = useGco((s) => s.session.userId)
  const allEvents = useGco(sel.events)
  const enrollments = useGco((s) => s.enrollments)
  const attendance = useGco((s) => s.attendance)
  const isManagement = role === Role.ForPlus || role === Role.AreaPromotora
  const publicStates = new Set(["aprobado", "aprobado_condicionado", "publicado", "inscripciones_abiertas", "inscripciones_cerradas", "gestion_participantes", "en_aprobacion", "cupos_asignados", "citacion_pendiente", "citado", "en_ejecucion", "pendiente_cierre", "cerrado", "reprogramado"])
  const events = isManagement ? allEvents : allEvents.filter((event) => publicStates.has(event.estado))
  const [view, setView] = useState<CalendarView>("semana")
  const [anchor, setAnchor] = useState(() => monthFromPeriod(period))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("todos")
  const [modality, setModality] = useState("todas")
  const [selected, setSelected] = useState<CalendarItem | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])
  const [feedback, setFeedback] = useState("")

  const items = useMemo(() => events.map((e, i) => itemFromEvent(e, i, anchor)), [events, anchor])
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.area}`.toLowerCase()
    return (!search || haystack.includes(search.toLowerCase())) &&
      (type === "todos" || item.type === type) &&
      (modality === "todas" || item.modality.toLowerCase().includes(modality))
  }), [items, search, type, modality])

  const weekStart = startOfWeek(anchor)
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 10 }, (_, i) => i + 7)
  const monthLabel = anchor.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  const monthItems = filtered.filter((i) => {
    const d = new Date(`${i.date}T12:00:00`)
    return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear()
  })
  const totalHours = filtered.reduce((sum, item) => {
    const [sh, sm] = item.start.split(":").map(Number)
    const [eh, em] = item.end.split(":").map(Number)
    return sum + Math.max(0, eh + em / 60 - sh - sm / 60)
  }, 0)
  const areas = new Set(filtered.map((i) => i.area)).size
  const approved = filtered.filter((i) => i.approved).length

  const move = (dir: number) => {
    const d = new Date(anchor)
    if (view === "semana") d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  const openEvent = (item: CalendarItem) => { setSelected(item); setSelectedSessions([]); setFeedback("") }
  const eventById = (id: string) => events.find((e) => e.id === id)
  const attendanceCount = (id: string) => attendance.filter((a) => a.eventId === id).length
  const isMandatory = (event?: GcoEvent) => {
    if (!event) return false
    const model = (event.model || {}) as Record<string, unknown>
    return model.obligatorio === true || model.esObligatorio === true || event.tipo === "normativa" || event.tipo === "corporativa"
  }
  const isInvited = (event?: GcoEvent) => {
    if (!event) return false
    const model = (event.model || {}) as any
    const currentUser = USERS[userId]
    return (model.invitadosIds || []).includes(userId) || (model.invitadosCorreos || []).includes(currentUser?.correo)
  }
  const personalEnrollment = (eventId: string) => enrollments.find(en=>en.eventId===eventId && en.userId===userId && en.estadoInscripcion!=="cancelado")
  const lifecycleLabel = (id: string) => {
    const event = eventById(id)
    if (!event) return ""
    if (!isManagement) {
      const enrollment = personalEnrollment(id)
      if (enrollment) return enrollment.estadoCupo === "aprobado" ? "Inscrito · Cupo confirmado" : "Ya estás inscrito"
      if (isInvited(event)) return isMandatory(event) ? "Invitado · Asistencia obligatoria" : "Invitado"
      if (event.estado === "inscripciones_abiertas") return "Inscripción activa"
      if (isMandatory(event)) return "Asistencia obligatoria"
      return "Ver detalle"
    }
    const life = getEventLifecycle(event, attendanceCount(id))
    return `${life.principal}${life.subestado ? ` · ${life.subestado}` : ""}`
  }
  const calendarTheme = (item:CalendarItem) => {
    const event=eventById(item.id)
    if(!event) return DEFAULT_TYPE_THEME
    if(isManagement) return MANAGEMENT_STATE_THEME[event.estado] ?? MANAGEMENT_STATE_THEME.aprobado
    const enrollment=personalEnrollment(item.id)
    if(enrollment) return PERSONAL_THEME.inscrito
    if(isMandatory(event)) return PERSONAL_THEME.obligatorio
    if(isInvited(event)) return PERSONAL_THEME.invitado
    if(event.estado==="inscripciones_abiertas") return PERSONAL_THEME.disponible
    return PERSONAL_THEME.neutro
  }
  const currentEnrollment = selected ? enrollments.find((enrollment) => enrollment.eventId === selected.id && enrollment.userId === userId && enrollment.estadoInscripcion !== "cancelado") : undefined
  const enrollSelected = () => {
    if (!selected) return
    const event = eventById(selected.id)
    if (!event) return
    const sessionIds = selectedSessions.length ? selectedSessions : (event.sesiones || []).map((session: any) => session.id || session.nombre)
    if (hasUserScheduleConflict(event,userId,events,enrollments)) {
      setFeedback("No puedes inscribirte todavía: ya tienes otro evento o citación en la misma fecha y hora.")
      return
    }
    const result = A.enroll(event.id, userId, sessionIds, { confirmaDisponibilidad: true, aceptaPoliticaCancelacion: true, aceptaNoGarantiaCupo: true })
    setFeedback(result ? "Inscripción registrada correctamente. Tu líder recibió un aviso informativo; no requiere decisión salvo que el área promotora solicite aprobación formal." : "No fue posible registrar la inscripción o ya tienes una inscripción activa.")
  }

  return (
    <main className="px-4 md:px-7 py-6 max-w-[1600px] w-full mx-auto">
      <PageHeader
        title={isManagement ? "Cronograma de eventos" : "Agenda de eventos"}
        sub={isManagement ? "Visión semanal y mensual de todos los eventos y sus estados" : "Consulta los eventos disponibles, las inscripciones activas y tus eventos obligatorios"}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => move(-1)} className="fx grid place-items-center rounded-[10px] bg-white border" style={{ width: 40, height: 40, borderColor: "var(--gco-border-strong)" }} aria-label="Periodo anterior"><ChevronLeft size={18} /></button>
            <div className="min-w-[170px] rounded-[11px] bg-white border px-4 py-2" style={{ borderColor: "var(--gco-border-strong)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "var(--gco-text-3)" }}>Periodo visible</p>
              <p className="text-sm font-bold capitalize">{monthLabel}</p>
            </div>
            <button onClick={() => move(1)} className="fx grid place-items-center rounded-[10px] bg-white border" style={{ width: 40, height: 40, borderColor: "var(--gco-border-strong)" }} aria-label="Periodo siguiente"><ChevronRight size={18} /></button>
            <button onClick={() => setAnchor(monthFromPeriod(period))} className="fx inline-flex items-center gap-2 rounded-[10px] bg-white border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--gco-border-strong)" }}><CalendarDays size={16} /> Hoy</button>
            <button onClick={() => setFiltersOpen((v) => !v)} className="fx inline-flex items-center gap-2 rounded-[10px] bg-white border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: filtersOpen ? "var(--gco-green)" : "var(--gco-border-strong)", color: filtersOpen ? "var(--gco-green-dark)" : "var(--gco-text)" }}><Filter size={16} /> Filtros</button>
          </div>
        }
      />

      <Card className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 overflow-hidden mb-5">
        {isManagement ? <>
          <Kpi icon={CalendarDays} label="Eventos visibles" value={String(filtered.length)} note={`Periodo ${period}`} tone="#7254d8" />
          <Kpi icon={Clock3} label="Horas programadas" value={totalHours.toFixed(totalHours % 1 ? 1 : 0)} note="Según sesiones registradas" tone="#2478d2" />
          <Kpi icon={Users} label="Personas impactadas" value={filtered.reduce((s, i) => s + i.people, 0).toLocaleString("es-CO")} note="Público objetivo" tone="#4aa633" />
          <Kpi icon={Star} label="Áreas promoviendo" value={String(areas)} note="Áreas activas" tone="#e6a31a" />
          <Kpi icon={CheckCircle2} label="Eventos aprobados" value={String(approved)} note={filtered.length ? `${Math.round((approved / filtered.length) * 100)}% del total` : "Sin registros"} tone="#dc5465" />
        </> : <>
          <Kpi icon={CalendarDays} label="Eventos del periodo" value={String(filtered.length)} note={`Periodo ${period}`} tone="#7254d8" />
          <Kpi icon={Clock3} label="Horas programadas" value={totalHours.toFixed(totalHours % 1 ? 1 : 0)} note="Agenda visible" tone="#2478d2" />
          <Kpi icon={UserCheck} label="Inscripciones activas" value={String(events.filter((e) => e.estado === "inscripciones_abiertas").length)} note="Puedes inscribirte" tone="#4aa633" />
          <Kpi icon={Star} label="Eventos obligatorios" value={String(events.filter(isMandatory).length)} note="Asistencia requerida" tone="#e6a31a" />
          <Kpi icon={CheckCircle2} label="Mis inscripciones" value={String(enrollments.filter((e) => e.userId === userId && e.estadoInscripcion !== "cancelado").length)} note="Registradas" tone="#dc5465" />
        </>}
      </Card>

      {filtersOpen && (
        <Card className="p-4 mb-5 fade">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-xs font-semibold mb-1.5">Buscar</span>
              <span className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gco-text-3)" }} /><input className="in pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Evento o área" /></span>
            </label>
            <label className="block"><span className="block text-xs font-semibold mb-1.5">Tipo</span><select className="in" value={type} onChange={(e) => setType(e.target.value)}><option value="todos">Todos</option>{Object.entries(ACT).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
            <label className="block"><span className="block text-xs font-semibold mb-1.5">Modalidad</span><select className="in" value={modality} onChange={(e) => setModality(e.target.value)}><option value="todas">Todas</option><option value="virtual">Virtual</option><option value="presencial">Presencial</option><option value="híbrida">Híbrida</option></select></label>
            <button onClick={() => { setSearch(""); setType("todos"); setModality("todas") }} className="fx inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold bg-white" style={{ borderColor: "var(--gco-border-strong)" }}><X size={15} /> Limpiar</button>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold">{view === "semana" ? "Vista semanal" : view === "mes" ? "Vista mensual" : "Listado de eventos"}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--gco-text-3)" }}>{filtered.length} eventos según los filtros activos</p>
        </div>
        <div className="inline-flex rounded-[10px] border bg-white p-1 self-start" style={{ borderColor: "var(--gco-border-strong)" }}>
          {(["semana", "mes", "lista"] as CalendarView[]).map((v) => <button key={v} onClick={() => setView(v)} className="fx rounded-[8px] px-5 py-2 text-xs font-bold capitalize" style={view === v ? { background: "var(--gco-green)", color: "white" } : { color: "var(--gco-text-2)" }}>{v}</button>)}
        </div>
      </div>

      {view === "semana" && (
        <Card className="overflow-x-auto">
          <div className="min-w-[980px] grid" style={{ gridTemplateColumns: "64px repeat(5, minmax(178px, 1fr))" }}>
            <div className="border-b border-r bg-white" style={{ borderColor: "var(--gco-border)" }} />
            {days.map((day) => <div key={day.toISOString()} className="text-center py-3 border-b border-r last:border-r-0 bg-white" style={{ borderColor: "var(--gco-border)" }}><p className="text-xs font-bold capitalize">{day.toLocaleDateString("es-CO", { weekday: "long" })}</p><p className="text-sm font-extrabold mt-0.5">{day.getDate()}</p></div>)}
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="text-[11px] text-right pr-2 pt-2 border-r border-b bg-white" style={{ minHeight: 76, borderColor: "var(--gco-border)", color: "var(--gco-text-3)" }}>{hour > 12 ? `${hour - 12}:00 p. m.` : `${hour}:00`}</div>
                {days.map((day) => {
                  const dayIso = iso(day)
                  const slots = filtered.filter((item) => item.date === dayIso && Number(item.start.split(":")[0]) === hour)
                  return <div key={`${dayIso}-${hour}`} className="relative border-r border-b last:border-r-0 p-1.5" style={{ minHeight: 76, borderColor: "var(--gco-border)", background: hour % 2 ? "#fff" : "#fbfcfd" }}>{slots.map((item) => { const theme = calendarTheme(item); return <button key={item.id} onClick={() => openEvent(item)} className="fx text-left w-full rounded-[8px] px-2.5 py-2 mb-1 border hover:-translate-y-0.5 transition-transform" style={{ background: theme.bg, borderColor: theme.border, color: "var(--gco-text)" }}><p className="text-[11px] font-extrabold" style={{ color: theme.fg }}>{item.start} – {item.end}</p><p className="text-xs font-bold mt-0.5 line-clamp-2">{item.title}</p><p className="text-[9px] font-semibold mt-1 line-clamp-1" style={{color:theme.fg}}>{lifecycleLabel(item.id)}</p><div className="flex items-center justify-between gap-2 mt-1"><span className="text-[10px] truncate">{getActivityLabel(item.type)}</span>{item.modality.toLowerCase().includes("virtual") ? <Monitor size={13} style={{ color: theme.fg }} /> : <MapPin size={13} style={{ color: theme.fg }} />}</div></button> })}</div>
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "mes" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 bg-white border-b" style={{ borderColor: "var(--gco-border)" }}>{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="py-3 text-center text-xs font-bold">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, index) => {
              const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
              const offset = (first.getDay() || 7) - 1
              const date = new Date(anchor.getFullYear(), anchor.getMonth(), index - offset + 1)
              const current = date.getMonth() === anchor.getMonth()
              const dayItems = monthItems.filter((i) => i.date === iso(date))
              return <div key={index} className="min-h-[118px] p-2 border-r border-b" style={{ borderColor: "var(--gco-border)", background: current ? "#fff" : "#f8fafc" }}><span className="text-xs font-bold" style={{ color: current ? "var(--gco-text)" : "var(--gco-text-3)" }}>{date.getDate()}</span><div className="mt-1.5 space-y-1">{dayItems.slice(0, 3).map((item) => { const theme = calendarTheme(item); return <button key={item.id} onClick={() => openEvent(item)} className="w-full text-left rounded px-2 py-1 text-[10px] font-semibold truncate border" style={{ background: theme.bg, borderColor: theme.border, color: theme.fg }}><span className="block truncate">{item.start} {item.title}</span><span className="block text-[8px] mt-0.5 truncate">{lifecycleLabel(item.id)}</span></button> })}{dayItems.length > 3 && <span className="text-[10px] font-semibold" style={{ color: "var(--gco-text-3)" }}>+{dayItems.length - 3} más</span>}</div></div>
            })}
          </div>
        </Card>
      )}

      {view === "lista" && (
        <Card className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--gco-border)" }}>{filtered.length ? filtered.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).map((item) => { const theme = calendarTheme(item); return <button key={item.id} onClick={() => openEvent(item)} className="w-full text-left grid grid-cols-1 md:grid-cols-[120px_1fr_180px_150px] gap-3 items-center px-5 py-4 hover:bg-slate-50"><div><p className="text-xs font-bold">{new Date(`${item.date}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</p><p className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>{item.start} – {item.end}</p></div><div><p className="font-bold text-sm">{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>{item.area}</p>{isManagement && eventById(item.id) && <EventLifecycleLine event={eventById(item.id)!} attendanceCount={attendanceCount(item.id)} compact />}</div><span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: theme.fg }}><span className="w-2 h-2 rounded-full" style={{ background: theme.fg }} />{getActivityLabel(item.type)}</span>{eventById(item.id) && (isManagement ? (()=>{const life=getEventLifecycle(eventById(item.id)!,attendanceCount(item.id));return <Chip tone={life.tone}>{life.principal}{life.subestado?` · ${life.subestado}`:""}</Chip>})() : <Chip tone={eventById(item.id)!.estado === "inscripciones_abiertas" ? "green" : isMandatory(eventById(item.id)) ? "amber" : "neutral"}>{lifecycleLabel(item.id)}</Chip>)}</button> }) : <div className="py-16 text-center"><CalendarDays size={34} className="mx-auto mb-3" style={{ color: "var(--gco-text-3)" }} /><p className="font-bold">No hay eventos con estos filtros</p></div>}</div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 rounded-[12px] border bg-white px-4 py-3" style={{ borderColor: "var(--gco-border)" }}>
        {isManagement?Object.entries({"En revisión":MANAGEMENT_STATE_THEME.en_revision,"En inscripción":MANAGEMENT_STATE_THEME.inscripciones_abiertas,"Pendiente de ejecución":MANAGEMENT_STATE_THEME.cupos_asignados,"Pendiente de cierre":MANAGEMENT_STATE_THEME.pendiente_cierre,"Cerrado":MANAGEMENT_STATE_THEME.cerrado,"Rechazado / cancelado":MANAGEMENT_STATE_THEME.rechazado}).map(([label,theme])=><span key={label} className="inline-flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-full" style={{background:theme.fg}}/>{label}</span>):Object.entries({"Inscrito":PERSONAL_THEME.inscrito,"Invitado":PERSONAL_THEME.invitado,"Obligatorio":PERSONAL_THEME.obligatorio,"Disponible":PERSONAL_THEME.disponible,"Otros eventos":PERSONAL_THEME.neutro}).map(([label,theme])=><span key={label} className="inline-flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-full" style={{background:theme.fg}}/>{label}</span>)}
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold"><Monitor size={14} /> Virtual</span>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold"><MapPin size={14} /> Presencial</span>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-slate-950/45" onClick={() => setSelected(null)} aria-label="Cerrar detalle" />
          <div className="relative w-full max-w-lg rounded-[16px] bg-white p-6 shadow-2xl fade">
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 grid place-items-center rounded-full bg-slate-100" style={{ width: 32, height: 32 }}><X size={16} /></button>
            {(() => { const model = (eventById(selected.id)?.model || {}) as any; const img = model.piezaEvento?.urlTemporal || model.piezaUrl || model.imagen; return <img src={img || "/placeholder.jpg"} alt="Pieza del evento" className="w-full h-40 object-cover rounded-xl mb-4" /> })()}
            <p className="text-xs font-bold mb-2" style={{ color: getTypeTheme(selected.type).fg }}>{getActivityLabel(selected.type)}</p>
            <h3 className="text-xl font-extrabold pr-8">{selected.title}</h3>
            <p className="text-sm mt-1" style={{ color: "var(--gco-text-2)" }}>{selected.area}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Fecha y hora</p><p className="text-sm font-bold mt-1">{new Date(`${selected.date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-xs mt-1">{selected.start} – {selected.end}</p></div>
              <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Modalidad y lugar</p><p className="text-sm font-bold mt-1">{selected.modality}</p><p className="text-xs mt-1">{selected.location}</p></div>
            </div>
            {isManagement && eventById(selected.id) && <div className="mt-5"><EventLifecycleLine event={eventById(selected.id)!} attendanceCount={attendanceCount(selected.id)} /></div>}
            {!isManagement && eventById(selected.id) && <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {eventById(selected.id)!.estado === "inscripciones_abiertas" && <Chip tone="green">Inscripción activa</Chip>}
                {isMandatory(eventById(selected.id)) && <Chip tone="amber">Asistencia obligatoria</Chip>}
                {currentEnrollment && <Chip tone="blue">{currentEnrollment.estadoCupo === "aprobado" ? "Inscrito · Cupo confirmado" : "Ya estás inscrito"}</Chip>}
                {!currentEnrollment && isInvited(eventById(selected.id)) && <Chip tone="purple">Invitado por el área promotora</Chip>}
              </div>
              <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--gco-border)" }}>
                <p className="font-bold text-sm mb-2">Objetivo y detalle del evento</p>
                <p className="text-sm font-semibold mb-2">{String(((eventById(selected.id)!.model || {}) as any).objetivo || "Conoce el propósito y valida tu disponibilidad antes de inscribirte.")}</p>
                <p className="text-sm" style={{ color: "var(--gco-text-2)" }}>{String(((eventById(selected.id)!.model || {}) as any).descripcion || "Consulta la fecha, modalidad y condiciones antes de inscribirte.")}</p>
              </div>
              {eventById(selected.id)!.sesiones?.length > 0 && <div>
                <p className="font-bold text-sm mb-2">Selecciona la sesión</p>
                <div className="space-y-2">{eventById(selected.id)!.sesiones.map((session: any) => { const id = session.id || session.nombre; return <label key={id} className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--gco-border)" }}><input type="checkbox" checked={selectedSessions.includes(id)} onChange={(ev) => setSelectedSessions(ev.target.checked ? [...selectedSessions, id] : selectedSessions.filter((x) => x !== id))} /><span><b>{session.nombre || "Sesión"}</b><br />{session.fecha || selected.date} · {session.horaInicio || session.ini || selected.start} – {session.horaFin || session.fin || selected.end}</span></label> })}</div>
              </div>}
              {feedback && <div className="rounded-lg p-3 text-sm" style={{ background: "var(--gco-green-soft)" }}>{feedback}</div>}
            </div>}
            <div className="flex items-center justify-end gap-3 mt-5">
              {!isManagement && !currentEnrollment && eventById(selected.id)?.estado === "inscripciones_abiertas" && <Btn icon={UserCheck} onClick={enrollSelected}>Inscribirme</Btn>}
              {isManagement && <button onClick={() => router.push(`/evento/${selected.id}`)} className="fx inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white" style={{ background: "var(--gco-navy)" }}>Ver detalle <BarChart3 size={15} /></button>}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

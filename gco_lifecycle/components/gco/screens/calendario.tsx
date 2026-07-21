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
  X,
} from "lucide-react"
import { ACT, ES, type ActivityType, type GcoEvent } from "@/lib/gco/domain"
import { sel, useGco } from "@/lib/gco/store"
import { Card, Chip, PageHeader, cx } from "@/components/gco/ui"

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

const TYPE_THEME: Record<string, { bg: string; border: string; fg: string }> = {
  normativa: { bg: "#eaf2ff", border: "#9fc2f4", fg: "#1761ad" },
  voluntaria: { bg: "#fff4d8", border: "#efc768", fg: "#976000" },
  corporativa: { bg: "#e8f6e5", border: "#a7d99d", fg: "#277c27" },
  experiencia: { bg: "#f1e9fb", border: "#c8a9eb", fg: "#7241a6" },
  sensibilizacion: { bg: "#e6f7f7", border: "#91d5d8", fg: "#13787d" },
  asesoria: { bg: "#fde9ec", border: "#f3a9b4", fg: "#b33a4d" },
  default: { bg: "#edf1f5", border: "#c9d2dd", fg: "#526278" },
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
  const events = useGco(sel.events)
  const [view, setView] = useState<CalendarView>("semana")
  const [anchor, setAnchor] = useState(() => monthFromPeriod(period))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("todos")
  const [modality, setModality] = useState("todas")
  const [selected, setSelected] = useState<CalendarItem | null>(null)

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

  const openEvent = (item: CalendarItem) => setSelected(item)

  return (
    <main className="px-4 md:px-7 py-6 max-w-[1600px] w-full mx-auto">
      <PageHeader
        title="Cronograma de eventos"
        sub="Visión semanal y mensual de la agenda de formación, sensibilización y experiencias"
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
        <Kpi icon={CalendarDays} label="Eventos visibles" value={String(filtered.length)} note={`Periodo ${period}`} tone="#7254d8" />
        <Kpi icon={Clock3} label="Horas programadas" value={totalHours.toFixed(totalHours % 1 ? 1 : 0)} note="Según sesiones registradas" tone="#2478d2" />
        <Kpi icon={Users} label="Personas impactadas" value={filtered.reduce((s, i) => s + i.people, 0).toLocaleString("es-CO")} note="Público objetivo" tone="#4aa633" />
        <Kpi icon={Star} label="Áreas promoviendo" value={String(areas)} note="Áreas activas" tone="#e6a31a" />
        <Kpi icon={CheckCircle2} label="Eventos aprobados" value={String(approved)} note={filtered.length ? `${Math.round((approved / filtered.length) * 100)}% del total` : "Sin registros"} tone="#dc5465" />
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
                  return <div key={`${dayIso}-${hour}`} className="relative border-r border-b last:border-r-0 p-1.5" style={{ minHeight: 76, borderColor: "var(--gco-border)", background: hour % 2 ? "#fff" : "#fbfcfd" }}>{slots.map((item) => { const theme = TYPE_THEME[item.type] || TYPE_THEME.default; return <button key={item.id} onClick={() => openEvent(item)} className="fx text-left w-full rounded-[8px] px-2.5 py-2 mb-1 border hover:-translate-y-0.5 transition-transform" style={{ background: theme.bg, borderColor: theme.border, color: "var(--gco-text)" }}><p className="text-[11px] font-extrabold" style={{ color: theme.fg }}>{item.start} – {item.end}</p><p className="text-xs font-bold mt-0.5 line-clamp-2">{item.title}</p><div className="flex items-center justify-between gap-2 mt-1"><span className="text-[10px] truncate">{item.type ? ACT[item.type][0] : "Evento"}</span>{item.modality.toLowerCase().includes("virtual") ? <Monitor size={13} style={{ color: theme.fg }} /> : <MapPin size={13} style={{ color: theme.fg }} />}</div></button> })}</div>
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
              return <div key={index} className="min-h-[118px] p-2 border-r border-b" style={{ borderColor: "var(--gco-border)", background: current ? "#fff" : "#f8fafc" }}><span className="text-xs font-bold" style={{ color: current ? "var(--gco-text)" : "var(--gco-text-3)" }}>{date.getDate()}</span><div className="mt-1.5 space-y-1">{dayItems.slice(0, 3).map((item) => { const theme = TYPE_THEME[item.type] || TYPE_THEME.default; return <button key={item.id} onClick={() => openEvent(item)} className="w-full text-left rounded px-2 py-1 text-[10px] font-semibold truncate border" style={{ background: theme.bg, borderColor: theme.border, color: theme.fg }}>{item.start} {item.title}</button> })}{dayItems.length > 3 && <span className="text-[10px] font-semibold" style={{ color: "var(--gco-text-3)" }}>+{dayItems.length - 3} más</span>}</div></div>
            })}
          </div>
        </Card>
      )}

      {view === "lista" && (
        <Card className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--gco-border)" }}>{filtered.length ? filtered.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).map((item) => { const theme = TYPE_THEME[item.type] || TYPE_THEME.default; return <button key={item.id} onClick={() => openEvent(item)} className="w-full text-left grid grid-cols-1 md:grid-cols-[120px_1fr_180px_150px] gap-3 items-center px-5 py-4 hover:bg-slate-50"><div><p className="text-xs font-bold">{new Date(`${item.date}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</p><p className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>{item.start} – {item.end}</p></div><div><p className="font-bold text-sm">{item.title}</p><p className="text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>{item.area}</p></div><span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: theme.fg }}><span className="w-2 h-2 rounded-full" style={{ background: theme.fg }} />{item.type ? ACT[item.type][0] : "Evento"}</span><Chip tone={ES[item.status][1]}>{ES[item.status][0]}</Chip></button> }) : <div className="py-16 text-center"><CalendarDays size={34} className="mx-auto mb-3" style={{ color: "var(--gco-text-3)" }} /><p className="font-bold">No hay eventos con estos filtros</p></div>}</div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 rounded-[12px] border bg-white px-4 py-3" style={{ borderColor: "var(--gco-border)" }}>
        {Object.entries(ACT).map(([key, value]) => { const theme = TYPE_THEME[key]; return <span key={key} className="inline-flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-full" style={{ background: theme.fg }} />{value[0]}</span> })}
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold"><Monitor size={14} /> Virtual</span>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold"><MapPin size={14} /> Presencial</span>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-slate-950/45" onClick={() => setSelected(null)} aria-label="Cerrar detalle" />
          <div className="relative w-full max-w-lg rounded-[16px] bg-white p-6 shadow-2xl fade">
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 grid place-items-center rounded-full bg-slate-100" style={{ width: 32, height: 32 }}><X size={16} /></button>
            <p className="text-xs font-bold mb-2" style={{ color: TYPE_THEME[selected.type]?.fg || TYPE_THEME.default.fg }}>{selected.type ? ACT[selected.type][0] : "Evento"}</p>
            <h3 className="text-xl font-extrabold pr-8">{selected.title}</h3>
            <p className="text-sm mt-1" style={{ color: "var(--gco-text-2)" }}>{selected.area}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Fecha y hora</p><p className="text-sm font-bold mt-1">{new Date(`${selected.date}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-xs mt-1">{selected.start} – {selected.end}</p></div>
              <div className="rounded-[10px] bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Modalidad y lugar</p><p className="text-sm font-bold mt-1">{selected.modality}</p><p className="text-xs mt-1">{selected.location}</p></div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-5"><Chip tone={ES[selected.status][1]}>{ES[selected.status][0]}</Chip><button onClick={() => router.push(`/evento/${selected.id}`)} className="fx inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white" style={{ background: "var(--gco-navy)" }}>Ver detalle <BarChart3 size={15} /></button></div>
          </div>
        </div>
      )}
    </main>
  )
}

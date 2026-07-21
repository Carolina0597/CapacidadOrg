"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, UserCheck, XCircle } from "lucide-react"
import { ACT, ES, type GcoEvent } from "@/lib/gco/domain"
import { A, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, Card, Chip, PageHeader, StatusChip } from "../ui"

type View = "calendario" | "inscripciones" | "obligatorios"

function isMandatory(e: GcoEvent) {
  const m = (e.model || {}) as Record<string, unknown>
  return m.obligatorio === true || m.esObligatorio === true || e.tipo === "normativa" || e.tipo === "corporativa"
}

export function AgendaEventos() {
  const s = useGco((x) => x)
  const [view, setView] = useState<View>("calendario")
  const [selected, setSelected] = useState<GcoEvent | null>(null)
  const [sessions, setSessions] = useState<string[]>([])
  const [msg, setMsg] = useState("")
  const mine = s.enrollments.filter((e) => e.userId === s.session.userId)
  const visible = s.events.filter((e) => ["publicado", "inscripciones_abiertas", "inscripciones_cerradas", "citado", "en_ejecucion", "cerrado"].includes(e.estado))

  const list = useMemo(() => {
    if (view === "inscripciones") return visible.filter((e) => e.estado === "inscripciones_abiertas")
    if (view === "obligatorios") return visible.filter(isMandatory)
    return visible
  }, [view, visible])

  const current = selected ? mine.find((e) => e.eventId === selected.id) : undefined
  const enroll = () => {
    if (!selected) return
    const ids = sessions.length ? sessions : selected.sesiones.map((x: any) => x.id || x.nombre)
    const r = A.enroll(selected.id, s.session.userId, ids, {
      confirmaDisponibilidad: true,
      aceptaPoliticaCancelacion: true,
      aceptaNoGarantiaCupo: true,
    })
    setMsg(r ? "Inscripción registrada. Tu líder recibió una notificación informativa." : "Ya existe una inscripción activa o el evento no está disponible.")
  }

  return <>
    <PageHeader title="Agenda de eventos" sub="Consulta el calendario y encuentra rápidamente los eventos con inscripción activa o asistencia obligatoria." />

    <div className="flex gap-2 flex-wrap mb-4">
      {([
        ["calendario", "Calendario", CalendarDays],
        ["inscripciones", "Inscripciones activas", UserCheck],
        ["obligatorios", "Mis eventos obligatorios", CheckCircle2],
      ] as const).map(([key, label, Icon]) => (
        <button key={key} onClick={() => setView(key)} className="px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center gap-2" style={{ background: view === key ? "var(--gco-navy)" : "var(--gco-surface)", color: view === key ? "white" : "var(--gco-text-2)", border: "1px solid var(--gco-border)" }}>
          <Icon size={16} />{label}
        </button>
      ))}
    </div>

    {view === "calendario" ? (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d, i) => (
          <Card key={d} className="min-h-52 p-3">
            <b className="text-xs">{d}</b>
            {list.filter((_, j) => j % 7 === i).map((e) => (
              <button key={e.id} onClick={() => { setSelected(e); setSessions([]); setMsg("") }} className="block w-full text-left rounded-lg p-2 mt-2 text-xs" style={{ background: isMandatory(e) ? "var(--gco-amber-soft)" : "var(--gco-blue-soft)" }}>
                <div className="font-bold">{e.nombre}</div>
                <div className="mt-1">{e.fecha || "Fecha por confirmar"}</div>
                {isMandatory(e) && <div className="mt-1 font-semibold">Asistencia obligatoria</div>}
              </button>
            ))}
          </Card>
        ))}
      </div>
    ) : (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((e) => {
          const en = mine.find((m) => m.eventId === e.id)
          return <Card key={e.id} className="p-4">
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-bold">{e.nombre}</div>
                <div className="text-xs mt-1" style={{ color: "var(--gco-text-2)" }}>{e.area} · {e.tipo ? ACT[e.tipo][0] : "Sin tipo"}</div>
              </div>
              <StatusChip map={ES} k={e.estado} />
            </div>
            <div className="text-xs mt-3">{e.fecha || "Fecha por confirmar"} · {e.sesiones.length || 1} sesión(es)</div>
            {isMandatory(e) && <div className="mt-2"><Chip tone="amber">Asistencia obligatoria</Chip></div>}
            <div className="mt-3 flex gap-2 flex-wrap">
              {en ? <Chip tone={en.estadoCupo === "aprobado" ? "green" : en.estadoCupo === "lista_espera" ? "amber" : "blue"}>{en.estadoCupo === "aprobado" ? "Cupo aprobado" : en.estadoCupo === "lista_espera" ? "Lista de espera" : "Ya inscrito"}</Chip> : <Btn sm onClick={() => { setSelected(e); setSessions([]); setMsg("") }}>Ver e inscribirme</Btn>}
              <Link href={`/evento/${e.id}`}><BtnSoft sm>Detalle</BtnSoft></Link>
            </div>
          </Card>
        })}
        {!list.length && <Card className="p-10 text-center text-sm">No hay eventos en esta vista.</Card>}
      </div>
    )}

    {selected && <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(16,24,40,.35)" }} onClick={() => setSelected(null)}>
      <div className="w-full max-w-xl h-full overflow-y-auto p-6" style={{ background: "var(--gco-surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between"><div><h2 className="text-xl font-extrabold">{selected.nombre}</h2><p className="text-sm mt-1">{selected.area}</p></div><button onClick={() => setSelected(null)}><XCircle /></button></div>
        <div className="mt-5 space-y-4">
          <Card className="p-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><b>Fecha</b><div>{selected.fecha}</div></div><div><b>Cupos</b><div>{selected.cupos || "Según sesión"}</div></div><div><b>Estado</b><div>{ES[selected.estado][0]}</div></div><div><b>Tipo</b><div>{selected.tipo ? ACT[selected.tipo][0] : "—"}</div></div></div></Card>
          {isMandatory(selected) && <div className="rounded-lg p-3 text-sm font-semibold" style={{ background: "var(--gco-amber-soft)" }}>Este evento es de asistencia obligatoria.</div>}
          <div><h3 className="font-bold mb-2">Sesiones</h3>{selected.sesiones.length ? selected.sesiones.map((x: any) => { const id = x.id || x.nombre; return <label key={id} className="flex gap-2 py-2 text-sm"><input type="checkbox" checked={sessions.includes(id)} onChange={(ev) => setSessions(ev.target.checked ? [...sessions, id] : sessions.filter((s) => s !== id))} />{x.nombre} · {x.fecha} {x.ini}-{x.fin}</label> }) : <p className="text-sm">Sesión única.</p>}</div>
          {current ? <div className="space-y-3"><Chip tone="blue">Inscripción {current.estadoInscripcion}</Chip><Btn tone="red" onClick={() => { A.cancelEnrollment(current.id, s.session.userId, "Cancelación desde Agenda"); setMsg("Inscripción cancelada.") }}>Cancelar inscripción</Btn></div> : selected.estado === "inscripciones_abiertas" ? <Btn full icon={UserCheck} onClick={enroll}>Confirmar inscripción</Btn> : <Chip tone="neutral">Inscripción no disponible</Chip>}
          {msg && <div className="rounded-lg p-3 text-sm" style={{ background: "var(--gco-green-soft)" }}>{msg}</div>}
        </div>
      </div>
    </div>}
  </>
}

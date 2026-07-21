"use client"

/* ============================================================================
 * GCO · DETALLE INTEGRAL DEL EVENTO
 * Un único detalle con pestañas que reagrupa todo el ciclo de vida del evento.
 * La pestaña "Participantes" unifica inscritos, aprobación, cupos, lista de
 * espera, Táctica y estado de citación (antes módulos independientes).
 * Esta entrega construye la ESTRUCTURA; el contenido operativo se completa
 * después sin perder datos, auditoría ni permisos.
 * ========================================================================== */
import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  FileText,
  History,
  LayoutList,
  ListChecks,
  MailCheck,
  Send,
  ShieldCheck,
  Smile,
  ThumbsDown,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { ACT, ES, PERIODOS, USERS, type EventStatus, type GcoEvent } from "@/lib/gco/domain"
import { A, useGco } from "@/lib/gco/store"
import {
  Btn,
  BtnSoft,
  cardStyle,
  Chip,
  InlineError,
  Label,
  Modal,
  PageHeader,
  Select,
  StatusChip,
  TextArea,
  TextInput,
} from "../ui"

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "resumen", label: "Resumen", icon: LayoutList },
  { key: "planeacion", label: "Planeación y sesiones", icon: CalendarDays },
  { key: "publico", label: "Público", icon: Users },
  { key: "revision", label: "Revisión For+", icon: ClipboardCheck },
  { key: "participantes", label: "Participantes", icon: Users },
  { key: "citaciones", label: "Citaciones", icon: Send },
  { key: "ejecucion", label: "Ejecución y asistencia", icon: CheckSquare },
  { key: "cierre", label: "Satisfacción y cierre", icon: Smile },
  { key: "archivos", label: "Archivos", icon: FileText },
  { key: "historial", label: "Historial", icon: History },
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>
        {label}
      </div>
      <div className="text-[14px] font-medium mt-0.5" style={{ color: "var(--gco-text)" }}>
        {value || "—"}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[10px] p-3" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}>
      <div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>
        {label}
      </div>
      <div className="font-extrabold mt-0.5" style={{ fontSize: 20 }}>
        {value}
      </div>
    </div>
  )
}

function Pending({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="py-8 px-6">
      <h4 className="text-sm font-bold">{title}</h4>
      <p className="text-xs mt-1 mb-3" style={{ color: "var(--gco-text-2)" }}>
        Sección reubicada en el detalle integral. El contenido operativo se construye sobre este mismo shell sin perder
        datos ni permisos.
      </p>
      <ul className="text-[13px] space-y-1.5" style={{ color: "var(--gco-text-2)" }}>
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--gco-green)" }} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

type DecisionKind = "aprobar" | "condicionar" | "priorizar" | "devolver" | "rechazar" | null

export function EventDetail({ id }: { id: string }) {
  const events = useGco((s) => s.events)
  const role = useGco((s) => s.session.role)
  const actor = useGco((s) => s.session.userId)
  const [tab, setTab] = useState("resumen")
  const [decision, setDecision] = useState<DecisionKind>(null)
  const [toast, setToast] = useState("")
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const enrollments = useGco((s) => s.enrollments.filter((x) => x.eventId === id))
  const approvals = useGco((s) => s.approvals.filter((x) => x.eventId === id))
  const citations = useGco((s) => s.citations.filter((x) => x.eventId === id))
  const attendance = useGco((s) => s.attendance.filter((x) => x.eventId === id))
  const satisfaction = useGco((s) => s.satisfaction.filter((x) => x.eventId === id))
  const ev = events.find((e) => e.id === id)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(""), 3400)
  }

  const isForPlus = role === "for_plus"
  const isPromotora = role === "area_promotora"
  const enRevision = ev ? ["enviado", "en_revision"].includes(ev.estado) : false
  const devuelto = ev?.estado === "devuelto"

  if (!ev) {
    return (
      <>
        <PageHeader crumbs={["Inicio", "Gestión de eventos", id]} title="Evento no encontrado" />
        <section style={cardStyle}>
          <div className="py-14 text-center px-6">
            <p className="text-sm font-semibold">No encontramos el evento {id}</p>
            <Link href="/gestion-de-eventos" className="fx inline-flex items-center gap-1.5 text-sm font-bold mt-3" style={{ color: "var(--gco-green-dark)" }}>
              <ArrowLeft size={15} /> Volver a la bandeja
            </Link>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        crumbs={["Inicio", "Gestión de eventos", ev.id]}
        title={ev.nombre}
        sub={`${ev.area} · ${ev.tipo ? ACT[ev.tipo][0] : "Sin tipo"} · ${ev.periodo}`}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusChip map={ES} k={ev.estado} />
            {isForPlus && enRevision && (
              <>
                <BtnSoft sm icon={Undo2} onClick={() => setDecision("devolver")}>Devolver</BtnSoft>
                <Btn sm tone="red" icon={ThumbsDown} onClick={() => setDecision("rechazar")}>Rechazar</Btn>
                <BtnSoft sm icon={CalendarDays} onClick={() => setDecision("priorizar")}>Priorizar</BtnSoft>
                <Btn sm icon={MailCheck} onClick={() => { setTab("revision"); setDecision("aprobar") }}>Aprobar</Btn>
              </>
            )}
            {isPromotora && devuelto && (
              <Btn sm icon={Send} onClick={() => { A.resubmitEvent(ev.id, actor); flash("Evento reenviado a For+ para revisión.") }}>
                Reenviar a For+
              </Btn>
            )}
            {(isForPlus || isPromotora) && ["aprobado","aprobado_condicionado"].includes(ev.estado) && <BtnSoft sm onClick={()=>{A.setEventOperationalStatus(ev.id,"publicado",actor);flash("Evento publicado en la agenda.")}}>Publicar</BtnSoft>}
            {(isForPlus || isPromotora) && ev.estado === "publicado" && <Btn sm onClick={()=>{A.setEventOperationalStatus(ev.id,"inscripciones_abiertas",actor);flash("Inscripciones abiertas.")}}>Abrir inscripciones</Btn>}
            {(isForPlus || isPromotora) && ev.estado === "inscripciones_abiertas" && <BtnSoft sm onClick={()=>{A.setEventOperationalStatus(ev.id,"inscripciones_cerradas",actor);flash("Inscripciones cerradas.")}}>Cerrar inscripciones</BtnSoft>}
          </div>
        }
      />

      {toast && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 mb-4 rounded-[12px] fade"
          style={{ background: "var(--gco-green-soft)", border: "1px solid var(--gco-green)", color: "var(--gco-green-dark)" }}
          role="status"
        >
          <CheckCircle2 size={17} />
          <span className="text-[13px] font-semibold">{toast}</span>
        </div>
      )}

      {/* Pestañas del detalle integral */}
      <div className="flex items-center gap-1.5 overflow-x-auto nsc pb-1 mb-4">
        {TABS.map((t) => {
          const on = t.key === tab
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="fx shrink-0 inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold"
              style={
                on
                  ? { background: "var(--gco-navy)", color: "#fff" }
                  : { background: "var(--gco-surface)", border: "1px solid var(--gco-border)", color: "var(--gco-text-2)" }
              }
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      <section style={cardStyle}>
        {tab === "resumen" && (
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-5">
            <Field label="Código" value={ev.id} />
            <Field label="Área" value={ev.area} />
            <Field label="Tipo" value={ev.tipo ? ACT[ev.tipo][0] : "—"} />
            <Field label="Periodo" value={ev.periodo} />
            <Field label="Responsable" value={ev.responsable} />
            <Field label="Fecha" value={ev.fecha} />
            <Field label="Creado por" value={ev.createdBy} />
            <Field label="Sesiones" value={String(ev.sesiones?.length ?? 0)} />
            <Field label="Cruce de horario" value={ev.cruce ? "Sí" : "No"} />
          </div>
        )}

        {tab === "planeacion" && (
          <Pending
            title="Planeación y sesiones"
            points={[
              "Estructura de sesiones: única, programa secuencial, grupos equivalentes o independientes.",
              "Fechas, modalidad, lugar, responsable y cupos por sesión.",
              "Detección de cruces de horario con eventos existentes.",
            ]}
          />
        )}

        {tab === "publico" && (
          <Pending
            title="Público objetivo"
            points={[
              "Definición del público objetivo por área, cargo, vicepresidencia o lista.",
              "Reglas de elegibilidad y obligatoriedad.",
              "Estimación de aforo frente a la capacidad organizacional.",
            ]}
          />
        )}

        {tab === "revision" && (
          <RevisionTab
            ev={ev}
            isForPlus={isForPlus}
            enRevision={enRevision}
            onDecision={setDecision}
          />
        )}

        {tab === "participantes" && (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4"><div><h4 className="text-sm font-bold">Participantes</h4><p className="text-xs mt-1" style={{color:"var(--gco-text-2)"}}>Inscritos, aprobaciones, cupos, lista de espera, Táctica y citación en una sola vista.</p></div><div className="flex gap-2 flex-wrap">{selectedPeople.length>0&&<><BtnSoft sm onClick={()=>{A.requestApproval(ev.id,selectedPeople,actor,{approverType:"lider_directo",regla:"todos",fechaLimite:ev.review?.limiteCupos||"",instrucciones:"Validar capacidad y disponibilidad",recordatorios:true});flash("Aprobación formal solicitada solo a las personas seleccionadas.");setSelectedPeople([])}}>Solicitar aprobación</BtnSoft><Btn sm onClick={()=>{selectedPeople.forEach(x=>A.setSeat(x,"aprobado",actor));flash("Cupos aprobados.");setSelectedPeople([])}}>Aprobar cupo</Btn><BtnSoft sm onClick={()=>{selectedPeople.forEach(x=>A.setSeat(x,"lista_espera",actor));flash("Personas movidas a lista de espera.");setSelectedPeople([])}}>Lista de espera</BtnSoft></>}</div></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5"><Stat label="Público objetivo" value={ev.publicoObjetivo||0}/><Stat label="Inscritos" value={enrollments.length}/><Stat label="Aprobación pendiente" value={enrollments.filter(x=>x.approvalState==="pendiente").length}/><Stat label="Cupos asignados" value={enrollments.filter(x=>x.estadoCupo==="aprobado").length}/><Stat label="Lista de espera" value={enrollments.filter(x=>x.estadoCupo==="lista_espera").length}/></div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead style={{background:"var(--gco-surface-2)"}}><tr>{["","Persona","Sesión","Capacidad","Cruce","Aprobación","Cupo","Citación","Acción"].map(h=><th key={h} className="text-left p-2">{h}</th>)}</tr></thead><tbody>{enrollments.map(en=><tr key={en.id} className="border-t"><td className="p-2"><input type="checkbox" checked={selectedPeople.includes(en.id)} onChange={e=>setSelectedPeople(e.target.checked?[...selectedPeople,en.id]:selectedPeople.filter(x=>x!==en.id))}/></td><td className="p-2"><b>{USERS[en.userId]?.nombre||en.userId}</b><div>{USERS[en.userId]?.area}</div></td><td className="p-2">{en.sessionIds.join(", ")||"General"}</td><td className="p-2">{en.capacidadAntes} → {en.capacidadProyectada} h</td><td className="p-2">{en.cruceDetectado?"Sí":"No"}</td><td className="p-2">{en.approvalState}</td><td className="p-2">{en.estadoCupo}</td><td className="p-2">{en.estadoCitacion}</td><td className="p-2 flex gap-1"><button className="px-2 py-1 rounded" style={{background:"var(--gco-green-soft)"}} onClick={()=>A.setSeat(en.id,"aprobado",actor)}>Cupo</button><button className="px-2 py-1 rounded" style={{background:"var(--gco-amber-soft)"}} onClick={()=>A.setSeat(en.id,"lista_espera",actor)}>Espera</button></td></tr>)}</tbody></table></div>
            {!enrollments.length&&<div className="py-10 text-center text-sm">Aún no hay inscripciones.</div>}
          </div>
        )}

        {tab === "citaciones" && (
          <div className="p-5"><div className="flex justify-between mb-4"><div><h4 className="text-sm font-bold">Citaciones</h4><p className="text-xs">Envía citaciones a personas con cupo aprobado.</p></div><Btn sm onClick={()=>{const ids=enrollments.filter(x=>x.estadoCupo==="aprobado"&&x.estadoCitacion!=="enviada").map(x=>x.id);A.createCitations(ev.id,ids,actor,{tipo:"automatica",link:"https://teams.microsoft.com/"});flash("Citaciones enviadas.")}}>Enviar pendientes</Btn></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Stat label="Pendientes" value={enrollments.filter(x=>x.estadoCupo==="aprobado"&&x.estadoCitacion==="pendiente").length}/><Stat label="Enviadas" value={citations.filter(x=>x.estado==="enviada").length}/><Stat label="Errores" value={citations.filter(x=>x.estado==="error").length}/><Stat label="Aceptadas" value={citations.filter(x=>x.respuestaCalendario==="aceptada").length}/></div></div>
        )}

        {tab === "ejecucion" && (
          <div className="p-5"><h4 className="text-sm font-bold mb-4">Ejecución y asistencia</h4>{enrollments.filter(x=>x.estadoCupo==="aprobado").map(en=>{const at=attendance.find(a=>a.userId===en.userId);return <div key={en.id} className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-2 border-t"><span className="text-sm">{USERS[en.userId]?.nombre}</span><Chip tone={at?.estado==="asistio"?"green":at?.estado==="no_asistio"?"red":"neutral"}>{at?.estado||"pendiente"}</Chip><BtnSoft sm onClick={()=>A.recordAttendance(ev.id,en.userId,"asistio",actor,120)}>Asistió</BtnSoft><BtnSoft sm onClick={()=>A.recordAttendance(ev.id,en.userId,"no_asistio",actor,0)}>No asistió</BtnSoft></div>})}</div>
        )}

        {tab === "cierre" && (
          <div className="p-5"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"><Stat label="Asistentes" value={attendance.filter(x=>x.estado==="asistio"||x.estado==="parcial").length}/><Stat label="No-show" value={attendance.filter(x=>x.estado==="no_asistio").length}/><Stat label="Encuestas" value={satisfaction.length}/><Stat label="Satisfacción" value={satisfaction.length?(satisfaction.reduce((a,x)=>a+x.satisfaccionGeneral,0)/satisfaction.length).toFixed(1):"—"}/></div><Btn onClick={()=>{A.closeEvent(ev.id,actor,"Cierre funcional completado");flash("Evento cerrado.")}}>Cerrar administrativamente</Btn></div>
        )}

        {tab === "archivos" && (
          <div className="p-5"><h4 className="text-sm font-bold mb-3">Archivos del evento</h4><p className="text-sm">Pieza de comunicación, públicos cargados, evidencias, presentaciones y grabaciones.</p>{(ev.model as any)?.piezaEvento&&<div className="mt-3 rounded-lg p-3" style={{background:"var(--gco-surface-2)"}}>{(ev.model as any).piezaEvento.nombre}</div>}</div>
        )}

        {tab === "historial" && (
          <div className="p-5">
            <h4 className="text-sm font-bold mb-3">Historial y trazabilidad</h4>
            <ol className="space-y-3">
              {ev.traza.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: "var(--gco-green)" }} />
                  <div>
                    <div className="text-[13px] font-semibold">
                      {t.from ? `${t.from} → ${t.to}` : t.to}
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--gco-text-2)" }}>
                      {t.comentario}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>
                      {t.actor} · {t.ts}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {decision && (
        <EventDecisionModal
          ev={ev}
          kind={decision}
          actor={actor}
          onClose={() => setDecision(null)}
          onDone={(msg) => {
            setDecision(null)
            setTab("historial")
            flash(msg)
          }}
        />
      )}
    </>
  )
}

/* ============================================================================
 * PESTAÑA "REVISIÓN FOR+" — decisión de gobierno del evento.
 * ========================================================================== */
function RevisionTab({
  ev,
  isForPlus,
  enRevision,
  onDecision,
}: {
  ev: GcoEvent
  isForPlus: boolean
  enRevision: boolean
  onDecision: (k: DecisionKind) => void
}) {
  const r = ev.review
  const decided = !!r?.decidedAt

  return (
    <div className="p-5 space-y-5">
      <div>
        <h4 className="text-sm font-bold">Revisión For+</h4>
        <p className="text-[13px] mt-1" style={{ color: "var(--gco-text-2)" }}>
          Gobierno del evento: revisar, devolver para ajustes, aprobar (asignando periodo de ejecución),
          aprobar con condiciones, priorizar para otro periodo o rechazar.
        </p>
      </div>

      {/* Decisión actual */}
      {decided ? (
        <div className="rounded-[12px] p-4" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} style={{ color: "var(--gco-green-dark)" }} />
            <span className="text-[13px] font-bold">Decisión registrada</span>
            <StatusChip map={ES} k={ev.estado} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]">
            <RevField label="Revisor" v={r?.revisor} />
            <RevField label="Fecha de decisión" v={r?.decidedAt} />
            {r?.periodoEjecucion && <RevField label="Periodo de ejecución" v={r.periodoEjecucion} />}
            {r?.fechaConfirmada && <RevField label="Fecha confirmada" v={r.fechaConfirmada} />}
            {r?.aperturaInscripcion && <RevField label="Apertura inscripción" v={r.aperturaInscripcion} />}
            {r?.cierreInscripcion && <RevField label="Cierre inscripción" v={r.cierreInscripcion} />}
            {r?.limiteCupos && <RevField label="Límite de cupos" v={r.limiteCupos} />}
            {r?.condiciones && <RevField label="Condiciones" v={r.condiciones} full />}
            {r?.periodoDestino && <RevField label="Periodo destino" v={r.periodoDestino} />}
            {r?.motivoPriorizacion && <RevField label="Motivo de priorización" v={r.motivoPriorizacion} full />}
            {r?.observaciones && <RevField label="Observaciones" v={r.observaciones} full />}
          </dl>
        </div>
      ) : (
        <div
          className="rounded-[12px] p-4 flex items-start gap-3"
          style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}
        >
          <ListChecks size={18} style={{ color: "var(--gco-text-3)" }} className="mt-0.5" />
          <p className="text-[13px]" style={{ color: "var(--gco-text-2)" }}>
            Este evento aún no tiene una decisión registrada.
            {isForPlus && enRevision ? " Usa los botones para decidir." : " Está fuera de la etapa de revisión."}
          </p>
        </div>
      )}

      {/* Botonera de decisión */}
      {isForPlus && enRevision && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Btn icon={MailCheck} onClick={() => onDecision("aprobar")}>Aprobar y asignar periodo</Btn>
          <BtnSoft icon={ClipboardCheck} onClick={() => onDecision("condicionar")}>Aprobar con condiciones</BtnSoft>
          <BtnSoft icon={CalendarDays} onClick={() => onDecision("priorizar")}>Priorizar</BtnSoft>
          <BtnSoft icon={Undo2} onClick={() => onDecision("devolver")}>Devolver</BtnSoft>
          <Btn tone="red" icon={ThumbsDown} onClick={() => onDecision("rechazar")}>Rechazar</Btn>
        </div>
      )}
    </div>
  )
}

function RevField({ label, v, full }: { label: string; v?: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[11px] uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>
        {label}
      </dt>
      <dd className="font-semibold mt-0.5" style={{ color: "var(--gco-text)" }}>
        {v || "—"}
      </dd>
    </div>
  )
}

/* ============================================================================
 * MODAL DE DECISIÓN — captura los campos exigidos por cada acción y ejecuta
 * A.decideEvent con la transición y la revisión correspondientes.
 * ========================================================================== */
const DECISION_META: Record<
  Exclude<DecisionKind, null>,
  { title: string; to: EventStatus; cta: string; tone?: "red"; icon: LucideIcon }
> = {
  aprobar: { title: "Aprobar evento", to: "aprobado", cta: "Aprobar y notificar", icon: MailCheck },
  condicionar: { title: "Aprobar con condiciones", to: "aprobado_condicionado", cta: "Aprobar con condiciones", icon: ClipboardCheck },
  priorizar: { title: "Priorizar para otro periodo", to: "pendiente_priorizacion", cta: "Priorizar", icon: CalendarDays },
  devolver: { title: "Devolver para ajustes", to: "devuelto", cta: "Devolver al área", icon: Undo2 },
  rechazar: { title: "Rechazar evento", to: "rechazado", cta: "Rechazar", tone: "red", icon: ThumbsDown },
}

function EventDecisionModal({
  ev,
  kind,
  actor,
  onClose,
  onDone,
}: {
  ev: GcoEvent
  kind: Exclude<DecisionKind, null>
  actor: string
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const meta = DECISION_META[kind]
  // Campos compartidos
  const [comentario, setComentario] = useState("")
  // Aprobar
  const [periodoEjec, setPeriodoEjec] = useState(ev.periodo)
  const [fechaConfirmada, setFechaConfirmada] = useState(ev.fecha)
  const [apertura, setApertura] = useState("")
  const [cierre, setCierre] = useState("")
  const [cupos, setCupos] = useState(String(ev.cupos ?? 40))
  // Condicionar
  const [condiciones, setCondiciones] = useState("")
  const [condFecha, setCondFecha] = useState("")
  // Priorizar
  const [periodoDest, setPeriodoDest] = useState("")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState("")

  const submit = () => {
    if ((kind === "devolver" || kind === "rechazar") && !comentario.trim()) {
      setError("Indica el motivo para el área promotora.")
      return
    }
    if (kind === "aprobar" && (!periodoEjec || !fechaConfirmada)) {
      setError("Periodo de ejecución y fecha confirmada son obligatorios.")
      return
    }
    if (kind === "condicionar" && !condiciones.trim()) {
      setError("Describe las condiciones del evento.")
      return
    }
    if (kind === "priorizar" && (!periodoDest || !motivo.trim())) {
      setError("Periodo destino y motivo son obligatorios.")
      return
    }

    const review =
      kind === "aprobar"
        ? {
            periodoEjecucion: periodoEjec,
            fechaConfirmada,
            aperturaInscripcion: apertura,
            cierreInscripcion: cierre,
            limiteCupos: cupos,
            observaciones: comentario,
          }
        : kind === "condicionar"
          ? { condiciones, condFechaLimite: condFecha, observaciones: comentario }
          : kind === "priorizar"
            ? { periodoDestino: periodoDest, motivoPriorizacion: motivo, observacionPriorizacion: comentario }
            : { observaciones: comentario }

    A.decideEvent(ev.id, meta.to, actor, { comentario: comentario || undefined, review })
    onDone(`“${ev.nombre}”: ${meta.title.toLowerCase()} — hecho.`)
  }

  return (
    <Modal open title={meta.title} onClose={onClose} w={560}>
      <div className="space-y-4">
        {kind === "aprobar" && (
          <>
            <p className="text-[12.5px]" style={{ color: "var(--gco-text-2)" }}>
              Confirma el periodo de ejecución y las ventanas de inscripción. El área promotora será notificada.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Periodo de ejecución</Label>
                <Select value={periodoEjec} onChange={setPeriodoEjec} options={PERIODOS} placeholder="Selecciona" />
              </div>
              <div>
                <Label required>Fecha confirmada</Label>
                <TextInput type="date" value={fechaConfirmada} onChange={setFechaConfirmada} />
              </div>
              <div>
                <Label>Apertura de inscripción</Label>
                <TextInput type="date" value={apertura} onChange={setApertura} />
              </div>
              <div>
                <Label>Cierre de inscripción</Label>
                <TextInput type="date" value={cierre} onChange={setCierre} />
              </div>
              <div>
                <Label>Límite de cupos</Label>
                <TextInput type="number" value={cupos} onChange={setCupos} />
              </div>
            </div>
          </>
        )}

        {kind === "condicionar" && (
          <>
            <div>
              <Label required>Condiciones a cumplir</Label>
              <TextArea value={condiciones} onChange={setCondiciones} placeholder="Ej: ajustar aforo, confirmar sede alterna…" />
            </div>
            <div>
              <Label>Fecha límite de la condición</Label>
              <TextInput type="date" value={condFecha} onChange={setCondFecha} />
            </div>
          </>
        )}

        {kind === "priorizar" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Periodo destino</Label>
                <Select value={periodoDest} onChange={setPeriodoDest} options={PERIODOS} placeholder="Selecciona" />
              </div>
            </div>
            <div>
              <Label required>Motivo de priorización</Label>
              <TextArea value={motivo} onChange={setMotivo} placeholder="Por qué se difiere a otro periodo" />
            </div>
          </>
        )}

        <div>
          <Label required={kind === "devolver" || kind === "rechazar"}>
            {kind === "devolver" ? "Motivo de la devolución" : kind === "rechazar" ? "Motivo del rechazo" : "Observaciones"}
          </Label>
          <TextArea
            value={comentario}
            onChange={setComentario}
            placeholder={
              kind === "devolver"
                ? "Qué debe ajustar el área promotora"
                : kind === "rechazar"
                  ? "Razón del rechazo"
                  : "Notas para la trazabilidad (opcional)"
            }
          />
        </div>

        {error && <InlineError>{error}</InlineError>}

        <div className="flex justify-end gap-2 pt-1">
          <BtnSoft onClick={onClose}>Cancelar</BtnSoft>
          <Btn tone={meta.tone} icon={meta.icon} onClick={submit}>
            {meta.cta}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

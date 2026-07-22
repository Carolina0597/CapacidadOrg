"use client"

/* ============================================================================
 * GCO · BANDEJA DE EVENTOS (reutilizable)
 * Una única bandeja por objeto de gestión con pestañas/filtros por estado.
 * Sustituye a los módulos sueltos (por revisar, priorización, inscritos y
 * cupos, citaciones, asistencia y cierre) reagrupándolos en un solo lugar.
 * Consume el estado global existente; no altera persistencia ni auditoría.
 * ========================================================================== */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowUpRight, CheckCircle2, Download, Search, X } from "lucide-react"
import { ACT, getEventLifecycle, type EventClosureResult, type GcoEvent, type EventStatus } from "@/lib/gco/domain"
import { A, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, cardStyle, Chip, PageHeader } from "../ui"
import { EventLifecycleLine } from "../event-lifecycle"

export interface BandejaTab {
  key: string
  label: string
  /** Predicado de pertenencia a la pestaña. `undefined` en "Todos". */
  match?: (e: GcoEvent) => boolean
}

/** Próxima acción sugerida según el estado del evento. */
const NEXT_ACTION: Partial<Record<EventStatus, string>> = {
  borrador: "Continuar y enviar",
  en_revision: "For+ debe tomar una decisión",
  devuelto: "Ver observaciones y ajustar",
  rechazado: "Ver observaciones",
  aprobado: "Publicar o preparar citación",
  publicado: "Gestionar publicación",
  inscripciones_abiertas: "Gestionar inscripciones",
  inscripciones_cerradas: "Gestionar participantes",
  citado: "Esperar ejecución",
  pendiente_cierre: "Registrar cierre",
  cerrado: "Consultar cierre",
  reprogramado: "Confirmar nueva fecha",
  cancelado: "Consultar motivo",
}


export function Bandeja({
  title,
  sub,
  crumbs,
  tabs,
  filter,
  detailBase = "/evento",
  right,
  showClosureAction = false,
}: {
  title: string
  sub?: string
  crumbs?: string[]
  tabs: BandejaTab[]
  /** Filtro base de alcance de la bandeja (ej. eventos del área/creador). */
  filter?: (e: GcoEvent) => boolean
  detailBase?: string
  right?: React.ReactNode
  showClosureAction?: boolean
}) {
  const events = useGco((s) => s.events)
  const params = useSearchParams()
  const [active, setActive] = useState(tabs[0]?.key ?? "todos")
  const [q, setQ] = useState("")
  const [closing, setClosing] = useState<GcoEvent | null>(null)
  const [closureResult, setClosureResult] = useState<EventClosureResult>("satisfactorio")
  const [closureComment, setClosureComment] = useState("")
  const attendance = useGco((s) => s.attendance)
  const actor = useGco((s) => s.session.userId)

  // Permite abrir una pestaña específica vía ?tab=... (usado por redirecciones).
  useEffect(() => {
    const t = params.get("tab")
    if (t && tabs.some((x) => x.key === t)) setActive(t)
  }, [params, tabs])

  const scoped = useMemo(() => (filter ? events.filter(filter) : events), [events, filter])

  const countFor = (tab: BandejaTab) => (tab.match ? scoped.filter(tab.match).length : scoped.length)


  const attendanceCount = (eventId: string) => attendance.filter((a) => a.eventId === eventId).length
  const registerClosure = () => {
    if (!closing) return
    const ok = A.registerEventClosure(closing.id, actor, closureResult, closureComment.trim() || undefined)
    if (ok) {
      setClosing(null)
      setClosureComment("")
      setClosureResult("satisfactorio")
    }
  }

  const rows = useMemo(() => {
    const tab = tabs.find((t) => t.key === active)
    let list = tab?.match ? scoped.filter(tab.match) : scoped
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter(
        (e) => e.nombre.toLowerCase().includes(needle) || e.id.toLowerCase().includes(needle) || e.area.toLowerCase().includes(needle),
      )
    }
    return list
  }, [tabs, active, scoped, q])

  return (
    <>
      <PageHeader crumbs={crumbs} title={title} sub={sub} right={right} />

      {/* Pestañas / filtros por estado */}
      <div className="flex items-center gap-1.5 overflow-x-auto nsc pb-1 mb-4">
        {tabs.map((t) => {
          const on = t.key === active
          const n = countFor(t)
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className="fx shrink-0 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={
                on
                  ? { background: "var(--gco-navy)", color: "#fff" }
                  : { background: "var(--gco-surface)", border: "1px solid var(--gco-border)", color: "var(--gco-text-2)" }
              }
            >
              {t.label}
              <span
                className="inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-5"
                style={{
                  background: on ? "rgba(255,255,255,.2)" : "var(--gco-surface-2)",
                  color: on ? "#fff" : "var(--gco-text-3)",
                }}
              >
                {n}
              </span>
            </button>
          )
        })}
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2 flex-1 max-w-md"
          style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border)" }}
        >
          <Search size={16} style={{ color: "var(--gco-text-3)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, código o área…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--gco-text)" }}
          />
        </div>
      </div>

      {/* Tabla */}
      <section style={cardStyle}>
        {rows.length === 0 ? (
          <div className="py-16 text-center px-6">
            <p className="text-sm font-semibold">No hay eventos en esta vista</p>
            <p className="text-xs mt-1" style={{ color: "var(--gco-text-3)" }}>
              Ajusta la pestaña o los filtros para ver más resultados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--gco-border)" }}>
                  {["Evento", "Área", "Tipo", "Estado", "Periodo", "Próxima acción", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: "var(--gco-text-3)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--gco-border)" }}>
                    <td className="px-4 py-3">
                      <div className="text-[13.5px] font-semibold">{e.nombre}</div>
                      <div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>
                        {e.id}
                        {e.cruce && <span style={{ color: "var(--gco-red)" }}> · cruce de horario</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>
                      {e.area}
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>
                      {e.tipo ? ACT[e.tipo][0] : "—"}
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      {(() => { const life = getEventLifecycle(e, attendanceCount(e.id)); return <div><div className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold" style={{background:"var(--gco-surface-2)",border:"1px solid var(--gco-border)"}}>{life.principal}{life.subestado ? ` · ${life.subestado}` : ""}</div><EventLifecycleLine event={e} attendanceCount={attendanceCount(e.id)} compact /></div> })()}
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>
                      {e.periodo}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium" style={{ color: "var(--gco-text)" }}>
                      {getEventLifecycle(e, attendanceCount(e.id)).nextAction || NEXT_ACTION[e.estado] || "Abrir detalle"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {showClosureAction && getEventLifecycle(e, attendanceCount(e.id)).key === "aprobado_pendiente_cierre" && attendanceCount(e.id) > 0 && (
                          <button type="button" onClick={() => { setClosing(e); setClosureComment(""); setClosureResult("satisfactorio") }} className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "var(--gco-green-soft)", color: "var(--gco-green-dark)" }}>
                            Registrar cierre
                          </button>
                        )}
                        <Link href={`${detailBase}/${e.id}`} className="fx inline-flex items-center gap-1 text-[12.5px] font-bold" style={{ color: "var(--gco-green-dark)" }}>
                          Abrir<ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {closing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(16,24,40,.42)" }} onClick={() => setClosing(null)}>
          <div className="w-full max-w-lg rounded-2xl p-5" style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-extrabold">Registrar cierre del evento</h3><p className="text-sm mt-1" style={{ color: "var(--gco-text-2)" }}>{closing.nombre}</p></div>
              <button onClick={() => setClosing(null)}><X size={20}/></button>
            </div>
            <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: "var(--gco-blue-soft)" }}>
              Asistencias cargadas: <b>{attendanceCount(closing.id)}</b>. El dueño del evento debe indicar el resultado final.
            </div>
            <label className="block mt-4 text-sm font-bold">Resultado de cierre</label>
            <select value={closureResult} onChange={(e) => setClosureResult(e.target.value as EventClosureResult)} className="w-full mt-2 rounded-lg px-3 py-2.5 text-sm" style={{ border: "1px solid var(--gco-border)", background: "var(--gco-surface)" }}>
              <option value="satisfactorio">Satisfactorio</option>
              <option value="no_satisfactorio">No satisfactorio</option>
              <option value="rechazado_comite">Rechazado por el comité</option>
              <option value="aplazado_comite">Aplazado por el comité</option>
            </select>
            <label className="block mt-4 text-sm font-bold">Comentario</label>
            <textarea value={closureComment} onChange={(e) => setClosureComment(e.target.value)} rows={3} placeholder="Resume el resultado, las novedades o el motivo de la decisión." className="w-full mt-2 rounded-lg px-3 py-2.5 text-sm" style={{ border: "1px solid var(--gco-border)", background: "var(--gco-surface)" }} />
            <div className="mt-5 flex justify-end gap-2"><BtnSoft onClick={() => setClosing(null)}>Cancelar</BtnSoft><Btn icon={CheckCircle2} onClick={registerClosure}>Guardar cierre</Btn></div>
          </div>
        </div>
      )}
    </>
  )
}

/** Botón de exportación (estructura; la exportación real se implementa luego). */
export function ExportButton() {
  return (
    <button
      type="button"
      className="fx inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold"
      style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border-strong)", color: "var(--gco-text)" }}
    >
      <Download size={15} />
      Exportar
    </button>
  )
}

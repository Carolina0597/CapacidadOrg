"use client"

/* ============================================================================
 * GCO · SOLICITAR ACCESO (Colaborador)
 * Recorrido funcional: crear/editar/enviar solicitudes para administrar
 * espacios de un área o comunidad promotora, más la bandeja "Mis solicitudes"
 * con el ciclo de vida completo (borrador → enviada → revisión → devuelta/
 * aprobada/rechazada/vencida). Persiste en el store global.
 * ========================================================================== */
import { useMemo, useState } from "react"
import {
  BadgeCheck,
  CheckCircle2,
  FilePlus2,
  Inbox,
  Info,
  Paperclip,
  RotateCw,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react"
import {
  AS,
  COMUNIDADES,
  PEOPLE,
  REQ_ROLES,
  SPACE_TYPES,
  type AccessRequest,
} from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import {
  Btn,
  BtnSoft,
  cardStyle,
  CheckItem,
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

type Draft = {
  id?: string
  comunidad: string
  comunidadOtra: string
  tipos: string[]
  roles: string[]
  responsable: string
  fechaInicio: string
  vigencia: string
  indefinida: boolean
  justificacion: string
  observacionesSolicitante: string
  adjuntos: string[]
}

const EMPTY: Draft = {
  comunidad: "",
  comunidadOtra: "",
  tipos: [],
  roles: [],
  responsable: "",
  fechaInicio: "",
  vigencia: "",
  indefinida: false,
  justificacion: "",
  observacionesSolicitante: "",
  adjuntos: [],
}

const permLabel = (code: string) => REQ_ROLES.find(([c]) => c === code)?.[1] ?? code

export function SolicitarAcceso() {
  const user = useGco(sel.user)
  const mine = useGco(sel.accessByUser(user.nombre))
  const grants = useGco(sel.grantsByUser(user.nombre))
  const [tab, setTab] = useState<"form" | "mias">("form")
  const [d, setD] = useState<Draft>(EMPTY)
  const [showErrors, setShowErrors] = useState(false)
  const [obsModal, setObsModal] = useState<AccessRequest | null>(null)
  const [toast, setToast] = useState<string>("")

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const toggle = (k: "tipos" | "roles", v: string) =>
    setD((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))

  const comunidadFinal = d.comunidad === "Otra (especificar)" ? d.comunidadOtra.trim() : d.comunidad
  const vigenciaFinal = d.indefinida ? "Indefinida" : d.vigencia

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!comunidadFinal) e.comunidad = "Selecciona o especifica la comunidad."
    if (d.tipos.length === 0) e.tipos = "Indica al menos un tipo de espacio."
    if (!d.responsable) e.responsable = "Selecciona el responsable que respalda."
    if (!d.fechaInicio) e.fechaInicio = "Indica la fecha inicial."
    if (!d.indefinida && !d.vigencia) e.vigencia = "Indica la fecha final o marca indefinida."
    if (d.roles.length === 0) e.roles = "Selecciona al menos un permiso."
    if (d.justificacion.trim().length < 10) e.justificacion = "Describe la justificación (mín. 10 caracteres)."
    return e
  }, [comunidadFinal, d])

  const buildPayload = (): Partial<AccessRequest> => ({
    id: d.id,
    solicitante: user.nombre,
    correo: user.correo,
    cargo: user.cargo,
    area: user.area,
    vp: user.vp,
    comunidad: comunidadFinal || "(sin definir)",
    tipos: d.tipos,
    roles: d.roles,
    responsable: d.responsable,
    fechaInicio: d.fechaInicio,
    vigencia: vigenciaFinal,
    justificacion: d.justificacion.trim(),
    observacionesSolicitante: d.observacionesSolicitante.trim(),
    adjuntos: d.adjuntos,
  })

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(""), 3200)
  }

  const saveDraft = () => {
    const req = A.createAccessRequest(buildPayload(), user.nombre, true)
    setD((p) => ({ ...p, id: req.id }))
    flash("Borrador guardado. Puedes continuar y enviarlo cuando quieras.")
    setTab("mias")
  }

  const send = () => {
    setShowErrors(true)
    if (Object.keys(errors).length > 0) return
    A.createAccessRequest(buildPayload(), user.nombre, false)
    setD(EMPTY)
    setShowErrors(false)
    flash("Solicitud enviada a For+ para revisión.")
    setTab("mias")
  }

  const resend = (r: AccessRequest) => {
    A.resendAccessRequest(r.id, {}, user.nombre)
    flash(`Solicitud ${r.id} reenviada a For+.`)
  }

  const editReturned = (r: AccessRequest) => {
    setD({
      id: r.id,
      comunidad: COMUNIDADES.includes(r.comunidad) ? r.comunidad : "Otra (especificar)",
      comunidadOtra: COMUNIDADES.includes(r.comunidad) ? "" : r.comunidad,
      tipos: r.tipos,
      roles: r.roles,
      responsable: r.responsable,
      fechaInicio: r.fechaInicio,
      vigencia: r.vigencia === "Indefinida" ? "" : r.vigencia,
      indefinida: r.vigencia === "Indefinida",
      justificacion: r.justificacion,
      observacionesSolicitante: r.observacionesSolicitante || "",
      adjuntos: r.adjuntos || [],
    })
    setTab("form")
  }

  const editingReturned = d.id && mine.find((r) => r.id === d.id)?.estado === "devuelta"

  return (
    <>
      <PageHeader
        crumbs={["Inicio", "Solicitar acceso"]}
        title="Solicitar acceso"
        sub="Pide permisos para administrar espacios de un área o comunidad promotora. Guarda un borrador o envíalo a For+."
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

      {/* Pestañas */}
      <div className="flex items-center gap-1.5 mb-5">
        {[
          ["form", "Nueva solicitud", FilePlus2],
          ["mias", "Mis solicitudes", Inbox],
        ].map(([k, label, Ic]: any) => {
          const on = tab === k
          const n = k === "mias" ? mine.length : 0
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className="fx inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold"
              style={on ? { background: "var(--gco-navy)", color: "#fff" } : { background: "var(--gco-surface)", border: "1px solid var(--gco-border)", color: "var(--gco-text-2)" }}
            >
              <Ic size={15} />
              {label}
              {n > 0 && (
                <span className="inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-5" style={{ background: on ? "rgba(255,255,255,.2)" : "var(--gco-surface-2)", color: on ? "#fff" : "var(--gco-text-3)" }}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === "form" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {editingReturned && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-[12px]" style={{ background: "var(--gco-amber-soft)", border: "1px solid var(--gco-amber)" }}>
                <RotateCw size={16} style={{ color: "#9a7400" }} className="mt-0.5" />
                <p className="text-[12.5px]" style={{ color: "#7a5c00" }}>
                  Estás ajustando una solicitud <b>devuelta</b>. Corrige lo indicado en las observaciones y usa <b>Reenviar a For+</b>.
                </p>
              </div>
            )}

            {/* Datos automáticos */}
            <section style={cardStyle}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid var(--gco-border)" }}>
                <BadgeCheck size={17} style={{ color: "var(--gco-green-dark)" }} />
                <h3 className="text-sm font-bold">Datos del solicitante</h3>
                <Chip tone="neutral">Automático</Chip>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ["Nombre", user.nombre],
                  ["Correo", user.correo],
                  ["Cargo", user.cargo],
                  ["Área", user.area],
                  ["Vicepresidencia", user.vp],
                  ["Líder", user.lider],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>{l}</div>
                    <div className="text-[13.5px] font-medium mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Datos de la solicitud */}
            <section style={cardStyle}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid var(--gco-border)" }}>
                <ShieldCheck size={17} style={{ color: "var(--gco-green-dark)" }} />
                <h3 className="text-sm font-bold">Datos de la solicitud</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Área o comunidad promotora</Label>
                    <Select value={d.comunidad} onChange={(v) => set("comunidad", v)} options={COMUNIDADES} placeholder="Selecciona…" />
                    {showErrors && errors.comunidad && <div className="mt-1"><InlineError>{errors.comunidad}</InlineError></div>}
                  </div>
                  <div>
                    <Label required>Responsable que respalda</Label>
                    <Select value={d.responsable} onChange={(v) => set("responsable", v)} options={PEOPLE} placeholder="Selecciona…" />
                    {showErrors && errors.responsable && <div className="mt-1"><InlineError>{errors.responsable}</InlineError></div>}
                  </div>
                </div>

                {d.comunidad === "Otra (especificar)" && (
                  <div>
                    <Label required>Especifica la comunidad</Label>
                    <TextInput value={d.comunidadOtra} onChange={(v) => set("comunidadOtra", v)} placeholder="Nombre de la comunidad" />
                  </div>
                )}

                <div>
                  <Label required>Tipo de espacios que administrará</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SPACE_TYPES.map((t) => (
                      <CheckItem key={t} checked={d.tipos.includes(t)} onToggle={() => toggle("tipos", t)} label={t} />
                    ))}
                  </div>
                  {showErrors && errors.tipos && <div className="mt-1"><InlineError>{errors.tipos}</InlineError></div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Fecha inicial</Label>
                    <TextInput type="date" value={d.fechaInicio} onChange={(v) => set("fechaInicio", v)} />
                    {showErrors && errors.fechaInicio && <div className="mt-1"><InlineError>{errors.fechaInicio}</InlineError></div>}
                  </div>
                  <div>
                    <Label required>Fecha final o vigencia</Label>
                    <TextInput type="date" value={d.vigencia} onChange={(v) => set("vigencia", v)} />
                    <button
                      type="button"
                      onClick={() => set("indefinida", !d.indefinida)}
                      className="fx inline-flex items-center gap-1.5 mt-1.5 text-[12px] font-semibold"
                      style={{ color: d.indefinida ? "var(--gco-green-dark)" : "var(--gco-text-3)" }}
                    >
                      <span className="inline-flex items-center justify-center rounded-[5px]" style={{ width: 15, height: 15, border: `1.5px solid ${d.indefinida ? "var(--gco-green)" : "var(--gco-border-strong)"}`, background: d.indefinida ? "var(--gco-green)" : "transparent" }}>
                        {d.indefinida && <CheckCircle2 size={11} color="#fff" />}
                      </span>
                      Vigencia indefinida
                    </button>
                    {showErrors && errors.vigencia && <div className="mt-1"><InlineError>{errors.vigencia}</InlineError></div>}
                  </div>
                </div>

                <div>
                  <Label required>Permisos solicitados</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REQ_ROLES.map(([code, label]) => (
                      <CheckItem key={code} checked={d.roles.includes(code)} onToggle={() => toggle("roles", code)} label={label} />
                    ))}
                  </div>
                  {showErrors && errors.roles && <div className="mt-1"><InlineError>{errors.roles}</InlineError></div>}
                </div>

                <div>
                  <Label required>Justificación</Label>
                  <TextArea value={d.justificacion} onChange={(v) => set("justificacion", v)} placeholder="¿Por qué necesitas administrar estos espacios?" rows={3} />
                  {showErrors && errors.justificacion && <div className="mt-1"><InlineError>{errors.justificacion}</InlineError></div>}
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <TextArea value={d.observacionesSolicitante} onChange={(v) => set("observacionesSolicitante", v)} placeholder="Información adicional (opcional)" rows={2} />
                </div>

                <div>
                  <Label>Adjuntos</Label>
                  <label
                    className="fx flex items-center gap-2 px-3 py-2.5 rounded-[10px] cursor-pointer text-[13px] font-semibold"
                    style={{ border: "1.5px dashed var(--gco-border-strong)", color: "var(--gco-text-2)" }}
                  >
                    <Paperclip size={15} />
                    Adjuntar soporte
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const names = Array.from(e.target.files || []).map((f) => f.name)
                        if (names.length) set("adjuntos", [...d.adjuntos, ...names])
                      }}
                    />
                  </label>
                  {d.adjuntos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.adjuntos.map((a, i) => (
                        <Chip key={i} tone="info">{a}</Chip>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2">
              {editingReturned ? (
                <Btn icon={Send} onClick={() => { setShowErrors(true); if (Object.keys(errors).length === 0) { A.resendAccessRequest(d.id!, buildPayload(), user.nombre); setD(EMPTY); setShowErrors(false); flash("Solicitud ajustada y reenviada a For+."); setTab("mias") } }}>
                  Reenviar a For+
                </Btn>
              ) : (
                <Btn icon={Send} onClick={send}>Enviar a For+</Btn>
              )}
              <BtnSoft icon={Save} onClick={saveDraft}>Guardar borrador</BtnSoft>
              {d.id && <BtnSoft onClick={() => { setD(EMPTY); setShowErrors(false) }}>Descartar cambios</BtnSoft>}
            </div>
          </div>

          {/* Columna lateral: permisos vigentes + ayuda */}
          <div className="space-y-4">
            <section style={cardStyle}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--gco-border)" }}>
                <ShieldCheck size={16} style={{ color: "var(--gco-green-dark)" }} />
                <h3 className="text-[13px] font-bold">Permisos vigentes</h3>
              </div>
              <div className="p-4">
                {grants.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--gco-text-3)" }}>Aún no tienes accesos aprobados.</p>
                ) : (
                  <ul className="space-y-3">
                    {grants.map((g, i) => (
                      <li key={i} className="rounded-[10px] p-3" style={{ background: "var(--gco-green-soft)" }}>
                        <div className="text-[13px] font-bold" style={{ color: "var(--gco-green-dark)" }}>{g.comunidad}</div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {g.permisos.map((p) => (
                            <span key={p} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--gco-surface)", color: "var(--gco-green-dark)" }}>{permLabel(p)}</span>
                          ))}
                        </div>
                        <div className="text-[11px] mt-1.5" style={{ color: "var(--gco-text-3)" }}>Vigencia: {g.vigencia}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-[12px]" style={{ background: "var(--gco-blue-soft)", border: "1px solid var(--gco-blue)" }}>
              <Info size={16} style={{ color: "var(--gco-blue)" }} className="mt-0.5" />
              <p className="text-[12px]" style={{ color: "var(--gco-text)" }}>
                For+ revisa cada solicitud, puede devolverla con observaciones y define los permisos finales y su vigencia al aprobar.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <MisSolicitudes items={mine} onEdit={editReturned} onResend={resend} onView={setObsModal} />
      )}

      <Modal open={!!obsModal} onClose={() => setObsModal(null)} title={`Solicitud ${obsModal?.id ?? ""}`} w={520}>
        {obsModal && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusChip map={AS} k={obsModal.estado} />
              <span className="text-[12px]" style={{ color: "var(--gco-text-3)" }}>{obsModal.comunidad}</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Permisos solicitados</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {obsModal.roles.map((r) => <Chip key={r} tone="info">{permLabel(r)}</Chip>)}
              </div>
            </div>
            {obsModal.permisosFinales && (
              <div>
                <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Permisos aprobados</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {obsModal.permisosFinales.map((r) => <Chip key={r} tone="green">{permLabel(r)}</Chip>)}
                </div>
              </div>
            )}
            {obsModal.observaciones && (
              <div>
                <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Observaciones de For+</div>
                <p className="text-[13px] mt-1" style={{ color: "var(--gco-text)" }}>{obsModal.observaciones}</p>
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--gco-text-3)" }}>Historial</div>
              <ol className="space-y-2">
                {obsModal.traza.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--gco-green)" }} />
                    <div>
                      <div className="text-[12.5px] font-semibold">{t.from ? `${t.from} → ${t.to}` : t.to}</div>
                      <div className="text-[11.5px]" style={{ color: "var(--gco-text-2)" }}>{t.comentario}</div>
                      <div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>{t.actor} · {t.ts.slice(0, 10)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function MisSolicitudes({
  items,
  onEdit,
  onResend,
  onView,
}: {
  items: AccessRequest[]
  onEdit: (r: AccessRequest) => void
  onResend: (r: AccessRequest) => void
  onView: (r: AccessRequest) => void
}) {
  if (items.length === 0) {
    return (
      <section style={cardStyle}>
        <div className="py-16 text-center px-6">
          <p className="text-sm font-semibold">Aún no tienes solicitudes</p>
          <p className="text-xs mt-1" style={{ color: "var(--gco-text-3)" }}>Crea una desde la pestaña “Nueva solicitud”.</p>
        </div>
      </section>
    )
  }
  return (
    <section style={cardStyle}>
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--gco-border)" }}>
              {["Código", "Comunidad", "Permisos", "Fecha", "Vigencia", "Estado", "Actualización", "Acción"].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--gco-border)" }}>
                <td className="px-4 py-3 text-[12.5px] font-semibold">{r.id}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>{r.comunidad}</td>
                <td className="px-4 py-3 text-[12px]" style={{ color: "var(--gco-text-2)" }}>{r.roles.map(permLabel).join(", ")}</td>
                <td className="px-4 py-3 text-[12.5px]" style={{ color: "var(--gco-text-2)" }}>{r.fechaInicio}</td>
                <td className="px-4 py-3 text-[12.5px]" style={{ color: "var(--gco-text-2)" }}>{r.vigenciaFinal || r.vigencia}</td>
                <td className="px-4 py-3"><StatusChip map={AS} k={r.estado} /></td>
                <td className="px-4 py-3 text-[12px]" style={{ color: "var(--gco-text-3)" }}>{(r.updatedAt || r.createdAt).slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onView(r)} className="fx text-[12.5px] font-bold" style={{ color: "var(--gco-navy)" }}>Ver</button>
                    {r.estado === "devuelta" && (
                      <>
                        <button type="button" onClick={() => onEdit(r)} className="fx text-[12.5px] font-bold" style={{ color: "var(--gco-green-dark)" }}>Ajustar</button>
                        <button type="button" onClick={() => onResend(r)} className="fx text-[12.5px] font-bold" style={{ color: "var(--gco-green-dark)" }}>Reenviar</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

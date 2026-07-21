"use client"

/* ============================================================================
 * GCO · SOLICITUDES DE ACCESO (For+ / Comité)
 * Bandeja de gobierno: revisar, devolver con observaciones, aprobar (definiendo
 * permisos finales y vigencia) o rechazar las solicitudes que envían los
 * colaboradores. Toda decisión queda en la traza, notifica al solicitante y
 * concede/actualiza los permisos vigentes. Persiste en el store global.
 * ========================================================================== */
import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Eye,
  MailCheck,
  RotateCw,
  Search,
  ShieldCheck,
  ThumbsDown,
  Undo2,
} from "lucide-react"
import { AS, REQ_ROLES, type AccessRequest, type AccessStatus } from "@/lib/gco/domain"
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
  StatusChip,
  TextArea,
  TextInput,
} from "../ui"

const permLabel = (code: string) => REQ_ROLES.find(([c]) => c === code)?.[1] ?? code

type Tab = { key: string; label: string; match?: (r: AccessRequest) => boolean }
const TABS: Tab[] = [
  { key: "pendientes", label: "Por revisar", match: (r) => ["enviada", "revision"].includes(r.estado) },
  { key: "devueltas", label: "Devueltas", match: (r) => r.estado === "devuelta" },
  { key: "aprobadas", label: "Aprobadas", match: (r) => r.estado === "aprobada" },
  { key: "rechazadas", label: "Rechazadas o vencidas", match: (r) => ["rechazada", "vencida"].includes(r.estado) },
  { key: "todas", label: "Todas" },
]

type ActionKind = "aprobar" | "devolver" | "rechazar" | null

export function SolicitudesAcceso() {
  const all = useGco(sel.accessInbox)
  const actor = useGco((s) => s.session.userId)
  const [active, setActive] = useState("pendientes")
  const [q, setQ] = useState("")
  const [detail, setDetail] = useState<AccessRequest | null>(null)
  const [action, setAction] = useState<ActionKind>(null)
  const [toast, setToast] = useState("")

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(""), 3200)
  }

  const countFor = (t: Tab) => (t.match ? all.filter(t.match).length : all.length)

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.key === active)
    let list = t?.match ? all.filter(t.match) : all
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter(
        (r) => r.solicitante.toLowerCase().includes(n) || r.id.toLowerCase().includes(n) || r.comunidad.toLowerCase().includes(n),
      )
    }
    return list
  }, [active, all, q])

  const openDetail = (r: AccessRequest) => {
    // Al abrir una solicitud enviada, la marcamos en revisión.
    if (r.estado === "enviada") A.transitionAccess(r.id, "revision", actor)
    setDetail(r)
  }

  return (
    <>
      <PageHeader
        crumbs={["Inicio", "Solicitudes de acceso"]}
        title="Solicitudes de acceso"
        sub="Revisa, devuelve, aprueba o rechaza las solicitudes de permisos que envían las áreas y comunidades."
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

      <div className="flex items-center gap-1.5 overflow-x-auto nsc pb-1 mb-4">
        {TABS.map((t) => {
          const on = t.key === active
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className="fx shrink-0 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold"
              style={on ? { background: "var(--gco-navy)", color: "#fff" } : { background: "var(--gco-surface)", border: "1px solid var(--gco-border)", color: "var(--gco-text-2)" }}
            >
              {t.label}
              <span className="inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-5" style={{ background: on ? "rgba(255,255,255,.2)" : "var(--gco-surface-2)", color: on ? "#fff" : "var(--gco-text-3)" }}>
                {countFor(t)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 flex-1 max-w-md" style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border)" }}>
          <Search size={16} style={{ color: "var(--gco-text-3)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por solicitante, código o comunidad…" className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--gco-text)" }} />
        </div>
      </div>

      <section style={cardStyle}>
        {rows.length === 0 ? (
          <div className="py-16 text-center px-6">
            <p className="text-sm font-semibold">No hay solicitudes en esta vista</p>
            <p className="text-xs mt-1" style={{ color: "var(--gco-text-3)" }}>Ajusta la pestaña o los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--gco-border)" }}>
                  {["Solicitante", "Comunidad", "Permisos", "Responsable", "Vigencia", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--gco-border)" }}>
                    <td className="px-4 py-3">
                      <div className="text-[13.5px] font-semibold">{r.solicitante}</div>
                      <div className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>{r.id} · {r.area}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>{r.comunidad}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: "var(--gco-text-2)" }}>{r.roles.map(permLabel).join(", ")}</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--gco-text-2)" }}>{r.responsable}</td>
                    <td className="px-4 py-3 text-[12.5px]" style={{ color: "var(--gco-text-2)" }}>{r.vigenciaFinal || r.vigencia}</td>
                    <td className="px-4 py-3"><StatusChip map={AS} k={r.estado} /></td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openDetail(r)} className="fx inline-flex items-center gap-1 text-[12.5px] font-bold" style={{ color: "var(--gco-green-dark)" }}>
                        <Eye size={14} /> Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detalle + decisiones */}
      <Modal
        open={!!detail && !action}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.id} · ${detail.solicitante}` : ""}
        w={620}
        footer={
          detail && ["enviada", "revision"].includes(detail.estado) ? (
            <>
              <BtnSoft icon={Undo2} onClick={() => setAction("devolver")}>Devolver</BtnSoft>
              <Btn icon={ThumbsDown} tone="red" onClick={() => setAction("rechazar")}>Rechazar</Btn>
              <Btn icon={MailCheck} onClick={() => setAction("aprobar")}>Aprobar</Btn>
            </>
          ) : (
            <BtnSoft onClick={() => setDetail(null)}>Cerrar</BtnSoft>
          )
        }
      >
        {detail && <RequestDetail r={detail} />}
      </Modal>

      {/* Sub-modales de decisión */}
      {detail && action && (
        <DecisionModal
          kind={action}
          req={detail}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null)
            setDetail(null)
            flash(msg)
          }}
          actor={actor}
        />
      )}
    </>
  )
}

function RequestDetail({ r }: { r: AccessRequest }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusChip map={AS} k={r.estado} />
        {r.estado === "devuelta" && (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "#9a7400" }}>
            <RotateCw size={13} /> a la espera de ajuste del solicitante
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          ["Correo", r.correo || "—"],
          ["Cargo", r.cargo || "—"],
          ["Área", r.area || "—"],
          ["Vicepresidencia", r.vp || "—"],
          ["Comunidad", r.comunidad],
          ["Responsable", r.responsable],
          ["Fecha inicial", r.fechaInicio],
          ["Vigencia", r.vigenciaFinal || r.vigencia],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>{l}</div>
            <div className="text-[13px] font-medium mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Tipos de espacio</div>
        <div className="flex flex-wrap gap-1.5 mt-1">{r.tipos.map((t) => <Chip key={t} tone="neutral">{t}</Chip>)}</div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Permisos solicitados</div>
        <div className="flex flex-wrap gap-1.5 mt-1">{r.roles.map((c) => <Chip key={c} tone="info">{permLabel(c)}</Chip>)}</div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Justificación</div>
        <p className="text-[13px] mt-1" style={{ color: "var(--gco-text)" }}>{r.justificacion}</p>
      </div>
      {r.observacionesSolicitante && (
        <div>
          <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>Observaciones del solicitante</div>
          <p className="text-[13px] mt-1" style={{ color: "var(--gco-text)" }}>{r.observacionesSolicitante}</p>
        </div>
      )}
      <div>
        <div className="text-[11px] font-semibold uppercase mb-1.5" style={{ color: "var(--gco-text-3)" }}>Historial</div>
        <ol className="space-y-2">
          {r.traza.map((t, i) => (
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
  )
}

function DecisionModal({
  kind,
  req,
  onClose,
  onDone,
  actor,
}: {
  kind: Exclude<ActionKind, null>
  req: AccessRequest
  onClose: () => void
  onDone: (msg: string) => void
  actor: string
}) {
  const [comentario, setComentario] = useState("")
  const [permisos, setPermisos] = useState<string[]>(req.roles)
  const [vigencia, setVigencia] = useState(req.vigencia === "Indefinida" ? "" : req.vigencia)
  const [indefinida, setIndefinida] = useState(req.vigencia === "Indefinida")
  const [showErr, setShowErr] = useState(false)

  const togglePerm = (c: string) => setPermisos((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
  const vigenciaFinal = indefinida ? "Indefinida" : vigencia

  const meta = {
    aprobar: { title: "Aprobar solicitud", tone: "green" as const, to: "aprobada" as AccessStatus, cta: "Confirmar aprobación", icon: MailCheck },
    devolver: { title: "Devolver para ajustes", tone: "navy" as const, to: "devuelta" as AccessStatus, cta: "Devolver al solicitante", icon: Undo2 },
    rechazar: { title: "Rechazar solicitud", tone: "red" as const, to: "rechazada" as AccessStatus, cta: "Confirmar rechazo", icon: ThumbsDown },
  }[kind]

  const submit = () => {
    setShowErr(true)
    if (kind === "aprobar") {
      if (permisos.length === 0 || (!indefinida && !vigencia)) return
      A.transitionAccess(req.id, "aprobada", actor, { permisosFinales: permisos, vigenciaFinal, comentario: comentario.trim() || undefined })
      onDone(`Acceso aprobado para ${req.solicitante}. Se concedieron los permisos y se notificó.`)
      return
    }
    if (!comentario.trim()) return
    A.transitionAccess(req.id, meta.to, actor, { comentario: comentario.trim() })
    onDone(kind === "devolver" ? `Solicitud ${req.id} devuelta con observaciones.` : `Solicitud ${req.id} rechazada.`)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={meta.title}
      w={520}
      footer={
        <>
          <BtnSoft onClick={onClose}>Cancelar</BtnSoft>
          <Btn icon={meta.icon} tone={meta.tone} onClick={submit}>{meta.cta}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[10px] p-3" style={{ background: "var(--gco-surface-2)" }}>
          <div className="text-[13px] font-bold">{req.solicitante} · {req.comunidad}</div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--gco-text-3)" }}>{req.id}</div>
        </div>

        {kind === "aprobar" && (
          <>
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px]" style={{ background: "var(--gco-green-soft)" }}>
              <ShieldCheck size={16} style={{ color: "var(--gco-green-dark)" }} className="mt-0.5" />
              <p className="text-[12px]" style={{ color: "var(--gco-green-dark)" }}>
                Define los permisos finales y la vigencia. Al confirmar se conceden y el solicitante podrá gestionar espacios.
              </p>
            </div>
            <div>
              <Label required>Permisos a conceder</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REQ_ROLES.map(([code, label]) => (
                  <CheckItem key={code} checked={permisos.includes(code)} onToggle={() => togglePerm(code)} label={label} />
                ))}
              </div>
              {showErr && permisos.length === 0 && <div className="mt-1"><InlineError>Concede al menos un permiso.</InlineError></div>}
            </div>
            <div>
              <Label required>Vigencia</Label>
              <TextInput type="date" value={vigencia} onChange={setVigencia} />
              <button
                type="button"
                onClick={() => setIndefinida((v) => !v)}
                className="fx inline-flex items-center gap-1.5 mt-1.5 text-[12px] font-semibold"
                style={{ color: indefinida ? "var(--gco-green-dark)" : "var(--gco-text-3)" }}
              >
                <span className="inline-flex items-center justify-center rounded-[5px]" style={{ width: 15, height: 15, border: `1.5px solid ${indefinida ? "var(--gco-green)" : "var(--gco-border-strong)"}`, background: indefinida ? "var(--gco-green)" : "transparent" }}>
                  {indefinida && <CheckCircle2 size={11} color="#fff" />}
                </span>
                Vigencia indefinida
              </button>
              {showErr && !indefinida && !vigencia && <div className="mt-1"><InlineError>Indica la vigencia o márcala indefinida.</InlineError></div>}
            </div>
          </>
        )}

        <div>
          <Label required={kind !== "aprobar"}>{kind === "aprobar" ? "Nota para el solicitante (opcional)" : kind === "devolver" ? "Qué debe corregir" : "Motivo del rechazo"}</Label>
          <TextArea
            value={comentario}
            onChange={setComentario}
            rows={3}
            placeholder={kind === "devolver" ? "Indica con claridad los ajustes requeridos…" : kind === "rechazar" ? "Explica por qué se rechaza…" : "Mensaje opcional para el solicitante…"}
          />
          {showErr && kind !== "aprobar" && !comentario.trim() && <div className="mt-1"><InlineError>Este campo es obligatorio.</InlineError></div>}
        </div>
      </div>
    </Modal>
  )
}

"use client"

/* ============================================================================
 * GCO · CREAR/EDITAR EVENTO — orquestador del formulario guiado de 4 secciones
 * Estado del formulario local + resumen lateral en tiempo real. Persiste
 * borradores en el store (auditoría + notificación al enviar) y cachea el
 * modelo en curso para "abandonar y continuar".
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Save,
  Send,
  ShieldCheck,
  X,
} from "lucide-react"
import { A, getGcoState, hydrateFromStorage, sel, useGco } from "@/lib/gco/store"
import {
  STEPS,
  cacheWorking,
  clearWorking,
  emptyEventModel,
  getPendingNew,
  missingForSend,
  modelFromEvent,
  nextEventId,
  readWorking,
  setPendingNew,
  toStorePayload,
  validateStep,
  type Errors,
  type EventModel,
} from "@/lib/gco/event-form"
import { Btn, BtnSoft, Modal, PageHeader, cardStyle, cx } from "../ui"
import { StepBody } from "./steps"
import { EventSummary } from "./summary"
import { EventReview } from "./review"

export function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter()
  const user = useGco(sel.user)
  const events = useGco((s) => s.events)

  const [model, setModel] = useState<EventModel | null>(null)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Errors>({})
  const [preview, setPreview] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const initialized = useRef(false)

  /* ---- Inicialización tras montaje (evita mismatch de hidratación) ---- */
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    hydrateFromStorage()
    const st = getGcoState()
    if (eventId) {
      const ev = st.events.find((e) => e.id === eventId)
      if (!ev) {
        setNotFound(true)
        return
      }
      const working = readWorking(eventId)
      setModel(working ?? modelFromEvent(ev, user))
    } else {
      const pending = getPendingNew()
      const cached = pending ? readWorking(pending) : null
      if (pending && cached) {
        setModel(cached)
      } else {
        const id = nextEventId(st)
        const fresh = emptyEventModel(id, st.session.periodo, user)
        setPendingNew(id)
        setModel(fresh)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  const set = (patch: Partial<EventModel>) => {
    setModel((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      cacheWorking(next)
      return next
    })
  }

  const goto = (target: number) => {
    setStep(target)
    setErrors({})
    scrollTop()
  }
  const scrollTop = () => {
    const el = document.querySelector("main.sc")
    if (el) el.scrollTo({ top: 0, behavior: "smooth" })
  }

  const next = () => {
    if (!model) return
    const errs = validateStep(step, model)
    setErrors(errs)
    if (Object.keys(errs).length) {
      flash("Revisa los campos marcados antes de continuar.")
      return
    }
    setStep((s) => Math.min(5, s + 1))
    scrollTop()
  }
  const prev = () => {
    setErrors({})
    setStep((s) => Math.max(1, s - 1))
    scrollTop()
  }

  const runValidateAll = (): boolean => {
    if (!model) return false
    const missing = missingForSend(model)
    if (missing.length) {
      setStep(missing[0].step)
      setErrors(validateStep(missing[0].step, model))
      flash(`${missing.length} campo(s) por completar antes de enviar.`)
      return false
    }
    setErrors({})
    flash("Todo está completo y validado.")
    return true
  }

  const saveDraft = () => {
    if (!model) return
    A.saveEvent(toStorePayload(model), user.id, true)
    flash("Borrador guardado. Puedes abandonar y continuar después.")
  }

  const cancel = () => {
    if (model) clearWorking(model.id)
    if (!eventId) setPendingNew(null)
    router.push("/mis-eventos")
  }

  const send = () => {
    if (!model) return
    if (!runValidateAll()) return
    A.saveEvent(toStorePayload(model), user.id, false)
    clearWorking(model.id)
    if (!eventId) setPendingNew(null)
    setSent(true)
  }

  const completeCount = useMemo(() => {
    if (!model) return 0
    let done = 0
    for (let s = 1; s <= 4; s++) if (Object.keys(validateStep(s, model)).length === 0) done++
    return done
  }, [model])

  /* ---- Estados de borde ---- */
  if (notFound) {
    return (
      <>
        <PageHeader crumbs={["Inicio", "Eventos", "Editar"]} title="Evento no encontrado" sub="El evento solicitado no existe o fue eliminado." />
        <section style={cardStyle} className="p-8 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--gco-text-2)" }}>
            No pudimos cargar el evento <b>{eventId}</b>.
          </p>
          <Btn icon={ArrowLeft} onClick={() => router.push("/mis-eventos")}>
            Volver a mis eventos
          </Btn>
        </section>
      </>
    )
  }

  if (!model) {
    return (
      <>
        <PageHeader title={eventId ? "Editar evento" : "Nuevo evento"} sub="Cargando el asistente…" />
        <div className="grid xl:grid-cols-[1fr_320px] gap-5">
          <div className="h-96 rounded-[14px] animate-pulse" style={{ background: "var(--gco-surface-2)" }} />
          <div className="hidden xl:block h-96 rounded-[14px] animate-pulse" style={{ background: "var(--gco-surface-2)" }} />
        </div>
      </>
    )
  }

  const current = STEPS.find((s) => s.n === step)!

  return (
    <>
      <PageHeader
        crumbs={["Inicio", "Eventos", eventId ? "Editar evento" : "Nuevo evento"]}
        title={eventId ? "Editar evento" : "Nuevo evento"}
        sub={`${model.codigo} · ${model.periodo} · Promueve ${model.areaPrincipal}`}
        right={
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)", color: "var(--gco-text-2)" }}>
            <Check size={13} style={{ color: "var(--gco-green-dark)" }} />
            {completeCount}/4 secciones completas
          </span>
        }
      />

      {/* Stepper */}
      <div className="mb-5 overflow-x-auto sc -mx-1 px-1">
        <ol className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const done = s.n < step
            const on = s.n === step
            return (
              <li key={s.n} className="flex items-center">
                <button
                  type="button"
                  onClick={() => goto(s.n)}
                  className="fx inline-flex items-center gap-2 rounded-[10px] px-2.5 py-2 transition-colors"
                  style={{ background: on ? "var(--gco-navy)" : "transparent" }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      background: on ? "var(--gco-green)" : done ? "var(--gco-green-soft)" : "var(--gco-surface-2)",
                      color: on ? "#fff" : done ? "var(--gco-green-dark)" : "var(--gco-text-3)",
                      border: done ? "none" : `1px solid var(--gco-border-strong)`,
                    }}
                  >
                    {done ? <Check size={12} strokeWidth={3} /> : s.n}
                  </span>
                  <span className="text-[12px] font-semibold hidden sm:inline" style={{ color: on ? "#fff" : done ? "var(--gco-text)" : "var(--gco-text-3)" }}>
                    {s.short}
                  </span>
                </button>
                {i < STEPS.length - 1 && <span className="w-4 h-px mx-0.5" style={{ background: "var(--gco-border-strong)" }} />}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Columna principal */}
        <div>
          <section style={cardStyle} className="fade">
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--gco-border)" }}>
              <span className="inline-flex items-center justify-center rounded-[9px] text-[13px] font-bold text-white" style={{ width: 30, height: 30, background: "var(--gco-green)" }}>
                {step}
              </span>
              <div>
                <h3 className="font-bold tracking-tight" style={{ fontSize: 15.5 }}>
                  {current.label}
                </h3>
                <p className="text-[11.5px]" style={{ color: "var(--gco-text-3)" }}>
                  Paso {step} de 5
                </p>
              </div>
            </div>
            <div className="p-5">
              <StepBody step={step} m={model} set={set} errors={errors} goto={goto} />
            </div>
          </section>

          {/* Barra de acciones */}
          <div
            className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-2 rounded-[14px] px-4 py-3"
            style={{ background: "var(--gco-surface)", border: "1px solid var(--gco-border)", boxShadow: "var(--gco-sh-2)", zIndex: 20 }}
          >
            <BtnSoft icon={X} sm onClick={cancel}>
              Cancelar
            </BtnSoft>
            <BtnSoft icon={Save} sm onClick={saveDraft}>
              Guardar borrador
            </BtnSoft>
            <div className="flex-1" />
            <BtnSoft icon={ShieldCheck} sm onClick={runValidateAll}>
              Validar
            </BtnSoft>
            <BtnSoft icon={Eye} sm onClick={() => setPreview(true)}>
              Vista previa
            </BtnSoft>
            {step > 1 && (
              <BtnSoft icon={ArrowLeft} sm onClick={prev}>
                Anterior
              </BtnSoft>
            )}
            {step < 5 ? (
              <Btn icon={ArrowRight} sm onClick={next}>
                Siguiente
              </Btn>
            ) : (
              <Btn icon={Send} sm tone="green" onClick={send}>
                Enviar a For+
              </Btn>
            )}
          </div>
        </div>

        {/* Resumen lateral */}
        <aside className="xl:sticky xl:top-4">
          <EventSummary m={model} />
        </aside>
      </div>

      {/* Vista previa */}
      <Modal open={preview} onClose={() => setPreview(false)} title="Vista previa del evento" w={860}>
        <div className="max-h-[70vh] overflow-y-auto sc pr-1">
          <EventReview m={model} set={set} goto={(s) => { setPreview(false); goto(s) }} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--gco-border)" }}>
          <BtnSoft onClick={() => setPreview(false)}>Editar</BtnSoft>
          <Btn icon={Send} onClick={() => { setPreview(false); send() }}>
            Enviar a For+
          </Btn>
        </div>
      </Modal>

      {/* Éxito de envío */}
      <Modal open={sent} onClose={() => router.push("/")} title="Evento enviado a For+" w={440}>
        <div className="text-center py-2">
          <span className="inline-flex items-center justify-center rounded-full mb-3" style={{ width: 56, height: 56, background: "var(--gco-green-soft)" }}>
            <CheckCircle2 size={28} style={{ color: "var(--gco-green-dark)" }} />
          </span>
          <p className="text-sm" style={{ color: "var(--gco-text-2)" }}>
            <b style={{ color: "var(--gco-text)" }}>{model.nombre}</b> quedó en estado <b>Enviado</b>. For+ recibió una
            notificación y el evento ya aparece en el panel de gobierno.
          </p>
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <BtnSoft onClick={() => router.push("/mis-eventos")}>Ver mis eventos</BtnSoft>
          <Btn onClick={() => router.push("/")}>Ir al inicio</Btn>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 pop flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-white"
          style={{ background: "var(--gco-navy)", boxShadow: "var(--gco-sh-pop)" }}
          role="status"
        >
          <CheckCircle2 size={15} style={{ color: "var(--gco-green)" }} />
          {toast}
        </div>
      )}
    </>
  )
}

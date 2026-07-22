"use client"

/* ============================================================================
 * GCO · STORE — estado global compartido con persistencia local,
 * auditoría y notificaciones simuladas. Fuente única en runtime.
 *
 * Patrón: store a nivel de módulo + useSyncExternalStore (sin dependencias).
 * Persiste en localStorage (clave gco.state.v2); degrada a memoria si no hay
 * storage disponible (SSR / sandbox).
 * ========================================================================== */
import { useRef, useSyncExternalStore } from "react"
import {
  AGENDA_BY_PERIOD,
  ANS_DIAS_REVISION,
  CAPACITY_SNAPSHOT,
  PERIODOS,
  ES,
  Role,
  CAPACIDAD_MENSUAL_HORAS,
  SCHEMA,
  TEAM,
  TODAY,
  USERS,
  daysBetween,
  seed,
  teamRisk,
  uid,
  nowISO,
  type AccessRequest,
  type AccessStatus,
  type AuditEntry,
  type Enrollment,
  type ApprovalRequest,
  type Citation,
  type Attendance,
  type SatisfactionResponse,
  type TacticalValidation,
  type Publication,
  type EventReview,
  type EventClosureResult,
  type EventStatus,
  type GcoEvent,
  type GcoState,
  type Grant,
  type Notification,
  type Period,
  type User,
} from "./domain"

const KEY = "gco.state.v2"

/* ---- Persistencia ---- */
const hasLS = () => {
  try {
    return typeof window !== "undefined" && !!window.localStorage
  } catch {
    return false
  }
}

function load(): GcoState | null {
  if (hasLS()) {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as GcoState
        if (parsed && parsed.version === SCHEMA) return parsed
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

function persist(s: GcoState) {
  if (hasLS()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }
}

/* ---- Núcleo del store ----
 * Sembramos SIEMPRE de forma determinista (seed) para que el primer render del
 * servidor y del cliente coincidan y no haya mismatch de hidratación. La
 * rehidratación desde localStorage se difiere a después del montaje mediante
 * hydrateFromStorage(), invocado en un efecto cliente del shell. */
const seededState: GcoState = seed()
let state: GcoState = seededState
let hydrated = false
const listeners = new Set<() => void>()

const getState = () => state
const getServerSnapshot = () => seededState
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Rehidrata desde localStorage una sola vez, tras el montaje en cliente. */
export function hydrateFromStorage() {
  if (hydrated) return
  hydrated = true
  const persisted = load()
  if (persisted) {
    state = persisted
    listeners.forEach((l) => l())
  }
}
function commit(next: GcoState) {
  state = next
  persist(state)
  listeners.forEach((l) => l())
}

/** Igualdad estructural acotada por profundidad: evita renders y bucles cuando
 *  el selector deriva objetos/arreglos nuevos con el mismo contenido (incluidos
 *  objetos anidados, como el panel de gobierno). Las referencias estables
 *  cortocircuitan vía Object.is, por lo que se mantiene barata. */
function shallowEqual(a: any, b: any, depth = 3): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false
  if (depth <= 0) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (!shallowEqual(a[k], b[k], depth - 1)) return false
  return true
}

/** Hook base: suscribe un selector puro al estado global con memoización
 *  por igualdad superficial. Evita el bucle infinito de useSyncExternalStore
 *  cuando el selector deriva objetos/arreglos nuevos con el mismo contenido:
 *  cacheamos el último valor y solo devolvemos una referencia nueva si el
 *  contenido cambió realmente. */
export function useGco<T>(selector: (s: GcoState) => T): T {
  const cache = useRef<{ has: boolean; value: T }>({ has: false, value: undefined as unknown as T })
  const getMemoized = (s: GcoState): T => {
    const next = selector(s)
    if (cache.current.has && shallowEqual(cache.current.value, next)) {
      return cache.current.value
    }
    cache.current = { has: true, value: next }
    return next
  }
  return useSyncExternalStore(
    subscribe,
    () => getMemoized(getState()),
    () => getMemoized(getServerSnapshot()),
  )
}

/** Acceso directo al estado (fuera de React). */
export const getGcoState = getState

/* ---- Helpers de auditoría y notificaciones ---- */
function audit(s: GcoState, e: Omit<AuditEntry, "id" | "ts">): AuditEntry[] {
  return [{ id: uid("AUD"), ts: nowISO(), ...e }, ...s.audit]
}
function notif(
  s: GcoState,
  n: Omit<Notification, "id" | "fecha" | "leida" | "fallida"> & Partial<Pick<Notification, "fallida">>,
): Notification[] {
  return [{ id: uid("N"), fecha: nowISO(), leida: false, fallida: false, remitente: "Gestión de Capacidad Organizacional", asunto: n.titulo, activador: "Se genera automáticamente por una acción del flujo", ...n }, ...s.notifications]
}

/* ============================================================================
 * ACCIONES
 * ========================================================================== */
export const A = {
  boot() {
    commit({ ...state, session: { ...state.session, booted: true } })
  },
  login(userId: string) {
    const u = USERS[userId]
    if (!u) return
    commit({
      ...state,
      session: { ...state.session, userId, role: u.roles[0], booted: true },
      audit: audit(state, { actor: userId, action: "auth.login", entity: "system", entityId: userId }),
    })
  },
  setRole(role: Role) {
    commit({
      ...state,
      session: { ...state.session, role },
      audit: audit(state, { actor: state.session.userId, action: `auth.role:${role}`, entity: "system", entityId: role }),
    })
  },
  setPeriodo(periodo: Period) {
    commit({
      ...state,
      session: { ...state.session, periodo },
      audit: audit(state, { actor: state.session.userId, action: `session.periodo:${periodo}`, entity: "system", entityId: periodo }),
    })
  },
  setMenu(menuCollapsed: boolean) {
    commit({ ...state, session: { ...state.session, menuCollapsed } })
  },
  markRead(id: string) {
    commit({ ...state, notifications: state.notifications.map((n) => (n.id === id ? { ...n, leida: true } : n)) })
  },
  markAllRead(role: Role, correo?: string) {
    commit({ ...state, notifications: state.notifications.map((n) => (n.destinatarioRol === role || (!!correo && n.destinatarioCorreo === correo) ? { ...n, leida: true } : n)) })
  },
  /**
   * Crea o actualiza una solicitud de acceso.
   * Solo al enviar (isDraft=false) se notifica a For+.
   */
  createAccessRequest(payload: Partial<AccessRequest>, actor: string, isDraft: boolean): AccessRequest {
    const estado: AccessStatus = isDraft ? "borrador" : "enviada"
    const tz = isDraft
      ? [{ actor, ts: nowISO(), from: null, to: "borrador", comentario: "Borrador guardado" }]
      : [
          { actor, ts: nowISO(), from: null, to: "borrador", comentario: "Creación" },
          { actor, ts: nowISO(), from: "borrador", to: "enviada", comentario: "Envío a For+" },
        ]
    const req = { ...(payload as AccessRequest), id: payload.id || uid("SOL"), createdAt: nowISO(), estado, traza: tz }
    commit({
      ...state,
      accessRequests: [req, ...state.accessRequests.filter((r) => r.id !== req.id)],
      audit: audit(state, {
        actor,
        action: isDraft ? "access.draft" : "access.send",
        entity: "access_request",
        entityId: req.id,
        after: estado,
        comment: req.comunidad,
      }),
      notifications:
        estado === "enviada"
          ? notif(state, {
              kind: "evento_recibido",
              destinatarioRol: Role.ForPlus,
              titulo: "Nueva solicitud de acceso",
              descripcion: `${req.solicitante} solicita acceso (${req.comunidad}).`,
              requiereAccion: true,
              rel: req.id,
            })
          : state.notifications,
    })
    return req
  },
  updateAccessDraft(id: string, patch: Partial<AccessRequest>, actor: string) {
    commit({
      ...state,
      accessRequests: state.accessRequests.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: nowISO() } : r,
      ),
      audit: audit(state, { actor, action: "access.edit", entity: "access_request", entityId: id }),
    })
  },
  /** Colaborador reenvía una solicitud devuelta tras ajustarla. */
  resendAccessRequest(id: string, patch: Partial<AccessRequest>, actor: string) {
    const r = state.accessRequests.find((x) => x.id === id)
    if (!r) return
    const tz = [...r.traza, { actor, ts: nowISO(), from: r.estado, to: "enviada", comentario: "Reenvío tras ajuste" }]
    commit({
      ...state,
      accessRequests: state.accessRequests.map((x) =>
        x.id === id ? { ...x, ...patch, estado: "enviada", updatedAt: nowISO(), traza: tz } : x,
      ),
      audit: audit(state, { actor, action: "access.resend", entity: "access_request", entityId: id, after: "enviada" }),
      notifications: notif(state, {
        kind: "evento_recibido",
        destinatarioRol: Role.ForPlus,
        titulo: "Solicitud de acceso reenviada",
        descripcion: `${r.solicitante} reenvió su solicitud (${r.comunidad}).`,
        requiereAccion: true,
        rel: id,
      }),
    })
  },
  /** For+ transición genérica de una solicitud de acceso con trazabilidad. */
  transitionAccess(
    id: string,
    to: AccessStatus,
    actor: string,
    opts?: { comentario?: string; permisosFinales?: string[]; vigenciaFinal?: string },
  ) {
    const r = state.accessRequests.find((x) => x.id === id)
    if (!r) return
    const tz = [...r.traza, { actor, ts: nowISO(), from: r.estado, to, comentario: opts?.comentario || `Estado: ${to}` }]
    let grants = state.grants
    if (to === "aprobada") {
      const g: Grant = {
        reqId: id,
        comunidad: r.comunidad,
        permisos: opts?.permisosFinales || r.roles,
        vigencia: opts?.vigenciaFinal || r.vigencia,
        ts: nowISO(),
      }
      grants = { ...state.grants, [r.solicitante]: [g, ...(state.grants[r.solicitante] || [])] }
    }
    const notifMap: Partial<Record<AccessStatus, { t: string; d: string }>> = {
      revision: { t: "Solicitud en revisión", d: `Tu solicitud (${r.comunidad}) está siendo revisada por For+.` },
      devuelta: { t: "Solicitud devuelta", d: opts?.comentario || `Tu solicitud (${r.comunidad}) fue devuelta para ajustes.` },
      aprobada: { t: "Acceso aprobado", d: `Se aprobó tu acceso para ${r.comunidad}. Ya puedes gestionar espacios.` },
      rechazada: { t: "Solicitud rechazada", d: opts?.comentario || `Tu solicitud (${r.comunidad}) fue rechazada.` },
    }
    const nm = notifMap[to]
    commit({
      ...state,
      grants,
      accessRequests: state.accessRequests.map((x) =>
        x.id === id
          ? {
              ...x,
              estado: to,
              observaciones: opts?.comentario ?? x.observaciones,
              permisosFinales: opts?.permisosFinales ?? x.permisosFinales,
              vigenciaFinal: opts?.vigenciaFinal ?? x.vigenciaFinal,
              updatedAt: nowISO(),
              traza: tz,
            }
          : x,
      ),
      audit: audit(state, {
        actor,
        action: `access.${to}`,
        entity: "access_request",
        entityId: id,
        after: to,
        comment: opts?.comentario,
      }),
      notifications: nm
        ? notif(state, {
            kind: to === "aprobada" ? "aprobacion" : "informativa",
            destinatarioRol: Role.Colaborador,
            destinatarioCorreo: r.correo,
            activador: `For+ cambia la solicitud a estado ${to}.`,
            titulo: nm.t,
            descripcion: nm.d,
            requiereAccion: to === "devuelta",
            rel: id,
          })
        : state.notifications,
    })
  },
  revokeGrant(userName: string, reqId: string, actor: string) {
    commit({
      ...state,
      grants: { ...state.grants, [userName]: (state.grants[userName] || []).filter((g) => g.reqId !== reqId) },
      audit: audit(state, { actor, action: "access.revoke", entity: "grant", entityId: reqId, comment: userName }),
    })
  },
  changeGrantRole(userName: string, reqId: string, role: string, actor: string) {
    commit({
      ...state,
      grants: { ...state.grants, [userName]: (state.grants[userName] || []).map((g) => g.reqId === reqId ? { ...g, permisos: [role], ts: nowISO() } : g) },
      audit: audit(state, { actor, action: "access.role_change", entity: "grant", entityId: reqId, after: role, comment: userName }),
    })
  },
  /** Crea o actualiza un evento. Solo al enviar (isDraft=false) se notifica a For+. */
  saveEvent(model: Record<string, any>, actor: string, isDraft: boolean): GcoEvent {
    const estado = isDraft ? "borrador" : "en_revision"
    const id = model.id as string
    const exists = state.events.some((e) => e.id === id)
    const prev = state.events.find((e) => e.id === id)
    const tz = [
      ...(prev?.traza || []),
      { actor, ts: nowISO(), from: prev?.estado || null, to: estado, comentario: isDraft ? "Borrador guardado" : "Enviado a For+" },
    ]
    const event: GcoEvent = {
      ...(prev || ({} as GcoEvent)),
      id,
      nombre: model.nombre,
      area: model.areaPrincipal,
      tipo: model.tipo,
      estado,
      cruce: !!model._cruce,
      periodo: model.periodo,
      responsable: model.responsable,
      createdBy: actor,
      createdAt: prev?.createdAt || nowISO(),
      updatedAt: nowISO(),
      fecha: model.fecha,
      sesiones: model.sesiones || [],
      model,
      traza: tz,
    }
    let nextEnrollments = state.enrollments
    let nextApprovals = state.approvals
    let nextNotifications = state.notifications
    if (!isDraft && model.requiereInscripcion === false) {
      const allPeople = (model.personas || []).filter((p: any) => p.valido)
      const approvalEmails = new Set((model.personasAprobacionCorreos || []).map((x:string)=>x.toLowerCase()))
      const approvalEnrollmentIds: string[] = []
      for (const person of allPeople) {
        const invited = Object.values(USERS).find((u) => u.correo.toLowerCase() === String(person.correo).toLowerCase())
        if (!invited) continue
        let enrollment = nextEnrollments.find((x) => x.eventId === id && x.userId === invited.id)
        if (!enrollment) {
          const needsApproval = !!model.requiereAprobacionInvitados && approvalEmails.has(invited.correo.toLowerCase())
          enrollment = { id: uid("INS"), eventId: id, userId: invited.id, sessionIds: [], createdAt: nowISO(), fechaInscripcion: nowISO(), estadoInscripcion: "confirmado", confirmaDisponibilidad: true, aceptaPoliticaCancelacion: true, aceptaNoGarantiaCupo: true, capacidadAntes: 0, capacidadProyectada: 2, cruceDetectado: !!model._cruce, approvalState: "no_requiere", estadoCupo: needsApproval ? "sin_asignar" : "aprobado", liderNotificado: false, estadoCitacion: "pendiente", estadoAsistencia: "pendiente" }
          nextEnrollments = [enrollment, ...nextEnrollments]
        }
        if (approvalEmails.has(invited.correo.toLowerCase())) approvalEnrollmentIds.push(enrollment.id)
      }
      // La aprobación de invitados se crea después de que For+ apruebe el evento.

    }
    commit({
      ...state,
      enrollments: nextEnrollments,
      approvals: nextApprovals,
      events: exists ? state.events.map((e) => (e.id === id ? event : e)) : [event, ...state.events],
      audit: audit(state, {
        actor,
        action: isDraft ? "event.draft" : "event.send",
        entity: "event",
        entityId: id,
        after: estado,
        comment: model.nombre,
      }),
      notifications:
        estado === "en_revision"
          ? notif({ ...state, notifications: notif(state, {
              kind: "informativa",
              destinatarioRol: Role.AreaPromotora,
              destinatarioCorreo: USERS[actor]?.correo,
              titulo: "Evento enviado a revisión",
              descripcion: `“${model.nombre}” fue enviado correctamente a For+.`,
              requiereAccion: false,
              rel: id,
            }) }, {
              kind: "evento_recibido",
              destinatarioRol: Role.ForPlus,
              titulo: "Nuevo evento para revisar",
              descripcion: `“${model.nombre}” fue enviado por el área promotora.`,
              requiereAccion: true,
              rel: id,
            })
          : nextNotifications,
    })
    return event
  },
  /**
   * Decisión de gobierno For+ sobre un evento. Cambia estado, guarda la
   * revisión, registra usuario/fecha en la traza, notifica al área promotora
   * y audita. Persiste vía commit().
   */
  decideEvent(
    id: string,
    to: EventStatus,
    actor: string,
    opts?: { comentario?: string; review?: Partial<EventReview>; prioridad?: GcoEvent["prioridad"] },
  ) {
    const ev = state.events.find((e) => e.id === id)
    if (!ev) return
    const review: EventReview | undefined = opts?.review
      ? { ...(ev.review || {}), ...opts.review, revisor: USERS[actor]?.nombre || actor, decidedAt: nowISO(), decision: to }
      : ev.review
    const tz = [
      ...ev.traza,
      { actor: USERS[actor]?.nombre || actor, ts: nowISO(), from: ev.estado, to, comentario: opts?.comentario || `Decisión: ${to}` },
    ]
    const LABEL: Partial<Record<EventStatus, { t: string; d: string }>> = {
      en_revision: { t: "Evento en revisión", d: `“${ev.nombre}” entró en revisión por For+.` },
      devuelto: { t: "Evento devuelto", d: opts?.comentario || `“${ev.nombre}” fue devuelto para ajustes.` },
      aprobado: { t: "Evento aprobado", d: `“${ev.nombre}” fue aprobado y tiene periodo asignado.` },
      aprobado_condicionado: { t: "Evento aprobado con condiciones", d: `“${ev.nombre}” fue aprobado con condiciones.` },
      pendiente_priorizacion: { t: "Evento priorizado", d: `“${ev.nombre}” fue priorizado para otro periodo.` },
      rechazado: { t: "Evento rechazado", d: opts?.comentario || `“${ev.nombre}” fue rechazado.` },
    }
    const nm = LABEL[to]
    const periodo = opts?.review?.periodoEjecucion || opts?.review?.periodoDestino
    let nextApprovals = state.approvals
    let nextEnrollments = state.enrollments
    let nextNotifications = state.notifications
    if (["aprobado", "aprobado_condicionado"].includes(to)) {
      const model: any = ev.model || {}
      if (model.requiereInscripcion === false && model.requiereAprobacionInvitados && model.correoAprobadorInvitados) {
        const selected = new Set((model.personasAprobacionCorreos || []).map((x:string)=>x.toLowerCase()))
        const targetEnrollments = state.enrollments.filter(en=>{
          if(en.eventId!==id) return false
          const u=USERS[en.userId]
          return !!u && selected.has(u.correo.toLowerCase())
        })
        const already = state.approvals.some(a=>a.eventId===id && a.estado==="pendiente")
        if (targetEnrollments.length && !already) {
          const approval: ApprovalRequest = { id: uid("APR"), eventId:id, enrollmentIds:targetEnrollments.map(x=>x.id), userIds:targetEnrollments.map(x=>x.userId), approverType:"aprobador_especifico", approvers:[model.correoAprobadorInvitados], correosAprobadores:[model.correoAprobadorInvitados], regla:"todos", fechaLimite:model.fecha||"", instrucciones:model.instruccionesAprobacionInvitados||"Autorizar asistencia", observacionObligatoriaAprobar:false, recordatorios:true, numeroRecordatorios:0, escalado:false, comportamientoAlVencer:"escalar", estado:"pendiente", respuestas:[], createdBy:actor, createdAt:nowISO() }
          nextApprovals=[approval,...nextApprovals]
          nextEnrollments=nextEnrollments.map(en=>targetEnrollments.some(t=>t.id===en.id)?{...en,approvalState:"pendiente" as const,liderNotificado:true,fechaNotificacionLider:nowISO()}:en)
          nextNotifications=notif({...state,notifications:nextNotifications},{kind:"aprobacion",destinatarioRol:Role.Lider,destinatarioCorreo:model.correoAprobadorInvitados,titulo:"Aprobación formal requerida",descripcion:`Tienes ${targetEnrollments.length} persona(s) invitadas por aprobar para “${ev.nombre}”.`,requiereAccion:true,rel:approval.id})
        }
      }
    }
    commit({
      ...state,
      approvals: nextApprovals,
      enrollments: nextEnrollments,
      events: state.events.map((e) =>
        e.id === id
          ? {
              ...e,
              estado: to,
              review,
              prioridad: opts?.prioridad ?? e.prioridad,
              periodo: periodo || e.periodo,
              updatedAt: nowISO(),
              traza: tz,
            }
          : e,
      ),
      audit: audit(state, {
        actor,
        action: `event.${to}`,
        entity: "event",
        entityId: id,
        after: to,
        comment: opts?.comentario || ev.nombre,
      }),
      notifications: nm
        ? notif(state, {
            kind: to === "aprobado" || to === "aprobado_condicionado" ? "aprobacion" : "informativa",
            destinatarioRol: Role.AreaPromotora,
            titulo: nm.t,
            descripcion: nm.d,
            requiereAccion: to === "devuelto",
            rel: id,
          })
        : nextNotifications,
    })
  },
  /** Área promotora reenvía un evento devuelto tras ajustarlo. */
  resubmitEvent(id: string, actor: string) {
    const ev = state.events.find((e) => e.id === id)
    if (!ev) return
    const tz = [...ev.traza, { actor: USERS[actor]?.nombre || actor, ts: nowISO(), from: ev.estado, to: "en_revision", comentario: "Reenvío tras ajuste" }]
    commit({
      ...state,
      events: state.events.map((e) => (e.id === id ? { ...e, estado: "en_revision", updatedAt: nowISO(), traza: tz } : e)),
      audit: audit(state, { actor, action: "event.resubmit", entity: "event", entityId: id, after: "en_revision" }),
      notifications: notif(state, {
        kind: "evento_recibido",
        destinatarioRol: Role.ForPlus,
        titulo: "Evento reenviado para revisión",
        descripcion: `“${ev.nombre}” fue reenviado por el área promotora.`,
        requiereAccion: true,
        rel: id,
      }),
    })
  },

  /** Publica o cambia la ventana de inscripción de un evento aprobado. */
  setEventOperationalStatus(id: string, to: EventStatus, actor: string, comment?: string) {
    const ev = state.events.find((e) => e.id === id)
    if (!ev) return
    const tz = [...ev.traza, { actor: USERS[actor]?.nombre || actor, ts: nowISO(), from: ev.estado, to, comentario: comment || `Estado operativo: ${to}` }]
    let publications = state.publications
    if (to === "publicado") {
      const model: any = ev.model || {}
      const pub: Publication = { id: uid("PUB"), eventId: id, canal: model.canalPublicacion || "Agenda", piezaId: model.piezaEvento?.id, estado: "publicada", fechaPrevista: model.fechaPrevistaPublicacion, fechaReal: nowISO(), responsableId: actor }
      publications = [pub, ...publications.filter((x) => x.eventId !== id)]
    }
    commit({
      ...state,
      publications,
      events: state.events.map((e) => e.id === id ? { ...e, estado: to, updatedAt: nowISO(), traza: tz } : e),
      audit: audit(state, { actor, action: `event.${to}`, entity: "event", entityId: id, after: to, comment }),
      notifications: notif(state, { kind: "informativa", destinatarioRol: to === "inscripciones_abiertas" ? Role.Colaborador : Role.AreaPromotora, titulo: ES[to][0], descripcion: `“${ev.nombre}” cambió a ${ES[to][0].toLowerCase()}.`, requiereAccion: false, rel: id }),
    })
  },
  enroll(eventId: string, userId: string, sessionIds: string[], payload?: Partial<Enrollment>) {
    const ev = state.events.find((e) => e.id === eventId)
    const user = USERS[userId]
    if (!ev || !user || state.enrollments.some((x) => x.eventId === eventId && x.userId === userId && x.estadoInscripcion !== "cancelado")) return
    const dur = (ev.sesiones || []).filter((x: any) => !sessionIds.length || sessionIds.includes((x as any).id)).reduce((a: number, x: any) => a + Number(x.duracionContabilizable ?? 2), 0) || 2
    const before = TEAM.find((m) => m.nombre === user.nombre)?.horasMes || 0
    const full = (ev.cupos || Number((ev.model as any)?.cuposTotales) || 0) > 0 && state.enrollments.filter((x) => x.eventId === eventId && x.estadoCupo === "aprobado").length >= (ev.cupos || Number((ev.model as any)?.cuposTotales) || 0)
    const enrollment: Enrollment = {
      id: uid("INS"), eventId, userId, sessionIds, createdAt: nowISO(), fechaInscripcion: nowISO(),
      estadoInscripcion: full ? "lista_espera" : "inscrito", motivoInteres: payload?.motivoInteres || "", comentariosNecesidades: payload?.comentariosNecesidades || "",
      confirmaDisponibilidad: payload?.confirmaDisponibilidad ?? true, aceptaPoliticaCancelacion: payload?.aceptaPoliticaCancelacion ?? true,
      aceptaNoGarantiaCupo: payload?.aceptaNoGarantiaCupo ?? true, capacidadAntes: before, capacidadProyectada: before + dur,
      cruceDetectado: !!ev.cruce, approvalState: "no_requiere", estadoCupo: full ? "lista_espera" : "sin_asignar",
      posicionListaEspera: full ? state.enrollments.filter((x) => x.eventId === eventId && x.estadoCupo === "lista_espera").length + 1 : undefined,
      liderNotificado: true, fechaNotificacionLider: nowISO(), estadoCitacion: "pendiente", estadoAsistencia: "pendiente",
    }
    commit({
      ...state,
      enrollments: [enrollment, ...state.enrollments],
      events: state.events.map((e) => e.id === eventId ? { ...e, inscritos: (e.inscritos || 0) + 1 } : e),
      audit: audit(state, { actor: userId, action: "enrollment.create", entity: "enrollment", entityId: enrollment.id, after: enrollment.estadoInscripcion }),
      notifications: notif({ ...state, notifications: notif(state, { kind: "informativa", destinatarioRol: Role.Colaborador, destinatarioCorreo: user.correo, titulo: "Inscripción registrada", descripcion: `Tu inscripción a “${ev.nombre}” fue registrada. La inscripción no garantiza cupo.`, requiereAccion: false, rel: eventId }) } as any, { kind: "informativa", destinatarioRol: Role.Lider, titulo: "Inscripción informativa de tu equipo", descripcion: `${user.nombre} se inscribió a “${ev.nombre}”. No requiere decisión mientras el área no solicite aprobación formal.`, requiereAccion: false, rel: eventId }),
    })
    return enrollment
  },
  cancelEnrollment(id: string, actor: string, motivo: string) {
    const en = state.enrollments.find((x) => x.id === id); if (!en) return
    commit({ ...state, enrollments: state.enrollments.map((x) => x.id === id ? { ...x, estadoInscripcion: "cancelado", estadoCupo: x.estadoCupo === "aprobado" ? "liberado" : x.estadoCupo, fechaCancelacion: nowISO(), motivoCancelacion: motivo } : x), audit: audit(state, { actor, action: "enrollment.cancel", entity: "enrollment", entityId: id, after: "cancelado", comment: motivo }) })
  },
  requestApproval(eventId: string, enrollmentIds: string[], actor: string, opts: Partial<ApprovalRequest>) {
    if (!enrollmentIds.length) return
    const ens = state.enrollments.filter((x) => enrollmentIds.includes(x.id))
    const req: ApprovalRequest = {
      id: uid("APR"), eventId, enrollmentIds, userIds: ens.map((x) => x.userId), approverType: opts.approverType || "lider_directo",
      approvers: opts.approvers || ens.map((x) => USERS[x.userId]?.lider).filter(Boolean), correosAprobadores: opts.correosAprobadores || [],
      regla: opts.regla || "todos", fechaLimite: opts.fechaLimite || "", instrucciones: opts.instrucciones || "",
      observacionObligatoriaAprobar: opts.observacionObligatoriaAprobar || false, recordatorios: opts.recordatorios ?? true,
      frecuenciaRecordatorio: opts.frecuenciaRecordatorio || "Diario", maxRecordatorios: opts.maxRecordatorios || 3, numeroRecordatorios: 0,
      escalado: false, aprobadorAlterno: opts.aprobadorAlterno, comportamientoAlVencer: opts.comportamientoAlVencer || "escalar",
      estado: "pendiente", respuestas: [], createdBy: actor, createdAt: nowISO(),
    }
    commit({ ...state, approvals: [req, ...state.approvals], enrollments: state.enrollments.map((x) => enrollmentIds.includes(x.id) ? { ...x, approvalState: "pendiente" } : x), audit: audit(state, { actor, action: "approval.request", entity: "approval", entityId: req.id, after: "pendiente" }), notifications: req.correosAprobadores.reduce((acc,correo)=>notif({...state,notifications:acc},{ kind: "aprobacion", destinatarioRol: Role.Lider, destinatarioCorreo: correo, activador: "El área promotora selecciona personas inscritas y solicita aprobación formal.", titulo: "Aprobación formal requerida", descripcion: `Tienes ${enrollmentIds.length} persona(s) por aprobar para este evento.`, requiereAccion: true, rel: req.id }), state.notifications) })
    return req
  },
  respondApproval(id: string, approver: string, decision: "aprobada" | "rechazada" | "reprogramada", observacion?: string, nuevaFecha?: string, nuevaHora?: string) {
    const req = state.approvals.find((x) => x.id === id); if (!req) return
    const respuestas = [...req.respuestas.filter((r) => r.approver !== approver), { approver, decision, ts: nowISO(), observacion, nuevaFecha, nuevaHora }]
    const approved = req.regla === "cualquiera" ? respuestas.some((r) => r.decision === "aprobada") : req.approvers.every((a) => respuestas.some((r) => r.approver === a && r.decision === "aprobada"))
    const rejected = respuestas.some((r) => r.decision === "rechazada")
    const estado = decision === "reprogramada" ? "pendiente" : rejected ? "rechazada" : approved ? "aprobada" : "pendiente"
    commit({ ...state, approvals: state.approvals.map((x) => x.id === id ? { ...x, respuestas, estado, fechaRespuesta: estado !== "pendiente" ? nowISO() : undefined } : x), enrollments: state.enrollments.map((x) => req.enrollmentIds.includes(x.id) && estado !== "pendiente" ? { ...x, approvalState: estado === "aprobada" ? "aprobada" : "rechazada" } : x), audit: audit(state, { actor: approver, action: `approval.${decision}`, entity: "approval", entityId: id, after: estado, comment: observacion }), notifications: notif(state, { kind: "aprobacion", destinatarioRol: Role.AreaPromotora, titulo: `Aprobación ${estado}`, descripcion: `La solicitud ${id} quedó ${estado}.`, requiereAccion: false, rel: req.eventId }) })
  },
  setSeat(enrollmentId: string, estadoCupo: Enrollment["estadoCupo"], actor: string, motivo?: string) {
    const en = state.enrollments.find((x) => x.id === enrollmentId); if (!en) return
    const ev = state.events.find((x) => x.id === en.eventId); if (!ev) return
    const next = state.enrollments.map((x) => x.id === enrollmentId ? { ...x, estadoCupo, estadoInscripcion: estadoCupo === "lista_espera" ? "lista_espera" as const : estadoCupo === "rechazado" ? "rechazado" as const : "confirmado" as const, motivoRechazo: estadoCupo === "rechazado" ? motivo : x.motivoRechazo } : x)
    const approvedCount = next.filter((x) => x.eventId === en.eventId && x.estadoCupo === "aprobado").length
    commit({ ...state, enrollments: next, events: state.events.map((x) => x.id === en.eventId ? { ...x, aprobados: approvedCount } : x), audit: audit(state, { actor, action: `seat.${estadoCupo}`, entity: "enrollment", entityId: enrollmentId, after: estadoCupo, comment: motivo }), notifications: notif(state, { kind: "informativa", destinatarioRol: Role.Colaborador, titulo: estadoCupo === "aprobado" ? "Cupo aprobado" : estadoCupo === "lista_espera" ? "Lista de espera" : "Cupo no asignado", descripcion: `Actualización de cupo para “${ev.nombre}”.`, requiereAccion: false, rel: ev.id }) })
  },
  createCitations(eventId: string, enrollmentIds: string[], actor: string, opts?: Partial<Citation>) {
    const ev = state.events.find((x) => x.id === eventId); if (!ev) return
    const created: Citation[] = state.enrollments.filter((x) => enrollmentIds.includes(x.id)).map((en) => ({ id: uid("CIT"), eventId, sessionId: en.sessionIds[0] || "", enrollmentId: en.id, userId: en.userId, organizerId: actor, tipo: opts?.tipo || "automatica", estado: "enviada", fechaProgramada: opts?.fechaProgramada, fechaEnviada: nowISO(), asunto: opts?.asunto || `Citación · ${ev.nombre}`, cuerpo: opts?.cuerpo || "Te esperamos en este espacio.", link: opts?.link, location: opts?.location }))
    commit({ ...state, citations: [...created, ...state.citations], enrollments: state.enrollments.map((x) => enrollmentIds.includes(x.id) ? { ...x, estadoCitacion: "enviada" } : x), events: state.events.map((x) => x.id === eventId ? { ...x, estado: "citado", citados: (x.citados || 0) + created.length } : x), audit: audit(state, { actor, action: "citation.send", entity: "event", entityId: eventId, after: "citado" }), notifications: notif(state, { kind: "informativa", destinatarioRol: Role.Colaborador, titulo: "Citación enviada", descripcion: `Se enviaron citaciones para “${ev.nombre}”.`, requiereAccion: false, rel: eventId }) })
  },
  recordAttendance(eventId: string, userId: string, estado: Attendance["estado"], actor: string, minutos = 0) {
    const ev = state.events.find((x) => x.id === eventId); if (!ev) return
    const att: Attendance = { id: uid("ASI"), eventId, sessionId: ev.sesiones[0]?.nombre || "", userId, estado, minutosAsistidos: minutos, fuente: "manual", fechaRegistro: nowISO(), registradoPor: actor }
    commit({ ...state, attendance: [att, ...state.attendance.filter((x) => !(x.eventId === eventId && x.userId === userId))], enrollments: state.enrollments.map((x) => x.eventId === eventId && x.userId === userId ? { ...x, estadoAsistencia: estado } : x), events: state.events.map((x) => x.id === eventId ? { ...x, estado: "pendiente_cierre" } : x), audit: audit(state, { actor, action: "attendance.record", entity: "event", entityId: eventId, after: estado }) })
  },
  submitSatisfaction(eventId: string, userId: string, values: Partial<SatisfactionResponse>) {
    const response: SatisfactionResponse = { id: uid("SAT"), eventId, userId, satisfaccionGeneral: values.satisfaccionGeneral || 5, pertinencia: values.pertinencia || 5, aplicabilidad: values.aplicabilidad || 5, facilitador: values.facilitador || 5, organizacion: values.organizacion || 5, duracion: values.duracion || 5, recomendacion: values.recomendacion || 10, comentario: values.comentario, cumplimientoObjetivo: values.cumplimientoObjetivo || 5, fechaRespuesta: nowISO() }
    commit({ ...state, satisfaction: [response, ...state.satisfaction.filter((x) => !(x.eventId === eventId && x.userId === userId))], audit: audit(state, { actor: userId, action: "satisfaction.submit", entity: "event", entityId: eventId }) })
  },
  registerEventClosure(eventId: string, actor: string, resultado: EventClosureResult, comment?: string) {
    const ev = state.events.find((x) => x.id === eventId); if (!ev) return false
    const asistentesCargados = state.attendance.some((x) => x.eventId === eventId)
    if (!asistentesCargados && !["rechazado_comite", "aplazado_comite"].includes(resultado)) return false
    const nextStatus: EventStatus = resultado === "rechazado_comite" ? "rechazado" : resultado === "aplazado_comite" ? "reprogramado" : "cerrado"
    const label = resultado === "satisfactorio" ? "Cierre satisfactorio" : resultado === "no_satisfactorio" ? "Cierre no satisfactorio" : resultado === "rechazado_comite" ? "Rechazado por el comité" : "Aplazado por el comité"
    commit({
      ...state,
      events: state.events.map((x) => x.id === eventId ? {
        ...x,
        estado: nextStatus,
        cierre: { resultado, comentario: comment, asistentesCargados, registradoPor: actor, registradoAt: nowISO() },
        updatedAt: nowISO(),
        traza: [...x.traza, { actor, ts: nowISO(), from: x.estado, to: nextStatus, comentario: `${label}${comment ? `: ${comment}` : ""}` }],
      } : x),
      audit: audit(state, { actor, action: "event.closure", entity: "event", entityId: eventId, after: resultado, comment }),
      notifications: notif(state, { kind: "informativa", destinatarioRol: Role.ForPlus, titulo: label, descripcion: `Se registró el cierre de “${ev.nombre}”.`, requiereAccion: false, rel: eventId }),
    })
    return true
  },
  closeEvent(eventId: string, actor: string, comment?: string) {
    return A.registerEventClosure(eventId, actor, "satisfactorio", comment)
  },
  cancelEvent(id: string, actor: string, observacion: string) {
    const ev = state.events.find((e) => e.id === id)
    if (!ev || !observacion.trim()) return
    const traza = [...ev.traza, { actor: USERS[actor]?.nombre || actor, ts: nowISO(), from: ev.estado, to: "cancelado", comentario: observacion }]
    commit({ ...state, events: state.events.map(e=>e.id===id?{...e,estado:"cancelado",updatedAt:nowISO(),traza}:e), audit:audit(state,{actor,action:"event.cancel",entity:"event",entityId:id,after:"cancelado",comment:observacion}), notifications:notif(state,{kind:"informativa",destinatarioRol:Role.Colaborador,titulo:"Evento cancelado",descripcion:`“${ev.nombre}” fue cancelado. Motivo: ${observacion}`,requiereAccion:false,rel:id}) })
  },
  reset() {
    commit(seed())
  },
}

/* ============================================================================
 * SELECTORES
 * ========================================================================== */
export const sel = {
  events: (s: GcoState) => s.events,
  user: (s: GcoState): User => USERS[s.session.userId],
  role: (s: GcoState): Role => s.session.role,
  eventsToReview: (s: GcoState) =>
    s.events.filter((e) => ["en_revision"].includes(e.estado)),
  kpis: (s: GcoState) => ({
    registrados: s.events.length,
    porRevisar: s.events.filter((e) => ["en_revision"].includes(e.estado)).length,
    priorizacion: s.events.filter((e) => false).length,
    aprobados: s.events.filter((e) => e.estado === "aprobado").length,
    cruces: s.events.filter((e) => e.cruce).length,
    cierre: s.events.filter((e) => e.estado === "pendiente_cierre").length,
    solicitudes: s.accessRequests.filter((r) => ["enviada", "revision"].includes(r.estado)).length,
    notifFallidas: s.notifications.filter((n) => n.fallida).length,
    periodos: Object.values(s.periodosConfig).filter(Boolean).length,
    proximos: s.events.filter((e) => ["publicado", "aprobado"].includes(e.estado)).length,
  }),
  /**
   * Panel de gobierno For+ — TODOS los valores derivan del estado global y de
   * los repositorios de dominio (capacidad, agenda, ANS). El componente no
   * escribe números: solo consume este objeto.
   */
  governance: (s: GcoState) => {
    const evs = s.events
    const active = (e: GcoEvent) => ["en_revision"].includes(e.estado)
    const towardPublish = (e: GcoEvent) => ["aprobado", "publicado"].includes(e.estado)
    const periodo = s.session.periodo

    const indicadores = {
      registrados: evs.length,
      porRevisar: evs.filter((e) => ["en_revision"].includes(e.estado)).length,
      priorizacion: evs.filter((e) => false).length,
      aprobados: evs.filter((e) => e.estado === "aprobado").length,
      cruces: evs.filter((e) => e.cruce).length,
      cierre: evs.filter((e) => e.estado === "pendiente_cierre").length,
    }

    const cap = CAPACITY_SNAPSHOT
    const areaTop = cap.areas[0]
    const capacidad = {
      icod: cap.icod,
      colaboradores: cap.colaboradores,
      horasMes: cap.horasMes,
      comprometidas: cap.horasComprometidas,
      disponibles: cap.horasDisponibles,
      preventivas: cap.preventivas,
      criticas: cap.criticas,
      areaTop,
      areas: cap.areas,
    }

    const periodosSinConfigurar = PERIODOS.filter((p) => !s.periodosConfig[p]).length
    const vencidosANS = evs.filter(
      (e) => ["en_revision"].includes(e.estado) && daysBetween(TODAY, e.createdAt) > ANS_DIAS_REVISION,
    ).length

    const tareas = {
      solicitudes: s.accessRequests.filter((r) => ["enviada", "revision"].includes(r.estado)).length,
      porRevisar: indicadores.porRevisar,
      vencidosANS,
      periodosSinConfigurar,
      notifFallidas: s.notifications.filter((n) => n.fallida).length,
      cierre: indicadores.cierre,
    }

    const hitos = AGENDA_BY_PERIOD[periodo] ?? AGENDA_BY_PERIOD["Agosto 2026"]
    const agenda = {
      proximos: evs.filter((e) => ["publicado", "aprobado"].includes(e.estado)).length,
      inscripcionesAbiertas: hitos.inscripcionesAbiertas,
      fechaCorte: hitos.fechaCorte,
      sesionPriorizacion: hitos.sesionPriorizacion,
      fechaPublicacion: hitos.fechaPublicacion,
    }

    const alertas = {
      cruces: evs.filter((e) => e.cruce).length,
      sinPieza: evs.filter((e) => towardPublish(e) && !(e.model && (e.model as any).piezaEvento)).length,
      sinResponsable: evs.filter((e) => active(e) && !e.responsable?.trim()).length,
      datosIncompletos: evs.filter((e) => active(e) && e.model === null).length,
      fueraDePlazo: evs.filter((e) => e.estado !== "borrador" && daysBetween(e.createdAt, TODAY) > 0).length,
    }

    return { periodo, indicadores, capacidad, tareas, agenda, alertas }
  },
  accessByUser: (name: string) => (s: GcoState) => s.accessRequests.filter((r) => r.solicitante === name),
  accessInbox: (s: GcoState) => s.accessRequests,
  grantsByUser: (name: string) => (s: GcoState) => s.grants[name] || [],
  eventById: (id: string) => (s: GcoState) => s.events.find((e) => e.id === id),
  /**
   * Equipo del líder activo con métricas agregadas. Filtra el catálogo TEAM por
   * el nombre del usuario en sesión; si nadie reporta a esa persona (p. ej. al
   * impersonar otro rol) usa el equipo de referencia para no dejar la vista vacía.
   */
  team: (s: GcoState) => {
    const nombre = USERS[s.session.userId]?.nombre ?? ""
    const members = TEAM.filter((m) => m.lider === nombre)
    const total = members.length
    const inscripciones = members.reduce((a, m) => a + m.inscripciones, 0)
    const pendientes = members.reduce((a, m) => a + m.pendientes, 0)
    const criticos = members.filter((m) => teamRisk(m.horasMes)[0] === "critico").length
    const moderados = members.filter((m) => teamRisk(m.horasMes)[0] === "moderado").length
    const horasMes = members.reduce((a, m) => a + m.horasMes, 0)
    const asistencia = total ? Math.round(members.reduce((a, m) => a + m.asistencia, 0) / total) : 0
    const capacidadMes = total * CAPACIDAD_MENSUAL_HORAS
    const ocupacion = capacidadMes ? Math.round((horasMes / capacidadMes) * 100) : 0
    return { members, total, inscripciones, pendientes, criticos, moderados, horasMes, capacidadMes, ocupacion, asistencia }
  },
  notifsFor: (role: Role, correo?: string) => (s: GcoState) => s.notifications.filter((n) => n.destinatarioRol === role || (!!correo && n.destinatarioCorreo === correo)).sort((a,b)=>b.fecha.localeCompare(a.fecha)),
  unread: (role: Role) => (s: GcoState) => { const correo=USERS[s.session.userId]?.correo; return s.notifications.filter((n) => (n.destinatarioRol === role || (!!correo && n.destinatarioCorreo === correo)) && !n.leida).length },
  unreadFor: (role: Role, correo: string) => (s: GcoState) => s.notifications.filter((n) => !n.esPlantilla && !n.leida && (n.destinatarioRol === role || (!!correo && n.destinatarioCorreo === correo))).length,
}

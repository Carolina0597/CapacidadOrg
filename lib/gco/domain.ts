/* ============================================================================
 * GCO · DOMINIO — tipos, constantes y datos simulados (reglas maestras)
 * Fuente única de verdad del modelo. No contiene UI ni estado mutable.
 * ========================================================================== */

/* ---- Roles y permisos ---- */
export const Role = {
  Colaborador: "colaborador",
  Lider: "lider",
  AreaPromotora: "area_promotora",
  ForPlus: "for_plus",
} as const
export type Role = (typeof Role)[keyof typeof Role]

export const ROLE_LABEL: Record<Role, string> = {
  colaborador: "Colaborador",
  lider: "Líder",
  area_promotora: "Área promotora",
  for_plus: "For+ / Comité",
}

/** Bits de permiso de navegación por rol (bitmask). */
export const ROLE_BIT: Record<Role, number> = {
  colaborador: 1,
  lider: 2,
  area_promotora: 4,
  for_plus: 8,
}

export type Permission = string

/* ---- Periodos ---- */
export type Period = string
export const PERIODOS: Period[] = ["Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026"]

/* ---- Tono visual compartido ---- */
export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "green"
  | "amber"
  | "orange"
  | "red"
  | "purple"
  | "blue"

/* ---- Estados de evento ---- */
export type EventStatus =
  | "borrador"
  | "enviado"
  | "en_revision"
  | "devuelto"
  | "ajustado"
  | "pendiente_priorizacion"
  | "aprobado"
  | "aprobado_condicionado"
  | "priorizado_otro_periodo"
  | "rechazado"
  | "publicado"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "gestion_participantes"
  | "en_aprobacion"
  | "cupos_asignados"
  | "citacion_pendiente"
  | "citado"
  | "en_ejecucion"
  | "pendiente_cierre"
  | "cerrado"
  | "reprogramado"
  | "cancelado"

export const ES: Record<EventStatus, [string, Tone]> = {
  borrador: ["Borrador", "neutral"],
  enviado: ["En revisión", "info"],
  en_revision: ["En revisión", "info"],
  devuelto: ["Requiere ajustes", "amber"],
  ajustado: ["En revisión", "info"],
  pendiente_priorizacion: ["En revisión", "info"],
  aprobado: ["Aprobado", "success"],
  aprobado_condicionado: ["Aprobado", "success"],
  priorizado_otro_periodo: ["Aplazado", "purple"],
  rechazado: ["Rechazado", "red"],
  publicado: ["Aprobado · Publicado", "purple"],
  inscripciones_abiertas: ["Aprobado · En inscripción", "green"],
  inscripciones_cerradas: ["Aprobado · Inscripciones cerradas", "neutral"],
  gestion_participantes: ["Aprobado · Inscripciones cerradas", "blue"],
  en_aprobacion: ["Aprobado · Inscripciones cerradas", "amber"],
  cupos_asignados: ["Aprobado · Pendiente de ejecución", "success"],
  citacion_pendiente: ["Aprobado · Pendiente de ejecución", "orange"],
  citado: ["Aprobado · Pendiente de ejecución", "purple"],
  en_ejecucion: ["Aprobado · Pendiente de asistencia", "blue"],
  pendiente_cierre: ["Aprobado · Pendiente de cierre", "orange"],
  cerrado: ["Finalizado", "success"],
  reprogramado: ["Aplazado", "purple"],
  cancelado: ["Cancelado", "red"],
}

export type EventLifecycleKey =
  | "borrador"
  | "en_revision"
  | "requiere_ajustes"
  | "rechazado"
  | "aprobado_publicado"
  | "aprobado_en_inscripcion"
  | "aprobado_inscripciones_cerradas"
  | "aprobado_pendiente_ejecucion"
  | "aprobado_pendiente_asistencia"
  | "aprobado_pendiente_cierre"
  | "finalizado_satisfactorio"
  | "finalizado_no_satisfactorio"
  | "aplazado"
  | "cancelado"

export interface EventLifecycleView {
  key: EventLifecycleKey
  principal: string
  subestado?: string
  tone: Tone
  step: number
  nextAction: string
}

export function getEventLifecycle(event: GcoEvent, attendanceCount = 0, today = TODAY): EventLifecycleView {
  const date = event.sesiones?.map((s) => s.fecha).filter(Boolean).sort()[0] || event.fecha || ""
  const isPast = Boolean(date && date < today)
  const requiresEnrollment = Boolean((event.model as any)?.requiereInscripcion)

  if (event.estado === "borrador") return { key: "borrador", principal: "Borrador", tone: "neutral", step: 0, nextAction: "Continuar y enviar" }
  if (["enviado", "en_revision", "ajustado", "pendiente_priorizacion"].includes(event.estado)) return { key: "en_revision", principal: "En revisión", tone: "info", step: 1, nextAction: "For+ debe tomar una decisión" }
  if (event.estado === "devuelto") return { key: "requiere_ajustes", principal: "Requiere ajustes", tone: "amber", step: 1, nextAction: "Ver observaciones, ajustar y reenviar" }
  if (event.estado === "rechazado") return { key: "rechazado", principal: "Rechazado", tone: "red", step: 1, nextAction: "Ver observaciones y crear una nueva propuesta" }
  if (["priorizado_otro_periodo", "reprogramado"].includes(event.estado) || event.cierre?.resultado === "aplazado_comite") return { key: "aplazado", principal: "Aplazado", tone: "purple", step: 2, nextAction: "Confirmar nueva fecha o periodo" }
  if (event.estado === "cancelado") return { key: "cancelado", principal: "Cancelado", tone: "red", step: 2, nextAction: "Consultar motivo" }
  if (event.cierre) {
    const ok = event.cierre.resultado === "satisfactorio"
    return { key: ok ? "finalizado_satisfactorio" : "finalizado_no_satisfactorio", principal: "Finalizado", subestado: ok ? "Satisfactorio" : "No satisfactorio", tone: ok ? "success" : "orange", step: 6, nextAction: "Consultar cierre" }
  }
  if (event.estado === "cerrado") return { key: "finalizado_satisfactorio", principal: "Finalizado", subestado: "Satisfactorio", tone: "success", step: 6, nextAction: "Consultar cierre" }
  if (isPast && attendanceCount <= 0) return { key: "aprobado_pendiente_asistencia", principal: "Aprobado", subestado: "Pendiente de confirmación de asistencia", tone: "orange", step: 5, nextAction: "Cargar confirmación de asistencia" }
  if (isPast && attendanceCount > 0) return { key: "aprobado_pendiente_cierre", principal: "Aprobado", subestado: "Pendiente de cierre", tone: "orange", step: 5, nextAction: "Registrar resultado de cierre" }
  if (["en_ejecucion", "pendiente_cierre"].includes(event.estado)) return attendanceCount > 0
    ? { key: "aprobado_pendiente_cierre", principal: "Aprobado", subestado: "Pendiente de cierre", tone: "orange", step: 5, nextAction: "Registrar resultado de cierre" }
    : { key: "aprobado_pendiente_asistencia", principal: "Aprobado", subestado: "Pendiente de confirmación de asistencia", tone: "orange", step: 5, nextAction: "Cargar confirmación de asistencia" }
  if (["cupos_asignados", "citacion_pendiente", "citado"].includes(event.estado)) return { key: "aprobado_pendiente_ejecucion", principal: "Aprobado", subestado: "Pendiente de ejecución", tone: "blue", step: 4, nextAction: "Esperar la fecha de ejecución" }
  if (["inscripciones_cerradas", "gestion_participantes", "en_aprobacion"].includes(event.estado)) return { key: "aprobado_inscripciones_cerradas", principal: "Aprobado", subestado: "Inscripciones cerradas", tone: "amber", step: 3, nextAction: "Gestionar participantes y cupos" }
  if (event.estado === "inscripciones_abiertas") return { key: "aprobado_en_inscripcion", principal: "Aprobado", subestado: "En inscripción", tone: "green", step: 3, nextAction: "Gestionar inscripciones" }
  if (event.estado === "publicado" && requiresEnrollment) return { key: "aprobado_en_inscripcion", principal: "Aprobado", subestado: "En inscripción", tone: "green", step: 3, nextAction: "Abrir o gestionar inscripciones" }
  if (["aprobado", "aprobado_condicionado", "publicado"].includes(event.estado)) return { key: "aprobado_publicado", principal: "Aprobado", subestado: requiresEnrollment ? "Publicado" : "Pendiente de ejecución", tone: "success", step: requiresEnrollment ? 2 : 4, nextAction: requiresEnrollment ? "Publicar y abrir inscripciones" : "Preparar citación" }
  return { key: "en_revision", principal: "En revisión", tone: "info", step: 1, nextAction: "Revisar evento" }
}

/* ---- Estados de solicitud de acceso ---- */
export type AccessStatus =
  | "borrador"
  | "enviada"
  | "revision"
  | "devuelta"
  | "aprobada"
  | "rechazada"
  | "vencida"

export const AS: Record<AccessStatus, [string, Tone]> = {
  borrador: ["Borrador", "neutral"],
  enviada: ["Enviada", "info"],
  revision: ["En revisión", "info"],
  devuelta: ["Devuelta", "amber"],
  aprobada: ["Aprobada", "success"],
  rechazada: ["Rechazada", "red"],
  vencida: ["Vencida", "red"],
}

/* ---- Tipos de actividad y prioridad sugerida ---- */
export type ActivityType =
  | "normativa"
  | "voluntaria"
  | "corporativa"
  | "experiencia"
  | "sensibilizacion"
  | "asesoria"
  | "otras"

export const ACT: Record<ActivityType, [string, string]> = {
  normativa: ["Formación normativa", "Alta"],
  voluntaria: ["Formación voluntaria", "Baja"],
  corporativa: ["Formación corporativa", "Media-Alta"],
  experiencia: ["Experiencia", "Media"],
  sensibilizacion: ["Sensibilización", "Media"],
  asesoria: ["Asesoría", "Baja"],
  otras: ["Otras", "Media"],
}

/* ---- Estructura de sesiones de un evento ---- */
export type EventStructure =
  | "sesion_unica"
  | "programa_secuencial"
  | "grupos_equivalentes"
  | "sesiones_independientes"

/* ============================================================================
 * ENTIDADES
 * ========================================================================== */
export interface User {
  id: string
  nombre: string
  corto: string
  ini: string
  correo: string
  cargo: string
  area: string
  vp: string
  lider: string
  roles: Role[]
  permisos: Permission[]
  foto?: string
}

export interface EventSession {
  nombre: string
  fecha: string
  ini: string
  fin: string
  horaInicio?: string
  horaFin?: string
  modalidad?: string
  lugar?: string
  responsable?: string
  cupos?: string
  publico?: string
  enlace?: string
  estado?: string
}

export interface TraceEntry {
  actor: string
  ts: string
  from: string | null
  to: string
  comentario: string
}

/**
 * Decisión de gobierno del evento (For+). Se llena al aprobar, aprobar con
 * condiciones o priorizar. Es la fuente que consume la pestaña "Revisión For+".
 */
export interface EventReview {
  revisor?: string
  decidedAt?: string
  decision?: string
  /* Ventanas de ejecución (al aprobar) */
  periodoEjecucion?: string
  mesAno?: string
  fechaConfirmada?: string
  fechaPublicacion?: string
  aperturaInscripcion?: string
  cierreInscripcion?: string
  limiteCupos?: string
  limiteCitacion?: string
  limiteCierre?: string
  observaciones?: string
  /* Aprobación con condiciones */
  condiciones?: string
  condResponsable?: string
  condFechaLimite?: string
  condRequiereRevision?: boolean
  /* Priorización para otro periodo */
  periodoDestino?: string
  motivoPriorizacion?: string
  fechaEstimada?: string
  observacionPriorizacion?: string
}

export type EventPriority = "Alta" | "Media-Alta" | "Media" | "Baja" | ""

export type EventClosureResult = "satisfactorio" | "no_satisfactorio" | "rechazado_comite" | "aplazado_comite"

export interface EventClosure {
  resultado: EventClosureResult
  comentario?: string
  asistentesCargados: boolean
  registradoPor: string
  registradoAt: string
}

export interface GcoEvent {
  id: string
  nombre: string
  area: string
  tipo: ActivityType | ""
  estado: EventStatus
  cruce: boolean
  periodo: Period
  responsable: string
  createdBy: string
  createdAt: string
  updatedAt: string
  fecha: string
  sesiones: EventSession[]
  /** Prioridad sugerida/asignada (deriva del tipo pero puede editarse en revisión). */
  prioridad?: EventPriority
  /** Contadores de participación (para columnas de bandeja). */
  publicoObjetivo?: number
  cupos?: number
  inscritos?: number
  aprobados?: number
  citados?: number
  /** Decisión de gobierno For+. */
  review?: EventReview
  /** Resultado final reportado por el dueño del evento. */
  cierre?: EventClosure
  /** Modelo completo del formulario cuando el evento fue creado desde la app. */
  model: Record<string, unknown> | null
  traza: TraceEntry[]
}

export interface AccessRequest {
  id: string
  solicitante: string
  /* Datos automáticos del perfil (se copian al crear para trazabilidad) */
  correo?: string
  cargo?: string
  area?: string
  vp?: string
  comunidad: string
  tipos: string[]
  /** Permisos solicitados (códigos de REQ_ROLES). */
  roles: string[]
  estado: AccessStatus
  responsable: string
  fechaInicio: string
  /** Fecha final o vigencia (texto libre: fecha o "Indefinida"). */
  vigencia: string
  justificacion: string
  observaciones: string
  /** Observaciones adicionales del solicitante. */
  observacionesSolicitante?: string
  adjuntos?: string[]
  /** Definidos por For+ al aprobar. */
  permisosFinales?: string[]
  vigenciaFinal?: string
  updatedAt?: string
  createdAt: string
  traza: TraceEntry[]
}

/** Permiso vigente concedido a un usuario tras aprobar una solicitud. */
export interface Grant {
  reqId: string
  comunidad: string
  permisos: string[]
  vigencia: string
  ts: string
}

export type EnrollmentApprovalState = "no_requiere" | "pendiente" | "aprobada" | "rechazada"
export type EnrollmentStatus = "inscrito" | "cancelado" | "lista_espera" | "confirmado" | "rechazado"
export type SeatStatus = "sin_asignar" | "aprobado" | "lista_espera" | "rechazado" | "liberado"
export type CitationStatus = "pendiente" | "programada" | "enviada" | "parcial" | "error" | "cancelada"
export type AttendanceStatus = "pendiente" | "asistio" | "no_asistio" | "parcial" | "excusado" | "cancelo_previamente"

export interface Attachment {
  id: string
  nombre: string
  tipo: string
  tamano: number
  urlTemporal?: string
  fechaCarga: string
  cargadoPor: string
  estadoValidacion: "pendiente" | "valido" | "rechazado"
}

export interface Enrollment {
  id: string
  eventId: string
  userId: string
  sessionIds: string[]
  createdAt: string
  fechaInscripcion: string
  estadoInscripcion: EnrollmentStatus
  motivoInteres?: string
  comentariosNecesidades?: string
  confirmaDisponibilidad: boolean
  aceptaPoliticaCancelacion: boolean
  aceptaNoGarantiaCupo: boolean
  capacidadAntes: number
  capacidadProyectada: number
  cruceDetectado: boolean
  approvalState: EnrollmentApprovalState
  estadoCupo: SeatStatus
  posicionListaEspera?: number
  motivoRechazo?: string
  fechaCancelacion?: string
  motivoCancelacion?: string
  liderNotificado: boolean
  fechaNotificacionLider?: string
  estadoCitacion: CitationStatus
  estadoAsistencia: AttendanceStatus
}

export type Approver = "lider_directo" | "aprobador_especifico" | "varios" | "lider_mas_adicional"
export interface ApprovalResponse {
  approver: string
  decision: "aprobada" | "rechazada" | "reprogramada"
  ts: string
  observacion?: string
  nuevaFecha?: string
  nuevaHora?: string
}
export interface ApprovalRequest {
  id: string
  eventId: string
  enrollmentIds: string[]
  userIds: string[]
  approverType: Approver
  approvers: string[]
  correosAprobadores: string[]
  regla: "cualquiera" | "todos"
  fechaLimite: string
  instrucciones: string
  observacionObligatoriaAprobar: boolean
  recordatorios: boolean
  frecuenciaRecordatorio?: string
  maxRecordatorios?: number
  numeroRecordatorios: number
  fechaUltimoRecordatorio?: string
  escalado: boolean
  aprobadorAlterno?: string
  comportamientoAlVencer: "rechazar" | "escalar" | "mantener_pendiente"
  estado: "pendiente" | "aprobada" | "rechazada" | "vencida" | "reasignada"
  respuestas: ApprovalResponse[]
  createdBy: string
  createdAt: string
  fechaRespuesta?: string
}

export interface Citation {
  id: string; eventId: string; sessionId: string; enrollmentId: string; userId: string
  organizerId: string; tipo: "manual" | "automatica"; estado: CitationStatus
  fechaProgramada?: string; fechaEnviada?: string; asunto: string; cuerpo: string
  link?: string; location?: string; error?: string; respuestaCalendario?: "aceptada" | "rechazada" | "tentativa"
}
export interface Attendance {
  id: string; eventId: string; sessionId: string; userId: string; estado: AttendanceStatus
  minutosAsistidos: number; justificacion?: string; evidencia?: string; fuente: "manual" | "excel" | "teams" | "qr"
  fechaRegistro: string; registradoPor: string
}
export interface SatisfactionResponse {
  id: string; eventId: string; userId: string; satisfaccionGeneral: number; pertinencia: number
  aplicabilidad: number; facilitador: number; organizacion: number; duracion: number; recomendacion: number
  comentario?: string; cumplimientoObjetivo: number; fechaRespuesta: string
}
export interface TacticalValidation {
  id: string; eventId: string; enrollmentId: string; userId: string; grupoOperativo?: string
  responsableId: string; estado: "pendiente" | "autorizada" | "no_autorizada"; fechaSolicitud: string
  fechaLimite?: string; fechaRespuesta?: string; observacion?: string
}
export interface Publication {
  id: string; eventId: string; canal: string; piezaId?: string; estado: "borrador" | "programada" | "publicada" | "pausada"
  fechaPrevista?: string; fechaReal?: string; responsableId: string; observaciones?: string
}
export interface CapacityStandard {
  id: string; nombre: string; horasAnuales: number; horasMensuales: number; poblacionAplicable: string
  umbralSaludable: number; umbralPreventivo: number; umbralAltaSaturacion: number; umbralSobreCapacidad: number
  vigenciaInicio: string; vigenciaFin?: string
}
export interface PeriodConfiguration {
  id: string; nombre: string; mes: number; ano: number; fechaLimiteRegistro: string; fechaRevisionForPlus: string
  fechaPublicacion: string; fechaAperturaInscripcion: string; fechaCierreInscripcion: string; fechaLimiteCupos: string
  fechaLimiteCitacion: string; fechaLimiteCierre: string; estado: "borrador" | "activo" | "cerrado"
}

export type NotificationKind = "evento_recibido" | "recordatorio" | "informativa" | "aprobacion"

export interface Notification {
  id: string
  kind: NotificationKind
  destinatarioRol: Role
  destinatarioCorreo?: string
  remitente?: string
  asunto?: string
  activador?: string
  titulo: string
  descripcion: string
  requiereAccion: boolean
  fallida: boolean
  leida: boolean
  fecha: string
  rel?: string
  preheader?: string
  cuerpo?: string
  ctaLabel?: string
  esPlantilla?: boolean
}

export interface AuditEntry {
  id: string
  ts: string
  actor: string
  action: string
  entity: string
  entityId: string
  after?: string
  comment?: string
}

export interface Session {
  userId: string
  role: Role
  periodo: Period
  menuCollapsed: boolean
  booted: boolean
}

export interface GcoState {
  version: number
  session: Session
  events: GcoEvent[]
  accessRequests: AccessRequest[]
  enrollments: Enrollment[]
  approvals: ApprovalRequest[]
  citations: Citation[]
  attendance: Attendance[]
  satisfaction: SatisfactionResponse[]
  tacticalValidations: TacticalValidation[]
  publications: Publication[]
  capacityStandards: CapacityStandard[]
  periodConfigurations: PeriodConfiguration[]
  notifications: Notification[]
  audit: AuditEntry[]
  periodosConfig: Record<string, boolean>
  /** Permisos vigentes por nombre de solicitante (persisten al recargar). */
  grants: Record<string, Grant[]>
}

/* ============================================================================
 * CATÁLOGOS SIMULADOS
 * ========================================================================== */
export const USERS: Record<string, User> = {
  daniel: {
    id: "daniel",
    nombre: "Daniel Marín",
    corto: "Daniel",
    ini: "DM",
    correo: "daniel.marin@sistecredito.com",
    cargo: "Analista de Operaciones",
    area: "Contact Center",
    vp: "Vicepresidencia de Operaciones",
    lider: "Alejandro Gómez",
    roles: [Role.Colaborador],
    permisos: ["Ver calendario", "Inscribirme a eventos", "Consultar mi capacidad"],
    foto: "/placeholder-user.jpg",
  },
  laura: {
    id: "laura",
    nombre: "Laura Roldán",
    corto: "Laura",
    ini: "LR",
    correo: "laura.roldan@sistecredito.com",
    cargo: "Analista de Riesgos",
    area: "Riesgos de Crédito",
    vp: "Vicepresidencia de Riesgos",
    lider: "Alejandro Gómez",
    roles: [Role.Colaborador, Role.Lider],
    permisos: ["Ver calendario", "Ver mi equipo", "Consultar capacidad del equipo"],
    foto: "/placeholder-user.jpg",
  },
  alejandro: {
    id: "alejandro",
    nombre: "Alejandro Gómez",
    corto: "Alejandro",
    ini: "AG",
    correo: "alejandro.gomez@sistecredito.com",
    cargo: "Líder de Calidad y Automatización",
    area: "Tecnología",
    vp: "Vicepresidencia de Tecnología",
    lider: "Carolina Restrepo",
    roles: [Role.Colaborador, Role.Lider],
    permisos: ["Ver calendario", "Ver mi equipo", "Responder aprobaciones", "Consultar capacidad del equipo"],
    foto: "/placeholder-user.jpg",
  },
  sandra: { id:"sandra", nombre:"Sandra Roldán", corto:"Sandra", ini:"SR", correo:"sandra.roldan@sistecredito.com", cargo:"Coordinadora de Operaciones", area:"Operaciones", vp:"Vicepresidencia de Operaciones", lider:"Alejandro Gómez", roles:[Role.Colaborador], permisos:["Ver calendario","Inscribirme a eventos"], foto:"/placeholder-user.jpg" },
  mario: { id:"mario", nombre:"Mario Franco", corto:"Mario", ini:"MF", correo:"mario.franco@sistecredito.com", cargo:"Especialista de Riesgos", area:"Riesgos de Crédito", vp:"Vicepresidencia de Riesgos", lider:"Alejandro Gómez", roles:[Role.Colaborador], permisos:["Ver calendario","Inscribirme a eventos"], foto:"/placeholder-user.jpg" },
  juliana: { id:"juliana", nombre:"Juliana González", corto:"Juliana", ini:"JG", correo:"juliana.gonzalez@sistecredito.com", cargo:"Analista Senior", area:"Tecnología", vp:"Vicepresidencia de Tecnología", lider:"Alejandro Gómez", roles:[Role.Colaborador], permisos:["Ver calendario","Inscribirme a eventos"], foto:"/placeholder-user.jpg" },

  carolina: {
    id: "carolina",
    nombre: "Carolina Restrepo",
    corto: "Carolina",
    ini: "CR",
    correo: "carolina.restrepo@sistecredito.com",
    cargo: "Analista de Transformación",
    area: "For+ / Formación",
    vp: "Vicepresidencia de Talento Humano y Corporativa",
    lider: "Laura Roldán",
    roles: [Role.Colaborador, Role.AreaPromotora],
    permisos: ["Crear eventos", "Gestionar inscritos", "Registrar asistencia"],
    foto: "/placeholder-user.jpg",
  },
  valeria: {
    id: "valeria",
    nombre: "Valeria Torres",
    corto: "Valeria",
    ini: "VT",
    correo: "valeria.torres@sistecredito.com",
    cargo: "Analista For+",
    area: "For+ / Formación",
    vp: "Vicepresidencia de Talento Humano y Corporativa",
    lider: "Carolina Restrepo",
    roles: [Role.Colaborador, Role.ForPlus],
    permisos: ["Revisar y aprobar eventos", "Gestionar accesos", "Consultar capacidad organizacional", "Consultar analítica"],
    foto: "/placeholder-user.jpg",
  },
}

export const AREAS = [
  "For+ / Formación",
  "Bienestar",
  "Vía Jay / Agilismo",
  "Makers / Nexus",
  "GIRO / Innovación",
  "SST",
  "Sostenibilidad y RS",
  "PDP",
  "Cumplimiento",
  "Riesgos Corporativos",
  "Seguridad de la Información",
  "Analítica",
]

export const PEOPLE = [
  "Laura Roldán",
  "Carolina Restrepo",
  "Mario Franco",
  "Pamela Brand",
  "Jeison Monsalve",
  "Sandra Roldán",
  "Juliana González",
  "Nicolás Vargas",
]

/** Cargos provenientes del Directorio Activo simulado. */
export const CARGOS_DIRECTORIO = [
  "Analista",
  "Analista Senior",
  "Asesor de servicio",
  "Especialista",
  "Líder de equipo",
  "Coordinador",
  "Jefe de área",
  "Gerente",
  "Analista de Transformación",
  "Líder de Calidad y Automatización",
]

export const SPACE_TYPES = [
  "Formación normativa",
  "Formación voluntaria",
  "Formación corporativa",
  "Experiencia",
  "Sensibilización",
  "Asesoría",
]

export const COMUNIDADES = [
  "Agilismo (Vía Jay)",
  "Comunidad Nexus / Makers",
  "GIRO / Innovación",
  "Bienestar",
  "SST",
  "Sostenibilidad y RS",
  "Cumplimiento",
  "Analítica",
  "Otra (especificar)",
]

export const REQ_ROLES: [string, string][] = [
  ["crear", "Crear eventos"],
  ["inscritos", "Gestionar inscritos"],
  ["cupos", "Aprobar cupos"],
  ["asistencia", "Registrar asistencia"],
  ["analitica", "Consultar analítica"],
]

/** Eventos existentes usados para detectar cruces al programar. */
export const EXISTING_CROSS = [
  { name: "Café con los que saben", fecha: "2026-08-14", ini: "09:00", fin: "11:00" },
]

/* ---- Capacidad (Ley 1857 de 2017 / Decreto 1072 de 2015) ---- */
export const CAPACIDAD_ANUAL_HORAS = 240
export const CAPACIDAD_MENSUAL_HORAS = 20

/**
 * Fecha de referencia de la simulación ("hoy"). Se usa como reloj determinista
 * para cálculos de ANS y vencimientos, evitando dependencias de Date.now() en
 * render (que romperían la hidratación).
 */
export const TODAY = "2026-07-21"

/** Días de ANS para revisión de un evento enviado antes de considerarse vencido. */
export const ANS_DIAS_REVISION = 3

/** Diferencia en días entre dos fechas ISO (a - b). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO.slice(0, 10)).getTime()
  const b = new Date(bISO.slice(0, 10)).getTime()
  return Math.round((a - b) / 86400000)
}

/* ============================================================================
 * REPOSITORIO · CAPACIDAD ORGANIZACIONAL (Mapa de saturación consolidado)
 * Fuente de los indicadores de capacidad mostrados en el panel de gobierno.
 * ========================================================================== */
export interface AreaSaturacion {
  area: string
  vp: string
  pct: number
}

export interface CapacitySnapshot {
  colaboradores: number
  horasMes: number
  horasComprometidas: number
  horasDisponibles: number
  /** Índice de Capacidad Organizacional Disponible (ocupación %). */
  icod: number
  /** Colaboradores en riesgo moderado/alto (preventivos). */
  preventivas: number
  /** Colaboradores sobre capacidad (críticos). */
  criticas: number
  /** Ranking de áreas por nivel de ocupación (desc). */
  areas: AreaSaturacion[]
}

export const CAPACITY_SNAPSHOT: CapacitySnapshot = {
  colaboradores: 1235,
  horasMes: 20000,
  horasComprometidas: 17250,
  horasDisponibles: 2750,
  icod: 86,
  preventivas: 182,
  criticas: 32,
  areas: [
    { area: "Riesgos de Crédito", vp: "Vicepresidencia de Riesgos", pct: 118 },
    { area: "Cobranza", vp: "Vicepresidencia Comercial", pct: 108 },
    { area: "Tecnología · Desarrollo", vp: "Vicepresidencia de Tecnología", pct: 102 },
    { area: "Operaciones", vp: "Vicepresidencia de Operaciones", pct: 89 },
    { area: "Servicio al Cliente", vp: "Vicepresidencia de Operaciones", pct: 85 },
  ],
}

/* ============================================================================
 * REPOSITORIO · AGENDA DEL PERIODO (hitos de planeación For+)
 * ========================================================================== */
export interface AgendaHitos {
  fechaCorte: string
  sesionPriorizacion: string
  fechaPublicacion: string
  inscripcionesAbiertas: number
}

export const AGENDA_BY_PERIOD: Record<Period, AgendaHitos> = {
  "Julio 2026": {
    fechaCorte: "30 jun 2026",
    sesionPriorizacion: "Jue 26 jun · 3:00 p. m.",
    fechaPublicacion: "5 jul 2026",
    inscripcionesAbiertas: 4,
  },
  "Agosto 2026": {
    fechaCorte: "30 jul 2026",
    sesionPriorizacion: "Jue 24 jul · 3:00 p. m.",
    fechaPublicacion: "5 ago 2026",
    inscripcionesAbiertas: 6,
  },
  "Septiembre 2026": {
    fechaCorte: "29 ago 2026",
    sesionPriorizacion: "Jue 27 ago · 3:00 p. m.",
    fechaPublicacion: "4 sep 2026",
    inscripcionesAbiertas: 0,
  },
  "Octubre 2026": {
    fechaCorte: "29 sep 2026",
    sesionPriorizacion: "Jue 24 sep · 3:00 p. m.",
    fechaPublicacion: "5 oct 2026",
    inscripcionesAbiertas: 0,
  },
}

/* ============================================================================
 * REPOSITORIO · EQUIPO DEL LÍDER
 * Colaboradores a cargo de un líder, con su capacidad (Ley 1857 de 2017) y su
 * participación en la agenda del periodo. Alimenta el Home del Líder y la
 * pantalla "Mi equipo". El líder no crea eventos: acompaña, aprueba cupos de
 * su gente y vigila que nadie se sature.
 * ========================================================================== */
export type TeamRisk = "saludable" | "moderado" | "critico"

export interface TeamMember {
  id: string
  nombre: string
  ini: string
  cargo: string
  /** Líder directo (para filtrar el equipo por líder activo). */
  lider: string
  /** Horas de formación comprometidas en el mes en curso. */
  horasMes: number
  /** Inscripciones activas del colaborador en el periodo. */
  inscripciones: number
  /** Inscripciones de este colaborador pendientes de aprobación del líder. */
  pendientes: number
  /** Asistencia histórica a eventos (%). */
  asistencia: number
}

/** Equipo simulado del líder de demostración Alejandro Gómez. */
export const TEAM: TeamMember[] = [
  { id: "tm-laura", nombre: "Laura Roldán", ini: "LR", cargo: "Analista de Riesgos", lider: "Alejandro Gómez", horasMes: 18, inscripciones: 2, pendientes: 1, asistencia: 90 },
  { id: "tm-daniel", nombre: "Daniel Marín", ini: "DM", cargo: "Analista de Operaciones", lider: "Alejandro Gómez", horasMes: 10, inscripciones: 3, pendientes: 1, asistencia: 92 },
  { id: "tm-sandra", nombre: "Sandra Roldán", ini: "SR", cargo: "Coordinadora de Operaciones", lider: "Alejandro Gómez", horasMes: 13, inscripciones: 2, pendientes: 0, asistencia: 88 },
  { id: "tm-mario", nombre: "Mario Franco", ini: "MF", cargo: "Especialista de Riesgos", lider: "Alejandro Gómez", horasMes: 16, inscripciones: 2, pendientes: 0, asistencia: 81 },
  { id: "tm-juliana", nombre: "Juliana González", ini: "JG", cargo: "Analista Senior", lider: "Alejandro Gómez", horasMes: 11, inscripciones: 2, pendientes: 1, asistencia: 95 },
]

/** Nivel de riesgo por saturación mensual (relativo al tope de Ley 1857). */
export function teamRisk(horasMes: number): [TeamRisk, Tone] {
  if (horasMes > CAPACIDAD_MENSUAL_HORAS) return ["critico", "red"]
  if (horasMes >= CAPACIDAD_MENSUAL_HORAS * 0.75) return ["moderado", "amber"]
  return ["saludable", "green"]
}

export const TEAM_RISK_LABEL: Record<TeamRisk, string> = {
  saludable: "Saludable",
  moderado: "Riesgo moderado",
  critico: "Sobre capacidad",
}

/* ============================================================================
 * UTILIDADES DE ID / TIEMPO
 * ========================================================================== */
let _seq = 0
export const nowISO = () => new Date().toISOString()
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(_seq++).toString(36)}`

/* ============================================================================
 * SEED — estado inicial simulado
 * ========================================================================== */
export const SCHEMA = 12

function ev(
  id: string,
  nombre: string,
  area: string,
  tipo: ActivityType | "",
  estado: EventStatus,
  cruce: boolean,
  extra?: Partial<GcoEvent>,
): GcoEvent {
  const prioridad = (tipo ? (ACT[tipo][1] as EventPriority) : "") as EventPriority
  return {
    id,
    nombre,
    area,
    tipo,
    estado,
    cruce: !!cruce,
    periodo: "Agosto 2026",
    responsable: "Laura Roldán",
    createdBy: "carolina",
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-07-15T10:00:00Z",
    fecha: "2026-08-20",
    sesiones: [],
    prioridad,
    publicoObjetivo: 120,
    cupos: 40,
    inscritos: 0,
    aprobados: 0,
    citados: 0,
    model: null,
    traza: [
      { actor: "Sistema", ts: "2026-07-15T10:00:00Z", from: null, to: estado, comentario: "Semilla" },
    ],
    ...extra,
  }
}

function ar(
  id: string,
  solicitante: string,
  comunidad: string,
  roles: string[],
  estado: AccessStatus,
  responsable: string,
  fechaInicio: string,
  vigencia: string,
  obs?: string,
): AccessRequest {
  const tz: TraceEntry[] = [
    { actor: solicitante, ts: fechaInicio + "T09:00:00Z", from: null, to: "enviada", comentario: "Envío a For+" },
  ]
  if (estado !== "enviada") {
    tz.push({
      actor: "For+",
      ts: fechaInicio + "T15:00:00Z",
      from: "enviada",
      to: estado,
      comentario: obs || `Estado: ${estado}`,
    })
  }
  return {
    id,
    solicitante,
    correo: "daniel.marin@sistecredito.com",
    cargo: "Analista de Operaciones",
    area: "Contact Center",
    vp: "Vicepresidencia de Operaciones",
    comunidad,
    tipos: ["Formación voluntaria"],
    roles,
    estado,
    responsable,
    fechaInicio,
    vigencia,
    justificacion: "Gestionar espacios de la comunidad.",
    observaciones: obs || "",
    permisosFinales: estado === "aprobada" ? roles : undefined,
    vigenciaFinal: estado === "aprobada" ? vigencia : undefined,
    updatedAt: fechaInicio + "T15:00:00Z",
    createdAt: fechaInicio + "T09:00:00Z",
    traza: tz,
  }
}

function no(
  kind: NotificationKind,
  rol: Role,
  titulo: string,
  descripcion: string,
  req: boolean,
  fallida: boolean,
  rel?: string,
): Notification {
  return {
    id: uid("N"),
    kind,
    destinatarioRol: rol,
    titulo,
    descripcion,
    requiereAccion: req,
    fallida: !!fallida,
    leida: false,
    fecha: nowISO(),
    rel,
  }
}

export function seed(): GcoState {
  return {
    version: SCHEMA,
    session: { userId: "valeria", role: Role.ForPlus, periodo: "Agosto 2026", menuCollapsed: false, booted: false },
    events: [
      ev("EVT-2026-0142", "Café con los que saben — Agosto", "For+ / Formación", "voluntaria", "inscripciones_abiertas", false, { fecha: "2026-08-06", model: { obligatorio: false, objetivo: "Compartir conocimiento práctico entre equipos.", descripcion: "Espacio voluntario para compartir conocimientos prácticos.", piezaEvento: { id:"PIE-142", nombre:"cafe-con-los-que-saben.jpg", tipo:"image/jpeg", tamano:245000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0148", "Reinducción SG-SST", "SST", "normativa", "inscripciones_abiertas", false, { createdBy:"valeria", fecha: "2026-08-10", model: { obligatorio: true, objetivo: "Actualizar conocimientos obligatorios de SG-SST.", descripcion: "Reinducción obligatoria en seguridad y salud en el trabajo.", piezaEvento: { id:"PIE-148", nombre:"reinduccion-sst.jpg", tipo:"image/jpeg", tamano:230000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0155", "Diplomado en Liderazgo", "For+ / Formación", "corporativa", "publicado", false, { createdBy:"valeria", fecha: "2026-08-13", model: { obligatorio: true, invitadosIds:["daniel","alejandro"], invitadosCorreos:["daniel.marin@sistecredito.com","alejandro.gomez@sistecredito.com"], objetivo: "Fortalecer habilidades de liderazgo.", descripcion: "Programa corporativo para fortalecer habilidades de liderazgo.", piezaEvento: { id:"PIE-155", nombre:"liderazgo.jpg", tipo:"image/jpeg", tamano:260000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0160", "Asesoría financiera personal", "Bienestar", "asesoria", "inscripciones_abiertas", false, { createdBy:"valeria", fecha: "2026-08-18", model: { obligatorio: false, objetivo: "Brindar herramientas para decisiones financieras saludables.", descripcion: "Asesoría con aliado experto en finanzas personales.", piezaEvento: { id:"PIE-160", nombre:"finanzas.jpg", tipo:"image/jpeg", tamano:210000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0161", "Experiencia de innovación", "GIRO / Innovación", "experiencia", "inscripciones_abiertas", false, { createdBy:"valeria", fecha: "2026-08-20", model: { obligatorio: false, objetivo: "Promover creatividad e innovación colaborativa.", descripcion: "Experiencia participativa de innovación y creatividad.", piezaEvento: { id:"PIE-161", nombre:"innovacion.jpg", tipo:"image/jpeg", tamano:220000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0139", "Jornada de bienestar julio", "Bienestar", "experiencia", "pendiente_cierre", false, { fecha: "2026-07-10", periodo: "Julio 2026" }),
      ev("EVT-2026-0132", "Sensibilización inclusión", "Sostenibilidad y RS", "sensibilizacion", "inscripciones_abiertas", false, { createdBy:"valeria", fecha: "2026-08-24", model: { obligatorio: false, objetivo: "Fortalecer prácticas de inclusión y respeto.", descripcion: "Sensibilización sobre inclusión y respeto en el entorno laboral.", piezaEvento: { id:"PIE-132", nombre:"inclusion.jpg", tipo:"image/jpeg", tamano:205000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0170", "Otra actividad: Feria de comunidades", "Vía Jay / Agilismo", "otras", "inscripciones_abiertas", false, { createdBy:"valeria", fecha: "2026-08-27", model: { obligatorio: false, tipoOtro: "Feria de comunidades", objetivo: "Conectar comunidades internas y compartir iniciativas.", descripcion: "Encuentro abierto de comunidades internas.", piezaEvento: { id:"PIE-170", nombre:"feria-comunidades.jpg", tipo:"image/jpeg", tamano:240000, urlTemporal:"/placeholder.jpg", fechaCarga:"2026-07-15", cargadoPor:"carolina", estadoValidacion:"valido" } } }),
      ev("EVT-2026-0171", "Taller crítico de riesgos", "Riesgos Corporativos", "corporativa", "en_revision", true),
      ev("EVT-2026-0172", "Taller de servicio al cliente", "Operaciones", "voluntaria", "inscripciones_cerradas", false, { fecha:"2026-08-22", model:{ obligatorio:false, objetivo:"Fortalecer habilidades de servicio.", descripcion:"Taller práctico de atención al cliente.", requiereInscripcion:true, piezaEvento:{id:"PIE-172",nombre:"servicio.jpg",tipo:"image/jpeg",tamano:180000,urlTemporal:"/placeholder.jpg",fechaCarga:"2026-07-15",cargadoPor:"carolina",estadoValidacion:"valido"}} }),
      ev("EVT-2026-0173", "Actualización de procesos", "Operaciones", "corporativa", "cupos_asignados", false, { fecha:"2026-08-28", model:{ obligatorio:true, invitadosIds:["daniel","sandra"], invitadosCorreos:["daniel.marin@sistecredito.com","sandra.roldan@sistecredito.com"], objetivo:"Actualizar procesos operativos.", descripcion:"Espacio obligatorio de actualización.", requiereInscripcion:true, piezaEvento:{id:"PIE-173",nombre:"procesos.jpg",tipo:"image/jpeg",tamano:190000,urlTemporal:"/placeholder.jpg",fechaCarga:"2026-07-15",cargadoPor:"carolina",estadoValidacion:"valido"}} }),
      ev("EVT-2026-0128", "Encuentro de cultura", "Talento Humano", "sensibilizacion", "en_ejecucion", false, { createdBy:"valeria", fecha:"2026-07-18", periodo:"Julio 2026", model:{ obligatorio:false, objetivo:"Fortalecer la cultura organizacional.", descripcion:"Encuentro de cultura.", piezaEvento:{id:"PIE-128",nombre:"cultura.jpg",tipo:"image/jpeg",tamano:190000,urlTemporal:"/placeholder.jpg",fechaCarga:"2026-06-15",cargadoPor:"carolina",estadoValidacion:"valido"}} }),
    ],
    accessRequests: [
      ar("SOL-2026-0007", "Daniel Marín", "Agilismo (Vía Jay)", ["crear", "inscritos"], "aprobada", "Mario Franco", "2026-06-18", "2026-12-31"),
      ar("SOL-2026-0011", "Daniel Marín", "Comunidad Nexus / Makers", ["crear", "inscritos", "analitica"], "revision", "Laura Roldán", "2026-07-14", "Indefinida"),
      ar("SOL-2026-0014", "Daniel Marín", "Bienestar", ["crear", "asistencia"], "devuelta", "Jeison Monsalve", "2026-07-16", "2026-10-31", "Devuelta: especifica el responsable que respalda y ajusta la vigencia."),
      ar("SOL-2026-0003", "Daniel Marín", "SST", ["crear", "inscritos", "cupos"], "vencida", "Pamela Brand", "2026-05-02", "2026-06-30"),
    ],
    enrollments: [
      { id:"INS-DEMO-1", eventId:"EVT-2026-0142", userId:"daniel", sessionIds:[], createdAt:"2026-07-20T10:00:00Z", fechaInscripcion:"2026-07-20T10:00:00Z", estadoInscripcion:"inscrito", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:8, capacidadProyectada:10, cruceDetectado:false, approvalState:"no_requiere", estadoCupo:"sin_asignar", liderNotificado:true, fechaNotificacionLider:"2026-07-20T10:00:00Z", estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-2", eventId:"EVT-2026-0142", userId:"laura", sessionIds:[], createdAt:"2026-07-20T10:05:00Z", fechaInscripcion:"2026-07-20T10:05:00Z", estadoInscripcion:"inscrito", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:16, capacidadProyectada:18, cruceDetectado:false, approvalState:"pendiente", estadoCupo:"sin_asignar", liderNotificado:true, fechaNotificacionLider:"2026-07-20T10:05:00Z", estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-3", eventId:"EVT-2026-0173", userId:"daniel", sessionIds:[], createdAt:"2026-07-19T09:00:00Z", fechaInscripcion:"2026-07-19T09:00:00Z", estadoInscripcion:"confirmado", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:8, capacidadProyectada:10, cruceDetectado:false, approvalState:"aprobada", estadoCupo:"aprobado", liderNotificado:true, fechaNotificacionLider:"2026-07-19T09:00:00Z", estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-4", eventId:"EVT-2026-0173", userId:"laura", sessionIds:[], createdAt:"2026-07-19T09:10:00Z", fechaInscripcion:"2026-07-19T09:10:00Z", estadoInscripcion:"rechazado", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:16, capacidadProyectada:18, cruceDetectado:true, approvalState:"rechazada", estadoCupo:"rechazado", motivoRechazo:"Cruce con actividad prioritaria", liderNotificado:true, fechaNotificacionLider:"2026-07-19T09:10:00Z", estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-5", eventId:"EVT-2026-0142", userId:"sandra", sessionIds:[], createdAt:"2026-07-20T10:15:00Z", fechaInscripcion:"2026-07-20T10:15:00Z", estadoInscripcion:"inscrito", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:11, capacidadProyectada:13, cruceDetectado:false, approvalState:"aprobada", estadoCupo:"aprobado", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-6", eventId:"EVT-2026-0142", userId:"mario", sessionIds:[], createdAt:"2026-07-20T10:20:00Z", fechaInscripcion:"2026-07-20T10:20:00Z", estadoInscripcion:"inscrito", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:14, capacidadProyectada:16, cruceDetectado:false, approvalState:"pendiente", estadoCupo:"pendiente", motivoRechazo:"El líder propone una nueva fecha por cierre operativo.", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-7", eventId:"EVT-2026-0142", userId:"juliana", sessionIds:[], createdAt:"2026-07-20T10:25:00Z", fechaInscripcion:"2026-07-20T10:25:00Z", estadoInscripcion:"inscrito", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:9, capacidadProyectada:11, cruceDetectado:false, approvalState:"pendiente", estadoCupo:"sin_asignar", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-8", eventId:"EVT-2026-0139", userId:"daniel", sessionIds:[], createdAt:"2026-07-05T09:00:00Z", fechaInscripcion:"2026-07-05T09:00:00Z", estadoInscripcion:"confirmado", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:8, capacidadProyectada:10, cruceDetectado:false, approvalState:"aprobada", estadoCupo:"aprobado", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-9", eventId:"EVT-2026-0139", userId:"laura", sessionIds:[], createdAt:"2026-07-05T09:05:00Z", fechaInscripcion:"2026-07-05T09:05:00Z", estadoInscripcion:"confirmado", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:12, capacidadProyectada:14, cruceDetectado:false, approvalState:"aprobada", estadoCupo:"aprobado", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" },
      { id:"INS-DEMO-10", eventId:"EVT-2026-0139", userId:"sandra", sessionIds:[], createdAt:"2026-07-05T09:10:00Z", fechaInscripcion:"2026-07-05T09:10:00Z", estadoInscripcion:"confirmado", confirmaDisponibilidad:true, aceptaPoliticaCancelacion:true, aceptaNoGarantiaCupo:true, capacidadAntes:10, capacidadProyectada:12, cruceDetectado:false, approvalState:"no_requiere", estadoCupo:"aprobado", liderNotificado:true, estadoCitacion:"pendiente", estadoAsistencia:"pendiente" }
    ],
    approvals: [
      { id:"APR-DEMO-1", eventId:"EVT-2026-0142", enrollmentIds:["INS-DEMO-2"], userIds:["laura"], approverType:"aprobador_especifico", approvers:["alejandro.gomez@sistecredito.com"], correosAprobadores:["alejandro.gomez@sistecredito.com"], regla:"todos", fechaLimite:"2026-08-01", instrucciones:"Validar capacidad y disponibilidad.", observacionObligatoriaAprobar:false, recordatorios:true, frecuenciaRecordatorio:"Diario", maxRecordatorios:3, numeroRecordatorios:0, escalado:false, comportamientoAlVencer:"escalar", estado:"pendiente", respuestas:[], createdBy:"carolina", createdAt:"2026-07-20T11:00:00Z" },
      { id:"APR-DEMO-2", eventId:"EVT-2026-0142", enrollmentIds:["INS-DEMO-5"], userIds:["sandra"], approverType:"aprobador_especifico", approvers:["alejandro.gomez@sistecredito.com"], correosAprobadores:["alejandro.gomez@sistecredito.com"], regla:"todos", fechaLimite:"2026-08-01", instrucciones:"Validar capacidad.", observacionObligatoriaAprobar:false, recordatorios:false, numeroRecordatorios:0, escalado:false, comportamientoAlVencer:"mantener_pendiente", estado:"aprobada", respuestas:[{approver:"alejandro.gomez@sistecredito.com",decision:"aprobada",ts:"2026-07-21T10:00:00Z",observacion:"Aprobado; la operación tiene cobertura."}], createdBy:"carolina", createdAt:"2026-07-20T11:05:00Z", fechaRespuesta:"2026-07-21T10:00:00Z" },
      { id:"APR-DEMO-3", eventId:"EVT-2026-0142", enrollmentIds:["INS-DEMO-6"], userIds:["mario"], approverType:"aprobador_especifico", approvers:["alejandro.gomez@sistecredito.com"], correosAprobadores:["alejandro.gomez@sistecredito.com"], regla:"todos", fechaLimite:"2026-08-01", instrucciones:"Validar capacidad.", observacionObligatoriaAprobar:false, recordatorios:false, numeroRecordatorios:0, escalado:false, comportamientoAlVencer:"mantener_pendiente", estado:"pendiente", respuestas:[{approver:"alejandro.gomez@sistecredito.com",decision:"reprogramada",ts:"2026-07-21T10:10:00Z",observacion:"No es posible en la fecha actual; propongo moverlo para garantizar cobertura operativa.",nuevaFecha:"2026-08-27",nuevaHora:"15:00"}], createdBy:"carolina", createdAt:"2026-07-20T11:10:00Z" },
      { id:"APR-DEMO-4", eventId:"EVT-2026-0142", enrollmentIds:["INS-DEMO-7"], userIds:["juliana"], approverType:"aprobador_especifico", approvers:["alejandro.gomez@sistecredito.com"], correosAprobadores:["alejandro.gomez@sistecredito.com"], regla:"todos", fechaLimite:"2026-08-01", instrucciones:"Validar capacidad.", observacionObligatoriaAprobar:false, recordatorios:true, numeroRecordatorios:1, escalado:false, comportamientoAlVencer:"escalar", estado:"pendiente", respuestas:[], createdBy:"carolina", createdAt:"2026-07-20T11:15:00Z" }
    ],
    citations: [],
    attendance: [],
    satisfaction: [],
    tacticalValidations: [],
    publications: [],
    capacityStandards: [{ id: "STD-1", nombre: "Estándar corporativo", horasAnuales: 240, horasMensuales: 20, poblacionAplicable: "Todos", umbralSaludable: 60, umbralPreventivo: 80, umbralAltaSaturacion: 100, umbralSobreCapacidad: 101, vigenciaInicio: "2026-01-01" }],
    periodConfigurations: PERIODOS.map((nombre, i) => ({ id: `PER-${i+1}`, nombre, mes: 7+i, ano: 2026, fechaLimiteRegistro: `2026-${String(6+i).padStart(2,"0")}-30`, fechaRevisionForPlus: `2026-${String(7+i).padStart(2,"0")}-02`, fechaPublicacion: `2026-${String(7+i).padStart(2,"0")}-05`, fechaAperturaInscripcion: `2026-${String(7+i).padStart(2,"0")}-05`, fechaCierreInscripcion: `2026-${String(7+i).padStart(2,"0")}-15`, fechaLimiteCupos: `2026-${String(7+i).padStart(2,"0")}-18`, fechaLimiteCitacion: `2026-${String(7+i).padStart(2,"0")}-20`, fechaLimiteCierre: `2026-${String(8+i).padStart(2,"0")}-05`, estado: i < 2 ? "activo" : "borrador" })),
    notifications: [
      { esPlantilla:true, ...no("evento_recibido", Role.ForPlus, "Evento pendiente de revisión", "El área SST envió Reinducción SG-SST para revisión.", true, false, "EVT-2026-0148"), remitente:"Gestión de Capacidad Organizacional", asunto:"Nuevo evento para revisión · Reinducción SG-SST", activador:"El área promotora envía un evento a For+.", preheader:"Revisa la información y registra una decisión.", cuerpo:`Hola equipo For+,

El área SST envió el evento Reinducción SG-SST. Revisa fecha, público, modalidad, cupos y pieza antes del próximo comité.`, ctaLabel:"Revisar evento" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Inscripción confirmada", "Tu inscripción al Café con los que saben fue registrada.", false, false, "EVT-2026-0142"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"For+", asunto:"✅ Inscripción registrada · Café con los que saben", activador:"El colaborador selecciona Inscribirme y confirma el formulario.", preheader:"Tu inscripción fue recibida; todavía no garantiza cupo.", cuerpo:`Hola Daniel,

Registramos tu inscripción al evento Café con los que saben, programado para el 6 de agosto de 2026, de 9:00 a. m. a 11:00 a. m. Cuando el área promotora defina los cupos recibirás una nueva comunicación.`, ctaLabel:"Ver mi inscripción" },
      { esPlantilla:true, ...no("informativa", Role.Lider, "Inscripción informativa del equipo", "Daniel se inscribió a Café con los que saben · 6 ago 2026 · 9:00 a. m. a 11:00 a. m.", false, false, "EVT-2026-0142"), destinatarioCorreo:"alejandro.gomez@sistecredito.com", remitente:"For+", asunto:"👀 Daniel se inscribió a un evento", activador:"Un colaborador del equipo se inscribe; no crea aprobación automática.", preheader:"Este aviso es informativo y no requiere decisión.", cuerpo:`Hola Alejandro 👋

Daniel Marín se inscribió a Café con los que saben, programado para el 6 de agosto de 2026, de 9:00 a. m. a 11:00 a. m.

Este mensaje es solo informativo. No necesitas tomar ninguna decisión. Si el área promotora solicita formalmente tu aprobación, recibirás un correo diferente con los botones para responder.`, ctaLabel:"Ver detalle" },
      { esPlantilla:true, ...no("aprobacion", Role.Lider, "Aprobación formal requerida", "Laura requiere tu aprobación · Café con los que saben · 6 ago 2026 · 9:00 a. m. a 11:00 a. m.", true, false, "APR-DEMO-1"), destinatarioCorreo:"alejandro.gomez@sistecredito.com", remitente:"Área promotora For+", asunto:"🟠 Acción requerida · Aprueba una participación", activador:"El área promotora selecciona inscritos y define el correo del aprobador.", preheader:"Revisa capacidad, cruces y fecha antes de decidir.", cuerpo:`Hola Alejandro 👋

El área promotora solicita tu aprobación para la participación de Laura Roldán en Café con los que saben, el 6 de agosto de 2026, de 9:00 a. m. a 11:00 a. m.

Ingresa a la aplicación para revisar capacidad, cruces y responder.`, ctaLabel:"Responder aprobación" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Solicitud de acceso aprobada", "Tu solicitud fue aprobada como Área promotora.", false, false, "SOL-2026-0007"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"For+", asunto:"Solicitud de acceso aprobada", activador:"For+ aprueba una solicitud y define el rol concedido.", preheader:"Ya puedes cambiar a tu nuevo rol desde el selector superior.", cuerpo:`Hola Daniel,

Aprobamos tu solicitud de acceso como Área promotora. El nuevo rol ya está disponible en la aplicación.`, ctaLabel:"Ver estado de la solicitud" },
      { esPlantilla:true, ...no("informativa", Role.AreaPromotora, "Evento aprobado", "El evento fue aprobado y quedó habilitado para continuar.", false, false, "EVT-2026-0155"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"For+ / Comité", asunto:"🎉 Evento aprobado · Diplomado en Liderazgo", activador:"For+ aprueba el evento y asigna periodo.", preheader:"Consulta el periodo y continúa con la gestión del evento.", cuerpo:`Hola Carolina,

El evento Diplomado en Liderazgo fue aprobado por For+. Consulta el periodo asignado y continúa con el flujo operativo.`, ctaLabel:"Abrir evento" },
      { esPlantilla:true, ...no("recordatorio", Role.AreaPromotora, "Asistencia pendiente", "La fecha del evento ya pasó y falta cargar la asistencia.", true, false, "EVT-2026-0128"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"Gestión de Capacidad Organizacional", asunto:"⏰ Recordatorio · Carga de asistencia pendiente", activador:"La fecha del evento pasa y no existe archivo o registro de asistencia.", preheader:"Carga el formato para continuar con el cierre.", cuerpo:`Hola Carolina,

El evento Encuentro de cultura ya se ejecutó. Descarga el formato, registra los correos y la asistencia, y carga el archivo para cerrar el evento.`, ctaLabel:"Cargar asistencia" },
      { esPlantilla:true, ...no("informativa", Role.AreaPromotora, "Evento devuelto para ajustes", "For+ solicita correcciones antes de aprobar el evento.", true, false, "EVT-2026-0150"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"For+ / Comité", asunto:"Ajustes requeridos · Evento", activador:"For+ devuelve un evento durante la revisión.", preheader:"Consulta las observaciones y reenvía el evento.", cuerpo:`Hola Carolina,

El Comité solicita ajustes sobre el evento. Revisa las observaciones registradas, actualiza la información y vuelve a enviarlo.`, ctaLabel:"Ver observaciones" },
      { esPlantilla:true, ...no("informativa", Role.AreaPromotora, "Evento rechazado", "El evento no continuará en el periodo.", false, false, "EVT-2026-0160"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"For+ / Comité", asunto:"Decisión del comité · Evento rechazado", activador:"For+ rechaza el evento.", preheader:"Consulta el motivo y las observaciones.", cuerpo:`Hola Carolina,

El evento fue rechazado por el Comité. En la aplicación encontrarás el motivo y las observaciones.`, ctaLabel:"Consultar decisión" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Cupo aprobado", "Tu participación fue confirmada.", false, false, "EVT-2026-0142"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Cupo confirmado · Evento", activador:"El área promotora aprueba el cupo del colaborador.", preheader:"Tu participación fue confirmada.", cuerpo:`Hola Daniel,

Tu cupo fue aprobado. Consulta la fecha, hora y lugar del evento.`, ctaLabel:"Ver evento" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Cupo rechazado", "No fue posible asignarte un cupo.", false, false, "EVT-2026-0142"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Resultado de solicitud de cupo", activador:"El área promotora rechaza el cupo de una persona inscrita.", preheader:"Consulta la observación registrada.", cuerpo:`Hola Daniel,

En esta oportunidad no fue posible asignarte un cupo. Consulta la observación registrada.`, ctaLabel:"Ver mi inscripción" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Ingreso a lista de espera", "Tu inscripción quedó en lista de espera.", false, false, "EVT-2026-0142"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Lista de espera · Evento", activador:"No hay cupos disponibles.", preheader:"Te avisaremos si se libera un cupo.", cuerpo:`Hola Daniel,

Tu inscripción quedó en lista de espera. Recibirás una comunicación si se libera un cupo.`, ctaLabel:"Ver estado" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Evento reprogramado", "La fecha u hora cambió.", true, false, "EVT-2026-0173"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Cambio de fecha · Evento reprogramado", activador:"El área promotora confirma una nueva fecha u hora.", preheader:"Revisa la nueva programación.", cuerpo:`Hola Daniel,

El evento fue reprogramado. Revisa la nueva fecha y hora.`, ctaLabel:"Consultar nueva fecha" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Evento cancelado", "El evento no se realizará.", false, false, "EVT-2026-0173"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Evento cancelado", activador:"El área promotora o For+ cancela el evento.", preheader:"Consulta el motivo de cancelación.", cuerpo:`Hola Daniel,

El evento fue cancelado. En la aplicación puedes consultar el motivo.`, ctaLabel:"Ver detalle" },
      { esPlantilla:true, ...no("recordatorio", Role.Colaborador, "Recordatorio de evento", "Tu evento inicia próximamente.", false, false, "EVT-2026-0173"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Gestión de Capacidad Organizacional", asunto:"Recordatorio · Evento próximo", activador:"Se alcanza la anticipación configurada.", preheader:"Revisa fecha, hora y lugar.", cuerpo:`Hola Daniel,

Te recordamos que tienes un evento próximo. Consulta la programación.`, ctaLabel:"Ver evento" },
      { esPlantilla:true, ...no("informativa", Role.AreaPromotora, "Inscripciones cerradas", "La ventana de inscripción finalizó.", true, false, "EVT-2026-0173"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"Gestión de Capacidad Organizacional", asunto:"Inscripciones cerradas · Gestiona participantes", activador:"Llega la fecha de cierre o el promotor cierra las inscripciones.", preheader:"Revisa inscritos, aprobaciones y cupos.", cuerpo:`Hola Carolina,

La ventana de inscripción finalizó. Revisa participantes y deja el grupo definitivo.`, ctaLabel:"Gestionar participantes" },
      { esPlantilla:true, ...no("informativa", Role.Colaborador, "Asistencia registrada", "Tu asistencia fue registrada.", false, false, "EVT-2026-0128"), destinatarioCorreo:"daniel.marin@sistecredito.com", remitente:"Área promotora", asunto:"Asistencia registrada · Evento", activador:"El área promotora confirma la asistencia.", preheader:"Tu participación quedó registrada.", cuerpo:`Hola Daniel,

Registramos tu asistencia al evento. Gracias por participar.`, ctaLabel:"Ver historial" },
      { esPlantilla:true, ...no("informativa", Role.AreaPromotora, "Evento finalizado", "El cierre fue registrado.", false, false, "EVT-2026-0128"), destinatarioCorreo:"carolina.restrepo@sistecredito.com", remitente:"Gestión de Capacidad Organizacional", asunto:"Cierre registrado · Evento finalizado", activador:"El dueño registra el resultado y finaliza el evento.", preheader:"Consulta el resultado de cierre.", cuerpo:`Hola Carolina,

El evento quedó finalizado y su resultado fue registrado correctamente.`, ctaLabel:"Consultar cierre" },
    ],
    audit: [],
    periodosConfig: { "Julio 2026": true, "Agosto 2026": true, "Septiembre 2026": false, "Octubre 2026": false },
    grants: {
      "Daniel Marín": [
        {
          reqId: "SOL-2026-0007",
          comunidad: "Agilismo (Vía Jay)",
          permisos: ["crear", "inscritos"],
          vigencia: "2026-12-31",
          ts: "2026-06-18T15:00:00Z",
        },
      ],
    },
  }
}

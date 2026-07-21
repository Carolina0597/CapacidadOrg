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
  enviado: ["Pendiente de revisión", "info"],
  en_revision: ["En revisión", "info"],
  devuelto: ["Devuelto", "amber"],
  ajustado: ["Ajustado", "info"],
  pendiente_priorizacion: ["Pendiente de priorización", "amber"],
  aprobado: ["Aprobado", "success"],
  aprobado_condicionado: ["Aprobado con condiciones", "green"],
  priorizado_otro_periodo: ["Priorizado para otro periodo", "amber"],
  rechazado: ["Rechazado", "red"],
  publicado: ["Publicado", "purple"],
  inscripciones_abiertas: ["Inscripciones abiertas", "green"],
  inscripciones_cerradas: ["Inscripciones cerradas", "neutral"],
  gestion_participantes: ["Gestión de participantes", "blue"],
  en_aprobacion: ["En aprobación", "amber"],
  cupos_asignados: ["Cupos asignados", "success"],
  citacion_pendiente: ["Citación pendiente", "orange"],
  citado: ["Citado", "purple"],
  en_ejecucion: ["En ejecución", "blue"],
  pendiente_cierre: ["Pendiente de cierre", "orange"],
  cerrado: ["Cerrado", "neutral"],
  reprogramado: ["Reprogramado", "amber"],
  cancelado: ["Cancelado", "red"],
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
export interface ApprovalResponse { approver: string; decision: "aprobada" | "rechazada"; ts: string; observacion?: string }
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
  titulo: string
  descripcion: string
  requiereAccion: boolean
  fallida: boolean
  leida: boolean
  fecha: string
  rel?: string
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
    lider: "Sandra Roldán",
    roles: [Role.Colaborador],
    permisos: ["Ver calendario", "Inscribirme a eventos", "Consultar mi capacidad"],
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
    lider: "Mario Franco",
    roles: [Role.Colaborador, Role.Lider],
    permisos: ["Ver calendario", "Ver mi equipo", "Consultar capacidad del equipo"],
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
    roles: [Role.Lider],
    permisos: ["Ver calendario", "Ver mi equipo", "Responder aprobaciones", "Consultar capacidad del equipo"],
  },
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
    roles: [Role.Colaborador, Role.AreaPromotora, Role.ForPlus],
    permisos: ["Crear eventos", "Gestionar inscritos", "Revisar y priorizar", "Configurar periodos"],
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

/** Equipo simulado. El líder de referencia de la demo es "Laura Roldán". */
export const TEAM: TeamMember[] = [
  { id: "tm-daniel", nombre: "Daniel Marín", ini: "DM", cargo: "Analista de Operaciones", lider: "Laura Roldán", horasMes: 22, inscripciones: 4, pendientes: 1, asistencia: 92 },
  { id: "tm-valentina", nombre: "Valentina Cardona", ini: "VC", cargo: "Analista de Riesgos", lider: "Laura Roldán", horasMes: 16, inscripciones: 3, pendientes: 0, asistencia: 88 },
  { id: "tm-samuel", nombre: "Samuel Ortiz", ini: "SO", cargo: "Especialista de Crédito", lider: "Laura Roldán", horasMes: 8, inscripciones: 1, pendientes: 1, asistencia: 75 },
  { id: "tm-manuela", nombre: "Manuela Ríos", ini: "MR", cargo: "Analista de Datos", lider: "Laura Roldán", horasMes: 12, inscripciones: 2, pendientes: 0, asistencia: 95 },
  { id: "tm-andres", nombre: "Andrés Peláez", ini: "AP", cargo: "Coordinador de Servicio", lider: "Laura Roldán", horasMes: 19, inscripciones: 3, pendientes: 2, asistencia: 81 },
  { id: "tm-luisa", nombre: "Luisa Fernández", ini: "LF", cargo: "Analista de Procesos", lider: "Laura Roldán", horasMes: 4, inscripciones: 1, pendientes: 0, asistencia: 100 },
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
export const SCHEMA = 5

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
    session: { userId: "carolina", role: Role.ForPlus, periodo: "Agosto 2026", menuCollapsed: false, booted: false },
    events: [
      ev("EVT-2026-0142", "Café con los que saben — Agosto", "For+ / Formación", "voluntaria", "enviado", false),
      ev("EVT-2026-0148", "Reinducción SG-SST", "SST", "normativa", "en_revision", false),
      ev("EVT-2026-0155", "Diplomado en Liderazgo", "For+ / Formación", "corporativa", "pendiente_priorizacion", false),
      ev("EVT-2026-0160", "Actualización SARLAFT", "Cumplimiento", "normativa", "aprobado", false),
      ev("EVT-2026-0161", "Taller crítico de riesgos", "Riesgos Corporativos", "corporativa", "enviado", true),
      ev("EVT-2026-0139", "Jornada de bienestar julio", "Bienestar", "experiencia", "pendiente_cierre", false, { fecha: "2026-07-10", periodo: "Julio 2026" }),
      ev("EVT-2026-0132", "Sensibilización inclusión", "Sostenibilidad y RS", "sensibilizacion", "publicado", false),
    ],
    accessRequests: [
      ar("SOL-2026-0007", "Daniel Marín", "Agilismo (Vía Jay)", ["crear", "inscritos"], "aprobada", "Mario Franco", "2026-06-18", "2026-12-31"),
      ar("SOL-2026-0011", "Daniel Marín", "Comunidad Nexus / Makers", ["crear", "inscritos", "analitica"], "revision", "Laura Roldán", "2026-07-14", "Indefinida"),
      ar("SOL-2026-0014", "Daniel Marín", "Bienestar", ["crear", "asistencia"], "devuelta", "Jeison Monsalve", "2026-07-16", "2026-10-31", "Devuelta: especifica el responsable que respalda y ajusta la vigencia."),
      ar("SOL-2026-0003", "Daniel Marín", "SST", ["crear", "inscritos", "cupos"], "vencida", "Pamela Brand", "2026-05-02", "2026-06-30"),
    ],
    enrollments: [],
    approvals: [],
    citations: [],
    attendance: [],
    satisfaction: [],
    tacticalValidations: [],
    publications: [],
    capacityStandards: [{ id: "STD-1", nombre: "Estándar corporativo", horasAnuales: 240, horasMensuales: 20, poblacionAplicable: "Todos", umbralSaludable: 60, umbralPreventivo: 80, umbralAltaSaturacion: 100, umbralSobreCapacidad: 101, vigenciaInicio: "2026-01-01" }],
    periodConfigurations: PERIODOS.map((nombre, i) => ({ id: `PER-${i+1}`, nombre, mes: 7+i, ano: 2026, fechaLimiteRegistro: `2026-${String(6+i).padStart(2,"0")}-30`, fechaRevisionForPlus: `2026-${String(7+i).padStart(2,"0")}-02`, fechaPublicacion: `2026-${String(7+i).padStart(2,"0")}-05`, fechaAperturaInscripcion: `2026-${String(7+i).padStart(2,"0")}-05`, fechaCierreInscripcion: `2026-${String(7+i).padStart(2,"0")}-15`, fechaLimiteCupos: `2026-${String(7+i).padStart(2,"0")}-18`, fechaLimiteCitacion: `2026-${String(7+i).padStart(2,"0")}-20`, fechaLimiteCierre: `2026-${String(8+i).padStart(2,"0")}-05`, estado: i < 2 ? "activo" : "borrador" })),
    notifications: [
      no("evento_recibido", Role.ForPlus, "Nuevo evento para revisar", "“Reinducción SG-SST” fue enviado por SST.", true, false, "EVT-2026-0148"),
      no("evento_recibido", Role.ForPlus, "Nueva solicitud de acceso", "Daniel Marín solicita acceso (Nexus).", true, false, "SOL-2026-0011"),
      no("recordatorio", Role.ForPlus, "Notificación fallida", "No se pudo enviar la citación de 2 eventos.", true, true, "EVT-2026-0132"),
      no("informativa", Role.Lider, "Inscripción de tu equipo", "Un colaborador de tu equipo se inscribió a un evento.", false, false),
      no("informativa", Role.Colaborador, "Nuevos eventos disponibles", "Hay 6 eventos abiertos para inscripción este periodo.", false, false),
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

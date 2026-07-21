/* ============================================================================
 * GCO · CREAR/EDITAR EVENTO — modelo del formulario, catálogos, derivaciones
 * y validaciones. Sin UI ni estado global: solo lógica pura reutilizable por
 * el asistente de 8 pasos y por el resumen lateral en tiempo real.
 * ========================================================================== */
import {
  ACT,
  CAPACIDAD_MENSUAL_HORAS,
  EXISTING_CROSS,
  PEOPLE,
  type ActivityType,
  type EventStructure,
  type GcoEvent,
  type GcoState,
  type Period,
  type User,
} from "./domain"

/* ---- Catálogos del asistente ---- */
export const TIPOS: { value: ActivityType; label: string; prioridad: string }[] = (
  Object.keys(ACT) as ActivityType[]
).map((k) => ({ value: k, label: ACT[k][0], prioridad: ACT[k][1] }))

export const SUBTIPOS: Record<ActivityType, string[]> = {
  normativa: ["SG-SST", "SARLAFT / Cumplimiento", "Habeas Data / PDP", "Seguridad de la información", "Inducción legal"],
  voluntaria: ["Club de lectura", "Charla abierta", "Comunidad de práctica", "Webinar", "Taller opcional"],
  corporativa: ["Diplomado", "Escuela de liderazgo", "Bootcamp técnico", "Certificación", "Ruta de aprendizaje"],
  experiencia: ["Jornada de bienestar", "Team building", "Reto / Hackathon", "Feria", "Vivencia inmersiva"],
  sensibilizacion: ["Campaña de cultura", "Conversatorio", "Semana temática", "Activación", "Charla de sensibilización"],
  asesoria: ["Acompañamiento 1:1", "Consultoría interna", "Mentoría", "Coaching de equipo", "Sesión de diagnóstico"],
  otras: ["Otro tipo de actividad"],
}

export const PRIORIDADES = ["Muy alta", "Alta", "Media-Alta", "Media", "Baja"]

export const PROGRAMAS = [
  "Plan de formación",
  "Plan de desarrollo",
  "Plan de mejoramiento",
  "Coach",
  "Inducción o reinducción",
]

export const CONVOCATORIAS: { value: string; label: string; desc: string }[] = [
  { value: "abierta", label: "Inscripción abierta", desc: "Cualquier persona del público puede inscribirse." },
  { value: "asignado", label: "Público asignado", desc: "For+ / el área definen la población que debe asistir." },
  { value: "directa", label: "Invitación directa", desc: "Solo personas invitadas explícitamente." },
  { value: "mixto", label: "Mixto", desc: "Cupos abiertos + un grupo asignado obligatorio." },
]

export const PUBLICO_SCOPES: { value: string; label: string }[] = [
  { value: "todo", label: "Todo Sistecrédito" },
  { value: "vps", label: "Vicepresidencias" },
  { value: "areas", label: "Áreas" },
  { value: "cargos", label: "Cargos" },
  { value: "personas", label: "Personas específicas" },
  { value: "grupos", label: "Grupos operativos" },
]

export const VPS = [
  "Vicepresidencia de Riesgos",
  "Vicepresidencia Comercial",
  "Vicepresidencia de Operaciones",
  "Vicepresidencia de Tecnología",
  "Vicepresidencia Financiera",
  "Vicepresidencia de Talento Humano y Corporativa",
  "Vicepresidencia de Estrategia e Innovación",
]

export const CARGOS = [
  "Analista",
  "Analista Senior",
  "Líder de equipo",
  "Coordinador",
  "Jefe de área",
  "Especialista",
  "Asesor de servicio",
  "Gerente",
]

export const GRUPOS_OPERATIVOS = [
  "Contact Center — Turno AM",
  "Contact Center — Turno PM",
  "Fuerza comercial — Regional Antioquia",
  "Fuerza comercial — Regional Costa",
  "Back office — Cartera",
  "Mesa de ayuda TI",
]

export const ESTRUCTURAS: { value: EventStructure; label: string; desc: string }[] = [
  { value: "sesion_unica", label: "Una sesión", desc: "Un único encuentro." },
  { value: "programa_secuencial", label: "Programa secuencial", desc: "Varias sesiones encadenadas que suman horas." },
  { value: "grupos_equivalentes", label: "Grupos equivalentes", desc: "Misma sesión repetida para distintos grupos." },
  { value: "sesiones_independientes", label: "Sesiones independientes", desc: "Sesiones sueltas sin secuencia." },
]

export const MODALIDADES = ["Virtual", "Presencial", "Híbrida"]

export const CRITERIOS_ASIGNACION = [
  "Orden de inscripción",
  "Selección manual",
  "Cupos por área",
  "Público prioritario",
  "Capacidad disponible",
  "Sorteo",
]

export const METODOS_ASISTENCIA = ["Manual", "Excel", "Teams", "QR"]

export const TIPOS_APOYO = [
  "Logística del espacio",
  "Facilitación",
  "Diseño instruccional",
  "Gestión de proveedores",
  "Medición y cierre",
]

export const ANTICIPACIONES = ["1 día antes", "2 días antes", "3 días antes", "1 semana antes"]

/* ---- Estructuras internas ---- */
export interface FormSession {
  id: string
  nombre: string
  fecha: string
  ini: string
  fin: string
  modalidad: string
  lugar: string
  plataforma: string
  responsable: string
  cupos: string
  publico: string
  enlace: string
  estado: string
  contabilizaCapacidad: boolean
  duracionCalculada: number
  duracionContabilizable: number
  motivoNoContabiliza: string
}

export interface PersonRow {
  nombre: string
  correo: string
  valido: boolean
  error: string
}

/* ---- Modelo completo del formulario ---- */
export interface EventModel {
  id: string
  codigo: string
  // Paso 1
  nombre: string
  periodo: Period
  areaPrincipal: string
  areasAdicionales: string[]
  responsable: string
  responsablesAdicionales: string[]
  contacto: string
  correo: string
  telefono: string
  obligatorioProceso: boolean
  obligatorioColaborador: boolean
  // Paso 2
  tipo: ActivityType | ""
  subtipo: string
  prioridad: string
  peso: string
  descripcion: string
  objetivo: string
  temas: string
  resultadoEsperado: string
  tipoResultadoEsperado: string
  programa: string
  alineacionEstrategica: boolean
  objetivoIndicador: string
  requerimientoNormativo: boolean
  norma: string
  fechaLimiteNormativa: string
  metaCobertura: string
  metaAsistencia: string
  metaSatisfaccion: string
  metaCoberturaCantidad: string
  metaCoberturaPorcentaje: string
  metaAsistenciaCantidad: string
  metaAsistenciaPorcentaje: string
  unidadMetaSatisfaccion: string
  // Paso 3
  convocatoria: string
  scopes: string[]
  publicoAbierto: boolean
  todosDebenAsistir: boolean
  poblacionTotal: string
  minimoCubrir: string
  vps: string[]
  areasImpactadas: string[]
  cargos: string[]
  grupos: string[]
  personas: PersonRow[]
  // Paso 4
  estructura: EventStructure
  sesiones: FormSession[]
  crossAccepted: boolean
  crossJustification: string
  // Paso 5
  requiereCupos: boolean
  cuposTotales: string
  cuposPorSesion: boolean
  requiereInscripcion: boolean
  permiteSobreinscripcion: boolean
  listaEspera: boolean
  maxEventos: string
  maxSesiones: string
  criterioAsignacion: string
  permiteCancelacion: boolean
  fechaLimiteInscripcion: string
  fechaAperturaInscripcion: string
  fechaCierreInscripcion: string
  fechaMaximaCancelacion: string
  permiteReemplazo: boolean
  periodoInscripcionHeredado: boolean
  permiteExcepcionPeriodoInscripcion: boolean
  motivoExcepcionInscripcion: string
  permiteAprobacionesPosteriores: boolean
  requiereValidacionTactica: boolean
  segmentosTactica: string[]
  cargosTactica: string[]
  responsableTactica: string
  mensajeColaborador: string
  // Paso 6
  modalidad: string
  lugarPlataforma: string
  sede: string
  auditorio: string
  direccionExterna: string
  enlace: string
  apoyoForPlus: boolean
  tipoApoyo: string
  apoyoComunicaciones: boolean
  tipoPiezaComunicaciones: string
  canalComunicacion: string
  textoBaseComunicacion: string
  fechaRequeridaComunicaciones: string
  responsableSolicitudComunicaciones: string
  observacionesComunicaciones: string
  estadoComunicaciones: string
  grabacion: boolean
  controlAsistencia: boolean
  metodoAsistencia: string
  encuestaSatisfaccion: boolean
  // Paso 7
  speaker: string
  speakerCargo: string
  requierePieza: boolean
  piezaEvento: { id: string; nombre: string; tipo: string; tamano: number; urlTemporal?: string; fechaCarga: string; cargadoPor: string; estadoValidacion: string } | null
  adjuntosAdicionales: { id: string; nombre: string; tipo: string; tamano: number; urlTemporal?: string; fechaCarga: string; cargadoPor: string; estadoValidacion: string }[]
  piezaEstado: string
  piezaFechaLimite: string
  asunto: string
  cuerpo: string
  instrucciones: string
  citacionModo: string
  organizador: string
  crearTeams: boolean
  recordatorios: boolean
  anticipacion: string
  requierePublicacion: boolean
  fechaPrevistaPublicacion: string
  canalPublicacion: string
  fechaRealPublicacion: string
  publicadoPor: string
  estadoPublicacion: string
}

export const STEPS: { n: number; label: string; short: string }[] = [
  { n: 1, label: "Información del evento", short: "Evento" },
  { n: 2, label: "Público y modalidad", short: "Público" },
  { n: 3, label: "Programación", short: "Programación" },
  { n: 4, label: "Cupos, inscripción y apoyo", short: "Cupos y apoyo" },
  { n: 5, label: "Revisión", short: "Revisión" },
]

/* ---- Generación de identificadores ---- */
export function nextEventId(state: GcoState): string {
  const year = 2026
  const nums = state.events
    .map((e) => {
      const m = /^EVT-(\d{4})-(\d+)$/.exec(e.id)
      return m ? Number(m[2]) : 0
    })
    .filter((n) => n > 0)
  const max = nums.length ? Math.max(...nums) : 141
  return `EVT-${year}-${String(max + 1).padStart(4, "0")}`
}

export function codeFromId(id: string): string {
  const m = /^EVT-\d{4}-(\d+)$/.exec(id)
  return `FOR-${m ? m[1] : "0000"}`
}

/* ---- Modelo vacío ---- */
export function emptyEventModel(id: string, periodo: Period, user: User): EventModel {
  return {
    id,
    codigo: codeFromId(id),
    nombre: "",
    periodo,
    areaPrincipal: user.area,
    areasAdicionales: [],
    responsable: user.nombre,
    responsablesAdicionales: [],
    contacto: user.nombre,
    correo: user.correo,
    telefono: "",
    obligatorioProceso: false,
    obligatorioColaborador: false,
    tipo: "",
    subtipo: "",
    prioridad: "",
    peso: "",
    descripcion: "",
    objetivo: "",
    temas: "",
    resultadoEsperado: "",
    tipoResultadoEsperado: "",
    programa: "",
    alineacionEstrategica: false,
    objetivoIndicador: "",
    requerimientoNormativo: false,
    norma: "",
    fechaLimiteNormativa: "",
    metaCobertura: "",
    metaAsistencia: "",
    metaSatisfaccion: "",
    metaCoberturaCantidad: "",
    metaCoberturaPorcentaje: "",
    metaAsistenciaCantidad: "",
    metaAsistenciaPorcentaje: "",
    unidadMetaSatisfaccion: "Escala 1 a 5",
    convocatoria: "",
    scopes: [],
    publicoAbierto: true,
    todosDebenAsistir: false,
    poblacionTotal: "",
    minimoCubrir: "",
    vps: [],
    areasImpactadas: [],
    cargos: [],
    grupos: [],
    personas: [],
    estructura: "sesion_unica",
    sesiones: [newSession(1)],
    crossAccepted: false,
    crossJustification: "",
    requiereCupos: true,
    cuposTotales: "",
    cuposPorSesion: false,
    requiereInscripcion: true,
    permiteSobreinscripcion: false,
    listaEspera: false,
    maxEventos: "",
    maxSesiones: "",
    criterioAsignacion: "Orden de inscripción",
    permiteCancelacion: true,
    fechaLimiteInscripcion: "",
    fechaAperturaInscripcion: "",
    fechaCierreInscripcion: "",
    fechaMaximaCancelacion: "",
    permiteReemplazo: false,
    periodoInscripcionHeredado: true,
    permiteExcepcionPeriodoInscripcion: false,
    motivoExcepcionInscripcion: "",
    permiteAprobacionesPosteriores: false,
    requiereValidacionTactica: false,
    segmentosTactica: [],
    cargosTactica: [],
    responsableTactica: "",
    mensajeColaborador: "",
    modalidad: "Virtual",
    lugarPlataforma: "",
    sede: "",
    auditorio: "",
    direccionExterna: "",
    enlace: "",
    apoyoForPlus: false,
    tipoApoyo: "",
    apoyoComunicaciones: false,
    tipoPiezaComunicaciones: "",
    canalComunicacion: "",
    textoBaseComunicacion: "",
    fechaRequeridaComunicaciones: "",
    responsableSolicitudComunicaciones: "",
    observacionesComunicaciones: "",
    estadoComunicaciones: "no_requerida",
    grabacion: false,
    controlAsistencia: true,
    metodoAsistencia: "Manual",
    encuestaSatisfaccion: true,
    speaker: "",
    speakerCargo: "",
    requierePieza: false,
    piezaEvento: null,
    adjuntosAdicionales: [],
    piezaEstado: "Pendiente",
    piezaFechaLimite: "",
    asunto: "",
    cuerpo: "",
    instrucciones: "",
    citacionModo: "automatica",
    organizador: user.nombre,
    crearTeams: false,
    recordatorios: true,
    anticipacion: "2 días antes",
    requierePublicacion: true,
    fechaPrevistaPublicacion: "",
    canalPublicacion: "Intranet / Agenda",
    fechaRealPublicacion: "",
    publicadoPor: "",
    estadoPublicacion: "borrador",
  }
}

let _sid = 0
export function newSession(n: number): FormSession {
  _sid += 1
  return {
    id: `S-${_sid}`,
    nombre: `Sesión ${n}`,
    fecha: "",
    ini: "08:00",
    fin: "10:00",
    modalidad: "Virtual",
    lugar: "",
    plataforma: "Microsoft Teams",
    responsable: "",
    cupos: "",
    publico: "",
    enlace: "",
    estado: "Programada",
    contabilizaCapacidad: true,
    duracionCalculada: 2,
    duracionContabilizable: 2,
    motivoNoContabiliza: "",
  }
}

/* ---- Reconstrucción del modelo al editar ---- */
export function modelFromEvent(e: GcoEvent, user: User): EventModel {
  if (e.model && typeof e.model === "object" && (e.model as any).id) {
    // Merge con vacío para tolerar modelos guardados con menos campos.
    return { ...emptyEventModel(e.id, e.periodo, user), ...(e.model as unknown as EventModel), id: e.id }
  }
  const base = emptyEventModel(e.id, e.periodo, user)
  return {
    ...base,
    nombre: e.nombre,
    areaPrincipal: e.area,
    tipo: e.tipo,
    responsable: e.responsable,
    sesiones: e.sesiones.length
      ? e.sesiones.map((s, i) => ({ ...newSession(i + 1), ...s }))
      : base.sesiones,
  }
}

/* ============================================================================
 * DERIVACIONES EN TIEMPO REAL
 * ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function hoursBetween(ini: string, fin: string): number {
  if (!ini || !fin) return 0
  const [h1, m1] = ini.split(":").map(Number)
  const [h2, m2] = fin.split(":").map(Number)
  const mins = h2 * 60 + m2 - (h1 * 60 + m1)
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0
}

/** Duración total según la estructura del evento. */
export function totalDuration(m: EventModel): number {
  const perSession = m.sesiones.map((s) => s.contabilizaCapacidad === false ? 0 : (Number(s.duracionContabilizable) || hoursBetween(s.ini, s.fin)))
  if (m.estructura === "grupos_equivalentes") {
    // Todos los grupos ven la misma sesión: cuenta una sola vez (la primera).
    return perSession[0] || 0
  }
  return Math.round(perSession.reduce((a, b) => a + b, 0) * 100) / 100
}

export interface Conflict {
  sesion: string
  tipo: "externo" | "interno"
  contra: string
  detalle: string
}

/** Detecta cruces externos (agenda existente) e internos (entre sesiones). */
export function detectConflicts(m: EventModel): Conflict[] {
  const out: Conflict[] = []
  const overlap = (aF: string, aI: string, aE: string, bF: string, bI: string, bE: string) => {
    if (!aF || !bF || aF !== bF) return false
    return aI < bE && bI < aE
  }
  m.sesiones.forEach((s) => {
    if (!s.fecha) return
    EXISTING_CROSS.forEach((x) => {
      if (overlap(s.fecha, s.ini, s.fin, x.fecha, x.ini, x.fin)) {
        out.push({ sesion: s.nombre, tipo: "externo", contra: x.name, detalle: `${x.fecha} · ${x.ini}–${x.fin}` })
      }
    })
    m.sesiones.forEach((o) => {
      if (o.id <= s.id) return
      if (overlap(s.fecha, s.ini, s.fin, o.fecha, o.ini, o.fin)) {
        out.push({ sesion: s.nombre, tipo: "interno", contra: o.nombre, detalle: `${o.fecha} · ${o.ini}–${o.fin}` })
      }
    })
  })
  return out
}

/** Población objetivo estimada (para horas-persona). */
export function targetPopulation(m: EventModel): number {
  const pob = Number(m.poblacionTotal) || 0
  if (pob > 0) return pob
  const cupos = Number(m.cuposTotales) || 0
  if (cupos > 0) return cupos
  return m.personas.filter((p) => p.valido).length
}

export function horasPersona(m: EventModel): number {
  return Math.round(totalDuration(m) * targetPopulation(m) * 100) / 100
}

/** % de la capacidad mensual (20 h) por persona que consume el evento. */
export function saturacionPct(m: EventModel): number {
  return Math.round((totalDuration(m) / CAPACIDAD_MENSUAL_HORAS) * 100)
}

export function csvValidate(lines: string[]): PersonRow[] {
  const seen = new Set<string>()
  const activos = new Set(PEOPLE.map((p) => p.toLowerCase()))
  return lines
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[;,\t]/).map((p) => p.trim())
      const nombre = parts[0] || ""
      const correo = (parts[1] || "").toLowerCase()
      let error = ""
      if (!correo) error = "Correo obligatorio"
      else if (!EMAIL_RE.test(correo)) error = "Correo inválido"
      else if (seen.has(correo)) error = "Duplicado"
      else if (nombre && !activos.has(nombre.toLowerCase()) && !correo.endsWith("@sistecredito.com"))
        error = "Persona no encontrada / inactiva"
      seen.add(correo)
      return { nombre: nombre || correo, correo, valido: !error, error }
    })
}

/* ============================================================================
 * VALIDACIÓN POR PASO
 * ========================================================================== */
export type Errors = Record<string, string>

export function validateStep(step: number, m: EventModel): Errors {
  const e: Errors = {}
  if (step === 1) {
    if (!m.nombre.trim()) e.nombre = "Escribe el nombre del evento"
    if (!m.areaPrincipal) e.areaPrincipal = "Selecciona al menos un área promotora"
    if (!m.responsable) e.responsable = "Selecciona el responsable"
    if (!m.tipo) e.tipo = "Selecciona el tipo de actividad"
    if (!m.descripcion.trim()) e.descripcion = "Describe de qué se trata y qué temas impacta"
  }
  if (step === 2) {
    if (!m.modalidad) e.modalidad = "Selecciona la modalidad"
    if (!m.scopes.length) e.scopes = "Selecciona el público"
  }
  if (step === 3) {
    if (!m.sesiones.length) e.sesiones = "Agrega la programación"
    m.sesiones.forEach((s, i) => {
      if (!s.fecha) e[`s_${i}_fecha`] = "Fecha requerida"
      if (hoursBetween(s.ini, s.fin) <= 0) e[`s_${i}_hora`] = "Horario inválido"
    })
    if (detectConflicts(m).length && !m.crossAccepted) e.cross = "Revisa el cruce o confirma que continuarás"
    if (detectConflicts(m).length && m.crossAccepted && !m.crossJustification.trim()) e.crossJustification = "Justifica el cruce"
  }
  if (step === 4) {
    if (m.requiereCupos && !m.cuposTotales) e.cuposTotales = "Indica la cantidad de cupos"
    if (!m.lugarPlataforma) e.lugarPlataforma = "Selecciona el lugar o plataforma"
  }
  return e
}

/** Todos los campos faltantes para poder enviar a For+. */
export function missingForSend(m: EventModel): { step: number; label: string }[] {
  const out: { step: number; label: string }[] = []
  for (let s = 1; s <= 4; s++) {
    const errs = validateStep(s, m)
    Object.values(errs).forEach((msg) => out.push({ step: s, label: msg }))
  }
  return out
}

/** Convierte el modelo al shape que consume el store (A.saveEvent). */
export function toStorePayload(m: EventModel): Record<string, any> {
  const conflicts = detectConflicts(m)
  const first = m.sesiones.find((s) => s.fecha)
  return {
    ...m,
    areaPrincipal: m.areaPrincipal,
    fecha: first?.fecha || "",
    sesiones: m.sesiones.map((s) => ({
      nombre: s.nombre,
      fecha: s.fecha,
      ini: s.ini,
      fin: s.fin,
      modalidad: s.modalidad,
      lugar: s.lugar,
      responsable: s.responsable,
      cupos: s.cupos,
      publico: s.publico,
      enlace: s.enlace,
      estado: s.estado,
    })),
    _cruce: conflicts.length > 0,
  }
}

/* ============================================================================
 * CACHÉ DE TRABAJO (abandonar y continuar) — separada del store.
 * Guarda el modelo en curso por ID sin generar auditoría ni notificaciones.
 * ========================================================================== */
const DRAFT_PREFIX = "gco.eventdraft."

export function cacheWorking(m: EventModel) {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + m.id, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}
export function readWorking(id: string): EventModel | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + id)
    return raw ? (JSON.parse(raw) as EventModel) : null
  } catch {
    return null
  }
}
export function clearWorking(id: string) {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + id)
  } catch {
    /* ignore */
  }
}
/** Última sesión "nuevo" no confirmada, para reanudar al volver a /eventos/nuevo. */
const PENDING_NEW = "gco.eventdraft.pendingNew"
export function setPendingNew(id: string | null) {
  try {
    if (id) window.localStorage.setItem(PENDING_NEW, id)
    else window.localStorage.removeItem(PENDING_NEW)
  } catch {
    /* ignore */
  }
}
export function getPendingNew(): string | null {
  try {
    return window.localStorage.getItem(PENDING_NEW)
  } catch {
    return null
  }
}

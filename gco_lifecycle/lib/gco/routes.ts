/* ============================================================================
 * GCO · RUTAS — registro central de navegación.
 * Mapea cada módulo a: label, icono, ruta real, visibilidad por rol (bitmask)
 * y si ya está construido (REAL) o es placeholder (PH).
 *
 * Arquitectura de navegación (organizada por objetos de gestión, no por
 * acciones técnicas independientes):
 *   For+            → Inicio · Calendario · Gestión de eventos · Solicitudes
 *                     de acceso · Capacidad · Analítica · Notificaciones ·
 *                     Administración · Auditoría.
 *   Área promotora  → Inicio · Calendario · Mis eventos · Notificaciones
 *                     (+ Crear evento como acción destacada).
 *   Colaborador     → Inicio · Agenda de eventos (calendario + disponibles
 *                     unificados) · Mis inscripciones · Capacidad ·
 *                     Solicitar acceso · Notificaciones.
 *   Líder           → Inicio · Mi equipo · Aprobaciones · Calendario ·
 *                     Notificaciones.
 *
 * Las bandejas y el detalle del evento reagrupan lo que antes eran módulos
 * sueltos (eventos por revisar, priorización, inscritos y cupos, citaciones,
 * asistencia y cierre, periodos). Ver REDIRECTS para la compatibilidad.
 * ========================================================================== */
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Gauge,
  Home,
  Inbox,
   ScrollText,
  Settings,
  ShieldPlus,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react"
import { ROLE_BIT, type Role } from "./domain"

export interface RouteDef {
  key: string
  label: string
  icon: LucideIcon
  href: string
  /** Bitmask de roles que ven el módulo. */
  roles: number
}

export interface NavGroup {
  group: string
  items: RouteDef[]
}

const R = ROLE_BIT
const ALL = R.colaborador | R.lider | R.area_promotora | R.for_plus

export const NAV: NavGroup[] = [
  {
    group: "Principal",
    items: [
      { key: "inicio", label: "Inicio", icon: Home, href: "/", roles: ALL },
      {
        key: "calendario",
        label: "Calendario",
        icon: CalendarDays,
        href: "/calendario",
        roles: R.lider | R.area_promotora | R.for_plus,
      },
      {
        key: "agenda",
        label: "Agenda de eventos",
        icon: Compass,
        href: "/agenda-de-eventos",
        roles: R.colaborador,
      },
    ],
  },
  {
    group: "Gestión de eventos",
    items: [
      {
        key: "gestion",
        label: "Gestión de eventos",
        icon: Inbox,
        href: "/gestion-de-eventos",
        roles: R.for_plus,
      },
      {
        key: "misEventos",
        label: "Mis eventos",
        icon: ClipboardList,
        href: "/mis-eventos",
        roles: R.area_promotora,
      },
      { key: "equipo", label: "Mi equipo", icon: Users, href: "/mi-equipo", roles: R.lider },
      {
        key: "aprobaciones",
        label: "Aprobaciones",
        icon: ClipboardCheck,
        href: "/aprobaciones",
        roles: R.lider,
      },
    ],
  },
  {
    group: "Capacidad y analítica",
    items: [
      { key: "miCapacidad", label: "Mi capacidad", icon: Gauge, href: "/capacidad", roles: R.colaborador },
      { key: "capacidad", label: "Capacidad", icon: Gauge, href: "/capacidad", roles: R.for_plus },
      { key: "analitica", label: "Analítica", icon: BarChart3, href: "/analitica", roles: R.for_plus },
    ],
  },
  {
    group: "Sistema",
    items: [
      {
        key: "accesos",
        label: "Solicitudes de acceso",
        icon: UserCog,
        href: "/solicitudes-de-acceso",
        roles: R.for_plus,
      },
      { key: "notificaciones", label: "Notificaciones", icon: Bell, href: "/notificaciones", roles: ALL },
      { key: "administracion", label: "Administración", icon: Settings, href: "/administracion", roles: R.for_plus },
      { key: "auditoria", label: "Auditoría", icon: ScrollText, href: "/auditoria", roles: R.for_plus },
    ],
  },
]

/**
 * Rutas que existen y se resuelven (labels, breadcrumbs, redirecciones) pero
 * NO se muestran como opción de menú en ningún rol. "Mis inscripciones" pasa a
 * ser una vista interna de "Agenda de eventos"; "Solicitar acceso" se ofrece
 * desde el Home del colaborador, no desde el menú lateral.
 */
const HIDDEN: RouteDef[] = [
  { key: "misInscripciones", label: "Mis inscripciones", icon: Ticket, href: "/mis-inscripciones", roles: 0 },
  { key: "solicitar", label: "Solicitar acceso", icon: ShieldPlus, href: "/solicitar-acceso", roles: 0 },
]

/**
 * Acción destacada "Crear evento" (no es un ítem de navegación regular: se
 * renderiza como botón principal en el shell para los roles que pueden crear).
 */
export const CREATE_EVENT = {
  key: "crear",
  label: "Crear evento",
  icon: CalendarPlus,
  href: "/crear-evento",
  roles: R.area_promotora | R.for_plus,
} satisfies RouteDef

/** Pantallas ya construidas (todo lo demás es placeholder registrado). */
export const REAL_SCREENS = [
  "inicio",
  "notificaciones",
  "crear",
  "gestion",
  "misEventos",
  "agenda",
  "equipo",
  "accesos",
  "solicitar",
  "calendario",
]

const FLAT = [...NAV.flatMap((g) => g.items), ...HIDDEN, CREATE_EVENT]

/**
 * Prefijos de rutas de detalle que mapean a un ítem del menú (para el activo).
 * Ej.: el detalle integral del evento resalta "Gestión de eventos".
 */
const PREFIX_ALIAS: [string, string][] = [
  ["/editar-evento", "/crear-evento"],
  ["/evento", "/gestion-de-eventos"],
]

export const navForRole = (role: Role): NavGroup[] => {
  const bit = ROLE_BIT[role]
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles & bit) })).filter((g) => g.items.length)
}

export const canCreateEvent = (role: Role): boolean => !!(CREATE_EVENT.roles & ROLE_BIT[role])

export const routeByKey = (key: string): RouteDef | undefined => FLAT.find((i) => i.key === key)
export const routeByHref = (href: string): RouteDef | undefined => {
  const exact = FLAT.find((i) => i.href === href)
  if (exact) return exact
  const alias = PREFIX_ALIAS.find(([p]) => href.startsWith(p))
  if (alias) return FLAT.find((i) => i.href === alias[1])
  return undefined
}
export const labelOf = (key: string): string => routeByKey(key)?.label || "Módulo"
export const iconOf = (key: string): LucideIcon => routeByKey(key)?.icon || Sparkles
export const isReal = (key: string): boolean => REAL_SCREENS.includes(key)

/* ============================================================================
 * REDIRECCIONES — compatibilidad con rutas anteriores.
 * Los módulos que dejaron de ser opciones independientes se reubican dentro de
 * las bandejas (Gestión de eventos / Mis eventos) o del detalle del evento.
 * El destino puede depender del rol activo.
 * ========================================================================== */
export interface RedirectRule {
  /** Destino por defecto. */
  to: string
  /** Destino específico por rol (tiene prioridad sobre `to`). */
  byRole?: Partial<Record<Role, string>>
}

export const REDIRECTS: Record<string, RedirectRule> = {
  "/eventos-por-revisar": { to: "/gestion-de-eventos?tab=por-revisar" },
  "/comite-y-priorizacion": { to: "/gestion-de-eventos?tab=priorizacion" },
  "/inscritos-y-cupos": {
    to: "/mis-eventos",
    byRole: { for_plus: "/gestion-de-eventos?tab=participantes", area_promotora: "/mis-eventos?tab=participantes" },
  },
  "/citaciones": {
    to: "/mis-eventos",
    byRole: { for_plus: "/gestion-de-eventos?tab=citacion", area_promotora: "/mis-eventos?tab=citacion" },
  },
  "/asistencia-y-cierre": {
    to: "/mis-eventos",
    byRole: { for_plus: "/gestion-de-eventos?tab=cierre", area_promotora: "/mis-eventos?tab=cierre" },
  },
  "/periodos": { to: "/administracion?tab=periodos" },
  "/areas": { to: "/administracion?tab=areas" },
  "/eventos-disponibles": { to: "/agenda-de-eventos" },
  "/mis-inscripciones": { to: "/agenda-de-eventos?view=mis-inscripciones" },
  "/personas": { to: "/mi-equipo", byRole: { for_plus: "/administracion?tab=personas" } },
}

export const redirectFor = (path: string, role: Role): string | undefined => {
  const rule = REDIRECTS[path]
  if (!rule) return undefined
  return rule.byRole?.[role] ?? rule.to
}

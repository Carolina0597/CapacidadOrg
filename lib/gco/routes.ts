/* GCO · navegación por rol simplificada */
import { BarChart3, CalendarDays, CalendarPlus, ClipboardCheck, ClipboardList, Compass, Gauge, Inbox, ShieldPlus, UserCog, Users, type LucideIcon } from "lucide-react"
import { ROLE_BIT, type Role } from "./domain"
export interface RouteDef { key:string; label:string; icon:LucideIcon; href:string; roles:number }
export interface NavGroup { group:string; items:RouteDef[] }
const R=ROLE_BIT
export const NAV:NavGroup[]=[
 {group:"Principal",items:[
  {key:"miCapacidad",label:"Mi capacidad",icon:Gauge,href:"/capacidad",roles:R.colaborador|R.lider|R.area_promotora},
  {key:"agenda",label:"Agenda de eventos",icon:Compass,href:"/agenda-de-eventos",roles:R.colaborador},
  {key:"calendario",label:"Calendario",icon:CalendarDays,href:"/calendario",roles:R.lider|R.area_promotora|R.for_plus},
 ]},
 {group:"Gestión",items:[
  {key:"gestion",label:"Gestión de eventos",icon:Inbox,href:"/gestion-de-eventos",roles:R.for_plus},
  {key:"misEventos",label:"Mis eventos",icon:ClipboardList,href:"/mis-eventos",roles:R.area_promotora},
  {key:"equipo",label:"Mi equipo",icon:Users,href:"/mi-equipo",roles:R.lider},
  {key:"aprobaciones",label:"Aprobaciones",icon:ClipboardCheck,href:"/aprobaciones",roles:R.colaborador|R.lider|R.area_promotora|R.for_plus},
 ]},
 {group:"Capacidad y análisis",items:[
  {key:"capacidad",label:"Capacidad",icon:Gauge,href:"/capacidad",roles:R.for_plus},
  {key:"analitica",label:"Analítica",icon:BarChart3,href:"/analitica",roles:R.for_plus},
 ]},
 {group:"Accesos",items:[
  {key:"solicitar",label:"Solicitar acceso",icon:ShieldPlus,href:"/solicitar-acceso",roles:R.colaborador|R.lider|R.area_promotora},
  {key:"accesos",label:"Accesos y roles",icon:UserCog,href:"/solicitudes-de-acceso",roles:R.for_plus},
 ]},
]
export const CREATE_EVENT={key:"crear",label:"Crear evento",icon:CalendarPlus,href:"/crear-evento",roles:R.area_promotora|R.for_plus} satisfies RouteDef
export const REAL_SCREENS=["miCapacidad","agenda","calendario","gestion","misEventos","equipo","aprobaciones","solicitar","accesos","crear","capacidad","analitica"]
const HIDDEN:RouteDef[]=[{key:"inicio",label:"Inicio",icon:Gauge,href:"/",roles:0}]
const FLAT=[...NAV.flatMap(g=>g.items),...HIDDEN,CREATE_EVENT]
const PREFIX_ALIAS:[string,string][]=[["/editar-evento","/crear-evento"],["/evento","/gestion-de-eventos"]]
export const navForRole=(role:Role)=>{const bit=ROLE_BIT[role];return NAV.map(g=>({...g,items:g.items.filter(i=>i.roles&bit)})).filter(g=>g.items.length)}
export const canCreateEvent=(role:Role)=>!!(CREATE_EVENT.roles&ROLE_BIT[role])
export const routeByKey=(key:string)=>FLAT.find(i=>i.key===key)
export const routeByHref=(href:string)=>FLAT.find(i=>i.href===href)||(()=>{const a=PREFIX_ALIAS.find(([p])=>href.startsWith(p));return a?FLAT.find(i=>i.href===a[1]):undefined})()
export const labelOf=(key:string)=>routeByKey(key)?.label||"Módulo"
export const iconOf=(key:string)=>routeByKey(key)?.icon||Gauge
export const isReal=(key:string)=>REAL_SCREENS.includes(key)
export const REDIRECTS:Record<string,{to:string;byRole?:Partial<Record<Role,string>>}>={
 "/eventos-disponibles":{to:"/agenda-de-eventos"},"/mis-inscripciones":{to:"/agenda-de-eventos"},"/eventos-por-revisar":{to:"/gestion-de-eventos"},"/inscritos-y-cupos":{to:"/mis-eventos",byRole:{for_plus:"/gestion-de-eventos",area_promotora:"/mis-eventos"}},"/citaciones":{to:"/mis-eventos"},"/asistencia-y-cierre":{to:"/mis-eventos"},"/periodos":{to:"/solicitudes-de-acceso"},"/areas":{to:"/solicitudes-de-acceso"},"/personas":{to:"/mi-equipo"},"/notificaciones":{to:"/"}
}
export const redirectFor=(path:string,role:Role)=>REDIRECTS[path]?.byRole?.[role]??REDIRECTS[path]?.to

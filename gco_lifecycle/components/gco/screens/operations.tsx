"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Activity, BarChart3, CalendarCheck, Check, ClipboardCheck, Clock, Database, FileCheck2, Gauge, Settings, ShieldCheck, Users, X } from "lucide-react"
import { ACT, ES, ROLE_LABEL, USERS, type ApprovalRequest, type AttendanceStatus, type EventStatus } from "@/lib/gco/domain"
import { A, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, Card, Chip, PageHeader, StatusChip } from "../ui"

const inputStyle = { border: "1px solid var(--gco-border)", borderRadius: 9, padding: "8px 10px", background: "var(--gco-surface)", width: "100%" }
function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card className="p-4"><div className="text-xs" style={{color:"var(--gco-text-3)"}}>{label}</div><div className="text-2xl font-extrabold mt-1">{value}</div>{hint&&<div className="text-[11px] mt-1" style={{color:"var(--gco-text-3)"}}>{hint}</div>}</Card>
}

export function ApprovalsScreen() {
  const approvals = useGco(s=>s.approvals)
  const enrollments = useGco(s=>s.enrollments)
  const events = useGco(s=>s.events)
  const actor = useGco(s=>s.session.userId)
  const [tab,setTab]=useState<ApprovalRequest["estado"]|"todas">("pendiente")
  const [comment,setComment]=useState<Record<string,string>>({})
  const list=approvals.filter(a=>tab==="todas"||a.estado===tab)
  const respond=(id:string,decision:"aprobada"|"rechazada")=>A.respondApproval(id,USERS[actor]?.nombre||actor,decision,comment[id]|| (decision==="aprobada"?"Aprobado":"Rechazado"))
  return <>
    <PageHeader title="Gestión de reservas y aprobaciones" sub="Revisa la solicitud completa y decide desde la misma tarjeta, sin navegar a otras pantallas." />
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">{(["pendiente","aprobada","rechazada","vencida","todas"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className="px-3 py-3 rounded-xl text-xs font-bold text-left" style={{background:tab===t?"var(--gco-navy)":"var(--gco-surface)",color:tab===t?"white":"var(--gco-text-2)",border:"1px solid var(--gco-border)"}}><span className="capitalize">{t}</span><span className="block text-lg mt-1">{t==="todas"?approvals.length:approvals.filter(a=>a.estado===t).length}</span></button>)}</div>
    <div className="space-y-4">{list.map(a=>{const ev=events.find(e=>e.id===a.eventId);const people=a.enrollmentIds.map(id=>enrollments.find(e=>e.id===id)).filter(Boolean) as any[];return <Card key={a.id} className="overflow-hidden">
      <div className="p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-3" style={{background:"var(--gco-surface-2)"}}><div><div className="text-[11px] font-bold uppercase" style={{color:"var(--gco-green-dark)"}}>Solicitud {a.id}</div><div className="font-extrabold text-lg mt-1">{ev?.nombre||a.eventId}</div><div className="text-xs mt-1" style={{color:"var(--gco-text-2)"}}>Área: {ev?.area||"—"} · Fecha: {ev?.fecha||"—"} · Regla: {a.regla} · Límite: {a.fechaLimite||"Sin fecha"}</div>{a.instrucciones&&<div className="text-xs mt-2 rounded-lg p-2" style={{background:"white"}}><b>Instrucciones:</b> {a.instrucciones}</div>}</div><Chip tone={a.estado==="pendiente"?"amber":a.estado==="aprobada"?"green":"red"}>{a.estado}</Chip></div>
      <div className="p-4"><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{people.map(p=><div key={p.id} className="rounded-xl p-3 text-xs" style={{border:"1px solid var(--gco-border)"}}><div className="font-bold text-sm">{USERS[p.userId]?.nombre||p.userId}</div><div className="mt-1">{USERS[p.userId]?.cargo||"Colaborador"} · {USERS[p.userId]?.area||"—"}</div><div className="mt-2 grid grid-cols-2 gap-2"><span>Capacidad actual <b>{p.capacidadAntes} h</b></span><span>Proyectada <b>{p.capacidadProyectada} h</b></span><span>Cruce <b>{p.cruceDetectado?"Sí":"No"}</b></span><span>Sesión <b>{p.sessionIds?.length||1}</b></span></div></div>)}</div>
      {a.estado==="pendiente"&&<div className="mt-4 rounded-xl p-4" style={{background:"var(--gco-blue-soft)"}}><label className="text-xs font-bold">Observación de la decisión</label><textarea value={comment[a.id]||""} onChange={e=>setComment(c=>({...c,[a.id]:e.target.value}))} className="w-full mt-2 rounded-lg p-2 text-sm" rows={2} placeholder="Escribe una observación breve (obligatoria al rechazar)" style={{border:"1px solid var(--gco-border)"}}/><div className="flex flex-wrap gap-2 mt-3"><Btn icon={Check} onClick={()=>respond(a.id,"aprobada")}>Aprobar reserva</Btn><Btn tone="red" icon={X} onClick={()=>{if(!(comment[a.id]||"").trim())return;respond(a.id,"rechazada")}}>Rechazar</Btn><Link href={`/evento/${a.eventId}`} className="px-3 py-2 rounded-lg text-xs font-bold" style={{border:"1px solid var(--gco-border)",background:"white"}}>Ver evento completo</Link></div></div>}
      </div>
    </Card>})}{!list.length&&<Card className="p-10 text-center text-sm">No hay solicitudes en esta vista.</Card>}</div>
  </>
}

export function CapacityScreen() {
  const s=useGco(x=>x)
  const total=20
  const own=s.enrollments.filter(e=>e.userId===s.session.userId)
  const requested=own.reduce((a,e)=>a+Math.max(0,e.capacidadProyectada-e.capacidadAntes),0)
  const committed=own.filter(e=>e.estadoCupo==="aprobado").reduce((a,e)=>a+Math.max(0,e.capacidadProyectada-e.capacidadAntes),0)
  const executed=s.attendance.filter(a=>a.userId===s.session.userId).reduce((a,x)=>a+x.minutosAsistidos/60,0)
  const available=Math.max(0,total-committed)
  const icod=Math.round(available/total*100)
  const byArea=useMemo(()=>Object.entries(s.enrollments.reduce((acc:any,en)=>{const u=USERS[en.userId]; const k=u?.area||"Sin área"; acc[k]=(acc[k]||0)+(en.estadoCupo==="aprobado"?Math.max(0,en.capacidadProyectada-en.capacidadAntes):0); return acc},{})),[s.enrollments])
  return <><PageHeader title="Capacidad organizacional" sub="Horas solicitadas, comprometidas, ejecutadas y disponibles derivadas del flujo real."/><div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5"><Kpi label="Capacidad mensual" value={`${total} h`}/><Kpi label="Solicitadas" value={`${requested.toFixed(1)} h`}/><Kpi label="Comprometidas" value={`${committed.toFixed(1)} h`}/><Kpi label="Ejecutadas" value={`${executed.toFixed(1)} h`}/><Kpi label="ICOD disponible" value={`${icod}%`}/></div><Card className="p-5"><h3 className="font-bold mb-4">Mapa por área</h3><div className="space-y-3">{byArea.map(([area,h]:any)=><div key={area}><div className="flex justify-between text-xs mb-1"><span>{area}</span><b>{Number(h).toFixed(1)} h</b></div><div className="h-2 rounded-full" style={{background:"var(--gco-surface-2)"}}><div className="h-2 rounded-full" style={{width:`${Math.min(100,Number(h)/20*100)}%`,background:Number(h)>20?"var(--gco-red)":"var(--gco-green)"}}/></div></div>)}{!byArea.length&&<p className="text-sm">Aún no hay cupos aprobados.</p>}</div></Card></>
}

export function AnalyticsScreen() {
  const s=useGco(x=>x)
  const total=s.events.length, open=s.events.filter(e=>e.estado==="inscripciones_abiertas").length
  const seats=s.enrollments.filter(e=>e.estadoCupo==="aprobado").length
  const attended=s.attendance.filter(a=>a.estado==="asistio"||a.estado==="parcial").length
  const noShow=s.attendance.filter(a=>a.estado==="no_asistio").length
  const sat=s.satisfaction.length?s.satisfaction.reduce((a,x)=>a+x.satisfaccionGeneral,0)/s.satisfaction.length:0
  const types=Object.entries(s.events.reduce((a:any,e)=>{const k=e.tipo?ACT[e.tipo][0]:"Sin tipo";a[k]=(a[k]||0)+1;return a},{}))
  return <><PageHeader title="Analítica" sub="Indicadores derivados de eventos, inscripciones, cupos, asistencia y satisfacción."/><div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5"><Kpi label="Eventos" value={total}/><Kpi label="Inscripciones abiertas" value={open}/><Kpi label="Inscripciones" value={s.enrollments.length}/><Kpi label="Cupos asignados" value={seats}/><Kpi label="No-show" value={noShow}/><Kpi label="Satisfacción" value={sat?sat.toFixed(1):"—"}/></div><div className="grid lg:grid-cols-2 gap-4"><Card className="p-5"><h3 className="font-bold mb-4">Eventos por tipo</h3>{types.map(([k,v]:any)=><div key={k} className="flex justify-between py-2 border-b text-sm"><span>{k}</span><b>{v}</b></div>)}</Card><Card className="p-5"><h3 className="font-bold mb-4">Ejecución</h3><div className="grid grid-cols-2 gap-3"><Kpi label="Con asistencia" value={attended}/><Kpi label="No asistieron" value={noShow}/><Kpi label="Encuestas" value={s.satisfaction.length}/><Kpi label="Cerrados" value={s.events.filter(e=>e.estado==="cerrado").length}/></div></Card></div></>
}

export function AdministrationScreen() {
 const periods=useGco(s=>s.periodConfigurations); const standards=useGco(s=>s.capacityStandards)
 return <><PageHeader title="Administración" sub="Parametrización funcional de periodos, capacidad, catálogos y permisos."/><div className="grid lg:grid-cols-2 gap-4"><Card className="p-5"><div className="flex items-center gap-2 mb-4"><CalendarCheck size={18}/><h3 className="font-bold">Periodos</h3></div>{periods.map(p=><div key={p.id} className="py-3 border-b text-sm"><div className="flex justify-between"><b>{p.nombre}</b><Chip tone={p.estado==="activo"?"green":"neutral"}>{p.estado}</Chip></div><div className="text-xs mt-1" style={{color:"var(--gco-text-2)"}}>Inscripción: {p.fechaAperturaInscripcion} → {p.fechaCierreInscripcion}</div></div>)}</Card><Card className="p-5"><div className="flex items-center gap-2 mb-4"><Gauge size={18}/><h3 className="font-bold">Estándares de capacidad</h3></div>{standards.map(x=><div key={x.id} className="rounded-lg p-4" style={{background:"var(--gco-surface-2)"}}><b>{x.nombre}</b><div className="text-xs mt-2">{x.horasMensuales} h/mes · {x.horasAnuales} h/año</div><div className="text-xs">Preventivo desde {x.umbralPreventivo}% · Crítico desde {x.umbralSobreCapacidad}%</div></div>)}</Card></div><Card className="p-5 mt-4"><h3 className="font-bold mb-3">Catálogos configurables</h3><div className="flex flex-wrap gap-2">{["Usuarios y permisos","Áreas promotoras","Tipologías y subtipos","Táctica","Comunicaciones","Plantillas de notificación","Encuestas"].map(x=><Chip key={x} tone="blue">{x}</Chip>)}</div></Card></>
}

export function AuditScreen() {
 const audit=useGco(s=>s.audit); const [q,setQ]=useState("")
 const list=audit.filter(a=>`${a.actor} ${a.action} ${a.entity} ${a.entityId}`.toLowerCase().includes(q.toLowerCase()))
 return <><PageHeader title="Auditoría" sub="Trazabilidad de decisiones, estados y cambios funcionales." right={<input style={{...inputStyle,width:260}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar actor, acción o entidad"/>}/><Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead style={{background:"var(--gco-surface-2)"}}><tr>{["Fecha","Actor","Acción","Entidad","ID","Resultado","Comentario"].map(h=><th key={h} className="text-left p-3 text-xs">{h}</th>)}</tr></thead><tbody>{list.map(a=><tr key={a.id} className="border-t"><td className="p-3 text-xs">{a.ts.slice(0,16).replace("T"," ")}</td><td className="p-3">{USERS[a.actor]?.nombre||a.actor}</td><td className="p-3 font-mono text-xs">{a.action}</td><td className="p-3">{a.entity}</td><td className="p-3 text-xs">{a.entityId}</td><td className="p-3">{a.after||"—"}</td><td className="p-3">{a.comment||"—"}</td></tr>)}</tbody></table></div>{!list.length&&<div className="p-10 text-center text-sm">No hay registros.</div>}</Card></>
}

export function CitationsScreen() {
 const s=useGco(x=>x); const actor=s.session.userId
 const eligible=s.enrollments.filter(e=>e.estadoCupo==="aprobado"&&e.estadoCitacion!=="enviada")
 return <><PageHeader title="Citaciones" sub="Prepara, envía y controla citaciones de personas con cupo asignado."/><div className="grid lg:grid-cols-3 gap-4"><Card className="p-5 lg:col-span-2"><h3 className="font-bold mb-4">Pendientes de citar</h3>{eligible.map(en=>{const ev=s.events.find(x=>x.id===en.eventId);return <div key={en.id} className="flex items-center justify-between py-3 border-b"><div><b>{USERS[en.userId]?.nombre}</b><div className="text-xs">{ev?.nombre}</div></div><Btn sm onClick={()=>A.createCitations(en.eventId,[en.id],actor,{tipo:"automatica",link:"https://teams.microsoft.com/"})}>Enviar citación</Btn></div>})}{!eligible.length&&<p className="text-sm">No hay personas pendientes.</p>}</Card><Card className="p-5"><h3 className="font-bold mb-4">Estados</h3>{["enviada","error","programada","cancelada"].map(st=><div key={st} className="flex justify-between py-2 text-sm"><span>{st}</span><b>{s.citations.filter(c=>c.estado===st).length}</b></div>)}</Card></div></>
}

export function AttendanceClosureScreen() {
 const s=useGco(x=>x); const actor=s.session.userId
 const active=s.events.filter(e=>["citado","en_ejecucion","pendiente_cierre"].includes(e.estado))
 return <><PageHeader title="Asistencia y cierre" sub="Registra ejecución, satisfacción y cierre administrativo."/><div className="space-y-4">{active.map(ev=>{const ens=s.enrollments.filter(e=>e.eventId===ev.id&&e.estadoCupo==="aprobado");return <Card key={ev.id} className="p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{ev.nombre}</h3><StatusChip map={ES} k={ev.estado}/></div><BtnSoft sm onClick={()=>A.closeEvent(ev.id,actor,"Cierre validado")}>Cerrar evento</BtnSoft></div><div className="mt-4 space-y-2">{ens.map(en=><div key={en.id} className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center border-t pt-2"><span className="text-sm">{USERS[en.userId]?.nombre}</span><button className="text-xs px-3 py-2 rounded-lg" style={{background:"var(--gco-green-soft)"}} onClick={()=>A.recordAttendance(ev.id,en.userId,"asistio",actor,120)}>Asistió</button><button className="text-xs px-3 py-2 rounded-lg" style={{background:"var(--gco-amber-soft)"}} onClick={()=>A.recordAttendance(ev.id,en.userId,"parcial",actor,60)}>Parcial</button><button className="text-xs px-3 py-2 rounded-lg" style={{background:"var(--gco-red-soft)"}} onClick={()=>A.recordAttendance(ev.id,en.userId,"no_asistio",actor,0)}>No asistió</button></div>)}</div></Card>})}{!active.length&&<Card className="p-10 text-center">No hay eventos en ejecución o pendientes de cierre.</Card>}</div></>
}

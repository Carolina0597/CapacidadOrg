"use client"

import { AlertTriangle, CheckCircle2, PencilLine } from "lucide-react"
import { ACT } from "@/lib/gco/domain"
import { detectConflicts, horasPersona, missingForSend, targetPopulation, totalDuration, type EventModel } from "@/lib/gco/event-form"
import { Chip } from "../ui"

function Section({n,title,goto,children}:{n:number;title:string;goto:(n:number)=>void;children:React.ReactNode}){
  return <section className="rounded-xl p-4" style={{border:"1px solid var(--gco-border)"}}><div className="flex justify-between mb-3"><h4 className="font-bold text-sm">{title}</h4><button type="button" onClick={()=>goto(n)} className="text-xs font-bold flex items-center gap-1" style={{color:"var(--gco-green-dark)"}}><PencilLine size={13}/>Editar</button></div>{children}</section>
}
function DL({items}:{items:[string,string][]}){return <div className="grid sm:grid-cols-2 gap-x-6">{items.map(([k,v])=><div key={k} className="flex justify-between gap-3 py-2 border-b text-xs"><span style={{color:"var(--gco-text-3)"}}>{k}</span><b className="text-right">{v||"—"}</b></div>)}</div>}

export function EventReview({m,goto}:{m:EventModel;set:(p:Partial<EventModel>)=>void;goto:(s:number)=>void}){
  const missing=missingForSend(m), conflicts=detectConflicts(m), duration=totalDuration(m), people=targetPopulation(m)
  return <div className="space-y-4">
    <div className="rounded-xl p-4 flex gap-3" style={{background:missing.length?"var(--gco-amber-soft)":"var(--gco-green-soft)"}}>{missing.length?<AlertTriangle size={20}/>:<CheckCircle2 size={20}/>}<div><b>{missing.length?`${missing.length} dato(s) por completar`:"Evento listo para enviar"}</b><p className="text-xs mt-1">{missing.length?"Completa únicamente los campos base marcados.":"For+ revisará y asignará el periodo al aprobar."}</p></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Duración",`${duration} h`],["Sesiones",String(m.sesiones.length)],["Público estimado",people?String(people):"—"],["Horas-persona",horasPersona(m)?horasPersona(m).toLocaleString("es-CO"):"—"]].map(([k,v])=><div key={k} className="rounded-xl p-3" style={{background:"var(--gco-surface-2)"}}><div className="text-[11px]" style={{color:"var(--gco-text-3)"}}>{k}</div><div className="font-extrabold text-lg">{v}</div></div>)}</div>
    <Section n={1} title="1. Información del evento" goto={goto}><DL items={[["Nombre",m.nombre],["Áreas",[m.areaPrincipal,...m.areasAdicionales].filter(Boolean).join(", ")],["Responsable",m.responsable],["Obligatorio",m.obligatorioColaborador?"Sí":"No"],["Tipo",m.tipo==="otras"?(m.tipoOtro||"Otras"):(m.tipo?ACT[m.tipo][0]:"")],["Prioridad automática",m.prioridad],["Descripción",m.descripcion]]}/></Section>
    <Section n={2} title="2. Público y modalidad" goto={goto}><DL items={[["Modalidad",m.modalidad],["Público",m.scopes[0]==="todo"?"Todo Sistecrédito":m.scopes[0]==="areas"?m.areasImpactadas.join(", "):m.scopes[0]==="cargos"?m.cargos.join(", "):`${m.personas.filter(p=>p.valido).length} personas seleccionadas`],["Carga de personas",m.personas.length?`${m.personas.filter(p=>p.valido).length} válidas · ${m.personas.filter(p=>!p.valido).length} con error`:"No aplica"]]}/></Section>
    <Section n={3} title="3. Programación" goto={goto}><div className="space-y-2">{m.sesiones.map((s,i)=><div key={s.id} className="grid sm:grid-cols-4 gap-2 rounded-lg p-3 text-xs" style={{background:"var(--gco-surface-2)"}}><b>{m.sesiones.length>1?`Sesión ${i+1}`:"Fecha y hora"}</b><span>{s.fecha||"Sin fecha"}</span><span>{s.ini}–{s.fin}</span><span>{hours(s.ini,s.fin)} h</span></div>)}</div><div className="mt-3"><Chip tone={conflicts.length?"red":"green"}>{conflicts.length?`${conflicts.length} cruce(s) detectado(s)`:"Sin cruces"}</Chip></div></Section>
    <Section n={4} title="4. Cupos, inscripción y apoyo" goto={goto}><DL items={[["Requiere cupos",m.requiereCupos?"Sí":"No"],["Cantidad",m.requiereCupos?m.cuposTotales:"No aplica"],["Requiere inscripción",m.requiereInscripcion?"Sí":"No"],["Lugar / plataforma",m.lugarPlataforma],["Detalle",m.auditorio||m.enlace||m.sede||m.direccionExterna],["Apoyo For+",m.apoyoForPlus?(m.tipoApoyo||"Sí"):"No"],["Pieza",m.piezaEvento?.nombre||"No adjunta"]]}/></Section>
  </div>
}
function hours(a:string,b:string){const [h1,m1]=a.split(":").map(Number),[h2,m2]=b.split(":").map(Number);return Math.max(0,Math.round(((h2*60+m2-h1*60-m1)/60)*100)/100)}

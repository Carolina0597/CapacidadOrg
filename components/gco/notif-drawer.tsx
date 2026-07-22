"use client"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, CheckCheck, Mail, X } from "lucide-react"
import { seed, type Notification, type Role } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"

function actionHref(n:Notification){
 if(n.kind==="aprobacion") return "/aprobaciones"
 if(n.rel?.startsWith("EVT")) return `/evento/${n.rel}`
 return "/solicitar-acceso"
}
export function NotifDrawer({open,onClose,role}:{open:boolean;onClose:()=>void;role:Role}){
 const user=useGco(sel.user)
 const mine=useGco(sel.notifsFor(role,user.correo))
 const templates=useMemo(()=>seed().notifications.filter(n=>n.esPlantilla),[])
 const [selected,setSelected]=useState<Notification|null>(null)
 const myEmails=useMemo(()=>mine.filter(n=>!n.esPlantilla),[mine])
 const [tab,setTab]=useState<"mine"|"examples">("examples")
 const list=useMemo(()=>tab==="mine"?myEmails:templates,[tab,myEmails,templates])
 if(!open)return null
 return <div className="fixed inset-0" style={{zIndex:50}}><button className="absolute inset-0 bg-slate-950/40" onClick={onClose}/><aside className="absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white flex flex-col shadow-2xl">
  <div className="p-5 border-b flex items-center justify-between"><div className="flex items-center gap-3">{selected&&<button onClick={()=>setSelected(null)} aria-label="Volver"><ArrowLeft/></button>}<div><h3 className="font-extrabold">{selected?"Vista previa del correo":"Correos simulados del flujo"}</h3><p className="text-xs mt-1" style={{color:"var(--gco-text-3)"}}>{selected?"Así llegaría el mensaje al destinatario.":"Ejemplos y avisos que se enviarían por correo corporativo."}</p></div></div><div className="flex gap-2">{!selected&&<button onClick={()=>A.markAllRead(role,user.correo)} className="text-xs font-bold"><CheckCheck size={14} className="inline mr-1"/>Marcar todos</button>}<button onClick={onClose}><X/></button></div></div>
  {!selected?<div className="flex-1 overflow-y-auto"><div className="sticky top-0 z-10 bg-white border-b p-3 flex gap-2"><button onClick={()=>setTab("mine")} className="px-3 py-2 rounded-lg text-xs font-bold" style={{background:tab==="mine"?"var(--gco-navy)":"var(--gco-surface-2)",color:tab==="mine"?"white":"var(--gco-text)"}}>Mis correos ({myEmails.length})</button><button onClick={()=>setTab("examples")} className="px-3 py-2 rounded-lg text-xs font-bold" style={{background:tab==="examples"?"var(--gco-navy)":"var(--gco-surface-2)",color:tab==="examples"?"white":"var(--gco-text)"}}>Todos los ejemplos ({templates.length})</button></div>{list.map(n=><button key={n.id} className="w-full text-left p-4 border-b" style={{background:n.leida?"white":"var(--gco-surface-2)"}} onClick={()=>{A.markRead(n.id);setSelected(n)}}><div className="flex gap-3"><span className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{background:"var(--gco-blue-soft)"}}><Mail size={18}/></span><div className="flex-1 min-w-0"><div className="flex justify-between gap-3"><b className="text-sm">{n.asunto||n.titulo}</b><span className="text-[10px] whitespace-nowrap">{new Date(n.fecha).toLocaleString("es-CO")}</span></div><div className="text-xs mt-1">De: {n.remitente||"Gestión de Capacidad Organizacional"}</div><p className="text-sm mt-2 line-clamp-2">{n.preheader||n.descripcion}</p><div className="mt-2 text-[11px]" style={{color:"var(--gco-text-3)"}}>Se activa cuando: {n.activador||"ocurre esta acción en el flujo"}</div></div></div></button>)}{!list.length&&<div className="p-12 text-center text-sm">No hay correos simulados para este usuario.</div>}</div>:
  <div className="flex-1 overflow-y-auto p-5 bg-slate-100"><article className="bg-white rounded-2xl shadow-sm overflow-hidden"><div className="p-5 border-b"><div className="text-xl font-extrabold" style={{color:"var(--gco-navy)"}}>siste<span style={{color:"var(--gco-green)"}}>crédito</span> <span className="text-base">· For+</span></div></div><div className="p-6"><h2 className="text-xl font-extrabold mb-4">{selected.asunto||selected.titulo}</h2><div className="text-xs space-y-1 mb-5" style={{color:"var(--gco-text-2)"}}><div><b>De:</b> {selected.remitente||"Gestión de Capacidad Organizacional"}</div><div><b>Para:</b> {selected.destinatarioCorreo||user.correo}</div><div><b>Asunto:</b> {selected.asunto||selected.titulo}</div></div><div className="whitespace-pre-line text-sm leading-7">{selected.cuerpo||selected.descripcion}</div>{selected.rel&&<Link href={actionHref(selected)} onClick={onClose} className="inline-flex mt-6 px-5 py-3 rounded-xl text-white font-bold" style={{background:"var(--gco-green)"}}>{selected.ctaLabel||"Abrir en la aplicación"}</Link>}<div className="mt-8 pt-5 border-t text-xs" style={{color:"var(--gco-text-3)"}}>Mensaje automático de Gestión de Capacidad Organizacional. No respondas a este correo.</div></div></article><div className="mt-4 rounded-xl p-4 bg-white border text-xs"><b>Momento del flujo:</b> {selected.activador||"Acción del proceso"}</div></div>}
 </aside></div>
}

"use client"
import { useMemo, useState } from "react"
import { CheckCircle2, Clock3, FileText, PlusCircle, Send } from "lucide-react"
import { AS } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Btn, Card, Chip, Label, PageHeader, StatusChip, TextArea, TextInput } from "../ui"
const TIPOS=["Formación","Sensibilización","Experiencias","Asesorías","Otro"]
export function SolicitarAcceso(){
 const user=useGco(sel.user); const mine=useGco(sel.accessByUser(user.nombre)); const [tab,setTab]=useState<"nueva"|"estado">("nueva")
 const [comunidad,setComunidad]=useState(user.area||""); const [tipos,setTipos]=useState<string[]>([]); const [responsable,setResponsable]=useState(user.lider||""); const [justificacion,setJustificacion]=useState(""); const [ok,setOk]=useState("")
 const toggle=(t:string)=>setTipos(v=>v.includes(t)?v.filter(x=>x!==t):[...v,t])
 const send=()=>{if(!comunidad.trim()||!responsable.trim()||!justificacion.trim())return;A.createAccessRequest({id:"",solicitante:user.nombre,correo:user.correo,cargo:user.cargo,area:user.area,vp:user.vp,comunidad,tipos,roles:[],responsable,fechaInicio:"",vigencia:"Definida por For+",justificacion,observaciones:"",adjuntos:[]} as any,user.nombre,false);setOk("Solicitud enviada. Podrás consultar el estado aquí y recibirás el correo simulado en el sobre.");setTab("estado")}
 return <>
  <PageHeader title="Solicitar acceso" sub="Solicita habilitación como Área promotora o administrador For+. La decisión y el rol final los define For+."/>
  <div className="flex gap-2 mb-4"><button onClick={()=>setTab("nueva")} className="px-4 py-2 rounded-lg text-sm font-bold" style={{background:tab==="nueva"?"var(--gco-green)":"white",color:tab==="nueva"?"white":"var(--gco-text-2)",border:"1px solid var(--gco-border)"}}><PlusCircle size={15} className="inline mr-2"/>Nueva solicitud</button><button onClick={()=>setTab("estado")} className="px-4 py-2 rounded-lg text-sm font-bold" style={{background:tab==="estado"?"var(--gco-green)":"white",color:tab==="estado"?"white":"var(--gco-text-2)",border:"1px solid var(--gco-border)"}}><Clock3 size={15} className="inline mr-2"/>Mis solicitudes ({mine.length})</button></div>
  {tab==="nueva"?<Card className="max-w-3xl p-5 space-y-5">
   {ok&&<div className="p-3 rounded-xl flex gap-2" style={{background:"var(--gco-green-soft)",color:"var(--gco-green-dark)"}}><CheckCircle2 size={17}/>{ok}</div>}
   <div className="grid md:grid-cols-2 gap-4 rounded-xl p-4" style={{background:"var(--gco-surface-2)"}}><div><div className="text-xs">Solicitante</div><b>{user.nombre}</b><div className="text-xs">{user.correo}</div></div><div><div className="text-xs">Perfil actual</div><b>{user.cargo}</b><div className="text-xs">{user.area}</div></div></div>
   <div><Label required>Área o comunidad que gestionará</Label><TextInput value={comunidad} onChange={setComunidad}/></div>
   <div><Label>Tipo de espacios</Label><div className="flex flex-wrap gap-2 mt-2">{TIPOS.map(t=><button key={t} onClick={()=>toggle(t)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{border:"1px solid var(--gco-border)",background:tipos.includes(t)?"var(--gco-green-soft)":"white"}}>{t}</button>)}</div></div>
   <div><Label required>Responsable que respalda</Label><TextInput value={responsable} onChange={setResponsable}/></div>
   <div><Label required>Justificación</Label><TextArea value={justificacion} onChange={setJustificacion} placeholder="Explica brevemente por qué necesitas gestionar eventos"/></div>
   <div className="flex justify-end"><Btn icon={Send} onClick={send}>Enviar solicitud</Btn></div>
  </Card>:<div className="space-y-3">{mine.map(r=><Card key={r.id} className="p-5"><div className="flex flex-col md:flex-row md:items-start gap-3"><div className="flex-1"><div className="flex items-center gap-2"><FileText size={17}/><b>{r.comunidad}</b><StatusChip map={AS} k={r.estado}/></div><p className="text-sm mt-2">{r.justificacion}</p><div className="text-xs mt-2" style={{color:"var(--gco-text-3)"}}>Enviada: {r.createdAt.slice(0,10)} · Responsable: {r.responsable}</div>{r.observaciones&&<div className="mt-3 rounded-lg p-3 text-sm" style={{background:"var(--gco-surface-2)"}}><b>Observación de For+:</b> {r.observaciones}</div>}</div><div className="md:text-right"><div className="text-xs">Rol definido</div><b>{r.permisosFinales?.join(", ")||"Pendiente de decisión"}</b></div></div></Card>)}{!mine.length&&<Card className="p-10 text-center">Aún no tienes solicitudes.</Card>}</div>}
 </>
}

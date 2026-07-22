"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Eye, Search, ShieldCheck, Trash2, UserCog, X } from "lucide-react"
import { AS, type AccessRequest } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, Card, Chip, Label, Modal, PageHeader, Select, StatusChip, TextArea } from "../ui"

const ROLE_OPTIONS = ["Área promotora", "Administrador For+"]
const roleCode=(label:string)=>label==="Administrador For+"?"for_plus":"area_promotora"
const roleLabel=(code:string)=>code==="for_plus"?"Administrador For+":"Área promotora"

export function SolicitudesAcceso(){
  const requests=useGco(sel.accessInbox)
  const grants=useGco(s=>s.grants)
  const actor=useGco(s=>s.session.userId)
  const [tab,setTab]=useState<"pendientes"|"vigentes"|"historial">("pendientes")
  const [q,setQ]=useState("")
  const [detail,setDetail]=useState<AccessRequest|null>(null)
  const [role,setRole]=useState("Área promotora")
  const [comment,setComment]=useState("")
  const [toast,setToast]=useState("")
  const pending=requests.filter(r=>["enviada","revision"].includes(r.estado))
  const historic=requests.filter(r=>!["enviada","revision"].includes(r.estado))
  const grantRows=Object.entries(grants).flatMap(([name,items])=>items.map(g=>({name,...g})))
  const needle=q.toLowerCase()
  const rows=(tab==="pendientes"?pending:historic).filter(r=>!needle||`${r.solicitante} ${r.comunidad}`.toLowerCase().includes(needle))
  const flash=(m:string)=>{setToast(m);setTimeout(()=>setToast(""),3000)}
  const approve=()=>{if(!detail)return;A.transitionAccess(detail.id,"aprobada",actor,{permisosFinales:[roleCode(role)],vigenciaFinal:"Vigente hasta revocación",comentario:comment||`Rol asignado: ${role}`});setDetail(null);flash("Acceso aprobado y rol asignado.")}
  return <>
    <PageHeader title="Accesos y roles" sub="Aprueba solicitudes y administra en el mismo lugar los accesos vigentes." />
    {toast&&<div className="mb-4 p-3 rounded-xl flex gap-2" style={{background:"var(--gco-green-soft)",color:"var(--gco-green-dark)"}}><CheckCircle2 size={17}/>{toast}</div>}
    <div className="flex gap-2 mb-4 flex-wrap">{[["pendientes","Solicitudes por decidir",pending.length],["vigentes","Accesos vigentes",grantRows.length],["historial","Historial",historic.length]].map(([k,l,n])=><button key={k} onClick={()=>setTab(k as any)} className="px-4 py-2 rounded-full text-sm font-bold" style={{background:tab===k?"var(--gco-navy)":"white",color:tab===k?"white":"var(--gco-text-2)",border:"1px solid var(--gco-border)"}}>{l} · {n}</button>)}</div>
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 max-w-md" style={{background:"white",border:"1px solid var(--gco-border)"}}><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} className="outline-none flex-1 text-sm" placeholder="Buscar persona o comunidad"/></div>
    {tab==="vigentes"?<Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"var(--gco-surface-2)"}}>{["Persona","Comunidad","Rol","Vigencia","Acciones"].map(h=><th className="p-3 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{grantRows.map(g=><tr key={g.reqId} className="border-t"><td className="p-3 font-bold">{g.name}</td><td className="p-3">{g.comunidad}</td><td className="p-3"><Select value={roleLabel(g.permisos[0])} onChange={v=>A.changeGrantRole(g.name,g.reqId,roleCode(v),actor)} options={ROLE_OPTIONS}/></td><td className="p-3">{g.vigencia}</td><td className="p-3"><button onClick={()=>A.revokeGrant(g.name,g.reqId,actor)} className="text-red-600 font-bold inline-flex gap-1"><Trash2 size={14}/>Retirar acceso</button></td></tr>)}</tbody></table>{!grantRows.length&&<div className="p-10 text-center">No hay accesos vigentes.</div>}</Card>:
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"var(--gco-surface-2)"}}>{["Solicitante","Área/comunidad","Responsable","Motivo","Estado",""].map(h=><th className="p-3 text-left" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3"><b>{r.solicitante}</b><div className="text-xs">{r.cargo} · {r.area}</div></td><td className="p-3">{r.comunidad}</td><td className="p-3">{r.responsable}</td><td className="p-3 max-w-xs truncate">{r.justificacion}</td><td className="p-3"><StatusChip map={AS} k={r.estado}/></td><td className="p-3"><button onClick={()=>{if(r.estado==="enviada")A.transitionAccess(r.id,"revision",actor);setDetail(r);setRole("Área promotora");setComment("")}} className="font-bold text-green-700 inline-flex gap-1"><Eye size={14}/>Revisar</button></td></tr>)}</tbody></table>{!rows.length&&<div className="p-10 text-center">No hay registros.</div>}</Card>}
    <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?`Solicitud de ${detail.solicitante}`:""} w={680} footer={detail&&["enviada","revision"].includes(detail.estado)?<><BtnSoft onClick={()=>{A.transitionAccess(detail.id,"devuelta",actor,{comentario:comment||"Requiere información adicional"});setDetail(null)}}>Devolver</BtnSoft><Btn tone="red" onClick={()=>{if(!comment.trim())return;A.transitionAccess(detail.id,"rechazada",actor,{comentario:comment});setDetail(null)}}>Rechazar</Btn><Btn onClick={approve}>Aprobar acceso</Btn></>:<BtnSoft onClick={()=>setDetail(null)}>Cerrar</BtnSoft>}>
      {detail&&<div className="space-y-5"><div className="grid md:grid-cols-2 gap-4">{[["Correo",detail.correo],["Cargo",detail.cargo],["Área",detail.area],["Vicepresidencia",detail.vp],["Comunidad solicitada",detail.comunidad],["Responsable",detail.responsable]].map(([l,v])=><div key={l}><div className="text-xs uppercase" style={{color:"var(--gco-text-3)"}}>{l}</div><b>{v||"—"}</b></div>)}</div><div><div className="text-xs uppercase">Tipos de espacio</div><div className="flex gap-2 mt-1 flex-wrap">{detail.tipos.map(t=><Chip key={t}>{t}</Chip>)}</div></div><div><div className="text-xs uppercase">Justificación</div><p className="mt-1">{detail.justificacion}</p></div>{["enviada","revision"].includes(detail.estado)&&<><div><Label>Rol que otorgará For+</Label><Select value={role} onChange={setRole} options={ROLE_OPTIONS}/></div><div><Label>Observaciones de la decisión</Label><TextArea value={comment} onChange={setComment}/></div></>}</div>}
    </Modal>
  </>
}

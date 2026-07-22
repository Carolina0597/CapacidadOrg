"use client"

import { useMemo, useState } from "react"
import { BarChart3, CalendarCheck, CircleCheckBig, Gauge, HeartPulse, Info, Target, Users } from "lucide-react"
import { ACT, CAPACIDAD_MENSUAL_HORAS, TEAM_RISK_LABEL, USERS, teamRisk } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, Card, Chip, Modal, PageHeader } from "../ui"

const palette=["#2563eb","#65a30d","#f59e0b","#7c3aed","#0891b2","#e11d48"]
function pct(a:number,b:number){return b?Math.round(a/b*100):0}

export function MiEquipo(){
  const state=useGco(s=>s)
  const team=sel.team(state)
  const leader=USERS[state.session.userId]
  const [selectedId,setSelectedId]=useState<string>("todos")
  const [help,setHelp]=useState(false)
  const members=team.members.map(m=>({member:m,user:Object.values(USERS).find(u=>u.nombre===m.nombre)})).filter(x=>x.user)
  const selected=members.find(x=>x.user?.id===selectedId)

  const rows=useMemo(()=>members.map(({member,user})=>{
    const ens=state.enrollments.filter(e=>e.userId===user!.id)
    const events=ens.map(en=>({en,ev:state.events.find(e=>e.id===en.eventId),at:state.attendance.find(a=>a.eventId===en.eventId&&a.userId===en.userId)}))
    const projected=events.reduce((a,x)=>a+Math.max(0,Number(x.en.capacidadProyectada||0)-Number(x.en.capacidadAntes||0)||2),member.horasMes)
    const executed=events.reduce((a,x)=>a+(x.at&&["asistio","parcial"].includes(x.at.estado)?Number(x.at.minutosAsistidos||0)/60:0),Math.max(0,member.horasMes-3))
    const categories=events.reduce((acc:Record<string,number>,x)=>{const k=x.ev?.tipo?ACT[x.ev.tipo][0]:"Otros";acc[k]=(acc[k]||0)+2;return acc},{})
    const [risk,tone]=teamRisk(projected)
    return {member,user:user!,events,projected,executed,categories,risk,tone}
  }),[members,state.enrollments,state.events,state.attendance])

  const view=selected?rows.filter(x=>x.user.id===selectedId):rows
  const capacity=view.length*CAPACIDAD_MENSUAL_HORAS
  const projected=view.reduce((a,x)=>a+x.projected,0)
  const executed=view.reduce((a,x)=>a+x.executed,0)
  const available=Math.max(0,capacity-projected)
  const pending=view.reduce((a,x)=>a+x.member.pendientes,0)
  const averageAttendance=view.length?Math.round(view.reduce((a,x)=>a+x.member.asistencia,0)/view.length):0
  const categoryTotals=view.reduce((acc:Record<string,number>,x)=>{Object.entries(x.categories).forEach(([k,v])=>acc[k]=(acc[k]||0)+v);return acc},{})
  const categoryEntries=Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1])
  const totalCat=categoryEntries.reduce((a,[,v])=>a+v,0)||1
  let cursor=0;const donut=categoryEntries.map(([,v],i)=>{const f=cursor;cursor+=v/totalCat*100;return `${palette[i%palette.length]} ${f}% ${cursor}%`}).join(", ")||"#e5e7eb 0 100%"
  const health=projected/capacity<.7?{label:"Saludable",color:"#15803d",bg:"#effaf0"}:projected/capacity<.9?{label:"Preventivo",color:"#a16207",bg:"#fff9e8"}:{label:"Alta ocupación",color:"#be123c",bg:"#fff1f2"}

  const selectedDetails=selected?state.enrollments.filter(e=>e.userId===selected.user!.id).map(en=>({en,ev:state.events.find(e=>e.id===en.eventId),ap:state.approvals.find(a=>a.enrollmentIds.includes(en.id)),at:state.attendance.find(a=>a.eventId===en.eventId&&a.userId===en.userId)})):[]

  return <>
    <PageHeader title="Radiografía de capacidad de mi equipo" sub="Consulta la salud general del equipo, los programas con mayor participación y la radiografía individual de cada talento." right={<div className="flex gap-2"><select className="rounded-xl border px-3 py-2 text-sm" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="todos">Todo el equipo</option>{members.map(x=><option key={x.user!.id} value={x.user!.id}>{x.user!.nombre}</option>)}</select><button onClick={()=>setHelp(true)} className="rounded-xl border px-3 py-2 text-sm inline-flex items-center gap-2"><Info size={16}/>¿Cómo se calcula?</button></div>}/>
    <Modal open={help} onClose={()=>setHelp(false)} title="¿Cómo leer la capacidad del equipo?" size="lg"><div className="space-y-3 text-sm"><p>La vista suma las horas proyectadas y ejecutadas de los talentos filtrados.</p><ul className="list-disc pl-5 space-y-2"><li><b>Proyectadas:</b> eventos inscritos, invitados o aprobados.</li><li><b>Ejecutadas:</b> horas de asistencia confirmada.</li><li><b>Salud:</b> comparación de horas proyectadas frente a 20 horas mensuales por persona.</li><li><b>Concentración:</b> programas o tipos de actividad con mayor número de horas.</li></ul></div></Modal>

    <div className="grid xl:grid-cols-[1.25fr_repeat(4,1fr)] gap-3 mb-4">
      <Card className="p-5 flex items-center gap-4">{selected?<img src={selected.user!.foto||"/placeholder-user.jpg"} className="w-20 h-20 rounded-full object-cover border-4" style={{borderColor:"var(--gco-green-soft)"}}/>:<div className="w-20 h-20 rounded-full grid place-items-center" style={{background:"var(--gco-green-soft)",color:"var(--gco-green-dark)"}}><Users size={34}/></div>}<div><div className="text-xs uppercase" style={{color:"var(--gco-text-3)"}}>{selected?"Talento seleccionado":"Equipo del líder"}</div><h2 className="text-xl font-extrabold mt-1">{selected?selected.user!.nombre:leader?.nombre}</h2><div className="text-sm mt-1">{selected?selected.user!.cargo:`${view.length} personas a cargo`}</div></div></Card>
      {[[Target,"Capacidad mensual",`${capacity} h`,`${CAPACIDAD_MENSUAL_HORAS} h por persona`],[CalendarCheck,"Horas proyectadas",`${projected.toFixed(1)} h`,`${pct(projected,capacity)}% de ocupación`],[CircleCheckBig,"Horas ejecutadas",`${executed.toFixed(1)} h`,`${pct(executed,projected)}% de cumplimiento`],[Gauge,"Horas disponibles",`${available.toFixed(1)} h`,`${pending} aprobaciones pendientes`]].map(([Icon,l,v,h]:any)=><Card key={l} className="p-5"><div className="w-10 h-10 rounded-full grid place-items-center mb-3" style={{background:"var(--gco-blue-soft)",color:"var(--gco-blue)"}}><Icon size={20}/></div><div className="text-xs font-semibold">{l}</div><div className="text-3xl font-extrabold mt-1">{v}</div><div className="text-[11px] mt-2" style={{color:"var(--gco-text-3)"}}>{h}</div></Card>)}
    </div>

    <div className="grid xl:grid-cols-[1fr_1.4fr_1.2fr] gap-4 mb-4">
      <Card className="p-5"><h3 className="font-extrabold text-lg">Salud general</h3><div className="mt-6 flex justify-center"><div className="relative w-44 h-64 rounded-[48%_48%_38%_38%/15%_15%_20%_20%] border-4 overflow-hidden" style={{borderColor:"#cbd5e1"}}><div className="absolute inset-x-0 bottom-0" style={{height:`${Math.min(100,pct(projected,capacity))}%`,background:pct(projected,capacity)<70?"linear-gradient(#a7e36f,#4caf50)":pct(projected,capacity)<90?"linear-gradient(#fde68a,#f59e0b)":"linear-gradient(#fdba74,#ef4444)"}}/><div className="absolute inset-0 grid place-items-center"><div className="bg-white/90 rounded-2xl px-4 py-3 text-center"><b className="text-3xl">{pct(projected,capacity)}%</b><div className="text-xs">ocupación proyectada</div></div></div></div></div><div className="rounded-xl p-4 mt-5" style={{background:health.bg,color:health.color}}><div className="flex gap-2 items-center font-bold"><HeartPulse size={19}/>{health.label}</div><p className="text-xs mt-1">Asistencia promedio del grupo: {averageAttendance}%.</p></div></Card>
      <Card className="p-5"><h3 className="font-extrabold text-lg">Programas con mayor participación</h3><p className="text-xs mt-1" style={{color:"var(--gco-text-3)"}}>Concentración de horas del equipo por tipo de actividad.</p><div className="grid md:grid-cols-[180px_1fr] items-center gap-5 mt-6"><div className="w-40 h-40 rounded-full relative mx-auto" style={{background:`conic-gradient(${donut})`}}><div className="absolute inset-7 bg-white rounded-full grid place-items-center"><div className="text-center"><b className="text-xl">{projected.toFixed(1)} h</b><div className="text-xs">proyectadas</div></div></div></div><div className="space-y-3">{categoryEntries.map(([label,v],i)=><div key={label} className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full" style={{background:palette[i%palette.length]}}/><span className="flex-1">{label}</span><b>{v.toFixed(1)} h</b></div>)}</div></div></Card>
      <Card className="p-5"><h3 className="font-extrabold text-lg">Distribución de salud</h3><div className="space-y-4 mt-5">{["saludable","moderado","critico"].map(k=>{const count=view.filter(x=>x.risk===k).length;return <div key={k}><div className="flex justify-between text-sm"><span>{TEAM_RISK_LABEL[k as keyof typeof TEAM_RISK_LABEL]}</span><b>{count}</b></div><div className="h-2 rounded-full mt-2" style={{background:"#eef2f7"}}><div className="h-full rounded-full" style={{width:`${pct(count,view.length)}%`,background:k==="saludable"?"#22c55e":k==="moderado"?"#f59e0b":"#ef4444"}}/></div></div>})}</div><div className="rounded-xl p-3 mt-6 text-xs" style={{background:"var(--gco-surface-2)"}}>Filtra un talento para revisar sus eventos, aprobaciones y asistencia.</div></Card>
    </div>

    {!selected&&<Card className="p-5"><h3 className="font-extrabold text-lg">Detalle por talento</h3><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr style={{background:"var(--gco-surface-2)"}}>{["Talento","Cargo","Proyectadas","Ejecutadas","Disponibles","Salud","Asistencia","Pendientes"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(x=><tr key={x.user.id} className="border-t cursor-pointer hover:bg-slate-50" onClick={()=>setSelectedId(x.user.id)}><td className="p-3"><div className="flex items-center gap-3"><img src={x.user.foto||"/placeholder-user.jpg"} className="w-9 h-9 rounded-full object-cover"/><b>{x.user.nombre}</b></div></td><td className="p-3">{x.user.cargo}</td><td className="p-3">{x.projected.toFixed(1)} h</td><td className="p-3">{x.executed.toFixed(1)} h</td><td className="p-3">{Math.max(0,CAPACIDAD_MENSUAL_HORAS-x.projected).toFixed(1)} h</td><td className="p-3"><Chip tone={x.tone as any}>{TEAM_RISK_LABEL[x.risk]}</Chip></td><td className="p-3">{x.member.asistencia}%</td><td className="p-3">{x.member.pendientes}</td></tr>)}</tbody></table></div></Card>}

    {selected&&<Card className="p-5"><div className="flex justify-between items-center"><h3 className="font-extrabold text-lg">Eventos de {selected.user!.corto}</h3><BtnSoft onClick={()=>setSelectedId("todos")}>Volver al equipo</BtnSoft></div><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr style={{background:"var(--gco-surface-2)"}}>{["Evento","Fecha","Tipo","Obligatorio","Aprobación","Asistencia","Acción"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{selectedDetails.map((x:any)=><tr key={x.en.id} className="border-t"><td className="p-3 font-bold">{x.ev?.nombre||"Evento"}</td><td className="p-3">{x.ev?.fecha||"—"}</td><td className="p-3">{x.ev?.tipo?ACT[x.ev.tipo][0]:"—"}</td><td className="p-3">{(x.ev?.model as any)?.obligatorio?"Sí":"No"}</td><td className="p-3">{x.ap?.estado||x.en.approvalState||"No requiere"}</td><td className="p-3">{x.at?.estado||"Pendiente"}</td><td className="p-3">{x.ap?.estado==="pendiente"?<div className="flex gap-2"><Btn sm onClick={()=>A.respondApproval(x.ap.id,leader?.correo||"lider","aprobada","Aprobado desde Mi equipo")}>Aprobar</Btn><BtnSoft sm onClick={()=>A.respondApproval(x.ap.id,leader?.correo||"lider","rechazada","Rechazado desde Mi equipo")}>Rechazar</BtnSoft></div>:"—"}</td></tr>)}</tbody></table>{!selectedDetails.length&&<p className="p-8 text-center text-sm">No hay eventos asociados a este talento.</p>}</div></Card>}
  </>
}

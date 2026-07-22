"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Activity, BarChart3, CalendarCheck, Check, ClipboardCheck, Clock, Database, FileCheck2, Gauge, Settings, ShieldCheck, Users, X, Info, TrendingUp, CalendarDays, HeartPulse, Sparkles, BookOpen, Target, Hourglass, CircleCheckBig } from "lucide-react"
import { ACT, CAPACIDAD_MENSUAL_HORAS, ES, ROLE_LABEL, TEAM_RISK_LABEL, USERS, Role, teamRisk, type ApprovalRequest, type AttendanceStatus, type EventStatus } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Btn, BtnSoft, Card, Chip, Modal, PageHeader, StatusChip } from "../ui"

const inputStyle = { border: "1px solid var(--gco-border)", borderRadius: 9, padding: "8px 10px", background: "var(--gco-surface)", width: "100%" }
function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card className="p-4"><div className="text-xs" style={{color:"var(--gco-text-3)"}}>{label}</div><div className="text-2xl font-extrabold mt-1">{value}</div>{hint&&<div className="text-[11px] mt-1" style={{color:"var(--gco-text-3)"}}>{hint}</div>}</Card>
}

export function ApprovalsScreen() {
  const state = useGco(s=>s)
  const currentUser = USERS[state.session.userId]
  const { approvals, enrollments, events, attendance } = state
  const [person,setPerson]=useState("todas")
  const [period,setPeriod]=useState("todos")
  const [reschedule,setReschedule]=useState<Record<string,{fecha:string;hora:string;obs:string}>>({})
  const [rejectOpen,setRejectOpen]=useState<string|null>(null)

  const teamMembers = sel.team(state).members
  const teamIds = teamMembers.map(m=>Object.values(USERS).find(u=>u.nombre===m.nombre)?.id).filter(Boolean) as string[]
  const assignedApprovals = approvals.filter(a=>a.correosAprobadores.includes(currentUser?.correo||""))
  const assignedUserIds = new Set(assignedApprovals.flatMap(a=>a.userIds))
  const visibleUserIds = currentUser?.roles.includes("lider" as any) ? new Set(teamIds) : assignedUserIds

  const baseRows=enrollments.map(en=>{
    const ev=events.find(e=>e.id===en.eventId)
    const ap=approvals.find(a=>a.enrollmentIds.includes(en.id))
    const at=attendance.find(a=>a.eventId===en.eventId&&a.userId===en.userId)
    const hours=Math.max(0,en.capacidadProyectada-en.capacidadAntes)
    return {en,ev,ap,at,hours}
  }).filter(x=>visibleUserIds.has(x.en.userId))

  const people=Array.from(new Set(baseRows.map(x=>x.en.userId)))
  const periods=Array.from(new Set(baseRows.map(x=>x.ev?.periodo).filter(Boolean))) as string[]
  const rows=baseRows.filter(x=>(person==="todas"||x.en.userId===person)&&(period==="todos"||x.ev?.periodo===period))
  const actionable = assignedApprovals
  const exportCsv=()=>{
    const csv=["Colaborador,Evento,Periodo,Tipo,Obligatorio,Horas,Aprobacion,Asistencia",...rows.map(x=>[
      USERS[x.en.userId]?.nombre,x.ev?.nombre,x.ev?.periodo,x.ev?.tipo?ACT[x.ev.tipo][0]:"",(x.ev?.model as any)?.obligatorio?"Sí":"No",x.hours,x.ap?.estado||x.en.approvalState,x.at?.estado||"Pendiente"
    ].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","))].join("\n")
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="historico-equipo.csv";a.click()
  }
  return <>
    <PageHeader title="Aprobaciones e histórico de mi equipo" sub="Solo ves eventos en los que tus talentos fueron invitados o se inscribieron, y las solicitudes de aprobación asignadas a tu correo." right={<BtnSoft onClick={exportCsv}>Exportar CSV</BtnSoft>}/>
    <Card className="p-5 mb-4"><h3 className="font-bold mb-1">Pendientes asignadas a ti</h3><p className="text-xs mb-3" style={{color:"var(--gco-text-3)"}}>Estas solicitudes sí requieren una decisión formal.</p>{actionable.filter(a=>a.estado==="pendiente").map(a=>{const ev=events.find(e=>e.id===a.eventId);const form=reschedule[a.id]||{fecha:"",hora:"",obs:""};return <div key={a.id} className="py-4 border-t"><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><b>{ev?.nombre||"Evento"}</b><div className="text-xs">{a.userIds.map(id=>USERS[id]?.nombre||id).join(", ")} · {ev?.fecha||"Sin fecha"} · vence {a.fechaLimite||"sin fecha"}</div></div><Btn sm onClick={()=>A.respondApproval(a.id,currentUser?.correo||"aprobador","aprobada","Aprobado desde la app")}>Aprobar</Btn><BtnSoft sm onClick={()=>setRejectOpen(rejectOpen===a.id?null:a.id)}>Rechazar</BtnSoft></div>{rejectOpen===a.id&&<div className="mt-3 ml-auto max-w-xl rounded-xl border p-4 space-y-3" style={{background:"var(--gco-surface-2)"}}><b className="text-sm">¿Cómo deseas rechazar?</b><textarea style={inputStyle} placeholder="Comentarios obligatorios" value={form.obs} onChange={e=>setReschedule({...reschedule,[a.id]:{...form,obs:e.target.value}})}/><div className="grid sm:grid-cols-2 gap-3"><input type="date" style={inputStyle} value={form.fecha} onChange={e=>setReschedule({...reschedule,[a.id]:{...form,fecha:e.target.value}})}/><input type="time" style={inputStyle} value={form.hora} onChange={e=>setReschedule({...reschedule,[a.id]:{...form,hora:e.target.value}})}/></div><p className="text-[11px]" style={{color:"var(--gco-text-3)"}}>Deja fecha y hora vacías para rechazar solo con comentarios. Complétalas si deseas proponer una nueva programación.</p><div className="flex justify-end gap-2"><BtnSoft sm onClick={()=>setRejectOpen(null)}>Cancelar</BtnSoft><BtnSoft sm onClick={()=>{if(!form.obs.trim())return;A.respondApproval(a.id,currentUser?.correo||"aprobador",form.fecha&&form.hora?"reprogramada":"rechazada",form.obs,form.fecha||undefined,form.hora||undefined);setRejectOpen(null)}}>{form.fecha&&form.hora?"Rechazar y proponer fecha":"Confirmar rechazo"}</BtnSoft></div></div>}</div>})}{!actionable.some(a=>a.estado==="pendiente")&&<p className="text-sm">No tienes aprobaciones pendientes.</p>}</Card>
    <Card className="p-4 mb-4"><div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs font-bold">Colaborador</label><select value={person} onChange={e=>setPerson(e.target.value)} style={inputStyle}><option value="todas">Todos</option>{people.map(id=><option key={id} value={id}>{USERS[id]?.nombre||id}</option>)}</select></div><div><label className="text-xs font-bold">Periodo</label><select value={period} onChange={e=>setPeriod(e.target.value)} style={inputStyle}><option value="todos">Todos</option>{periods.map(p=><option key={p}>{p}</option>)}</select></div></div></Card>
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{background:"var(--gco-surface-2)"}}>{["Colaborador","Evento","Periodo","Tipo","Obligatorio","Horas","Aprobación","Asistencia"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(x=><tr key={x.en.id} className="border-t"><td className="p-3 font-bold">{USERS[x.en.userId]?.nombre||x.en.userId}</td><td className="p-3">{x.ev?.nombre}</td><td className="p-3">{x.ev?.periodo}</td><td className="p-3">{x.ev?.tipo?ACT[x.ev.tipo][0]:"—"}</td><td className="p-3">{(x.ev?.model as any)?.obligatorio?"Sí":"No"}</td><td className="p-3">{x.hours.toFixed(1)} h</td><td className="p-3">{x.ap?.estado||x.en.approvalState}{x.ap?.respuestas?.length?<div className="text-[10px] mt-1">{x.ap.respuestas.map(r=>`${r.decision}: ${r.observacion||"sin comentario"}`).join(" · ")}</div>:null}</td><td className="p-3">{x.at?.estado||"Pendiente"}</td></tr>)}</tbody></table>{!rows.length&&<div className="p-10 text-center">No hay eventos de tu equipo con estos filtros.</div>}</Card>
  </>
}

const MONTH_META = [
  ["01","Ene"],["02","Feb"],["03","Mar"],["04","Abr"],["05","May"],["06","Jun"],
  ["07","Jul"],["08","Ago"],["09","Sep"],["10","Oct"],["11","Nov"],["12","Dic"],
] as const

const PERIOD_MONTH: Record<string,string> = {
  Enero:"01", Febrero:"02", Marzo:"03", Abril:"04", Mayo:"05", Junio:"06",
  Julio:"07", Agosto:"08", Septiembre:"09", Octubre:"10", Noviembre:"11", Diciembre:"12",
}

const PROMOTER_ANNUAL_GOALS: Record<string,number> = {
  "Riesgos":1,
  "Riesgos Corporativos":1,
  "Cumplimiento":1,
  "SST":55,
  "Bienestar":35,
  "GIRO / Innovación":20.5,
  "Innovación":20.5,
  "Makers / Nexus":16,
  "Vía Jay / Agilismo":16,
  "Seguridad de la Información":15,
  "PDP":11,
  "Sostenibilidad y RS":5,
  "Sostenibilidad y RSE":5,
  "For+ / Formación":60,
}

const PERSONAL_HISTORY: Record<string,Record<string,{projected:number;executed:number;category:string}[]>> = {
  daniel:{
    "03":[{projected:2,executed:2,category:"Formación normativa"}],
    "04":[{projected:4,executed:3,category:"Formación corporativa"}],
    "05":[{projected:3,executed:3,category:"Bienestar"}],
    "06":[{projected:5,executed:4,category:"Formación voluntaria"}],
    "07":[{projected:4,executed:2,category:"Sensibilización"}],
    "08":[{projected:6,executed:2,category:"Formación corporativa"}],
    "09":[{projected:3,executed:0,category:"Experiencia"}],
    "10":[{projected:2,executed:0,category:"Asesoría"}],
  },
  alejandro:{
    "03":[{projected:3,executed:3,category:"Formación normativa"}],
    "04":[{projected:5,executed:4,category:"Formación corporativa"}],
    "05":[{projected:4,executed:4,category:"Desarrollo"}],
    "06":[{projected:3,executed:2,category:"Bienestar"}],
    "07":[{projected:6,executed:5,category:"Formación corporativa"}],
    "08":[{projected:7,executed:3,category:"Liderazgo"}],
    "09":[{projected:4,executed:0,category:"Experiencia"}],
    "10":[{projected:3,executed:0,category:"Asesoría"}],
  },
  carolina:{
    "03":[{projected:4,executed:4,category:"Formación corporativa"}],
    "04":[{projected:3,executed:3,category:"Sensibilización"}],
    "05":[{projected:5,executed:4,category:"Innovación"}],
    "06":[{projected:4,executed:4,category:"Formación voluntaria"}],
    "07":[{projected:6,executed:5,category:"Experiencia"}],
    "08":[{projected:7,executed:3,category:"Formación corporativa"}],
    "09":[{projected:5,executed:0,category:"Bienestar"}],
    "10":[{projected:4,executed:0,category:"Asesoría"}],
  },
  valeria:{
    "03":[{projected:3,executed:3,category:"Formación normativa"}],
    "04":[{projected:4,executed:4,category:"Formación corporativa"}],
    "05":[{projected:4,executed:3,category:"Sensibilización"}],
    "06":[{projected:5,executed:4,category:"Innovación"}],
    "07":[{projected:5,executed:5,category:"Experiencia"}],
    "08":[{projected:6,executed:2,category:"Formación corporativa"}],
    "09":[{projected:4,executed:0,category:"Asesoría"}],
  },
}

function pct(part:number,total:number){ return total ? Math.round((part/total)*100) : 0 }
function eventHours(ev:any){
  if(ev?.sesiones?.length){
    const total=ev.sesiones.reduce((sum:number,x:any)=>sum+Number(x.duracionContabilizable||x.duracionCalculada||0),0)
    if(total>0)return total
  }
  const m=ev?.model as any
  return Number(m?.duracionTotal||m?.duracion||2) || 2
}
function statusFor(value:number,target:number){
  const occupation=pct(value,target)
  return occupation<70?{label:"Saludable",tone:"green",message:"Tienes margen para asumir nuevas actividades."}:occupation<90?{label:"Preventivo",tone:"amber",message:"Antes de inscribirte, revisa cruces y prioridades."}:occupation<=110?{label:"Alta ocupación",tone:"orange",message:"Tu agenda de aprendizaje está cerca del límite."}:{label:"Sobre capacidad",tone:"red",message:"Prioriza y valida nuevas actividades con tu líder."}
}

function CalculationHelp({open,onClose,mode}:{open:boolean;onClose:()=>void;mode:"personal"|"promoter"|"team"}){
  return <Modal open={open} onClose={onClose} title="¿Cómo se calcula esta radiografía?" size="lg">
    <div className="space-y-4 text-sm">
      {mode==="personal"&&<>
        <p>La radiografía combina los eventos donde estás <b>inscrito, invitado o con cupo aprobado</b> y la asistencia realmente registrada.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[['Horas proyectadas','Duración de los eventos inscritos o invitados en el periodo.'],['Horas comprometidas','Horas de eventos con cupo confirmado o asistencia obligatoria.'],['Horas ejecutadas','Minutos de asistencia confirmados, convertidos a horas.'],['Cumplimiento','Horas ejecutadas ÷ horas proyectadas.'],['Disponibilidad','Capacidad objetivo menos horas comprometidas.'],['Tendencia','Comparación mensual entre lo proyectado y lo realmente consumido.']].map(([a,b])=><div key={a} className="rounded-xl border p-3"><b>{a}</b><p className="mt-1 text-xs" style={{color:'var(--gco-text-2)'}}>{b}</p></div>)}
        </div>
      </>}
      {mode==="promoter"&&<>
        <p>La vista del equipo promotor compara la <b>meta anual de horas</b> con las horas programadas y ejecutadas por los eventos creados por el área.</p>
        <ul className="list-disc pl-5 space-y-2"><li>Horas programadas: duración de los eventos aprobados o publicados.</li><li>Horas ejecutadas: duración de eventos que ya tienen asistencia registrada.</li><li>Cumplimiento de asistencia: asistentes confirmados ÷ personas invitadas o aprobadas.</li><li>Cobertura: personas alcanzadas ÷ público objetivo.</li></ul>
      </>}
      {mode==="team"&&<p>La salud del equipo suma las horas comprometidas de sus integrantes, identifica concentración por programa y permite filtrar la radiografía individual de cada talento.</p>}
      <div className="rounded-xl p-3 text-xs" style={{background:'var(--gco-blue-soft)'}}>En el prototipo, los datos históricos se combinan con los eventos e inscripciones simulados del store para mostrar el comportamiento mensual completo.</div>
    </div>
  </Modal>
}

function PersonalCapacityDashboard({s}:{s:any}){
  const [help,setHelp]=useState(false)
  const user=USERS[s.session.userId]
  const own=s.enrollments.filter((e:any)=>e.userId===s.session.userId)
  const currentPeriod=s.session.periodo
  const currentMonth=PERIOD_MONTH[currentPeriod.split(' ')[0]]||"08"
  const annualTarget=240
  const monthlyTarget=CAPACIDAD_MENSUAL_HORAS
  const actualByMonth:Record<string,{projected:number;executed:number;categories:Record<string,number>}>=Object.fromEntries(MONTH_META.map(([m])=>[m,{projected:0,executed:0,categories:{}}]))
  const historical=PERSONAL_HISTORY[s.session.userId]||PERSONAL_HISTORY.daniel
  for(const [m,rows] of Object.entries(historical)) for(const row of rows){actualByMonth[m].projected+=row.projected;actualByMonth[m].executed+=row.executed;actualByMonth[m].categories[row.category]=(actualByMonth[m].categories[row.category]||0)+row.projected}
  for(const en of own){
    const ev=s.events.find((x:any)=>x.id===en.eventId); if(!ev?.fecha)continue
    const m=ev.fecha.slice(5,7); if(!actualByMonth[m])continue
    const h=Math.max(0,Number(en.capacidadProyectada||0)-Number(en.capacidadAntes||0))||eventHours(ev)
    actualByMonth[m].projected+=h
    const label=ev.tipo?ACT[ev.tipo][0]:"Otros"
    actualByMonth[m].categories[label]=(actualByMonth[m].categories[label]||0)+h
    const at=s.attendance.find((a:any)=>a.eventId===en.eventId&&a.userId===en.userId)
    if(at&&["asistio","parcial"].includes(at.estado))actualByMonth[m].executed+=Number(at.minutosAsistidos||0)/60
  }
  const series=MONTH_META.map(([month,label])=>({month,label,...actualByMonth[month]}))
  const annualProjected=series.reduce((a,x)=>a+x.projected,0)
  const annualExecuted=series.reduce((a,x)=>a+x.executed,0)
  const month=actualByMonth[currentMonth]
  const monthCommitted=month.projected
  const monthExecuted=month.executed
  const monthlyAvailable=Math.max(0,monthlyTarget-monthCommitted)
  const annualAvailable=Math.max(0,annualTarget-annualProjected)
  const status=statusFor(monthCommitted,monthlyTarget)
  const categoryTotals=series.reduce((acc:Record<string,number>,x)=>{Object.entries(x.categories).forEach(([k,v])=>acc[k]=(acc[k]||0)+v);return acc},{})
  const typeEntries=Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1])
  const typeTotal=typeEntries.reduce((a,[,v])=>a+v,0)||1
  const palette=["#2563eb","#65a30d","#f59e0b","#7c3aed","#0891b2","#e11d48"]
  let cursor=0; const donut=typeEntries.map(([,v],i)=>{const f=cursor;cursor+=v/typeTotal*100;return `${palette[i%palette.length]} ${f}% ${cursor}%`}).join(', ')||'#e5e7eb 0 100%'
  const maxSeries=Math.max(monthlyTarget,...series.flatMap(x=>[x.projected,x.executed]),1)
  const projectedPoints=series.map((x,i)=>`${7+i*(88/11)},${82-(x.projected/maxSeries)*64}`).join(' ')
  const executedPoints=series.map((x,i)=>`${7+i*(88/11)},${82-(x.executed/maxSeries)*64}`).join(' ')
  const upcoming=own.map((en:any)=>({en,ev:s.events.find((x:any)=>x.id===en.eventId)})).filter((x:any)=>x.ev?.fecha>=`2026-${currentMonth}-01`).sort((a:any,b:any)=>a.ev.fecha.localeCompare(b.ev.fecha)).slice(0,5)
  const st:Record<string,any>={green:{bg:'#effaf0',border:'#b9e5bc',text:'#15803d'},amber:{bg:'#fff9e8',border:'#f5d88a',text:'#a16207'},orange:{bg:'#fff4e8',border:'#fdba74',text:'#c2410c'},red:{bg:'#fff1f2',border:'#fecdd3',text:'#be123c'}}
  return <>
    <PageHeader title="Radiografía de mi capacidad" sub="Compara lo que tenías proyectado consumir con las horas realmente ejecutadas y entiende en qué estás concentrando tu aprendizaje." right={<button onClick={()=>setHelp(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold" style={{background:'var(--gco-surface)'}}><Info size={17}/>¿Cómo se calcula?</button>}/>
    <CalculationHelp open={help} onClose={()=>setHelp(false)} mode="personal"/>
    <div className="grid xl:grid-cols-[1.25fr_repeat(4,1fr)] gap-3 mb-4">
      <Card className="p-5 flex items-center gap-4"><img src={user?.foto||'/placeholder-user.jpg'} className="w-20 h-20 rounded-full object-cover border-4" style={{borderColor:'var(--gco-green-soft)'}}/><div><div className="text-xs uppercase" style={{color:'var(--gco-text-3)'}}>Colaborador</div><h2 className="text-xl font-extrabold mt-1">{user?.nombre}</h2><div className="text-sm mt-1">{user?.cargo}</div><div className="text-xs mt-1 font-semibold" style={{color:'var(--gco-purple)'}}>{user?.vp}</div></div></Card>
      {[[Target,'Objetivo anual',`${annualTarget} h`,'Capacidad de referencia'],[CalendarDays,'Proyectadas este mes',`${monthCommitted.toFixed(1)} h`,`${pct(monthCommitted,monthlyTarget)}% de ${monthlyTarget} h`],[CircleCheckBig,'Consumidas a la fecha',`${monthExecuted.toFixed(1)} h`,`${pct(monthExecuted,monthCommitted)}% de cumplimiento`],[Hourglass,'Disponibles este mes',`${monthlyAvailable.toFixed(1)} h`,`${annualAvailable.toFixed(1)} h disponibles en el año`]].map(([Icon,l,v,h]:any)=><Card key={l} className="p-5"><div className="w-10 h-10 rounded-full grid place-items-center mb-3" style={{background:'var(--gco-blue-soft)',color:'var(--gco-blue)'}}><Icon size={20}/></div><div className="text-xs font-semibold" style={{color:'var(--gco-text-2)'}}>{l}</div><div className="text-3xl font-extrabold mt-1">{v}</div><div className="text-[11px] mt-2" style={{color:'var(--gco-text-3)'}}>{h}</div></Card>)}
    </div>
    <div className="grid xl:grid-cols-[1fr_1.45fr_1.45fr] gap-4 mb-4">
      <Card className="p-5"><h3 className="font-extrabold text-lg">Salud del periodo</h3><div className="mt-6 flex justify-center"><div className="relative w-44 h-64 rounded-[48%_48%_38%_38%/15%_15%_20%_20%] border-4 overflow-hidden" style={{borderColor:'#cbd5e1',background:'linear-gradient(#fff,#f8fafc)'}}><div className="absolute inset-x-0 bottom-0" style={{height:`${Math.min(100,pct(monthCommitted,monthlyTarget))}%`,background:pct(monthCommitted,monthlyTarget)<70?'linear-gradient(#a7e36f,#4caf50)':pct(monthCommitted,monthlyTarget)<90?'linear-gradient(#fde68a,#f59e0b)':'linear-gradient(#fdba74,#ef4444)'}}/><div className="absolute inset-0 grid place-items-center"><div className="bg-white/90 rounded-2xl px-4 py-3 text-center shadow-sm"><div className="text-3xl font-extrabold">{pct(monthCommitted,monthlyTarget)}%</div><div className="text-xs">ocupación proyectada</div></div></div></div></div><div className="mt-5 rounded-xl border p-4" style={{background:st[status.tone].bg,borderColor:st[status.tone].border,color:st[status.tone].text}}><b>{status.label}</b><p className="text-sm mt-1">{status.message}</p></div></Card>
      <Card className="p-5"><h3 className="font-extrabold text-lg">Proyectado vs. consumido por mes</h3><p className="text-xs mt-1" style={{color:'var(--gco-text-3)'}}>Los meses anteriores muestran el cierre real; el mes actual, el avance a la fecha; y los meses futuros, la proyección.</p><svg viewBox="0 0 100 100" className="w-full h-60 mt-3" preserveAspectRatio="none">{[20,40,60,80].map(y=><line key={y} x1="5" x2="97" y1={y} y2={y} stroke="#e5e7eb" strokeWidth=".7"/>)}<polyline points={projectedPoints} fill="none" stroke="#2563eb" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/><polyline points={executedPoints} fill="none" stroke="#16a34a" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/>{series.map((x,i)=><g key={x.month}><circle cx={7+i*(88/11)} cy={82-(x.projected/maxSeries)*64} r="1.7" fill="#2563eb"/><circle cx={7+i*(88/11)} cy={82-(x.executed/maxSeries)*64} r="1.7" fill="#16a34a"/><text x={7+i*(88/11)} y="95" textAnchor="middle" fontSize="3.5" fill="#64748b">{x.label}</text></g>)}</svg><div className="flex gap-4 text-xs"><span className="inline-flex gap-2 items-center"><i className="w-3 h-1 bg-blue-600"/>Proyectado</span><span className="inline-flex gap-2 items-center"><i className="w-3 h-1 bg-green-600"/>Consumido</span></div></Card>
      <Card className="p-5"><h3 className="font-extrabold text-lg">¿En qué uso mi capacidad?</h3><div className="grid md:grid-cols-[170px_1fr] items-center gap-5 mt-5"><div className="w-40 h-40 rounded-full relative mx-auto" style={{background:`conic-gradient(${donut})`}}><div className="absolute inset-7 rounded-full bg-white grid place-items-center text-center"><div><b className="text-xl">{annualProjected.toFixed(1)} h</b><div className="text-xs">proyectadas</div></div></div></div><div className="space-y-3">{typeEntries.map(([label,v],i)=><div key={label} className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full" style={{background:palette[i%palette.length]}}/><span className="flex-1">{label}</span><b>{v.toFixed(1)} h</b></div>)}</div></div></Card>
    </div>
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
      <Card className="p-5"><h3 className="font-extrabold text-lg">Detalle mensual</h3><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr style={{background:'var(--gco-surface-2)'}}>{['Mes','Proyectado','Consumido','Cumplimiento','Lectura'].map(h=><th key={h} className="text-left p-3">{h}</th>)}</tr></thead><tbody>{series.filter(x=>x.projected>0||x.executed>0).map(x=><tr key={x.month} className="border-t"><td className="p-3 font-bold">{x.label}</td><td className="p-3">{x.projected.toFixed(1)} h</td><td className="p-3">{x.executed.toFixed(1)} h</td><td className="p-3"><Chip tone={pct(x.executed,x.projected)>=85?'green':pct(x.executed,x.projected)>=60?'amber':'red'}>{pct(x.executed,x.projected)}%</Chip></td><td className="p-3">{x.month<currentMonth?'Cierre del mes':x.month===currentMonth?'Avance a la fecha':'Proyección futura'}</td></tr>)}</tbody></table></div></Card>
      <Card className="p-5"><h3 className="font-extrabold text-lg">Próximas actividades</h3><div className="mt-4 space-y-3">{upcoming.map(({en,ev}:any)=><div key={en.id} className="rounded-xl border p-3"><b className="text-sm">{ev?.nombre}</b><div className="text-xs mt-1">{ev?.fecha} · {eventHours(ev).toFixed(1)} h</div><div className="mt-2"><Chip tone={en.estadoCupo==='aprobado'?'green':'blue'}>{en.estadoCupo==='aprobado'?'Cupo confirmado':'Inscrito / invitado'}</Chip></div></div>)}{!upcoming.length&&<p className="text-sm">No tienes próximas actividades.</p>}</div><div className="rounded-xl p-3 mt-5 text-xs" style={{background:'var(--gco-surface-2)'}}><b>Resumen anual:</b> {annualProjected.toFixed(1)} h proyectadas, {annualExecuted.toFixed(1)} h consumidas y {pct(annualExecuted,annualProjected)}% de cumplimiento.</div></Card>
    </div>
  </>
}

function PromoterCapacityDashboard({s}:{s:any}){
  const [help,setHelp]=useState(false)
  const user=USERS[s.session.userId]
  const area=user?.area||'For+ / Formación'
  const goal=PROMOTER_ANNUAL_GOALS[area]||PROMOTER_ANNUAL_GOALS['For+ / Formación']
  const ownEvents=s.events.filter((e:any)=>e.area===area||e.createdBy===s.session.userId)
  const currentMonth=PERIOD_MONTH[s.session.periodo.split(' ')[0]]||'08'
  const rows=MONTH_META.map(([month,label])=>{
    const events=ownEvents.filter((e:any)=>e.fecha?.slice(5,7)===month)
    const scheduled=events.reduce((a:number,e:any)=>a+eventHours(e),0)
    const executed=events.filter((e:any)=>['en_ejecucion','pendiente_cierre','cerrado'].includes(e.estado)||e.fecha<'2026-07-21').reduce((a:number,e:any)=>a+eventHours(e),0)
    const invited=events.reduce((a:number,e:any)=>a+Number(e.publicoObjetivo||e.cupos||0),0)
    const attendees=s.attendance.filter((a:any)=>events.some((e:any)=>e.id===a.eventId)&&['asistio','parcial'].includes(a.estado)).length
    return {month,label,events,scheduled,executed,invited,attendees}
  })
  const scheduled=rows.reduce((a,x)=>a+x.scheduled,0)
  const executed=rows.reduce((a,x)=>a+x.executed,0)
  const invited=rows.reduce((a,x)=>a+x.invited,0)
  const attendees=rows.reduce((a,x)=>a+x.attendees,0)
  const current=rows.find(x=>x.month===currentMonth)!
  const max=Math.max(...rows.flatMap(x=>[x.scheduled,x.executed]),goal/12,1)
  const pPoints=rows.map((x,i)=>`${7+i*(88/11)},${82-(x.scheduled/max)*64}`).join(' ')
  const ePoints=rows.map((x,i)=>`${7+i*(88/11)},${82-(x.executed/max)*64}`).join(' ')
  const status=statusFor(scheduled,goal)
  return <>
    <PageHeader title="Radiografía del equipo promotor" sub={`Seguimiento a la planeación y ejecución de ${area}: horas programadas, cumplimiento, cobertura y asistencia.`} right={<button onClick={()=>setHelp(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold" style={{background:'var(--gco-surface)'}}><Info size={17}/>¿Cómo se calcula?</button>}/>
    <CalculationHelp open={help} onClose={()=>setHelp(false)} mode="promoter"/>
    <div className="grid xl:grid-cols-[1.25fr_repeat(4,1fr)] gap-3 mb-4"><Card className="p-5 flex gap-4 items-center"><div className="w-20 h-20 rounded-full grid place-items-center" style={{background:'var(--gco-green-soft)',color:'var(--gco-green-dark)'}}><Users size={34}/></div><div><div className="text-xs uppercase" style={{color:'var(--gco-text-3)'}}>Equipo promotor</div><h2 className="text-xl font-extrabold mt-1">{area}</h2><div className="text-sm mt-1">Responsable: {user?.nombre}</div></div></Card>{[[Target,'Meta anual',`${goal} h`,'Horas proyectadas por el área'],[CalendarDays,'Horas programadas',`${scheduled.toFixed(1)} h`,`${pct(scheduled,goal)}% de la meta`],[CircleCheckBig,'Horas ejecutadas',`${executed.toFixed(1)} h`,`${pct(executed,scheduled)}% de cumplimiento`],[Users,'Asistencia efectiva',`${pct(attendees,invited)}%`,`${attendees} asistentes de ${invited} invitados`]].map(([Icon,l,v,h]:any)=><Card key={l} className="p-5"><div className="w-10 h-10 rounded-full grid place-items-center mb-3" style={{background:'var(--gco-blue-soft)',color:'var(--gco-blue)'}}><Icon size={20}/></div><div className="text-xs font-semibold">{l}</div><div className="text-3xl font-extrabold mt-1">{v}</div><div className="text-[11px] mt-2" style={{color:'var(--gco-text-3)'}}>{h}</div></Card>)}</div>
    <div className="grid xl:grid-cols-[1fr_1.6fr_1fr] gap-4 mb-4"><Card className="p-5"><h3 className="font-extrabold text-lg">Cumplimiento anual</h3><div className="mt-6 text-center"><div className="text-5xl font-extrabold" style={{color:pct(scheduled,goal)>=100?'var(--gco-green)':'var(--gco-blue)'}}>{pct(scheduled,goal)}%</div><div className="text-sm mt-2">de la meta anual programada</div></div><div className="h-4 rounded-full mt-6 overflow-hidden" style={{background:'#eef2f7'}}><div className="h-full rounded-full" style={{width:`${Math.min(100,pct(scheduled,goal))}%`,background:'linear-gradient(90deg,#22c55e,#2563eb)'}}/></div><div className="rounded-xl border p-4 mt-6"><b>{status.label}</b><p className="text-xs mt-1">{scheduled<goal?`Faltan ${(goal-scheduled).toFixed(1)} h por programar para alcanzar la meta.`:'La meta anual ya está cubierta.'}</p></div></Card><Card className="p-5"><h3 className="font-extrabold text-lg">Tendencia de planeación y ejecución</h3><svg viewBox="0 0 100 100" className="w-full h-60 mt-3" preserveAspectRatio="none">{[20,40,60,80].map(y=><line key={y} x1="5" x2="97" y1={y} y2={y} stroke="#e5e7eb" strokeWidth=".7"/>)}<polyline points={pPoints} fill="none" stroke="#2563eb" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/><polyline points={ePoints} fill="none" stroke="#16a34a" strokeWidth="2.2" vectorEffect="non-scaling-stroke"/>{rows.map((x,i)=><text key={x.month} x={7+i*(88/11)} y="95" textAnchor="middle" fontSize="3.5" fill="#64748b">{x.label}</text>)}</svg><div className="flex gap-4 text-xs"><span>🔵 Programadas</span><span>🟢 Ejecutadas</span></div></Card><Card className="p-5"><h3 className="font-extrabold text-lg">Periodo seleccionado</h3><div className="grid grid-cols-2 gap-3 mt-4"><Kpi label="Eventos" value={current.events.length}/><Kpi label="Programadas" value={`${current.scheduled.toFixed(1)} h`}/><Kpi label="Ejecutadas" value={`${current.executed.toFixed(1)} h`}/><Kpi label="Asistencia" value={`${pct(current.attendees,current.invited)}%`}/></div><div className="rounded-xl p-3 mt-4 text-xs" style={{background:'var(--gco-green-soft)'}}>La meta mide horas de eventos promovidos; la asistencia mide la efectividad de convocatoria.</div></Card></div>
    <Card className="p-5"><h3 className="font-extrabold text-lg">Comportamiento por mes</h3><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr style={{background:'var(--gco-surface-2)'}}>{['Mes','Eventos','Programadas','Ejecutadas','Cumplimiento','Invitados','Asistentes','Asistencia'].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.filter(x=>x.events.length||x.scheduled).map(x=><tr key={x.month} className="border-t"><td className="p-3 font-bold">{x.label}</td><td className="p-3">{x.events.length}</td><td className="p-3">{x.scheduled.toFixed(1)} h</td><td className="p-3">{x.executed.toFixed(1)} h</td><td className="p-3"><Chip tone={pct(x.executed,x.scheduled)>=85?'green':'amber'}>{pct(x.executed,x.scheduled)}%</Chip></td><td className="p-3">{x.invited}</td><td className="p-3">{x.attendees}</td><td className="p-3">{pct(x.attendees,x.invited)}%</td></tr>)}</tbody></table></div></Card>
  </>
}

export function CapacityScreen() {
  const s=useGco(x=>x)
  return s.session.role===Role.AreaPromotora ? <PromoterCapacityDashboard s={s}/> : <PersonalCapacityDashboard s={s}/>
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

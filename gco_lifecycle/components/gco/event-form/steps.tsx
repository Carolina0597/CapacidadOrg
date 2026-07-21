"use client"

import { useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, Plus, Trash2, Upload, UserPlus, X } from "lucide-react"
import { ACT, AREAS, PEOPLE, USERS } from "@/lib/gco/domain"
import { detectConflicts, hoursBetween, newSession, type Errors, type EventModel, type FormSession, type PersonRow } from "@/lib/gco/event-form"
import { Chip } from "../ui"
import { ChipSelect, Field, Grid, GroupTitle, RadioCards, SelectInput, TextArea, TextInput, Toggle } from "./fields"
import { EventReview } from "./review"

type SetModel = (patch: Partial<EventModel>) => void

export function StepBody({ step, m, set, errors, goto }: { step: number; m: EventModel; set: SetModel; errors: Errors; goto: (s:number)=>void }) {
  if (step === 1) return <BasicInfo m={m} set={set} errors={errors} />
  if (step === 2) return <Audience m={m} set={set} errors={errors} />
  if (step === 3) return <Schedule m={m} set={set} errors={errors} />
  if (step === 4) return <CapacityAndSupport m={m} set={set} errors={errors} />
  return <EventReview m={m} set={set} goto={goto} />
}

function BasicInfo({m,set,errors}:{m:EventModel;set:SetModel;errors:Errors}) {
  const priority = m.tipo ? ACT[m.tipo][1] : ""
  return <div className="space-y-5">
    <Field label="Nombre del evento o espacio" required error={errors.nombre}>
      <TextInput value={m.nombre} onChange={v=>set({nombre:v})} placeholder="Ej. Taller de liderazgo" error={!!errors.nombre}/>
    </Field>
    <Field label="Áreas promotoras" required error={errors.areaPrincipal} hint="Selecciona una o varias áreas de la compañía.">
      <ChipSelect values={[m.areaPrincipal,...m.areasAdicionales].filter(Boolean)} onChange={v=>set({areaPrincipal:v[0]||"",areasAdicionales:v.slice(1)})} options={AREAS}/>
    </Field>
    <Grid>
      <Field label="Responsable del evento" required error={errors.responsable}>
        <SelectInput value={m.responsable} onChange={v=>set({responsable:v})} options={PEOPLE} error={!!errors.responsable}/>
      </Field>
      <Field label="¿Es un evento obligatorio?">
        <RadioCards value={m.obligatorioColaborador?"si":"no"} onChange={v=>set({obligatorioColaborador:v==="si", obligatorioProceso:v==="si"})} options={[{value:"si",label:"Sí"},{value:"no",label:"No"}]}/>
      </Field>
    </Grid>
    <Field label="Tipo de actividad" required error={errors.tipo}>
      <RadioCards value={m.tipo} onChange={v=>set({tipo:v as EventModel["tipo"], prioridad:v?ACT[v as keyof typeof ACT][1]:""})} options={Object.entries(ACT).map(([value,[label,p]])=>({value,label,desc:`Prioridad automática: ${p}`}))} cols={2}/>
    </Field>
    {priority && <div className="rounded-xl p-3 text-sm" style={{background:"var(--gco-green-soft)",color:"var(--gco-green-dark)"}}><b>Prioridad calculada:</b> {priority}. Se deriva del tipo de actividad y no requiere otra pregunta.</div>}
    <Field label="Descripción del evento o espacio" required error={errors.descripcion} hint="¿De qué se trata y qué temas impacta?">
      <TextArea value={m.descripcion} onChange={v=>set({descripcion:v, temas:v})} rows={5} placeholder="Describe brevemente el evento y los temas que impacta." error={!!errors.descripcion}/>
    </Field>
  </div>
}

function Audience({m,set,errors}:{m:EventModel;set:SetModel;errors:Errors}) {
  const scopes = m.scopes
  const setScope=(value:string)=>set({scopes:[value], convocatoria:value==="todo"?"abierta":"directa", publicoAbierto:value==="todo"})
  return <div className="space-y-5">
    <Field label="Modalidad" required error={errors.modalidad}>
      <RadioCards value={m.modalidad} onChange={v=>set({modalidad:v, sesiones:m.sesiones.map(s=>({...s,modalidad:v}))})} options={["Presencial","Virtual","Híbrida"].map(x=>({value:x,label:x}))} cols={3}/>
    </Field>
    <Field label="Público" required error={errors.scopes} hint="Define a quiénes se invitará.">
      <RadioCards value={scopes[0]||""} onChange={setScope} options={[
        {value:"todo",label:"Todo Sistecrédito"},
        {value:"areas",label:"Áreas específicas"},
        {value:"personas",label:"Personas específicas"},
        {value:"cargos",label:"Cargos"},
      ]} cols={2}/>
    </Field>
    {scopes.includes("areas") && <Field label="Áreas invitadas"><ChipSelect values={m.areasImpactadas} onChange={v=>set({areasImpactadas:v})} options={AREAS}/></Field>}
    {scopes.includes("cargos") && <Field label="Cargos invitados"><ChipSelect values={m.cargos} onChange={v=>set({cargos:v})} options={["Analista","Analista Senior","Líder de equipo","Coordinador","Jefe de área","Especialista","Asesor de servicio","Gerente"]}/></Field>}
    {scopes.includes("personas") && <PeopleSelector m={m} set={set}/>}    
  </div>
}

function PeopleSelector({m,set}:{m:EventModel;set:SetModel}) {
  const fileRef=useRef<HTMLInputElement>(null)
  const [selected,setSelected]=useState<string[]>([])
  const [notice,setNotice]=useState("")
  const emailFor=(name:string)=>{
    const user=Object.values(USERS).find(u=>u.nombre===name)
    if(user) return user.correo
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z ]/g,"").trim().replace(/\s+/g,".")+"@sistecredito.com"
  }
  const addDirectory=()=>{
    const map=new Map(m.personas.map(p=>[p.correo,p]))
    selected.forEach(nombre=>{const correo=emailFor(nombre);map.set(correo,{nombre,correo,valido:true,error:""})})
    set({personas:Array.from(map.values())});setSelected([]);setNotice("Personas agregadas desde el Directorio Activo simulado.")
  }
  const parseText=(text:string)=>{
    const lines=text.split(/\r?\n/).filter(Boolean)
    const rows:PersonRow[]=lines.map(line=>{const parts=line.split(/[;,\t]/).map(x=>x.trim()); const correo=(parts.find(x=>x.includes("@"))||"").toLowerCase(); const nombre=parts.find(x=>!x.includes("@"))||correo; const valido=/^[^\s@]+@sistecredito\.com$/i.test(correo); return {nombre,correo,valido,error:valido?"":"Correo inválido o externo"}})
    const map=new Map(m.personas.map(p=>[p.correo,p]));rows.forEach(r=>map.set(r.correo||`${r.nombre}-${Date.now()}`,r));set({personas:Array.from(map.values())})
  }
  const importFile=(file:File)=>{
    if(file.name.toLowerCase().endsWith(".xlsx")){
      const sample=["Laura Roldán","Mario Franco","Sandra Roldán"].map(nombre=>({nombre,correo:emailFor(nombre),valido:true,error:""}))
      const map=new Map(m.personas.map(p=>[p.correo,p]));sample.forEach(p=>map.set(p.correo,p));set({personas:Array.from(map.values())});setNotice(`Excel "${file.name}" cargado en modo prototipo. En producción se leerán los correos reales del archivo.`);return
    }
    const reader=new FileReader();reader.onload=()=>{parseText(String(reader.result||""));setNotice(`Archivo "${file.name}" procesado.`)};reader.readAsText(file)
  }
  const valid=m.personas.filter(p=>p.valido), invalid=m.personas.filter(p=>!p.valido)
  return <div className="rounded-xl p-4 space-y-4" style={{background:"var(--gco-surface-2)",border:"1px solid var(--gco-border)"}}>
    <div><div className="font-bold text-sm flex items-center gap-2"><UserPlus size={16}/> Seleccionar personas</div><p className="text-xs mt-1" style={{color:"var(--gco-text-3)"}}>Puedes buscarlas en el Directorio Activo o adjuntar un Excel/CSV con los correos.</p></div>
    <Field label="Directorio Activo"><ChipSelect values={selected} onChange={setSelected} options={PEOPLE}/></Field>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={addDirectory} disabled={!selected.length} className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{background:"var(--gco-green)"}}>Agregar seleccionados</button><button type="button" onClick={()=>fileRef.current?.click()} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1" style={{border:"1px solid var(--gco-border)",background:"white"}}><Upload size={14}/> Adjuntar Excel/CSV</button><input ref={fileRef} className="hidden" type="file" accept=".xlsx,.xls,.csv,.txt" onChange={e=>{const f=e.target.files?.[0];if(f)importFile(f);e.target.value=""}}/></div>
    {notice&&<div className="text-xs rounded-lg p-2" style={{background:"var(--gco-blue-soft)",color:"var(--gco-blue)"}}>{notice}</div>}
    {!!m.personas.length&&<><div className="flex gap-2"><Chip tone="green">{valid.length} válidos</Chip>{invalid.length>0&&<Chip tone="red">{invalid.length} con error</Chip>}</div><div className="max-h-52 overflow-auto rounded-lg" style={{border:"1px solid var(--gco-border)"}}>{m.personas.map((p,i)=><div key={`${p.correo}-${i}`} className="flex items-center gap-2 px-3 py-2 text-xs border-b"><div className="flex-1"><b>{p.nombre}</b><div style={{color:"var(--gco-text-3)"}}>{p.correo}</div></div><Chip tone={p.valido?"green":"red"}>{p.valido?"Válido":p.error}</Chip><button type="button" onClick={()=>set({personas:m.personas.filter((_,idx)=>idx!==i)})}><X size={14}/></button></div>)}</div></>}
  </div>
}

function Schedule({m,set,errors}:{m:EventModel;set:SetModel;errors:Errors}) {
  const multi=m.estructura!=="sesion_unica"
  const patch=(id:string,p:Partial<FormSession>)=>set({sesiones:m.sesiones.map(s=>s.id===id?{...s,...p,duracionCalculada:hoursBetween(p.ini??s.ini,p.fin??s.fin),duracionContabilizable:hoursBetween(p.ini??s.ini,p.fin??s.fin)}:s)})
  const conflicts=detectConflicts(m)
  return <div className="space-y-5">
    <Field label="¿El espacio requiere varias sesiones?"><RadioCards value={multi?"si":"no"} onChange={v=>set({estructura:v==="si"?"programa_secuencial":"sesion_unica",sesiones:v==="si"?m.sesiones:[m.sesiones[0]||newSession(1)]})} options={[{value:"no",label:"No"},{value:"si",label:"Sí"}]}/></Field>
    <div className="space-y-3">{m.sesiones.map((s,i)=><div key={s.id} className="rounded-xl p-4" style={{border:"1px solid var(--gco-border)"}}><div className="flex justify-between mb-3"><b className="text-sm">{multi?`Sesión ${i+1}`:"Programación"}</b>{multi&&m.sesiones.length>1&&<button type="button" onClick={()=>set({sesiones:m.sesiones.filter(x=>x.id!==s.id)})}><Trash2 size={15}/></button>}</div><Grid cols={3}><Field label="Fecha" required error={errors[`s_${i}_fecha`]}><TextInput type="date" value={s.fecha} onChange={v=>patch(s.id,{fecha:v})}/></Field><Field label="Hora inicio" required><TextInput type="time" value={s.ini} onChange={v=>patch(s.id,{ini:v})}/></Field><Field label="Hora fin" required error={errors[`s_${i}_hora`]}><TextInput type="time" value={s.fin} onChange={v=>patch(s.id,{fin:v})}/></Field></Grid><Grid><Field label="Duración"><TextInput value={`${hoursBetween(s.ini,s.fin)} horas`} readOnly/></Field><Field label="Lugar o plataforma"><TextInput value={s.lugar||s.plataforma} onChange={v=>patch(s.id,{lugar:v,plataforma:v})} placeholder="Auditorio, Teams, zona restaurativa o dirección"/></Field></Grid></div>)}</div>
    {multi&&<button type="button" onClick={()=>set({sesiones:[...m.sesiones,newSession(m.sesiones.length+1)]})} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1" style={{border:"1px solid var(--gco-green)",color:"var(--gco-green-dark)"}}><Plus size={14}/> Agregar sesión</button>}
    {!!conflicts.length&&<div className="rounded-xl p-3" style={{background:"var(--gco-amber-soft)"}}><div className="flex gap-2 text-sm font-bold"><AlertTriangle size={16}/> Se detectaron {conflicts.length} cruces</div><p className="text-xs mt-1">Revisa el cronograma y selecciona otra fecha u horario.</p><Toggle checked={m.crossAccepted} onChange={v=>set({crossAccepted:v})} label="Continuar de todas formas"/>{m.crossAccepted&&<TextArea value={m.crossJustification} onChange={v=>set({crossJustification:v})} placeholder="Justifica por qué se mantiene el horario"/>}</div>}
  </div>
}

function CapacityAndSupport({m,set,errors}:{m:EventModel;set:SetModel;errors:Errors}) {
  return <div className="space-y-5">
    <Grid><Field label="¿Requiere cupos?"><RadioCards value={m.requiereCupos?"si":"no"} onChange={v=>set({requiereCupos:v==="si"})} options={[{value:"si",label:"Sí"},{value:"no",label:"No"}]}/></Field>{m.requiereCupos&&<Field label="Cantidad de cupos disponibles" required error={errors.cuposTotales}><TextInput type="number" value={m.cuposTotales} onChange={v=>set({cuposTotales:v})}/></Field>}</Grid>
    <Field label="¿Requiere inscripción?"><RadioCards value={m.requiereInscripcion?"si":"no"} onChange={v=>set({requiereInscripcion:v==="si"})} options={[{value:"si",label:"Sí"},{value:"no",label:"No"}]}/></Field>
    <Field label="Lugar o plataforma" required error={errors.lugarPlataforma}><RadioCards value={m.lugarPlataforma} onChange={v=>set({lugarPlataforma:v})} options={["Auditorios compañía","Plataforma For+","Zonas restaurativas (pisos)","Fuera de la compañía"].map(x=>({value:x,label:x}))} cols={2}/></Field>
    {m.lugarPlataforma==="Auditorios compañía"&&<Field label="Auditorio"><TextInput value={m.auditorio} onChange={v=>set({auditorio:v})}/></Field>}
    {m.lugarPlataforma==="Plataforma For+"&&<Field label="Enlace"><TextInput value={m.enlace} onChange={v=>set({enlace:v})} placeholder="https://..."/></Field>}
    {m.lugarPlataforma==="Zonas restaurativas (pisos)"&&<Field label="Piso o zona"><TextInput value={m.sede} onChange={v=>set({sede:v})}/></Field>}
    {m.lugarPlataforma==="Fuera de la compañía"&&<Field label="Dirección"><TextInput value={m.direccionExterna} onChange={v=>set({direccionExterna:v})}/></Field>}
    <Field label="¿Requieres apoyo en la gestión de parte de For+?"><RadioCards value={m.apoyoForPlus?"si":"no"} onChange={v=>set({apoyoForPlus:v==="si"})} options={[{value:"si",label:"Sí"},{value:"no",label:"No"}]}/></Field>
    {m.apoyoForPlus&&<Field label="Describe el apoyo requerido"><TextArea value={m.tipoApoyo} onChange={v=>set({tipoApoyo:v})}/></Field>}
    <GroupTitle>Foto o pieza para la inscripción del evento</GroupTitle>
    <Field hint="Corresponde a la pieza promocional del evento, no a una foto del speaker."><input type="file" accept=".png,.jpg,.jpeg,.pdf" className="w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(f)set({requierePieza:true,piezaEvento:{id:`ATT-${Date.now()}`,nombre:f.name,tipo:f.type,tamano:f.size,fechaCarga:new Date().toISOString(),cargadoPor:m.responsable,estadoValidacion:"valido"},piezaEstado:"Lista"})}}/>{m.piezaEvento&&<div className="mt-2 rounded-lg p-2 text-xs flex justify-between" style={{background:"var(--gco-green-soft)"}}><span>{m.piezaEvento.nombre} · {(m.piezaEvento.tamano/1024).toFixed(0)} KB</span><button type="button" onClick={()=>set({piezaEvento:null,requierePieza:false})}>Eliminar</button></div>}</Field>
    <div className="rounded-xl p-4" style={{background:"#eef6ff",border:"1px solid #b9d8ff"}}><div className="font-bold text-sm" style={{color:"#245d9f"}}>Datos complementarios para planeación</div><p className="text-xs mt-1" style={{color:"#376b9f"}}>No hacen parte de las 19 preguntas base. Son opcionales y ayudan a organizar aprobaciones posteriores.</p><div className="mt-3"><Toggle checked={m.permiteAprobacionesPosteriores} onChange={v=>set({permiteAprobacionesPosteriores:v})} label="Algunos inscritos podrían requerir aprobación posterior"/></div></div>
  </div>
}

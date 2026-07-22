"use client"

import { getEventLifecycle } from "@/lib/gco/domain"
import { useGco } from "@/lib/gco/store"
import { Bandeja, ExportButton, type BandejaTab } from "./bandeja"
import { Card } from "../ui"

export function GestionEventos() {
  const attendance = useGco((s) => s.attendance)
  const count = (eventId: string) => attendance.filter((a) => a.eventId === eventId).length
  const tabs: BandejaTab[] = [
    { key: "decision", label: "Requieren decisión", match: (e) => ["en_revision", "requiere_ajustes"].includes(getEventLifecycle(e, count(e.id)).key) },
    { key: "gestion", label: "Aprobados en gestión", match: (e) => getEventLifecycle(e, count(e.id)).principal === "Aprobado" },
    { key: "finalizados", label: "Finalizados", match: (e) => getEventLifecycle(e, count(e.id)).principal === "Finalizado" },
    { key: "no-continuan", label: "No continúan", match: (e) => ["rechazado", "aplazado", "cancelado"].includes(getEventLifecycle(e, count(e.id)).key) },
    { key: "todos", label: "Todos" },
  ]

  const events = useGco((s) => s.events)
  const decision = events.filter(e=>["en_revision","requiere_ajustes"].includes(getEventLifecycle(e,count(e.id)).key)).length
  const managing = events.filter(e=>getEventLifecycle(e,count(e.id)).principal==="Aprobado").length
  const closing = events.filter(e=>["aprobado_pendiente_asistencia","aprobado_pendiente_cierre"].includes(getEventLifecycle(e,count(e.id)).key)).length
  return <>
    <div className="grid grid-cols-3 gap-3 mb-5">
      <Card className="p-4"><div className="text-xs">Por decidir</div><b className="text-2xl">{decision}</b></Card>
      <Card className="p-4"><div className="text-xs">Aprobados en gestión</div><b className="text-2xl">{managing}</b></Card>
      <Card className="p-4"><div className="text-xs">Requieren cierre</div><b className="text-2xl">{closing}</b></Card>
    </div>
    <Bandeja
    crumbs={["Inicio", "Gestión de eventos"]}
    title="Gestión de eventos"
    sub="Revisa lo que requiere decisión y acompaña de forma clara el avance de los eventos aprobados."
    tabs={tabs}
    right={<ExportButton />}
  />
  </>
}

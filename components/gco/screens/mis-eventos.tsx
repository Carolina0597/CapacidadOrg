"use client"

import { getEventLifecycle } from "@/lib/gco/domain"
import { sel, useGco } from "@/lib/gco/store"
import { Bandeja, ExportButton, type BandejaTab } from "./bandeja"
import { Card } from "../ui"

export function MisEventos() {
  const user = useGco(sel.user)
  const attendance = useGco((s) => s.attendance)
  const count = (eventId: string) => attendance.filter((a) => a.eventId === eventId).length
  const tabs: BandejaTab[] = [
    { key: "todos", label: "Todos" },
    { key: "borradores", label: "Borradores", match: (e) => getEventLifecycle(e, count(e.id)).key === "borrador" },
    { key: "revision", label: "En revisión", match: (e) => getEventLifecycle(e, count(e.id)).key === "en_revision" },
    { key: "ajustes", label: "Requieren ajustes", match: (e) => getEventLifecycle(e, count(e.id)).key === "requiere_ajustes" },
    { key: "aprobados", label: "Aprobados en gestión", match: (e) => getEventLifecycle(e, count(e.id)).principal === "Aprobado" },
    { key: "finalizados", label: "Finalizados", match: (e) => getEventLifecycle(e, count(e.id)).principal === "Finalizado" },
    { key: "no-continuan", label: "No continúan", match: (e) => ["rechazado", "aplazado", "cancelado"].includes(getEventLifecycle(e, count(e.id)).key) },
  ]

  const own = useGco((s) => s.events.filter((e) => e.createdBy === user.id))
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4"><div className="text-xs">Todos mis eventos</div><b className="text-2xl">{own.length}</b></Card>
        <Card className="p-4"><div className="text-xs">En revisión</div><b className="text-2xl">{own.filter(e=>getEventLifecycle(e,count(e.id)).key==="en_revision").length}</b></Card>
        <Card className="p-4"><div className="text-xs">En inscripción</div><b className="text-2xl">{own.filter(e=>getEventLifecycle(e,count(e.id)).key==="aprobado_en_inscripcion").length}</b></Card>
        <Card className="p-4"><div className="text-xs">Pendientes de cierre</div><b className="text-2xl">{own.filter(e=>getEventLifecycle(e,count(e.id)).key==="aprobado_pendiente_cierre").length}</b></Card>
      </div>
      <Bandeja
      crumbs={["Inicio", "Mis eventos"]}
      title="Mis eventos"
      sub="Consulta el avance de tus eventos y abre el detalle para gestionar participantes, citaciones, asistencia y cierre."
      tabs={tabs}
      filter={(e) => e.createdBy === user.id}
      right={<ExportButton />}
      showClosureAction
    />
    </>
  )
}

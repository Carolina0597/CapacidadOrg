"use client"

import { Bandeja, ExportButton, type BandejaTab } from "./bandeja"

const TABS: BandejaTab[] = [
  { key: "decision", label: "Requieren decisión", match: (e) => ["enviado", "en_revision", "pendiente_priorizacion"].includes(e.estado) },
  { key: "aprobados", label: "Aprobados y programados", match: (e) => ["aprobado", "aprobado_condicionado", "priorizado_otro_periodo"].includes(e.estado) },
  { key: "inscripciones-activas", label: "Inscripciones activas", match: (e) => ["publicado", "inscripciones_abiertas"].includes(e.estado) },
  { key: "por-ejecutar", label: "Inscripciones cerradas / por ejecutar", match: (e) => ["inscripciones_cerradas", "gestion_participantes", "en_aprobacion", "cupos_asignados", "citacion_pendiente", "citado"].includes(e.estado) },
  { key: "cierre", label: "Ejecutados por cerrar", match: (e) => ["en_ejecucion", "pendiente_cierre"].includes(e.estado) },
  { key: "cerrados", label: "Cerrados", match: (e) => e.estado === "cerrado" },
  { key: "no-continuan", label: "No continúan", match: (e) => ["devuelto", "rechazado", "cancelado", "reprogramado"].includes(e.estado) },
  { key: "todos", label: "Todos" },
]

export function GestionEventos() {
  return <Bandeja
    crumbs={["Inicio", "Gestión de eventos"]}
    title="Gestión de eventos"
    sub="Identifica rápidamente qué debes decidir, qué está en inscripción, qué espera ejecución y qué requiere cierre."
    tabs={TABS}
    right={<ExportButton />}
  />
}

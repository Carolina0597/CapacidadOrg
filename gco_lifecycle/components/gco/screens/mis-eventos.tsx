"use client"

/* ============================================================================
 * GCO · MIS EVENTOS (Área promotora)
 * Bandeja de los eventos del área. Reagrupa inscritos y cupos, citaciones y
 * asistencia y cierre: todas esas funciones se abren desde el detalle del
 * evento. Cada evento muestra su próxima acción.
 * ========================================================================== */
import { sel, useGco } from "@/lib/gco/store"
import { Bandeja, ExportButton, type BandejaTab } from "./bandeja"

const TABS: BandejaTab[] = [
  { key: "todos", label: "Todos" },
  { key: "borradores", label: "Borradores", match: (e) => e.estado === "borrador" },
  { key: "revision", label: "En revisión", match: (e) => ["enviado", "en_revision"].includes(e.estado) },
  { key: "devueltos", label: "Devueltos", match: (e) => e.estado === "devuelto" },
  { key: "aprobados", label: "Aprobados", match: (e) => ["aprobado", "aprobado_condicionado"].includes(e.estado) },
  { key: "priorizados", label: "Priorizados", match: (e) => e.estado === "pendiente_priorizacion" },
  { key: "inscripciones", label: "Inscripciones abiertas", match: (e) => e.estado === "publicado" },
  { key: "proximos", label: "Próximos", match: (e) => ["aprobado", "aprobado_condicionado", "publicado"].includes(e.estado) },
  { key: "cierre", label: "Pendientes de cierre", match: (e) => e.estado === "pendiente_cierre" },
  { key: "cancelados", label: "Rechazados o cancelados", match: (e) => ["rechazado", "cancelado"].includes(e.estado) },
]

export function MisEventos() {
  const user = useGco(sel.user)
  return (
    <Bandeja
      crumbs={["Inicio", "Mis eventos"]}
      title="Mis eventos"
      sub="Los eventos de tu área promotora. Abre el detalle para gestionar participantes, citaciones, asistencia y cierre."
      tabs={TABS}
      filter={(e) => e.createdBy === user.id}
      right={<ExportButton />}
      showClosureAction
    />
  )
}

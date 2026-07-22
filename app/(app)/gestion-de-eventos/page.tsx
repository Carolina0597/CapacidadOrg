import { Suspense } from "react"
import { GestionEventos } from "@/components/gco/screens/gestion-eventos"

export default function GestionDeEventosPage() {
  return (
    <Suspense fallback={null}>
      <GestionEventos />
    </Suspense>
  )
}

import { Suspense } from "react"
import { MisEventos } from "@/components/gco/screens/mis-eventos"

export default function MisEventosPage() {
  return (
    <Suspense fallback={null}>
      <MisEventos />
    </Suspense>
  )
}

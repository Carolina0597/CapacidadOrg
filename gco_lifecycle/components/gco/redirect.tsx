"use client"

/* ============================================================================
 * GCO · REDIRECT — compatibilidad con rutas anteriores.
 * Reubica una ruta vieja hacia su nueva ubicación (bandeja o detalle) según el
 * rol activo. No pierde datos ni estados: solo cambia la navegación.
 * ========================================================================== */
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { sel, useGco } from "@/lib/gco/store"
import { redirectFor } from "@/lib/gco/routes"

export function Redirect({ from }: { from: string }) {
  const role = useGco(sel.role)
  const router = useRouter()

  useEffect(() => {
    const target = redirectFor(from, role) ?? "/"
    router.replace(target)
  }, [from, role, router])

  return (
    <div className="flex items-center justify-center py-24" style={{ color: "var(--gco-text-3)" }}>
      <Loader2 size={18} className="animate-spin" />
      <span className="ml-2 text-sm">Redirigiendo…</span>
    </div>
  )
}

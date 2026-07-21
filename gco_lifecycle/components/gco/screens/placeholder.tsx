"use client"

/* ============================================================================
 * GCO · PLACEHOLDER — módulo registrado, aún por construir.
 * Reutiliza el shell, el estado global y la persistencia existentes.
 * ========================================================================== */
import Link from "next/link"
import { iconOf, labelOf } from "@/lib/gco/routes"
import { cardStyle, PageHeader } from "../ui"

export function Placeholder({ routeKey }: { routeKey: string }) {
  const Icon = iconOf(routeKey)
  const label = labelOf(routeKey)
  return (
    <>
      <PageHeader
        crumbs={["Inicio", label]}
        title={label}
        sub="Módulo registrado en el mapa de navegación; se construirá sobre este mismo shell."
      />
      <section style={cardStyle}>
        <div className="py-14 text-center px-6">
          <span
            className="inline-flex items-center justify-center rounded-full mb-3"
            style={{ width: 56, height: 56, background: "var(--gco-green-soft)" }}
          >
            <Icon size={26} style={{ color: "var(--gco-green-dark)" }} />
          </span>
          <h4 className="text-sm font-bold">“{label}” en construcción</h4>
          <p className="text-xs max-w-sm mx-auto mt-1 mb-4" style={{ color: "var(--gco-text-2)" }}>
            El estado global, las rutas y la persistencia ya están disponibles para cuando se construya este módulo.
          </p>
          <Link
            href="/"
            className="fx inline-flex items-center justify-center gap-2 text-sm font-bold text-white rounded-[10px] px-4 py-2.5"
            style={{ background: "var(--gco-green)" }}
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </>
  )
}

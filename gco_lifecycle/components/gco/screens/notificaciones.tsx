"use client"

/* ============================================================================
 * GCO · NOTIFICACIONES (página completa)
 * Lista las notificaciones del rol activo desde el estado global.
 * ========================================================================== */
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { ROLE_LABEL } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { cardStyle, Chip, PageHeader } from "../ui"

export function Notificaciones() {
  const role = useGco(sel.role)
  const list = useGco(sel.notifsFor(role))

  return (
    <>
      <PageHeader crumbs={["Inicio", "Notificaciones"]} title="Notificaciones" sub="Generadas por el estado global de la aplicación." />
      <div style={cardStyle}>
        <div className="p-3">
          {list.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--gco-text-3)" }}>
              Sin notificaciones para {ROLE_LABEL[role]}
            </div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => A.markRead(n.id)}
                className="fx w-full text-left px-3 py-3 flex gap-3 rounded-[10px] hover:bg-[color:var(--gco-surface-2)]"
                style={{ background: n.leida ? "transparent" : "var(--gco-surface-2)" }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-[10px] shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    background: n.fallida ? "var(--gco-red-soft)" : n.requiereAccion ? "var(--gco-amber-soft)" : "var(--gco-blue-soft)",
                  }}
                >
                  {n.fallida ? (
                    <AlertCircle size={16} style={{ color: "var(--gco-red)" }} />
                  ) : n.requiereAccion ? (
                    <AlertTriangle size={16} style={{ color: "#b98c00" }} />
                  ) : (
                    <Info size={16} style={{ color: "var(--gco-blue)" }} />
                  )}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <b className="text-sm">{n.titulo}</b>
                    {!n.leida && <span className="w-2 h-2 rounded-full" style={{ background: "var(--gco-green)" }} />}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: "var(--gco-text-2)" }}>
                    {n.descripcion}
                  </span>
                  {n.requiereAccion && (
                    <span className="inline-block mt-1">
                      <Chip tone="amber">Requiere acción</Chip>
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

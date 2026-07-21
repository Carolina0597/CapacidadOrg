"use client"

/* ============================================================================
 * GCO · PANEL RÁPIDO DE NOTIFICACIONES (drawer lateral)
 * Lee del estado global filtrando por rol; permite marcar leídas.
 * ========================================================================== */
import { AlertCircle, AlertTriangle, CheckCheck, Info, X } from "lucide-react"
import type { Role } from "@/lib/gco/domain"
import { A, sel, useGco } from "@/lib/gco/store"
import { Chip } from "./ui"

export function NotifDrawer({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const list = useGco(sel.notifsFor(role))
  if (!open) return null
  return (
    <div className="fixed inset-0" style={{ zIndex: 50 }}>
      <div className="absolute inset-0" style={{ background: "rgba(16,24,40,.4)" }} onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[400px] flex flex-col fade"
        style={{ background: "var(--gco-surface)", boxShadow: "var(--gco-sh-pop)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--gco-border)" }}>
          <h3 className="font-bold" style={{ fontSize: 16 }}>
            Notificaciones
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => A.markAllRead(role)}
              className="fx text-xs font-semibold inline-flex items-center gap-1"
              style={{ color: "var(--gco-green-dark)" }}
            >
              <CheckCheck size={14} />
              Marcar todas
            </button>
            <button type="button" onClick={onClose} className="fx p-1">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto sc">
          {list.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--gco-text-3)" }}>
              Sin notificaciones
            </div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => A.markRead(n.id)}
                className="fx w-full text-left px-4 py-3.5 flex gap-3"
                style={{ borderBottom: "1px solid var(--gco-border)", background: n.leida ? "var(--gco-surface)" : "var(--gco-surface-2)" }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-[10px] shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    background: n.fallida
                      ? "var(--gco-red-soft)"
                      : n.requiereAccion
                        ? "var(--gco-amber-soft)"
                        : "var(--gco-blue-soft)",
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
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold">{n.titulo}</span>
                    {!n.leida && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--gco-green)" }} />}
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
    </div>
  )
}

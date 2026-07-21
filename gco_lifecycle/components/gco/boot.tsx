"use client"

/* ============================================================================
 * GCO · BOOT — capa de arranque/autenticación simulada.
 * Valida la información y permisos del colaborador antes de montar el shell.
 * ========================================================================== */
import { useEffect, useState } from "react"
import { Building2, Check, Loader2 } from "lucide-react"
import { cardStyle } from "./ui"

const FIELDS = [
  "Nombre",
  "Cédula",
  "Correo",
  "Cargo",
  "Área",
  "Vicepresidencia",
  "Líder directo",
  "Roles",
  "Permisos",
  "Estado activo",
]

export function Boot({ onReady }: { onReady: () => void }) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const ts = FIELDS.map((_, i) => setTimeout(() => setDone(i + 1), 180 + i * 110))
    const end = setTimeout(onReady, 180 + FIELDS.length * 110 + 300)
    return () => {
      ts.forEach(clearTimeout)
      clearTimeout(end)
    }
  }, [onReady])

  return (
    <div className="gco min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center fade">
        <div
          className="inline-flex items-center justify-center rounded-[18px] mb-4"
          style={{ width: 58, height: 58, background: "var(--gco-navy)" }}
        >
          <Building2 size={26} className="text-white" />
        </div>
        <div className="font-extrabold" style={{ fontSize: 20 }}>
          <span style={{ color: "var(--gco-navy)" }}>siste</span>
          <span style={{ color: "var(--gco-green)" }}>crédito</span>
        </div>
        <div className="font-extrabold mt-1" style={{ color: "var(--gco-green)" }}>
          For+
        </div>
        <p className="text-sm mt-2 mb-4" style={{ color: "var(--gco-text-2)" }}>
          Estamos validando tu información y permisos
        </p>
        <div className="p-4 rounded-[16px] text-left" style={cardStyle}>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map((f, i) => {
              const ready = i < done
              return (
                <div
                  key={f}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: ready ? "var(--gco-text)" : "var(--gco-text-3)" }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      background: ready ? "var(--gco-green-soft)" : "var(--gco-surface-2)",
                      border: ready ? "none" : "1px solid var(--gco-border)",
                    }}
                  >
                    {ready ? (
                      <Check size={11} style={{ color: "var(--gco-green-dark)" }} />
                    ) : (
                      <Loader2 size={10} className="spin" style={{ color: "var(--gco-text-3)" }} />
                    )}
                  </span>
                  {f}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

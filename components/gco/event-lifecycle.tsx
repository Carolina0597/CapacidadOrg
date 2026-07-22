"use client"

import { getEventLifecycle, type GcoEvent } from "@/lib/gco/domain"

const STEPS = ["Creado", "Revisión", "Aprobado", "Publicación", "Ejecución", "Asistencia", "Cierre"]

const COLORS: Record<string, string> = {
  neutral: "#98A2B3",
  info: "#2F80ED",
  success: "#2EAA52",
  green: "#2EAA52",
  amber: "#D99B19",
  orange: "#E67E22",
  red: "#D92D20",
  purple: "#7F56D9",
  blue: "#2574A9",
}

export function EventLifecycleLine({ event, attendanceCount = 0, compact = false }: { event: GcoEvent; attendanceCount?: number; compact?: boolean }) {
  const life = getEventLifecycle(event, attendanceCount)
  const terminalAlternative = ["requiere_ajustes", "rechazado", "aplazado", "cancelado"].includes(life.key)
  const color = COLORS[life.tone] || COLORS.neutral

  return (
    <div className={compact ? "mt-2 min-w-[260px]" : "rounded-xl p-4"} style={compact ? undefined : { border: "1px solid var(--gco-border)", background: "var(--gco-surface-2)" }}>
      {!compact && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--gco-text-3)" }}>Estado del evento</div>
            <div className="text-base font-extrabold mt-1">{life.principal}{life.subestado ? ` · ${life.subestado}` : ""}</div>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>{life.nextAction}</div>
        </div>
      )}
      <div className="flex items-start">
        {STEPS.map((label, index) => {
          const done = !terminalAlternative && index < life.step
          const current = !terminalAlternative && index === life.step
          return (
            <div key={label} className="flex-1 min-w-0 relative">
              {index < STEPS.length - 1 && <div className="absolute top-[6px] left-1/2 right-[-50%] h-[2px]" style={{ background: done ? "var(--gco-green)" : "var(--gco-border)" }} />}
              <div className="relative z-10 flex flex-col items-center text-center">
                <span className="w-3 h-3 rounded-full border-2" style={{ background: done ? "var(--gco-green)" : current ? color : "white", borderColor: done ? "var(--gco-green)" : current ? color : "var(--gco-border-strong)" }} />
                {!compact && <span className="text-[10.5px] mt-2 leading-tight" style={{ color: current ? color : done ? "var(--gco-green-dark)" : "var(--gco-text-3)", fontWeight: current || done ? 700 : 500 }}>{label}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {terminalAlternative && <div className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: `${color}12`, color }}>{life.principal}: {life.nextAction}</div>}
    </div>
  )
}

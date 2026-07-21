"use client"

/* ============================================================================
 * GCO · APP SHELL reutilizable
 * Sidebar navy role-adaptive + topbar (selector de rol, periodo, panel rápido
 * de notificaciones, switch de usuario demo). Enruta con rutas reales.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  HelpCircle,
  Menu,
  RotateCcw,
  UserCog,
} from "lucide-react"
import { PERIODOS, ROLE_LABEL, USERS, type Role } from "@/lib/gco/domain"
import { A, hydrateFromStorage, sel, useGco } from "@/lib/gco/store"
import { canCreateEvent, CREATE_EVENT, navForRole, REAL_SCREENS, routeByHref } from "@/lib/gco/routes"
import { Boot } from "./boot"
import { NotifDrawer } from "./notif-drawer"
import { cx, Modal } from "./ui"

export function AppShell({ children }: { children: React.ReactNode }) {
  const booted = useGco((s) => s.session.booted)
  const role = useGco(sel.role)
  const periodo = useGco((s) => s.session.periodo)
  const user = useGco(sel.user)
  const unread = useGco(sel.unread(role))

  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [perOpen, setPerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)
  const perRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false)
      if (perRef.current && !perRef.current.contains(e.target as Node)) setPerOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    // Tras el montaje en cliente: rehidratamos desde localStorage y marcamos
    // montado. Antes de esto renderizamos el mismo Boot que el servidor, de
    // modo que el primer paint coincide y no hay mismatch de hidratación.
    hydrateFromStorage()
    setMounted(true)
  }, [])

  useEffect(() => {
    setMobileNav(false)
  }, [pathname])

  const groups = useMemo(() => navForRole(role), [role])
  const activeKey = routeByHref(pathname)?.key ?? "inicio"

  const changeRole = (r: Role) => {
    A.setRole(r)
    setRoleOpen(false)
    const visible = navForRole(r).some((g) => g.items.some((i) => i.href === pathname))
    if (!visible) router.push("/")
  }
  const switchUser = (id: string) => {
    A.login(id)
    setLoginOpen(false)
    router.push("/")
  }

  // Hasta el montaje en cliente mostramos el mismo Boot que renderiza el
  // servidor (evita mismatch de hidratación con estado persistido en LS).
  if (!mounted || !booted) return <Boot onReady={() => A.boot()} />

  const sidebar = (
    <div className="flex flex-col h-full" style={{ background: "var(--gco-navy)" }}>
      {/* Marca Sistecrédito + For+ */}
      <div className="px-5 pt-6 pb-5">
        <div className="font-extrabold leading-none" style={{ fontSize: 21, letterSpacing: "-0.01em" }}>
          <span className="text-white">siste</span>
          <span style={{ color: "var(--gco-green)" }}>crédito</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-extrabold leading-none" style={{ color: "var(--gco-green)", fontSize: 17 }}>
            For+
          </span>
          <span className="text-[11px] leading-tight" style={{ color: "var(--gco-navy-muted)" }}>
            Formación
            <br />
            que transforma
          </span>
        </div>
      </div>

      {canCreateEvent(role) && (
        <div className="px-3 pb-3">
          <Link
            href={CREATE_EVENT.href}
            aria-current={activeKey === CREATE_EVENT.key ? "page" : undefined}
            className="fx w-full flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13.5px] font-bold text-white"
            style={{ background: "var(--gco-green)" }}
          >
            <CalendarPlus size={17} strokeWidth={2.2} />
            {CREATE_EVENT.label}
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto nsc px-3 pb-4 space-y-4">
        {groups.map((g) => (
          <div key={g.group}>
            <div
              className="px-3 mb-1.5 text-[10px] font-bold uppercase"
              style={{ color: "var(--gco-navy-muted)", letterSpacing: "0.08em" }}
            >
              {g.group}
            </div>
            <div className="space-y-1">
              {g.items.map((item) => {
                const Icon = item.icon
                const on = item.key === activeKey
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className="fx group w-full flex items-center gap-3 rounded-[10px] pl-3 pr-2.5 py-2.5 text-[13.5px] font-medium transition-colors"
                    style={
                      on
                        ? { background: "var(--gco-green)", color: "#fff", fontWeight: 600 }
                        : { color: "var(--gco-navy-text)" }
                    }
                    onMouseEnter={(e) => {
                      if (!on) e.currentTarget.style.background = "rgba(255,255,255,.05)"
                    }}
                    onMouseLeave={(e) => {
                      if (!on) e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <Icon size={17} strokeWidth={on ? 2.4 : 1.9} style={{ color: on ? "#fff" : "var(--gco-navy-muted)" }} />
                    <span className="truncate">{item.label}</span>
                    {!REAL_SCREENS.includes(item.key) && (
                      <span
                        className="ml-auto text-[8.5px] font-bold px-1.5 py-0.5 rounded-full tracking-wide"
                        style={{
                          background: on ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.07)",
                          color: on ? "#fff" : "var(--gco-navy-muted)",
                        }}
                      >
                        PRONTO
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Cohete + tagline (como en las referencias) */}
      <div className="mt-auto px-4 pb-5 pt-2">
        <div
          className="w-full overflow-hidden rounded-[14px] mb-3"
          style={{ border: "1px solid var(--gco-navy-line)" }}
        >
          <img
            src="/gco/rocket.png"
            alt=""
            aria-hidden="true"
            className="block w-full select-none pointer-events-none"
          />
        </div>
        <p className="text-[12px] leading-snug font-medium px-1" style={{ color: "var(--gco-navy-text)" }}>
          Impulsamos el desarrollo que mueve a{" "}
          <span className="font-bold text-white">
            Siste<span style={{ color: "var(--gco-green)" }}>crédito</span>
          </span>
        </p>
      </div>
    </div>
  )

  return (
    <div className="gco min-h-screen flex">
      <aside className="hidden lg:block shrink-0" style={{ width: 232 }}>
        <div className="fixed top-0 left-0 h-screen" style={{ width: 232 }}>
          {sidebar}
        </div>
      </aside>
      {mobileNav && (
        <div className="lg:hidden fixed inset-0 flex" style={{ zIndex: 50 }}>
          <div className="absolute inset-0" style={{ background: "rgba(9,20,40,.5)" }} onClick={() => setMobileNav(false)} />
          <div className="relative w-64 h-full fade">{sidebar}</div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 flex items-center gap-2 px-4 md:px-8"
          style={{
            height: 64,
            background: "var(--gco-surface)",
            borderBottom: "1px solid var(--gco-border)",
            zIndex: 30,
          }}
        >
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            className="fx lg:hidden p-1.5 rounded-lg"
            style={{ color: "var(--gco-text)" }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          {/* Marca compacta solo en móvil (en desktop vive en el sidebar) */}
          <span className="lg:hidden font-extrabold" style={{ fontSize: 15 }}>
            <span style={{ color: "var(--gco-navy)" }}>siste</span>
            <span style={{ color: "var(--gco-green)" }}>crédito</span>
          </span>

          <div className="flex-1" />

          {/* Selector de periodo */}
          <div className="relative" ref={perRef}>
            <button
              type="button"
              onClick={() => setPerOpen((o) => !o)}
              className="fx hidden sm:inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold"
              style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)", color: "var(--gco-text)" }}
            >
              <CalendarDays size={15} style={{ color: "var(--gco-green-dark)" }} />
              {periodo}
              <ChevronDown size={14} style={{ color: "var(--gco-text-3)" }} />
            </button>
            {perOpen && (
              <div className="absolute right-0 mt-1.5 w-44 py-1.5 pop" style={{ ...cardWhite, zIndex: 40 }}>
                {PERIODOS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      A.setPeriodo(p)
                      setPerOpen(false)
                    }}
                    className="fx w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[color:var(--gco-surface-2)]"
                    style={{ color: "var(--gco-text)" }}
                  >
                    {p}
                    {p === periodo && <Check size={14} style={{ color: "var(--gco-green-dark)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector de rol */}
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleOpen((o) => !o)}
              className="fx inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-semibold"
              style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)", color: "var(--gco-text)" }}
            >
              <UserCog size={15} style={{ color: "var(--gco-navy)" }} />
              <span className="hidden sm:inline">{ROLE_LABEL[role]}</span>
              <ChevronDown size={14} style={{ color: "var(--gco-text-3)" }} />
            </button>
            {roleOpen && (
              <div className="absolute right-0 mt-1.5 w-56 py-1.5 pop" style={{ ...cardWhite, zIndex: 40 }}>
                <div className="px-3 py-1 text-[11px] font-semibold uppercase" style={{ color: "var(--gco-text-3)" }}>
                  Rol activo
                </div>
                {user.roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => changeRole(r)}
                    className="fx w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[color:var(--gco-surface-2)]"
                    style={{ color: "var(--gco-text)" }}
                  >
                    {ROLE_LABEL[r]}
                    {r === role && <Check size={14} style={{ color: "var(--gco-green-dark)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden md:inline-block w-px h-6 mx-1" style={{ background: "var(--gco-border)" }} />

          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="fx relative p-2 rounded-lg"
            style={{ color: "var(--gco-text-2)" }}
            aria-label="Notificaciones"
          >
            <Bell size={19} strokeWidth={1.9} />
            {unread > 0 && (
              <span
                className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center text-white"
                style={{ background: "var(--gco-red)" }}
              >
                {unread}
              </span>
            )}
          </button>
          <button type="button" className="fx p-2 rounded-lg" style={{ color: "var(--gco-text-2)" }} aria-label="Ayuda">
            <HelpCircle size={19} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="fx flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full"
            style={{ background: "var(--gco-surface-2)", border: "1px solid var(--gco-border)" }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ width: 30, height: 30, background: "var(--gco-navy)" }}
            >
              {user.ini}
            </span>
            <span className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold" style={{ color: "var(--gco-text)" }}>
                {user.corto}
              </span>
              <span className="text-[11px]" style={{ color: "var(--gco-text-3)" }}>
                {ROLE_LABEL[role]}
              </span>
            </span>
            <ChevronDown size={13} className="hidden md:inline" style={{ color: "var(--gco-text-3)" }} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto sc">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-7 pb-16">{children}</div>
        </main>
      </div>

      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} role={role} />

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title="Cambiar usuario de demostración" w={420}>
        <p className="text-sm mb-3" style={{ color: "var(--gco-text-2)" }}>
          El usuario activo y su rol se guardan y sobreviven a la recarga.
        </p>
        {Object.values(USERS).map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => switchUser(x.id)}
            className="fx w-full flex items-center gap-3 p-3 rounded-[12px] mb-2 text-left"
            style={{
              border: `1.5px solid ${user.id === x.id ? "var(--gco-green)" : "var(--gco-border)"}`,
              background: user.id === x.id ? "var(--gco-green-soft)" : "var(--gco-surface)",
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ width: 36, height: 36, background: "var(--gco-navy)" }}
            >
              {x.ini}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{x.nombre}</span>
              <span className="block text-xs" style={{ color: "var(--gco-text-3)" }}>
                {x.cargo} · {x.roles.map((r) => ROLE_LABEL[r]).join(", ")}
              </span>
            </span>
            {user.id === x.id && <Check size={16} style={{ color: "var(--gco-green-dark)" }} />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            A.reset()
            setLoginOpen(false)
            router.push("/")
          }}
          className="fx text-xs mt-1"
          style={{ color: "var(--gco-red)" }}
        >
          <RotateCcw size={12} className="inline" /> Reiniciar datos de demostración
        </button>
      </Modal>
    </div>
  )
}

const cardWhite = {
  background: "var(--gco-surface)",
  border: "1px solid var(--gco-border)",
  borderRadius: "var(--gco-r-lg)",
  boxShadow: "var(--gco-sh-pop)",
} as const

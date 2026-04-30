import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarRange,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { BarbeyondLogo } from "@/components/BarbeyondLogo";
import { notify } from "@/lib/toast";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Anasayfa", icon: LayoutDashboard },
  { to: "/admin/appointments", label: "Randevular", icon: CalendarRange },
  { to: "/admin/barbers", label: "Berberler", icon: Users },
  { to: "/admin/services", label: "Hizmetler", icon: Scissors },
  { to: "/admin/settings", label: "Ayarlar", icon: Settings },
  { to: "/admin/change-password", label: "Şifre Değiştir", icon: KeyRound },
];

export function AdminLayout() {
  const username = useAuthStore((s) => s.username);
  const logoutAction = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logoutAction();
    notify.success("Çıkış yapıldı.");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="h-screen bg-charcoal-50 flex overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-charcoal-900 text-charcoal-100
                    border-r border-charcoal-700/40 flex flex-col h-screen
                    transform transition-transform duration-300 ease-out
                    md:relative md:inset-auto md:translate-x-0 md:shrink-0
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        aria-label="Admin sidebar"
      >
        <div className="px-6 py-6 border-b border-charcoal-700/40 flex items-center justify-between">
          <BarbeyondLogo size="sm" variant="light" asLink={false} />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded text-charcoal-200 hover:text-oldGold-500"
            aria-label="Menüyü kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm transition-colors
                   ${
                     isActive
                       ? "bg-oldGold-500/15 text-oldGold-500"
                       : "text-charcoal-200 hover:bg-charcoal-700/40 hover:text-white"
                   }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-charcoal-700/40 space-y-2">
          <div className="px-3 py-2 text-xs text-charcoal-300">
            Giriş yapan
            <p className="text-sm text-white font-medium truncate">
              {username ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                       font-body text-sm text-charcoal-200
                       border border-charcoal-700/60
                       hover:border-statusBusy/60 hover:text-statusBusy
                       transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="shrink-0 z-30 h-16 bg-white border-b border-charcoal-100 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-charcoal-500 hover:text-oldGold-600 hover:bg-charcoal-50 transition-colors"
              aria-label="Menüyü aç"
            >
              <Menu className="w-5 h-5" />
            </button>
            <BarbeyondLogo size="sm" asLink={false} />
          </div>

          <div className="hidden md:block">
            <p className="font-body text-xs tracking-[0.3em] uppercase text-charcoal-300">
              Admin Paneli
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-charcoal-500">
              {username ?? ""}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                         border border-charcoal-100 text-charcoal-500
                         hover:border-statusBusy/60 hover:text-statusBusy
                         text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

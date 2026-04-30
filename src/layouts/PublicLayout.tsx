import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Menu, X, Phone, Instagram } from "lucide-react";
import { BarbeyondLogo } from "@/components/BarbeyondLogo";

interface NavItem {
  to: string;
  label: string;
  /** End match için (sadece "/" route'u için) */
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Anasayfa", end: true },
  { to: "/hizmetler", label: "Hizmetler" },
  { to: "/berberler", label: "Berberler" },
  { to: "/randevumu-bul", label: "Randevumu Bul" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "font-body text-sm tracking-wide transition-colors duration-200",
    isActive
      ? "text-oldGold-600"
      : "text-charcoal-500 hover:text-oldGold-600",
  ].join(" ");
}

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BarbeyondLogo size="sm" />

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              to="/randevu-al"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                         bg-oldGold-500 hover:bg-oldGold-600
                         text-white text-sm font-medium tracking-wide
                         transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-oldGold-500 focus:ring-offset-2"
            >
              <Phone className="w-4 h-4" />
              Randevu Al
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((s) => !s)}
            className="md:hidden p-2 rounded-lg text-charcoal-500 hover:text-oldGold-600 hover:bg-charcoal-50 transition-colors"
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-charcoal-100 bg-white">
            <nav className="px-4 py-4 flex flex-col gap-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `py-2 px-3 rounded-lg font-body text-sm transition-colors ${
                      isActive
                        ? "bg-oldGold-50 text-oldGold-600"
                        : "text-charcoal-500 hover:bg-charcoal-50"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-charcoal-100 bg-charcoal-900 text-charcoal-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <BarbeyondLogo size="md" variant="light" asLink={false} />
            <p className="text-sm text-charcoal-200 max-w-xs">
              Modern, lüks ve minimalist berber deneyimi.
            </p>
          </div>

          <div>
            <h4 className="font-display text-lg text-white mb-4">Bağlantılar</h4>
            <ul className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-charcoal-200 hover:text-oldGold-500 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg text-white mb-4">İletişim</h4>
            <div className="flex items-center gap-4 text-charcoal-200">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-oldGold-500 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-charcoal-700/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-charcoal-300">
            © {new Date().getFullYear()} Barbeyond. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}

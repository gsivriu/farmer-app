import { useEffect } from "react";

const T = {
  bg: "#F8F7F5",
  surface: "#FFFFFF",
  surface2: "#F2F1EF",
  border: "#E5E3DF",
  ink: "#0F0F0E",
  ink2: "#6B6860",
  ink3: "#A8A49E",
  red: "#B9101E",
};

const NAV = [
  {
    id: "home",
    label: "Acasă",
    // home icon
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l6-5 6 5v6.5a.5.5 0 0 1-.5.5H10v-4H6v4H2.5a.5.5 0 0 1-.5-.5V7z" />
      </svg>
    ),
  },
  {
    id: "bids",
    label: "Oferte",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2.5h6.5L13 6v7.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11z" />
        <path d="M9 2.5V6h3.5" />
        <path d="M5.5 9h5M5.5 11.5h3.5" />
      </svg>
    ),
  },
  {
    id: "farmers",
    label: "Fermieri",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.5" />
        <path d="M2 13.5a4 4 0 0 1 8 0" />
        <circle cx="11.5" cy="5.5" r="2" />
        <path d="M10.5 13.5a3.5 3.5 0 0 1 4.5-3.35" />
      </svg>
    ),
  },
  {
    id: "motherboard",
    label: "Motherboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
];

function injectCss() {
  if (typeof document === "undefined" || document.getElementById("am-sidebar-base")) return;
  const s = document.createElement("style");
  s.id = "am-sidebar-base";
  s.textContent = `
    .admin-layout-with-sidebar { display: block; gap: 0; }
    .admin-layout-with-sidebar .desktop-nav { display: none !important; }
    .admin-layout-with-sidebar .admin-main { display: flex; flex-direction: column; min-height: 100%; }
    .am-sidebar { display: none; }
    @media (min-width: 1024px) {
      .admin-layout-with-sidebar {
        display: grid;
        grid-template-columns: 232px 1fr;
        min-height: 100vh;
        background: ${T.bg};
      }
      .am-sidebar {
        display: flex;
        flex-direction: column;
        background: ${T.surface};
        border-right: 1px solid ${T.border};
        padding: 14px 10px;
        position: sticky;
        top: 0;
        align-self: start;
        height: 100vh;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: ${T.ink};
      }
      .am-sidebar .am-brand {
        display: flex; align-items: center; gap: 10px;
        padding: 4px 8px 14px;
      }
      .am-sidebar .am-brand-logo {
        width: 24px; height: 24px; border-radius: 6px; background: ${T.red};
        display: inline-flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 700; font-size: 12px; letter-spacing: -0.5px;
      }
      .am-sidebar .am-brand-name {
        font-size: 13.5px; font-weight: 600; letter-spacing: -0.2px; color: ${T.ink};
      }
      .am-sidebar .am-brand-name .am-brand-sub { color: ${T.ink3}; font-weight: 500; }
      .am-sidebar .am-section-label {
        font-size: 10.5px; font-weight: 600; color: ${T.ink3};
        letter-spacing: 0.06em; text-transform: uppercase;
        padding: 8px 10px;
      }
      .am-sidebar .am-tag {
        margin-left: auto; padding: 2px 6px; border-radius: 4px;
        background: ${T.surface2}; color: ${T.ink3};
        font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
        font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
      }
      .am-sidebar .am-nav-item {
        position: relative;
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px; margin-bottom: 1px;
        border-radius: 7px; border: none; background: transparent;
        color: ${T.ink2}; font-size: 13.5px; font-weight: 500;
        cursor: pointer; letter-spacing: -0.1px; text-align: left;
        width: 100%;
        font-family: inherit;
        transition: background-color .12s ease, color .12s ease;
      }
      .am-sidebar .am-nav-item:hover { background: ${T.surface2}; color: ${T.ink}; }
      .am-sidebar .am-nav-item.active {
        background: ${T.surface2}; color: ${T.ink}; font-weight: 600;
      }
      .am-sidebar .am-nav-item.active::before {
        content: ""; position: absolute; left: -10px; top: 8px; bottom: 8px;
        width: 2px; background: ${T.red}; border-radius: 1px;
      }
      .am-sidebar .am-nav-spacer { flex: 1; }
      .am-sidebar .am-foot {
        padding-top: 12px; margin-top: 12px;
        border-top: 1px solid ${T.border};
        font-size: 11px; color: ${T.ink2};
        padding-left: 10px; padding-right: 10px;
      }
      .admin-layout-with-sidebar .bottom-nav { display: none !important; }
      .admin-layout-with-sidebar .admin-main { min-height: 100vh; }
    }
  `;
  document.head.appendChild(s);
}

export default function AdminSidebar({ activeTab, onChange }) {
  useEffect(() => {
    injectCss();
  }, []);

  return (
    <aside className="am-sidebar" aria-label="Navigare administrator">
      <div className="am-brand">
        <span className="am-brand-logo">A</span>
        <span className="am-brand-name">
          Ameropa <span className="am-brand-sub">Multiverse</span>
        </span>
        <span className="am-tag">ADMIN</span>
      </div>

      <div className="am-section-label">Administrare</div>

      {NAV.map((n) => (
        <button
          key={n.id}
          type="button"
          className={"am-nav-item" + (activeTab === n.id ? " active" : "")}
          onClick={() => onChange(n.id)}
          aria-current={activeTab === n.id ? "page" : undefined}
        >
          <span style={{ display: "inline-flex", color: activeTab === n.id ? T.ink : T.ink2 }}>
            {n.icon}
          </span>
          <span>{n.label}</span>
        </button>
      ))}

      <div className="am-nav-spacer" />

      <div className="am-foot">Ameropa Grains România · 2026</div>
    </aside>
  );
}

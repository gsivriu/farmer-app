import { useEffect, useState } from "react";
import HomeTab from "./HomeTab";
import BidsTab from "./BidsTab";
import FarmiersTab from "./FarmiersTab";
import AdminSidebar from "./AdminSidebar.jsx";

const VALID_TABS = ["home", "bids", "farmers"];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    const stored = window.localStorage.getItem("admin-active-tab");
    return VALID_TABS.includes(stored) ? stored : "home";
  });

  useEffect(() => {
    window.localStorage.setItem("admin-active-tab", activeTab);
  }, [activeTab]);

  return (
    <div className="admin-layout admin-layout-with-sidebar">
      <AdminSidebar activeTab={activeTab} onChange={setActiveTab} />

      <div className="admin-main">
        <div className="tab-content admin-tab-content">
          <div className={"tab-pane admin-home-pane" + (activeTab === "home" ? " active" : "")}>
            <HomeTab />
          </div>

          <div className={activeTab === "bids" ? "tab-pane active" : "tab-pane"}>
            <BidsTab />
          </div>

          <div className={activeTab === "farmers" ? "tab-pane active" : "tab-pane"}>
            {activeTab === "farmers" && <FarmiersTab />}
          </div>
        </div>

        <nav className="bottom-nav admin-bottom-nav">
          <button
            type="button"
            className={"nav-item " + (activeTab === "home" ? "active" : "")}
            onClick={() => setActiveTab("home")}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5z" />
            </svg>
            <span className="nav-label">Acasă</span>
          </button>
          <button
            type="button"
            className={"nav-item " + (activeTab === "bids" ? "active" : "")}
            onClick={() => setActiveTab("bids")}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7.5V6a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V16" />
              <path d="M14 4v6h6" />
            </svg>
            <span className="nav-label">Oferte</span>
          </button>
          <button
            type="button"
            className={"nav-item " + (activeTab === "farmers" ? "active" : "")}
            onClick={() => setActiveTab("farmers")}
          >
            <svg
              className="nav-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="nav-label">Fermieri</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

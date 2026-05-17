import { useEffect, useState } from "react";
import HomeTab from "./HomeTab";
import BidsTab from "./BidsTab";
import FarmiersTab from "./FarmiersTab";
import MotherboardPage from "../Motherboard";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() =>
    window.localStorage.getItem("admin-active-tab") || "home"
  );

  useEffect(() => {
    window.localStorage.setItem("admin-active-tab", activeTab);
  }, [activeTab]);

  return (
    <div className="admin-layout">
      <nav className="desktop-nav">
        <button
          type="button"
          className={"nav-item " + (activeTab === "home" ? "active" : "")}
          onClick={() => setActiveTab("home")}
        >
          Acasă
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "bids" ? "active" : "")}
          onClick={() => setActiveTab("bids")}
        >
          Oferte
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "farmers" ? "active" : "")}
          onClick={() => setActiveTab("farmers")}
        >
          Fermieri
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "motherboard" ? "active" : "")}
          onClick={() => setActiveTab("motherboard")}
        >
          Motherboard
        </button>
      </nav>

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

        <div className={"tab-pane admin-motherboard-pane" + (activeTab === "motherboard" ? " active" : "")}>
          <MotherboardPage />
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
        <button
          type="button"
          className={"nav-item " + (activeTab === "motherboard" ? "active" : "")}
          onClick={() => setActiveTab("motherboard")}
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
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="nav-label">Motherboard</span>
        </button>
      </nav>
    </div>
  );
}

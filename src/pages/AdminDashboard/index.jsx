import { useEffect, useState } from "react";
import HomeTab from "./HomeTab";
import BidsTab from "./BidsTab";
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
          Home
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "bids" ? "active" : "")}
          onClick={() => setActiveTab("bids")}
        >
          Farmer Bids
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
          <BidsTab active={activeTab === "bids"} />
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
          <span className="nav-label">Home</span>
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
          <span className="nav-label">Bids</span>
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

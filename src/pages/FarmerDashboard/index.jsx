import { useEffect, useState } from "react";
import "./FarmerDashboard.css";
import "./agri-fintech.css";
import HomeTab from "./HomeTab";
import SaleTab from "./SaleTab";
import ActivityTab from "./ActivityTab";
import NewsTab from "./NewsTab";

export default function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState(() =>
    window.localStorage.getItem("farmer-active-tab") || "home"
  );

  useEffect(() => {
    window.localStorage.setItem("farmer-active-tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const scrollEl = document.querySelector(".farmer-dashboard-layout");
    if (!scrollEl) return;
    scrollEl.style.overscrollBehaviorY = activeTab === "home" ? "contain" : "";
    return () => {
      scrollEl.style.overscrollBehaviorY = "";
    };
  }, [activeTab]);

  return (
    <div className="dashboard-inner">
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
          className={"nav-item " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          Sale
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          My Activity
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "news" ? "active" : "")}
          onClick={() => setActiveTab("news")}
        >
          News
        </button>
      </nav>

      <div className="farmer-dashboard-layout">
        <div className={"tab-content " + (activeTab === "home" ? "active" : "")}>
          <HomeTab />
        </div>

        <div className={"tab-content " + (activeTab === "sale" ? "active" : "")}>
          <SaleTab />
        </div>

        <div className={"tab-content " + (activeTab === "activity" ? "active" : "")}>
          <ActivityTab />
        </div>

        <div className={"tab-content " + (activeTab === "news" ? "active" : "")}>
          <NewsTab active={activeTab === "news"} />
        </div>
      </div>

      <nav className="bottom-nav">
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
          className={"nav-item " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v18" />
            <path d="M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3" />
          </svg>
          <span className="nav-label">Sale</span>
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 20V9m7 11V4m7 16v-6" />
          </svg>
          <span className="nav-label">Activity</span>
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "news" ? "active" : "")}
          onClick={() => setActiveTab("news")}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 6h15a2 2 0 0 1 2 2v9.5a1.5 1.5 0 0 1-3 0V7.5H6.5v10a1.5 1.5 0 0 1-3 0V6z" />
            <path d="M8 10h6M8 13h6M8 16h5" />
          </svg>
          <span className="nav-label">News</span>
        </button>
      </nav>
    </div>
  );
}

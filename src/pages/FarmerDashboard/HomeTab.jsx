import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import FarmerProgress from "../../components/FarmerProgress";
import ExchangeRatesCard from "../../components/ExchangeRatesCard";
import WeatherWidget from "../../components/WeatherWidget";
import MarketTicker from "../../components/MarketTicker";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeTab() {
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      const name =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split("@")[0] ||
        "";
      setDisplayName(name);
    });
  }, []);

  return (
    <div className="dashboard-row full">
      <div className="dashboard-home-stack">
        {displayName && (
          <div className="home-greeting">
            <span className="home-greeting-text">
              {getGreeting()}, <strong>{displayName}</strong>
            </span>
          </div>
        )}

        <div className="card dashboard-card home-card-primary">
          <FarmerProgress embedded />
        </div>

        <div className="home-cards-row">
          <div className="card dashboard-card home-card-secondary">
            <ExchangeRatesCard />
          </div>

          <div className="card dashboard-card home-card-secondary">
            <WeatherWidget />
          </div>
        </div>

        <div className="card dashboard-card home-card-tertiary">
          <MarketTicker />
        </div>
      </div>
    </div>
  );
}

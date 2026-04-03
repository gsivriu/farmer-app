import FarmerProgress from "../../components/FarmerProgress";
import ExchangeRatesCard from "../../components/ExchangeRatesCard";
import WeatherWidget from "../../components/WeatherWidget";
import MarketTicker from "../../components/MarketTicker";

export default function HomeTab() {
  return (
    <div className="dashboard-row full">
      <div className="dashboard-home-stack">

        <p className="af-section-label">Progression</p>
        <div className="card dashboard-card home-card-primary">
          <FarmerProgress embedded />
        </div>

        <p className="af-section-label">Curs valutar</p>
        <div className="home-card-secondary">
          <ExchangeRatesCard />
        </div>

        <p className="af-section-label">Vreme</p>
        <div className="card dashboard-card home-card-secondary">
          <WeatherWidget />
        </div>

        <p className="af-section-label">Piețe futures</p>
        <div className="card dashboard-card home-card-tertiary">
          <MarketTicker />
        </div>

      </div>
    </div>
  );
}

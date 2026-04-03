import FarmerProgress from "../../components/FarmerProgress";
import ExchangeRatesCard from "../../components/ExchangeRatesCard";
import WeatherWidget from "../../components/WeatherWidget";
import MarketTicker from "../../components/MarketTicker";

export default function HomeTab() {
  return (
    <div className="dashboard-row full">
      <div className="dashboard-home-stack">
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

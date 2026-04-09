import FarmerProgress from "../../components/FarmerProgress";
import ExchangeRatesCard from "../../components/ExchangeRatesCard";
import WeatherWidget from "../../components/WeatherWidget";
import MarketTicker from "../../components/MarketTicker";
import PricesGrid from "../../components/PricesGrid";

export default function HomeTab() {
  return (
    <div className="dashboard-row full">
      <div className="dashboard-home-stack">
        {/* Ameropa CPT Constanta prices */}
        <div className="card dashboard-card home-card-prices">
          <PricesGrid />
        </div>

        {/* Futures */}
        <div className="card dashboard-card home-card-futures">
          <MarketTicker />
        </div>

        {/* Gamification */}
        <div className="card dashboard-card home-card-primary">
          <FarmerProgress embedded />
        </div>

        {/* Exchange + Weather */}
        <div className="home-cards-row">
          <div className="card dashboard-card home-card-secondary">
            <ExchangeRatesCard />
          </div>
          <div className="card dashboard-card home-card-secondary">
            <WeatherWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

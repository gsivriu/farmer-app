import FarmerProgress from "../../components/FarmerProgress";
import ExchangeRatesCard from "../../components/ExchangeRatesCard";
import WeatherWidget from "../../components/WeatherWidget";
import MarketTicker from "../../components/MarketTicker";

export default function HomeTab() {
  return (
    <div className="dashboard-row full">
      <div className="dashboard-home-stack">
        <FarmerProgress embedded />
        <ExchangeRatesCard />
        <WeatherWidget />
        <MarketTicker />
      </div>
    </div>
  );
}

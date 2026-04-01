import PricesGrid from "../../components/PricesGrid";
import BidForm from "../../components/BidForm";
import SiloPriceTable from "../../components/SiloPriceTable";
import { useAppContext } from "../../context/AppContext.jsx";

export default function SaleTab() {
  const { commodities, fetchBids } = useAppContext();

  return (
    <div className="dashboard-row full">
      <div className="card dashboard-card sale-card">
        <PricesGrid />
        <div className="section-divider" />
        <BidForm onBidCreated={fetchBids} embedded />
        <div className="section-divider" />
        <SiloPriceTable commodities={commodities} readOnly />
      </div>
    </div>
  );
}

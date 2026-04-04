import PricesGrid from "../../components/PricesGrid";
import BidForm from "../../components/BidForm";
import SiloPriceTable from "../../components/SiloPriceTable";
import { useAppContext } from "../../context/AppContext.jsx";

export default function SaleTab() {
  const { commodities, fetchBids } = useAppContext();

  return (
    <div className="sale-layout">
      {/* Left pane: live prices + silo reference */}
      <div className="card dashboard-card sale-card sale-prices-pane">
        <PricesGrid />
        <div className="section-divider" />
        <SiloPriceTable commodities={commodities} readOnly />
      </div>

      {/* Right pane: bid form — always accessible */}
      <div className="card dashboard-card sale-card sale-form-pane">
        <BidForm onBidCreated={fetchBids} embedded />
      </div>
    </div>
  );
}

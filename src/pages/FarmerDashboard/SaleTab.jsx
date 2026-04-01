import PricesGrid from "../../components/PricesGrid";
import BidForm from "../../components/BidForm";
import SiloPriceTable from "../../components/SiloPriceTable";
import { useAppContext } from "../../context/AppContext.jsx";

export default function SaleTab() {
  const { commodities, fetchBids } = useAppContext();

  return (
    <div className="dashboard-row full">
      <div className="open-sections">
        <PricesGrid />
        <BidForm onBidCreated={fetchBids} embedded />
        <SiloPriceTable commodities={commodities} readOnly />
      </div>
    </div>
  );
}

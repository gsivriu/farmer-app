import BidForm from "../../components/BidForm";
import { useAppContext } from "../../context/AppContext.jsx";

export default function SaleTab() {
  const { fetchBids } = useAppContext();

  return (
    <div className="sale-layout sale-form-only">
      <div className="card dashboard-card sale-card sale-form-pane">
        <BidForm onBidCreated={fetchBids} embedded />
      </div>
    </div>
  );
}

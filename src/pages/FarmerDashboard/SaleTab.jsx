import BidForm from "../../components/BidForm";

// No onBidCreated callback: ActivityTab holds the farmer's own list and its
// realtime subscription picks the new bid up on its own. The previous callback
// refetched a context list no farmer component ever read.
export default function SaleTab() {
  return (
    <div className="sale-layout sale-form-only">
      <div className="card dashboard-card sale-card sale-form-pane">
        <BidForm embedded />
      </div>
    </div>
  );
}

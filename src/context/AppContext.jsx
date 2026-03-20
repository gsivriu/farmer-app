/**
 * AppContext — compozitor de contexte.
 *
 * Pastreaza API-ul existent: `useAppContext()` returneaza toate campurile
 * din CommoditiesContext + BidsContext + RewardsContext, astfel incat
 * consumatorii existenti (FarmerDashboard, AdminDashboard etc.) nu necesita
 * nicio modificare.
 *
 * Logica de domeniu se afla in:
 *   - CommoditiesContext.jsx  (preturi, fetch, realtime, updateCommodityPrice)
 *   - BidsContext.jsx         (bid-uri, fetch, realtime)
 *   - RewardsContext.jsx      (puncte farmer, fetch, adaugare)
 */

import { CommoditiesProvider, useCommoditiesContext } from "./CommoditiesContext";
import { BidsProvider, useBidsContext } from "./BidsContext";
import { RewardsProvider, useRewardsContext } from "./RewardsContext";

export function AppProvider({ children }) {
  return (
    <CommoditiesProvider>
      <BidsProvider>
        <RewardsProvider>
          {children}
        </RewardsProvider>
      </BidsProvider>
    </CommoditiesProvider>
  );
}

export function useAppContext() {
  const commodities = useCommoditiesContext();
  const bids = useBidsContext();
  const rewards = useRewardsContext();
  return { ...commodities, ...bids, ...rewards };
}

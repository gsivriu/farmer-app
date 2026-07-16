/**
 * AppContext — compozitor de contexte.
 *
 * `useAppContext()` returneaza toate campurile din CommoditiesContext +
 * RewardsContext.
 *
 * Logica de domeniu se afla in:
 *   - CommoditiesContext.jsx  (preturi, fetch, realtime, updateCommodityPrice)
 *   - RewardsContext.jsx      (puncte farmer, fetch, adaugare)
 *
 * Bid-urile nu au context: fiecare ecran cere exact ce afiseaza — BidsTab
 * pagineaza cu filtre server-side, ActivityTab cere doar bid-urile fermierului,
 * Motherboard/ExecutionTab doar pe cele acceptate. Contextul incarca toata
 * tabela pentru toti utilizatorii (50MB la 100k contracte) si o reincarca la
 * fiecare revenire in tab, desi niciun component de fermier nu-i citea lista.
 */

import { CommoditiesProvider, useCommoditiesContext } from "./CommoditiesContext";
import { RewardsProvider, useRewardsContext } from "./RewardsContext";

export function AppProvider({ children }) {
  return (
    <CommoditiesProvider>
      <RewardsProvider>
        {children}
      </RewardsProvider>
    </CommoditiesProvider>
  );
}

export function useAppContext() {
  const commodities = useCommoditiesContext();
  const rewards = useRewardsContext();
  return { ...commodities, ...rewards };
}

/**
 * AppContext — compozitor de contexte.
 *
 * `useAppContext()` returneaza toate campurile din CommoditiesContext.
 *
 * Logica de domeniu se afla in:
 *   - CommoditiesContext.jsx  (preturi, fetch, realtime, updateCommodityPrice)
 *
 * Bid-urile nu au context: fiecare ecran cere exact ce afiseaza — BidsTab
 * pagineaza cu filtre server-side, ActivityTab cere doar bid-urile fermierului.
 * Contextul incarca toata
 * tabela pentru toti utilizatorii (50MB la 100k contracte) si o reincarca la
 * fiecare revenire in tab, desi niciun component de fermier nu-i citea lista.
 */

import { CommoditiesProvider, useCommoditiesContext } from "./CommoditiesContext";

export function AppProvider({ children }) {
  return <CommoditiesProvider>{children}</CommoditiesProvider>;
}

export function useAppContext() {
  return useCommoditiesContext();
}

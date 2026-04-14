import { supabase } from "../supabaseClient";

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharp-proxy`;

async function callSharp(path, queryParams = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const url = new URL(PROXY_URL);
  url.searchParams.set("path", path);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Sharp proxy error: ${response.status}`);
  }

  return data;
}

// Reference data — use these to populate dropdowns in BidForm
export const sharpApi = {
  // Test connectivity only — does not call any Sharp endpoint, just authenticates
  ping: () => callSharp("/ping"),


  // Products (wheat, corn, etc. — Sharp IDs)
  getProducts: () => callSharp("/Product"),

  // Parities (CPT, DAP, FCA, FOB, CIF...)
  getParities: () => callSharp("/Parity"),
  getParityTexts: () => callSharp("/ParityText"),

  // Locations / silos
  getLocations: () => callSharp("/Location"),

  // Suppliers & customers
  getSuppliers: () => callSharp("/Supplier"),
  getSuppliersExtended: () => callSharp("/SupplierExtended"),
  getCustomers: () => callSharp("/Customer"),
  getCustomersExtended: () => callSharp("/CustomerExtended"),

  // Currencies, countries, counties, regions
  getCurrencies: () => callSharp("/Currency"),
  getCountries: () => callSharp("/Country"),
  getCounties: () => callSharp("/County"),
  getRegions: () => callSharp("/Region"),

  // Traders, companies, divisions
  getTraders: () => callSharp("/Trader"),
  getCompanies: () => callSharp("/Company"),
  getDivisions: () => callSharp("/Division"),

  // Business types, transport types, payment methods
  getBizTypes: () => callSharp("/BizType"),
  getTransportTypes: () => callSharp("/TransportType"),
  getPaymentMethods: () => callSharp("/PaymentMethod"),

  // Biz (contract) endpoints
  getBiz: (id) => callSharp(`/Biz/${id}`),
  getBizView: (id) => callSharp(`/BizView/${id}`),
  getBizList: (startDate, endDate) => callSharp("/BizListView", { startDate, endDate }),
  hasBizContract: (id) => callSharp(`/HasContract/${id}`),

  // Market values
  getMarketValues: ({ date, productID, currencyID, contractTypeID, shipDate, referenceParityID, cropYear }) =>
    callSharp(`/MarketValues/${date}/${productID}/${currencyID}/${contractTypeID}/${shipDate}/${referenceParityID}/${cropYear}`),
};

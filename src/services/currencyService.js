export const getExchangeRates = async () => {
  try {
    const responseEur = await fetch(
      "https://api.frankfurter.app/latest?from=EUR&to=RON,USD"
    );
    const dataEur = await responseEur.json();

    const responseUsd = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=RON"
    );
    const dataUsd = await responseUsd.json();

    if (!dataEur?.rates || !dataUsd?.rates) {
      throw new Error("Date incomplete de la API");
    }

    return {
      ronToEur: dataEur.rates.RON,
      ronToUsd: dataUsd.rates.RON,
      eurToUsd: dataEur.rates.USD,
      lastUpdated: dataEur.date,
    };
  } catch (error) {
    console.error("Eroare API Frankfurter:", error);
    return {
      ronToEur: 4.97,
      ronToUsd: 4.58,
      eurToUsd: 1.08,
      lastUpdated: "Offline/Error",
    };
  }
};

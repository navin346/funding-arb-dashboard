import React from "react";

interface ArbData {
  market: string;
  lighterRate: number;
  paradexRate: number;
  netApr: number;
  lighterOiUsd: number;
  paradexOiUsd: number;
}

async function fetchData(): Promise<ArbData[]> {
  // Fetch Paradex data
  const paradexRes = await fetch("https://api.prod.paradex.trade/v1/markets/summary?market=ALL", { cache: "no-store" });
  if (!paradexRes.ok) throw new Error('Paradex fetch failed');
  const paradexJson = await paradexRes.json();
  const paradexMap = new Map<string, { rate: number; oiUsd: number }>();
  paradexJson.results
    .filter((m: any) => m.symbol.endsWith("-PERP"))
    .forEach((m: any) => {
      const market = m.symbol.replace("-USD-PERP", "").toUpperCase();
      const rate = parseFloat(m.funding_rate);
      const oi = parseFloat(m.open_interest);
      const price = parseFloat(m.mark_price);
      const oiUsd = oi * price;
      paradexMap.set(market, { rate, oiUsd });
    });

  // Fetch Lighter funding rates
  const lighterFundingRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/funding-rates", { cache: "no-store" });
  if (!lighterFundingRes.ok) throw new Error('Lighter funding fetch failed');
  const lighterFundingJson = await lighterFundingRes.json();
  const lighterRates = new Map<string, number>();
  lighterFundingJson.funding_rates
    .filter((f: any) => f.exchange === "lighter")
    .forEach((f: any) => {
      lighterRates.set(f.symbol.toUpperCase(), f.rate);
    });

  // Fetch Lighter prices
  const lighterPricesRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/exchangeStats", { cache: "no-store" });
  if (!lighterPricesRes.ok) throw new Error('Lighter exchange stats failed');
  const lighterPricesJson = await lighterPricesRes.json();
  const lighterPrices = new Map<string, number>();
  lighterPricesJson.order_book_stats.forEach((s: any) => {
    lighterPrices.set(s.symbol.toUpperCase(), s.last_trade_price);
  });

  // Fetch Lighter OI
  const lighterOiRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/orderBookDetails", { cache: "no-store" });
  if (!lighterOiRes.ok) throw new Error('Lighter OI fetch failed');
  const lighterOiJson = await lighterOiRes.json();
  const lighterOi = new Map<string, number>();
  lighterOiJson.order_book_details.forEach((d: any) => {
    const oi = parseFloat(d.open_interest);
    if (!isNaN(oi)) lighterOi.set(d.symbol.toUpperCase(), oi);
  });

  // Compute arb data
  const arbData: ArbData[] = [];
  for (const market of [...new Set([...lighterRates.keys(), ...paradexMap.keys()])].sort()) {
    const lighterRate = lighterRates.get(market) ?? NaN;
    const paradex = paradexMap.get(market);
    const paradexRate = paradex?.rate ?? NaN;
    if (isNaN(lighterRate) || isNaN(paradexRate)) continue;

    const lighterPrice = lighterPrices.get(market) ?? 0;
    const lighterOiVal = lighterOi.get(market) ?? NaN;
    const lighterOiUsd = !isNaN(lighterOiVal) ? lighterOiVal * lighterPrice : 0;

    const paradexOiUsd = paradex?.oiUsd ?? 0;

    if (lighterOiUsd < 500000 || paradexOiUsd < 500000) continue;

    const netRate = Math.abs(lighterRate - paradexRate);
    const netApr = netRate * 8760 * 100; // 24*365=8760 hours/year

    arbData.push({
      market,
      lighterRate,
      paradexRate,
      netApr,
      lighterOiUsd,
      paradexOiUsd,
    });
  }

  // Sort by netApr descending
  arbData.sort((a, b) => b.netApr - a.netApr);

  return arbData;
}

export default async function Home() {
  const data = await fetchData();

  const formatRate = (rate: number) => rate.toFixed(8);
  const formatApr = (apr: number) => `${apr.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  const formatOi = (oi: number) => `$${oi.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">OI ≥ $0.5M on both</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">Market</th>
              <th className="px-4 py-2 text-left">Lighter Rate (hr)</th>
              <th className="px-4 py-2 text-left">Paradex Rate (hr)</th>
              <th className="px-4 py-2 text-left">Net APR</th>
              <th className="px-4 py-2 text-left">Lighter OI (USD)</th>
              <th className="px-4 py-2 text-left">Paradex OI (USD)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.market} className="border-b border-gray-700">
                <td className="px-4 py-2">{row.market}</td>
                <td className="px-4 py-2">{formatRate(row.lighterRate)}</td>
                <td className="px-4 py-2">{formatRate(row.paradexRate)}</td>
                <td className="px-4 py-2">{formatApr(row.netApr)}</td>
                <td className="px-4 py-2">{formatOi(row.lighterOiUsd)}</td>
                <td className="px-4 py-2">{formatOi(row.paradexOiUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";

interface ArbData {
  market: string;
  lighterRate: number;
  paradexRate: number;
  netApr: number;
  lighterOiUsd: number;
  paradexOiUsd: number;
}

async function fetchData(): Promise<ArbData[]> {
  // Same as page.tsx
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

  const lighterFundingRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/funding-rates", { cache: "no-store" });
  if (!lighterFundingRes.ok) throw new Error('Lighter funding fetch failed');
  const lighterFundingJson = await lighterFundingRes.json();
  const lighterRates = new Map<string, number>();
  lighterFundingJson.funding_rates
    .filter((f: any) => f.exchange === "lighter")
    .forEach((f: any) => {
      lighterRates.set(f.symbol.toUpperCase(), f.rate);
    });

  const lighterPricesRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/exchangeStats", { cache: "no-store" });
  if (!lighterPricesRes.ok) throw new Error('Lighter exchange stats failed');
  const lighterPricesJson = await lighterPricesRes.json();
  const lighterPrices = new Map<string, number>();
  lighterPricesJson.order_book_stats.forEach((s: any) => {
    lighterPrices.set(s.symbol.toUpperCase(), s.last_trade_price);
  });

  const lighterOiRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/orderBookDetails", { cache: "no-store" });
  if (!lighterOiRes.ok) throw new Error('Lighter OI fetch failed');
  const lighterOiJson = await lighterOiRes.json();
  const lighterOi = new Map<string, number>();
  lighterOiJson.order_book_details.forEach((d: any) => {
    const oi = parseFloat(d.open_interest);
    if (!isNaN(oi)) lighterOi.set(d.symbol.toUpperCase(), oi);
  });

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
    const netApr = netRate * 8760 * 100;

    arbData.push({
      market,
      lighterRate,
      paradexRate,
      netApr,
      lighterOiUsd,
      paradexOiUsd,
    });
  }

  arbData.sort((a, b) => b.netApr - a.netApr);

  return arbData;
}

export async function GET() {
  const data = await fetchData();
  return NextResponse.json(data);
}

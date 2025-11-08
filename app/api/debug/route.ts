import { NextResponse } from "next/server";

export async function GET() {
  // Fetch raw data for debug
  const paradex = await (await fetch("https://api.prod.paradex.trade/v1/markets/summary?market=ALL", { cache: "no-store" })).json();
  const lighterFunding = await (await fetch("https://mainnet.zklighter.elliot.ai/api/v1/funding-rates", { cache: "no-store" })).json();
  const lighterStats = await (await fetch("https://mainnet.zklighter.elliot.ai/api/v1/exchangeStats", { cache: "no-store" })).json();
  const lighterOi = await (await fetch("https://mainnet.zklighter.elliot.ai/api/v1/orderBookDetails", { cache: "no-store" })).json();

  const rawData = {
    paradex,
    lighterFunding,
    lighterStats,
    lighterOi,
  };

  return NextResponse.json(rawData);
}

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch raw data for debug
    const paradexRes = await fetch("https://api.prod.paradex.trade/v1/markets/summary?market=ALL", { cache: "no-store" });
    if (!paradexRes.ok) throw new Error(`Paradex fetch failed: ${paradexRes.status}`);
    const paradex = await paradexRes.json();

    const lighterFundingRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/funding-rates", { cache: "no-store" });
    if (!lighterFundingRes.ok) throw new Error(`Lighter funding fetch failed: ${lighterFundingRes.status}`);
    const lighterFunding = await lighterFundingRes.json();

    const lighterStatsRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/exchangeStats", { cache: "no-store" });
    if (!lighterStatsRes.ok) throw new Error(`Lighter stats fetch failed: ${lighterStatsRes.status}`);
    const lighterStats = await lighterStatsRes.json();

    const lighterOiRes = await fetch("https://mainnet.zklighter.elliot.ai/api/v1/orderBookDetails", { cache: "no-store" });
    if (!lighterOiRes.ok) throw new Error(`Lighter OI fetch failed: ${lighterOiRes.status}`);
    const lighterOi = await lighterOiRes.json();

    const rawData = {
      paradex,
      lighterFunding,
      lighterStats,
      lighterOi,
    };

    return NextResponse.json(rawData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: "Missing Meta credentials" }, { status: 500 });
  }

  try {
    // funding_source_details contains the prepaid balance for prepaid accounts
    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}?fields=balance,amount_spent,spend_cap,currency,funding_source_details&access_token=${accessToken}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || "Meta API Error" }, { status: 400 });
    }

    const currency = data.currency || "USD";
    const amountSpent = parseInt(data.amount_spent || "0", 10) / 100;

    // For prepaid accounts, balance field is always 0.
    // The actual prepaid funds are in funding_source_details.amount (in cents).
    const fundingAmount = data.funding_source_details?.amount
      ? parseInt(data.funding_source_details.amount, 10) / 100
      : null;

    // Remaining balance = total funded - spent
    const balance = fundingAmount !== null
      ? Math.max(0, fundingAmount - amountSpent)
      : parseInt(data.balance || "0", 10) / 100;

    return NextResponse.json({
      balance,
      amount_spent: amountSpent,
      total_funded: fundingAmount,
      spend_cap: data.spend_cap ? parseInt(data.spend_cap, 10) / 100 : null,
      currency,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

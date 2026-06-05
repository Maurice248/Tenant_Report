import { NextResponse } from 'next/server';

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: "Missing Meta credentials" }, { status: 500 });
  }

  try {
    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}?fields=balance,amount_spent,spend_cap,currency&access_token=${accessToken}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || "Meta API Error" }, { status: 400 });
    }

    return NextResponse.json({
      balance: parseInt(data.balance || "0", 10) / 100,
      amount_spent: parseInt(data.amount_spent || "0", 10) / 100,
      spend_cap: data.spend_cap ? parseInt(data.spend_cap, 10) / 100 : null,
      currency: data.currency || "USD",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

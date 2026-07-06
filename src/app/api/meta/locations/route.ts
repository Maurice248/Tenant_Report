import { getMetaAccessTokenForRequest } from '@/lib/meta-credentials';
import { requireMetaApiAuth } from '@/lib/meta-api-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const auth = await requireMetaApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  
  if (!q) {
    return Response.json([]);
  }

  const token = await getMetaAccessTokenForRequest();
  if (!token) {
    return Response.json({ error: "Missing Meta access token. Configure it in Client Dashboard → API keys." }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/search?type=adgeolocation&q=${encodeURIComponent(q)}&locale=en_US&limit=50&access_token=${token}`
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Failed to fetch locations from Meta");
    }

    return Response.json(data.data || []);
  } catch (error) {
    console.error("Meta Location Search Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { text, approved, id, time, format } = await req.json();

    if (!text && !id) {
      return NextResponse.json({ success: false, error: "Text URL or id is required" }, { status: 400 });
    }

    const approvedValue = approved ? "true" : "false";

    let result = 0;

    if (text) {
      result = await prisma.$executeRawUnsafe(
        `UPDATE "your_name_table" SET "Approved" = $1 WHERE "text" = $2`,
        approvedValue,
        text
      );
    }

    // Fallback: match by id when text URL differs (e.g. old Supabase hostname in DB)
    if (result === 0 && id) {
      result = await prisma.$executeRawUnsafe(
        `UPDATE "your_name_table" SET "Approved" = $1 WHERE "id"::text = $2`,
        approvedValue,
        String(id)
      );
    }

    // Virtual / manual upload — no existing row
    if (result === 0 && id && text) {
      result = await prisma.$executeRawUnsafe(
        `INSERT INTO "your_name_table" ("id", "text", "time", "format", "Approved") VALUES ($1::text, $2, $3, $4, $5)`,
        String(id),
        text,
        time || new Date().toISOString(),
        format || "Image",
        approvedValue
      );
    }
    
    console.log(`[API Ads] Processed ad: ${text}, Result: ${result}`);

    
    return NextResponse.json({ 
      success: true, 
      rowsAffected: result 
    });
  } catch (error) {
    console.error("[API Ads] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

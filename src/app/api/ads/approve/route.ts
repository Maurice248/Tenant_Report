import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { text, approved, id, time, format } = await req.json();
    
    if (!text) {
      return NextResponse.json({ success: false, error: "Text URL is required" }, { status: 400 });
    }

    const approvedValue = approved ? "true" : "false";

    // Try to update first
    let result = await prisma.$executeRawUnsafe(
      `UPDATE "your_name_table" SET "Approved" = $1 WHERE "text" = $2`,
      approvedValue,
      text
    );

    // If no rows updated, it might be a new entry (manual upload)
    if (result === 0 && id) {
      result = await prisma.$executeRawUnsafe(
        `INSERT INTO "your_name_table" ("id", "text", "time", "format", "Approved") VALUES ($1, $2, $3, $4, $5)`,
        parseInt(id) || 4,
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

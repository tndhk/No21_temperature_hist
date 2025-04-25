import { NextResponse } from "next/server";
import { processAndSave } from "@/lib/etl";

export async function POST() {
  try {
    const result = await processAndSave();
    return NextResponse.json({ success: true, detail: result });
  } catch (error) {
    console.error("ETL Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 
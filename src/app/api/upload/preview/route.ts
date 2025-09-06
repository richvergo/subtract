import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel/CSV
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rows.length) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    // First row = headers
    const headers = rows[0] as string[];

    // Next few rows = sample preview
    const sample = rows.slice(1, 6);

    return NextResponse.json({ headers, sample });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to parse file", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

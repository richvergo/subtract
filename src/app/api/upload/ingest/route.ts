import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// helper: parse Excel serial dates or text dates
function excelDateToJSDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel date serial 1 = Jan 1, 1900
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const label = formData.get("label") as string;

    if (!file || !label) {
      return NextResponse.json({ error: "Missing file or label" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (!rows.length) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    // find current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ensure MonthClose exists
    const startDate = new Date(`${label}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const monthClose = await prisma.monthClose.upsert({
      where: { userId_label: { userId: user.id, label } },
      update: {},
      create: { userId: user.id, label, startDate, endDate },
    });

    // create tasks
    for (const row of rows) {
      const getStringValue = (value: unknown): string => {
        if (typeof value === "string") return value;
        if (typeof value === "number") return value.toString();
        return "";
      };

      await prisma.task.create({
        data: {
          monthId: monthClose.id,
          title: getStringValue(row["Item"]) || getStringValue(row["Task"]) || "Untitled",
          assignee: getStringValue(row["Owner"]) || getStringValue(row["Assignee"]) || null,
          dueDate: excelDateToJSDate(row["Due Date"]),
          status: (() => {
            const statusValue = (getStringValue(row["Status"]) || "NOT_STARTED").toUpperCase();
            if (statusValue === "DONE" || statusValue === "COMPLETED" || statusValue === "FINISHED") {
              return "DONE";
            } else if (statusValue === "IN_PROGRESS" || statusValue === "IN PROGRESS" || statusValue === "WORKING") {
              return "IN_PROGRESS";
            } else {
              return "NOT_STARTED";
            }
          })(),
          notes: getStringValue(row["Notes"]) || null,
        },
      });
    }

    return NextResponse.json({ ok: true, monthId: monthClose.id });
  } catch (err: unknown) {
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: "Failed to ingest file", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

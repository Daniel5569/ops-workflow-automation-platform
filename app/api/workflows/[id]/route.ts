import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const run = await prisma.workflowRun.findUnique({
      where: { id },
      include: {
        steps: true,
        auditEvents: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (err) {
    console.error("[GET /api/workflows/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch workflow run" }, { status: 500 });
  }
}

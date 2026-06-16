import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishWorkflowEvent } from "@/lib/streams";
import { createWorkflowRun, buildSteps } from "@/lib/workflow-engine";
import type { WorkflowType, WorkflowInput } from "@/lib/workflow-types";

const VendorInputSchema = z.object({
  vendorName: z.string().min(1),
  category: z.string().min(1),
  monthlySpend: z.number().positive(),
  riskNotes: z.string(),
  requestedOwner: z.string().min(1),
});

const CustomerInputSchema = z.object({
  customer: z.string().min(1),
  tier: z.enum(["startup", "growth", "strategic", "enterprise"]),
  issueSummary: z.string().min(1),
  sentiment: z.enum(["positive", "neutral", "frustrated", "angry"]),
  arrImpact: z.number().nonnegative(),
});

const InvoiceInputSchema = z.object({
  vendor: z.string().min(1),
  invoiceAmount: z.number().positive(),
  poAmount: z.number().positive(),
  varianceReason: z.string(),
  dueDate: z.string().min(1),
});

const CreateWorkflowSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("vendor_onboarding"), input: VendorInputSchema }),
  z.object({ type: z.literal("customer_escalation"), input: CustomerInputSchema }),
  z.object({ type: z.literal("invoice_exception"), input: InvoiceInputSchema }),
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" as const } },
              { subject: { contains: search, mode: "insensitive" as const } },
              { owner: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [runs, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where,
        include: { steps: true, auditEvents: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.workflowRun.count({ where }),
    ]);

    return NextResponse.json({ runs, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/workflows]", err);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { type, input } = parsed.data;
    const run = createWorkflowRun(type as WorkflowType, input as WorkflowInput);

    const created = await prisma.workflowRun.create({
      data: {
        id: run.id,
        type: run.type,
        title: run.title,
        subject: run.subject,
        priority: run.priority,
        owner: run.owner,
        status: "running",
        dueTime: run.dueTime,
        inputData: run.input as object,
        steps: {
          create: buildSteps(run.type, "running").map((s) => ({
            id: s.id,
            label: s.label,
            status: s.status,
            detail: s.detail,
          })),
        },
        auditEvents: {
          create: {
            actor: "Workflow engine",
            action: "created run",
            beforeStatus: "created",
            afterStatus: "running",
            note: `${run.title} created from template.`,
          },
        },
      },
      include: { steps: true, auditEvents: true },
    });

    await publishWorkflowEvent({
      kind: "workflow_created",
      runId: created.id,
      type: type as WorkflowType,
      retryCount: 0,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/workflows]", err);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

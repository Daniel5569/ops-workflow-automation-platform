import { PrismaClient } from "@prisma/client";
import { initialRuns, initialAuditEvents } from "../lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.workflowRun.count();
  if (existing > 0) {
    console.log(`Database already seeded (${existing} runs). Skipping.`);
    return;
  }

  console.log("Seeding database...");

  for (const run of initialRuns) {
    await prisma.workflowRun.create({
      data: {
        id: run.id,
        type: run.type,
        title: run.title,
        subject: run.subject,
        priority: run.priority,
        owner: run.owner,
        status: run.status,
        dueTime: run.dueTime,
        inputData: run.input as object,
        recommendation: run.recommendation as object,
        confidence: run.recommendation.confidence,
        createdAt: new Date(run.createdAt),
        updatedAt: new Date(run.updatedAt),
        steps: {
          create: run.steps.map((step) => ({
            id: step.id,
            label: step.label,
            status: step.status,
            detail: step.detail,
          })),
        },
      },
    });
  }

  for (const event of initialAuditEvents) {
    await prisma.auditEvent.create({
      data: {
        id: event.id,
        workflowRunId: event.objectId,
        actor: event.actor,
        action: event.action,
        beforeStatus: event.beforeStatus,
        afterStatus: event.afterStatus,
        note: event.note,
        createdAt: new Date(event.timestamp),
      },
    });
  }

  console.log(
    `Seeded ${initialRuns.length} workflow runs and ${initialAuditEvents.length} audit events.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

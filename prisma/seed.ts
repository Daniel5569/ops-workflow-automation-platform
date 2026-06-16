import { PrismaClient } from "@prisma/client";
import { initialRuns, initialAuditEvents } from "../lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  for (const run of initialRuns) {
    await prisma.workflowRun.upsert({
      where: { id: run.id },
      create: {
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
      },
      update: {
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
        updatedAt: new Date(run.updatedAt),
      },
    });

    await prisma.workflowStep.createMany({
      data: run.steps.map((step) => ({
        id: step.id,
        workflowRunId: run.id,
        label: step.label,
        status: step.status,
        detail: step.detail,
      })),
      skipDuplicates: true,
    });
  }

  for (const event of initialAuditEvents) {
    await prisma.auditEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        workflowRunId: event.objectId,
        actor: event.actor,
        action: event.action,
        beforeStatus: event.beforeStatus,
        afterStatus: event.afterStatus,
        note: event.note,
        createdAt: new Date(event.timestamp),
      },
      update: {
        actor: event.actor,
        action: event.action,
        beforeStatus: event.beforeStatus,
        afterStatus: event.afterStatus,
        note: event.note,
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

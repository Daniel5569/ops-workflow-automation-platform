import type { WorkflowInput, WorkflowTemplate, WorkflowType } from "@/lib/workflow-types";
import { useMemo, useState } from "react";
import { StatusBadge } from "./status-badge";

function getFieldValue(input: WorkflowInput, key: string) {
  return String((input as unknown as Record<string, string | number>)[key] ?? "");
}

export function WorkflowTemplateGallery({
  templates,
  onStartRun
}: {
  templates: WorkflowTemplate[];
  onStartRun: (type: WorkflowType, input: WorkflowInput) => void;
}) {
  const [selectedId, setSelectedId] = useState<WorkflowType>(templates[0].id);
  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [selectedId, templates]
  );
  const [draft, setDraft] = useState<WorkflowInput>(selected.sampleInput);

  function selectTemplate(template: WorkflowTemplate) {
    setSelectedId(template.id);
    setDraft(template.sampleInput);
  }

  function updateField(key: string, value: string) {
    setDraft((current) => {
      const numericKeys = ["monthlySpend", "arrImpact", "invoiceAmount", "poAmount"];
      const currentRecord = current as unknown as Record<string, string | number>;
      return {
        ...currentRecord,
        [key]: numericKeys.includes(key) ? Number(value) : value
      } as unknown as WorkflowInput;
    });
  }

  const fields = Object.keys(selected.sampleInput as unknown as Record<string, string | number>);

  return (
    <section className="panel template-panel">
      <div className="panel-header compact">
        <div>
          <h2>Workflow templates</h2>
          <p>Start a synthetic run from reusable operations playbooks</p>
        </div>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <button
            className={selectedId === template.id ? "template-card active" : "template-card"}
            key={template.id}
            type="button"
            onClick={() => selectTemplate(template)}
          >
            <span>{template.name}</span>
            <small>{template.useCase}</small>
            <div>
              <StatusBadge value={template.riskLevel} />
              <em>{template.expectedDuration}</em>
            </div>
          </button>
        ))}
      </div>
      <div className="run-form">
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field}>
              <span>{field.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
              <input value={getFieldValue(draft, field)} onChange={(event) => updateField(field, event.target.value)} />
            </label>
          ))}
        </div>
        <div className="step-strip">
          {selected.steps.map((step, index) => (
            <span key={step}>
              {index + 1}. {step}
            </span>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={() => onStartRun(selected.id, draft)}>
          Start run
        </button>
      </div>
    </section>
  );
}

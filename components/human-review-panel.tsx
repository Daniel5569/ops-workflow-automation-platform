import type { HumanReviewAction } from "@/lib/workflow-types";
import { useState } from "react";

const actions: { label: string; value: HumanReviewAction }[] = [
  { label: "Approve", value: "approve" },
  { label: "Edit recommendation", value: "edit" },
  { label: "Request changes", value: "request_changes" },
  { label: "Escalate", value: "escalate" },
  { label: "Reject", value: "reject" }
];

export function HumanReviewPanel({
  suggestedAction,
  onDecision
}: {
  suggestedAction: string;
  onDecision: (action: HumanReviewAction, note: string, editedAction?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [editedAction, setEditedAction] = useState(suggestedAction);

  return (
    <div className="review-box">
      <div>
        <h3>Human review</h3>
        <p>Capture the operator decision and reviewer note.</p>
      </div>
      <label>
        <span>Reviewer note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add decision context..."
          rows={3}
        />
      </label>
      <label>
        <span>Editable recommendation</span>
        <input value={editedAction} onChange={(event) => setEditedAction(event.target.value)} />
      </label>
      <div className="review-actions">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => onDecision(action.value, note, editedAction)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

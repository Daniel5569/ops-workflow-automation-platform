export type WorkflowType =
  | "vendor_onboarding"
  | "customer_escalation"
  | "invoice_exception";

export type RunStatus =
  | "running"
  | "needs_review"
  | "approved"
  | "escalated"
  | "completed"
  | "blocked"
  | "rejected";

export type StepStatus =
  | "queued"
  | "running"
  | "completed"
  | "needs_review"
  | "blocked";

export type Priority = "low" | "medium" | "high" | "critical";
export type RiskLevel = "low" | "medium" | "high";

export interface WorkflowStep {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
}

export interface WorkflowTemplate {
  id: WorkflowType;
  name: string;
  useCase: string;
  expectedDuration: string;
  riskLevel: RiskLevel;
  steps: string[];
  sampleInput: WorkflowInput;
}

export interface VendorInput {
  vendorName: string;
  category: string;
  monthlySpend: number;
  riskNotes: string;
  requestedOwner: string;
}

export interface CustomerInput {
  customer: string;
  tier: "startup" | "growth" | "strategic" | "enterprise";
  issueSummary: string;
  sentiment: "positive" | "neutral" | "frustrated" | "angry";
  arrImpact: number;
}

export interface InvoiceInput {
  vendor: string;
  invoiceAmount: number;
  poAmount: number;
  varianceReason: string;
  dueDate: string;
}

export type WorkflowInput = VendorInput | CustomerInput | InvoiceInput;

export interface AIRecommendation {
  summary: string;
  reasoning: string[];
  confidence: number;
  suggestedAction: string;
  nextAction: string;
  riskLevel?: RiskLevel;
  priority?: Priority;
  assignedTeam?: string;
  missingItems?: string[];
  responseDraft?: string;
  slaTarget?: string;
  exceptionType?: string;
  financialVariance?: number;
  reviewerNote?: string;
}

export interface WorkflowRun {
  id: string;
  type: WorkflowType;
  title: string;
  subject: string;
  priority: Priority;
  owner: string;
  status: RunStatus;
  dueTime: string;
  createdAt: string;
  updatedAt: string;
  input: WorkflowInput;
  steps: WorkflowStep[];
  recommendation: AIRecommendation;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  objectId: string;
  beforeStatus: RunStatus | "created" | "system";
  afterStatus: RunStatus;
  note: string;
}

export type HumanReviewAction =
  | "approve"
  | "edit"
  | "request_changes"
  | "escalate"
  | "reject";

export type ExecutionState =
  | "DETECTED"
  | "EVALUATING"
  | "WAIT"
  | "BLOCKED"
  | "APPROVAL_REQUIRED"
  | "SAFE"
  | "EXPIRED"
  | "ALREADY_COMPLETED"
  | "PLANNED"
  | "SIMULATED"
  | "APPROVED"
  | "SIGNED"
  | "SUBMITTED"
  | "CONFIRMED"
  | "RECONCILED"
  | "COMPLETE"
  | "FAILED";

export type ExecutionEvent =
  | "START_EVALUATION"
  | "DECIDE_WAIT"
  | "DECIDE_BLOCKED"
  | "DECIDE_APPROVAL_REQUIRED"
  | "DECIDE_SAFE"
  | "MARK_EXPIRED"
  | "MARK_ALREADY_COMPLETED"
  | "CREATE_PLAN"
  | "RECORD_SIMULATION"
  | "RECORD_APPROVAL"
  | "RECORD_SIGNATURE"
  | "RECORD_SUBMISSION"
  | "RECORD_CONFIRMATION"
  | "RECORD_RECONCILIATION"
  | "MARK_COMPLETE"
  | "MARK_FAILED";

const transitions: Readonly<
  Record<ExecutionState, Readonly<Partial<Record<ExecutionEvent, ExecutionState>>>>
> = {
  DETECTED: { START_EVALUATION: "EVALUATING", MARK_FAILED: "FAILED" },
  EVALUATING: {
    DECIDE_WAIT: "WAIT",
    DECIDE_BLOCKED: "BLOCKED",
    DECIDE_APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
    DECIDE_SAFE: "SAFE",
    MARK_EXPIRED: "EXPIRED",
    MARK_ALREADY_COMPLETED: "ALREADY_COMPLETED",
    MARK_FAILED: "FAILED",
  },
  WAIT: {},
  BLOCKED: {},
  APPROVAL_REQUIRED: { CREATE_PLAN: "PLANNED", MARK_FAILED: "FAILED" },
  SAFE: { CREATE_PLAN: "PLANNED", MARK_FAILED: "FAILED" },
  EXPIRED: {},
  ALREADY_COMPLETED: {},
  PLANNED: { RECORD_SIMULATION: "SIMULATED", MARK_FAILED: "FAILED" },
  SIMULATED: { RECORD_APPROVAL: "APPROVED", MARK_FAILED: "FAILED" },
  APPROVED: { RECORD_SIGNATURE: "SIGNED", MARK_FAILED: "FAILED" },
  SIGNED: { RECORD_SUBMISSION: "SUBMITTED", MARK_FAILED: "FAILED" },
  SUBMITTED: { RECORD_CONFIRMATION: "CONFIRMED", MARK_FAILED: "FAILED" },
  CONFIRMED: { RECORD_RECONCILIATION: "RECONCILED", MARK_FAILED: "FAILED" },
  RECONCILED: { MARK_COMPLETE: "COMPLETE", MARK_FAILED: "FAILED" },
  COMPLETE: {},
  FAILED: {},
};

export class InvalidExecutionTransitionError extends Error {
  readonly state: ExecutionState;
  readonly event: ExecutionEvent;

  constructor(
    state: ExecutionState,
    event: ExecutionEvent,
  ) {
    super(`Cannot apply ${event} while execution is ${state}`);
    this.name = "InvalidExecutionTransitionError";
    this.state = state;
    this.event = event;
  }
}

/** Moves an attempt forward by exactly one legal event. Retries use a new attempt. */
export function transitionExecution(
  state: ExecutionState,
  event: ExecutionEvent,
): ExecutionState {
  const next = transitions[state][event];
  if (next === undefined) {
    throw new InvalidExecutionTransitionError(state, event);
  }
  return next;
}

export function allowedExecutionEvents(
  state: ExecutionState,
): readonly ExecutionEvent[] {
  return Object.keys(transitions[state]) as ExecutionEvent[];
}

export function isTerminalExecutionState(state: ExecutionState): boolean {
  return allowedExecutionEvents(state).length === 0;
}

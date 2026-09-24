import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidExecutionTransitionError,
  isTerminalExecutionState,
  transitionExecution,
  type ExecutionEvent,
  type ExecutionState,
} from "./execution-state.ts";

test("a successful attempt only moves forward through the full lifecycle", () => {
  const events: readonly ExecutionEvent[] = [
    "START_EVALUATION",
    "DECIDE_SAFE",
    "CREATE_PLAN",
    "RECORD_SIMULATION",
    "RECORD_APPROVAL",
    "RECORD_SIGNATURE",
    "RECORD_SUBMISSION",
    "RECORD_CONFIRMATION",
    "RECORD_RECONCILIATION",
    "MARK_COMPLETE",
  ];
  let state: ExecutionState = "DETECTED";
  for (const event of events) state = transitionExecution(state, event);
  assert.equal(state, "COMPLETE");
  assert.equal(isTerminalExecutionState(state), true);
});

test("WAIT is terminal for an evaluation attempt", () => {
  const evaluating = transitionExecution("DETECTED", "START_EVALUATION");
  const waiting = transitionExecution(evaluating, "DECIDE_WAIT");
  assert.equal(waiting, "WAIT");
  assert.equal(isTerminalExecutionState(waiting), true);
});

test("approval-required can create a plan but cannot skip simulation", () => {
  const planned = transitionExecution("APPROVAL_REQUIRED", "CREATE_PLAN");
  assert.equal(planned, "PLANNED");
  assert.throws(
    () => transitionExecution(planned, "RECORD_APPROVAL"),
    InvalidExecutionTransitionError,
  );
});

test("submitted attempts cannot jump directly to complete", () => {
  assert.throws(
    () => transitionExecution("SUBMITTED", "MARK_COMPLETE"),
    /Cannot apply MARK_COMPLETE/,
  );
});

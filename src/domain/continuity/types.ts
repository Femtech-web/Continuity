export type Decision = "safe" | "wait" | "approval" | "rollover";

export type CheckState = "pass" | "watch" | "fail";

export type DecisionTone = "mint" | "amber" | "cyan" | "coral";

export interface SafetyCheck {
  readonly label: string;
  readonly detail: string;
  readonly state: CheckState;
}

export interface ContinuityScenario {
  readonly id: Decision;
  readonly label: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly status: string;
  readonly tone: DecisionTone;
  readonly action: string;
  readonly checks: readonly SafetyCheck[];
}

export interface TimelineEvent {
  readonly name: string;
  readonly detail: string;
  readonly time: string;
  readonly status: "verified" | "waiting";
}

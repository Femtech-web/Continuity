export type LaunchStep = 0 | 1 | 2 | 3 | 4;

export type RestoredLaunchPhase =
  | "draft"
  | "launched"
  | "preflight-required"
  | "reconciling";

export interface RestoredLaunchProgress {
  readonly phase: RestoredLaunchPhase;
  readonly preflightPassed: false;
  readonly step: LaunchStep;
}

export function restoreLaunchProgress(input: {
  readonly draftId: string;
  readonly draftStatus: string;
  readonly market: null | { readonly draftId: string; readonly id: string };
}): RestoredLaunchProgress {
  if (
    input.draftStatus === "CONFIRMED" &&
    input.market?.draftId === input.draftId
  ) {
    return { phase: "launched", preflightPassed: false, step: 4 };
  }
  if (input.draftStatus === "CONFIRMED" || input.draftStatus === "SUBMITTED") {
    return { phase: "reconciling", preflightPassed: false, step: 4 };
  }
  if (
    input.draftStatus === "PREFLIGHT_READY" ||
    input.draftStatus === "PREFLIGHT_FAILED" ||
    input.draftStatus === "APPROVED"
  ) {
    return { phase: "preflight-required", preflightPassed: false, step: 3 };
  }
  return { phase: "draft", preflightPassed: false, step: 0 };
}

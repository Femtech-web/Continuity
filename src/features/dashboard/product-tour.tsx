"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./product-tour.module.css";

interface ProductTourProps {
  readonly autoStart?: boolean;
  readonly triggerLabel?: string;
}

interface TourStep {
  readonly description: string;
  readonly eyebrow: string;
  readonly target: string;
  readonly title: string;
}

interface TargetRect {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

const tourStorageKey = "continuity-product-tour-v1";

const steps: readonly TourStep[] = [
  {
    eyebrow: "Evidence mode",
    title: "Replay first. Verify live second.",
    description:
      "Demo is a wallet-free lifecycle replay. Mainnet uses live sponsor and Solana reads. Transactions are never automatic: a separate wallet approval is required after preflight passes.",
    target: '[data-tour="experience"]',
  },
  {
    eyebrow: "Product path",
    title: "Follow one decision from risk to proof.",
    description:
      "Overview shows what needs attention. Markets scans the lifecycle registry. Launch explains exactly what will be created. Activity records what Sentinel decided.",
    target: '[data-tour="navigation"]',
  },
  {
    eyebrow: "Decision pipeline",
    title: "Every sponsor has one necessary job.",
    description:
      "PreStocks identifies the instrument change. Meteora proves the DBC quote rail. Jupiter and Pyth test market safety. ClawPump runs Sentinel and explains the deterministic result.",
    target: '[data-tour="priority-case"]',
  },
  {
    eyebrow: "Wallet boundary",
    title: "Connect only when an action needs your wallet.",
    description:
      "Browsing and scanning stay public. A wallet is requested only to build and simulate an exact preflight; signing remains unavailable until every gate passes.",
    target: '[data-tour="wallet"]',
  },
];

function readTarget(step: TourStep): TargetRect | null {
  const element = document.querySelector<HTMLElement>(step.target);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function ProductTour({
  autoStart = false,
  triggerLabel = "Product tour",
}: ProductTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const step = steps[stepIndex];

  const updateTarget = useCallback(() => {
    setTargetRect(readTarget(steps[stepIndex]));
  }, [stepIndex]);

  const openTour = useCallback(() => {
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    window.localStorage.setItem(tourStorageKey, "seen");
  }, []);

  useEffect(() => {
    if (!autoStart || window.localStorage.getItem(tourStorageKey) === "seen") {
      return;
    }
    const timeout = window.setTimeout(openTour, 450);
    return () => window.clearTimeout(timeout);
  }, [autoStart, openTour]);

  useEffect(() => {
    if (!isOpen) return;
    const animationFrame = window.requestAnimationFrame(() => {
      updateTarget();
      nextButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTour();
    };
    const handleViewportChange = () => updateTarget();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeTour, isOpen, updateTarget]);

  const isLastStep = stepIndex === steps.length - 1;
  const popoverClass = styles.popoverBelow;

  return (
    <>
      <button className={styles.tourTrigger} onClick={openTour} type="button">
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className={styles.tourLayer} role="presentation">
          <div className={`${styles.backdrop} ${targetRect ? styles.backdropWithSpotlight : ""}`} />
          {targetRect ? (
            <div
              aria-hidden="true"
              className={styles.spotlight}
              style={{
                height: targetRect.height + 12,
                left: targetRect.left - 6,
                top: targetRect.top - 6,
                width: targetRect.width + 12,
              }}
            />
          ) : null}
          <section
            aria-describedby="continuity-tour-description"
            aria-labelledby="continuity-tour-title"
            aria-modal="true"
            className={`${styles.popover} ${popoverClass}`}
            role="dialog"
            style={
              targetRect
                ? {
                    left: Math.min(Math.max(24, targetRect.left), window.innerWidth - 380),
                    top:
                      targetRect.bottom + 330 < window.innerHeight
                        ? targetRect.bottom + 18
                        : Math.max(20, targetRect.top - 306),
                  }
                : undefined
            }
          >
            <div className={styles.popoverHeader}>
              <div>
                <span>{step.eyebrow}</span>
                <small>
                  {stepIndex + 1} of {steps.length}
                </small>
              </div>
              <button aria-label="Close product tour" onClick={closeTour} type="button">
                Close
              </button>
            </div>
            <h2 id="continuity-tour-title">{step.title}</h2>
            <p id="continuity-tour-description">{step.description}</p>
            <div className={styles.progress} aria-hidden="true">
              {steps.map((tourStep, index) => (
                <span
                  className={index <= stepIndex ? styles.progressActive : undefined}
                  key={tourStep.title}
                />
              ))}
            </div>
            <div className={styles.tourActions}>
              <button
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                type="button"
              >
                Back
              </button>
              <button
                className={styles.nextAction}
                onClick={() => {
                  if (isLastStep) closeTour();
                  else setStepIndex((value) => value + 1);
                }}
                ref={nextButtonRef}
                type="button"
              >
                {isLastStep ? "Finish" : "Next"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

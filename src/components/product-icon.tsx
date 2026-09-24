import type { ReactNode, SVGProps } from "react";

export type ProductIconName =
  | "arrow-right"
  | "check"
  | "clock"
  | "close"
  | "copy"
  | "disconnect"
  | "download"
  | "evidence"
  | "overview"
  | "policy"
  | "positions"
  | "receipt"
  | "route"
  | "shield"
  | "wallet"
  | "warning";

interface ProductIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  readonly name: ProductIconName;
  readonly label?: string;
}

const icons: Record<ProductIconName, ReactNode> = {
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: (
    <>
      <path d="m7 7 10 10" />
      <path d="M17 7 7 17" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  disconnect: (
    <>
      <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4M9 12h9" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  evidence: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 12h6M9 16h4" />
    </>
  ),
  overview: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  policy: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h5M13 12h7" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="11" cy="12" r="2" />
    </>
  ),
  positions: (
    <>
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M8 6V4h8v2M8 11h8M8 15h5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.25" />
      <circle cx="18" cy="6" r="2.25" />
      <path d="M8.25 18H11a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h.75" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.6 2.7 8.2 7 10 4.3-1.8 7-5.4 7-10V6z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h16v12H4z" />
      <path d="M4 8V5h13v2M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 9 17H3z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
};

export function ProductIcon({
  name,
  label,
  ...svgProps
}: ProductIconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      fill="none"
      focusable="false"
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      {...svgProps}
      style={{ display: "block", ...svgProps.style }}
    >
      {icons[name]}
    </svg>
  );
}

import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg {...base}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg {...base}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ZoomInIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
  </svg>
);

export const ZoomOutIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3M8 11h6" />
  </svg>
);

export const RotateLeftIcon = () => (
  <svg {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 3v5h5" />
  </svg>
);

export const RotateRightIcon = () => (
  <svg {...base}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v5h-5" />
  </svg>
);

export const ResetIcon = () => (
  <svg {...base}>
    <path d="M3 12a9 9 0 1 0 2.6-6.4" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const BrokenImageIcon = () => (
  <svg {...base} width={40} height={40} strokeWidth={1.5}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="m3 16 5-5 4 4 3-3 6 6" />
    <path d="M9 3v18M15 3v18" strokeDasharray="2 3" />
  </svg>
);

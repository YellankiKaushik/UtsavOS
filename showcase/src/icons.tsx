import type { ReactNode } from "react";

const icons = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  external: <path d="M6 18 18 6M8 6h10v10" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 11h16M8 4v4m8-4v4" />
    </>
  ),
  budget: (
    <>
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M4 10h16m-5 5h2" />
    </>
  ),
  tasks: (
    <>
      <path d="m4 7 2 2 3-4m3 3h8M4 15l2 2 3-4m3 3h8" />
    </>
  ),
  replan: <path d="M4 7h15m-4-4 4 4-4 4m5 6H5m4-4-4 4 4 4" />,
  sparkle: (
    <>
      <path d="M12 3c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z" />
      <path d="M19 3v4m-2-2h4M5 17v4m-2-2h4" />
    </>
  ),
  play: <path d="m9 5 11 7-11 7z" />,
  code: <path d="m9 6-6 6 6 6m6-12 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  back: <path d="M20 12H5m6-6-6 6 6 6" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icons[name]}
    </svg>
  );
}

type HamburgerMenuButtonProps = {
  expanded: boolean;
  controls: string;
  onClick?: () => void;
};

export function HamburgerMenuButton({
  expanded,
  controls,
  onClick,
}: HamburgerMenuButtonProps) {
  return (
    <button
      type="button"
      className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--color-line)] bg-white text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] xl:h-10 xl:w-auto xl:gap-2 xl:px-3"
      aria-label={expanded ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        {expanded ? (
          <path d="m6 6 12 12M18 6 6 18" />
        ) : (
          <path d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
      <span className="hidden text-sm font-medium xl:inline">More</span>
    </button>
  );
}

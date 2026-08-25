export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path d="M10 2.2 17 6.2v7.6L10 17.8 3 13.8V6.2L10 2.2Z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="10" cy="2.2" r="1.6" fill="currentColor" />
      <circle cx="17" cy="13.8" r="1.6" fill="currentColor" />
      <circle cx="3" cy="13.8" r="1.6" fill="currentColor" />
      <path d="M10 2.2v8.3M10 10.5 3 13.8M10 10.5l7 3.3"
            stroke="currentColor" strokeWidth="1.3" opacity=".5" />
    </svg>
  );
}

import { useState } from "react";

interface InfoTooltipProps {
  title: string;
  text: string;
}

export default function InfoTooltip({ title, text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={`About ${title}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      {open && (
        <span className="info-tooltip-bubble" role="tooltip">
          <strong className="info-tooltip-title">{title}</strong>
          <span className="info-tooltip-text">{text}</span>
        </span>
      )}
    </span>
  );
}
import { useEffect, useState } from "react";

const COUNTDOWN_START = 10;
const STEP_MS = 600;

interface CountdownProps {
  onComplete: () => void;
}


function labelFor(step: number): string {
  if (step > 0) return `T-${step}`;
  if (step === 0) return "IGNITION";
  return "LIFTOFF";
}

export default function Countdown({ onComplete }: CountdownProps) {
  const [step, setStep] = useState(COUNTDOWN_START);

  useEffect(() => {
    if (step < -1) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(() => setStep((s) => s - 1), STEP_MS);
    return () => window.clearTimeout(timer);
    
  }, [step]);

  const label = labelFor(step);
  const isFinal = step <= 0;

  return (
    <div className="countdown-overlay">
      <div className={`countdown-label${isFinal ? " countdown-final" : ""}`}>{label}</div>
      <button className="countdown-skip" onClick={onComplete} type="button">
        Skip
      </button>
    </div>
  );
}
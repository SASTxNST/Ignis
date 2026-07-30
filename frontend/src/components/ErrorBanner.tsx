import { FriendlyError } from "../lib/api";

interface ErrorBannerProps {
  error: FriendlyError;
  onDismiss: () => void;
}

export default function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-text">
        <span className="error-banner-headline">{error.headline}</span>
        {error.detail && <span className="error-banner-detail">{error.detail}</span>}
      </div>
      <button className="error-banner-dismiss" onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  );
}
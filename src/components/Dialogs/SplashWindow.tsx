// ---------------------------------------------------------------------------
// SplashWindow – Startup splash screen overlay
// Does NOT use DialogBase. Standalone fixed overlay component.
// ---------------------------------------------------------------------------

export interface SplashWindowProps {
  visible: boolean;
  statusText?: string;
  version?: string;
}

export function SplashWindow({ visible, statusText, version }: SplashWindowProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #252525 100%)' }}
      data-testid="splash-overlay"
    >
      <div
        className="relative flex flex-col items-center overflow-hidden rounded-lg"
        style={{
          width: 520,
          height: 300,
          backgroundColor: '#1E1E1E',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        data-testid="splash-card"
      >
        {/* Top orange accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, var(--accent-orange, #FF6B00), #FF8F00)',
          }}
          data-testid="splash-accent-bar"
        />

        {/* App icon */}
        <div
          className="mt-10 flex items-center justify-center rounded-lg"
          style={{
            width: 56,
            height: 56,
            backgroundColor: 'var(--accent-orange, #FF6B00)',
            borderRadius: 12,
          }}
          data-testid="splash-icon"
        >
          <span
            style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1,
              userSelect: 'none',
            }}
          >
            TH
          </span>
        </div>

        {/* App title */}
        <span
          className="mt-3"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--accent-orange, #FF6B00)',
            userSelect: 'none',
          }}
          data-testid="splash-title"
        >
          Thamnel
        </span>

        {/* Subtitle */}
        <span
          className="mt-1"
          style={{
            fontSize: 13,
            color: 'var(--text-secondary, #999)',
            userSelect: 'none',
          }}
          data-testid="splash-subtitle"
        >
          AI Based Thumbnail Generator
        </span>

        {/* Author */}
        <span
          className="mt-0.5"
          style={{
            fontSize: 11,
            color: 'var(--text-disabled, #666)',
            userSelect: 'none',
          }}
          data-testid="splash-author"
        >
          By Md. Kamrul Islam Rubel
        </span>

        {/* Loading dots */}
        <div className="mt-6 flex items-center gap-2" data-testid="splash-dots">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-orange, #FF6B00)',
                animation: `splash-dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
              data-testid={`splash-dot-${i}`}
            />
          ))}
        </div>

        {/* Status text */}
        {statusText && (
          <span
            className="mt-3"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary, #999)',
              userSelect: 'none',
            }}
            data-testid="splash-status"
          >
            {statusText}
          </span>
        )}

        {/* Version */}
        {version && (
          <span
            className="mt-1"
            style={{
              fontSize: 10,
              color: 'var(--text-disabled, #666)',
              userSelect: 'none',
            }}
            data-testid="splash-version"
          >
            {version}
          </span>
        )}
      </div>

      {/* CSS animation for loading dots */}
      <style>{`
        @keyframes splash-dot-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default SplashWindow;

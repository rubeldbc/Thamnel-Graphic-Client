import type { DropZone } from './layerDndUtils';

interface DropIndicatorProps {
  top: number;
  width: number;
  height: number;
  zone: DropZone;
}

export function DropIndicator({ top, width, height, zone }: DropIndicatorProps) {
  if (zone === 'center') {
    // Group highlight: semi-transparent blue box around the row
    return (
      <div
        style={{
          position: 'absolute',
          top,
          left: 0,
          width,
          height,
          border: '2px solid #2196F3',
          backgroundColor: '#2196F322',
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    );
  }

  // Insertion line (top or bottom edge)
  const lineTop = zone === 'top' ? top : top + height;

  return (
    <div
      style={{
        position: 'absolute',
        top: lineTop - 1,
        left: 4,
        width: width - 8,
        height: 2,
        backgroundColor: '#2196F3',
        borderRadius: 1,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Small circle indicator at the left edge */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: -3,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#2196F3',
        }}
      />
    </div>
  );
}

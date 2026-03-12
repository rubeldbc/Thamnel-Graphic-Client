// ---------------------------------------------------------------------------
// LayerTreeConnector -- tree connector lines for nested layers
// ---------------------------------------------------------------------------

export interface LayerTreeConnectorProps {
  /** Nesting depth (0 = top level). */
  depth: number;
  /** Whether this is the last child in the current group. */
  isLast: boolean;
  /** Group colour used for the connector lines. */
  groupColor: string;
}

/**
 * Renders vertical + L-shaped branch connector lines to visually represent
 * the tree hierarchy within the layer list.
 */
export function LayerTreeConnector({ depth, isLast, groupColor }: LayerTreeConnectorProps) {
  if (depth <= 0) return null;

  // 40% opacity colour
  const lineColor = `${groupColor}66`;

  return (
    <div
      data-testid="layer-tree-connector"
      className="pointer-events-none absolute top-0 left-0"
      style={{ height: '100%', width: depth * 28 }}
    >
      {/* Render one connector per depth level */}
      {Array.from({ length: depth }, (_, i) => {
        const level = i + 1;
        const isCurrentLevel = level === depth;
        const xPos = level * 28 - 14; // centre of the indent slot

        return (
          <div key={level}>
            {/* Vertical line */}
            <div
              data-testid="connector-vertical"
              style={{
                position: 'absolute',
                left: xPos,
                top: 0,
                width: 1,
                height: isCurrentLevel && isLast ? '50%' : '100%',
                backgroundColor: lineColor,
              }}
            />

            {/* Horizontal branch (only at current depth) */}
            {isCurrentLevel && (
              <div
                data-testid="connector-branch"
                style={{
                  position: 'absolute',
                  left: xPos,
                  top: '50%',
                  width: 10,
                  height: 1,
                  backgroundColor: lineColor,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LayerTreeConnector;

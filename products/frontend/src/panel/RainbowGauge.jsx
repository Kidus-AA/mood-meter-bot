import React, { useMemo, useState } from 'react';

export default function RainbowGauge({
  counts = { pos: 0, neu: 0, neg: 0 },
  score = 0, // -1 .. 1
  width = 220,
  height = 14,
}) {
  const [hover, setHover] = useState(null); // {x, y, text}

  const segments = useMemo(() => {
    const { pos, neu, neg } = counts;
    const total = pos + neu + neg;

    const baseSegs = [
      { key: 'neg', val: neg, color: '#ff4d4f', name: 'Negative' },
      { key: 'neu', val: neu, color: '#facc15', name: 'Neutral' },
      { key: 'pos', val: pos, color: '#22c55e', name: 'Positive' },
    ];

    if (total === 0) {
      // equally sized segments when no data
      return baseSegs.map((seg) => ({ ...seg, pct: 100 / 3 }));
    }

    return baseSegs.map((seg) => ({
      ...seg,
      pct: (seg.val / total) * 100,
    }));
  }, [counts]);

  const pointerX = useMemo(() => {
    // map score -1..1 to 0..width
    const clamped = Math.max(-1, Math.min(1, score));
    return ((clamped + 1) / 2) * width;
  }, [score, width]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* gauge bar */}
      <div
        className="flex rounded-full overflow-hidden border border-gray-700"
        style={{ width, height }}
      >
        {segments.map(({ key, pct, color, val, name }) => (
          <div
            key={key}
            style={{
              width: `${pct}%`,
              backgroundColor: color,
            }}
            onMouseEnter={(e) => {
              // Calculate x relative to gauge container
              const rect = e.currentTarget.getBoundingClientRect();
              const parentRect =
                e.currentTarget.parentElement.getBoundingClientRect();
              setHover({
                x: rect.left + rect.width / 2 - parentRect.left,
                text: `${val} ${name}`,
              });
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>
      {/* pointer triangle (upward) */}
      {(() => {
        const pointerWidth = 18;
        const pointerHeight = 10;
        const margin = 8; // increased gap between gauge and triangle
        return (
          <svg
            width={pointerWidth}
            height={pointerHeight}
            style={{
              position: 'absolute',
              left: pointerX - pointerWidth / 2,
              top: height + margin, // place below gauge with margin
              transition: 'left 0.4s ease',
            }}
          >
            {/* Upward pointing triangle (apex at top) */}
            <polygon
              points={`0,${pointerHeight} ${pointerWidth},${pointerHeight} ${
                pointerWidth / 2
              },0`}
              fill="#a970ff"
            />
          </svg>
        );
      })()}
      {/* tooltip */}
      {hover && (
        <div
          className="tooltip"
          style={{
            position: 'absolute',
            left: hover.x,
            top: -30,
            transform: 'translateX(-50%)',
            background: '#505050',
            color: 'white',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}

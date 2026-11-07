"use client";

import { useState } from "react";
import type { Evidence } from "@/lib/contracts";

const positions = [[160, 70], [270, 120], [76, 190], [243, 248], [118, 310], [320, 205]] as const;

export function MemoryGraph({ evidence, demo = false }: { evidence: Evidence[]; demo?: boolean }) {
  const [selected, setSelected] = useState(0);
  const nodes = evidence.slice(0, 6);
  const active = nodes[Math.min(selected, Math.max(nodes.length - 1, 0))];
  return <div>
    <div className="graph-frame glass">
      {nodes.length ? <svg className="graph-svg" viewBox="0 0 400 380" role="img" aria-label={`Memory constellation with ${nodes.length} historical incident${nodes.length === 1 ? "" : "s"}`}>
        <circle cx="200" cy="190" r="74" fill="none" stroke="rgba(215,225,255,.13)" />
        <circle cx="200" cy="190" r="130" fill="none" stroke="rgba(215,225,255,.09)" strokeDasharray="3 8" />
        {nodes.map((node, i) => {
          const [x, y] = positions[i];
          const brightness = Math.max(.25, Math.min(1, node.similarity ?? (0.4 + (i % 3) * 0.18)));
          return <g
            key={`${node.memory_id ?? i}`}
            tabIndex={0}
            role="button"
            style={{ outline: "none", cursor: "pointer" }}
            aria-label={`${node.service ?? "Historical incident"}, ${node.category ?? "category unavailable"}, ${node.outcome ?? "outcome unavailable"}`}
            onFocus={() => setSelected(i)}
            onMouseEnter={() => setSelected(i)}
            onClick={() => setSelected(i)}
          >
            <line x1="200" y1="190" x2={x} y2={y} className={`graph-edge${i === selected ? " graph-edge--bright" : ""}`} opacity={brightness} />
            <circle cx={x} cy={y} r={i === selected ? 22 : 16} className={`graph-node${i === selected ? " graph-node--center" : ""}`} />
            <text x={x} y={y + 3} className="graph-text" textAnchor="middle">{node.similarity != null ? `${Math.round(node.similarity * 100)}` : i + 1}</text>
          </g>;
        })}
        <circle cx="200" cy="190" r="25" className="graph-node graph-node--center" />
        <text x="200" y="194" className="graph-text" textAnchor="middle">NOW</text>
      </svg> : <div className="console-empty">No historical evidence to map yet.</div>}
    </div>
    <div className="graph-detail" aria-live="polite">
      {active ? <><b>{active.service ?? active.memory_id ?? "Retrieved incident"}</b> · {active.category ?? "Category not provided"} · {active.outcome ?? "Outcome not provided"}<br />{active.verified_cause ?? active.text}</> : demo ? "Demo constellation · Similar incidents orbit the current alert." : "The graph will populate when analysis returns historical evidence."}
    </div>
  </div>;
}

import { useEffect, useMemo, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LinkType = "supports" | "contradicts" | "extends" | "questions" | "bridges";

export interface ArgumentMapGraphNode {
  nodeKey: string;
  entityType: "category" | "submission" | "synthesisArtifact" | "fightThread";
  label: string;
  body?: string;
  categoryName?: string;
  categoryColor?: string;
  radiusScore?: number;
  weight?: number;
  clusterKey?: string;
  colorKey?: string;
  xHint?: number;
  yHint?: number;
}

export interface ArgumentMapGraphEdge {
  id: string;
  sourceKey: string;
  targetKey: string;
  linkType: LinkType;
  strength: number;
  confidence: number;
  weight: number;
  rationale?: string;
}

export interface ArgumentMapGraphProps {
  nodes: ArgumentMapGraphNode[];
  edges: ArgumentMapGraphEdge[];
  rendererLabel?: string;
  className?: string;
}

interface PositionedNode extends ArgumentMapGraphNode, SimulationNodeDatum {
  radius: number;
}

interface PositionedEdge
  extends
    Omit<ArgumentMapGraphEdge, "sourceKey" | "targetKey">,
    SimulationLinkDatum<PositionedNode> {
  sourceKey: string;
  targetKey: string;
}

const WIDTH = 960;
const HEIGHT = 520;

const linkTone: Record<
  LinkType,
  { stroke: string; badge: "success" | "error" | "sky" | "mustard" | "neutral" }
> = {
  supports: { stroke: "var(--c-success)", badge: "success" },
  contradicts: { stroke: "var(--c-error)", badge: "error" },
  extends: { stroke: "var(--c-sig-sky)", badge: "sky" },
  questions: { stroke: "var(--c-muted)", badge: "neutral" },
  bridges: { stroke: "var(--c-sig-mustard)", badge: "mustard" },
};

const colorVars: Record<string, string> = {
  sky: "var(--c-sig-sky)",
  peach: "var(--c-sig-peach)",
  coral: "var(--c-sig-coral)",
  slate: "var(--c-sig-slate)",
  cream: "var(--c-sig-cream)",
  mustard: "var(--c-sig-mustard)",
  yellow: "var(--c-sig-yellow)",
  synthesis: "var(--c-sig-slate)",
  uncategorized: "var(--c-surface-strong)",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nodeRadius(node: ArgumentMapGraphNode) {
  return clamp(12 + (node.radiusScore ?? 0.35) * 22, 14, 34);
}

function nodeFill(node: ArgumentMapGraphNode) {
  if (node.entityType === "synthesisArtifact") return "var(--c-sig-slate)";
  if (node.entityType === "category")
    return colorVars[node.categoryColor ?? ""] ?? "var(--c-sig-peach)";
  return (
    colorVars[node.categoryColor ?? ""] ?? colorVars[node.colorKey ?? ""] ?? "var(--c-sig-sky)"
  );
}

function nodeStroke(node: ArgumentMapGraphNode) {
  if (node.entityType === "synthesisArtifact") return "var(--c-ink)";
  if (node.entityType === "category") return "var(--c-ink)";
  return "var(--c-canvas)";
}

function nodeTypeLabel(type: ArgumentMapGraphNode["entityType"]) {
  if (type === "synthesisArtifact") return "Synthesis";
  if (type === "fightThread") return "Fight thread";
  return type[0].toUpperCase() + type.slice(1);
}

function trimLabel(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}...`;
}

function edgeEndpoint(endpoint: PositionedEdge["source"] | PositionedEdge["target"]) {
  return typeof endpoint === "object" ? endpoint : null;
}

export function ArgumentMapGraph({
  nodes,
  edges,
  rendererLabel,
  className,
}: ArgumentMapGraphProps) {
  const [layoutNodes, setLayoutNodes] = useState<PositionedNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<PositionedEdge[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(nodes[0]?.nodeKey ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const nodeByKey = useMemo(() => new Map(nodes.map((node) => [node.nodeKey, node])), [nodes]);
  const selectedNode = selectedNodeKey ? nodeByKey.get(selectedNodeKey) : null;
  const selectedEdge = layoutEdges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const visibleEdges = layoutEdges.slice(0, 8);

  useEffect(() => {
    if (nodes.length === 0) {
      setLayoutNodes([]);
      setLayoutEdges([]);
      return;
    }

    const nextNodes: PositionedNode[] = nodes.map((node, index) => ({
      ...node,
      radius: nodeRadius(node),
      x: clamp(80 + (node.xHint ?? (index % 8) * 110), 48, WIDTH - 48),
      y: clamp(80 + (node.yHint ?? Math.floor(index / 8) * 110), 48, HEIGHT - 48),
    }));
    const nextEdges: PositionedEdge[] = edges
      .filter((edge) => nodeByKey.has(edge.sourceKey) && nodeByKey.has(edge.targetKey))
      .map((edge) => ({
        ...edge,
        source: edge.sourceKey,
        target: edge.targetKey,
      }));

    const simulation = forceSimulation<PositionedNode>(nextNodes)
      .force(
        "link",
        forceLink<PositionedNode, PositionedEdge>(nextEdges)
          .id((node) => node.nodeKey)
          .distance((edge) => clamp(150 - edge.weight * 80, 72, 150))
          .strength((edge) => clamp(0.18 + edge.weight * 0.45, 0.18, 0.7)),
      )
      .force("charge", forceManyBody<PositionedNode>().strength(-230))
      .force(
        "collide",
        forceCollide<PositionedNode>().radius((node) => node.radius + 24),
      )
      .force("center", forceCenter<PositionedNode>(WIDTH / 2, HEIGHT / 2))
      .force(
        "x",
        forceX<PositionedNode>((node) =>
          clamp(80 + (node.xHint ?? WIDTH / 2), 64, WIDTH - 64),
        ).strength(0.045),
      )
      .force(
        "y",
        forceY<PositionedNode>((node) =>
          clamp(80 + (node.yHint ?? HEIGHT / 2), 64, HEIGHT - 64),
        ).strength(0.055),
      )
      .alpha(0.9)
      .alphaDecay(0.055);

    simulation.on("tick", () => {
      setLayoutNodes(nextNodes.map((node) => ({ ...node })));
      setLayoutEdges(nextEdges.map((edge) => ({ ...edge })));
    });

    return () => {
      simulation.stop();
    };
  }, [edges, nodeByKey, nodes]);

  useEffect(() => {
    if (!selectedNodeKey && nodes[0]) {
      setSelectedNodeKey(nodes[0].nodeKey);
    } else if (selectedNodeKey && !nodeByKey.has(selectedNodeKey)) {
      setSelectedNodeKey(nodes[0]?.nodeKey ?? null);
    }
  }, [nodeByKey, nodes, selectedNodeKey]);

  function selectNode(nodeKey: string) {
    setSelectedNodeKey(nodeKey);
    setSelectedEdgeId(null);
  }

  function selectEdge(edgeId: string) {
    setSelectedEdgeId(edgeId);
    setSelectedNodeKey(null);
  }

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--c-muted)]">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} edges</span>
        {rendererLabel && (
          <Badge tone="neutral" className="text-[8px]">
            {rendererLabel}
          </Badge>
        )}
        {(["supports", "contradicts", "extends", "bridges", "questions"] as const).map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: linkTone[type].stroke }}
            />
            {type}
          </span>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-hidden rounded-md border border-[var(--c-hairline)] bg-[var(--c-canvas)]">
          <svg
            role="img"
            aria-label="Argument map graph"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block aspect-[16/9] min-h-[340px] w-full"
          >
            <defs>
              {(Object.keys(linkTone) as LinkType[]).map((type) => (
                <marker
                  key={type}
                  id={`argument-map-arrow-${type}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" fill={linkTone[type].stroke} />
                </marker>
              ))}
            </defs>

            <rect width={WIDTH} height={HEIGHT} fill="var(--c-surface-soft)" />

            {layoutEdges.map((edge) => {
              const source = edgeEndpoint(edge.source);
              const target = edgeEndpoint(edge.target);
              if (!source || !target) return null;
              const isSelected = edge.id === selectedEdgeId;

              return (
                <g
                  key={edge.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  onClick={() => selectEdge(edge.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectEdge(edge.id);
                    }
                  }}
                >
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={linkTone[edge.linkType].stroke}
                    strokeWidth={isSelected ? 4 : clamp(1.5 + edge.weight * 4, 1.5, 4.5)}
                    strokeOpacity={isSelected ? 0.95 : 0.46}
                    markerEnd={`url(#argument-map-arrow-${edge.linkType})`}
                  />
                </g>
              );
            })}

            {layoutNodes.map((node) => {
              const isSelected = node.nodeKey === selectedNodeKey;
              const showLabel = isSelected || node.entityType !== "submission" || node.radius > 22;

              return (
                <g
                  key={node.nodeKey}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  transform={`translate(${node.x ?? WIDTH / 2}, ${node.y ?? HEIGHT / 2})`}
                  onClick={() => selectNode(node.nodeKey)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectNode(node.nodeKey);
                    }
                  }}
                >
                  <circle
                    r={node.radius}
                    fill={nodeFill(node)}
                    stroke={isSelected ? "var(--c-ink)" : nodeStroke(node)}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={node.entityType === "submission" ? 0.92 : 1}
                  />
                  {node.entityType === "synthesisArtifact" && (
                    <circle
                      r={node.radius - 5}
                      fill="none"
                      stroke="var(--c-canvas)"
                      strokeWidth={1.5}
                    />
                  )}
                  {showLabel && (
                    <text
                      y={node.radius + 15}
                      textAnchor="middle"
                      className="select-none fill-[var(--c-ink)] text-[10px] font-medium"
                    >
                      {trimLabel(node.label, 18)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="rounded-md border border-[var(--c-hairline)] bg-[var(--c-surface-soft)] p-3">
          {selectedEdge ? (
            <GraphEdgeDetails edge={selectedEdge} nodes={nodeByKey} />
          ) : selectedNode ? (
            <GraphNodeDetails node={selectedNode} />
          ) : (
            <p className="text-xs text-[var(--c-muted)]">Select a node or edge to inspect it.</p>
          )}
        </aside>
      </div>

      {visibleEdges.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
            Top relationships
          </p>
          {visibleEdges.map((edge) => (
            <button
              key={edge.id}
              type="button"
              className="grid cursor-pointer gap-1 rounded-sm bg-[var(--c-surface-strong)] p-2 text-left text-xs"
              onClick={() => selectEdge(edge.id)}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-[var(--c-ink)]">
                  {nodeByKey.get(edge.sourceKey)?.label ?? edge.sourceKey}
                </span>
                <Badge tone={linkTone[edge.linkType].badge} className="text-[8px]">
                  {edge.linkType}
                </Badge>
                <span className="font-medium text-[var(--c-ink)]">
                  {nodeByKey.get(edge.targetKey)?.label ?? edge.targetKey}
                </span>
              </span>
              {edge.rationale && <span className="text-[var(--c-muted)]">{edge.rationale}</span>}
            </button>
          ))}
          {edges.length > visibleEdges.length && (
            <p className="text-[10px] text-[var(--c-muted)]">
              + {edges.length - visibleEdges.length} more relationships in the graph
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GraphNodeDetails({ node }: { node: ArgumentMapGraphNode }) {
  return (
    <div className="grid gap-2 text-xs">
      <div>
        <Badge
          tone={node.entityType === "synthesisArtifact" ? "slate" : "neutral"}
          className="text-[8px]"
        >
          {nodeTypeLabel(node.entityType)}
        </Badge>
        {node.categoryName && (
          <p className="mt-2 text-[10px] text-[var(--c-muted)]">{node.categoryName}</p>
        )}
      </div>
      <h3 className="font-display text-base font-medium text-[var(--c-ink)]">{node.label}</h3>
      {node.body && <p className="leading-relaxed text-[var(--c-body)]">{node.body}</p>}
      <p className="text-[10px] text-[var(--c-muted)]">
        Weight {Math.round((node.weight ?? 0) * 10) / 10} - radius{" "}
        {Math.round((node.radiusScore ?? 0) * 100)}%
      </p>
    </div>
  );
}

function GraphEdgeDetails({
  edge,
  nodes,
}: {
  edge: PositionedEdge;
  nodes: Map<string, ArgumentMapGraphNode>;
}) {
  return (
    <div className="grid gap-2 text-xs">
      <Badge tone={linkTone[edge.linkType].badge} className="w-fit text-[8px]">
        {edge.linkType}
      </Badge>
      <div className="grid gap-1">
        <p className="font-medium text-[var(--c-ink)]">
          {nodes.get(edge.sourceKey)?.label ?? edge.sourceKey}
        </p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--c-muted)]">to</p>
        <p className="font-medium text-[var(--c-ink)]">
          {nodes.get(edge.targetKey)?.label ?? edge.targetKey}
        </p>
      </div>
      {edge.rationale && <p className="leading-relaxed text-[var(--c-body)]">{edge.rationale}</p>}
      <p className="text-[10px] text-[var(--c-muted)]">
        Strength {Math.round(edge.strength * 100)}% - confidence {Math.round(edge.confidence * 100)}
        %
      </p>
    </div>
  );
}

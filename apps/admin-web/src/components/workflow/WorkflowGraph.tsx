import { Graph } from '@antv/x6';
import { useEffect, useMemo, useRef } from 'react';

export type WorkflowGraphNode = {
  id: string;
  nodeKey: string;
  nodeType: string;
  name: string;
  assigneeType?: string | null;
};

export type WorkflowGraphEdge = {
  id: string;
  sourceNodeKey: string;
  targetNodeKey: string;
};

type Props = {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  height?: number;
};

const nodePalette: Record<string, { fill: string; stroke: string; text: string }> = {
  start: { fill: '#ecfeff', stroke: '#06b6d4', text: '#0f766e' },
  approval: { fill: '#eff6ff', stroke: '#2563eb', text: '#1d4ed8' },
  notify: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  end: { fill: '#ecfdf5', stroke: '#14b8a6', text: '#047857' },
};

export function WorkflowGraph({ nodes, edges, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const graphData = useMemo(() => buildGraphData(nodes, edges), [nodes, edges]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderFrame = window.requestAnimationFrame(() => {
      graphRef.current?.dispose();
      graphRef.current = null;
      container.replaceChildren();

      const width = Math.max(Math.floor(container.getBoundingClientRect().width), 720);
      const graph = new Graph({
        container,
        width,
        height,
        autoResize: false,
        interacting: false,
        background: { color: '#f8fafc' },
        grid: {
          visible: true,
          type: 'dot',
          args: { color: '#dbe4ef', thickness: 1 },
        },
        panning: false,
        mousewheel: false,
      });
      graphRef.current = graph;
      graph.fromJSON(graphData);
      graph.centerContent();
    });

    return () => {
      window.cancelAnimationFrame(renderFrame);
      graphRef.current?.dispose();
      graphRef.current = null;
      container.replaceChildren();
    };
  }, [graphData, height]);

  if (!nodes.length) {
    return <div className="workflow-graph-empty" style={{ height }}>暂无流程节点</div>;
  }

  return <div ref={containerRef} className="workflow-graph" style={{ height }} />;
}

function buildGraphData(nodes: WorkflowGraphNode[], edges: WorkflowGraphEdge[]) {
  const nodeKeySet = new Set(nodes.map((node) => node.nodeKey));
  const graphNodes = nodes.map((node, index) => {
    const palette = nodePalette[node.nodeType] ?? nodePalette.approval;
    return {
      id: node.nodeKey,
      shape: 'rect',
      x: 40 + index * 210,
      y: index % 2 === 0 ? 58 : 132,
      width: 156,
      height: 66,
      attrs: {
        body: {
          rx: 8,
          ry: 8,
          fill: palette.fill,
          stroke: palette.stroke,
          strokeWidth: 1.4,
          filter: {
            name: 'dropShadow',
            args: { dx: 0, dy: 4, blur: 10, color: 'rgba(15, 23, 42, 0.10)' },
          },
        },
        label: {
          text: `${node.name}\n${node.assigneeType ?? node.nodeType}`,
          fill: palette.text,
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 18,
        },
      },
    };
  });
  const graphEdges = (edges.length ? edges : createSequentialEdges(nodes))
    .filter((edge) => nodeKeySet.has(edge.sourceNodeKey) && nodeKeySet.has(edge.targetNodeKey))
    .map((edge) => ({
      id: edge.id,
      shape: 'edge',
      source: edge.sourceNodeKey,
      target: edge.targetNodeKey,
      connector: { name: 'rounded' },
      router: { name: 'manhattan', args: { padding: 18 } },
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 1.5,
          targetMarker: {
            name: 'block',
            width: 10,
            height: 7,
          },
        },
      },
    }));
  return { nodes: graphNodes, edges: graphEdges };
}

function createSequentialEdges(nodes: WorkflowGraphNode[]): WorkflowGraphEdge[] {
  return nodes.slice(0, -1).map((node, index) => ({
    id: `${node.nodeKey}-${nodes[index + 1].nodeKey}`,
    sourceNodeKey: node.nodeKey,
    targetNodeKey: nodes[index + 1].nodeKey,
  }));
}

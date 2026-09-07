import { useState } from 'react';
import {
  decodeDragData,
  encodeDragData,
  findNodeLocation,
  isContainerNode,
  NODE_DRAG_MIME,
} from '../lib/nodes';
import { useEditorStore } from '../store/editor';
import type { CanvasNode } from '../types/document';

function readDragData(event: React.DragEvent): ReturnType<typeof decodeDragData> {
  const value = event.dataTransfer.getData(NODE_DRAG_MIME) || event.dataTransfer.getData('text/plain');
  return value ? decodeDragData(value) : null;
}

function hasNodeDragData(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(NODE_DRAG_MIME) || event.dataTransfer.types.includes('text/plain');
}

function NodeView({ node, allNodes }: { node: CanvasNode; allNodes: CanvasNode[] }) {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const addNode = useEditorStore((state) => state.addNode);
  const moveNode = useEditorStore((state) => state.moveNode);
  const previewMode = useEditorStore((state) => state.previewMode);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const selected = !previewMode && selectedNodeId === node.id;
  const glassClass = node.glass && node.kind !== 'button' ? `glass-${node.glass}` : '';

  const select = (event: React.MouseEvent) => {
    if (previewMode) return;
    event.stopPropagation();
    selectNode(node.id);
  };

  const startDrag = (event: React.DragEvent) => {
    if (previewMode) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    const value = encodeDragData({ kind: 'move', nodeId: node.id });
    event.dataTransfer.setData(NODE_DRAG_MIME, value);
    event.dataTransfer.setData('text/plain', value);
    selectNode(node.id);
  };

  const dragOver = (event: React.DragEvent) => {
    if (previewMode) return;
    if (!hasNodeDragData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = readDragData(event)?.kind === 'new' ? 'copy' : 'move';
    setIsDropTarget(true);
  };

  const drop = (event: React.DragEvent) => {
    if (previewMode) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDropTarget(false);
    const data = readDragData(event);
    if (!data) return;

    if (data.kind === 'new' && isContainerNode(node)) {
      addNode(data.nodeKind, node.id);
      return;
    }

    const location = findNodeLocation(allNodes, node.id);
    if (!location) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontal = node.kind === 'hstack';
    const pointer = horizontal ? event.clientX : event.clientY;
    const start = horizontal ? rect.left : rect.top;
    const size = horizontal ? rect.width : rect.height;
    const edge = Math.min(28, size / 3);
    const insideContainer = isContainerNode(node)
      && data.kind === 'move'
      && pointer > start + edge
      && pointer < start + size - edge;

    if (insideContainer) {
      moveNode(data.nodeId, node.id, node.children.length);
      return;
    }

    const insertBefore = pointer < start + size / 2;
    const index = location.index + (insertBefore ? 0 : 1);
    if (data.kind === 'new') addNode(data.nodeKind, location.parentId, index);
    else moveNode(data.nodeId, location.parentId, index);
  };

  const navigate = previewMode && node.kind === 'navigation-link' && node.destinationScreenId
    ? () => selectScreen(node.destinationScreenId)
    : undefined;
  const content = renderNodeContent(node, allNodes, navigate);

  return (
    <div
      className={`canvas-node ${glassClass} ${selected ? 'is-selected' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
      draggable={!previewMode}
      onClick={previewMode ? undefined : select}
      onDragEnd={previewMode ? undefined : () => setIsDropTarget(false)}
      onDragEnter={previewMode ? undefined : dragOver}
      onDragLeave={previewMode ? undefined : () => setIsDropTarget(false)}
      onDragOver={previewMode ? undefined : dragOver}
      onDragStart={previewMode ? undefined : startDrag}
      onDrop={previewMode ? undefined : drop}
    >
      {content}
    </div>
  );
}

function renderNodeContent(node: CanvasNode, allNodes: CanvasNode[], onNavigate?: () => void): React.ReactNode {
  switch (node.kind) {
    case 'text':
      return (
        <div className="canvas-text" style={{ fontSize: node.fontSize, fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 }[node.weight] }}>
          {node.text}
        </div>
      );
    case 'image':
      return (
        <div className="ios-image" role="img" aria-label={node.accessibilityLabel || undefined}>
          <span className="ios-image-symbol" aria-hidden="true">✦</span>
          <span>{node.systemName || 'system image'}</span>
        </div>
      );
    case 'button':
      return (
        <button type="button" className={`ios-button ${node.role === 'destructive' ? 'destructive' : ''} ${node.glass ? `ios-button-${node.glass}` : ''}`} style={{ minHeight: node.minHeight }}>
          {node.label || 'Button'}
        </button>
      );
    case 'toggle':
      return (
        <div className="ios-row" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Toggle'}</span>
          <span className="ios-switch" aria-hidden="true"><span /></span>
        </div>
      );
    case 'textfield':
      return (
        <div className="ios-field" style={{ minHeight: node.minHeight }}>
          {node.label || 'Text field'}
        </div>
      );
    case 'navigation-link':
      return onNavigate ? (
        <button type="button" className="ios-row ios-navigation-link" style={{ minHeight: node.minHeight }} onClick={onNavigate}>
          <span>{node.label || 'Open screen'}</span>
          <span className="ios-link-indicator" aria-hidden="true">Next</span>
        </button>
      ) : (
        <div className="ios-row ios-navigation-link" style={{ minHeight: node.minHeight }}>
          <span>{node.label || 'Open screen'}</span>
          <span className="ios-link-indicator" aria-hidden="true">Next</span>
        </div>
      );
    case 'divider':
      return <div aria-label="Divider" className="ios-divider" />;
    case 'spacer':
      return <div aria-label="Spacer" className="ios-spacer">Spacer</div>;
    case 'vstack':
    case 'hstack':
    case 'list':
    case 'form':
    case 'section': {
      const horizontal = node.kind === 'hstack';
      return (
        <div className={`canvas-container ${horizontal ? 'horizontal' : ''} canvas-${node.kind}`}>
          {node.kind === 'section' && <div className="section-title">{node.title || 'Section'}</div>}
          <div className={horizontal ? 'node-row' : 'node-column'} style={{ gap: node.kind === 'section' || node.kind === 'list' || node.kind === 'form' ? 8 : node.spacing }}>
            {node.children.length === 0
              ? <div className="empty-container">Drop content here</div>
              : node.children.map((child) => <NodeView key={child.id} node={child} allNodes={allNodes} />)}
          </div>
        </div>
      );
    }
  }
}

export function PhoneCanvas() {
  const document = useEditorStore((state) => state.document);
  const selectNode = useEditorStore((state) => state.selectNode);
  const addNode = useEditorStore((state) => state.addNode);
  const moveNode = useEditorStore((state) => state.moveNode);
  const previewMode = useEditorStore((state) => state.previewMode);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const [isOver, setIsOver] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);

  if (!screen) return null;

  const hasGlass = containsGlass(screen.root.children);

  const dropOnScreen = (event: React.DragEvent) => {
    if (previewMode || !hasNodeDragData(event)) return;
    event.preventDefault();
    setIsOver(false);
    const data = readDragData(event);
    if (!data) return;
    if (data.kind === 'new') addNode(data.nodeKind);
    else moveNode(data.nodeId, null);
  };

  return (
    <main className={`workspace ${showGrid ? '' : 'no-grid'} ${previewMode ? 'preview-mode' : ''}`} onClick={previewMode ? undefined : () => selectNode(null)}>
      <div className="workspace-toolbar">
        <div className="workspace-title">
          <strong>{previewMode ? 'Preview' : 'Canvas'}</strong>
          <span>{screen.name} · iPhone · 393 × 852 pt{hasGlass ? ' · Liquid Glass' : ''}</span>
        </div>
        {!previewMode && <div className="workspace-controls" onClick={(event) => event.stopPropagation()}>
          <button className="canvas-toolbar-button" type="button" onClick={() => setZoom((current) => Math.max(75, current - 25))} aria-label="Zoom out">−</button>
          <button className="zoom-value" type="button" onClick={() => setZoom(100)}>{zoom}%</button>
          <button className="canvas-toolbar-button" type="button" onClick={() => setZoom((current) => Math.min(125, current + 25))} aria-label="Zoom in">+</button>
          <span className="toolbar-divider" aria-hidden="true" />
          <button className={`canvas-toolbar-button grid-toggle ${showGrid ? 'active' : ''}`} type="button" aria-pressed={showGrid} onClick={() => setShowGrid((current) => !current)}>Grid</button>
        </div>}
      </div>
      <div className="workspace-ruler"><span>{previewMode ? 'Read-only preview' : 'iPhone frame'}</span><span>393 × 852 pt · {zoom}%</span></div>
      <div className="phone-stage" style={{ transform: `scale(${zoom / 100})` }}>
        <div
          className={`phone-shell ${isOver ? 'is-over' : ''}`}
          onDragEnter={previewMode ? undefined : (event) => { if (hasNodeDragData(event)) setIsOver(true); }}
          onDragLeave={previewMode ? undefined : () => setIsOver(false)}
          onDragOver={previewMode ? undefined : (event) => { if (hasNodeDragData(event)) event.preventDefault(); }}
          onDrop={previewMode ? undefined : dropOnScreen}
        >
          <div className={`phone-screen scheme-${document.appearance.colorScheme} accent-${document.appearance.accentColor} ${hasGlass ? 'has-glass' : ''}`} aria-label={`${screen.name} iPhone preview`}>
            <div className="statusbar"><span>9:41</span><span className="status-icons">● ◒</span></div>
            <div className="dynamic-island" aria-hidden="true" />
            <div className="navigation-title">{screen.navigationTitle}</div>
            <div className="screen-content">
              {screen.root.children.length === 0 && <div className="screen-drop-hint">Drop a component here</div>}
              {screen.root.children.map((node) => <NodeView key={node.id} node={node} allNodes={screen.root.children} />)}
            </div>
            <div className="home-indicator" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}

function containsGlass(nodes: CanvasNode[]): boolean {
  return nodes.some((node) => Boolean(node.glass) || (node.children ? containsGlass(node.children) : false));
}

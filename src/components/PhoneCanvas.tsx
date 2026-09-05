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
  const addNode = useEditorStore((state) => state.addNode);
  const moveNode = useEditorStore((state) => state.moveNode);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const selected = selectedNodeId === node.id;

  const select = (event: React.MouseEvent) => {
    event.stopPropagation();
    selectNode(node.id);
  };

  const startDrag = (event: React.DragEvent) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    const value = encodeDragData({ kind: 'move', nodeId: node.id });
    event.dataTransfer.setData(NODE_DRAG_MIME, value);
    event.dataTransfer.setData('text/plain', value);
    selectNode(node.id);
  };

  const dragOver = (event: React.DragEvent) => {
    if (!hasNodeDragData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = readDragData(event)?.kind === 'new' ? 'copy' : 'move';
    setIsDropTarget(true);
  };

  const drop = (event: React.DragEvent) => {
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

  const content = renderNodeContent(node, allNodes);

  return (
    <div
      className={`canvas-node ${selected ? 'is-selected' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
      draggable
      onClick={select}
      onDragEnd={() => setIsDropTarget(false)}
      onDragEnter={dragOver}
      onDragLeave={() => setIsDropTarget(false)}
      onDragOver={dragOver}
      onDragStart={startDrag}
      onDrop={drop}
    >
      {content}
    </div>
  );
}

function renderNodeContent(node: CanvasNode, allNodes: CanvasNode[]): React.ReactNode {
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
        <button type="button" className={`ios-button ${node.role === 'destructive' ? 'destructive' : ''}`} style={{ minHeight: node.minHeight }}>
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
    case 'divider':
      return <div aria-label="Divider" className="ios-divider" />;
    case 'spacer':
      return <div aria-label="Spacer" className="ios-spacer">Spacer</div>;
    case 'vstack':
    case 'hstack':
    case 'section': {
      const horizontal = node.kind === 'hstack';
      return (
        <div className={`canvas-container ${horizontal ? 'horizontal' : ''}`}>
          {node.kind === 'section' && <div className="section-title">{node.title || 'Section'}</div>}
          <div className={horizontal ? 'node-row' : 'node-column'} style={{ gap: node.kind === 'section' ? 8 : node.spacing }}>
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
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const [isOver, setIsOver] = useState(false);

  if (!screen) return null;

  const dropOnScreen = (event: React.DragEvent) => {
    if (!hasNodeDragData(event)) return;
    event.preventDefault();
    setIsOver(false);
    const data = readDragData(event);
    if (!data) return;
    if (data.kind === 'new') addNode(data.nodeKind);
    else moveNode(data.nodeId, null);
  };

  return (
    <main className="workspace" onClick={() => selectNode(null)}>
      <div className="workspace-ruler"><span>iPhone</span><span>393 × 852 pt</span></div>
      <div
        className={`phone-shell ${isOver ? 'is-over' : ''}`}
        onDragEnter={(event) => { if (hasNodeDragData(event)) setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDragOver={(event) => { if (hasNodeDragData(event)) event.preventDefault(); }}
        onDrop={dropOnScreen}
      >
        <div className="phone-screen">
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
    </main>
  );
}

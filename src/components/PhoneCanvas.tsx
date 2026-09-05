import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '../store/editor';
import type { CanvasNode } from '../types/document';

function NodeView({ node }: { node: CanvasNode }) {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selected = selectedNodeId === node.id;

  const select = (event: React.MouseEvent) => {
    event.stopPropagation();
    selectNode(node.id);
  };

  const className = `canvas-node ${selected ? 'is-selected' : ''}`;

  switch (node.kind) {
    case 'text':
      return (
        <button type="button" className={`${className} canvas-text`} onClick={select} style={{ fontSize: node.fontSize, fontWeight: node.weight }}>
          {node.text}
        </button>
      );
    case 'button':
      return (
        <button type="button" className={`${className} ios-button ${node.role === 'destructive' ? 'destructive' : ''}`} onClick={select} style={{ minHeight: node.minHeight }}>
          {node.label}
        </button>
      );
    case 'toggle':
      return (
        <button type="button" className={`${className} ios-row`} onClick={select} style={{ minHeight: node.minHeight }}>
          <span>{node.label}</span>
          <span className="ios-switch" aria-hidden="true"><span /></span>
        </button>
      );
    case 'textfield':
      return (
        <button type="button" className={`${className} ios-field`} onClick={select} style={{ minHeight: node.minHeight }}>
          {node.label}
        </button>
      );
    case 'divider':
      return <button type="button" aria-label="Divider" className={`${className} ios-divider`} onClick={select} />;
    case 'spacer':
      return <button type="button" aria-label="Spacer" className={`${className} ios-spacer`} onClick={select}>Spacer</button>;
    case 'vstack':
    case 'hstack':
    case 'section': {
      const horizontal = node.kind === 'hstack';
      return (
        <div className={`${className} canvas-container ${horizontal ? 'horizontal' : ''}`} onClick={select} role="button" tabIndex={0}>
          {node.kind === 'section' && <div className="section-title">{node.title}</div>}
          <div className={horizontal ? 'node-row' : 'node-column'} style={{ gap: node.kind === 'section' ? 8 : node.spacing }}>
            {node.children.length === 0 ? <div className="empty-container">Drop content here later</div> : node.children.map((child) => <NodeView key={child.id} node={child} />)}
          </div>
        </div>
      );
    }
  }
}

export function PhoneCanvas() {
  const document = useEditorStore((state) => state.document);
  const selectNode = useEditorStore((state) => state.selectNode);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const { setNodeRef, isOver } = useDroppable({ id: 'screen-canvas' });

  if (!screen) return null;

  return (
    <main className="workspace" onClick={() => selectNode(null)}>
      <div className="workspace-ruler"><span>iPhone</span><span>393 × 852 pt</span></div>
      <div className={`phone-shell ${isOver ? 'is-over' : ''}`} ref={setNodeRef}>
        <div className="phone-screen">
          <div className="statusbar"><span>9:41</span><span className="status-icons">● ◒</span></div>
          <div className="dynamic-island" aria-hidden="true" />
          <div className="navigation-title">{screen.navigationTitle}</div>
          <div className="screen-content">
            {screen.root.children.map((node) => <NodeView key={node.id} node={node} />)}
          </div>
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}

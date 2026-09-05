import { useState } from 'react';
import { encodeDragData, isContainerNode, NODE_DRAG_MIME } from '../lib/nodes';
import { useEditorStore } from '../store/editor';
import type { CanvasNode, NodeKind } from '../types/document';

const groups: { title: string; items: { kind: NodeKind; label: string; symbol: string }[] }[] = [
  {
    title: 'Layout',
    items: [
      { kind: 'vstack', label: 'VStack', symbol: '↕' },
      { kind: 'hstack', label: 'HStack', symbol: '↔' },
      { kind: 'section', label: 'Section', symbol: '§' },
      { kind: 'spacer', label: 'Spacer', symbol: '—' },
    ],
  },
  {
    title: 'Content',
    items: [
      { kind: 'text', label: 'Text', symbol: 'T' },
      { kind: 'image', label: 'Image', symbol: '✦' },
      { kind: 'divider', label: 'Divider', symbol: '―' },
    ],
  },
  {
    title: 'Controls',
    items: [
      { kind: 'button', label: 'Button', symbol: 'B' },
      { kind: 'toggle', label: 'Toggle', symbol: '◉' },
      { kind: 'textfield', label: 'Text Field', symbol: '⌁' },
    ],
  },
];

function startDrag(event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) {
  event.dataTransfer.effectAllowed = data.kind === 'new' ? 'copy' : 'move';
  const value = encodeDragData(data);
  event.dataTransfer.setData(NODE_DRAG_MIME, value);
  event.dataTransfer.setData('text/plain', value);
}

export function Palette() {
  const document = useEditorStore((state) => state.document);
  const addNode = useEditorStore((state) => state.addNode);
  const [tab, setTab] = useState<'layers' | 'components'>('layers');
  const [query, setQuery] = useState('');
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)) }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="palette panel-border-right" aria-label="Components and SwiftUI structure">
      <div className="panel-heading"><span>Library</span><span className="panel-heading-meta">{tab === 'layers' ? 'Layers' : `${filteredGroups.reduce((total, group) => total + group.items.length, 0)} items`}</span></div>
      <div className="panel-tabs" role="tablist" aria-label="Library views">
        <button className={tab === 'layers' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')}>Layers</button>
        <button className={tab === 'components' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'components'} onClick={() => setTab('components')}>Components</button>
      </div>
      <div className="palette-scroll">
        {tab === 'layers' && screen && <StructureTree root={screen.root} onDragStart={startDrag} />}
        {tab === 'components' && (
          <>
            <label className="component-search">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter components" aria-label="Filter components" />
            </label>
            {filteredGroups.map((group) => (
              <section className="palette-group" key={group.title}>
                <div className="palette-group-title">{group.title}</div>
                <div className="palette-items">
                  {group.items.map((item) => (
                    <button
                      className="palette-item"
                      draggable
                      key={item.kind}
                      onClick={() => addNode(item.kind)}
                      onDragStart={(event) => startDrag(event, { kind: 'new', nodeKind: item.kind })}
                      type="button"
                    >
                      <span className="palette-symbol" aria-hidden="true">{item.symbol}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {filteredGroups.length === 0 && <div className="palette-empty">No components match “{query}”.</div>}
          </>
        )}
      </div>
    </aside>
  );
}

function StructureTree({
  root,
  onDragStart,
}: {
  root: CanvasNode;
  onDragStart: (event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) => void;
}) {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="structure-section">
      <div className="structure-heading">Structure</div>
      <div className="tree-virtual"><span className="tree-disclosure-placeholder">⌄</span><span>NavigationStack</span></div>
      <div className="tree-virtual tree-indent"><span className="tree-disclosure-placeholder">⌄</span><span>ScrollView</span></div>
      <TreeNode
        collapsed={collapsed}
        depth={2}
        node={root}
        onDragStart={onDragStart}
        onSelect={selectNode}
        onToggle={toggle}
        selectedNodeId={selectedNodeId}
        selectable={false}
      />
    </section>
  );
}

function TreeNode({
  node,
  depth,
  collapsed,
  selectedNodeId,
  selectable,
  onToggle,
  onSelect,
  onDragStart,
}: {
  node: CanvasNode;
  depth: number;
  collapsed: Set<string>;
  selectedNodeId: string | null;
  selectable: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDragStart: (event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) => void;
}) {
  const hasChildren = isContainerNode(node) && node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const rowStyle = { paddingLeft: `${depth * 12 + 7}px` };

  return (
    <div className="tree-node">
      <div className="tree-row" style={rowStyle}>
        {isContainerNode(node) ? (
          <button className="tree-disclosure" type="button" onClick={() => onToggle(node.id)} aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            {hasChildren && !isCollapsed ? '⌄' : '›'}
          </button>
        ) : <span className="tree-disclosure-placeholder" />}
        {selectable ? (
          <button
            className={`tree-item ${selectedNodeId === node.id ? 'is-selected' : ''}`}
            draggable
            onClick={() => onSelect(node.id)}
            onDragStart={(event) => onDragStart(event, { kind: 'move', nodeId: node.id })}
            type="button"
          >
            <span className="tree-kind">{node.kind}</span>
            <span className="tree-label">{nodeLabel(node)}</span>
          </button>
        ) : (
          <span className="tree-item tree-root-item">
            <span className="tree-kind">{node.kind}</span>
            <span className="tree-label">Screen content</span>
          </span>
        )}
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              collapsed={collapsed}
              depth={depth + 1}
              key={child.id}
              node={child}
              onDragStart={onDragStart}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedNodeId={selectedNodeId}
              selectable
            />
          ))}
        </div>
      )}
    </div>
  );
}

function nodeLabel(node: CanvasNode): string {
  switch (node.kind) {
    case 'text': return node.text || 'Text';
    case 'button':
    case 'toggle':
    case 'textfield': return node.label || node.kind;
    case 'section': return node.title || 'Section';
    default: return '';
  }
}

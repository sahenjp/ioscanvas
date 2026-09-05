import { useState } from 'react';
import { encodeDragData, findNode, findNodeLocation, isContainerNode, NODE_DRAG_MIME } from '../lib/nodes';
import { useEditorStore } from '../store/editor';
import type { CanvasNode, CanvasScreen, NodeKind } from '../types/document';

const groups: { title: string; items: { kind: NodeKind; label: string; symbol: string }[] }[] = [
  {
    title: 'Layout',
    items: [
      { kind: 'vstack', label: 'VStack', symbol: 'V' },
      { kind: 'hstack', label: 'HStack', symbol: 'H' },
      { kind: 'section', label: 'Section', symbol: 'S' },
      { kind: 'list', label: 'List', symbol: 'L' },
      { kind: 'form', label: 'Form', symbol: 'F' },
      { kind: 'spacer', label: 'Spacer', symbol: 'Sp' },
    ],
  },
  {
    title: 'Content',
    items: [
      { kind: 'text', label: 'Text', symbol: 'T' },
      { kind: 'image', label: 'Image', symbol: 'SF' },
      { kind: 'divider', label: 'Divider', symbol: 'Div' },
    ],
  },
  {
    title: 'Controls',
    items: [
      { kind: 'button', label: 'Button', symbol: 'B' },
      { kind: 'toggle', label: 'Toggle', symbol: 'To' },
      { kind: 'textfield', label: 'Text Field', symbol: 'TF' },
      { kind: 'navigation-link', label: 'Navigation Link', symbol: 'NL' },
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
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const [tab, setTab] = useState<'layers' | 'components'>('components');
  const [query, setQuery] = useState('');
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const selectedNode = screen && selectedNodeId ? findNode(screen.root.children, selectedNodeId) : undefined;
  const selectedLocation = screen && selectedNodeId ? findNodeLocation(screen.root.children, selectedNodeId) : undefined;
  const selectedContainer = selectedNode && isContainerNode(selectedNode) ? selectedNode : undefined;
  const insertionContainer = selectedContainer ?? (screen && selectedLocation?.parentId ? findNode(screen.root.children, selectedLocation.parentId) : undefined);
  const insertionParentId = insertionContainer?.id ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)) }))
    .filter((group) => group.items.length > 0);

  const addFromLibrary = (kind: NodeKind) => {
    addNode(kind, insertionParentId);
  };

  return (
    <aside className="palette panel-border-right" aria-label="Components and SwiftUI structure">
      <div className="panel-heading"><span>Library</span><span className="panel-heading-meta">{tab === 'layers' ? 'Layers' : `${filteredGroups.reduce((total, group) => total + group.items.length, 0)} items`}</span></div>
      <div className="panel-tabs" role="tablist" aria-label="Library views">
        <button className={tab === 'layers' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')}>Layers</button>
        <button className={tab === 'components' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'components'} onClick={() => setTab('components')}>Components</button>
      </div>
      <div className="palette-scroll">
        {tab === 'layers' && screen && <StructureTree screen={screen} onDragStart={startDrag} />}
        {tab === 'components' && (
          <>
            <div className="component-insert-hint">
              <span>Insert into</span>
              <strong>{insertionContainer ? nodeLabel(insertionContainer) : 'Screen root'}</strong>
            </div>
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
                      onClick={() => addFromLibrary(item.kind)}
                      onDragStart={(event) => startDrag(event, { kind: 'new', nodeKind: item.kind })}
                      title={`Click to add to ${insertionContainer ? 'the selected container' : 'the screen'}. Drag to place.`}
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
  screen,
  onDragStart,
}: {
  screen: CanvasScreen;
  onDragStart: (event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) => void;
}) {
  const { root } = screen;
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectNode = useEditorStore((state) => state.selectNode);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const firstChild = root.children[0];
  const directScrollContainer = root.children.length === 1
    && firstChild !== undefined
    && (firstChild.kind === 'list' || firstChild.kind === 'form');

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
      {directScrollContainer && firstChild ? (
        <TreeNode
          collapsed={collapsed}
          depth={1}
          node={firstChild}
          onDragStart={onDragStart}
          onSelect={selectNode}
          onToggle={toggle}
          selectedNodeId={selectedNodeId}
          selectable
        />
      ) : (
        <>
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
        </>
      )}
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
        {isContainerNode(node) && hasChildren ? (
          <button className="tree-disclosure" type="button" onClick={() => onToggle(node.id)} aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? '›' : '⌄'}
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
            <span className="tree-kind">{nodeKindLabel(node.kind)}</span>
            <span className="tree-label">{nodeLabel(node)}</span>
          </button>
        ) : (
          <span className="tree-item tree-root-item">
            <span className="tree-kind">{nodeKindLabel(node.kind)}</span>
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
    case 'textfield':
    case 'navigation-link': return node.label || nodeKindLabel(node.kind);
    case 'section': return node.title || 'Section';
    case 'image': return node.systemName || 'Image';
    default: return nodeKindLabel(node.kind);
  }
}

function nodeKindLabel(kind: NodeKind): string {
  switch (kind) {
    case 'vstack': return 'VStack';
    case 'hstack': return 'HStack';
    case 'list': return 'List';
    case 'form': return 'Form';
    case 'section': return 'Section';
    case 'textfield': return 'TextField';
    case 'navigation-link': return 'NavigationLink';
    case 'divider': return 'Divider';
    case 'spacer': return 'Spacer';
    case 'text': return 'Text';
    case 'button': return 'Button';
    case 'toggle': return 'Toggle';
    case 'image': return 'Image';
  }
}

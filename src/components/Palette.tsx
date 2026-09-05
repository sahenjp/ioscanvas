import type { NodeKind } from '../types/document';
import { useEditorStore } from '../store/editor';

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

export function Palette() {
  const addNode = useEditorStore((state) => state.addNode);

  return (
    <aside className="palette panel-border-right" aria-label="Components">
      <div className="panel-heading">Components</div>
      <div className="palette-scroll">
        {groups.map((group) => (
          <section className="palette-group" key={group.title}>
            <div className="palette-group-title">{group.title}</div>
            <div className="palette-items">
              {group.items.map((item) => (
                <button className="palette-item" key={item.kind} onClick={() => addNode(item.kind)} type="button">
                  <span className="palette-symbol" aria-hidden="true">{item.symbol}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

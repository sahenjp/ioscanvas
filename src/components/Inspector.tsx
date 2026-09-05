import { findNode } from '../lib/nodes';
import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';
import type { CanvasNode } from '../types/document';

export function Inspector() {
  const document = useEditorStore((state) => state.document);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const updateSelectedNode = useEditorStore((state) => state.updateSelectedNode);
  const updateActiveScreen = useEditorStore((state) => state.updateActiveScreen);
  const duplicateSelectedNode = useEditorStore((state) => state.duplicateSelectedNode);
  const deleteSelectedNode = useEditorStore((state) => state.deleteSelectedNode);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const node = screen && selectedNodeId ? findNode(screen.root.children, selectedNodeId) : undefined;
  const issues = lintDocument(document).filter((issue) => issue.nodeId === selectedNodeId);

  return (
    <aside className="inspector panel-border-left">
      <div className="panel-heading">Inspector</div>
      {!node ? (
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="section-label">Screen</div>
            {screen && (
              <>
                <Field label="Name">
                  <input value={screen.name} onChange={(event) => updateActiveScreen({ name: event.target.value })} />
                </Field>
                <Field label="Navigation">
                  <input value={screen.navigationTitle} onChange={(event) => updateActiveScreen({ navigationTitle: event.target.value })} />
                </Field>
              </>
            )}
          </section>
          <div className="inspector-empty">Select an element on the canvas to edit its properties.</div>
        </div>
      ) : (
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="inspector-kind">{node.kind}</div>
            {'text' in node && node.kind === 'text' && (
              <Field label="Text">
                <input value={node.text} onChange={(event) => updateSelectedNode({ text: event.target.value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {'label' in node && typeof node.label === 'string' && (
              <Field label="Label">
                <input value={node.label} onChange={(event) => updateSelectedNode({ label: event.target.value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'image' && (
              <>
                <Field label="Symbol">
                  <input value={node.systemName} onChange={(event) => updateSelectedNode({ systemName: event.target.value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="A11y label">
                  <input value={node.accessibilityLabel} onChange={(event) => updateSelectedNode({ accessibilityLabel: event.target.value } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'text' && (
              <>
                <Field label="Size">
                  <input type="number" min="8" max="72" value={node.fontSize} onChange={(event) => updateSelectedNode({ fontSize: numericValue(event.target.value, node.fontSize, 8, 72) } as Partial<CanvasNode>)} />
                </Field>
                <Field label="Weight">
                  <select value={node.weight} onChange={(event) => updateSelectedNode({ weight: event.target.value as typeof node.weight } as Partial<CanvasNode>)}>
                    <option value="regular">Regular</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semibold</option>
                    <option value="bold">Bold</option>
                  </select>
                </Field>
              </>
            )}
            {(node.kind === 'button' || node.kind === 'toggle' || node.kind === 'textfield') && (
              <Field label="Min height">
                <div className="input-with-unit"><input type="number" min="20" max="120" value={node.minHeight} onChange={(event) => updateSelectedNode({ minHeight: numericValue(event.target.value, node.minHeight, 20, 120) } as Partial<CanvasNode>)} /><span>pt</span></div>
              </Field>
            )}
            {(node.kind === 'toggle' || node.kind === 'textfield') && (
              <Field label="Binding">
                <input value={node.binding} onChange={(event) => updateSelectedNode({ binding: event.target.value.replace(/\s+/g, '') } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'button' && (
              <Field label="Role">
                <select value={node.role} onChange={(event) => updateSelectedNode({ role: event.target.value as typeof node.role } as Partial<CanvasNode>)}>
                  <option value="normal">Normal</option>
                  <option value="destructive">Destructive</option>
                  <option value="cancel">Cancel</option>
                </select>
              </Field>
            )}
            {node.kind === 'section' && (
              <Field label="Section title">
                <input value={node.title ?? ''} onChange={(event) => updateSelectedNode({ title: event.target.value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {(node.kind === 'vstack' || node.kind === 'hstack') && (
              <Field label="Spacing">
                <input type="number" min="0" max="64" value={node.spacing ?? 0} onChange={(event) => updateSelectedNode({ spacing: numericValue(event.target.value, node.spacing ?? 0, 0, 64) } as Partial<CanvasNode>)} />
              </Field>
            )}
          </section>

          {issues.length > 0 && (
            <section className="inspector-section warnings-section">
              <div className="section-label">HIG</div>
              {issues.map((issue) => <div className="warning-row" key={`${issue.code}-${issue.nodeId}`}>{issue.message}</div>)}
            </section>
          )}

          <section className="inspector-section">
            <button className="secondary-action-button" type="button" onClick={duplicateSelectedNode}>Duplicate element</button>
            <button className="delete-button" type="button" onClick={deleteSelectedNode}>Delete element</button>
          </section>
        </div>
      )}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function numericValue(raw: string, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

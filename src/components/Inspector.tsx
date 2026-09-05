import { findNode } from '../lib/nodes';
import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';
import type { CanvasNode, GlassStyle } from '../types/document';

export function Inspector() {
  const document = useEditorStore((state) => state.document);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const updateSelectedNode = useEditorStore((state) => state.updateSelectedNode);
  const updateActiveScreen = useEditorStore((state) => state.updateActiveScreen);
  const selectNode = useEditorStore((state) => state.selectNode);
  const duplicateSelectedNode = useEditorStore((state) => state.duplicateSelectedNode);
  const deleteSelectedNode = useEditorStore((state) => state.deleteSelectedNode);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const node = screen && selectedNodeId ? findNode(screen.root.children, selectedNodeId) : undefined;
  const allIssues = lintDocument(document);
  const issues = allIssues.filter((issue) => issue.nodeId === selectedNodeId);
  const screenIssues = screen
    ? allIssues.filter((issue) => issue.nodeId === screen.root.id || Boolean(findNode(screen.root.children, issue.nodeId)))
    : [];

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
                  <DraftInput key={`${screen.id}-name-${screen.name}`} value={screen.name} onCommit={(value) => updateActiveScreen({ name: value })} />
                </Field>
                <Field label="Navigation">
                  <DraftInput key={`${screen.id}-navigation-${screen.navigationTitle}`} value={screen.navigationTitle} onCommit={(value) => updateActiveScreen({ navigationTitle: value })} />
                </Field>
              </>
            )}
          </section>
          {screenIssues.length > 0 && (
            <section className="inspector-section warnings-section">
              <div className="section-label">HIG · {screenIssues.length}</div>
              {screenIssues.map((issue) => issue.nodeId === screen?.root.id ? (
                <div className="warning-row" key={`${issue.code}-${issue.nodeId}`}>{issue.message}</div>
              ) : (
                <button
                  className="warning-row hig-issue-button"
                  key={`${issue.code}-${issue.nodeId}`}
                  type="button"
                  onClick={() => selectNode(issue.nodeId)}
                >
                  {issue.message}
                </button>
              ))}
            </section>
          )}
          <div className="inspector-empty">Select an element on the canvas to edit its properties.</div>
        </div>
      ) : (
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="inspector-kind">{nodeKindLabel(node.kind)}</div>
            <Field label="Glass">
              <select
                value={node.glass ?? 'none'}
                onChange={(event) => updateSelectedNode({ glass: event.target.value === 'none' ? undefined : event.target.value as GlassStyle } as Partial<CanvasNode>)}
              >
                <option value="none">Default</option>
                <option value="regular">Liquid Glass</option>
                <option value="clear">Clear Glass</option>
              </select>
            </Field>
            {'text' in node && node.kind === 'text' && (
              <Field label="Text">
                <DraftInput key={`${node.id}-text-${node.text}`} value={node.text} onCommit={(value) => updateSelectedNode({ text: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {'label' in node && typeof node.label === 'string' && (
              <Field label="Label">
                <DraftInput key={`${node.id}-label-${node.label}`} value={node.label} onCommit={(value) => updateSelectedNode({ label: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'image' && (
              <>
                <Field label="Symbol">
                  <DraftInput key={`${node.id}-symbol-${node.systemName}`} value={node.systemName} onCommit={(value) => updateSelectedNode({ systemName: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="A11y label">
                  <DraftInput key={`${node.id}-a11y-${node.accessibilityLabel}`} value={node.accessibilityLabel} onCommit={(value) => updateSelectedNode({ accessibilityLabel: value } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'text' && (
              <>
                <Field label="Size">
                  <DraftInput key={`${node.id}-size-${node.fontSize}`} type="number" min="8" max="72" value={node.fontSize} onCommit={(value) => updateSelectedNode({ fontSize: numericValue(value, node.fontSize, 8, 72) } as Partial<CanvasNode>)} />
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
            {(node.kind === 'button' || node.kind === 'toggle' || node.kind === 'textfield' || node.kind === 'navigation-link') && (
              <Field label="Min height">
                <div className="input-with-unit"><DraftInput key={`${node.id}-height-${node.minHeight}`} type="number" min="20" max="120" value={node.minHeight} onCommit={(value) => updateSelectedNode({ minHeight: numericValue(value, node.minHeight, 20, 120) } as Partial<CanvasNode>)} /><span>pt</span></div>
              </Field>
            )}
            {(node.kind === 'toggle' || node.kind === 'textfield') && (
              <Field label="Binding">
                <DraftInput key={`${node.id}-binding-${node.binding}`} value={node.binding} onCommit={(value) => updateSelectedNode({ binding: value.replace(/\s+/g, '') } as Partial<CanvasNode>)} />
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
            {node.kind === 'navigation-link' && (
              <Field label="Destination">
                <select value={node.destinationScreenId} onChange={(event) => updateSelectedNode({ destinationScreenId: event.target.value } as Partial<CanvasNode>)}>
                  <option value="">Choose screen</option>
                  {document.screens.filter((candidate) => candidate.id !== screen?.id).map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                  ))}
                </select>
              </Field>
            )}
            {node.kind === 'section' && (
              <Field label="Section title">
                <DraftInput key={`${node.id}-title-${node.title ?? ''}`} value={node.title ?? ''} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {(node.kind === 'vstack' || node.kind === 'hstack') && (
              <Field label="Spacing">
                <DraftInput key={`${node.id}-spacing-${node.spacing ?? 0}`} type="number" min="0" max="64" value={node.spacing ?? 0} onCommit={(value) => updateSelectedNode({ spacing: numericValue(value, node.spacing ?? 0, 0, 64) } as Partial<CanvasNode>)} />
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

function DraftInput({
  value,
  onCommit,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> & {
  value: string | number;
  onCommit: (value: string) => void;
}) {
  return (
    <input
      {...props}
      defaultValue={String(value)}
      onBlur={(event) => {
        if (event.currentTarget.value !== String(value)) onCommit(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

function numericValue(raw: string, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function nodeKindLabel(kind: CanvasNode['kind']): string {
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

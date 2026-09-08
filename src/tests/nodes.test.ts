import { describe, expect, it } from 'vitest';
import { cloneNode, createNode, createPattern, decodeDragData, encodeDragData, findNode, isContainerNode, moveNode } from '../lib/nodes';
import type { CanvasNode } from '../types/document';

describe('semantic node tree operations', () => {
  it('moves a node into a container and preserves its subtree', () => {
    const stack = createNode('vstack');
    const text = createNode('text');
    const nodes: CanvasNode[] = [text, stack];

    const next = moveNode(nodes, text.id, stack.id);

    expect(findNode(next, text.id)).toBeDefined();
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe(stack.id);
    const movedStack = findNode(next, stack.id);
    expect(movedStack?.kind).toBe('vstack');
    expect(movedStack?.children?.map((node) => node.id)).toEqual([text.id]);
  });

  it('does not allow moving a container into its own descendant', () => {
    const parent = createNode('vstack');
    const child = createNode('hstack');
    if (parent.kind !== 'vstack' && parent.kind !== 'hstack' && parent.kind !== 'section') {
      throw new Error('Fixture parent missing children');
    }
    parent.children.push(child);

    expect(moveNode([parent], parent.id, child.id)).toEqual([parent]);
  });

  it('does not remove a node when it is dropped onto itself', () => {
    const stack = createNode('vstack');
    const text = createNode('text');
    if (!isContainerNode(stack)) throw new Error('Fixture stack missing children');
    stack.children.push(text);

    expect(moveNode([stack], stack.id, stack.id)).toEqual([stack]);
  });

  it('duplicates a node tree with fresh IDs', () => {
    const stack = createNode('vstack');
    const text = createNode('text');
    if (!isContainerNode(stack)) throw new Error('Fixture stack missing children');
    stack.children.push(text);

    const duplicate = cloneNode(stack);

    expect(duplicate.id).not.toBe(stack.id);
    expect(duplicate.children?.[0]?.id).not.toBe(text.id);
    expect(duplicate.children?.[0]).toMatchObject({ kind: 'text' });
  });

  it('clones toggle button configuration without sharing its state object', () => {
    const button = createNode('button');
    if (button.kind !== 'button') throw new Error('Button fixture missing');
    button.toggle = { isOn: false, onLabel: 'オン', onSystemName: 'checkmark' };

    const duplicate = cloneNode(button);

    expect(duplicate).toMatchObject({ kind: 'button', toggle: button.toggle });
    if (duplicate.kind !== 'button' || !duplicate.toggle || !button.toggle) throw new Error('Toggle fixture missing');
    expect(duplicate.toggle).not.toBe(button.toggle);
  });

  it('creates a usable NavigationSplitView with separate sidebar and detail slots', () => {
    const split = createNode('navigation-split-view');

    expect(split.kind).toBe('navigation-split-view');
    expect(isContainerNode(split)).toBe(true);
    if (!isContainerNode(split)) throw new Error('Split fixture missing children');
    expect(split.children.map((child) => child.kind)).toEqual(['list', 'vstack']);
  });

  it('creates lazy stacks as regular semantic containers', () => {
    const vertical = createNode('lazyvstack');
    const horizontal = createNode('lazyhstack');
    const grid = createNode('lazyhgrid');

    expect(isContainerNode(vertical)).toBe(true);
    expect(isContainerNode(horizontal)).toBe(true);
    expect(vertical).toMatchObject({ kind: 'lazyvstack', spacing: 12, children: [] });
    expect(horizontal).toMatchObject({ kind: 'lazyhstack', spacing: 8, children: [] });
    expect(grid).toMatchObject({ kind: 'lazyhgrid', rows: 2, spacing: 12, children: [] });
    expect(isContainerNode(grid)).toBe(true);
  });

  it('creates reusable SwiftUI patterns as semantic trees', () => {
    const glassCard = createPattern('glass-card');
    const settings = createPattern('settings-section');
    const row = createPattern('list-row');
    const emptyState = createPattern('empty-state');

    expect(glassCard.kind).toBe('glass-container');
    expect(glassCard.children?.[0]?.kind).toBe('vstack');
    expect(glassCard.children?.[0]?.children?.map((node) => node.kind)).toEqual(['text', 'text', 'button']);
    expect(settings.kind).toBe('section');
    expect(settings.children?.map((node) => node.kind)).toEqual(['toggle', 'picker']);
    expect(row.kind).toBe('hstack');
    expect(row.children?.[1]?.kind).toBe('vstack');
    expect(emptyState.kind).toBe('content-unavailable');
  });

  it('creates an Alert with usable default actions', () => {
    const alert = createNode('alert');

    expect(alert).toMatchObject({
      kind: 'alert',
      primaryButton: '続ける',
      secondaryButton: 'キャンセル',
      minHeight: 44,
    });
  });

  it('creates a ConfirmationDialog with choices and cancellation', () => {
    const dialog = createNode('confirmation-dialog');

    expect(dialog).toMatchObject({
      kind: 'confirmation-dialog',
      options: ['編集', '削除'],
      cancelButton: 'キャンセル',
      minHeight: 44,
    });
  });

  it('creates a SearchField with a usable binding and prompt', () => {
    const search = createNode('searchfield');

    expect(search).toMatchObject({
      kind: 'searchfield',
      binding: 'query',
      prompt: '検索',
      minHeight: 44,
    });
  });

  it('round-trips pattern drag data and rejects unknown patterns', () => {
    expect(decodeDragData(encodeDragData({ kind: 'pattern', pattern: 'settings-section' }))).toEqual({
      kind: 'pattern',
      pattern: 'settings-section',
    });
    expect(decodeDragData('{"kind":"pattern","pattern":"unknown"}')).toBeNull();
  });
});

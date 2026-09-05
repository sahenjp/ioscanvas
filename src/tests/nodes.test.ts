import { describe, expect, it } from 'vitest';
import { createNode, findNode, moveNode } from '../lib/nodes';
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
});

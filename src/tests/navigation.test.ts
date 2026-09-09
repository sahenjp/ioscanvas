import { describe, expect, it } from 'vitest';
import { navigationEntries, screenNavigationEntries } from '../lib/navigation';
import type { CanvasNode, CanvasScreen } from '../types/document';

describe('navigation entries', () => {
  it('keeps nested Alert, menu, FAB, toolbar, and screen-bar actions visible', () => {
    const nodes: CanvasNode[] = [
      {
        id: 'alert',
        kind: 'alert',
        label: '確認',
        title: '確認',
        message: '',
        primaryButton: '続ける',
        primaryRole: 'normal',
        minHeight: 44,
        actions: [{ label: '詳細', role: 'normal', destinationScreenId: 'detail' }],
      },
      {
        id: 'split',
        kind: 'button',
        label: '送信',
        role: 'normal',
        minHeight: 44,
        m3eKind: 'splitButton',
        m3eMetadata: { tabs: [{ label: '戻る', icon: null }] },
        m3eMenuActions: { 'tab:0': { navigationAction: 'back' } },
      },
      {
        id: 'fab',
        kind: 'vstack',
        label: 'クイック操作',
        m3eKind: 'fabMenu',
        children: [{ id: 'fab-action', kind: 'button', label: '詳細', role: 'normal', minHeight: 44, destinationScreenId: 'detail' }],
      },
    ];
    const screen: CanvasScreen = {
      id: 'home',
      name: 'ホーム',
      navigationTitle: 'ホーム',
      root: { id: 'root', kind: 'vstack', children: nodes },
      toolbarItems: [{ id: 'toolbar-back', title: '戻る', placement: 'topBarLeading', navigationAction: 'back' }],
      tabBarItems: [{ id: 'tab-detail', title: '詳細', placement: 'bottomBar', destinationScreenId: 'detail' }],
    };

    const entries = screenNavigationEntries(screen);

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'alert-alert-0', nodeId: 'alert', destinationScreenId: 'detail', context: 'Alert · 詳細' }),
      expect.objectContaining({ key: 'split-menu-tab:0', nodeId: 'split', navigationAction: 'back', context: 'メニュー · 戻る' }),
      expect.objectContaining({ key: 'fab-action', nodeId: 'fab-action', destinationScreenId: 'detail', context: 'クイック操作' }),
      expect.objectContaining({ key: 'toolbar-toolbar-back', nodeId: null, navigationAction: 'back', context: 'ツールバー · 戻る' }),
      expect.objectContaining({ key: 'tab-tab-detail', nodeId: null, destinationScreenId: 'detail', context: 'タブバー · 詳細' }),
    ]));
  });

  it('does not report actions without a destination or back behavior', () => {
    const entries = navigationEntries([{
      id: 'button',
      kind: 'button',
      label: '操作',
      role: 'normal',
      minHeight: 44,
      m3eMenuActions: { empty: {} },
    }]);

    expect(entries).toEqual([]);
  });
});

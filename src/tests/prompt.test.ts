import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { generateImplementationPrompt } from '../lib/prompt';

describe('implementation prompt generator', () => {
  it('keeps explicit nested layout containers in the exported structure', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push({
      id: 'scroll-test',
      kind: 'scrollview',
      children: [{ id: 'zstack-test', kind: 'zstack', children: [] }],
    });

    const output = generateImplementationPrompt(document);

    expect(output).toContain('- scrollview');
    expect(output).toContain('  - zstack');
  });

  it('includes screen navigation presentation in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.navigationTitleDisplayMode = 'inline';
    screen.toolbarItems = [{ id: 'help', title: 'ヘルプ', systemName: 'questionmark.circle', placement: 'topBarTrailing', destinationScreenId: 'screen-settings' }];
    screen.tabBarItems = [{ id: 'settings-tab', title: '設定', systemName: 'gearshape', placement: 'bottomBar', destinationScreenId: 'screen-settings' }];
    screen.swipe = { left: 'screen-settings' };

    const output = generateImplementationPrompt(document);

    expect(output).toContain('タイトル表示: inline');
    expect(output).toContain('ツールバー: topBarTrailing: ヘルプ / symbol=questionmark.circle / destination=設定');
    expect(output).toContain('タブバー: 設定 / symbol=gearshape / destination=設定');
    expect(output).toContain('スワイプ遷移: left=設定');
  });

  it('includes screen, node, and NavigationLink implementation notes', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    const text = screen?.root.children.find((node) => node.kind === 'text');
    if (!screen || !text) throw new Error('Notes fixtures missing');
    screen.notes = 'ログイン後に一覧へ進む';
    text.notes = '読みやすいサイズで折り返す';
    text.textAlignment = 'center';
    text.lineLimit = 2;

    const output = generateImplementationPrompt(document);

    expect(output).toContain('画面メモ: ログイン後に一覧へ進む');
    expect(output).toContain('NavigationLink遷移: 設定を開く=設定');
    expect(output).toContain('memo=読みやすいサイズで折り返す');
    expect(output).toContain('alignment=center / lineLimit=2');
  });

  it('includes an icon button symbol in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'icon-button',
      kind: 'button',
      label: '次へ',
      systemName: 'arrow.right',
      role: 'normal',
      buttonStyle: 'bordered',
      minHeight: 44,
    });

    expect(generateImplementationPrompt(document)).toContain('- button: 次へ / role=normal / style=bordered / symbol=arrow.right');
  });

  it('includes SearchField binding and prompt in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'search-test',
      kind: 'searchfield',
      label: '検索',
      binding: 'query',
      prompt: 'キーワードを検索',
      minHeight: 44,
    });

    expect(generateImplementationPrompt(document)).toContain('- searchfield: 検索 / binding=query / prompt=キーワードを検索');
  });

  it('includes a VoiceOver label in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'icon-only-button',
      kind: 'button',
      label: '',
      accessibilityLabel: '閉じる',
      systemName: 'xmark',
      role: 'normal',
      minHeight: 44,
    });

    expect(generateImplementationPrompt(document)).toContain('accessibility=閉じる');
  });

  it('describes non-symbol Image sources in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'remote-image',
      kind: 'image',
      source: 'remote',
      systemName: 'https://example.com/hero.png',
      accessibilityLabel: 'ヒーロー画像',
    });

    expect(generateImplementationPrompt(document)).toContain('- image: https://example.com/hero.png / source=remote / accessibility=ヒーロー画像');
  });

  it('includes toggle button behavior in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'toggle-button',
      kind: 'button',
      label: '通知を開始',
      systemName: 'bell',
      role: 'normal',
      minHeight: 44,
      toggle: { isOn: false, onLabel: '通知を停止', onSystemName: 'bell.slash.fill' },
    });

    expect(generateImplementationPrompt(document)).toContain('toggle=off / onLabel=通知を停止 / onSymbol=bell.slash.fill');
  });

  it('includes Alert actions in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'alert-test',
      kind: 'alert',
      label: '削除',
      title: '削除しますか？',
      message: 'この操作は取り消せません。',
      primaryButton: '削除',
      primaryRole: 'destructive',
      secondaryButton: 'キャンセル',
      secondaryRole: 'cancel',
      minHeight: 44,
    });

    expect(generateImplementationPrompt(document)).toContain('- alert: 削除 / title=削除しますか？ / message=この操作は取り消せません。 / primary=削除 / secondary=キャンセル');
  });

  it('includes ConfirmationDialog choices in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'confirmation-test',
      kind: 'confirmation-dialog',
      label: '操作',
      title: '操作を選択',
      message: '実行する操作を選んでください。',
      options: ['編集', '削除'],
      cancelButton: 'キャンセル',
      minHeight: 44,
    });

    expect(generateImplementationPrompt(document)).toContain('- confirmation-dialog: 操作 / title=操作を選択 / message=実行する操作を選んでください。 / options=編集, 削除 / cancel=キャンセル');
  });

  it('can describe every screen when exporting a project brief', () => {
    const output = generateImplementationPrompt(defaultDocument, 'all');

    expect(output).toContain('SwiftUIでこの設計全体を実装してください。');
    expect(output).toContain('画面: ホーム');
    expect(output).toContain('画面: 設定');
    expect(output.indexOf('画面: ホーム')).toBeLessThan(output.indexOf('画面: 設定'));
  });

  it('includes a custom accent color in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.appearance = { colorScheme: 'light', accentColor: 'custom', accentHex: '#FF9500' };

    expect(generateImplementationPrompt(document)).toContain('tint=#FF9500');
  });

  it('keeps the sidebar and detail hierarchy in a split-view brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'split-test',
      kind: 'navigation-split-view',
      children: [
        { id: 'sidebar', kind: 'list', children: [{ id: 'sidebar-item', kind: 'text', text: '項目', fontSize: 17, weight: 'regular' }] },
        { id: 'detail', kind: 'vstack', spacing: 12, children: [{ id: 'detail-title', kind: 'text', text: '詳細', fontSize: 17, weight: 'regular' }] },
      ],
    });

    const output = generateImplementationPrompt(document);

    expect(output).toContain('- navigation-split-view');
    expect(output).toContain('  - list');
    expect(output).toContain('  - vstack');
  });

  it('describes LazyHGrid rows in the implementation brief', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({ id: 'row-grid', kind: 'lazyhgrid', rows: 3, children: [] });

    expect(generateImplementationPrompt(document)).toContain('- lazyhgrid / rows=3');
  });
});

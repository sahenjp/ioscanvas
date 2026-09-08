import { createId, findNode, findNodeLocation, isContainerNode } from '../lib/nodes';
import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';
import type { AccentColor, BackgroundStyle, CanvasNode, CanvasScreen, FontDesign, FrameWidth, GlassShape, GlassStyle, ImageSource, NavigationTitleDisplayMode, ShadowStyle, StackAlignment, SwipeDirection, TextAlignment, TextStyle, ToolbarItem, ToolbarPlacement } from '../types/document';

const swipeDirections: { key: SwipeDirection; label: string }[] = [
  { key: 'left', label: '左へスワイプ' },
  { key: 'right', label: '右へスワイプ' },
  { key: 'up', label: '上へスワイプ' },
  { key: 'down', label: '下へスワイプ' },
];

const sfSymbolSuggestions = [
  ['house.fill', 'ホーム'],
  ['star.fill', 'お気に入り'],
  ['gearshape.fill', '設定'],
  ['bell.fill', '通知'],
  ['person.crop.circle', 'プロフィール'],
  ['magnifyingglass', '検索'],
  ['plus', '追加'],
  ['plus.circle', '追加（円）'],
  ['checkmark', 'チェック'],
  ['checkmark.circle.fill', '完了'],
  ['xmark', '閉じる'],
  ['xmark.circle.fill', '削除'],
  ['chevron.right', '次へ'],
  ['chevron.left', '戻る'],
  ['chevron.down', '展開'],
  ['arrow.right', '右矢印'],
  ['arrow.left', '左矢印'],
  ['trash', 'ゴミ箱'],
  ['pencil', '編集'],
  ['photo', '写真'],
  ['folder.fill', 'フォルダ'],
  ['doc.fill', '書類'],
  ['calendar', 'カレンダー'],
  ['clock', '時計'],
  ['heart.fill', 'お気に入り'],
  ['bookmark.fill', 'ブックマーク'],
  ['ellipsis.circle', 'その他'],
  ['lock.fill', 'ロック'],
  ['eye.fill', '表示'],
  ['eye.slash.fill', '非表示'],
  ['line.3.horizontal', 'メニュー'],
  ['slider.horizontal.3', '調整'],
];

export function Inspector() {
  const document = useEditorStore((state) => state.document);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const updateSelectedNode = useEditorStore((state) => state.updateSelectedNode);
  const updateActiveScreen = useEditorStore((state) => state.updateActiveScreen);
  const updateAppearance = useEditorStore((state) => state.updateAppearance);
  const updateSelectedNodes = useEditorStore((state) => state.updateSelectedNodes);
  const updateDocumentName = useEditorStore((state) => state.updateDocumentName);
  const selectNode = useEditorStore((state) => state.selectNode);
  const moveSelectedNode = useEditorStore((state) => state.moveSelectedNode);
  const duplicateSelectedNode = useEditorStore((state) => state.duplicateSelectedNode);
  const groupSelectedNodes = useEditorStore((state) => state.groupSelectedNodes);
  const ungroupSelectedNode = useEditorStore((state) => state.ungroupSelectedNode);
  const deleteSelectedNode = useEditorStore((state) => state.deleteSelectedNode);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const node = screen && selectedNodeId ? findNode(screen.root.children, selectedNodeId) : undefined;
  const location = screen && selectedNodeId ? findNodeLocation(screen.root.children, selectedNodeId) : undefined;
  const parent = screen && location?.parentId ? findNode(screen.root.children, location.parentId) : undefined;
  const siblingCount = location?.parentId && parent && isContainerNode(parent)
    ? parent.children.length
    : screen?.root.children.length ?? 0;
  const selectedLocations = screen
    ? selectedNodeIds.flatMap((id) => {
      const selectedLocation = findNodeLocation(screen.root.children, id);
      return selectedLocation ? [selectedLocation] : [];
    })
    : [];
  const selectedNodes = selectedLocations.map((selectedLocation) => selectedLocation.node);
  const canGroupSelection = selectedNodeIds.length > 1
    && selectedLocations.length === selectedNodeIds.length
    && selectedLocations.every((selectedLocation) => selectedLocation.parentId === selectedLocations[0]?.parentId);
  const canMoveUp = Boolean(location && location.index > 0);
  const canMoveDown = Boolean(location && location.index < siblingCount - 1);
  const allIssues = lintDocument(document);
  const issues = allIssues.filter((issue) => issue.nodeId === selectedNodeId);
  const screenIssues = screen
    ? allIssues.filter((issue) => issue.nodeId === screen.root.id || Boolean(findNode(screen.root.children, issue.nodeId)))
    : [];
  const screenWarnings = screenIssues.filter((issue) => issue.severity === 'warning');

  return (
    <aside className="inspector panel-border-left">
      <datalist id="ioscanvas-sf-symbols">
        {sfSymbolSuggestions.map(([name, label]) => <option key={name} value={name} label={label} />)}
      </datalist>
      <div className="panel-heading">インスペクタ</div>
      {selectedNodeIds.length > 1 ? (
        <div className="inspector-scroll">
          <section className="inspector-section multi-selection-section">
            <div className="section-label">複数選択</div>
            <div className="multi-selection-count">{selectedNodeIds.length}要素を選択中</div>
            <div className="multi-selection-list">
              {selectedNodeIds.map((id) => {
                const selected = screen ? findNode(screen.root.children, id) : undefined;
                if (!selected) return null;
                return (
                  <div className="multi-selection-row" key={id}>
                    <strong>{nodeKindLabel(selected.kind)}</strong>
                    <span>{nodeSummary(selected)}</span>
                  </div>
                );
              })}
            </div>
            <p className="inspector-help">
              {canGroupSelection ? '同じ階層の要素を、意味構造を保ったままGroupにまとめられます。' : 'グループ化するには、同じ階層の要素だけを選択してください。'}
            </p>
            <div className="multi-selection-controls">
              <div className="section-label">一括スタイル</div>
              <Field label="幅">
                <select
                  value={commonStyleValue(selectedNodes, (selected) => selected.frameWidth ?? 'fit')}
                  onChange={(event) => {
                    if (event.target.value === '__mixed') return;
                    updateSelectedNodes({ frameWidth: event.target.value as FrameWidth });
                  }}
                >
                  <option value="__mixed" disabled>複数の値</option>
                  <option value="fit">内容に合わせる</option>
                  <option value="max">最大幅</option>
                </select>
              </Field>
              <Field label="背景">
                <select
                  value={commonStyleValue(selectedNodes, (selected) => selected.background ?? 'none')}
                  onChange={(event) => {
                    if (event.target.value === '__mixed') return;
                    updateSelectedNodes({ background: event.target.value as BackgroundStyle });
                  }}
                >
                  <option value="__mixed" disabled>複数の値</option>
                  <option value="none">なし</option>
                  <option value="secondary">セカンダリ</option>
                  <option value="tertiary">ターシャリ</option>
                  <option value="accent">アクセント</option>
                  <option value="material">Material</option>
                </select>
              </Field>
              <Field label="余白">
                <div className="input-with-unit">
                  <DraftInput
                    key={`multi-padding-${selectedNodeIds.join('-')}-${commonNumberValue(selectedNodes, (selected) => selected.padding ?? 0) ?? 'mixed'}`}
                    type="number"
                    min="0"
                    max="128"
                    value={commonNumberValue(selectedNodes, (selected) => selected.padding ?? 0) ?? ''}
                    placeholder="複数"
                    onCommit={(value) => updateSelectedNodes({ padding: value.trim() ? numericValue(value, 0, 0, 128) : undefined })}
                  />
                  <span>pt</span>
                </div>
              </Field>
              <Field label="Liquid Glass">
                <select
                  value={commonStyleValue(selectedNodes, (selected) => selected.glass ?? 'none')}
                  onChange={(event) => {
                    if (event.target.value === '__mixed') return;
                    const glass = event.target.value === 'none' ? undefined : event.target.value as GlassStyle;
                    updateSelectedNodes({
                      glass,
                      ...(glass ? { buttonStyle: undefined } : {}),
                      ...(glass ? {} : { glassInteractive: undefined, glassTint: undefined, glassShape: undefined }),
                    } as Partial<CanvasNode>);
                  }}
                >
                  <option value="__mixed" disabled>複数の値</option>
                  <option value="none">標準</option>
                  <option value="regular">レギュラー</option>
                  <option value="clear">クリア</option>
                  <option value="prominent">プロミネント</option>
                </select>
              </Field>
              <Field label="影">
                <select
                  value={commonStyleValue(selectedNodes, (selected) => selected.shadow ?? 'none')}
                  onChange={(event) => {
                    if (event.target.value === '__mixed') return;
                    updateSelectedNodes({ shadow: event.target.value as ShadowStyle });
                  }}
                >
                  <option value="__mixed" disabled>複数の値</option>
                  <option value="none">なし</option>
                  <option value="subtle">弱い</option>
                  <option value="medium">中程度</option>
                </select>
              </Field>
            </div>
            <button className="secondary-action-button" type="button" onClick={groupSelectedNodes} disabled={!canGroupSelection}>Groupにまとめる（⌘G / Ctrl+G）</button>
            <button className="delete-button" type="button" onClick={deleteSelectedNode}>選択した要素を削除</button>
          </section>
        </div>
      ) : !node ? (
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="section-label">プロジェクト</div>
            <Field label="名前">
              <DraftInput key={`document-name-${document.name}`} value={document.name} onCommit={updateDocumentName} />
            </Field>
          </section>
          <section className="inspector-section">
            <div className="section-label">画面</div>
            {screen && (
              <>
                <Field label="名前">
                  <DraftInput key={`${screen.id}-name-${screen.name}`} value={screen.name} onCommit={(value) => updateActiveScreen({ name: value })} />
                </Field>
                <Field label="タイトル">
                  <DraftInput key={`${screen.id}-navigation-${screen.navigationTitle}`} value={screen.navigationTitle} onCommit={(value) => updateActiveScreen({ navigationTitle: value })} />
                </Field>
                <Field label="画面メモ">
                  <DraftTextarea key={`${screen.id}-notes-${screen.notes ?? ''}`} value={screen.notes ?? ''} onCommit={(value) => updateActiveScreen({ notes: value.trim() || undefined })} />
                </Field>
                <Field label="タイトル表示">
                  <select
                    value={screen.navigationTitleDisplayMode ?? 'automatic'}
                    onChange={(event) => updateActiveScreen({ navigationTitleDisplayMode: event.target.value as NavigationTitleDisplayMode })}
                  >
                    <option value="automatic">自動</option>
                    <option value="large">大きく表示</option>
                    <option value="inline">インライン</option>
                  </select>
                </Field>
              </>
            )}
          </section>
          <section className="inspector-section">
            <div className="section-label">外観</div>
            <Field label="表示モード">
              <select value={document.appearance.colorScheme} onChange={(event) => updateAppearance({ colorScheme: event.target.value as typeof document.appearance.colorScheme })}>
                <option value="system">システム</option>
                <option value="light">ライト</option>
                <option value="dark">ダーク</option>
              </select>
            </Field>
            <Field label="アクセント">
              <select value={document.appearance.accentColor} onChange={(event) => updateAppearance({ accentColor: event.target.value as typeof document.appearance.accentColor, ...(event.target.value === 'custom' ? {} : { accentHex: undefined }) })}>
                <option value="blue">ブルー</option>
                <option value="purple">パープル</option>
                <option value="pink">ピンク</option>
                <option value="orange">オレンジ</option>
                <option value="green">グリーン</option>
                <option value="custom">カスタム</option>
              </select>
            </Field>
            {document.appearance.accentColor === 'custom' && (
              <Field label="アクセント色">
                <input
                  type="color"
                  value={document.appearance.accentHex ?? '#007AFF'}
                  onChange={(event) => updateAppearance({ accentColor: 'custom', accentHex: event.target.value })}
                  aria-label="カスタムアクセント色"
                />
              </Field>
            )}
            <Field label="文字デザイン">
              <select value={document.appearance.fontDesign ?? 'default'} onChange={(event) => updateAppearance({ fontDesign: event.target.value as FontDesign })}>
                <option value="default">システム</option>
                <option value="rounded">ラウンド</option>
                <option value="serif">セリフ</option>
                <option value="monospaced">等幅</option>
              </select>
            </Field>
          </section>
          {screen && (
            <section className="inspector-section">
              <div className="section-label">ナビゲーションバー</div>
              {(screen.toolbarItems ?? []).map((item) => (
                <ToolbarItemEditor
                  item={item}
                  screenId={screen.id}
                  screens={document.screens}
                  key={item.id}
                  onChange={(patch) => updateActiveScreen({
                    toolbarItems: (screen.toolbarItems ?? []).map((candidate) => candidate.id === item.id ? { ...candidate, ...patch } : candidate),
                  })}
                  onRemove={() => updateActiveScreen({ toolbarItems: (screen.toolbarItems ?? []).filter((candidate) => candidate.id !== item.id) })}
                />
              ))}
              <button
                className="secondary-action-button toolbar-add-button"
                type="button"
                onClick={() => updateActiveScreen({
                  toolbarItems: [
                    ...(screen.toolbarItems ?? []),
                    { id: createId('toolbar'), title: 'アクション', systemName: 'ellipsis.circle', placement: 'topBarTrailing', role: 'normal' },
                  ],
                })}
              >
                ＋ バー項目を追加
              </button>
            </section>
          )}
          {screen && (
            <section className="inspector-section">
              <div className="section-label">TabViewのタブバー</div>
              {(screen.tabBarItems ?? []).map((item) => (
                <ToolbarItemEditor
                  item={item}
                  screenId={screen.id}
                  screens={document.screens}
                  fixedPlacement="bottomBar"
                  key={item.id}
                  onChange={(patch) => updateActiveScreen({
                    tabBarItems: (screen.tabBarItems ?? []).map((candidate) => candidate.id === item.id ? { ...candidate, ...patch } : candidate),
                  })}
                  onRemove={() => updateActiveScreen({ tabBarItems: (screen.tabBarItems ?? []).filter((candidate) => candidate.id !== item.id) })}
                />
              ))}
              <button
                className="secondary-action-button toolbar-add-button"
                type="button"
                onClick={() => updateActiveScreen({
                  tabBarItems: [
                    ...(screen.tabBarItems ?? []),
                    {
                      id: createId('tab'),
                      title: '新しいタブ',
                      systemName: 'square',
                      placement: 'bottomBar',
                      selected: (screen.tabBarItems ?? []).length === 0,
                      destinationScreenId: document.screens.find((candidate) => candidate.id !== screen.id)?.id,
                    },
                  ],
                })}
              >
                ＋ タブを追加
              </button>
            </section>
          )}
          {screen && (
            <section className="inspector-section">
              <div className="section-label">スワイプ遷移</div>
              {swipeDirections.map(({ key, label }) => (
                <Field label={label} key={key}>
                  <select
                    value={screen.swipe?.[key] ?? ''}
                    onChange={(event) => updateActiveScreen({ swipe: updateSwipe(screen.swipe, key, event.target.value) })}
                  >
                    <option value="">なし</option>
                    {document.screens.filter((candidate) => candidate.id !== screen.id).map((candidate) => (
                      <option value={candidate.id} key={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </section>
          )}
          {screenIssues.length > 0 && (
            <section className={`inspector-section ${screenWarnings.length > 0 ? 'warnings-section' : 'notes-section'}`}>
              <div className="section-label">HIGチェック{screenWarnings.length > 0 ? ` · ${screenWarnings.length}件` : ''}</div>
              {screenIssues.map((issue) => {
                const issueClass = issue.severity === 'warning' ? 'warning-row' : 'note-row';
                return issue.nodeId === screen?.root.id ? (
                  <div className={issueClass} key={`${issue.code}-${issue.nodeId}`}>{issue.message}</div>
                ) : (
                  <button
                    className={`${issueClass} hig-issue-button`}
                    key={`${issue.code}-${issue.nodeId}`}
                    type="button"
                    onClick={() => selectNode(issue.nodeId)}
                  >
                    {issue.message}
                  </button>
                );
              })}
            </section>
          )}
          <div className="inspector-empty">キャンバスまたは構造ツリーから要素を選択すると、プロパティを編集できます。</div>
        </div>
      ) : (
        <div className="inspector-scroll">
          <section className="inspector-section">
            <div className="inspector-kind">{nodeKindLabel(node.kind)}</div>
            <Field label="実装メモ">
              <DraftTextarea key={`${node.id}-notes-${node.notes ?? ''}`} value={node.notes ?? ''} onCommit={(value) => updateSelectedNode({ notes: value.trim() || undefined } as Partial<CanvasNode>)} />
            </Field>
            <Field label="Liquid Glass">
              <select
                value={node.glass ?? 'none'}
                onChange={(event) => {
                  const glass = event.target.value === 'none' ? undefined : event.target.value as GlassStyle;
                  updateSelectedNode({
                    glass,
                    ...(glass ? { buttonStyle: undefined } : {}),
                    ...(glass ? {} : { glassInteractive: undefined, glassTint: undefined, glassShape: undefined }),
                  } as Partial<CanvasNode>);
                }}
              >
                <option value="none">標準</option>
                <option value="regular">レギュラー</option>
                <option value="clear">クリア</option>
                <option value="prominent">プロミネント</option>
              </select>
            </Field>
            {node.glass && (
              <>
                <Field label="インタラクティブ">
                  <input
                    className="toggle-input"
                    type="checkbox"
                    checked={node.glassInteractive ?? false}
                    onChange={(event) => updateSelectedNode({ glassInteractive: event.target.checked } as Partial<CanvasNode>)}
                  />
                </Field>
                <Field label="Tint">
                  <select
                    value={node.glassTint ?? 'none'}
                    onChange={(event) => updateSelectedNode({ glassTint: event.target.value === 'none' ? undefined : event.target.value as AccentColor } as Partial<CanvasNode>)}
                  >
                    <option value="none">なし</option>
                    <option value="blue">ブルー</option>
                    <option value="purple">パープル</option>
                    <option value="pink">ピンク</option>
                    <option value="orange">オレンジ</option>
                    <option value="green">グリーン</option>
                  </select>
                </Field>
                {node.kind !== 'button' && (
                  <Field label="形状">
                    <select
                      value={node.glassShape ?? 'automatic'}
                      onChange={(event) => updateSelectedNode({ glassShape: event.target.value as GlassShape } as Partial<CanvasNode>)}
                    >
                      <option value="automatic">自動</option>
                      <option value="capsule">カプセル</option>
                      <option value="rounded">角丸の矩形</option>
                      <option value="circle">円形</option>
                    </select>
                  </Field>
                )}
              </>
            )}
            {'text' in node && node.kind === 'text' && (
              <Field label="テキスト">
                <DraftInput key={`${node.id}-text-${node.text}`} value={node.text} onCommit={(value) => updateSelectedNode({ text: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {'label' in node && typeof node.label === 'string' && (
              <Field label="ラベル">
                <DraftInput key={`${node.id}-label-${node.label}`} value={node.label} onCommit={(value) => updateSelectedNode({ label: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {parent?.kind === 'tabview' && (
              <>
                <Field label="タブ名">
                  <DraftInput
                    key={`${node.id}-tab-title-${node.tabTitle ?? ''}`}
                    value={node.tabTitle ?? defaultTabTitle(node)}
                    onCommit={(value) => updateSelectedNode({ tabTitle: value.trim() || undefined } as Partial<CanvasNode>)}
                  />
                </Field>
                <Field label="タブSF Symbol">
                  <SymbolInput
                    key={`${node.id}-tab-symbol-${node.tabSystemName ?? ''}`}
                    value={node.tabSystemName ?? defaultTabSystemName(node)}
                    onCommit={(value) => updateSelectedNode({ tabSystemName: value.trim() || undefined } as Partial<CanvasNode>)}
                  />
                </Field>
              </>
            )}
            {node.kind === 'image' && (
              <>
                <Field label="画像の種類">
                  <select
                    value={node.source ?? 'symbol'}
                    onChange={(event) => updateSelectedNode({ source: event.target.value === 'symbol' ? undefined : event.target.value as ImageSource } as Partial<CanvasNode>)}
                  >
                    <option value="symbol">SF Symbol</option>
                    <option value="asset">アセット名</option>
                    <option value="remote">リモートURL</option>
                  </select>
                </Field>
                <Field label={node.source === 'remote' ? '画像URL' : node.source === 'asset' ? 'アセット名' : 'SF Symbol'}>
                  {node.source === 'symbol' || node.source === undefined
                    ? <SymbolInput key={`${node.id}-symbol-${node.systemName}`} value={node.systemName} onCommit={(value) => updateSelectedNode({ systemName: value } as Partial<CanvasNode>)} />
                    : <DraftInput key={`${node.id}-image-source-${node.systemName}`} value={node.systemName} placeholder={node.source === 'remote' ? 'https://example.com/image.png' : 'ImageAsset'} onCommit={(value) => updateSelectedNode({ systemName: value } as Partial<CanvasNode>)} />}
                </Field>
                <Field label="アクセシビリティラベル">
                  <DraftInput key={`${node.id}-a11y-${node.accessibilityLabel}`} value={node.accessibilityLabel} onCommit={(value) => updateSelectedNode({ accessibilityLabel: value } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'label' && (
              <>
                <Field label="タイトル">
                  <DraftInput key={`${node.id}-title-${node.title}`} value={node.title} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="SF Symbol">
                  <SymbolInput key={`${node.id}-symbol-${node.systemName}`} value={node.systemName} onCommit={(value) => updateSelectedNode({ systemName: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="アクセシビリティラベル">
                  <DraftInput key={`${node.id}-label-a11y-${node.accessibilityLabel}`} value={node.accessibilityLabel} onCommit={(value) => updateSelectedNode({ accessibilityLabel: value } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'link' && (
              <Field label="URL">
                <DraftInput key={`${node.id}-url-${node.url}`} value={node.url} onCommit={(value) => updateSelectedNode({ url: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'content-unavailable' && (
              <>
                <Field label="タイトル">
                  <DraftInput key={`${node.id}-empty-title-${node.title}`} value={node.title} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="SF Symbol">
                  <SymbolInput key={`${node.id}-empty-symbol-${node.systemName}`} value={node.systemName} onCommit={(value) => updateSelectedNode({ systemName: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="説明">
                  <DraftInput key={`${node.id}-empty-description-${node.description}`} value={node.description} onCommit={(value) => updateSelectedNode({ description: value } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'colorpicker' && (
              <Field label="色">
                <input
                  type="color"
                  value={node.color}
                  onChange={(event) => updateSelectedNode({ color: event.target.value } as Partial<CanvasNode>)}
                />
              </Field>
            )}
            {node.kind === 'text' && (
              <>
                <Field label="テキストスタイル">
                  <select
                    value={node.textStyle ?? 'custom'}
                    onChange={(event) => updateSelectedNode({ textStyle: event.target.value as TextStyle } as Partial<CanvasNode>)}
                  >
                    <option value="custom">カスタムサイズ</option>
                    <option value="largeTitle">Large Title</option>
                    <option value="title">Title</option>
                    <option value="title2">Title 2</option>
                    <option value="title3">Title 3</option>
                    <option value="headline">Headline</option>
                    <option value="body">Body</option>
                    <option value="callout">Callout</option>
                    <option value="subheadline">Subheadline</option>
                    <option value="footnote">Footnote</option>
                    <option value="caption">Caption</option>
                    <option value="caption2">Caption 2</option>
                  </select>
                </Field>
                {(!node.textStyle || node.textStyle === 'custom') && (
                <Field label="サイズ">
                  <DraftInput key={`${node.id}-size-${node.fontSize}`} type="number" min="8" max="72" value={node.fontSize} onCommit={(value) => updateSelectedNode({ fontSize: numericValue(value, node.fontSize, 8, 72) } as Partial<CanvasNode>)} />
                </Field>
                )}
                <Field label="ウェイト">
                  <select value={node.weight} onChange={(event) => updateSelectedNode({ weight: event.target.value as typeof node.weight } as Partial<CanvasNode>)}>
                    <option value="regular">Regular</option>
                    <option value="medium">Medium</option>
                    <option value="semibold">Semibold</option>
                    <option value="bold">Bold</option>
                  </select>
                </Field>
                <Field label="書体デザイン">
                  <select
                    value={node.fontDesign ?? 'default'}
                    onChange={(event) => updateSelectedNode({ fontDesign: event.target.value as FontDesign } as Partial<CanvasNode>)}
                  >
                    <option value="default">システム</option>
                    <option value="rounded">Rounded</option>
                    <option value="serif">Serif</option>
                    <option value="monospaced">Monospaced</option>
                  </select>
                </Field>
                <Field label="複数行の整列">
                  <select
                    value={node.textAlignment ?? 'leading'}
                    onChange={(event) => {
                      const textAlignment = event.target.value as TextAlignment;
                      updateSelectedNode({ textAlignment: textAlignment === 'leading' ? undefined : textAlignment } as Partial<CanvasNode>);
                    }}
                  >
                    <option value="leading">左寄せ</option>
                    <option value="center">中央</option>
                    <option value="trailing">右寄せ</option>
                  </select>
                </Field>
                <Field label="最大行数">
                  <DraftInput
                    key={`${node.id}-line-limit-${node.lineLimit ?? 'none'}`}
                    type="number"
                    min="1"
                    max="20"
                    value={node.lineLimit ?? ''}
                    placeholder="制限なし"
                    onCommit={(value) => updateSelectedNode({ lineLimit: value.trim() ? Math.round(numericValue(value, node.lineLimit ?? 1, 1, 20)) : undefined } as Partial<CanvasNode>)}
                  />
                </Field>
              </>
            )}
            {(node.kind === 'button' || node.kind === 'alert' || node.kind === 'confirmation-dialog' || node.kind === 'toggle' || node.kind === 'textfield' || node.kind === 'searchfield' || node.kind === 'securefield' || node.kind === 'texteditor' || node.kind === 'picker' || node.kind === 'colorpicker' || node.kind === 'slider' || node.kind === 'stepper' || node.kind === 'menu' || node.kind === 'navigation-link' || node.kind === 'link' || node.kind === 'datepicker' || node.kind === 'gauge') && (
              <Field label="最小高さ">
                <div className="input-with-unit"><DraftInput key={`${node.id}-height-${node.minHeight}`} type="number" min="20" max="120" value={node.minHeight} onCommit={(value) => updateSelectedNode({ minHeight: numericValue(value, node.minHeight, 20, 120) } as Partial<CanvasNode>)} /><span>pt</span></div>
              </Field>
            )}
            {(node.kind === 'toggle' || node.kind === 'textfield' || node.kind === 'searchfield' || node.kind === 'securefield' || node.kind === 'texteditor' || node.kind === 'picker' || node.kind === 'colorpicker' || node.kind === 'slider' || node.kind === 'stepper' || node.kind === 'datepicker') && (
              <Field label="Binding">
                <DraftInput key={`${node.id}-binding-${node.binding}`} value={node.binding} onCommit={(value) => updateSelectedNode({ binding: value.replace(/\s+/g, '') } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'toggle' && (
              <Field label="初期状態">
                <input className="toggle-input" type="checkbox" checked={node.isOn ?? false} onChange={(event) => updateSelectedNode({ isOn: event.target.checked } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'searchfield' && (
              <Field label="プレースホルダー">
                <DraftInput key={`${node.id}-prompt-${node.prompt}`} value={node.prompt} onCommit={(value) => updateSelectedNode({ prompt: value } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'picker' && (
              <Field label="選択肢">
                <DraftInput
                  key={`${node.id}-options-${node.options.join(',')}`}
                  value={node.options.join(', ')}
                  onCommit={(value) => {
                    const options = parseOptions(value, node.options);
                    updateSelectedNode({ options, initialOption: options.includes(node.initialOption ?? '') ? node.initialOption : options[0] } as Partial<CanvasNode>);
                  }}
                />
              </Field>
            )}
            {node.kind === 'picker' && (
              <Field label="初期選択">
                <select value={node.initialOption ?? node.options[0] ?? ''} onChange={(event) => updateSelectedNode({ initialOption: event.target.value } as Partial<CanvasNode>)}>
                  {node.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
            )}
            {node.kind === 'menu' && (
              <Field label="メニュー項目">
                <DraftInput
                  key={`${node.id}-options-${node.options.join(',')}`}
                  value={node.options.join(', ')}
                  onCommit={(value) => updateSelectedNode({ options: parseOptions(value, node.options) } as Partial<CanvasNode>)}
                />
              </Field>
            )}
            {(node.kind === 'slider' || node.kind === 'stepper') && (
              <>
                <Field label="現在値">
                  <DraftInput
                    key={`${node.id}-value-${node.value}`}
                    type="number"
                    value={node.value}
                    onCommit={(value) => updateSelectedNode({ value: numericValue(value, node.value, node.minimum, node.maximum) } as Partial<CanvasNode>)}
                  />
                </Field>
                <Field label="最小値">
                  <DraftInput
                    key={`${node.id}-minimum-${node.minimum}`}
                    type="number"
                    value={node.minimum}
                    onCommit={(value) => {
                      const minimum = numericValue(value, node.minimum, -100000, node.maximum - node.step);
                      updateSelectedNode({ minimum, value: Math.max(minimum, node.value) } as Partial<CanvasNode>);
                    }}
                  />
                </Field>
                <Field label="最大値">
                  <DraftInput
                    key={`${node.id}-maximum-${node.maximum}`}
                    type="number"
                    value={node.maximum}
                    onCommit={(value) => {
                      const maximum = numericValue(value, node.maximum, node.minimum + node.step, 100000);
                      updateSelectedNode({ maximum, value: Math.min(maximum, node.value) } as Partial<CanvasNode>);
                    }}
                  />
                </Field>
                <Field label="刻み幅">
                  <DraftInput
                    key={`${node.id}-step-${node.step}`}
                    type="number"
                    min="0.01"
                    value={node.step}
                    onCommit={(value) => updateSelectedNode({ step: numericValue(value, node.step, 0.01, node.maximum - node.minimum) } as Partial<CanvasNode>)}
                  />
                </Field>
              </>
            )}
            {node.kind === 'progress' && (
              <>
                <Field label="表示形式">
                  <select value={node.style ?? 'linear'} onChange={(event) => updateSelectedNode({ style: event.target.value as typeof node.style } as Partial<CanvasNode>)}>
                    <option value="linear">横方向</option>
                    <option value="circular">円形</option>
                  </select>
                </Field>
                <Field label="不確定">
                  <input className="toggle-input" type="checkbox" checked={node.indeterminate ?? false} onChange={(event) => updateSelectedNode({ indeterminate: event.target.checked } as Partial<CanvasNode>)} />
                </Field>
                <Field label="波形">
                  <input className="toggle-input" type="checkbox" checked={node.wavy ?? false} onChange={(event) => updateSelectedNode({ wavy: event.target.checked || undefined } as Partial<CanvasNode>)} />
                </Field>
                <Field label="トラック太さ">
                  <div className="input-with-unit">
                    <DraftInput key={`${node.id}-track-thickness-${node.trackThickness ?? 4}`} type="number" min="2" max="16" step="1" value={node.trackThickness ?? 4} onCommit={(value) => updateSelectedNode({ trackThickness: numericValue(value, node.trackThickness ?? 4, 2, 16) } as Partial<CanvasNode>)} />
                    <span>pt</span>
                  </div>
                </Field>
                <Field label="進捗">
                  <div className="input-with-unit">
                    <DraftInput
                      key={`${node.id}-progress-${node.value}`}
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(node.value * 100)}
                      onCommit={(value) => updateSelectedNode({ value: numericValue(value, node.value * 100, 0, 100) / 100 } as Partial<CanvasNode>)}
                    />
                    <span>%</span>
                  </div>
                </Field>
              </>
            )}
            {node.kind === 'gauge' && (
              <>
                <Field label="現在値">
                  <DraftInput key={`${node.id}-gauge-value-${node.value}`} type="number" value={node.value} onCommit={(value) => updateSelectedNode({ value: numericValue(value, node.value, node.minimum, node.maximum) } as Partial<CanvasNode>)} />
                </Field>
                <Field label="最小値">
                  <DraftInput key={`${node.id}-gauge-minimum-${node.minimum}`} type="number" value={node.minimum} onCommit={(value) => updateSelectedNode({ minimum: numericValue(value, node.minimum, -100000, node.maximum - 0.01), value: Math.max(numericValue(value, node.minimum, -100000, node.maximum - 0.01), node.value) } as Partial<CanvasNode>)} />
                </Field>
                <Field label="最大値">
                  <DraftInput key={`${node.id}-gauge-maximum-${node.maximum}`} type="number" value={node.maximum} onCommit={(value) => updateSelectedNode({ maximum: numericValue(value, node.maximum, node.minimum + 0.01, 100000), value: Math.min(numericValue(value, node.maximum, node.minimum + 0.01, 100000), node.value) } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {node.kind === 'button' && (
              <>
                <Field label="SF Symbol">
                  <SymbolInput key={`${node.id}-button-symbol-${node.systemName ?? ''}`} value={node.systemName ?? ''} onCommit={(value) => updateSelectedNode({ systemName: value.trim() || undefined } as Partial<CanvasNode>)} />
                </Field>
                <Field label="VoiceOverラベル">
                  <DraftInput
                    key={`${node.id}-button-a11y-${node.accessibilityLabel ?? ''}`}
                    value={node.accessibilityLabel ?? ''}
                    placeholder="表示ラベルを使う"
                    onCommit={(value) => updateSelectedNode({ accessibilityLabel: value.trim() || undefined } as Partial<CanvasNode>)}
                  />
                </Field>
                <Field label="ボタン動作">
                  <select
                    value={node.toggle ? 'toggle' : 'action'}
                    onChange={(event) => updateSelectedNode(event.target.value === 'toggle'
                      ? {
                          destinationScreenId: undefined,
                          toggle: node.toggle ?? { isOn: false, onLabel: `${node.label}（オン）` },
                        }
                      : { toggle: undefined } as Partial<CanvasNode>)}
                  >
                    <option value="action">アクション</option>
                    <option value="toggle">オン／オフ切替</option>
                  </select>
                </Field>
                {node.toggle && (
                  <>
                    <Field label="オン時ラベル">
                      <DraftInput
                        key={`${node.id}-toggle-label-${node.toggle.onLabel}`}
                        value={node.toggle.onLabel}
                        onCommit={(value) => updateSelectedNode({ toggle: { ...node.toggle, onLabel: value } } as Partial<CanvasNode>)}
                      />
                    </Field>
                    <Field label="オン時SF Symbol">
                      <SymbolInput
                        key={`${node.id}-toggle-symbol-${node.toggle.onSystemName ?? ''}`}
                        value={node.toggle.onSystemName ?? ''}
                        onCommit={(value) => updateSelectedNode({ toggle: { ...node.toggle, onSystemName: value.trim() || undefined } } as Partial<CanvasNode>)}
                      />
                    </Field>
                    <Field label="オン時スタイル">
                      <select
                        value={node.toggle.onButtonStyle ?? 'automatic'}
                        onChange={(event) => updateSelectedNode({ toggle: { ...node.toggle, onButtonStyle: event.target.value === 'automatic' ? undefined : event.target.value as typeof node.buttonStyle } } as Partial<CanvasNode>)}
                      >
                        <option value="automatic">オフ時と同じ</option>
                        <option value="plain">Plain</option>
                        <option value="bordered">Bordered</option>
                        <option value="borderedProminent">Bordered Prominent</option>
                      </select>
                    </Field>
                    <Field label="初期状態">
                      <input
                        className="toggle-input"
                        type="checkbox"
                        checked={node.toggle.isOn}
                        onChange={(event) => updateSelectedNode({ toggle: { ...node.toggle, isOn: event.target.checked } } as Partial<CanvasNode>)}
                      />
                    </Field>
                  </>
                )}
                <Field label="ボタンスタイル">
                  <select
                    value={node.buttonStyle ?? 'automatic'}
                    onChange={(event) => {
                      const buttonStyle = event.target.value as typeof node.buttonStyle;
                      updateSelectedNode({
                        buttonStyle: buttonStyle === 'automatic' ? undefined : buttonStyle,
                        ...(buttonStyle === 'automatic' ? {} : { glass: undefined, glassInteractive: undefined, glassTint: undefined, glassShape: undefined }),
                      } as Partial<CanvasNode>);
                    }}
                  >
                    <option value="automatic">自動</option>
                    <option value="plain">Plain</option>
                    <option value="bordered">Bordered</option>
                    <option value="borderedProminent">Bordered Prominent</option>
                  </select>
                </Field>
                <Field label="役割">
                  <select value={node.role} onChange={(event) => updateSelectedNode({ role: event.target.value as typeof node.role } as Partial<CanvasNode>)}>
                    <option value="normal">標準</option>
                    <option value="destructive">破壊的</option>
                    <option value="cancel">キャンセル</option>
                  </select>
                </Field>
                {!node.toggle && <Field label="タップ時の遷移">
                  <select
                    value={node.destinationScreenId ?? ''}
                    onChange={(event) => updateSelectedNode({ destinationScreenId: event.target.value || undefined } as Partial<CanvasNode>)}
                  >
                    <option value="">なし（アクション）</option>
                    {document.screens.filter((candidate) => candidate.id !== screen?.id).map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                </Field>}
              </>
            )}
            {node.kind === 'alert' && (
              <>
                <Field label="タイトル">
                  <DraftInput key={`${node.id}-alert-title-${node.title}`} value={node.title} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="メッセージ">
                  <DraftTextarea key={`${node.id}-alert-message-${node.message}`} value={node.message} onCommit={(value) => updateSelectedNode({ message: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="主要ボタン">
                  <DraftInput key={`${node.id}-alert-primary-${node.primaryButton}`} value={node.primaryButton} onCommit={(value) => updateSelectedNode({ primaryButton: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="主要ボタンの役割">
                  <select value={node.primaryRole} onChange={(event) => updateSelectedNode({ primaryRole: event.target.value as typeof node.primaryRole } as Partial<CanvasNode>)}>
                    <option value="normal">標準</option>
                    <option value="destructive">破壊的</option>
                    <option value="cancel">キャンセル</option>
                  </select>
                </Field>
                <Field label="副ボタン">
                  <DraftInput
                    key={`${node.id}-alert-secondary-${node.secondaryButton ?? ''}`}
                    value={node.secondaryButton ?? ''}
                    placeholder="なし"
                    onCommit={(value) => {
                      const secondaryButton = value.trim();
                      updateSelectedNode(secondaryButton
                        ? { secondaryButton } as Partial<CanvasNode>
                        : { secondaryButton: undefined, secondaryRole: undefined } as Partial<CanvasNode>);
                    }}
                  />
                </Field>
                <Field label="副ボタンの役割">
                  <select
                    value={node.secondaryRole ?? 'cancel'}
                    disabled={!node.secondaryButton}
                    onChange={(event) => updateSelectedNode({ secondaryRole: event.target.value as typeof node.secondaryRole } as Partial<CanvasNode>)}
                  >
                    <option value="normal">標準</option>
                    <option value="destructive">破壊的</option>
                    <option value="cancel">キャンセル</option>
                  </select>
                </Field>
              </>
            )}
            {node.kind === 'confirmation-dialog' && (
              <>
                <Field label="タイトル">
                  <DraftInput key={`${node.id}-confirmation-title-${node.title}`} value={node.title} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="メッセージ">
                  <DraftTextarea key={`${node.id}-confirmation-message-${node.message}`} value={node.message} onCommit={(value) => updateSelectedNode({ message: value } as Partial<CanvasNode>)} />
                </Field>
                <Field label="選択肢">
                  <DraftInput
                    key={`${node.id}-confirmation-options-${node.options.join(',')}`}
                    value={node.options.join(', ')}
                    onCommit={(value) => updateSelectedNode({ options: parseOptions(value, node.options) } as Partial<CanvasNode>)}
                  />
                </Field>
                <Field label="キャンセル">
                  <DraftInput
                    key={`${node.id}-confirmation-cancel-${node.cancelButton ?? ''}`}
                    value={node.cancelButton ?? ''}
                    placeholder="なし"
                    onCommit={(value) => updateSelectedNode({ cancelButton: value.trim() || undefined } as Partial<CanvasNode>)}
                  />
                </Field>
              </>
            )}
            {node.kind === 'navigation-link' && (
              <Field label="遷移先">
                <select value={node.destinationScreenId} onChange={(event) => updateSelectedNode({ destinationScreenId: event.target.value } as Partial<CanvasNode>)}>
                  <option value="">画面を選択</option>
                  {document.screens.filter((candidate) => candidate.id !== screen?.id).map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                  ))}
                </select>
              </Field>
            )}
            {(node.kind === 'section' || node.kind === 'disclosure-group' || node.kind === 'sheet' || node.kind === 'groupbox') && (
              <>
                <Field label="Sectionタイトル">
                  <DraftInput key={`${node.id}-title-${node.title ?? ''}`} value={node.title ?? ''} onCommit={(value) => updateSelectedNode({ title: value } as Partial<CanvasNode>)} />
                </Field>
                {node.kind === 'groupbox' && node.isBottomSheet !== undefined && (
                  <Field label="ボトムシートのハンドル">
                    <input className="toggle-input" type="checkbox" checked={node.isBottomSheet} onChange={(event) => updateSelectedNode({ isBottomSheet: event.target.checked } as Partial<CanvasNode>)} />
                  </Field>
                )}
              </>
            )}
            {node.kind === 'groupbox' && node.cardImagePosition !== undefined && (
              <>
                <Field label="カード画像の位置">
                  <select value={node.cardImagePosition} onChange={(event) => updateSelectedNode({ cardImagePosition: event.target.value as typeof node.cardImagePosition } as Partial<CanvasNode>)}>
                    <option value="top">上</option>
                    <option value="leading">左</option>
                    <option value="trailing">右</option>
                    <option value="background">背景</option>
                  </select>
                </Field>
                <Field label="画像なし">
                  <input className="toggle-input" type="checkbox" checked={node.cardNoImage ?? false} onChange={(event) => updateSelectedNode({ cardNoImage: event.target.checked } as Partial<CanvasNode>)} />
                </Field>
                <Field label="本文位置">
                  <select value={node.cardContentAlignment ?? 'start'} onChange={(event) => updateSelectedNode({ cardContentAlignment: event.target.value as typeof node.cardContentAlignment } as Partial<CanvasNode>)}>
                    <option value="start">上</option>
                    <option value="center">中央</option>
                    <option value="end">下</option>
                  </select>
                </Field>
                {node.cardImageSize !== undefined && <Field label="画像サイズ">
                  <div className="input-with-unit">
                    <DraftInput key={`${node.id}-card-image-size-${node.cardImageSize}`} type="number" min="1" max="1024" value={node.cardImageSize} onCommit={(value) => updateSelectedNode({ cardImageSize: numericValue(value, node.cardImageSize ?? 1, 1, 1024) } as Partial<CanvasNode>)} />
                    <span>dp</span>
                  </div>
                </Field>}
              </>
            )}
            {node.kind === 'tabview' && node.children.length > 0 && (
              <Field label="初期タブ">
                <select value={String(node.selectedIndex ?? 0)} onChange={(event) => updateSelectedNode({ selectedIndex: Number(event.target.value) } as Partial<CanvasNode>)}>
                  {node.children.map((child, index) => <option key={child.id} value={index}>{index + 1} · {defaultTabTitle(child)}</option>)}
                </select>
              </Field>
            )}
            {node.kind === 'navigation-split-view' && node.children[0]?.kind === 'list' && node.children[0].children.length > 0 && (
              <>
                <Field label="初期選択">
                  <select value={String(node.selectedIndex ?? 0)} onChange={(event) => updateSelectedNode({ selectedIndex: Number(event.target.value) } as Partial<CanvasNode>)}>
                    {node.children[0].children.map((child, index) => <option key={child.id} value={index}>{index + 1} · {defaultTabTitle(child)}</option>)}
                  </select>
                </Field>
                <Field label="Railを展開">
                  <input className="toggle-input" type="checkbox" checked={node.railExpanded ?? false} onChange={(event) => updateSelectedNode({ railExpanded: event.target.checked } as Partial<CanvasNode>)} />
                </Field>
                <Field label="モーダルRail">
                  <input className="toggle-input" type="checkbox" checked={node.railModal ?? false} onChange={(event) => updateSelectedNode({ railModal: event.target.checked } as Partial<CanvasNode>)} />
                </Field>
              </>
            )}
            {(node.kind === 'vstack' || node.kind === 'hstack' || node.kind === 'lazyvstack' || node.kind === 'lazyhstack' || node.kind === 'glass-container' || node.kind === 'lazyvgrid' || node.kind === 'lazyhgrid') && (
              <Field label="間隔">
                <DraftInput key={`${node.id}-spacing-${node.spacing ?? 0}`} type="number" min="0" max="64" value={node.spacing ?? 0} onCommit={(value) => updateSelectedNode({ spacing: numericValue(value, node.spacing ?? 0, 0, 64) } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'lazyvgrid' && (
              <Field label="列数">
                <DraftInput key={`${node.id}-columns-${node.columns ?? 2}`} type="number" min="1" max="8" value={node.columns ?? 2} onCommit={(value) => updateSelectedNode({ columns: Math.round(numericValue(value, node.columns ?? 2, 1, 8)) } as Partial<CanvasNode>)} />
              </Field>
            )}
            {node.kind === 'lazyhgrid' && (
              <Field label="行数">
                <DraftInput key={`${node.id}-rows-${node.rows ?? 2}`} type="number" min="1" max="8" value={node.rows ?? 2} onCommit={(value) => updateSelectedNode({ rows: Math.round(numericValue(value, node.rows ?? 2, 1, 8)) } as Partial<CanvasNode>)} />
              </Field>
            )}
            {(node.kind === 'vstack' || node.kind === 'lazyvstack') && (
              <Field label="横方向の整列">
                <select value={node.alignment ?? 'center'} onChange={(event) => updateSelectedNode({ alignment: event.target.value as StackAlignment } as Partial<CanvasNode>)}>
                  <option value="leading">左寄せ</option>
                  <option value="center">中央</option>
                  <option value="trailing">右寄せ</option>
                </select>
              </Field>
            )}
            {(node.kind === 'hstack' || node.kind === 'lazyhstack') && (
              <Field label="縦方向の整列">
                <select value={node.alignment ?? 'center'} onChange={(event) => updateSelectedNode({ alignment: event.target.value as StackAlignment } as Partial<CanvasNode>)}>
                  <option value="top">上寄せ</option>
                  <option value="center">中央</option>
                  <option value="bottom">下寄せ</option>
                </select>
              </Field>
            )}
            {node.kind !== 'divider' && (
              <Field label="パディング">
                <div className="input-with-unit">
                  <DraftInput key={`${node.id}-padding-${node.padding ?? 0}`} type="number" min="0" max="128" value={node.padding ?? 0} onCommit={(value) => {
                    const padding = numericValue(value, node.padding ?? 0, 0, 128);
                    updateSelectedNode({ padding: padding === 0 ? undefined : padding } as Partial<CanvasNode>);
                  }} />
                  <span>pt</span>
                </div>
              </Field>
            )}
          </section>

          <section className="inspector-section">
            <div className="section-label">スタイル</div>
            <Field label="幅">
              <select value={node.frameWidth ?? 'fit'} onChange={(event) => updateSelectedNode({ frameWidth: event.target.value as FrameWidth } as Partial<CanvasNode>)}>
                <option value="fit">内容に合わせる</option>
                <option value="max">最大幅</option>
              </select>
            </Field>
            <Field label="背景">
              <select value={node.background ?? 'none'} onChange={(event) => updateSelectedNode({ background: event.target.value as BackgroundStyle } as Partial<CanvasNode>)}>
                <option value="none">なし</option>
                <option value="secondary">セカンダリ</option>
                <option value="tertiary">ターシャリ</option>
                <option value="accent">アクセント</option>
                <option value="material">Material</option>
              </select>
            </Field>
            <Field label="角丸">
              <div className="input-with-unit">
                <DraftInput key={`${node.id}-radius-${node.cornerRadius ?? 0}`} type="number" min="0" max="64" value={node.cornerRadius ?? 0} onCommit={(value) => {
                  const radius = numericValue(value, node.cornerRadius ?? 0, 0, 64);
                  updateSelectedNode({ cornerRadius: radius === 0 ? undefined : radius } as Partial<CanvasNode>);
                }} />
                <span>pt</span>
              </div>
            </Field>
            <Field label="境界線">
              <input className="toggle-input" type="checkbox" checked={node.overlay ?? false} onChange={(event) => updateSelectedNode({ overlay: event.target.checked } as Partial<CanvasNode>)} />
            </Field>
            <Field label="影">
              <select value={node.shadow ?? 'none'} onChange={(event) => updateSelectedNode({ shadow: event.target.value as ShadowStyle } as Partial<CanvasNode>)}>
                <option value="none">なし</option>
                <option value="subtle">弱い</option>
                <option value="medium">中程度</option>
              </select>
            </Field>
          </section>

          {issues.length > 0 && (
            <section className={`inspector-section ${issues.some((issue) => issue.severity === 'warning') ? 'warnings-section' : 'notes-section'}`}>
              <div className="section-label">HIGチェック</div>
              {issues.map((issue) => <div className={issue.severity === 'warning' ? 'warning-row' : 'note-row'} key={`${issue.code}-${issue.nodeId}`}>{issue.message}</div>)}
            </section>
          )}

          <section className="inspector-section">
            <div className="section-label">順序</div>
            <div className="reorder-actions">
              <button className="secondary-action-button" type="button" onClick={() => moveSelectedNode('up')} disabled={!canMoveUp}>↑ 上へ</button>
              <button className="secondary-action-button" type="button" onClick={() => moveSelectedNode('down')} disabled={!canMoveDown}>↓ 下へ</button>
            </div>
            <button className="secondary-action-button" type="button" onClick={duplicateSelectedNode}>要素を複製</button>
            {node.kind === 'group' && <button className="secondary-action-button" type="button" onClick={ungroupSelectedNode}>Groupを解除（⌘⇧G / Ctrl+Shift+G）</button>}
            <button className="delete-button" type="button" onClick={deleteSelectedNode}>要素を削除</button>
          </section>
        </div>
      )}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function SymbolInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  return <DraftInput list="ioscanvas-sf-symbols" value={value} onCommit={onCommit} />;
}

function ToolbarItemEditor({
  item,
  screenId,
  screens,
  fixedPlacement,
  onChange,
  onRemove,
}: {
  item: ToolbarItem;
  screenId: string;
  screens: CanvasScreen[];
  fixedPlacement?: ToolbarPlacement;
  onChange: (patch: Partial<ToolbarItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="toolbar-item-editor">
      <div className="toolbar-item-editor-heading">
        <span>{toolbarPlacementLabel(item.placement)}</span>
        <button className="toolbar-item-remove" type="button" onClick={onRemove}>削除</button>
      </div>
      <Field label="タイトル">
        <DraftInput key={`${item.id}-title-${item.title}`} value={item.title} onCommit={(value) => onChange({ title: value })} />
      </Field>
      <Field label="SF Symbol">
        <SymbolInput key={`${item.id}-symbol-${item.systemName ?? ''}`} value={item.systemName ?? ''} onCommit={(value) => onChange({ systemName: value.trim() || undefined })} />
      </Field>
      {fixedPlacement ? (
        <Field label="位置"><span className="field-static-value">タブバー</span></Field>
      ) : (
        <Field label="位置">
          <select value={item.placement} onChange={(event) => onChange({ placement: event.target.value as ToolbarPlacement })}>
            <option value="topBarLeading">左上</option>
            <option value="topBarTrailing">右上</option>
            <option value="bottomBar">下部バー</option>
          </select>
        </Field>
      )}
      <Field label="役割">
        <select value={item.role ?? 'normal'} onChange={(event) => onChange({ role: event.target.value as ToolbarItem['role'] })}>
          <option value="normal">標準</option>
          <option value="destructive">破壊的</option>
          <option value="cancel">キャンセル</option>
        </select>
      </Field>
      {item.placement === 'bottomBar' && (
        <Field label="選択中">
          <input className="toggle-input" type="checkbox" checked={item.selected ?? false} onChange={(event) => onChange({ selected: event.target.checked })} />
        </Field>
      )}
      <Field label="遷移先">
        <select value={item.destinationScreenId ?? ''} onChange={(event) => onChange({ destinationScreenId: event.target.value || undefined })}>
          <option value="">なし（アクション）</option>
          {screens.filter((screen) => screen.id !== screenId).map((screen) => <option value={screen.id} key={screen.id}>{screen.name}</option>)}
        </select>
      </Field>
    </div>
  );
}

function toolbarPlacementLabel(placement: ToolbarPlacement): string {
  if (placement === 'topBarLeading') return '左上の項目';
  if (placement === 'bottomBar') return '下部バーの項目';
  return '右上の項目';
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

function DraftTextarea({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <textarea
      defaultValue={value}
      rows={3}
      onBlur={(event) => {
        if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
      }}
    />
  );
}

function numericValue(raw: string, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function parseOptions(raw: string, fallback: string[]): string[] {
  const options = raw.split(',').map((option) => option.trim()).filter(Boolean);
  return options.length > 0 ? options : fallback;
}

function nodeSummary(node: CanvasNode): string {
  if (node.kind === 'text') return node.text;
  if (typeof node.label === 'string' && node.label.trim()) return node.label;
  if ('title' in node && typeof node.title === 'string' && node.title.trim()) return node.title;
  return '';
}

function commonStyleValue(
  nodes: CanvasNode[],
  read: (node: CanvasNode) => string,
): string {
  const first = nodes[0];
  if (!first) return '__mixed';
  const value = read(first);
  return nodes.every((node) => read(node) === value) ? value : '__mixed';
}

function commonNumberValue(
  nodes: CanvasNode[],
  read: (node: CanvasNode) => number,
): number | null {
  const first = nodes[0];
  if (!first) return null;
  const value = read(first);
  return nodes.every((node) => read(node) === value) ? value : null;
}

function updateSwipe(
  current: Partial<Record<SwipeDirection, string>> | undefined,
  direction: SwipeDirection,
  destination: string,
): Partial<Record<SwipeDirection, string>> | undefined {
  const next = { ...current };
  if (destination) next[direction] = destination;
  else delete next[direction];
  return Object.keys(next).length > 0 ? next : undefined;
}

function defaultTabTitle(node: CanvasNode): string {
  if (node.kind === 'text') return node.text || 'タブ';
  if (node.kind === 'image') return node.accessibilityLabel || 'タブ';
  if ('title' in node && typeof node.title === 'string' && node.title.trim()) return node.title;
  if ('label' in node && typeof node.label === 'string' && node.label.trim()) return node.label;
  return 'タブ';
}

function defaultTabSystemName(node: CanvasNode): string {
  return node.kind === 'image' && node.systemName.trim() ? node.systemName : 'square';
}

function nodeKindLabel(kind: CanvasNode['kind']): string {
  switch (kind) {
    case 'vstack': return 'VStack';
    case 'hstack': return 'HStack';
    case 'lazyvstack': return 'LazyVStack';
    case 'lazyhstack': return 'LazyHStack';
    case 'zstack': return 'ZStack';
    case 'navigation-split-view': return 'NavigationSplitView';
    case 'glass-container': return 'GlassEffectContainer';
    case 'group': return 'Group';
    case 'tabview': return 'TabView';
    case 'disclosure-group': return 'DisclosureGroup';
    case 'sheet': return 'Sheet';
    case 'groupbox': return 'GroupBox';
    case 'lazyvgrid': return 'LazyVGrid';
    case 'lazyhgrid': return 'LazyHGrid';
    case 'scrollview': return 'ScrollView';
    case 'list': return 'List';
    case 'form': return 'Form';
    case 'section': return 'Section';
    case 'textfield': return 'TextField';
    case 'searchfield': return 'SearchField';
    case 'securefield': return 'SecureField';
    case 'texteditor': return 'TextEditor';
    case 'picker': return 'Picker';
    case 'colorpicker': return 'ColorPicker';
    case 'slider': return 'Slider';
    case 'stepper': return 'Stepper';
    case 'menu': return 'Menu';
    case 'progress': return 'ProgressView';
    case 'gauge': return 'Gauge';
    case 'content-unavailable': return 'ContentUnavailableView';
    case 'navigation-link': return 'NavigationLink';
    case 'label': return 'Label';
    case 'link': return 'Link';
    case 'datepicker': return 'DatePicker';
    case 'divider': return 'Divider';
    case 'spacer': return 'Spacer';
    case 'text': return 'Text';
    case 'button': return 'Button';
    case 'alert': return 'Alert';
    case 'confirmation-dialog': return 'ConfirmationDialog';
    case 'toggle': return 'Toggle';
    case 'image': return 'Image';
    case 'camera': return 'Camera';
    case 'map': return 'MapKit Map';
  }
}

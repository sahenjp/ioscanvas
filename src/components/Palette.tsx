import { useEffect, useState } from 'react';
import { decodeDragData, encodeDragData, findNode, findNodeLocation, isContainerNode, NODE_DRAG_MIME } from '../lib/nodes';
import { useEditorStore } from '../store/editor';
import type { CanvasNode, CanvasScreen, M3eInsertKind, M3ePresentationKind, M3eScreenPartKind, NodeKind, PatternId, SwipeDirection } from '../types/document';

const groups: { title: string; items: { kind: NodeKind; name: string; description: string }[] }[] = [
  {
    title: 'レイアウト',
    items: [
      { kind: 'vstack', name: 'VStack', description: '縦方向に並べる' },
      { kind: 'hstack', name: 'HStack', description: '横方向に並べる' },
      { kind: 'lazyvstack', name: 'LazyVStack', description: '遅延読み込みの縦レイアウト' },
      { kind: 'lazyhstack', name: 'LazyHStack', description: '遅延読み込みの横レイアウト' },
      { kind: 'zstack', name: 'ZStack', description: '重ねて配置する' },
      { kind: 'navigation-split-view', name: 'NavigationSplitView', description: 'サイドバーと詳細を分ける' },
      { kind: 'spacer', name: 'Spacer', description: '余白を作る' },
      { kind: 'divider', name: 'Divider', description: '区切り線' },
    ],
  },
  {
    title: 'コンテナ',
    items: [
      { kind: 'group', name: 'Group', description: '意味のあるグループ' },
      { kind: 'groupbox', name: 'GroupBox', description: '見出し付きの標準コンテナ' },
      { kind: 'lazyvgrid', name: 'LazyVGrid', description: '列に並べるグリッド' },
      { kind: 'lazyhgrid', name: 'LazyHGrid', description: '行に並べるグリッド' },
      { kind: 'tabview', name: 'TabView', description: 'タブ切り替え' },
      { kind: 'disclosure-group', name: 'DisclosureGroup', description: '折りたたみ項目' },
      { kind: 'sheet', name: 'Sheet', description: 'モーダル画面' },
      { kind: 'scrollview', name: 'ScrollView', description: 'スクロール領域' },
      { kind: 'list', name: 'List', description: '一覧表示' },
      { kind: 'form', name: 'Form', description: '設定フォーム' },
      { kind: 'section', name: 'Section', description: '項目をグループ化' },
    ],
  },
  {
    title: 'コンテンツ',
    items: [
      { kind: 'text', name: 'Text', description: 'テキストを表示' },
      { kind: 'image', name: 'Image', description: 'SF Symbolを表示' },
      { kind: 'camera', name: 'Camera', description: 'カメラ入力の操作' },
      { kind: 'map', name: 'MapKit Map', description: 'MapKitの地図を表示' },
      { kind: 'button', name: 'Button', description: 'アクション' },
      { kind: 'alert', name: 'Alert', description: '確認ダイアログを表示' },
      { kind: 'confirmation-dialog', name: 'ConfirmationDialog', description: '選択肢を表示' },
      { kind: 'navigation-link', name: 'NavigationLink', description: '別画面へ遷移' },
      { kind: 'label', name: 'Label', description: 'アイコン付きラベル' },
      { kind: 'link', name: 'Link', description: '外部リンク' },
    ],
  },
  {
    title: '操作',
    items: [
      { kind: 'toggle', name: 'Toggle', description: 'オン・オフを切替' },
      { kind: 'textfield', name: 'TextField', description: '文字を入力' },
      { kind: 'searchfield', name: 'SearchField', description: '検索語を入力' },
      { kind: 'securefield', name: 'SecureField', description: '機密文字列を入力' },
      { kind: 'texteditor', name: 'TextEditor', description: '複数行の文字を入力' },
      { kind: 'picker', name: 'Picker', description: '項目を選択' },
      { kind: 'colorpicker', name: 'ColorPicker', description: '色を選択' },
      { kind: 'slider', name: 'Slider', description: '範囲から値を選択' },
      { kind: 'stepper', name: 'Stepper', description: '値を増減' },
      { kind: 'menu', name: 'Menu', description: 'アクションを選択' },
      { kind: 'datepicker', name: 'DatePicker', description: '日付を選択' },
      { kind: 'progress', name: 'ProgressView', description: '進捗を表示' },
      { kind: 'gauge', name: 'Gauge', description: '値をダイヤルで表示' },
      { kind: 'content-unavailable', name: 'ContentUnavailableView', description: '空状態を表示' },
    ],
  },
];

const m3eParts: { kind: M3eInsertKind; name: string; description: string }[] = [
  { kind: 'button', name: 'Button', description: '標準アクション' },
  { kind: 'iconButton', name: 'Icon Button', description: 'アイコンだけの操作' },
  { kind: 'fab', name: 'FAB', description: '主要アクション' },
  { kind: 'extendedFab', name: 'Extended FAB', description: 'ラベル付き主要アクション' },
  { kind: 'splitButton', name: 'Split Button', description: '主操作とメニュー' },
  { kind: 'fabMenu', name: 'FAB Menu', description: '複数アクションの展開' },
  { kind: 'chip', name: 'Chip', description: '選択可能な短い項目' },
  { kind: 'toolbar', name: 'Toolbar', description: '操作アイコンの並び' },
  { kind: 'card', name: 'Card', description: '画像と情報のまとまり' },
  { kind: 'listItem', name: 'List Item', description: '一覧の1行' },
  { kind: 'dialog', name: 'Dialog', description: '確認を求める表示' },
  { kind: 'snackbar', name: 'Snackbar', description: '一時的な通知' },
  { kind: 'searchBar', name: 'Search Bar', description: '検索入力' },
  { kind: 'textField', name: 'Text Field', description: 'テキスト入力' },
  { kind: 'select', name: 'Dropdown', description: '選択入力' },
  { kind: 'switch', name: 'Switch', description: 'オン・オフ入力' },
  { kind: 'checkbox', name: 'Checkbox', description: '複数選択入力' },
  { kind: 'radio', name: 'Radio', description: '単一選択入力' },
  { kind: 'slider', name: 'Slider', description: '範囲入力' },
  { kind: 'text', name: 'Text', description: 'テキスト表示' },
  { kind: 'image', name: 'Image', description: '画像またはアイコン' },
  { kind: 'camera', name: 'Camera', description: 'カメラ入力' },
  { kind: 'map', name: 'Map', description: '地図表示' },
  { kind: 'badge', name: 'Badge', description: '通知数または印' },
  { kind: 'divider', name: 'Divider', description: '区切り線' },
  { kind: 'loadingIndicator', name: 'Loading', description: '不確定の読み込み表示' },
  { kind: 'linearProgress', name: 'Linear Progress', description: '横方向の進捗' },
  { kind: 'circularProgress', name: 'Circular Progress', description: '円形の進捗' },
  { kind: 'tabs', name: 'Tabs', description: 'タブ切り替え' },
  { kind: 'box', name: 'Box', description: '自由なコンテナ' },
];

const m3eScreenParts: { kind: M3eScreenPartKind; name: string; description: string }[] = [
  { kind: 'topAppBar', name: 'Top App Bar', description: '画面タイトルと操作' },
  { kind: 'bottomNav', name: 'Bottom Navigation', description: '画面下部のタブ' },
  { kind: 'navRail', name: 'Navigation Rail', description: 'サイドバーと詳細' },
];

const favoriteStorageKey = 's3e-canvas-favorite-parts';
const defaultFavoriteKinds: NodeKind[] = ['vstack', 'text', 'button', 'section'];
const knownPartKinds = new Set(groups.flatMap((group) => group.items.map((item) => item.kind)));
const searchAliases: Partial<Record<NodeKind, string>> = {
  vstack: '縦 スタック',
  hstack: '横 スタック',
  lazyvstack: '遅延 縦 スタック リスト',
  lazyhstack: '遅延 横 スタック スクロール',
  zstack: '重ねる スタック',
  text: 'テキスト 文字',
  image: '画像 アイコン シンボル',
  camera: 'カメラ 撮影 写真 AVFoundation',
  map: '地図 MapKit 位置情報',
  button: 'ボタン 操作',
  alert: '確認 ダイアログ 警告',
  'confirmation-dialog': '確認 選択肢 ダイアログ アクションシート',
  'navigation-link': '遷移 リンク',
  toggle: 'トグル スイッチ',
  textfield: '入力 フィールド',
  searchfield: '検索 サーチ フィールド 検索バー',
  securefield: 'パスワード 入力',
  texteditor: '複数行 入力',
  picker: '選択 メニュー',
  colorpicker: '色 カラー 色選択',
  slider: 'スライダー 範囲',
  stepper: 'ステッパー 増減',
  menu: 'メニュー 操作',
  datepicker: '日付 カレンダー',
  section: 'セクション グループ',
  scrollview: 'スクロール',
  list: 'リスト 一覧',
  form: 'フォーム 設定',
  'navigation-split-view': 'サイドバー 詳細 iPad ナビゲーション',
  lazyvgrid: 'グリッド 列 レイアウト',
  lazyhgrid: 'グリッド 行 レイアウト',
};

function matchesPart(item: { kind: NodeKind; name: string; description: string }, query: string): boolean {
  return `${item.name} ${item.description} ${item.kind} ${searchAliases[item.kind] ?? ''}`.toLowerCase().includes(query);
}

function matchesM3ePart(item: { kind: M3ePresentationKind; name: string; description: string }, query: string): boolean {
  return `${item.name} ${item.description} ${item.kind} m3e material`.toLowerCase().includes(query);
}

function readFavoriteKinds(): NodeKind[] {
  if (typeof window === 'undefined') return defaultFavoriteKinds;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(favoriteStorageKey) ?? 'null');
    if (!Array.isArray(raw)) return defaultFavoriteKinds;
    const valid = raw.filter((kind): kind is NodeKind => typeof kind === 'string' && knownPartKinds.has(kind as NodeKind));
    return valid;
  } catch {
    return defaultFavoriteKinds;
  }
}

const stylePresets: { name: string; description: string; patch: Partial<CanvasNode> }[] = [
  { name: 'Padding', description: '16ptの余白', patch: { padding: 16 } },
  { name: 'Frame', description: '最大幅に広げる', patch: { frameWidth: 'max' } },
  { name: 'Background', description: 'セカンダリ背景', patch: { background: 'secondary' } },
  { name: 'CornerRadius', description: '12ptの角丸', patch: { cornerRadius: 12 } },
  { name: 'Overlay', description: '境界線を重ねる', patch: { overlay: true } },
  { name: 'Shadow', description: '弱い影を付ける', patch: { shadow: 'subtle' } },
];

const glassPresets: { name: string; description: string; patch: Partial<CanvasNode> }[] = [
  { name: 'Glass Regular', description: '標準の透明感', patch: { glass: 'regular', glassInteractive: false, glassTint: undefined, glassShape: 'automatic' } },
  { name: 'Glass Clear', description: '背景をより見せる', patch: { glass: 'clear', glassInteractive: false, glassTint: undefined, glassShape: 'automatic' } },
  { name: 'Glass Prominent', description: '主役の操作に使う', patch: { glass: 'prominent', glassInteractive: true, glassShape: 'automatic' } },
  { name: 'Interactive Glass', description: '押下状態を表現', patch: { glass: 'regular', glassInteractive: true, glassShape: 'automatic' } },
];

const patterns: { id: PatternId; name: string; description: string }[] = [
  { id: 'glass-card', name: 'Glass Card', description: 'GlassEffectContainerと操作ボタン' },
  { id: 'settings-section', name: 'Settings Section', description: 'ToggleとPickerの設定項目' },
  { id: 'list-row', name: 'List Row', description: 'アイコン・見出し・補足情報' },
  { id: 'empty-state', name: 'Empty State', description: 'ContentUnavailableViewの空状態' },
];

const patternSearchAliases: Record<PatternId, string> = {
  'glass-card': 'カード ガラス liquid glass',
  'settings-section': '設定 セクション 通知 表示モード',
  'list-row': 'リスト 行 項目 アイコン',
  'empty-state': '空状態 空 コンテンツ ありません',
};

type DropPosition = 'inside' | 'before' | 'after';
interface TreeDropTarget {
  id: string;
  position: DropPosition;
}

function startDrag(event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) {
  event.dataTransfer.effectAllowed = data.kind === 'move' ? 'move' : 'copy';
  const value = encodeDragData(data);
  event.dataTransfer.setData(NODE_DRAG_MIME, value);
  event.dataTransfer.setData('text/plain', value);
}

function readDropData(event: React.DragEvent): ReturnType<typeof decodeDragData> {
  const value = event.dataTransfer.getData(NODE_DRAG_MIME) || event.dataTransfer.getData('text/plain');
  return value ? decodeDragData(value) : null;
}

export function Palette() {
  const document = useEditorStore((state) => state.document);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const addScreen = useEditorStore((state) => state.addScreen);
  const moveActiveScreen = useEditorStore((state) => state.moveActiveScreen);
  const duplicateActiveScreen = useEditorStore((state) => state.duplicateActiveScreen);
  const deleteActiveScreen = useEditorStore((state) => state.deleteActiveScreen);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const activeScreenIndex = document.screens.findIndex((candidate) => candidate.id === document.activeScreenId);

  return (
    <aside className="palette navigator-panel panel-border-right" aria-label="ナビゲータ">
      <div className="panel-heading">
        <span>ナビゲータ</span>
        <span className="panel-heading-meta">{document.screens.length}画面</span>
      </div>

      <div className="navigator-scroll">
        <section className="navigator-section screen-section">
          <div className="section-heading">
            <span>画面</span>
            <div className="section-actions">
              <button type="button" onClick={addScreen} title="画面を追加" aria-label="画面を追加">＋</button>
              <button type="button" onClick={() => moveActiveScreen('up')} disabled={activeScreenIndex <= 0} title="選択中の画面を前へ" aria-label="選択中の画面を前へ">↑</button>
              <button type="button" onClick={() => moveActiveScreen('down')} disabled={activeScreenIndex < 0 || activeScreenIndex >= document.screens.length - 1} title="選択中の画面を後ろへ" aria-label="選択中の画面を後ろへ">↓</button>
              <button type="button" onClick={duplicateActiveScreen} title="選択中の画面を複製" aria-label="選択中の画面を複製">複製</button>
              <button type="button" onClick={() => {
                if (window.confirm('選択中の画面を削除します。画面への遷移参照は解除されます。続けますか？')) deleteActiveScreen();
              }} disabled={document.screens.length <= 1} title="選択中の画面を削除" aria-label="選択中の画面を削除">削除</button>
            </div>
          </div>
          <div className="screen-list">
            {document.screens.map((candidate, index) => (
              <button
                className={`screen-list-item ${candidate.id === document.activeScreenId ? 'is-selected' : ''}`}
                key={candidate.id}
                type="button"
                onClick={() => {
                  selectScreen(candidate.id);
                  selectNode(null);
                }}
              >
                <span className="screen-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="screen-list-name">{candidate.name}</span>
                <span className="screen-list-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>

        {screen && <StructureTree screen={screen} onDragStart={startDrag} />}

        <NavigationList />
      </div>
    </aside>
  );
}

export function PartsLibrary() {
  const document = useEditorStore((state) => state.document);
  const addNode = useEditorStore((state) => state.addNode);
  const addM3eNode = useEditorStore((state) => state.addM3eNode);
  const addM3eScreenPart = useEditorStore((state) => state.addM3eScreenPart);
  const addPattern = useEditorStore((state) => state.addPattern);
  const updateSelectedNode = useEditorStore((state) => state.updateSelectedNode);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const [query, setQuery] = useState('');
  const [favoriteKinds, setFavoriteKinds] = useState<NodeKind[]>(readFavoriteKinds);
  useEffect(() => {
    try {
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteKinds));
    } catch {
      // Preferences are optional when storage is unavailable.
    }
  }, [favoriteKinds]);
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  const selectedNode = screen && selectedNodeId ? findNode(screen.root.children, selectedNodeId) : undefined;
  const selectedLocation = screen && selectedNodeId ? findNodeLocation(screen.root.children, selectedNodeId) : undefined;
  const selectedContainer = selectedNode && isContainerNode(selectedNode) ? selectedNode : undefined;
  const insertionContainer = selectedContainer ?? (screen && selectedLocation?.parentId ? findNode(screen.root.children, selectedLocation.parentId) : undefined);
  const insertionParentId = insertionContainer?.id ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesPart(item, normalizedQuery)),
    }))
    .filter((group) => group.items.length > 0);
  const filteredM3eParts = m3eParts.filter((item) => matchesM3ePart(item, normalizedQuery));
  const filteredM3eScreenParts = m3eScreenParts.filter((item) => matchesM3ePart(item, normalizedQuery));
  const filteredGlassPresets = glassPresets.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery));
  const filteredStyles = stylePresets.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery));
  const filteredPatterns = patterns.filter((item) => `${item.name} ${item.description} ${item.id} ${patternSearchAliases[item.id]}`.toLowerCase().includes(normalizedQuery));
  const favoriteItems = groups.flatMap((group) => group.items).filter((item) => favoriteKinds.includes(item.kind));
  const filteredFavoriteItems = favoriteItems.filter((item) => matchesPart(item, normalizedQuery));
  const toggleFavorite = (kind: NodeKind) => setFavoriteKinds((current) => current.includes(kind) ? current.filter((candidate) => candidate !== kind) : [...current, kind]);

  return (
    <aside className="parts-panel panel-border-right" aria-label="SwiftUIパーツ">
      <div className="panel-heading">
        <span>パーツ</span>
        <span className="panel-heading-meta">SwiftUI</span>
      </div>
      <div className="parts-scroll">
        <div className="component-insert-hint">
          <span>追加先</span>
          <strong>{insertionContainer ? nodeLabel(insertionContainer) : '画面のルート'}</strong>
        </div>
        <label className="component-search">
          <span aria-hidden="true">⌕</span>
          <input id="parts-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="パーツを検索（⌘K）" aria-label="パーツを検索" />
        </label>
        {filteredFavoriteItems.length > 0 && (
          <section className="palette-group favorite-group">
            <div className="palette-group-title">お気に入り</div>
            <div className="palette-items">
              {filteredFavoriteItems.map((item) => (
                <PalettePartItem
                  favorite
                  insertionContainer={insertionContainer}
                  item={item}
                  key={`favorite-${item.kind}`}
                  onAdd={() => addNode(item.kind, insertionParentId)}
                  onToggleFavorite={() => toggleFavorite(item.kind)}
                />
              ))}
            </div>
          </section>
        )}
        {filteredM3eParts.length > 0 && (
          <section className="palette-group palette-m3e-group">
            <div className="palette-group-title">M3Eパーツ</div>
            <div className="palette-items">
              {filteredM3eParts.map((item) => (
                <M3ePalettePartItem
                  insertionContainer={insertionContainer}
                  item={item}
                  key={item.kind}
                  onAdd={() => addM3eNode(item.kind, insertionParentId)}
                />
              ))}
            </div>
          </section>
        )}
        {filteredM3eScreenParts.length > 0 && (
          <section className="palette-group palette-m3e-screen-group">
            <div className="palette-group-title">M3E画面UI</div>
            <div className="palette-items">
              {filteredM3eScreenParts.map((item) => (
                <M3eScreenPalettePartItem
                  item={item}
                  key={item.kind}
                  onAdd={() => addM3eScreenPart(item.kind)}
                />
              ))}
            </div>
          </section>
        )}
        {filteredPatterns.length > 0 && (
          <section className="palette-group palette-pattern-group">
            <div className="palette-group-title">パターン</div>
            <div className="palette-items">
              {filteredPatterns.map((pattern) => (
                <button
                  className="palette-item palette-pattern-item"
                  draggable
                  key={pattern.id}
                  type="button"
                  onClick={() => addPattern(pattern.id, insertionParentId)}
                  onDragStart={(event) => startDrag(event, { kind: 'pattern', pattern: pattern.id })}
                  title={`${pattern.name} — クリックで${pattern.description}を${insertionContainer ? '選択中のコンテナ' : '画面'}に追加。ドラッグして配置`}
                >
                  <span className="palette-item-name">{pattern.name}</span>
                  <span className="palette-item-description">{pattern.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {(filteredGlassPresets.length > 0 || 'glasseffectcontainer glass要素をまとめる'.includes(normalizedQuery)) && (
          <section className="palette-group palette-glass-group">
            <div className="palette-group-title">Liquid Glass</div>
            <div className="palette-items">
              {'GlassEffectContainer glass要素をまとめる'.toLowerCase().includes(normalizedQuery) && (
                <button
                  className="palette-item palette-glass-item"
                  draggable
                  type="button"
                  onClick={() => addNode('glass-container', insertionParentId)}
                  onDragStart={(event) => startDrag(event, { kind: 'new', nodeKind: 'glass-container' })}
                  title={`GlassEffectContainerを${insertionContainer ? '選択中のコンテナ' : '画面'}に追加`}
                >
                  <span className="palette-item-name">GlassEffectContainer</span>
                  <span className="palette-item-description">Glass要素をまとめる</span>
                </button>
              )}
              {filteredGlassPresets.map((item) => (
                <button
                  className="palette-item palette-glass-item"
                  key={item.name}
                  type="button"
                  disabled={!selectedNodeId}
                  onClick={() => updateSelectedNode({ ...item.patch, buttonStyle: undefined })}
                  title={selectedNodeId ? `${item.name} — ${item.description}を選択中の要素に適用` : '要素を選択すると適用できます'}
                >
                  <span className="palette-item-name">{item.name}</span>
                  <span className="palette-item-description">{item.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {filteredGroups.map((group) => (
          <section className="palette-group" key={group.title}>
            <div className="palette-group-title">{group.title}</div>
            <div className="palette-items">
              {group.items.map((item) => (
                <PalettePartItem
                  favorite={favoriteKinds.includes(item.kind)}
                  insertionContainer={insertionContainer}
                  item={item}
                  key={item.kind}
                  onAdd={() => addNode(item.kind, insertionParentId)}
                  onToggleFavorite={() => toggleFavorite(item.kind)}
                />
              ))}
            </div>
          </section>
        ))}
        {filteredStyles.length > 0 && (
          <section className="palette-group style-palette-group">
            <div className="palette-group-title">スタイル</div>
            <div className="palette-items">
              {filteredStyles.map((item) => (
                  <button
                    className="palette-item palette-style-item"
                    key={item.name}
                    type="button"
                    disabled={!selectedNodeId}
                    onClick={() => updateSelectedNode(item.patch)}
                    title={selectedNodeId ? `${item.name} — ${item.description}を選択中の要素に適用` : '要素を選択すると適用できます'}
                  >
                    <span className="palette-item-name">{item.name}</span>
                    <span className="palette-item-description">{item.description}</span>
                  </button>
                ))}
            </div>
          </section>
        )}
        {filteredGroups.length === 0 && filteredM3eParts.length === 0 && filteredM3eScreenParts.length === 0 && filteredStyles.length === 0 && filteredPatterns.length === 0 && <div className="palette-empty">「{query}」に一致するパーツはありません。</div>}
      </div>
    </aside>
  );
}

function M3ePalettePartItem({
  item,
  insertionContainer,
  onAdd,
}: {
  item: { kind: M3eInsertKind; name: string; description: string };
  insertionContainer?: CanvasNode;
  onAdd: () => void;
}) {
  return (
    <div
      className="palette-item"
      draggable
      onDragStart={(event) => startDrag(event, { kind: 'm3e', m3eKind: item.kind })}
    >
      <button
        className="palette-item-add"
        onClick={onAdd}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAdd();
          }
        }}
        title={`${item.name} — ${item.description}。${insertionContainer ? '選択中のコンテナ' : '画面'}に追加`}
        type="button"
      >
        <span className="palette-item-name">{item.name}</span>
        <span className="palette-item-description">{item.description}</span>
      </button>
    </div>
  );
}

function M3eScreenPalettePartItem({
  item,
  onAdd,
}: {
  item: { kind: M3eScreenPartKind; name: string; description: string };
  onAdd: () => void;
}) {
  return (
    <div
      className="palette-item"
      draggable
      onDragStart={(event) => startDrag(event, { kind: 'm3e-screen', m3eKind: item.kind })}
    >
      <button
        className="palette-item-add"
        onClick={onAdd}
        title={`${item.name} — ${item.description}を現在の画面に追加`}
        type="button"
      >
        <span className="palette-item-name">{item.name}</span>
        <span className="palette-item-description">{item.description}</span>
      </button>
    </div>
  );
}

function PalettePartItem({
  item,
  favorite,
  insertionContainer,
  onAdd,
  onToggleFavorite,
}: {
  item: { kind: NodeKind; name: string; description: string };
  favorite: boolean;
  insertionContainer?: CanvasNode;
  onAdd: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className="palette-item"
      draggable
      onDragStart={(event) => startDrag(event, { kind: 'new', nodeKind: item.kind })}
    >
      <button
        className="palette-item-add"
        onClick={onAdd}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAdd();
          }
        }}
        title={`${item.name} — ${item.description}。${insertionContainer ? '選択中のコンテナ' : '画面'}に追加`}
        type="button"
      >
        <span className="palette-item-name">{item.name}</span>
        <span className="palette-item-description">{item.description}</span>
      </button>
      <button
        aria-label={favorite ? `${item.name}をお気に入りから外す` : `${item.name}をお気に入りに追加`}
        aria-pressed={favorite}
        className={`palette-favorite ${favorite ? 'is-favorite' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        title={favorite ? 'お気に入りから外す' : 'お気に入りに追加'}
        type="button"
      >
        {favorite ? '★' : '☆'}
      </button>
    </div>
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
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
  const selectNode = useEditorStore((state) => state.selectNode);
  const toggleNodeSelection = useEditorStore((state) => state.toggleNodeSelection);
  const addNode = useEditorStore((state) => state.addNode);
  const addM3eNode = useEditorStore((state) => state.addM3eNode);
  const addM3eScreenPart = useEditorStore((state) => state.addM3eScreenPart);
  const addPattern = useEditorStore((state) => state.addPattern);
  const moveNode = useEditorStore((state) => state.moveNode);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<TreeDropTarget | null>(null);
  const firstChild = root.children[0];
  const directScrollContainer = root.children.length === 1
    && firstChild !== undefined
    && (firstChild.kind === 'list' || firstChild.kind === 'form' || firstChild.kind === 'scrollview');
  const directNavigationContainer = root.children.length === 1
    && firstChild?.kind === 'navigation-split-view';

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragOver = (event: React.DragEvent, node: CanvasNode) => {
    if (!event.dataTransfer.types.includes(NODE_DRAG_MIME) && !event.dataTransfer.types.includes('text/plain')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = readDropData(event)?.kind === 'move' ? 'move' : 'copy';
    const row = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - row.top;
    const inside = node.id === root.id || (isContainerNode(node) && offset > row.height * 0.25 && offset < row.height * 0.75);
    setDropTarget({
      id: node.id,
      position: inside ? 'inside' : event.clientY < row.top + row.height / 2 ? 'before' : 'after',
    });
  };

  const handleDrop = (event: React.DragEvent, node: CanvasNode) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    const data = readDropData(event);
    if (!data) return;

    if (data.kind === 'm3e-screen') {
      addM3eScreenPart(data.m3eKind);
      return;
    }

    if (node.id === root.id) {
      if (data.kind === 'new') addNode(data.nodeKind, null);
      else if (data.kind === 'm3e') addM3eNode(data.m3eKind, null);
      else if (data.kind === 'pattern') addPattern(data.pattern, null);
      else moveNode(data.nodeId, null);
      return;
    }

    const location = findNodeLocation(root.children, node.id);
    if (!location) return;
    const row = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - row.top;
    const insertInside = isContainerNode(node) && offset > row.height * 0.25 && offset < row.height * 0.75;
    const insertIndex = location.index + (event.clientY < row.top + row.height / 2 ? 0 : 1);

    if (data.kind === 'new') {
      if (insertInside) addNode(data.nodeKind, node.id);
      else addNode(data.nodeKind, location.parentId, insertIndex);
      return;
    }

    if (data.kind === 'm3e') {
      if (insertInside) addM3eNode(data.m3eKind, node.id);
      else addM3eNode(data.m3eKind, location.parentId, insertIndex);
      return;
    }

    if (data.kind === 'pattern') {
      if (insertInside) addPattern(data.pattern, node.id);
      else addPattern(data.pattern, location.parentId, insertIndex);
      return;
    }

    if (data.nodeId === node.id) return;
    if (insertInside) moveNode(data.nodeId, node.id);
    else moveNode(data.nodeId, location.parentId, insertIndex);
  };

  const collapseAll = () => setCollapsed(new Set(containerIds(root.children)));
  const expandAll = () => setCollapsed(new Set());

  return (
    <section className="navigator-section structure-section">
      <div className="section-heading">
        <span>SwiftUI構造</span>
        <div className="section-actions">
          <span className="section-heading-meta">{countNodes(root.children)}要素</span>
          <button type="button" onClick={collapseAll} title="すべてのコンテナを折りたたむ" aria-label="すべてのコンテナを折りたたむ">−</button>
          <button type="button" onClick={expandAll} title="すべてのコンテナを展開する" aria-label="すべてのコンテナを展開する">＋</button>
        </div>
      </div>
      <div className="tree-virtual"><span className="tree-disclosure-placeholder">⌄</span><span className="tree-kind">{directNavigationContainer ? 'NavigationSplitView' : 'NavigationStack'}</span></div>
      {(directScrollContainer || directNavigationContainer) && firstChild ? (
          <TreeNode
            collapsed={collapsed}
            depth={1}
            node={firstChild}
            dropTarget={dropTarget}
            onDragStart={onDragStart}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropTarget(null)}
            onDrop={handleDrop}
            onSelect={selectNode}
            onToggle={toggle}
            onToggleSelection={toggleNodeSelection}
            selectedNodeIds={selectedNodeIds}
            selectable
        />
      ) : (
        <>
          <div className="tree-virtual tree-indent"><span className="tree-disclosure-placeholder">⌄</span><span className="tree-kind">ScrollView</span></div>
          <TreeNode
            collapsed={collapsed}
            depth={2}
            node={root}
            dropTarget={dropTarget}
            onDragStart={onDragStart}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropTarget(null)}
            onDrop={handleDrop}
            onSelect={selectNode}
            onToggle={toggle}
            onToggleSelection={toggleNodeSelection}
            selectedNodeIds={selectedNodeIds}
            selectable={false}
          />
        </>
      )}
    </section>
  );
}

function NavigationList() {
  const document = useEditorStore((state) => state.document);
  const selectNode = useEditorStore((state) => state.selectNode);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const names = new Map(document.screens.map((screen) => [screen.id, screen.name]));
  const links = document.screens.flatMap((screen) => [
    ...navigationLinks(screen.root.children).flatMap((node) =>
      node.destinationScreenId
        ? [{ screen, nodeId: node.id, destinationScreenId: node.destinationScreenId, gesture: '' }]
        : [],
    ),
    ...Object.entries(screen.swipe ?? {}).map(([direction, destinationScreenId]) => ({
      screen,
      nodeId: null,
      destinationScreenId,
      gesture: swipeDirectionLabel(direction as SwipeDirection),
    })),
  ]);

  return (
    <section className="navigator-section navigation-section">
      <div className="section-heading">
        <span>ナビゲーション</span>
        <span className="section-heading-meta">{links.length}接続</span>
      </div>
      {links.length === 0 ? (
        <div className="navigation-empty">NavigationLink、遷移ボタン、スワイプ遷移を追加すると、画面の接続が表示されます。</div>
      ) : (
        <div className="navigation-list">
          {links.map(({ screen, nodeId, destinationScreenId, gesture }) => (
            <button
              className="navigation-list-item"
              key={`${screen.id}-${nodeId ?? gesture}`}
              type="button"
              onClick={() => {
                selectScreen(screen.id);
                selectNode(nodeId);
              }}
            >
              <span className="navigation-source">{screen.name}</span>
              <span className="navigation-arrow" aria-hidden="true">→</span>
              <span className="navigation-destination">{names.get(destinationScreenId) ?? '未設定'}</span>
              {gesture && <span className="navigation-gesture">{gesture}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TreeNode({
  node,
  depth,
  collapsed,
  selectedNodeIds,
  selectable,
  dropTarget,
  onToggle,
  onToggleSelection,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: CanvasNode;
  depth: number;
  collapsed: Set<string>;
  selectedNodeIds: string[];
  selectable: boolean;
  dropTarget: TreeDropTarget | null;
  onToggle: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelect: (id: string) => void;
  onDragStart: (event: React.DragEvent, data: Parameters<typeof encodeDragData>[0]) => void;
  onDragOver: (event: React.DragEvent, node: CanvasNode) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent, node: CanvasNode) => void;
}) {
  const hasChildren = isContainerNode(node) && node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const rowStyle = { paddingLeft: `${depth * 12 + 7}px` };

  return (
    <div className="tree-node">
      <div className={`tree-row ${dropTarget?.id === node.id ? `is-drop-target is-drop-${dropTarget.position}` : ''}`} style={rowStyle} onDragOver={(event) => onDragOver(event, node)} onDrop={(event) => onDrop(event, node)} onDragLeave={onDragLeave}>
        {isContainerNode(node) && hasChildren ? (
          <button className="tree-disclosure" type="button" onClick={() => onToggle(node.id)} aria-label={isCollapsed ? '展開' : '折りたたむ'}>
            {isCollapsed ? '›' : '⌄'}
          </button>
        ) : <span className="tree-disclosure-placeholder" />}
        {selectable ? (
          <button
            className={`tree-item ${selectedNodeIds.includes(node.id) ? 'is-selected' : ''}`}
            aria-pressed={selectedNodeIds.includes(node.id)}
            draggable
            onClick={(event) => {
              if (event.shiftKey) onToggleSelection(node.id);
              else onSelect(node.id);
            }}
            onDragStart={(event) => onDragStart(event, { kind: 'move', nodeId: node.id })}
            type="button"
          >
            <span className="tree-kind">{nodeKindLabel(node.kind)}</span>
            {nodeLabel(node) !== nodeKindLabel(node.kind) && <span className="tree-label">{nodeLabel(node)}</span>}
          </button>
        ) : (
          <span className="tree-item tree-root-item">
            <span className="tree-kind">{nodeKindLabel(node.kind)}</span>
            <span className="tree-label">画面の内容</span>
          </span>
        )}
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              collapsed={collapsed}
              depth={depth + 1}
              dropTarget={dropTarget}
              key={child.id}
              node={child}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onSelect={onSelect}
              onToggle={onToggle}
              onToggleSelection={onToggleSelection}
              selectedNodeIds={selectedNodeIds}
              selectable
            />
          ))}
        </div>
      )}
    </div>
  );
}

function navigationLinks(nodes: CanvasNode[]): Extract<CanvasNode, { kind: 'navigation-link' | 'button' }>[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'navigation-link' || node.kind === 'button' ? (node.destinationScreenId ? [node] : []) : []),
    ...(node.children ? navigationLinks(node.children) : []),
  ]);
}

function swipeDirectionLabel(direction: SwipeDirection): string {
  return direction === 'left' ? '左スワイプ' : direction === 'right' ? '右スワイプ' : direction === 'up' ? '上スワイプ' : '下スワイプ';
}

function countNodes(nodes: CanvasNode[]): number {
  return nodes.reduce((count, node) => count + 1 + (node.children ? countNodes(node.children) : 0), 0);
}

function containerIds(nodes: CanvasNode[]): string[] {
  return nodes.flatMap((node) => isContainerNode(node)
    ? [node.id, ...containerIds(node.children)]
    : []);
}

function nodeLabel(node: CanvasNode): string {
  switch (node.kind) {
    case 'text': return node.text || 'Text';
    case 'button':
    case 'alert':
    case 'confirmation-dialog':
    case 'toggle':
    case 'textfield':
    case 'searchfield':
    case 'securefield':
    case 'texteditor':
    case 'picker':
    case 'slider':
    case 'stepper':
    case 'menu':
    case 'progress':
    case 'gauge':
    case 'navigation-link':
    case 'link':
    case 'datepicker': return node.label || nodeKindLabel(node.kind);
    case 'sheet': return node.label || (isContainerNode(node) ? node.title : undefined) || nodeKindLabel(node.kind);
    case 'groupbox': return node.title || nodeKindLabel(node.kind);
    case 'section':
    case 'disclosure-group': return node.title || 'Section';
    case 'content-unavailable': return node.title || nodeKindLabel(node.kind);
    case 'label': return node.title || 'Label';
    case 'image': return node.systemName || 'Image';
    case 'camera': return node.label || 'Camera';
    case 'map': return node.label || 'MapKit Map';
    default: return nodeKindLabel(node.kind);
  }
}

function nodeKindLabel(kind: NodeKind): string {
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

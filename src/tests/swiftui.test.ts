import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { generateSwiftUI } from '../lib/swiftui';

describe('SwiftUI generator', () => {
  it('generates a NavigationStack and the initial content', () => {
    const output = generateSwiftUI(defaultDocument);
    expect(output).toContain('NavigationStack');
    expect(output).toContain('struct Screen1View: View');
    expect(output).toContain('はじめてのユーザーへ');
    expect(output).toContain('Label("続ける", systemImage: "arrow.right")');
    expect(output).toContain('.navigationTitle("ホーム")');
    expect(output).toContain('        NavigationStack {\n            ScrollView {');
    expect(output).toMatch(/VStack\(alignment: \.leading, spacing: 16\) \{\n\s{20}Image\(systemName:/);
  });

  it('keeps generated Swift identifiers valid and Dynamic Type-aware', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.name = '123 Login';
    screen.root.children.push(
      { id: 'toggle-test', kind: 'toggle', label: 'Enabled', binding: 'class', minHeight: 44 },
      { id: 'field-test', kind: 'textfield', label: 'Name', binding: '1 user-name', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('struct _123_LoginView: View');
    expect(output).toContain('@State private var _class: Bool = false');
    expect(output).toContain('@State private var _1_user_name: String = ""');
    expect(output).toContain('isOn: $_class');
    expect(output).toContain('text: $_1_user_name');
    expect(output).toContain('.font(.title)');
    expect(output).toContain('.fontWeight(.semibold)');
  });

  it('keeps Boolean and String bindings separate when names collide', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push(
      { id: 'toggle-shared', kind: 'toggle', label: 'Enabled', binding: 'shared', minHeight: 44 },
      { id: 'field-shared', kind: 'textfield', label: 'Name', binding: 'shared', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var shared: Bool = false');
    expect(output).toContain('@State private var shared2: String = ""');
    expect(output).toContain('isOn: $shared');
    expect(output).toContain('text: $shared2');
  });

  it('exports SearchField as a native SwiftUI text field with a prompt', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'search-test',
      kind: 'searchfield',
      label: '検索',
      binding: 'query',
      prompt: 'キーワードを検索',
      minHeight: 44,
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var query: String = ""');
    expect(output).toContain('TextField("検索", text: $query, prompt: Text("キーワードを検索"))');
    expect(output).toContain('.textFieldStyle(.roundedBorder)');
  });

  it('keeps non-Latin bindings and control characters valid in generated Swift', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push(
      { id: 'japanese-binding', kind: 'textfield', label: '名前', binding: 'ユーザー名', minHeight: 44 },
      { id: 'escaped-text', kind: 'text', text: '行1\u0000行2\u0008', fontSize: 17, weight: 'regular' },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var value_japanese_binding: String = ""');
    expect(output).toContain('text: $value_japanese_binding');
    expect(output).toContain('Text("行1\\u{0000}行2\\u{8}")');
  });

  it('exports SF Symbols with an accessibility label', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push({
      id: 'image-test',
      kind: 'image',
      systemName: 'person.crop.circle',
      accessibilityLabel: 'Profile',
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('Image(systemName: "person.crop.circle")');
    expect(output).toContain('.accessibilityLabel("Profile")');
    expect(output).not.toContain('..accessibilityLabel');
  });

  it('exports asset and remote images with native SwiftUI image views', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'asset-image', kind: 'image', source: 'asset', systemName: 'HeroImage', accessibilityLabel: 'Hero' },
      { id: 'remote-image', kind: 'image', source: 'remote', systemName: 'https://example.com/hero.png', accessibilityLabel: 'Remote hero' },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('Image("HeroImage")');
    expect(output).toContain('AsyncImage(url: URL(string: "https://example.com/hero.png"))');
    expect(output).toContain('case .failure:');
  });

  it('exports icon buttons with a native SwiftUI Label', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push(
      { id: 'icon-button', kind: 'button', label: '次へ', systemName: 'arrow.right', role: 'normal', minHeight: 44 },
      { id: 'destructive-icon-button', kind: 'button', label: '削除', systemName: 'trash', role: 'destructive', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('Label("次へ", systemImage: "arrow.right")');
    expect(output).toContain('Button(role: .destructive)');
    expect(output).toContain('Label("削除", systemImage: "trash")');
  });

  it('exports a VoiceOver label for an icon-only button', () => {
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

    const output = generateSwiftUI(document);

    expect(output).toContain('.accessibilityLabel("閉じる")');
  });

  it('exports toggle buttons with stateful labels and styles', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push({
      id: 'toggle-button',
      kind: 'button',
      label: '通知を開始',
      systemName: 'bell',
      role: 'normal',
      minHeight: 44,
      buttonStyle: 'plain',
      toggle: {
        isOn: true,
        onLabel: '通知を停止',
        onSystemName: 'bell.slash.fill',
        onButtonStyle: 'bordered',
      },
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var is_toggle_button: Bool = true');
    expect(output).toContain('is_toggle_button.toggle()');
    expect(output).toContain('Label(is_toggle_button ? "通知を停止" : "通知を開始", systemImage: is_toggle_button ? "bell.slash.fill" : "bell")');
    expect(output).toContain('.buttonStyle(.bordered)');
    expect(output).toContain('.buttonStyle(.plain)');
  });

  it('exports a Button with a destination as a native NavigationLink', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    const button = screen.root.children.find((node) => node.kind === 'button');
    if (!button || button.kind !== 'button') throw new Error('Button fixture missing');
    button.destinationScreenId = 'screen-settings';
    button.systemName = 'arrow.right';
    button.glass = undefined;
    button.buttonStyle = 'borderedProminent';

    const output = generateSwiftUI(document);

    expect(output).toContain('                    NavigationLink {\n                        Screen2View()\n                    } label: {\n                        Label("続ける", systemImage: "arrow.right")');
    expect(output).toContain('.buttonStyle(.borderedProminent)');
    expect(output).not.toContain('Button {\n                    // Action');
  });

  it('exports standard Button styles without overriding Liquid Glass', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    const button = screen.root.children.find((node) => node.kind === 'button');
    if (!button || button.kind !== 'button') throw new Error('Button fixture missing');
    button.glass = undefined;
    button.buttonStyle = 'borderedProminent';

    const output = generateSwiftUI(document);

    expect(output).toContain('.buttonStyle(.borderedProminent)');
    button.glass = 'regular';
    const glassOutput = generateSwiftUI(document);
    expect(glassOutput).toContain('.buttonStyle(.glass)');
    expect(glassOutput).not.toContain('.buttonStyle(.borderedProminent)');
  });

  it('exports Liquid Glass using iOS 26 SwiftUI APIs', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    const text = screen.root.children.find((node) => node.kind === 'text');
    const button = screen.root.children.find((node) => node.kind === 'button');
    if (!text || text.kind !== 'text' || !button || button.kind !== 'button') throw new Error('Fixture nodes missing');
    text.glass = 'clear';
    text.glassShape = 'capsule';
    text.fontDesign = 'rounded';
    button.glass = 'regular';

    const output = generateSwiftUI(document);

    expect(output).toContain('.glassEffect(.clear, in: .capsule)');
    expect(output).toContain('.fontDesign(.rounded)');
    expect(output).toContain('.buttonStyle(.glass)');
  });

  it('exports the document appearance on the root navigation stack', () => {
    const document = structuredClone(defaultDocument);
    document.appearance = { colorScheme: 'dark', accentColor: 'purple', fontDesign: 'rounded' };

    const output = generateSwiftUI(document);

    expect(output).toContain('.tint(.purple)');
    expect(output).toContain('.preferredColorScheme(.dark)');
    expect(output).toContain('.fontDesign(.rounded)');
  });

  it('exports a custom appearance tint as a native SwiftUI color', () => {
    const document = structuredClone(defaultDocument);
    document.appearance = { colorScheme: 'light', accentColor: 'custom', accentHex: '#FF9500' };

    const output = generateSwiftUI(document);

    expect(output).toContain('.tint(Color(red: 1.000, green: 0.584, blue: 0.000))');
  });

  it('exports screen navigation title display mode and toolbar items', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.navigationTitleDisplayMode = 'inline';
    screen.toolbarItems = [
      { id: 'leading', title: '戻る', placement: 'topBarLeading', role: 'cancel' },
      { id: 'help', title: 'ヘルプ', systemName: 'questionmark.circle', placement: 'topBarTrailing', destinationScreenId: 'screen-settings' },
      { id: 'delete', title: '削除', systemName: 'trash', placement: 'bottomBar', role: 'destructive' },
    ];

    const output = generateSwiftUI(document);

    expect(output).toContain('.navigationBarTitleDisplayMode(.inline)');
    expect(output).toContain('ToolbarItem(placement: .topBarLeading)');
    expect(output).toContain('ToolbarItem(placement: .topBarTrailing)');
    expect(output).toContain('ToolbarItem(placement: .bottomBar)');
    expect(output).toContain('Label("ヘルプ", systemImage: "questionmark.circle")');
    expect(output).toContain('                Screen2View()');
    expect(output).toContain('                Button {');
    expect(output).toContain('Button(role: .destructive)');
  });

  it('exports screen tab bar items as a native TabView', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.tabBarItems = [
      { id: 'home-tab', title: 'ホーム', systemName: 'house', placement: 'bottomBar', selected: true },
      { id: 'settings-tab', title: '設定', systemName: 'gearshape', placement: 'bottomBar', destinationScreenId: 'screen-settings' },
    ];

    const output = generateSwiftUI(document);

    expect(output).toContain('TabView(selection: $selected_tab_screen_home)');
    expect(output).toContain('Label("ホーム", systemImage: "house")');
    expect(output).toContain('Label("設定", systemImage: "gearshape")');
    expect(output).toContain('.tag(0)');
    expect(output).toContain('.tag(1)');
    expect(output).toContain('                Screen2View()');
  });

  it('exports configured swipe destinations as native navigation gestures', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.swipe = { left: 'screen-settings' };

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var show_swipe_left_screen_home = false');
    expect(output).toContain('NavigationLink(destination: Screen2View(), isActive: $show_swipe_left_screen_home)');
    expect(output).toContain('value.translation.width < -60');
  });

  it('exports native picker and progress views', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'picker-test', kind: 'picker', label: 'Theme', binding: 'theme', options: ['Light', 'Dark'], minHeight: 44 },
      { id: 'progress-test', kind: 'progress', label: 'Upload', value: 0.75 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var theme: String = "Light"');
    expect(output).toContain('Picker("Theme", selection: $theme)');
    expect(output).toContain('Text("Dark").tag("Dark")');
    expect(output).toContain('ProgressView(value: 0.75)');
  });

  it('preserves circular progress and documents unsupported expressive styling', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'circular-progress-test',
      kind: 'progress',
      label: '同期中',
      value: 0.4,
      style: 'circular',
      wavy: true,
      trackThickness: 8,
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('ProgressView(value: 0.4)');
    expect(output).toContain('.progressViewStyle(.circular)');
    expect(output).toContain('M3Eのトラック太さ: 8pt');
  });

  it('exports a bottom-sheet handle for imported box semantics', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'sheet-box',
      kind: 'groupbox',
      title: 'メニュー',
      isBottomSheet: true,
      children: [],
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('Capsule()');
    expect(output).toContain('presentationDetents');
  });

  it('exports ColorPicker with a typed Color binding', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'color-test',
      kind: 'colorpicker',
      label: 'アクセント',
      binding: 'accentColor',
      color: '#FF9500',
      minHeight: 44,
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var accentColor: Color = Color(red: 1.000, green: 0.584, blue: 0.000)');
    expect(output).toContain('ColorPicker("アクセント", selection: $accentColor)');
  });

  it('exports the standard text and value controls', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'secure-test', kind: 'securefield', label: 'Password', binding: 'password', minHeight: 44 },
      { id: 'editor-test', kind: 'texteditor', label: 'Notes', binding: 'notes', minHeight: 88 },
      { id: 'slider-test', kind: 'slider', label: 'Volume', binding: 'volume', value: 50, minimum: 0, maximum: 100, step: 1, minHeight: 44 },
      { id: 'stepper-test', kind: 'stepper', label: 'Quantity', binding: 'quantity', value: 1, minimum: 0, maximum: 10, step: 1, minHeight: 44 },
      { id: 'menu-test', kind: 'menu', label: 'Actions', options: ['Edit', 'Delete'], minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('SecureField("Password", text: $password)');
    expect(output).toContain('TextEditor(text: $notes)');
    expect(output).toContain('@State private var volume: Double = 50');
    expect(output).toContain('Slider("Volume", value: $volume, in: 0...100, step: 1)');
    expect(output).toContain('Stepper("Quantity", value: $quantity, in: 0...10, step: 1)');
    expect(output).toContain('Menu("Actions")');
    expect(output).toContain('Button("Delete")');
  });

  it('exports camera input as a labeled Button with an AVFoundation handoff note', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({ id: 'camera-test', kind: 'camera', label: '写真を撮る', minHeight: 44 });

    const output = generateSwiftUI(document);

    expect(output).toContain('AVFoundation: AVCaptureSessionをカメラプレビューへ接続する');
    expect(output).toContain('Label("写真を撮る", systemImage: "camera.fill")');
    expect(output).toContain('.accessibilityLabel("写真を撮る")');
  });

  it('exports native list containers and links between screens', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    document.screens = [home];
    document.screens.push({
      id: 'screen-details',
      name: 'Details',
      navigationTitle: 'Details',
      root: { id: 'root-details', kind: 'vstack', spacing: 16, children: [] },
    });
    home.root.children.push({
      id: 'settings-list',
      kind: 'list',
      children: [{
        id: 'settings-link',
        kind: 'navigation-link',
        label: 'Details',
        destinationScreenId: 'screen-details',
        minHeight: 44,
      }],
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('List {');
    expect(output).toContain('NavigationLink("Details")');
    expect(output).toContain('DetailsView()');
    expect(output).toContain('struct DetailsView: View');
  });

  it('exports explicit ZStack and ScrollView nodes', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'scroll-test',
      kind: 'scrollview',
      children: [{ id: 'zstack-test', kind: 'zstack', children: [] }],
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('ScrollView {');
    expect(output).toContain('ZStack {');
  });

  it('exports lazy stacks as native SwiftUI containers', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'lazy-v', kind: 'lazyvstack', alignment: 'leading', spacing: 12, children: [{ id: 'lazy-v-text', kind: 'text', text: '縦', fontSize: 17, weight: 'regular' }] },
      { id: 'lazy-h', kind: 'lazyhstack', alignment: 'center', spacing: 8, children: [{ id: 'lazy-h-text', kind: 'text', text: '横', fontSize: 17, weight: 'regular' }] },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('LazyVStack(alignment: .leading, spacing: 12)');
    expect(output).toContain('LazyHStack(alignment: .center, spacing: 8)');
  });

  it('exports a root NavigationSplitView without nesting another NavigationStack', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children = [{
      id: 'split-test',
      kind: 'navigation-split-view',
      children: [
        { id: 'split-sidebar', kind: 'list', children: [{ id: 'split-item', kind: 'text', text: '項目', fontSize: 17, weight: 'regular' }] },
        { id: 'split-detail', kind: 'vstack', spacing: 12, children: [{ id: 'split-detail-text', kind: 'text', text: '詳細', fontSize: 17, weight: 'regular' }] },
      ],
    }];

    const output = generateSwiftUI(document);

    expect(output).toContain('NavigationSplitView {');
    expect(output).toContain('} detail: {');
    expect(output).not.toContain('NavigationStack {');
  });

  it('exports semantic text styles and a Liquid Glass container', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'glass-container-test',
      kind: 'glass-container',
      spacing: 12,
      children: [{
        id: 'glass-text-test',
        kind: 'text',
        text: '重要',
        fontSize: 17,
        weight: 'semibold',
        textStyle: 'headline',
        textAlignment: 'center',
        lineLimit: 2,
        glass: 'clear',
        glassInteractive: true,
        glassTint: 'orange',
        padding: 8,
      }],
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('GlassEffectContainer(spacing: 12)');
    expect(output).toContain('.font(.headline)');
    expect(output).toContain('.multilineTextAlignment(.center)');
    expect(output).toContain('.lineLimit(2)');
    expect(output).toContain('.glassEffect(.clear.tint(.orange).interactive())');
    expect(output).toContain('.padding(8)');
  });

  it('exports the common SwiftUI content and container parts', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'label-test', kind: 'label', title: 'お気に入り', systemName: 'star.fill', accessibilityLabel: 'お気に入り' },
      { id: 'link-test', kind: 'link', label: 'Apple', url: 'https://apple.com', minHeight: 44 },
      { id: 'date-test', kind: 'datepicker', label: '日付', binding: 'date', minHeight: 44 },
      { id: 'group-test', kind: 'group', children: [] },
      { id: 'tabs-test', kind: 'tabview', children: [{ id: 'tab-home', kind: 'text', text: 'Home', fontSize: 17, weight: 'regular', tabTitle: 'Home', tabSystemName: 'house.fill' }] },
      { id: 'details-test', kind: 'disclosure-group', title: '詳細', children: [] },
      { id: 'sheet-test', kind: 'sheet', label: '編集', title: '編集画面', children: [] },
      { id: 'alert-test', kind: 'alert', label: '削除', title: '削除しますか？', message: 'この操作は取り消せません。', primaryButton: '削除', primaryRole: 'destructive', secondaryButton: 'キャンセル', secondaryRole: 'cancel', minHeight: 44 },
      { id: 'confirmation-test', kind: 'confirmation-dialog', label: '操作', title: '操作を選択', message: '実行する操作を選んでください。', options: ['編集', '削除'], cancelButton: 'キャンセル', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('Label("お気に入り", systemImage: "star.fill")');
    expect(output).toContain('Link("Apple", destination: URL(string: "https://apple.com") ?? URL(fileURLWithPath: "/"))');
    expect(output).toContain('DatePicker("日付", selection: $date, displayedComponents: .date)');
    expect(output).toContain('Group {');
    expect(output).toContain('TabView {');
    expect(output).toContain('.tabItem {');
    expect(output).toContain('Label("Home", systemImage: "house.fill")');
    expect(output).toContain('DisclosureGroup("詳細")');
    expect(output).toContain('.sheet(isPresented: $show_sheet_test)');
    expect(output).toContain('EmptyView()');
    expect(output).toContain('@State private var show_alert_test: Bool = false');
    expect(output).toContain('.alert("削除しますか？", isPresented: $show_alert_test)');
    expect(output).toContain('Button("キャンセル", role: .cancel) {}');
    expect(output).toContain('Button("削除", role: .destructive) {}');
    expect(output).toContain('@State private var show_confirmation_test: Bool = false');
    expect(output).toContain('.confirmationDialog("操作を選択", isPresented: $show_confirmation_test, titleVisibility: .visible)');
    expect(output).toContain('Button("編集") {}');
  });

  it('exports the collection, metric, and empty-state parts as native SwiftUI', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      {
        id: 'groupbox-test',
        kind: 'groupbox',
        title: '設定',
        children: [{ id: 'groupbox-text', kind: 'text', text: '内容', fontSize: 17, weight: 'regular' }],
      },
      {
        id: 'grid-test',
        kind: 'lazyvgrid',
        columns: 2,
        spacing: 12,
        children: [{ id: 'grid-text', kind: 'text', text: 'カード', fontSize: 17, weight: 'regular' }],
      },
      {
        id: 'row-grid-test',
        kind: 'lazyhgrid',
        rows: 3,
        spacing: 10,
        children: [{ id: 'row-grid-text', kind: 'text', text: '横カード', fontSize: 17, weight: 'regular' }],
      },
      { id: 'gauge-test', kind: 'gauge', label: '進捗', value: 0.6, minimum: 0, maximum: 1, minHeight: 44 },
      { id: 'empty-state-test', kind: 'content-unavailable', title: '項目なし', systemName: 'tray', description: 'まだ項目がありません。' },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('GroupBox("設定")');
    expect(output).toContain('LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12)');
    expect(output).toContain('LazyHGrid(rows: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10)');
    expect(output).toContain('Gauge(value: 0.6, in: 0...1)');
    expect(output).toContain('ContentUnavailableView("項目なし", systemImage: "tray"');
    expect(output).toContain('Text("まだ項目がありません。")');
  });
});

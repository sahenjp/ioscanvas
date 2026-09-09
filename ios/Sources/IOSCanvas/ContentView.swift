import SwiftUI

struct ContentView: View {
    @State private var selection: WorkspaceSection? = .canvas

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                Section("編集") {
                    Label("キャンバス", systemImage: "square.on.square")
                        .tag(WorkspaceSection.canvas)
                    Label("SwiftUI構造", systemImage: "list.bullet.indent")
                        .tag(WorkspaceSection.structure)
                }

                Section("確認") {
                    Label("M3E互換診断", systemImage: "arrow.triangle.2.circlepath")
                        .tag(WorkspaceSection.compatibility)
                }

                Section("プロジェクト") {
                    Label("設定", systemImage: "slider.horizontal.3")
                        .tag(WorkspaceSection.settings)
                }
            }
            .navigationTitle("S3E Canvas")
        } detail: {
            switch selection ?? .canvas {
            case .canvas:
                CanvasOverview(selection: $selection)
            case .structure:
                StructureView()
            case .compatibility:
                CompatibilityView()
            case .settings:
                SettingsView()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}

private enum WorkspaceSection: String, Hashable {
    case canvas
    case structure
    case compatibility
    case settings
}

private struct CanvasOverview: View {
    @Binding var selection: WorkspaceSection?
    @State private var previewMode = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("ホーム")
                        .font(.largeTitle.weight(.semibold))
                    Text("NavigationStack → ScrollView → VStack")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                PhonePreview(previewMode: $previewMode)

                GlassActionRow(previewMode: $previewMode, selection: $selection)

                VStack(alignment: .leading, spacing: 0) {
                    Text("現在の構造")
                        .font(.headline)
                        .padding(.bottom, 8)
                    StructureRow(symbol: "square.stack.3d.up", title: "NavigationStack", detail: "画面の土台", level: 0)
                    Divider()
                    StructureRow(symbol: "arrow.down", title: "ScrollView", detail: "スクロール領域", level: 1)
                    Divider()
                    StructureRow(symbol: "rectangle.stack", title: "VStack", detail: "画面の内容", level: 2)
                    Divider()
                    StructureRow(symbol: "textformat", title: "Text", detail: "はじめてのユーザーへ", level: 3)
                    Divider()
                    StructureRow(symbol: "rectangle.and.hand.point.up.left", title: "Button", detail: "続ける", level: 3)
                }
                .padding(.top, 4)
            }
            .padding(20)
        }
        .navigationTitle("キャンバス")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(previewMode ? "編集" : "プレビュー") {
                    previewMode.toggle()
                }
            }
        }
    }
}

private struct PhonePreview: View {
    @Binding var previewMode: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("9:41")
                    .font(.caption.weight(.semibold))
                Spacer()
                Image(systemName: "wifi")
                Image(systemName: "battery.100")
            }
            .foregroundStyle(.white)

            Text("ホーム")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.white)

            Image(systemName: "house")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 6) {
                Text("はじめてのユーザーへ")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white)
                Text("このアプリはSwiftUIの一例です。")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.8))
            }

            Spacer(minLength: 4)

            Button(previewMode ? "プレビュー中" : "続ける") {
                previewMode.toggle()
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .padding(24)
        .frame(maxWidth: 340, minHeight: 450, alignment: .topLeading)
        .background(.black, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(.white.opacity(0.2), lineWidth: 1)
        }
        .frame(maxWidth: .infinity)
    }
}

@ViewBuilder
private func GlassActionRow(previewMode: Binding<Bool>, selection: Binding<WorkspaceSection?>) -> some View {
    if #available(iOS 26.0, *) {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                Button(previewMode.wrappedValue ? "編集に戻る" : "プレビュー") {
                    previewMode.wrappedValue.toggle()
                }
                .buttonStyle(.glassProminent)

                Button("構造を確認") {
                    selection.wrappedValue = .structure
                }
                .buttonStyle(.glass)
            }
        }
    } else {
        HStack(spacing: 10) {
            Button(previewMode.wrappedValue ? "編集に戻る" : "プレビュー") {
                previewMode.wrappedValue.toggle()
            }
            .buttonStyle(.borderedProminent)

            Button("構造を確認") {
                selection.wrappedValue = .structure
            }
            .buttonStyle(.bordered)
        }
    }
}

private struct StructureView: View {
    var body: some View {
        List {
            Section("ホーム") {
                StructureRow(symbol: "square.stack.3d.up", title: "NavigationStack", detail: "画面の土台", level: 0)
                StructureRow(symbol: "arrow.down", title: "ScrollView", detail: "スクロール領域", level: 1)
                StructureRow(symbol: "rectangle.stack", title: "VStack", detail: "画面の内容", level: 2)
                StructureRow(symbol: "textformat", title: "Text", detail: "はじめてのユーザーへ", level: 3)
                StructureRow(symbol: "rectangle.and.hand.point.up.left", title: "Button", detail: "続ける", level: 3)
            }
        }
        .navigationTitle("SwiftUI構造")
    }
}

private struct CompatibilityView: View {
    var body: some View {
        List {
            Section {
                Label("互換異常", systemImage: "exclamationmark.triangle")
                Text("欠落した要素、未解決の遷移、不正な値を確認できます。")
                    .foregroundStyle(.secondary)
            } header: {
                Text("M3E互換診断")
            } footer: {
                Text("Webエディタで読み込んだM3E JSONの診断結果を、対象箇所へ戻って確認できます。")
            }

            Section("近似として保持") {
                Label("VStack / ScrollView", systemImage: "arrow.triangle.branch")
                Label("Liquid Glassの表示", systemImage: "circle.lefthalf.filled")
            }

            Section("異常がある場合") {
                Text("欠落した要素、未解決の遷移、読み込めない値はここで互換異常として表示します。")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("M3E互換診断")
    }
}

private struct SettingsView: View {
    @State private var notificationsEnabled = true
    @State private var accountName = ""

    var body: some View {
        Form {
            Section("プロジェクト") {
                TextField("プロジェクト名", text: $accountName)
                    .frame(minHeight: 44)
                LabeledContent("バージョン", value: "1.50.28")
            }

            Section("表示") {
                Toggle("互換診断を表示", isOn: $notificationsEnabled)
                    .frame(minHeight: 44)
            }
        }
        .navigationTitle("設定")
    }
}

private struct StructureRow: View {
    let symbol: String
    let title: String
    let detail: String
    let level: Int

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .frame(width: 22)
                .foregroundStyle(.secondary)
            Text(title)
                .font(.body.weight(.medium))
            Text(detail)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.leading, CGFloat(level) * 20)
        .frame(minHeight: 44)
    }
}

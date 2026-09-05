import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Build with structure.")
                        .font(.system(size: 28, weight: .semibold))
                    Text("Compose native SwiftUI patterns, then take the structure into code.")
                        .font(.body)

                    if #available(iOS 26.0, *) {
                        Button("Continue") {}
                            .buttonStyle(.glass)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    } else {
                        Button("Continue") {}
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }

                    NavigationLink("Explore settings") {
                        SettingsView()
                    }
                    .frame(minHeight: 44)
                }
                .padding()
            }
            .navigationTitle("Home")
        }
    }
}

private struct SettingsView: View {
    @State private var notificationsEnabled = false
    @State private var accountName = ""

    var body: some View {
        Form {
            Toggle("Notifications", isOn: $notificationsEnabled)
                .frame(minHeight: 44)
            TextField("Account name", text: $accountName)
                .textFieldStyle(.roundedBorder)
                .frame(minHeight: 44)
        }
        .navigationTitle("Settings")
    }
}

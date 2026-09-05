import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Build with structure.")
                        .font(.system(size: 28, weight: .semibold))
                    Text("Place a component from the left panel.")
                        .font(.system(size: 17))
                    Button("Continue") {}
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .padding()
            }
            .navigationTitle("Home")
        }
    }
}

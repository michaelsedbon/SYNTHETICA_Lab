import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    let appURL = URL(string: "http://localhost:3000")!
    
    func applicationDidFinishLaunching(_ aNotification: Notification) {
        setupMenu()
        setupWindow()
        setupWebView()
        loadApp()
    }

    func setupMenu() {
        let menu = NSMenu()
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "Reload", action: #selector(reloadApp), keyEquivalent: "r"))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Fab Planner Dev", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        
        let appMenuItem = NSMenuItem()
        appMenuItem.submenu = appMenu
        menu.addItem(appMenuItem)
        NSApp.mainMenu = menu
    }

    @objc func reloadApp() {
        webView.load(URLRequest(url: appURL))
    }

    func setupWindow() {
        let screenSize = NSScreen.main?.frame.size ?? NSSize(width: 1280, height: 800)
        let rect = NSRect(x: 0, y: 0, width: screenSize.width * 0.8, height: screenSize.height * 0.8)
        
        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        window.center()
        window.title = "Fab Planner — Dev"
        window.backgroundColor = .white
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        // Register JS-to-Swift message handler for downloads
        configuration.userContentController.add(self, name: "nativeDownload")
        
        webView = WKWebView(frame: window.contentView!.bounds, configuration: configuration)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        window.contentView?.addSubview(webView)
    }

    func loadApp() {
        webView.load(URLRequest(url: appURL))
    }

    // MARK: - WKScriptMessageHandler (JS → Swift download bridge)
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeDownload",
              let body = message.body as? [String: String],
              let urlString = body["url"],
              let filename = body["filename"] else {
            print("[Download] Invalid message body")
            return
        }
        
        guard let downloadURL = URL(string: urlString, relativeTo: appURL) else {
            print("[Download] Invalid URL: \(urlString)")
            return
        }
        
        print("[Download] Starting download: \(downloadURL.absoluteString) → \(filename)")
        downloadFile(from: downloadURL, filename: filename)
    }
    
    func downloadFile(from url: URL, filename: String) {
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                print("[Download] Failed: \(error?.localizedDescription ?? "unknown error")")
                return
            }
            
            let downloadsDir = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first!
            var savePath = downloadsDir.appendingPathComponent(filename)
            
            var counter = 1
            let nameWithoutExt = (filename as NSString).deletingPathExtension
            let ext = (filename as NSString).pathExtension
            while FileManager.default.fileExists(atPath: savePath.path) {
                let newName = ext.isEmpty ? "\(nameWithoutExt) (\(counter))" : "\(nameWithoutExt) (\(counter)).\(ext)"
                savePath = downloadsDir.appendingPathComponent(newName)
                counter += 1
            }
            
            do {
                try data.write(to: savePath)
                print("[Download] Saved: \(savePath.path) (\(data.count) bytes)")
                DispatchQueue.main.async {
                    NSWorkspace.shared.selectFile(savePath.path, inFileViewerRootedAtPath: "")
                }
            } catch {
                print("[Download] Save failed: \(error.localizedDescription)")
            }
        }
        task.resume()
    }

    // MARK: - Navigation delegate
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let response = navigationResponse.response as? HTTPURLResponse,
           let contentDisposition = response.value(forHTTPHeaderField: "Content-Disposition"),
           contentDisposition.contains("attachment") {
            var filename = "download"
            if let range = contentDisposition.range(of: "filename=\"") {
                let start = range.upperBound
                if let end = contentDisposition[start...].firstIndex(of: "\"") {
                    filename = String(contentDisposition[start..<end])
                }
            }
            if let url = response.url {
                decisionHandler(.cancel)
                downloadFile(from: url, filename: filename)
                return
            }
        }
        decisionHandler(.allow)
    }

    // MARK: - JavaScript dialogs
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Fab Planner Dev"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Fab Planner Dev"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        let response = alert.runModal()
        completionHandler(response == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("Connection failed: \(error.localizedDescription). Retrying in 2s...")
        
        let html = "<html><body style='background:#1a1a1a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'><div><h1 style='color:#007aff;'>Fab Planner Dev</h1><p>Connecting to dev server... (Retrying)</p></div></body></html>"
        webView.loadHTMLString(html, baseURL: nil)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.loadApp()
        }
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()

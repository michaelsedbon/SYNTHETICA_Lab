import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
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
        appMenu.addItem(NSMenuItem(title: "Quit Fab Planner", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        
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
        window.title = "Fab Planner"
        window.backgroundColor = .white
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        webView = WKWebView(frame: window.contentView!.bounds, configuration: configuration)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        window.contentView?.addSubview(webView)
    }

    func loadApp() {
        webView.load(URLRequest(url: appURL))
    }

    // Handle JS alert()
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Fab Planner"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    // Handle JS confirm()
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = "Fab Planner"
        alert.informativeText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        let response = alert.runModal()
        completionHandler(response == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        // If we failed to reach the server, it might still be starting. Retry in 2 seconds.
        print("Connection failed: \(error.localizedDescription). Retrying in 2s...")
        
        // Show a simple loading message on screen
        let html = "<html><body style='background:#1a1a1a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'><div><h1>Fab Planner</h1><p>Connecting to production server... (Retrying)</p></div></body></html>"
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

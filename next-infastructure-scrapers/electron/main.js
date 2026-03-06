// electron/main.js — VoxCode Desktop Overlay
// Transparent, always-on-top floating bar that runs on your OS desktop.
// Launch: npm run electron:dev (dev) or npm run electron:start (production)

const {
  app, BrowserWindow, ipcMain, Tray, Menu,
  nativeImage, screen, globalShortcut, clipboard,
} = require("electron");
const { exec } = require("child_process");
const path = require("path");

const NEXT_PORT  = process.env.PORT || 3000;
const NEXT_URL   = `http://localhost:${NEXT_PORT}/overlay`;
const IS_DEV     = process.env.NODE_ENV !== "production";

let overlayWin = null;
let tray       = null;
let isVisible  = true;

// ── Create the floating overlay window ──────────────────────────────────────
function createOverlay() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  overlayWin = new BrowserWindow({
    // Position: top-center of screen
    width:  540,
    height: 62,
    x:      Math.round(width / 2 - 270),
    y:      10,

    // Appearance
    frame:           false,
    transparent:     true,
    vibrancy:        "ultra-dark",      // macOS frosted glass
    backgroundMaterial: "acrylic",     // Windows 11 acrylic blur
    hasShadow:       true,
    roundedCorners:  true,

    // Behavior — focusable so clicks work, but we return focus via clipboard trick
    alwaysOnTop:     true,
    skipTaskbar:     true,
    resizable:       false,
    movable:         true,
    focusable:       true,

    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // Keep it above full-screen apps
  overlayWin.setAlwaysOnTop(true, "screen-saver", 3);
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWin.loadURL(NEXT_URL);

  if (IS_DEV) overlayWin.webContents.openDevTools({ mode: "detach" });

  overlayWin.on("closed", () => { overlayWin = null; });
}

// ── Type text into the previously focused app via clipboard + paste ──────────
// Works on Windows/macOS/Linux without any native modules.
function typeTextIntoFocusedApp(text) {
  if (!text || !text.trim()) return;

  const prev = clipboard.readText();       // save clipboard
  clipboard.writeText(text.trim());

  // Small delay so the OS processes the clipboard write, then simulate Ctrl+V
  setTimeout(() => {
    if (process.platform === "win32") {
      // Windows: PowerShell SendKeys — pastes without stealing focus
      exec(
        `powershell -WindowStyle Hidden -Command ` +
        `"Add-Type -AssemblyName System.Windows.Forms; ` +
        `[System.Windows.Forms.SendKeys]::SendWait('^v')"`,
        () => { /* restore clipboard */ setTimeout(() => clipboard.writeText(prev), 500); }
      );
    } else if (process.platform === "darwin") {
      // macOS: osascript keystroke
      exec(
        `osascript -e 'tell application "System Events" to keystroke "v" using command down'`,
        () => { setTimeout(() => clipboard.writeText(prev), 500); }
      );
    } else {
      // Linux: xdotool
      exec(
        `xdotool key --clearmodifiers ctrl+v`,
        () => { setTimeout(() => clipboard.writeText(prev), 500); }
      );
    }
  }, 180);
}

// ── System tray icon ─────────────────────────────────────────────────────────
function createTray() {
  try {
    tray = new Tray(nativeImage.createEmpty());
  } catch {
    tray = new Tray(nativeImage.createEmpty());
  }

  tray.setToolTip("VoxCode — Voice Coding  (Ctrl+Shift+V)");

  const menu = Menu.buildFromTemplate([
    { label: "VoxCode Desktop", enabled: false },
    { type: "separator" },
    {
      label: "Show / Hide  (Ctrl+Shift+V)",
      click: toggleOverlay,
    },
    {
      label: "Open in browser",
      click: () => {
        const { shell } = require("electron");
        shell.openExternal(`http://localhost:${NEXT_PORT}`);
      },
    },
    { type: "separator" },
    { label: "Quit VoxCode", click: () => app.quit() },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", toggleOverlay);
}

function toggleOverlay() {
  if (!overlayWin) { createOverlay(); return; }
  if (isVisible) {
    overlayWin.hide();
    isVisible = false;
  } else {
    overlayWin.show();
    isVisible = true;
  }
}

// ── IPC handlers (renderer → main) ───────────────────────────────────────────
ipcMain.on("overlay:hide",   () => overlayWin?.hide());
ipcMain.on("overlay:show",   () => { overlayWin?.show(); });
ipcMain.on("overlay:resize", (_, { w, h }) => overlayWin?.setSize(w, h, true));
ipcMain.on("overlay:quit",   () => app.quit());

// KEY FEATURE: type finalized speech into the active app
ipcMain.on("overlay:type", (_, text) => {
  typeTextIntoFocusedApp(text);
});

// Move the window (called from drag handle in renderer)
ipcMain.on("overlay:startMove", () => {
  overlayWin?.moveTop();
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();

  createTray();

  // Global hotkey — Ctrl+Shift+V toggles listening without stealing focus
  globalShortcut.register("CommandOrControl+Shift+V", () => {
    if (!overlayWin) { createOverlay(); return; }
    if (!isVisible) { overlayWin.show(); isVisible = true; }
    // Tell the renderer to toggle mic
    overlayWin.webContents.send("vox:toggle");
  });

  const tryLoad = (retries = 20) => {
    const http = require("http");
    const req  = http.get(`http://localhost:${NEXT_PORT}`, () => { createOverlay(); });
    req.on("error", () => {
      if (retries > 0) setTimeout(() => tryLoad(retries - 1), 800);
      else createOverlay();
    });
    req.end();
  };

  if (IS_DEV) {
    setTimeout(() => tryLoad(), 3000);
  } else {
    createOverlay();
  }
});

app.on("window-all-closed", (e) => {
  // Keep running in tray
  e.preventDefault();
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
});

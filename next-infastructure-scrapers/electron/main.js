// electron/main.js — VoxCode Desktop Overlay
// Transparent, always-on-top floating bar that runs on your OS desktop.
// Launch: npm run electron:dev (dev) or npm run electron:start (production)

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require("electron");
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
    width:  520,
    height: 58,
    x:      Math.round(width / 2 - 260),
    y:      8,

    // Appearance
    frame:          false,
    transparent:    true,
    vibrancy:       "ultra-dark",   // macOS frosted glass
    backgroundMaterial: "acrylic", // Windows 11 acrylic
    hasShadow:      true,
    roundedCorners: true,

    // Behavior
    alwaysOnTop:    true,
    skipTaskbar:    true,
    resizable:      false,
    movable:        true,
    focusable:      true,

    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // Keep it always-on-top even above full-screen apps (level 3)
  overlayWin.setAlwaysOnTop(true, "screen-saver", 3);
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWin.loadURL(NEXT_URL);

  if (IS_DEV) overlayWin.webContents.openDevTools({ mode: "detach" });

  overlayWin.on("closed", () => { overlayWin = null; });
}

// ── System tray icon ─────────────────────────────────────────────────────────
function createTray() {
  // 16×16 cyan "V" icon as a data URL (no PNG file needed)
  const iconDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA" +
    "iklEQVQ4jWNgYGD4z8BAAAABAAEFBcgLAAAABmJLR0QA/wD/AP+gvaeTAAAAIklEQVQ4jWNg" +
    "YGD4TyIGAAC0AAIFBcgLAAAABmJLR0QA/wD/AP+gvaeTAAAAH0lEQVQ4jWNgYGBgJJEGAAC1" +
    "AAEFBcgLAAAABmJLR0QA/wD/AP+gvaeTAAAAGElEQVQ4y2NgYGD4TwoGAAC2AAIFBcgLAAAA";

  const img = nativeImage.createEmpty();
  // Use a simple fallback icon if custom one fails
  try {
    tray = new Tray(img);
  } catch {
    tray = new Tray(nativeImage.createEmpty());
  }

  tray.setToolTip("VoxCode — Voice Coding SaaS");

  const menu = Menu.buildFromTemplate([
    {
      label: "VoxCode Desktop",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Show / Hide overlay",
      accelerator: "CmdOrCtrl+Shift+V",
      click: toggleOverlay,
    },
    {
      label: "Open VoxCode in browser",
      click: () => {
        const { shell } = require("electron");
        shell.openExternal(`http://localhost:${NEXT_PORT}`);
      },
    },
    { type: "separator" },
    {
      label: "Quit VoxCode",
      click: () => app.quit(),
    },
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
    overlayWin.focus();
    isVisible = true;
  }
}

// ── IPC handlers (called from renderer via preload) ──────────────────────────
ipcMain.on("overlay:hide",   () => overlayWin?.hide());
ipcMain.on("overlay:show",   () => { overlayWin?.show(); overlayWin?.focus(); });
ipcMain.on("overlay:resize", (_, { w, h }) => overlayWin?.setSize(w, h, true));
ipcMain.on("overlay:quit",   () => app.quit());

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Don't show in macOS dock
  if (process.platform === "darwin") app.dock.hide();

  createTray();

  // Wait for Next.js to be ready (dev mode) then create window
  const tryLoad = (retries = 20) => {
    const http = require("http");
    const req  = http.get(`http://localhost:${NEXT_PORT}`, () => {
      createOverlay();
    });
    req.on("error", () => {
      if (retries > 0) setTimeout(() => tryLoad(retries - 1), 800);
      else createOverlay(); // try anyway
    });
    req.end();
  };

  if (IS_DEV) {
    setTimeout(() => tryLoad(), 3000); // give Next.js time to start
  } else {
    createOverlay();
  }
});

app.on("window-all-closed", (e) => {
  // Keep running in tray even when window is closed
  e.preventDefault();
});

app.on("before-quit", () => {
  tray?.destroy();
});

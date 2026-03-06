// electron/preload.js — safe IPC bridge for the overlay page
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voxcodeDesktop", {
  // Window controls
  hide:   ()         => ipcRenderer.send("overlay:hide"),
  show:   ()         => ipcRenderer.send("overlay:show"),
  resize: (w, h)     => ipcRenderer.send("overlay:resize", { w, h }),
  quit:   ()         => ipcRenderer.send("overlay:quit"),

  // KEY FEATURE: send finalized speech → main types it into the focused app
  type:   (text)     => ipcRenderer.send("overlay:type", text),

  // Global hotkey toggle (Ctrl+Shift+V from main → renderer)
  onToggle: (cb)     => {
    ipcRenderer.on("vox:toggle", cb);
    // Return cleanup function
    return () => ipcRenderer.removeListener("vox:toggle", cb);
  },

  isDesktop: true,
});

// electron/preload.js — safe IPC bridge for the overlay page
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voxcodeDesktop", {
  hide:   ()         => ipcRenderer.send("overlay:hide"),
  show:   ()         => ipcRenderer.send("overlay:show"),
  resize: (w, h)     => ipcRenderer.send("overlay:resize", { w, h }),
  quit:   ()         => ipcRenderer.send("overlay:quit"),
  isDesktop: true,
});

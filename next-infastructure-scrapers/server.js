// server.js — Custom Node.js entry point for Hostinger
// This file lets Hostinger's Node.js hosting launch the app with: node server.js
// It also works with PM2: pm2 start server.js --name openclaw

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const app    = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, host, (err) => {
    if (err) throw err;
    console.log(`> VoxCode ready on http://${host}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV || "development"}`);
  });
});

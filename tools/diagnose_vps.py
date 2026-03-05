#!/usr/bin/env python3
"""Deep diagnostic: run server directly and capture full output."""
import time

SSH_HOST   = "46.202.197.97"
SSH_PORT   = 65002
SSH_USER   = "u142089309"
SSH_PASS   = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"
NODE       = "/opt/alt/alt-nodejs22/root/usr/bin/node"
PM2        = "/home/u142089309/.local/bin/pm2"

def connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=30)
    return c

def run(c, cmd, timeout=30):
    _, out, err = c.exec_command(cmd, timeout=timeout)
    o = out.read().decode(errors="replace").strip()
    e = err.read().decode(errors="replace").strip()
    print(f"$ {cmd[:120]}")
    if o: print(o[-1000:])
    if e: print(f"STDERR: {e[-500:]}")
    return o, e

c = connect()
print("Connected\n")

print("=== start.sh contents ===")
run(c, f"cat {REMOTE_DIR}/start.sh")

print("\n=== .next dir ===")
run(c, f"ls {REMOTE_DIR}/.next/")

print("\n=== .next/server ===")
run(c, f"ls {REMOTE_DIR}/.next/server/")

print("\n=== BUILD_ID ===")
run(c, f"cat {REMOTE_DIR}/.next/BUILD_ID")

print("\n=== Full PM2 error log ===")
run(c, f"cat ~/.pm2/logs/openclaw-error.log 2>/dev/null | tail -50")

print("\n=== Full PM2 out log ===")
run(c, f"cat ~/.pm2/logs/openclaw-out.log 2>/dev/null | tail -50")

print("\n=== Run node server.js directly (5s) ===")
# Kill PM2 first
run(c, f"PATH={NODE.rsplit('/', 1)[0]}:/home/{SSH_USER}/.local/bin:$PATH {PM2} stop openclaw 2>/dev/null; true")
run(c, "pkill -f 'node.*server' 2>/dev/null; true")
time.sleep(2)

# Run directly and capture output
_, out, err = c.exec_command(
    f"cd {REMOTE_DIR} && NODE_ENV=production PORT=3001 {NODE} server.js > /tmp/srv.log 2>&1 &",
    timeout=5
)
out.read(); err.read()
time.sleep(6)

print("--- After 6s, checking port 3001 ---")
run(c, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001")

print("\n--- server output ---")
run(c, "cat /tmp/srv.log 2>/dev/null")

print("\n=== node_modules/next version ===")
run(c, f"cat {REMOTE_DIR}/node_modules/next/package.json | grep '\"version\"' | head -1")

print("\n=== package.json next version ===")
run(c, f"cat {REMOTE_DIR}/package.json | grep next")

c.close()

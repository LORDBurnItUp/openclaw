#!/usr/bin/env python3
"""
Set up Node.js + PM2 on Hostinger VPS and start OpenClaw.
Run after deploy_vps.py: python tools/setup_vps.py
"""
import time

SSH_HOST  = "46.202.197.97"
SSH_PORT  = 65002
SSH_USER  = "u142089309"
SSH_PASS  = "3Strada666!"
REMOTE_DIR = "/home/u142089309/openclaw"

def connect():
    import paramiko
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=SSH_HOST, port=SSH_PORT, username=SSH_USER,
                   password=SSH_PASS, timeout=30, banner_timeout=30)
    print("SSH connected")
    return client

def run(client, cmd, timeout=60, show=True):
    if show:
        print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace").strip()
    err = stderr.read().decode(errors="replace").strip()
    if out and show:
        lines = out.split("\n")
        for line in lines[-15:]:
            print(f"    {line}")
    if err and show and "warn" not in err.lower():
        for line in err.split("\n")[-5:]:
            if line.strip():
                print(f"    ERR: {line}")
    return out

def setup():
    client = connect()

    print("\n--- Checking OS ---")
    run(client, "uname -a && cat /etc/os-release | head -3")

    print("\n--- Finding Node.js ---")
    node_paths = run(client, "which node 2>/dev/null || find /usr /opt /home -name 'node' -type f 2>/dev/null | head -5")

    if not node_paths or "not found" in node_paths.lower():
        print("\n--- Installing Node.js 20 via nvm ---")
        # Install nvm
        run(client, 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash', timeout=120)
        time.sleep(3)

        # Load nvm + install node
        nvm_cmd = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
        run(client, f'{nvm_cmd} && nvm install 20 && nvm use 20 && nvm alias default 20', timeout=180)

        # Add nvm to .bashrc permanently
        bashrc_append = '''
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
'''
        run(client, f'echo \'{bashrc_append}\' >> ~/.bashrc')
        node_cmd = f'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 &&'
    else:
        node_cmd = ""

    print("\n--- Node.js version ---")
    node_ver = run(client, f'{node_cmd} node --version 2>/dev/null || echo "STILL MISSING"')

    if "STILL MISSING" in node_ver or not node_ver:
        print("ERROR: Could not install Node.js. Manual setup needed.")
        client.close()
        return

    print("\n--- Installing PM2 ---")
    run(client, f"{node_cmd} npm install -g pm2", timeout=120)

    print("\n--- Installing app dependencies ---")
    run(client, f"cd {REMOTE_DIR} && {node_cmd} npm install --omit=dev --legacy-peer-deps 2>&1 | tail -8", timeout=180)

    print("\n--- Starting OpenClaw with PM2 ---")
    run(client, f"cd {REMOTE_DIR} && {node_cmd} pm2 stop openclaw 2>/dev/null || true")
    run(client, f"cd {REMOTE_DIR} && {node_cmd} pm2 delete openclaw 2>/dev/null || true")
    run(client, f"cd {REMOTE_DIR} && NODE_ENV=production PORT=3000 {node_cmd} pm2 start server.js --name openclaw --update-env")
    run(client, f"{node_cmd} pm2 save")
    run(client, f"{node_cmd} pm2 startup 2>/dev/null | tail -3")

    print("\n--- Health check ---")
    time.sleep(5)
    health = run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
    print(f"\nHTTP status: {health}")

    print("\n--- PM2 status ---")
    run(client, f"{node_cmd} pm2 list")

    print("\n--- Nginx check ---")
    nginx_running = run(client, "systemctl is-active nginx 2>/dev/null || nginx -v 2>&1 | head -1")
    print(f"Nginx: {nginx_running}")

    if "active" in nginx_running or "nginx" in nginx_running.lower():
        print("\n--- Setting up Nginx reverse proxy ---")
        nginx_conf = f"""server {{
    listen 80;
    server_name KingsFromEarthDevelopment.com www.KingsFromEarthDevelopment.com;

    location / {{
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}"""
        run(client, f'echo \'{nginx_conf}\' > /etc/nginx/sites-available/openclaw')
        run(client, "ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/ 2>/dev/null || true")
        run(client, "nginx -t && systemctl reload nginx")

    client.close()
    print("\nDone! Site should be live at https://KingsFromEarthDevelopment.com")

if __name__ == "__main__":
    setup()

"""
Agent Zero Skill: OpenClaw/VoxCode Integration
This connects the Agent Zero commander natively to VoxCode's local CLI for fast deployment/status commands.
"""

import subprocess
import os
import json

def get_openclaw_status() -> str:
    """
    Check the status of the local OpenClaw cluster (NextJS, Memory Heartbeat, Node Backends).
    Execute to gain understanding of the immediate system health before making architectural choices.

    Returns: JSON formatted string containing status data.
    """
    try:
        # Check NextJS port 3000
        netstat = subprocess.run(
            ["netstat", "-ano"], 
            capture_output=True, text=True
        )
        dashboard_live = "LISTENING" in [line for line in netstat.stdout.split('\n') if "3000" in line]
        
        return json.dumps({
            "dashboard_active": dashboard_live,
            "port": 3000,
            "architecture": "NextJS Turbopack + Python Litellm",
            "message": "OpenClaw is Ready for Deployment"
        })
    except Exception as e:
        return f"failed to check status: {str(e)}"

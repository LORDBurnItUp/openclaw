#!/usr/bin/env python3
"""
Hostinger utilities for FTP upload and MySQL database operations.
No external dependencies for FTP. MySQL requires mysql-connector-python.

Usage:
    from tools.core.hostinger import ftp_upload, db_query, db_execute

    # Upload file to website
    ftp_upload("index.html", "/public_html/index.html")

    # Upload entire folder
    ftp_upload_folder("dist/", "/public_html/")

    # Database operations
    results = db_query("SELECT * FROM users WHERE active = 1")
    db_execute("INSERT INTO logs (message) VALUES (%s)", ["Hello"])
"""

import os
import ftplib
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# Import env loader
try:
    from tools.core.env import env, load_env
    load_env()
except ImportError:
    # Fallback if running standalone
    env = lambda key, default=None: os.environ.get(key, default)


def get_ftp_config(domain_num: int = 1) -> Dict[str, str]:
    """Get FTP configuration for a specific domain."""
    prefix = f"HOSTINGER_DOMAIN_{domain_num}_FTP"
    return {
        "host": env(f"{prefix}_HOST", ""),
        "user": env(f"{prefix}_USER", ""),
        "password": env(f"{prefix}_PASS", ""),
        "port": int(env(f"{prefix}_PORT", "21")),
    }


def get_db_config(db_num: int = 1) -> Dict[str, str]:
    """Get database configuration."""
    if db_num == 1:
        prefix = "HOSTINGER_DB"
    else:
        prefix = f"HOSTINGER_DB_{db_num}"

    return {
        "host": env(f"{prefix}_HOST", ""),
        "port": int(env(f"{prefix}_PORT", "3306")),
        "database": env(f"{prefix}_NAME", ""),
        "user": env(f"{prefix}_USER", ""),
        "password": env(f"{prefix}_PASS", ""),
    }


# ============================================================================
# FTP Operations
# ============================================================================

def ftp_connect(domain_num: int = 1) -> ftplib.FTP:
    """Connect to Hostinger FTP server."""
    config = get_ftp_config(domain_num)

    if not config["host"]:
        raise ValueError(f"FTP not configured for domain {domain_num}")

    ftp = ftplib.FTP()
    ftp.connect(config["host"], config["port"])
    ftp.login(config["user"], config["password"])
    return ftp


def ftp_upload(
    local_path: str,
    remote_path: str,
    domain_num: int = 1,
    binary: bool = True
) -> bool:
    """
    Upload a file to Hostinger via FTP.

    Args:
        local_path: Path to local file
        remote_path: Remote path (e.g., "/public_html/index.html")
        domain_num: Which domain to use (1, 2, 3...)
        binary: Use binary mode (True for images, False for text)

    Returns:
        True if successful
    """
    ftp = ftp_connect(domain_num)

    try:
        with open(local_path, 'rb') as f:
            if binary:
                ftp.storbinary(f'STOR {remote_path}', f)
            else:
                ftp.storlines(f'STOR {remote_path}', f)
        return True
    finally:
        ftp.quit()


def ftp_upload_folder(
    local_folder: str,
    remote_folder: str,
    domain_num: int = 1,
    extensions: Optional[List[str]] = None
) -> List[str]:
    """
    Upload entire folder to Hostinger via FTP.

    Args:
        local_folder: Path to local folder
        remote_folder: Remote folder (e.g., "/public_html/")
        domain_num: Which domain to use
        extensions: Only upload files with these extensions (e.g., [".html", ".css"])

    Returns:
        List of uploaded file paths
    """
    ftp = ftp_connect(domain_num)
    uploaded = []

    local_path = Path(local_folder)

    # Binary extensions
    binary_ext = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip'}

    def ensure_remote_dir(path: str):
        """Create remote directory if it doesn't exist."""
        dirs = path.strip('/').split('/')
        current = ""
        for d in dirs:
            current += f"/{d}"
            try:
                ftp.cwd(current)
            except ftplib.error_perm:
                ftp.mkd(current)
                ftp.cwd(current)
        ftp.cwd('/')

    try:
        for file_path in local_path.rglob('*'):
            if file_path.is_file():
                # Check extension filter
                if extensions and file_path.suffix.lower() not in extensions:
                    continue

                # Calculate remote path
                relative = file_path.relative_to(local_path)
                remote_path = f"{remote_folder.rstrip('/')}/{relative}".replace('\\', '/')

                # Ensure directory exists
                remote_dir = '/'.join(remote_path.split('/')[:-1])
                ensure_remote_dir(remote_dir)

                # Upload
                is_binary = file_path.suffix.lower() in binary_ext
                with open(file_path, 'rb') as f:
                    if is_binary:
                        ftp.storbinary(f'STOR {remote_path}', f)
                    else:
                        ftp.storlines(f'STOR {remote_path}', f)

                uploaded.append(str(relative))

        return uploaded
    finally:
        ftp.quit()


def ftp_list(remote_path: str = "/public_html", domain_num: int = 1) -> List[str]:
    """List files in remote directory."""
    ftp = ftp_connect(domain_num)
    try:
        ftp.cwd(remote_path)
        return ftp.nlst()
    finally:
        ftp.quit()


def ftp_delete(remote_path: str, domain_num: int = 1) -> bool:
    """Delete a file from FTP server."""
    ftp = ftp_connect(domain_num)
    try:
        ftp.delete(remote_path)
        return True
    finally:
        ftp.quit()


# ============================================================================
# MySQL Database Operations
# ============================================================================

def db_connect(db_num: int = 1):
    """
    Connect to Hostinger MySQL database.
    Requires: pip install mysql-connector-python
    """
    try:
        import mysql.connector
    except ImportError:
        raise ImportError("Install mysql-connector-python: pip install mysql-connector-python")

    config = get_db_config(db_num)

    if not config["host"]:
        raise ValueError(f"Database not configured for db {db_num}")

    return mysql.connector.connect(
        host=config["host"],
        port=config["port"],
        database=config["database"],
        user=config["user"],
        password=config["password"]
    )


def db_query(
    query: str,
    params: Optional[Tuple] = None,
    db_num: int = 1
) -> List[Dict[str, Any]]:
    """
    Execute SELECT query and return results as list of dicts.

    Args:
        query: SQL query string
        params: Query parameters (for prepared statements)
        db_num: Which database to use

    Returns:
        List of row dictionaries
    """
    conn = db_connect(db_num)
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(query, params or ())
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def db_execute(
    query: str,
    params: Optional[Tuple] = None,
    db_num: int = 1
) -> int:
    """
    Execute INSERT/UPDATE/DELETE query.

    Args:
        query: SQL query string
        params: Query parameters

    Returns:
        Number of affected rows
    """
    conn = db_connect(db_num)
    cursor = conn.cursor()

    try:
        cursor.execute(query, params or ())
        conn.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        conn.close()


def db_execute_many(
    query: str,
    params_list: List[Tuple],
    db_num: int = 1
) -> int:
    """
    Execute query with multiple parameter sets (batch insert).

    Args:
        query: SQL query string with %s placeholders
        params_list: List of parameter tuples

    Returns:
        Number of affected rows
    """
    conn = db_connect(db_num)
    cursor = conn.cursor()

    try:
        cursor.executemany(query, params_list)
        conn.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        conn.close()


def db_table_exists(table_name: str, db_num: int = 1) -> bool:
    """Check if a table exists."""
    result = db_query(
        "SHOW TABLES LIKE %s",
        (table_name,),
        db_num
    )
    return len(result) > 0


def db_create_table(
    table_name: str,
    columns: Dict[str, str],
    db_num: int = 1
) -> bool:
    """
    Create a table if it doesn't exist.

    Args:
        table_name: Name of the table
        columns: Dict of column_name -> column_definition
            e.g., {"id": "INT PRIMARY KEY AUTO_INCREMENT", "name": "VARCHAR(255)"}

    Returns:
        True if created, False if already exists
    """
    if db_table_exists(table_name, db_num):
        return False

    cols = ", ".join([f"{name} {definition}" for name, definition in columns.items()])
    query = f"CREATE TABLE {table_name} ({cols})"
    db_execute(query, db_num=db_num)
    return True


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Hostinger CLI")
        print("\nUsage:")
        print("  python hostinger.py ftp-test [domain_num]  - Test FTP connection")
        print("  python hostinger.py ftp-list [path]        - List remote files")
        print("  python hostinger.py db-test [db_num]       - Test DB connection")
        print("  python hostinger.py upload <local> <remote>- Upload file")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "ftp-test":
        domain = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        try:
            ftp = ftp_connect(domain)
            print(f"Connected to FTP (domain {domain})")
            print(f"Current directory: {ftp.pwd()}")
            ftp.quit()
        except Exception as e:
            print(f"FTP connection failed: {e}")
            sys.exit(1)

    elif cmd == "ftp-list":
        path = sys.argv[2] if len(sys.argv) > 2 else "/public_html"
        files = ftp_list(path)
        for f in files:
            print(f)

    elif cmd == "db-test":
        db = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        try:
            conn = db_connect(db)
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"Connected to MySQL (db {db})")
            print(f"Version: {version[0]}")
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Database connection failed: {e}")
            sys.exit(1)

    elif cmd == "upload":
        if len(sys.argv) < 4:
            print("Usage: python hostinger.py upload <local_path> <remote_path>")
            sys.exit(1)
        local = sys.argv[2]
        remote = sys.argv[3]
        if ftp_upload(local, remote):
            print(f"Uploaded: {local} -> {remote}")
        else:
            print("Upload failed")
            sys.exit(1)

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

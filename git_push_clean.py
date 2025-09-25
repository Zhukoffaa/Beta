import argparse
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

IGNORE_TEMPLATE = r"""# ОС/IDE
.DS_Store
Thumbs.db
desktop.ini
.vscode/*
!.vscode/settings.json
.idea/
*.code-workspace

# Node/Electron
node_modules/
pnpm-lock.yaml
yarn.lock
npm-debug.log*
dist/
out/
build/
.cache/
.temp/

# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
*.egg-info/
.venv/
.env
.env.*
pip-wheel-metadata/

# Логи/отчёты/временные
logs/
*.log
*.tmp
*.temp
*.bak
backup/
reports/
coverage/
*.coverage
.cache/
*.swp

# Тестовые артефакты
test_images/
.playwright/
.pytest_cache/
.tox/

# Браузерные сборки/артефакты
renderer/**/.vite/
renderer/**/.parcel-cache/
renderer/**/.next/
renderer/**/.nuxt/

# Пакеты/архивы/бинарники
*.zip
*.7z
*.rar
*.tar
*.gz
*.bz2
*.xz
*.exe
*.msi

# Сервисные файлы
*.local
*.secret
*.pem
*.key
*.crt

# Постпроцессинг/конфиги, которые генерируются
.postcss-cache/
"""

def run(cmd, cwd=None, check=True):
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, shell=os.name=="nt")
    if check and p.returncode != 0:
        msg = f"Command failed: {' '.join(cmd) if isinstance(cmd, list) else cmd}\nSTDOUT:\n{p.stdout}\nSTDERR:\n{p.stderr}"
        raise RuntimeError(msg)
    return p

def ensure_git_repo(root, branch):
    git_dir = root / ".git"
    if not git_dir.exists():
        run(["git", "init", "-b", branch], cwd=root)
    else:
        run(["git", "rev-parse", "--git-dir"], cwd=root)

def set_user(root, name, email):
    if name:
        run(["git", "config", "user.name", name], cwd=root)
    if email:
        run(["git", "config", "user.email", email], cwd=root)

def ensure_ignore(root, overwrite):
    gi = root / ".gitignore"
    if overwrite or not gi.exists():
        gi.write_text(IGNORE_TEMPLATE, encoding="utf-8")

def set_remote(root, repo_url):
    remotes = run(["git", "remote"], cwd=root, check=False).stdout.strip().splitlines()
    if "origin" in remotes:
        run(["git", "remote", "set-url", "origin", repo_url], cwd=root)
    else:
        run(["git", "remote", "add", "origin", repo_url], cwd=root)

def untrack_ignored(root):
    run(["git", "rm", "-r", "--cached", "."], cwd=root)
    run(["git", "add", "."], cwd=root)

def stage_all(root):
    run(["git", "add", "-A"], cwd=root)

def has_staged(root):
    p = run(["git", "diff", "--cached", "--name-only"], cwd=root)
    return bool(p.stdout.strip())

def commit(root, message):
    run(["git", "commit", "-m", message], cwd=root)

def ensure_branch(root, branch):
    current = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=root).stdout.strip()
    if current != branch:
        run(["git", "checkout", "-B", branch], cwd=root)

def push(root, branch, set_upstream, force=False):
    if force:
        if set_upstream:
            run(["git", "push", "-u", "--force", "origin", branch], cwd=root)
        else:
            run(["git", "push", "--force", "origin", branch], cwd=root)
    else:
        if set_upstream:
            run(["git", "push", "-u", "origin", branch], cwd=root)
        else:
            run(["git", "push", "origin", branch], cwd=root)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--branch", default="main")
    parser.add_argument("--set-ignore", action="store_true")
    parser.add_argument("--force-untrack", action="store_true")
    parser.add_argument("--user-name", default=None)
    parser.add_argument("--user-email", default=None)
    parser.add_argument("--commit", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force-push", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    ensure_git_repo(root, args.branch)
    ensure_branch(root, args.branch)
    set_user(root, args.user_name, args.user_email)
    if args.set_ignore:
        ensure_ignore(root, overwrite=True)
    set_remote(root, args.repo)

    if args.force_untrack:
        untrack_ignored(root)
    else:
        stage_all(root)

    if not args.commit:
        args.commit = f"chore: initial clean push {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    if has_staged(root):
        if args.dry_run:
            sys.stdout.write("Dry-run: changes are staged but not committed/pushed.\n")
            sys.exit(0)
        commit(root, args.commit)
        push(root, args.branch, set_upstream=True, force=args.force_push)
        sys.stdout.write("Done: pushed clean repository.\n")
    else:
        sys.stdout.write("Nothing to commit. If мусор уже трекается, запустите с --force-untrack.\n")

if __name__ == "__main__":
    main()

"""Compatibility command for the portable Node website build."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent

if __name__ == '__main__':
    subprocess.run(['node', str(ROOT / 'build-website.js')], cwd=ROOT, check=True)

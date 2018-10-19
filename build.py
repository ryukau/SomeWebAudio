import argparse
import json
import os
import subprocess

from bs4 import BeautifulSoup
from pathlib import Path


def get_match(md_info, md_name):
    for info in md_info:
        if info["name"] == md_name:
            return info
    return None


def read_build_info(rebuild=False):
    if not rebuild and Path("build_info").exists():
        with open("build_info", "r") as build_info:
            return json.load(build_info)
    return []


parser = argparse.ArgumentParser()
parser.add_argument(
    "-r", "--rebuild", action='store_true', help="rebuild add file")
args = parser.parse_args()

with open("template.html", "r") as temp:
    template_html = temp.read()

md_info = read_build_info(args.rebuild)

for md in Path(".").iterdir():
    if md.suffix != ".md":
        continue

    if str(md).lower() == "readme.md":
        continue

    md_name = str(md)
    mtime = os.path.getmtime(md)
    info = get_match(md_info, md_name)
    if info is None:
        md_info.append({"name": md_name, "mtime": mtime})
    elif info["mtime"] == mtime:
        continue
    else:
        info["mtime"] = mtime

    print("Processing " + md_name)

    # Katex を使う時は ["pandoc", "-f", "markdown", "-t", "html5", "--katex", md]
    result = subprocess.run(
        ["pandoc", "-f", "markdown", "-t", "html5", md],
        stdout=subprocess.PIPE,
        encoding="utf-8")

    html = template_html.replace("<!-- replace me -->", result.stdout)

    with open(md.with_suffix(".html"), "w") as html_file:
        print(html, file=html_file)

with open("build_info", "w") as build_info:
    json.dump(md_info, build_info)

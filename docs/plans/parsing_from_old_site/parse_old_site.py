#!/usr/bin/env python3
"""Parse old Joomla horse/pony pages into base.json.

This is a one-off reproducible data extraction script for
docs/plans/parsing_from_old_site/base.json.
"""

from __future__ import annotations

import html
import json
import re
import sys
from collections import deque
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests


ROOT = Path(__file__).resolve().parent
STEP1 = ROOT / "step1.md"
OUTPUT = ROOT / "base.json"
REPORT = ROOT / "base.parse_report.json"
BASE_URL = "http://localhost:8080"
JOOMLA_ROOT = Path("/home/igor/projects/ad_joomla/src")


@dataclass
class PageSeed:
    kind: str
    title: str
    category: str | None
    path: str
    k2_item_id: str | None
    source: str = "step1"


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node"] = field(default_factory=list)
    text_parts: list[str] = field(default_factory=list)
    content: list[str | "Node"] = field(default_factory=list)
    parent: "Node | None" = None

    def attr(self, name: str) -> str | None:
        return self.attrs.get(name)

    def classes(self) -> set[str]:
        return set((self.attrs.get("class") or "").split())

    def has_class(self, name: str) -> bool:
        return name in self.classes()

    def descendants(self, tag: str | None = None) -> list["Node"]:
        out: list[Node] = []
        for child in self.children:
            if tag is None or child.tag == tag:
                out.append(child)
            out.extend(child.descendants(tag))
        return out

    def first(self, tag: str | None = None, *, cls: str | None = None, id_: str | None = None) -> "Node | None":
        for node in self.descendants(tag):
            if cls and not node.has_class(cls):
                continue
            if id_ and node.attr("id") != id_:
                continue
            return node
        return None

    def text(self, sep: str = " ") -> str:
        pieces: list[str] = []

        def walk(node: Node) -> None:
            if node.tag in {"br", "hr"}:
                pieces.append("\n")
                return
            for part in node.content:
                if isinstance(part, str):
                    pieces.append(part)
                    continue
                child = part
                if child.tag in {"p", "div", "tr", "li"} and pieces and pieces[-1] != "\n":
                    pieces.append("\n")
                walk(child)
                if child.tag in {"p", "div", "tr", "li"}:
                    pieces.append("\n")

        walk(self)
        raw = "".join(pieces)
        lines = [normalize_text(line) for line in raw.splitlines()]
        lines = [line for line in lines if line]
        if sep == "\n":
            return "\n".join(lines)
        return normalize_text(sep.join(lines))


class TreeBuilder(HTMLParser):
    VOID_TAGS = {"br", "hr", "img", "meta", "link", "input", "source", "area", "base", "col", "embed", "param", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k.lower(): v or "" for k, v in attrs}, parent=self.stack[-1])
        self.stack[-1].children.append(node)
        self.stack[-1].content.append(node)
        if node.tag not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for idx in range(len(self.stack) - 1, 0, -1):
            if self.stack[idx].tag == tag:
                del self.stack[idx:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].text_parts.append(data)
            self.stack[-1].content.append(data)


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    value = html.unescape(value).replace("\xa0", " ")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    return value.strip()


def normalize_animal_name(value: str | None, fallback: str = "") -> str:
    value = normalize_text(value) or fallback
    value = re.sub(r"\d+", "", value)
    value = re.sub(r"\s+[.,;:]+(?=\s|$)", " ", value)
    value = value.strip(" .,;:")
    value = normalize_text(value).lower()
    for index, char in enumerate(value):
        if char.isalpha():
            return value[:index] + char.upper() + value[index + 1 :]
    return value


def is_unknown_animal_name(value: Any) -> bool:
    return normalize_text(str(value or "")).casefold() == "неизвестно"


def null_unknown_name_nodes(value: Any) -> Any:
    if isinstance(value, dict):
        if is_unknown_animal_name(value.get("name")):
            return None
        return {key: null_unknown_name_nodes(item) for key, item in value.items()}
    if isinstance(value, list):
        return [null_unknown_name_nodes(item) for item in value]
    return value


def normalize_path(value: str | None) -> str | None:
    if not value:
        return None
    value = html.unescape(value.strip())
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc:
        if parsed.netloc == "localhost:8080":
            value = parsed.path
            if parsed.query:
                value += "?" + parsed.query
        else:
            return value
    if value.startswith(BASE_URL):
        value = value[len(BASE_URL) :]
    if not value.startswith("/") and not value.startswith("http"):
        value = "/" + value
    return value


def parse_date(text: str | None, warnings: list[str], context: str) -> str | None:
    text = normalize_text(text)
    if not text:
        return None
    match = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", text)
    if match:
        day, month, year = match.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"
    match = re.search(r"\b(18|19|20)\d{2}\b", text)
    if match:
        return match.group(0)
    warnings.append(f"{context}: unparsed date {text!r}")
    return None


def parse_sex(text: str | None, warnings: list[str], context: str) -> str | None:
    text = normalize_text(text).lower()
    if not text:
        return None
    if "жереб" in text or "мерин" in text:
        return "male"
    if "кобыл" in text:
        return "female"
    warnings.append(f"{context}: unparsed sex {text!r}")
    return None


def parse_step1() -> list[PageSeed]:
    rows: list[PageSeed] = []
    for line in STEP1.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 6 or not cells[0].isdigit():
            continue
        _, kind, title, category, path_cell, k2_item_id = cells
        path_match = re.search(r"`([^`]+)`", path_cell)
        rows.append(
            PageSeed(
                kind=kind,
                title=title,
                category=category,
                path=path_match.group(1) if path_match else path_cell,
                k2_item_id=k2_item_id,
            )
        )
    return rows


def parse_html(page_html: str) -> Node:
    parser = TreeBuilder()
    parser.feed(page_html)
    return parser.root


def attr_equals(node: Node, attr: str, value: str) -> bool:
    return node.attr(attr) == value


def meta_content(root: Node, *, prop: str | None = None, name: str | None = None) -> str | None:
    for node in root.descendants("meta"):
        if prop and attr_equals(node, "property", prop):
            return normalize_text(node.attr("content"))
        if name and attr_equals(node, "name", name):
            return normalize_text(node.attr("content"))
    return None


def title_text(root: Node) -> str | None:
    title = root.first("title")
    return title.text() if title else None


def item_title(root: Node) -> str | None:
    node = root.first(cls="itemTitle")
    return node.text() if node else None


def clean_name(value: str | None, fallback: str) -> str:
    value = normalize_text(value) or fallback
    value = re.sub(r"\s+-\s+.*$", "", value)
    return normalize_animal_name(value, fallback)


def choose_name(root: Node, fallback: str) -> str:
    meta_name = meta_content(root, prop="og:title") or title_text(root)
    visible_name = item_title(root)
    if visible_name and not re.search(r"[А-Яа-яЁё]", meta_name or "") and re.search(r"[А-Яа-яЁё]", visible_name):
        return clean_name(visible_name, fallback)
    return clean_name(meta_name or visible_name, fallback)


def local_join(path: str) -> str:
    return urljoin(BASE_URL, path)


def find_first_table(item: Node) -> Node | None:
    for child in item.children:
        if child.tag == "table":
            return child
        for nested in child.descendants("table"):
            return nested
    return None


def find_right_card_cell(table: Node | None) -> Node | None:
    if not table:
        return None
    cells = table.descendants("td")
    meaningful = [cell for cell in cells if normalize_text(cell.text())]
    if not meaningful:
        return None
    scored = []
    for cell in meaningful:
        text = cell.text()
        score = sum(1 for label in ("Порода", "Пол", "Дата рождения", "Масть", "Высота") if label in text)
        scored.append((score, len(text), cell))
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return scored[0][2] if scored[0][0] else meaningful[-1]


def extract_card_fields(cell: Node | None) -> dict[str, str]:
    if not cell:
        return {}
    labels = ["Порода", "Пол", "Дата рождения", "Масть", "Высота в холке"]
    field_source = cell
    for paragraph in cell.descendants("p"):
        paragraph_text = paragraph.text("\n")
        if sum(1 for label in labels if label in paragraph_text) >= 2:
            field_source = paragraph
            break
    text = field_source.text("\n")
    pattern = "|".join(re.escape(label) for label in labels)
    label_re = rf"({pattern})\s*:\s*"
    flat = re.sub(r"\s+", " ", text)
    result: dict[str, str] = {}
    for match in re.finditer(label_re, flat):
        label = match.group(1)
        start = match.end()
        next_match = re.search(label_re, flat[start:])
        end = start + next_match.start() if next_match else len(flat)
        value = normalize_text(flat[start:end])
        value = re.sub(r"\s*(?:_{4,}|-{4,}|—{2,}).*$", "", value).strip()
        result[label] = value
    return result


def extract_description_and_services(cell: Node | None) -> tuple[str | None, list[str], list[str]]:
    warnings: list[str] = []
    if not cell:
        return None, [], ["missing card cell for description/services"]
    description_parts: list[str] = []
    services: list[str] = []
    service_labels = ("Предлагается к случке", "Продается", "Продана", "Продан")
    for caption in [node for node in cell.descendants("div") if node.has_class("caption")]:
        text = caption.text("\n")
        text = re.sub(r"^[\s_\-—]+$", "", text).strip()
        if not text:
            continue
        compact = normalize_text(text)
        service_hit = False
        for label in service_labels:
            match = re.search(rf"{re.escape(label)}\s*:\s*(.*)", compact)
            if match:
                service_hit = True
                after = normalize_text(match.group(1))
                if after:
                    services.append(f"{label}: {after}")
                else:
                    warnings.append(f"empty service/status label {label!r}")
                break
        if not service_hit:
            description_parts.append(compact)
    description = normalize_text(" ".join(description_parts)) or None
    return description, services, warnings


def extract_photos(item: Node, page_html: str, warnings: list[str]) -> list[str]:
    photos: list[str] = []
    for link in item.descendants("a"):
        href = link.attr("href")
        if href and link.has_class("sigProLink"):
            photos.append(normalize_path(href) or href)
    if not photos:
        for folder in re.findall(r"\{gallery\}([^{}:]+)(?::[^{}]*)?\{/gallery\}", page_html):
            image_dir = JOOMLA_ROOT / "images" / folder.replace("\\", "/").strip("/").removeprefix("images/")
            if image_dir.is_dir():
                for img in sorted(image_dir.iterdir()):
                    if img.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
                        photos.append("/images/" + str(img.relative_to(JOOMLA_ROOT / "images")))
    out: list[str] = []
    seen = set()
    for photo in photos:
        if photo not in seen:
            out.append(photo)
            seen.add(photo)
    if not out:
        warnings.append("no sigPro/gallery photos found")
    return out


def table_after_heading(item: Node, heading: str) -> Node | None:
    descendants = item.descendants()
    for idx, node in enumerate(descendants):
        if node.tag not in {"p", "span", "strong", "em", "h1", "h2", "h3", "h4"}:
            continue
        if heading in node.text():
            for next_node in descendants[idx + 1 :]:
                if next_node.tag == "table":
                    return next_node
    return None


def build_grid(table: Node) -> list[list[Node | None]]:
    rows = table.descendants("tr")
    grid: list[list[Node | None]] = []
    active: dict[int, tuple[int, Node]] = {}
    for row_idx, row in enumerate(rows):
        cells = [child for child in row.children if child.tag in {"td", "th"}]
        grid_row: list[Node | None] = []
        col = 0
        for cell in cells:
            while col in active:
                remaining, active_cell = active[col]
                grid_row.append(active_cell)
                remaining -= 1
                if remaining:
                    active[col] = (remaining, active_cell)
                else:
                    del active[col]
                col += 1
            rowspan = int(cell.attr("rowspan") or "1") if (cell.attr("rowspan") or "1").isdigit() else 1
            colspan = int(cell.attr("colspan") or "1") if (cell.attr("colspan") or "1").isdigit() else 1
            for _ in range(colspan):
                grid_row.append(cell)
                if rowspan > 1:
                    active[col] = (rowspan - 1, cell)
                col += 1
        while col in active:
            remaining, active_cell = active[col]
            grid_row.append(active_cell)
            remaining -= 1
            if remaining:
                active[col] = (remaining, active_cell)
            else:
                del active[col]
            col += 1
        grid.append(grid_row)
    return grid


def extract_cell_node(cell: Node | None, warnings: list[str], context: str) -> dict[str, Any] | None:
    if not cell:
        return None
    text = cell.text("\n")
    if not text:
        return None
    link = cell.first("a")
    name = link.text() if link else re.split(r"[,;\n]", text, maxsplit=1)[0]
    name = normalize_animal_name(name)
    if not name:
        return None
    path = normalize_path(link.attr("href")) if link and link.attr("href") else None
    photos = [
        normalize_path(img.attr("src")) or img.attr("src")
        for img in cell.descendants("img")
        if img.attr("src") and "transparent.gif" not in (img.attr("src") or "")
    ]
    lines = [line for line in text.splitlines() if normalize_text(line)]
    owner_parts: list[str] = []
    for line in lines[1:]:
        norm = normalize_text(line)
        if re.search(r"\b(18|19|20)\d{2}\b", norm):
            continue
        if re.search(r"\b(?:гн|вор|рыж|т\.-гн|бул|кар|сер|савр|пег|SPOTTED)\.?\b", norm, re.I):
            continue
        owner_parts.append(norm)
    color_match = re.search(r"\b(т\.-гн\.|гн\.|вор\.|рыж\.|бул\.|кар\.|сер\.|савр\.|пег\.|SPOTTED)\b", text, re.I)
    return {
        "name": name,
        "path": path,
        "photos": dedupe([photo for photo in photos if photo]),
        "owner": normalize_text(" ".join(owner_parts)) or None,
        "coat_color_short": color_match.group(1) if color_match else None,
        "bdate": parse_date(text, warnings, context),
        "pedigree": {"sire": None, "dam": None},
    }


def extract_pedigree(item: Node, warnings: list[str]) -> dict[str, Any]:
    table = table_after_heading(item, "Родословная")
    if not table:
        warnings.append("pedigree table not found")
        return {"sire": None, "dam": None, "children": []}
    grid = build_grid(table)

    def at(row: int, col: int) -> Node | None:
        if row < len(grid) and col < len(grid[row]):
            return grid[row][col]
        return None

    sire = extract_cell_node(at(0, 0), warnings, "pedigree.sire")
    dam = extract_cell_node(at(4, 0), warnings, "pedigree.dam")
    if sire:
        sire["pedigree"] = {
            "sire": extract_cell_node(at(0, 1), warnings, "pedigree.sire.sire"),
            "dam": extract_cell_node(at(2, 1), warnings, "pedigree.sire.dam"),
        }
    if dam:
        dam["pedigree"] = {
            "sire": extract_cell_node(at(4, 1), warnings, "pedigree.dam.sire"),
            "dam": extract_cell_node(at(6, 1), warnings, "pedigree.dam.dam"),
        }
    return {"sire": sire, "dam": dam, "children": []}


def dedupe(values: list[str]) -> list[str]:
    out: list[str] = []
    seen = set()
    for value in values:
        if value and value not in seen:
            out.append(value)
            seen.add(value)
    return out


def extract_children(root: Node, warnings: list[str]) -> list[dict[str, Any]]:
    children: list[dict[str, Any]] = []
    for inner in [node for node in root.descendants("div") if node.has_class("bt-inner")]:
        title_link = None
        image_link = None
        for link in inner.descendants("a"):
            if link.has_class("bt-title"):
                title_link = link
            if link.has_class("bt-image-link"):
                image_link = link
        link = title_link or image_link
        img = next((img for img in inner.descendants("img") if img.has_class("hovereffect") or img.attr("src")), None)
        name = normalize_text(title_link.text() if title_link else None) if title_link else ""
        name = name or normalize_text(image_link.attr("title") if image_link else None)
        name = name or normalize_text(img.attr("alt") if img else None)
        name = normalize_animal_name(name)
        if not name:
            continue
        intro = inner.first("div", cls="bt-introtext")
        intro_text = intro.text("\n") if intro else ""
        first_line = intro_text.splitlines()[0] if intro_text.splitlines() else ""
        sex_line = next((line for line in intro_text.splitlines() if "жереб" in line.lower() or "кобыл" in line.lower() or "мерин" in line.lower()), "")
        photo = normalize_path(img.attr("src")) if img and img.attr("src") else None
        if photo and "/cache/" in photo:
            warnings.append(f"child {name!r}: cache-derived photo")
        children.append(
            {
                "name": name,
                "path": normalize_path(link.attr("href")) if link and link.attr("href") else None,
                "photos": [photo] if photo else [],
                "sex": parse_sex(sex_line, warnings, f"child {name}") if sex_line else None,
                "breed": normalize_text(first_line) or None,
                "bdate": parse_date(sex_line, warnings, f"child {name}") if sex_line else None,
            }
        )
    return children


def looks_like_internal_animal_path(path: str | None) -> bool:
    if not path:
        return False
    if path.startswith("http") and not path.startswith(BASE_URL):
        return False
    path = normalize_path(path) or ""
    return path.startswith("/index.php/ferma/") and ("/horses/" in path or "/pony/" in path or "/sluchka/" in path)


def extract_discovered_paths(obj: dict[str, Any]) -> list[str]:
    found: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            path = value.get("path")
            if isinstance(path, str) and looks_like_internal_animal_path(path):
                found.append(path)
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(obj.get("pedigree"))
    return dedupe(found)


def infer_kind(path: str, root: Node, fallback: str | None = None) -> str:
    if "/pony/" in path:
        return "pony"
    if "/horses/" in path or "/sluchka/" in path:
        return "horse"
    return fallback or "horse"


def infer_k2_id(path: str) -> str | None:
    match = re.search(r"/item/(\d+)-", path)
    return match.group(1) if match else None


def parse_page(seed: PageSeed, session: requests.Session) -> tuple[dict[str, Any] | None, list[str], list[str]]:
    warnings: list[str] = []
    discovered: list[str] = []
    url = local_join(seed.path)
    try:
        response = session.get(url, timeout=8)
    except requests.RequestException as exc:
        return None, [f"request failed: {exc}"], discovered
    if response.status_code != 200:
        return None, [f"HTTP {response.status_code}"], discovered
    root = parse_html(response.text)
    item = root.first("div", id_="k2Container") or root.first(cls="itemView")
    item_full = root.first("div", cls="itemFullText")
    if not item or not item_full:
        return None, ["missing K2 itemView/itemFullText"], discovered
    first_table = find_first_table(item_full)
    card_cell = find_right_card_cell(first_table)
    fields = extract_card_fields(card_cell)
    description, services, desc_warnings = extract_description_and_services(card_cell)
    warnings.extend(desc_warnings)
    pedigree = extract_pedigree(item_full, warnings)
    pedigree["children"] = extract_children(root, warnings)
    obj = {
        "path": seed.path,
        "legacy": {
            "k2_item_id": seed.k2_item_id or infer_k2_id(seed.path),
            "source": seed.source,
            "title": seed.title,
            "category": seed.category,
        },
        "name": choose_name(root, seed.title),
        "description": description,
        "services": services,
        "sex": parse_sex(fields.get("Пол"), warnings, "sex") if fields.get("Пол") else None,
        "breed": normalize_text(fields.get("Порода")) or None,
        "coat_color": normalize_text(fields.get("Масть")) or None,
        "kind": seed.kind or infer_kind(seed.path, root),
        "bdate": parse_date(fields.get("Дата рождения"), warnings, "bdate") if fields.get("Дата рождения") else None,
        "height": normalize_text(fields.get("Высота в холке")) or None,
        "photos": extract_photos(item_full, response.text, warnings),
        "pedigree": pedigree,
    }
    if not obj["breed"]:
        warnings.append("breed not found")
    if not obj["sex"]:
        warnings.append("sex not found")
    if not obj["bdate"]:
        warnings.append("bdate not found")
    if not obj["coat_color"]:
        warnings.append("coat_color not found")
    obj = null_unknown_name_nodes(obj)
    if obj is None:
        return None, dedupe(warnings + ["top-level name is unknown"]), discovered
    discovered = [path for path in extract_discovered_paths(obj) if normalize_path(path) != seed.path]
    return obj, dedupe(warnings), discovered


def main() -> int:
    seeds = parse_step1()
    seed_by_path: dict[str, PageSeed] = {seed.path: seed for seed in seeds}
    known_k2_ids: set[str] = {seed.k2_item_id for seed in seeds if seed.k2_item_id}
    queued_k2_ids: set[str] = set(known_k2_ids)
    known_name_kind: set[tuple[str, str]] = {(normalize_text(seed.title).lower(), seed.kind) for seed in seeds}
    queue = deque(seeds)
    parsed: list[dict[str, Any]] = []
    warnings_by_path: dict[str, list[str]] = {}
    skipped: dict[str, list[str]] = {}
    seen_paths: set[str] = set()
    session = requests.Session()

    while queue:
        seed = queue.popleft()
        path = normalize_path(seed.path) or seed.path
        if path in seen_paths:
            continue
        print(f"[{len(parsed) + len(skipped) + 1}] {path}", file=sys.stderr, flush=True)
        seed.path = path
        seen_paths.add(path)
        obj, warnings, discovered = parse_page(seed, session)
        if obj is None:
            skipped[path] = warnings
            continue
        k2_id = obj.get("legacy", {}).get("k2_item_id")
        name_kind = (normalize_text(obj.get("name")).lower(), obj.get("kind"))
        if seed.source != "step1" and ((k2_id and k2_id in known_k2_ids) or name_kind in known_name_kind):
            continue
        if k2_id:
            known_k2_ids.add(k2_id)
        if name_kind[0] and name_kind[1]:
            known_name_kind.add(name_kind)
        parsed.append(obj)
        if warnings:
            warnings_by_path[path] = warnings
        for next_path in discovered:
            next_path = normalize_path(next_path) or next_path
            if next_path in seen_paths or next_path in seed_by_path:
                continue
            next_k2_id = infer_k2_id(next_path)
            if next_k2_id and next_k2_id in queued_k2_ids:
                continue
            if next_k2_id:
                queued_k2_ids.add(next_k2_id)
            seed_by_path[next_path] = PageSeed(
                kind=infer_kind(next_path, parse_html(""), seed.kind),
                title=next_path.rsplit("/", 1)[-1],
                category=None,
                path=next_path,
                k2_item_id=next_k2_id,
                source=f"discovered:{path}",
            )
            queue.append(seed_by_path[next_path])

    parsed.sort(key=lambda item: (0 if item["legacy"]["source"] == "step1" else 1, item["kind"], item["name"], item["path"]))
    OUTPUT.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {
        "total": len(parsed),
        "from_step1": sum(1 for item in parsed if item["legacy"]["source"] == "step1"),
        "discovered": sum(1 for item in parsed if item["legacy"]["source"] != "step1"),
        "skipped": skipped,
        "warnings_count": sum(len(items) for items in warnings_by_path.values()),
        "warnings_by_path": warnings_by_path,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    json.loads(OUTPUT.read_text(encoding="utf-8"))
    json.loads(REPORT.read_text(encoding="utf-8"))
    print(json.dumps({k: report[k] for k in ("total", "from_step1", "discovered", "warnings_count")}, ensure_ascii=False))
    if skipped:
        print(f"Skipped {len(skipped)} pages", file=sys.stderr)
    return 0 if not skipped else 1


if __name__ == "__main__":
    raise SystemExit(main())

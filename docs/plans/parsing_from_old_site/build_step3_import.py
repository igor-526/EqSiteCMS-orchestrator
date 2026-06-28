#!/usr/bin/env python3
"""Build SQL import files for old Joomla horse data.

This script is intentionally standalone: it does not import backend runtime code
and does not connect to the database.
"""

from __future__ import annotations

import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote
from uuid import NAMESPACE_URL, uuid5


EQUESTRIAN_ID_PLACEHOLDER = "a8072191-73a0-48d6-8adc-7bdbf9d171d4"

ROOT = Path(__file__).resolve().parent
BASE_JSON = ROOT / "base.json"
SCRIPTS_DIR = ROOT / "scripts"
SOURCE_PHOTO_ROOT = Path("/home/igor/projects/ad_joomla/src")
TARGET_PHOTO_ROOT = Path("/home/igor/projects/ad_joomla/all_photos_to_s3")
PHOTO_DB_PREFIX = "old-site"

UUID_NS = uuid5(NAMESPACE_URL, "eqsitecms:parsing-from-old-site:step3")

WELSH_PONY_OWNER_ID = "3dab1256-aa0a-5183-9dac-c73bb509451e"
PRILEPSKY_OWNER_ID = "09b955d8-76c9-557f-9242-851168357331"
CHITA_OWNER_ID = "84bbb71e-d2a1-5e67-a392-9d1c99700e2e"
CHITA_OWNER_NAME = 'ГУ "Читинская ГЗК с ипподромом им. Х. Хакимова"'

OWNER_STRIP_OUTER_PARENTHESES = {
    "(132012 Ysselvliedt's Lady Lynn) уэльский пони (сектор В)",
    "(Arina)",
    "(Eisstern A 167)",
    "(Eva)",
    "(Eva) 1,93",
    "(Favorit S 539)",
    "(Hanny S 19725)",
    "(Kasper S 664)",
    "(Kate A 253 H)",
    "(Lilian S 22565)",
    "(Marius A 159)",
    "(Monolith)",
    "(Nico van't Leestje), Голландия",
    "(Nico)",
    "(Reggi V 80148)",
    "(Susi)",
    "(Wildfang A 187)",
}

OWNER_DELETE_NAMES = {
    "1,127",
    "1,139",
    "1,54",
    "2,134;IV,152",
    "2,162;IV,181",
    "DE302022944775",
    "Германия",
    "Голландия",
    "уэльский пони (сектор А)",
    "уэльский пони (сектор В)",
}

OWNER_MERGE_TO_WELSH_PONY = {
    "WELSH MOUNTAIN PONY",
    "WELSH MOUNTAIN PONY WSB (OS) 112387",
    "WELSH MOUNTAIN PONY WSB 19410 (A)",
    "WELSH MOUNTAIN PONY WSB 39653 (A)",
    "WELSH MOUNTAIN PONY WSB 45493 (A)",
    "WELSH PONY",
    "WELSH PONY, 18979 GER",
    "WELSH PONY, NLD17200500838",
    "WELSH PONY, WSB 16823",
    "WELSH PONY, WSB 28719 (B)",
    "WSB 16566-FS2",
    "WSB 21073",
    "WSB 24511 (B)",
    "WSB 26739 (A)",
    "WSB 28719 (B)",
    "WSB 39407 (B)",
    "WSB 63352 (A)",
}

OWNER_MERGE_TO_PRILEPSKY = {
    "Прилепский к/з",
    "Прилепский к/з 2,126",
    "Прилепский к/з 3,50;IV,43",
    "Прилепский к/з 3,55;IV,56,152,282",
    "Прилепский к/з 3,75;IV,97",
    "Прилепский к/з, 1,51",
    "Прилепский к/з, 2,128;IV,144",
    "Прилепский к/з, 3,98;IV,57",
}


TRANSLIT_MAP = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


@dataclass
class NodeRecord:
    node: dict[str, Any]
    role: str
    is_top_level: bool
    parent_key: str | None = None


@dataclass
class HorseRecord:
    key: str
    id: str
    nodes: list[NodeRecord] = field(default_factory=list)
    name: str = ""
    slug: str = ""
    description: str | None = None
    breed_id: str | None = None
    coat_color_id: str | None = None
    height: int | None = None
    sex: str = "male"
    bdate: str | None = None
    bdate_mode: str = "hide"
    horse_owner_id: str | None = None
    this_stable: bool = False
    photos: list[str] = field(default_factory=list)


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def canonical_key(value: str) -> str:
    return normalize_text(value).lower().replace("ё", "е")  # type: ignore[union-attr]


def sentence_case(value: str) -> str:
    text = normalize_text(value) or ""
    lowered = text.lower()
    for index, char in enumerate(lowered):
        if char.isalpha():
            return lowered[:index] + char.upper() + lowered[index + 1 :]
    return lowered


def normalize_breed_name(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    text = text.rstrip(" ,.;:")
    if re.fullmatch(r"уэльский\s+пони(?:\s*\(\s*сектор\s+[a-zа-яё]\s*\))?", text, flags=re.IGNORECASE):
        return "Уэльский пони"
    return sentence_case(text)


def breed_key(value: str) -> str:
    return canonical_key(normalize_breed_name(value) or value)


def normalize_coat_color_name(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    return sentence_case(text)


def coat_color_key(value: str) -> str:
    return canonical_key(normalize_coat_color_name(value) or value)


def strip_outer_parentheses(value: str) -> str:
    match = re.fullmatch(r"\(([^()]*)\)(.*)", value)
    if not match:
        return value
    return normalize_text(f"{match.group(1)}{match.group(2)}") or value


def normalize_owner_name(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    if text in OWNER_DELETE_NAMES:
        return None
    if text in OWNER_MERGE_TO_WELSH_PONY:
        return "WELSH PONY"
    if text in OWNER_MERGE_TO_PRILEPSKY:
        return "Прилепский к/з"
    if text in {CHITA_OWNER_NAME.rstrip('"'), CHITA_OWNER_NAME}:
        return CHITA_OWNER_NAME
    if text in OWNER_STRIP_OUTER_PARENTHESES:
        return strip_outer_parentheses(text)
    return text


def owner_id_for_name(name: str) -> str:
    if name == "WELSH PONY":
        return WELSH_PONY_OWNER_ID
    if name == "Прилепский к/з":
        return PRILEPSKY_OWNER_ID
    if name == CHITA_OWNER_NAME:
        return CHITA_OWNER_ID
    return stable_uuid("horse-owner", name)


def stable_uuid(kind: str, key: str) -> str:
    return str(uuid5(UUID_NS, f"{kind}:{key}"))


def generate_slug(text: str) -> str:
    result = "".join(TRANSLIT_MAP.get(ch, TRANSLIT_MAP.get(ch.lower(), ch)) for ch in text)
    result = result.lower()
    result = re.sub(r"[^\w\s-]", "", result)
    result = re.sub(r"[-\s]+", "-", result)
    return result.strip("-") or "item"


def unique_slug(base: str, used: set[str], max_len: int = 63) -> str:
    slug = base[:max_len].strip("-") or "item"
    if slug not in used:
        used.add(slug)
        return slug
    counter = 2
    while True:
        suffix = f"-{counter}"
        candidate = f"{slug[: max_len - len(suffix)].strip('-')}{suffix}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        counter += 1


def sql_value(value: Any, cast: str | None = None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    text = str(value).replace("'", "''")
    rendered = f"'{text}'"
    if cast:
        rendered += f"::{cast}"
    return rendered


def write_insert(path: Path, table: str, columns: list[str], rows: list[list[Any]]) -> None:
    lines = [
        "-- Generated by docs/plans/parsing_from_old_site/build_step3_import.py",
        f"-- EQUESTRIAN_ID_PLACEHOLDER: {EQUESTRIAN_ID_PLACEHOLDER}",
        f"-- rows: {len(rows)}",
        "",
        "BEGIN;",
        "",
    ]
    if not rows:
        lines.append(f"-- No rows for {table}.")
        lines.extend(["", "COMMIT;"])
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return
    lines.append(f"INSERT INTO {table} ({', '.join(columns)}) VALUES")
    rendered_rows = []
    for row in rows:
        rendered_rows.append("    (" + ", ".join(row) + ")")
    lines.append(",\n".join(rendered_rows) + ";")
    lines.extend(["", "COMMIT;"])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def iter_nodes(data: list[dict[str, Any]]) -> list[NodeRecord]:
    records: list[NodeRecord] = []

    def walk(node: dict[str, Any] | None, role: str, is_top_level: bool, parent_key: str | None) -> None:
        if not isinstance(node, dict) or not node.get("name"):
            return
        records.append(NodeRecord(node=node, role=role, is_top_level=is_top_level, parent_key=parent_key))
        this_key = identity_key(node, role)
        pedigree = node.get("pedigree") or {}
        walk(pedigree.get("sire"), "sire", False, this_key)
        walk(pedigree.get("dam"), "dam", False, this_key)
        for child in pedigree.get("children") or []:
            walk(child, "child", False, this_key)

    for item in data:
        walk(item, "top", True, None)
    return records


def identity_key(node: dict[str, Any], role: str) -> str:
    path = normalize_text(node.get("path"))
    if path:
        return f"path:{path}"
    parts = [
        normalize_text(node.get("name")) or "",
        normalize_text(node.get("bdate")) or "",
        normalize_text(node.get("owner")) or "",
        normalize_text(node.get("breed")) or "",
        normalize_text(node.get("coat_color")) or normalize_text(node.get("coat_color_short")) or "",
        role,
    ]
    return "tuple:" + "|".join(parts)


def choose_most_common(values: list[str]) -> str:
    counts = Counter(values)
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def truncate(value: str | None, limit: int, warnings: list[dict[str, Any]], context: str) -> str | None:
    if value is None or len(value) <= limit:
        return value
    warnings.append({"code": "truncated", "context": context, "from": len(value), "to": limit})
    return value[:limit].rstrip()


def parse_height(value: Any, warnings: list[dict[str, Any]], context: str) -> int | None:
    text = normalize_text(value)
    if not text:
        return None
    match = re.search(r"\d+", text)
    if not match:
        warnings.append({"code": "height_unparsed", "context": context, "value": text})
        return None
    height = int(match.group(0))
    if "до" in text.lower():
        warnings.append({"code": "height_is_upper_bound", "context": context, "value": text, "height": height})
    return height


def parse_bdate(value: Any, warnings: list[dict[str, Any]], context: str) -> tuple[str | None, str]:
    text = normalize_text(value)
    if not text:
        return None, "hide"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        try:
            datetime.strptime(text, "%Y-%m-%d")
            return text, "ymd"
        except ValueError:
            warnings.append({"code": "bdate_invalid", "context": context, "value": text})
            return None, "hide"
    if re.fullmatch(r"\d{4}", text):
        return f"{text}-01-01", "y"
    warnings.append({"code": "bdate_unparsed", "context": context, "value": text})
    return None, "hide"


def owner_type(name: str) -> str:
    lowered = name.lower()
    org_markers = ["к/з", "конный завод", "ооо", "зао", "гу", "к.з."]
    return "company" if any(marker in lowered for marker in org_markers) else "person"


def resolve_case_insensitive_path(path: Path) -> Path | None:
    current = path.anchor and Path(path.anchor) or Path(".")
    parts = path.parts[1:] if path.is_absolute() else path.parts
    for part in parts:
        candidate = current / part
        if candidate.exists():
            current = candidate
            continue
        if not current.is_dir():
            return None
        lowered = part.lower()
        matches = [child for child in current.iterdir() if child.name.lower() == lowered]
        if not matches:
            return None
        current = matches[0]
    return current if current.exists() else None


def source_photo_path(photo: str) -> Path:
    relative = unquote(photo.split("?", 1)[0]).lstrip("/")
    direct = SOURCE_PHOTO_ROOT / relative
    if direct.exists():
        return direct
    resolved = resolve_case_insensitive_path(direct)
    return resolved or direct


def target_photo_name(photo: str) -> str:
    source_name = Path(photo.split("?", 1)[0]).name
    stem = Path(source_name).stem
    suffix = Path(source_name).suffix.lower()
    safe_stem = generate_slug(unicodedata.normalize("NFKD", stem))[:40] or "photo"
    return f"{stable_uuid('photo-file', photo)[:8]}-{safe_stem}{suffix}"


def build() -> dict[str, Any]:
    warnings: list[dict[str, Any]] = []
    data = json.loads(BASE_JSON.read_text(encoding="utf-8"))
    records = iter_nodes(data)

    breed_names_by_key: dict[str, list[str]] = defaultdict(list)
    breed_raw_names_by_key: dict[str, set[str]] = defaultdict(set)
    breed_kinds_by_key: dict[str, Counter[str]] = defaultdict(Counter)
    coat_names_by_key: dict[str, list[str]] = defaultdict(list)
    coat_short_names_by_key: dict[str, list[str]] = defaultdict(list)
    coat_raw_names_by_key: dict[str, set[str]] = defaultdict(set)
    owner_names_by_key: dict[str, list[str]] = defaultdict(list)
    owner_raw_names_by_key: dict[str, set[str]] = defaultdict(set)
    owner_lookup_by_source_key: dict[str, str] = {}

    for item in data:
        if item.get("breed"):
            normalized_breed = normalize_breed_name(item["breed"])
            if normalized_breed is None:
                continue
            key = canonical_key(normalized_breed)
            breed_names_by_key[key].append(normalized_breed)
            breed_raw_names_by_key[key].add(normalize_text(item["breed"]) or item["breed"])
            breed_kinds_by_key[key][item.get("kind") or "horse"] += 1
        if item.get("coat_color"):
            normalized_coat = normalize_coat_color_name(item["coat_color"])
            short_name = normalize_text(item["coat_color"]) or item["coat_color"]
            if normalized_coat is None:
                continue
            key = canonical_key(normalized_coat)
            coat_names_by_key[key].append(normalized_coat)
            coat_short_names_by_key[key].append(short_name)
            coat_raw_names_by_key[key].add(short_name)

    for record in records:
        owner = normalize_text(record.node.get("owner"))
        if owner:
            normalized_owner = normalize_owner_name(owner)
            if normalized_owner is None:
                continue
            key = canonical_key(normalized_owner)
            owner_names_by_key[key].append(normalized_owner)
            owner_raw_names_by_key[key].add(owner)
            owner_lookup_by_source_key[canonical_key(owner)] = key

    breed_rows_map: dict[tuple[str, str], dict[str, Any]] = {}
    breed_lookup: dict[tuple[str, str], str] = {}
    used_breed_names: set[str] = set()
    used_breed_slugs: set[str] = set()
    for key in sorted(breed_names_by_key):
        base_name = truncate(choose_most_common(breed_names_by_key[key]), 63, warnings, f"breed.name:{key}") or key[:63]
        raw_names = sorted(breed_raw_names_by_key[key], key=str.lower)
        if len(raw_names) > 1:
            warnings.append({"code": "breed_names_merged", "name": base_name, "raw_names": raw_names})
        kinds = sorted(breed_kinds_by_key[key])
        if len(kinds) > 1:
            warnings.append({"code": "breed_name_has_multiple_kinds", "name": base_name, "kinds": kinds})
        for kind in kinds:
            name = base_name
            if canonical_key(name) in used_breed_names:
                name = f"{base_name} ({kind})"
            name = truncate(name, 63, warnings, f"breed.name:{key}|{kind}") or key[:63]
            used_breed_names.add(canonical_key(name))
            breed_id = stable_uuid("breed", f"{name}|{kind}")
            slug = unique_slug(generate_slug(name), used_breed_slugs)
            breed_rows_map[(key, kind)] = {"id": breed_id, "name": name, "slug": slug, "kind": kind}
            breed_lookup[(key, kind)] = breed_id

    coat_rows: dict[str, dict[str, Any]] = {}
    used_coat_slugs: set[str] = set()
    for key in sorted(coat_names_by_key):
        name = truncate(choose_most_common(coat_names_by_key[key]), 63, warnings, f"coat_color.name:{key}") or key[:63]
        short_name = truncate(choose_most_common(coat_short_names_by_key[key]), 63, warnings, f"coat_color.short_name:{key}") or name
        raw_names = sorted(coat_raw_names_by_key[key], key=str.lower)
        if len(raw_names) > 1:
            warnings.append({"code": "coat_color_names_merged", "name": name, "raw_names": raw_names})
        coat_rows[key] = {
            "id": stable_uuid("coat-color", name),
            "name": name,
            "short_name": short_name,
            "slug": unique_slug(generate_slug(name), used_coat_slugs),
        }

    owner_rows: dict[str, dict[str, Any]] = {}
    for key in sorted(owner_names_by_key):
        name = truncate(choose_most_common(owner_names_by_key[key]), 63, warnings, f"owner:{key}") or key[:63]
        raw_names = sorted(owner_raw_names_by_key[key], key=str.lower)
        if len(raw_names) > 1:
            warnings.append({"code": "horse_owner_names_merged", "name": name, "raw_names": raw_names})
        owner_rows[key] = {"id": owner_id_for_name(name), "name": name, "type": owner_type(name)}
    if canonical_key("WELSH PONY") in owner_rows:
        owner_rows[canonical_key("WELSH PONY")]["type"] = "company"

    by_key: dict[str, HorseRecord] = {}
    for record in records:
        key = identity_key(record.node, record.role)
        if key not in by_key:
            by_key[key] = HorseRecord(key=key, id=stable_uuid("horse", key))
        by_key[key].nodes.append(record)

    used_horse_slugs: set[str] = set()
    for horse in by_key.values():
        sorted_nodes = sorted(horse.nodes, key=lambda r: (not r.is_top_level, r.role))
        primary = sorted_nodes[0]
        node = primary.node
        context = horse.key
        horse.name = truncate(normalize_text(node.get("name")) or "No name", 63, warnings, f"horse.name:{context}") or "No name"
        horse.slug = unique_slug(generate_slug(horse.name), used_horse_slugs)
        horse.description = truncate(normalize_text(node.get("description")), 511, warnings, f"horse.description:{context}")
        horse.this_stable = any(record.is_top_level for record in horse.nodes)

        breed = normalize_text(node.get("breed"))
        kind = node.get("kind") or "horse"
        if breed:
            normalized_breed_key = breed_key(breed)
            if (normalized_breed_key, kind) in breed_lookup:
                horse.breed_id = breed_lookup[(normalized_breed_key, kind)]
            else:
                candidates = [row["id"] for (candidate_key, _), row in breed_rows_map.items() if candidate_key == normalized_breed_key]
                if len(candidates) == 1:
                    horse.breed_id = candidates[0]
                else:
                    warnings.append({"code": "breed_not_resolved", "context": context, "breed": breed, "kind": kind})

        coat = normalize_text(node.get("coat_color"))
        if coat:
            coat_key = coat_color_key(coat)
            if coat_key in coat_rows:
                horse.coat_color_id = coat_rows[coat_key]["id"]
            else:
                warnings.append({"code": "coat_color_not_resolved", "context": context, "coat_color": coat})

        horse.height = parse_height(node.get("height"), warnings, context)
        sex = normalize_text(node.get("sex"))
        if sex in {"male", "female", "geld"}:
            horse.sex = sex
        elif primary.role == "dam":
            horse.sex = "female"
        else:
            horse.sex = "male"
            warnings.append({"code": "sex_defaulted", "context": context, "role": primary.role, "sex": sex})

        horse.bdate, horse.bdate_mode = parse_bdate(node.get("bdate"), warnings, context)
        owner = normalize_text(node.get("owner"))
        if owner and canonical_key(owner) in owner_lookup_by_source_key:
            horse.horse_owner_id = owner_rows[owner_lookup_by_source_key[canonical_key(owner)]]["id"]

        photo_seen: set[str] = set()
        for record in sorted_nodes:
            for photo in record.node.get("photos") or []:
                if photo not in photo_seen:
                    horse.photos.append(photo)
                    photo_seen.add(photo)

    all_photos = sorted({photo for horse in by_key.values() for photo in horse.photos})
    photo_rows: dict[str, dict[str, Any]] = {}
    copied_photos = 0
    skipped_missing_photos: list[dict[str, str]] = []
    recovered_photos: list[dict[str, str]] = []
    TARGET_PHOTO_ROOT.mkdir(parents=True, exist_ok=True)
    for photo in all_photos:
        filename = target_photo_name(photo)
        target = TARGET_PHOTO_ROOT / filename
        source = source_photo_path(photo)
        if source.exists():
            expected_source = SOURCE_PHOTO_ROOT / photo.split("?", 1)[0].lstrip("/")
            if source != expected_source:
                recovered_photos.append({"photo": photo, "source": str(source), "expected_source": str(expected_source)})
            if not target.exists() or source.stat().st_size != target.stat().st_size:
                shutil.copy2(source, target)
                copied_photos += 1
            photo_rows[photo] = {
                "id": stable_uuid("photo", f"{PHOTO_DB_PREFIX}/{filename}"),
                "name": truncate(Path(filename).stem, 63, warnings, f"photo.name:{photo}"),
                "path": f"{PHOTO_DB_PREFIX}/{filename}",
                "target": str(target),
                "source": str(source),
                "exists": True,
            }
        else:
            skipped_missing_photos.append({"photo": photo, "source": str(source)})
            warnings.append({"code": "photo_missing", "photo": photo, "source": str(source)})

    horse_photo_edges: dict[tuple[str, str], bool] = {}
    for horse in by_key.values():
        for index, photo in enumerate(horse.photos):
            if photo in photo_rows:
                horse_photo_edges[(horse.id, photo_rows[photo]["id"])] = index == 0

    child_edges: set[tuple[str, str]] = set()
    for horse in by_key.values():
        parent_key = horse.key
        for record in horse.nodes:
            pedigree = record.node.get("pedigree") or {}
            for parent_role in ("sire", "dam"):
                parent = pedigree.get(parent_role)
                if isinstance(parent, dict) and parent.get("name"):
                    parent_identity = identity_key(parent, parent_role)
                    if parent_identity in by_key:
                        child_edges.add((by_key[parent_identity].id, by_key[parent_key].id))
            for child in pedigree.get("children") or []:
                if isinstance(child, dict) and child.get("name"):
                    child_identity = identity_key(child, "child")
                    if child_identity in by_key:
                        child_edges.add((by_key[parent_key].id, by_key[child_identity].id))

    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

    breed_sql_rows = [
        [
            sql_value(row["id"], "uuid"),
            sql_value(EQUESTRIAN_ID_PLACEHOLDER, "uuid"),
            sql_value(row["name"]),
            sql_value(row["name"]),
            sql_value(row["slug"]),
            "NULL",
            sql_value("<div></div>"),
            sql_value(row["kind"]),
        ]
        for row in sorted(breed_rows_map.values(), key=lambda item: (item["kind"], item["name"]))
    ]
    write_insert(SCRIPTS_DIR / "01_breeds.sql", "breeds", ["id", "equestrian_id", "name", "short_name", "slug", "description", "page_data", "kind"], breed_sql_rows)

    coat_sql_rows = [
        [
            sql_value(row["id"], "uuid"),
            sql_value(EQUESTRIAN_ID_PLACEHOLDER, "uuid"),
            sql_value(row["name"]),
            sql_value(row["short_name"]),
            sql_value(row["slug"]),
            "NULL",
            sql_value("<div></div>"),
        ]
        for row in sorted(coat_rows.values(), key=lambda item: item["name"])
    ]
    write_insert(SCRIPTS_DIR / "02_coat_color.sql", "coat_color", ["id", "equestrian_id", "name", "short_name", "slug", "description", "page_data"], coat_sql_rows)

    owner_sql_rows = [
        [
            sql_value(row["id"], "uuid"),
            sql_value(EQUESTRIAN_ID_PLACEHOLDER, "uuid"),
            sql_value(row["name"]),
            "NULL",
            sql_value(row["type"]),
            "NULL",
            sql_value("[]", "jsonb"),
        ]
        for row in sorted(owner_rows.values(), key=lambda item: item["name"])
    ]
    write_insert(SCRIPTS_DIR / "03_horse_owner.sql", "horse_owner", ["id", "equestrian_id", "name", "description", "type", "address", "phone_numbers"], owner_sql_rows)

    photo_sql_rows = [
        [
            sql_value(row["id"], "uuid"),
            sql_value(EQUESTRIAN_ID_PLACEHOLDER, "uuid"),
            sql_value(row["name"]),
            "NULL",
            sql_value(row["path"]),
        ]
        for row in sorted(photo_rows.values(), key=lambda item: item["path"])
    ]
    write_insert(SCRIPTS_DIR / "04_photos.sql", "photos", ["id", "equestrian_id", "name", "description", "path"], photo_sql_rows)

    horse_sql_rows = [
        [
            sql_value(horse.id, "uuid"),
            sql_value(EQUESTRIAN_ID_PLACEHOLDER, "uuid"),
            sql_value(horse.name),
            sql_value(horse.slug),
            sql_value(horse.description),
            sql_value(horse.breed_id, "uuid") if horse.breed_id else "NULL",
            sql_value(horse.coat_color_id, "uuid") if horse.coat_color_id else "NULL",
            sql_value(horse.height),
            sql_value(horse.sex),
            sql_value(horse.bdate, "date") if horse.bdate else "NULL",
            "NULL",
            sql_value(horse.bdate_mode),
            sql_value("hide"),
            sql_value(horse.horse_owner_id, "uuid") if horse.horse_owner_id else "NULL",
            sql_value(horse.this_stable),
        ]
        for horse in sorted(by_key.values(), key=lambda item: (not item.this_stable, item.name, item.key))
    ]
    write_insert(SCRIPTS_DIR / "05_horse.sql", "horse", ["id", "equestrian_id", "name", "slug", "description", "breed_id", "coat_color_id", "height", "sex", "bdate", "ddate", "bdate_mode", "ddate_mode", "horse_owner_id", "this_stable"], horse_sql_rows)

    horse_photo_sql_rows = [
        [sql_value(stable_uuid("horse-photo", f"{horse_id}|{photo_id}"), "uuid"), sql_value(horse_id, "uuid"), sql_value(photo_id, "uuid"), sql_value(is_main)]
        for (horse_id, photo_id), is_main in sorted(horse_photo_edges.items())
    ]
    write_insert(SCRIPTS_DIR / "06_horse_photos.sql", "horse_photos", ["id", "horse_id", "photo_id", "is_main"], horse_photo_sql_rows)

    horse_children_sql_rows = [
        [sql_value(stable_uuid("horse-child", f"{parent_id}|{child_id}"), "uuid"), sql_value(parent_id, "uuid"), sql_value(child_id, "uuid")]
        for parent_id, child_id in sorted(child_edges)
    ]
    write_insert(SCRIPTS_DIR / "07_horse_children.sql", "horse_children", ["id", "horse_id", "child_id"], horse_children_sql_rows)

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "equestrian_id_placeholder": EQUESTRIAN_ID_PLACEHOLDER,
        "source": str(BASE_JSON),
        "scripts_dir": str(SCRIPTS_DIR),
        "photo_source_dir": str(SOURCE_PHOTO_ROOT),
        "photo_target_dir": str(TARGET_PHOTO_ROOT),
        "counts": {
            "top_level_horses": len(data),
            "recursive_nodes": len(records),
            "horse_rows": len(by_key),
            "top_level_horse_rows": sum(1 for horse in by_key.values() if horse.this_stable),
            "relation_only_horse_rows": sum(1 for horse in by_key.values() if not horse.this_stable),
            "breeds": len(breed_rows_map),
            "coat_colors": len(coat_rows),
            "horse_owners": len(owner_rows),
            "photos": len(photo_rows),
            "horse_photos": len(horse_photo_edges),
            "horse_children": len(child_edges),
            "photos_copied_or_updated": copied_photos,
            "photos_missing": len(skipped_missing_photos),
            "photos_recovered": len(recovered_photos),
        },
        "sql_files": {
            "01_breeds.sql": len(breed_sql_rows),
            "02_coat_color.sql": len(coat_sql_rows),
            "03_horse_owner.sql": len(owner_sql_rows),
            "04_photos.sql": len(photo_sql_rows),
            "05_horse.sql": len(horse_sql_rows),
            "06_horse_photos.sql": len(horse_photo_sql_rows),
            "07_horse_children.sql": len(horse_children_sql_rows),
        },
        "manual_review": {
            "owners": [row["name"] for row in sorted(owner_rows.values(), key=lambda item: item["name"])],
            "missing_photos": skipped_missing_photos,
            "recovered_photos": recovered_photos,
        },
        "mappings": {
            "breeds": {f"{key}|{kind}": row["id"] for (key, kind), row in sorted(breed_rows_map.items())},
            "coat_colors": {key: row["id"] for key, row in sorted(coat_rows.items())},
            "horse_owners": {key: row["id"] for key, row in sorted(owner_rows.items())},
            "horses": {key: horse.id for key, horse in sorted(by_key.items())},
            "photos": {photo: row["id"] for photo, row in sorted(photo_rows.items())},
        },
        "warnings": warnings,
    }
    (SCRIPTS_DIR / "import_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    result = build()
    print(json.dumps({"counts": result["counts"], "sql_files": result["sql_files"]}, ensure_ascii=False, indent=2))

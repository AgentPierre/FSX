"""T23: Generate seed.sql from the authoritative menu.csv without changing it."""

import argparse
import csv
from decimal import Decimal
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

ROOT = Path(__file__).resolve().parents[1]


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def identifier(kind: str, key: str) -> str:
    return quote(str(uuid5(NAMESPACE_URL, f"fsx/menu/{kind}/{key}")))


def generate() -> str:
    with (ROOT / "docs/menu.csv").open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    codes = [row["code"] for row in rows]
    if len(rows) != 47 or len(set(codes)) != 47 or {"G7", "G8"} & set(codes):
        raise ValueError("Expected exactly 47 unique menu codes, with no G7/G8")
    categories = list(dict.fromkeys(row["category"] for row in rows))
    sql = [
        "-- T23 / SCRUM-62: generated from docs/menu.csv by scripts/generate_menu_seed.py.",
        "-- 47 items, 59 purchasable sizes; integer cents, no invented G7/G8.",
        "-- Repeat runs preserve owner edits; this is initial loading, not a menu sync.",
        "begin;",
        "",
    ]
    for position, category in enumerate(categories, 1):
        sql.append(
            "insert into public.menu_categories(id, name, sort_order) values "
            f"({identifier('category', category)}, {quote(category)}, {position}) "
            "on conflict (name) do nothing;"
        )
    category_positions: dict[str, int] = {}
    size_count = 0
    for row in rows:
        code, category = row["code"], row["category"]
        category_positions[category] = category_positions.get(category, 0) + 1
        if row["is_spicy"] not in ("true", "false"):
            raise ValueError(f"Invalid spicy flag for {code}")
        catering = row["min_lead_minutes"] == "40"
        description = quote(row["description"]) if row["description"] else "null"
        sql += [
            "",
            "insert into public.menu_items "
            "(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)",
            f"values ({identifier('item', code)}, "
            f"(select id from public.menu_categories where name = {quote(category)}), "
            f"{quote(code)}, {quote(row['name'])}, {description}, "
            f"{row['is_spicy']}, {str(catering).lower()}, {category_positions[category]}) "
            "on conflict (code) do nothing;",
        ]
        sizes = []
        if row["price"]:
            if any(row[key] for key in ("price_small", "price_medium", "price_large")):
                raise ValueError(f"Mixed regular/sized pricing for {code}")
            sizes.append(("regular", row["price"]))
        else:
            mapping = (
                [("S", "price_small"), ("M", "price_medium"), ("L", "price_large")]
                if catering
                else [("sm", "price_small"), ("lg", "price_large")]
            )
            for size, field in mapping:
                if row[field]:
                    sizes.append((size, row[field]))
        if not sizes:
            raise ValueError(f"No purchasable size for {code}")
        for position, (size, price) in enumerate(sizes, 1):
            cents = Decimal(price) * 100
            if cents <= 0 or cents != cents.to_integral_value():
                raise ValueError(f"Invalid price for {code}/{size}")
            sql.append(
                "insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) "
                f"values ({identifier('size', code + '/' + size)}, "
                f"(select id from public.menu_items where code = {quote(code)}), "
                f"{quote(size)}, {position}, {int(cents)}) "
                "on conflict (menu_item_id, size_code) do nothing;"
            )
            size_count += 1
    if size_count != 59:
        raise ValueError(f"Expected 59 sizes, found {size_count}")
    sql += [
        "",
        "-- Restaurant configuration from CLAUDE.md, not invented menu prices.",
        "insert into public.settings "
        "(id, tax_rate, regular_lead_minutes, catering_lead_minutes, timezone) "
        "values (1, 0.082500, 15, 40, 'America/Chicago') on conflict (id) do nothing;",
        "insert into public.business_hours(day_of_week, opens_at, closes_at) values",
        "  (0, null, null), (1, '11:00', '21:00'), (2, '11:00', '21:00'),",
        "  (3, '11:00', '21:00'), (4, '11:00', '21:00'), (5, '11:00', '21:00'),",
        "  (6, '11:00', '21:00') on conflict (day_of_week) do nothing;",
        "",
        "commit;",
        "",
    ]
    return "\n".join(sql)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check committed output without writing")
    options = parser.parse_args()
    target = ROOT / "supabase/seed.sql"
    output = generate()
    if options.check:
        if not target.exists() or target.read_text(encoding="utf-8") != output:
            raise SystemExit("seed.sql does not match docs/menu.csv; regenerate it")
        print("Seed matches the CSV: 47 items and 59 sizes")
    else:
        target.write_text(output, encoding="utf-8", newline="\n")
        print("Generated supabase/seed.sql: 47 items and 59 sizes")

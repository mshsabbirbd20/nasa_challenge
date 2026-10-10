#!/usr/bin/env python3
"""
Fetch NASA-relevant open datasets into data/nasa/ for Abandoned but not Forgotten.

Run from repo root:
  python scripts/fetch_nasa_datasets.py

Later: drop updated JSON/CSV into data/nasa/, edit data/nasa/manifest.json
"active" paths, and reload the web app — no code change required for file swaps.
"""

from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "nasa"
CTX = ssl.create_default_context()

# Official Apollo LM / instrument coords (NSSDCA / LRO Mean Earth–Polar Axis)
# Source: https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html
NSSDC_LUNAR_SITES = [
    {
        "id": "apollo11-lm",
        "mission": "Apollo 11",
        "name": "Apollo 11 Lunar Module",
        "kind": "lunar_module",
        "lat": 0.67416,
        "lon": 23.47314,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo11-lrrr",
        "mission": "Apollo 11",
        "name": "Apollo 11 LRRR",
        "kind": "lrrr",
        "lat": 0.67345,
        "lon": 23.47307,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo12-lm",
        "mission": "Apollo 12",
        "name": "Apollo 12 Lunar Module",
        "kind": "lunar_module",
        "lat": -3.0128,
        "lon": -23.4219,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo12-alsep",
        "mission": "Apollo 12",
        "name": "Apollo 12 ALSEP",
        "kind": "alsep",
        "lat": -3.0098,
        "lon": -23.4249,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo14-lm",
        "mission": "Apollo 14",
        "name": "Apollo 14 Lunar Module",
        "kind": "lunar_module",
        "lat": -3.64589,
        "lon": -17.47194,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo15-lm",
        "mission": "Apollo 15",
        "name": "Apollo 15 Lunar Module",
        "kind": "lunar_module",
        "lat": 26.13239,
        "lon": 3.63330,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo16-lm",
        "mission": "Apollo 16",
        "name": "Apollo 16 Lunar Module",
        "kind": "lunar_module",
        "lat": -8.9734,
        "lon": 15.5011,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo17-lm",
        "mission": "Apollo 17",
        "name": "Apollo 17 Lunar Module",
        "kind": "lunar_module",
        "lat": 20.1911,
        "lon": 30.7723,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo14-lrrr",
        "mission": "Apollo 14",
        "name": "Apollo 14 LRRR",
        "kind": "lrrr",
        "lat": -3.64417,
        "lon": -17.47865,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo14-alsep",
        "mission": "Apollo 14",
        "name": "Apollo 14 ALSEP",
        "kind": "alsep",
        "lat": -3.64419,
        "lon": -17.47768,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo15-lrrr",
        "mission": "Apollo 15",
        "name": "Apollo 15 LRRR",
        "kind": "lrrr",
        "lat": 26.13341,
        "lon": 3.62850,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo15-alsep",
        "mission": "Apollo 15",
        "name": "Apollo 15 ALSEP",
        "kind": "alsep",
        "lat": 26.13406,
        "lon": 3.62991,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo16-alsep",
        "mission": "Apollo 16",
        "name": "Apollo 16 ALSEP",
        "kind": "alsep",
        "lat": -8.9759,
        "lon": 15.4986,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
    {
        "id": "apollo17-alsep",
        "mission": "Apollo 17",
        "name": "Apollo 17 ALSEP",
        "kind": "alsep",
        "lat": 20.1923,
        "lon": 30.7655,
        "body": "moon",
        "source_url": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        "dataset_id": "NSSDCA Apollo landing sites (LRO)",
    },
]

# NASA Mars surface hardware used by this challenge (NSSDCA / JPL public positions)
NSSDC_MARS_SITES = [
    {
        "id": "perseverance",
        "mission": "Mars 2020",
        "name": "Perseverance rover",
        "kind": "rover",
        "lat": 18.4447,
        "lon": 77.4500,
        "body": "mars",
        "nssdc_id": "2020-052A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2020-052A",
        "dataset_id": "NSSDCA 2020-052A",
    },
    {
        "id": "curiosity",
        "mission": "Mars Science Laboratory",
        "name": "Curiosity rover",
        "kind": "rover",
        "lat": -4.5895,
        "lon": 137.4417,
        "body": "mars",
        "nssdc_id": "2011-070A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-070A",
        "dataset_id": "NSSDCA 2011-070A",
    },
    {
        "id": "opportunity",
        "mission": "Mars Exploration Rover-B",
        "name": "Opportunity rover",
        "kind": "rover",
        "lat": -2.2797,
        "lon": -1.9462,
        "body": "mars",
        "nssdc_id": "2003-032A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-032A",
        "dataset_id": "NSSDCA 2003-032A",
    },
    {
        "id": "spirit",
        "mission": "Mars Exploration Rover-A",
        "name": "Spirit rover",
        "kind": "rover",
        "lat": -14.5684,
        "lon": 175.4729,
        "body": "mars",
        "nssdc_id": "2003-027A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A",
        "dataset_id": "NSSDCA 2003-027A",
    },
    {
        "id": "insight",
        "mission": "InSight",
        "name": "InSight lander",
        "kind": "lander",
        "lat": 4.5024,
        "lon": 135.6234,
        "body": "mars",
        "nssdc_id": "2018-042A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-042A",
        "dataset_id": "NSSDCA 2018-042A",
    },
    {
        "id": "phoenix",
        "mission": "Phoenix",
        "name": "Phoenix lander",
        "kind": "lander",
        "lat": -68.25,
        "lon": -109.9,
        "body": "mars",
        "nssdc_id": "2007-034A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-034A",
        "dataset_id": "NSSDCA 2007-034A",
    },
    {
        "id": "viking1",
        "mission": "Viking 1",
        "name": "Viking 1 lander",
        "kind": "lander",
        "lat": 22.27,
        "lon": -47.95,
        "body": "mars",
        "nssdc_id": "1975-075C",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-075C",
        "dataset_id": "NSSDCA 1975-075C",
    },
    {
        "id": "viking2",
        "mission": "Viking 2",
        "name": "Viking 2 lander",
        "kind": "lander",
        "lat": 47.64,
        "lon": 134.28,
        "body": "mars",
        "nssdc_id": "1975-083C",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083C",
        "dataset_id": "NSSDCA 1975-083C",
    },
    {
        "id": "pathfinder",
        "mission": "Mars Pathfinder",
        "name": "Mars Pathfinder / Sojourner",
        "kind": "lander_rover",
        "lat": 19.13,
        "lon": -33.217,
        "body": "mars",
        "nssdc_id": "1996-068A",
        "source_url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-068A",
        "dataset_id": "NSSDCA 1996-068A",
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_bytes(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AbandonedNotForgotten/1.0 (NASA Space Apps; dataset cache)"},
    )
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as res:
        return res.read()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}")


def sites_to_geojson(sites: list[dict], title: str, source: str) -> dict:
    features = []
    for s in sites:
        lon, lat = float(s["lon"]), float(s["lat"])
        props = {k: v for k, v in s.items() if k not in ("lon", "lat")}
        props["lat"] = lat
        props["lon"] = lon
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": props,
            }
        )
    return {
        "type": "FeatureCollection",
        "name": title,
        "crs_note": "lon,lat degrees; Moon: Mean Earth/Polar Axis (NSSDCA LRO); Mars: planetocentric as cited",
        "source": source,
        "fetched_at": utc_now(),
        "features": features,
    }


def fetch_insight_weather(api_key: str) -> dict | None:
    url = (
        "https://api.nasa.gov/insight_weather/"
        f"?api_key={api_key}&feedtype=json&ver=1.0"
    )
    print("· InSight Mars Weather Service API…")
    try:
        raw = json.loads(fetch_bytes(url).decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as err:
        print(f"  WARN insight weather failed: {err}")
        return None

    sols = []
    for key in raw.get("sol_keys") or []:
        block = raw.get(key) or {}
        sols.append(
            {
                "sol": int(key),
                "season": block.get("Season"),
                "first_utc": block.get("First_UTC"),
                "last_utc": block.get("Last_UTC"),
                "temp_avg_c": (block.get("AT") or {}).get("av"),
                "temp_min_c": (block.get("AT") or {}).get("mn"),
                "temp_max_c": (block.get("AT") or {}).get("mx"),
                "pressure_avg_pa": (block.get("PRE") or {}).get("av"),
                "wind_avg_ms": (block.get("HWS") or {}).get("av"),
                "wind_max_ms": (block.get("HWS") or {}).get("mx"),
            }
        )
    return {
        "title": "InSight Mars Weather (archived sol summaries)",
        "endpoint": "https://api.nasa.gov/insight_weather/",
        "docs": "https://api.nasa.gov/#Insight",
        "human": "https://mars.nasa.gov/insight/weather/",
        "note": "InSight ended Dec 2022; feed returns historical last-available sols.",
        "fetched_at": utc_now(),
        "sol_keys": raw.get("sol_keys") or [],
        "sols": sols,
        "raw_included": False,
    }


def fetch_perseverance_raw_sample(limit: int = 12) -> dict | None:
    url = (
        "https://mars.nasa.gov/rss/api/?feed=raw_images"
        f"&category=mars2020&feedtype=json&num={limit}"
    )
    print("· Perseverance raw image metadata (mars.nasa.gov)…")
    try:
        raw = json.loads(fetch_bytes(url).decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as err:
        print(f"  WARN perseverance raw failed: {err}")
        return None

    images = []
    for im in raw.get("images") or []:
        files = im.get("image_files") or {}
        cam = im.get("camera") or {}
        images.append(
            {
                "imageid": im.get("imageid"),
                "title": im.get("title"),
                "sol": im.get("sol"),
                "date_taken_utc": im.get("date_taken_utc"),
                "instrument": cam.get("instrument"),
                "thumb": files.get("small") or files.get("medium"),
                "image": files.get("medium") or files.get("large"),
            }
        )
    return {
        "title": "Mars 2020 Perseverance raw image sample",
        "endpoint": "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020",
        "credit": "NASA / JPL-Caltech",
        "fetched_at": utc_now(),
        "count": len(images),
        "images": images,
    }


def verify_nssdc_lunar_page() -> bool:
    url = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
    print("· NSSDCA Apollo landing sites page…")
    try:
        html = fetch_bytes(url).decode("utf-8", errors="replace")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as err:
        print(f"  WARN could not reach NSSDCA page: {err}")
        write_json(
            OUT / "lunar_sites_nssdc_citation.json",
            {
                "source_url": url,
                "fetched_at": utc_now(),
                "reference_system": "Mean Earth/Polar Axis Lunar Reference System (DE421); LRO imagery",
                "citation": "Wagner et al., Icarus 283, pp. 92-103 (2017); NSSDCA lunar sites table",
                "verified_sample_coords": False,
                "error": str(err),
            },
        )
        return False
    ok = "Apollo 11" in html and "0.67416" in html
    print("  verified" if ok else "  page reached but expected coords not found")
    write_json(
        OUT / "lunar_sites_nssdc_citation.json",
        {
            "source_url": url,
            "fetched_at": utc_now(),
            "reference_system": "Mean Earth/Polar Axis Lunar Reference System (DE421); LRO imagery",
            "citation": "Wagner et al., Icarus 283, pp. 92-103 (2017); NSSDCA lunar sites table",
            "verified_sample_coords": ok,
        },
    )
    return ok


def export_abandoned_catalog() -> None:
    """Copy left-behind narrative fields from objects.geojson into data/nasa/."""
    print("· Exporting abandoned hardware catalog from objects.geojson…")
    src = ROOT / "data" / "objects.geojson"
    data = json.loads(src.read_text(encoding="utf-8"))
    sites = [f.get("properties") or {} for f in data.get("features") or []]
    write_json(
        OUT / "abandoned_hardware.json",
        {
            "title": "Abandoned NASA hardware catalog (challenge sites)",
            "description": "Left-behind Moon/Mars hardware: why_left, science, dates, NSSDCA IDs",
            "source": "data/objects.geojson (NSSDCA-linked)",
            "fetched_at": utc_now(),
            "count": len(sites),
            "sites": sites,
        },
    )


def write_static_catalogs() -> None:
    print("· Writing NSSDCA lunar / Mars site catalogs…")
    write_json(
        OUT / "lunar_landing_sites.geojson",
        sites_to_geojson(
            NSSDC_LUNAR_SITES,
            "NASA NSSDCA Apollo landing / experiment sites",
            "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
        ),
    )
    write_json(
        OUT / "mars_landing_sites.geojson",
        sites_to_geojson(
            NSSDC_MARS_SITES,
            "NASA Mars surface hardware (challenge subset)",
            "https://nssdc.gsfc.nasa.gov/",
        ),
    )


def write_manifest(files: dict[str, str], extras: dict | None = None) -> None:
    manifest = {
        "version": 1,
        "updated": utc_now(),
        "project": "Abandoned but not Forgotten",
        "how_to_update": [
            "Replace any file listed under active with a newer copy (same schema).",
            "Or edit active.* paths to point at your new filenames under data/nasa/.",
            "Keep objects.geojson as the storytelling site list the 3D viewer loads.",
            "Re-run: python scripts/fetch_nasa_datasets.py to refresh online caches.",
        ],
        "active": {
            # Primary viewer catalog (curated narrative sites)
            "sites": "../objects.geojson",
            # NASA reference layers (coords / weather / imagery metadata)
            "lunar_reference": "lunar_landing_sites.geojson",
            "mars_reference": "mars_landing_sites.geojson",
            "abandoned_hardware": "abandoned_hardware.json",
            "insight_weather": "insight_weather.json",
            "perseverance_raw_sample": "perseverance_raw_sample.json",
            "lunar_citation": "lunar_sites_nssdc_citation.json",
        },
        "files": files,
        "sources": {
            "nssdc_lunar": "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
            "insight_weather_api": "https://api.nasa.gov/#Insight",
            "perseverance_raw": "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020",
            "nasa_open_apis": "https://api.nasa.gov/",
        },
    }
    if extras:
        manifest.update(extras)
    write_json(OUT / "manifest.json", manifest)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    api_key = "DEMO_KEY"
    if len(sys.argv) > 1 and sys.argv[1].strip():
        api_key = sys.argv[1].strip()

    print(f"Output: {OUT}")
    files: dict[str, str] = {}

    write_static_catalogs()
    files["lunar_landing_sites.geojson"] = "NSSDCA Apollo LRO coordinates"
    files["mars_landing_sites.geojson"] = "NSSDCA Mars hardware subset"
    export_abandoned_catalog()
    files["abandoned_hardware.json"] = "Left-behind hardware narrative catalog"

    verify_nssdc_lunar_page()
    files["lunar_sites_nssdc_citation.json"] = "Fetch receipt for NSSDCA lunar table"

    weather = fetch_insight_weather(api_key)
    if weather:
        write_json(OUT / "insight_weather.json", weather)
        files["insight_weather.json"] = f"{len(weather.get('sols') or [])} sols cached"
    else:
        # Keep a stub so the app path always resolves
        stub = {
            "title": "InSight Mars Weather",
            "fetched_at": utc_now(),
            "sol_keys": [],
            "sols": [],
            "error": "Fetch failed — re-run scripts/fetch_nasa_datasets.py with network",
        }
        write_json(OUT / "insight_weather.json", stub)
        files["insight_weather.json"] = "stub (fetch failed)"

    raw = fetch_perseverance_raw_sample()
    if raw:
        write_json(OUT / "perseverance_raw_sample.json", raw)
        files["perseverance_raw_sample.json"] = f"{raw.get('count', 0)} image records"
    else:
        write_json(
            OUT / "perseverance_raw_sample.json",
            {
                "title": "Mars 2020 Perseverance raw image sample",
                "fetched_at": utc_now(),
                "count": 0,
                "images": [],
                "error": "Fetch failed — re-run with network",
            },
        )
        files["perseverance_raw_sample.json"] = "stub (fetch failed)"

    write_manifest(files)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

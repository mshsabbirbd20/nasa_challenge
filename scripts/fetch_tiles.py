#!/usr/bin/env python3
"""
Optional helper: cache NASA Solar System Treks WMTS tiles for a region.

Full-planet PMTiles are large. For the hackathon demo the app ships with
offline PNG basemaps (assets/tiles/moon_basemap.png, mars_basemap.png).

If you have tippecanoe / rio-mbtiles tooling, convert a GeoTIFF mosaic to
assets/tiles/moon.pmtiles and mars.pmtiles — map.js will prefer those.

Trek GetCapabilities (no auth):
  https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
  https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
TILES = ROOT / "assets" / "tiles"

# Sample tile URL templates (EPSG:4326 / geographic WMTS-style XYZ approximations).
# Exact templates vary; verify against GetCapabilities before bulk download.
TREK = {
    "moon": (
        "https://trek.nasa.gov/tiles/Moon/EQ/"
        "LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/"
        "{z}/{y}/{x}.jpg"
    ),
    "mars": (
        "https://trek.nasa.gov/tiles/Mars/EQ/"
        "Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/"
        "{z}/{y}/{x}.jpg"
    ),
}


def fetch_sample(body: str, z: int = 2, x: int = 0, y: int = 0) -> pathlib.Path:
    TILES.mkdir(parents=True, exist_ok=True)
    url = TREK[body].format(z=z, x=x, y=y)
    out = TILES / f"{body}_sample_z{z}_{x}_{y}.jpg"
    print(f"GET {url}")
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            out.write_bytes(r.read())
        print(f"Wrote {out} ({out.stat().st_size} bytes)")
    except Exception as exc:
        print(f"Could not fetch sample tile ({exc}).", file=sys.stderr)
        print("Offline SVG basemaps remain the default for demos.", file=sys.stderr)
        manifest = {
            "status": "fallback",
            "reason": str(exc),
            "basemaps": ["moon_basemap.png", "mars_basemap.png"],
        }
        (TILES / "cache_status.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return out
    (TILES / "cache_status.json").write_text(
        json.dumps({"status": "sample_ok", "file": out.name}, indent=2), encoding="utf-8"
    )
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Fetch a sample Trek tile or report offline basemap status.")
    p.add_argument("--body", choices=("moon", "mars", "both"), default="both")
    args = p.parse_args()
    bodies = ("moon", "mars") if args.body == "both" else (args.body,)
    for body in bodies:
        fetch_sample(body)
    print("Done. Prefer assets/tiles/*_basemap.png for offline judging demos.")


if __name__ == "__main__":
    main()

# Abandoned but not Forgotten

NASA Space Apps Challenge 2026

Cinematic 3D expedition across Earth, the Moon, and Mars — NASA hardware left behind, waiting on real coordinates.

## Experience

1. Start in **Earth orbit**.
2. Fly to the **Moon** or **Mars**.
3. Drag to orbit, zoom, tap glowing sites.
4. Right panel: NASA catalog fields + **Coming soon** storytelling.
5. On Mars: cached **InSight weather** summary when available.

## NASA datasets

Cached under `data/nasa/` (see [data/nasa/README.md](data/nasa/README.md)).

Refresh:

```bash
python scripts/fetch_nasa_datasets.py
```

## Run

```bash
cd abandoned-not-forgotten
python -m http.server 8787 --bind 127.0.0.1
```

Open http://127.0.0.1:8787/web/

## Stack

- Three.js + OrbitControls (vendored)
- HTML / CSS / JS static front-end
- GeoJSON site catalog (`data/objects.geojson`)
- NASA open caches: NSSDCA coords, InSight weather API, Perseverance raw metadata
- Apache-2.0

## License

Apache-2.0 — see [LICENSE](LICENSE).

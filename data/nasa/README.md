# NASA datasets (cached)

Folder: `data/nasa/`

Offline caches of NASA-relevant open data + the project's left-behind hardware catalog.
The viewer reads `manifest.json` → `active` paths.

## Included

| File | Source | Contents |
|------|--------|----------|
| `manifest.json` | local | Active file map — edit to swap updates |
| `abandoned_hardware.json` | `objects.geojson` | Why left, science, dates, NSSDCA IDs for every pin |
| `lunar_landing_sites.geojson` | [NSSDCA Apollo sites](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) | LM / ALSEP / LRRR LRO coords |
| `mars_landing_sites.geojson` | [NSSDCA](https://nssdc.gsfc.nasa.gov/) | Mars landers & rovers (challenge set) |
| `insight_weather.json` | [InSight Weather API](https://api.nasa.gov/) | Archived sol weather |
| `perseverance_raw_sample.json` | [mars.nasa.gov raw](https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020) | Sample image metadata |
| `lunar_sites_nssdc_citation.json` | NSSDCA | Citation / fetch receipt |
| `../objects.geojson` | curated + NSSDCA | Primary 3D pins (Moon + Mars) |

## Refresh

```bash
python scripts/fetch_nasa_datasets.py
python scripts/fetch_nasa_datasets.py YOUR_NASA_API_KEY
```

## Swap an updated dataset later

1. Drop the new file in `data/nasa/`
2. Point `manifest.json` → `active` at it
3. Reload the web app

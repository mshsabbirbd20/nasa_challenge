# AI use disclosure

Project: **Abandoned but not Forgotten** (NASA Space Apps Challenge 2026, Challenge 1)

## Tools used

| Tool | Role |
|------|------|
| Cursor (Composer agent) | Scaffolded repository, MapLibre UI, GeoJSON curation, Bangla strings, offline basemap assets, README |

## What the team owns

- Challenge selection and narrative framing for Bangladesh / Space Apps judging
- Verification of every NSSDCA `source_url` and coordinate against NASA public pages before submission
- Demo video recording, project page text, and final photo swaps for archival NASA imagery
- Any live Trek → PMTiles caching beyond the sample script

## Prompts / guidance used (summary)

- Implement the Challenge 1 plan from the Space Apps 2026 Bangladesh build guide: static MapLibre app, curated GeoJSON, timeline, EN/BN toggle, offline assets, Apache-2.0

## Deterministic vs generative

- **Deterministic:** map positions, timeline filter, citation fields, GeoJSON schema
- **Generative assist:** UI copy drafting (EN/BN), illustrative SVG cards, project documentation

No LLM is called at runtime. NASA open datasets are cached under `data/nasa/` (refresh with `scripts/fetch_nasa_datasets.py`).

/**
 * Load NASA datasets via data/nasa/manifest.json.
 * Swap files later by editing manifest.active paths (same schemas).
 */

function resolveDataUrl(relFromNasaDir) {
  return new URL(`../data/nasa/${relFromNasaDir}`, window.location.href);
}

export async function loadManifest() {
  const url = new URL("../data/nasa/manifest.json", window.location.href);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
  return res.json();
}

async function fetchJson(rel) {
  const res = await fetch(resolveDataUrl(rel));
  if (!res.ok) throw new Error(`${rel} HTTP ${res.status}`);
  return res.json();
}

export async function loadNasaProjectData() {
  const manifest = await loadManifest();
  const active = manifest.active || {};

  const sitesRel = active.sites || "../objects.geojson";
  const sites = await fetchJson(sitesRel);
  const features = sites.features || [];

  const optional = async (key) => {
    if (!active[key]) return null;
    try {
      return await fetchJson(active[key]);
    } catch (err) {
      console.warn(`${key} missing`, err);
      return null;
    }
  };

  const [weather, perseveranceSample, abandoned, lunarRef, marsRef, lunarCitation] =
    await Promise.all([
      optional("insight_weather"),
      optional("perseverance_raw_sample"),
      optional("abandoned_hardware"),
      optional("lunar_reference"),
      optional("mars_reference"),
      optional("lunar_citation"),
    ]);

  return {
    manifest,
    moon: features.filter((f) => f.properties?.body === "moon"),
    mars: features.filter((f) => f.properties?.body === "mars"),
    weather,
    perseveranceSample,
    abandoned,
    lunarRef,
    marsRef,
    lunarCitation,
  };
}

export function latestWeatherSol(weather) {
  const sols = weather?.sols;
  if (!Array.isArray(sols) || !sols.length) return null;
  return sols[sols.length - 1];
}

export function assetUrl(rel) {
  if (!rel) return null;
  return new URL("../" + String(rel).replace(/^\//, ""), window.location.href).href;
}

import { createUniverse } from "./scene.js";
import {
  loadNasaProjectData,
  latestWeatherSol,
  assetUrl,
} from "./data.js";

const SIDE = {
  earth: {
    title: "Earth orbit",
    mission: "Home world · standing by",
    copy: "Select Moon or Mars, then ENGAGE. Tap glowing sites for left-behind NASA hardware data.",
    mode: "STBY",
    channel: "CH · EARTH ORBIT",
    vel: "7.66",
    alt: "408",
    pwr: "98",
    signal: "86%",
    scan: "IDLE",
    link: "NOMINAL",
    throttle: "12%",
  },
  flying: {
    title: "Coast phase",
    mission: "Transit in progress",
    copy: "Main engine committed. Destination closing on the central viewer.",
    mode: "BURN",
    channel: "CH · TRANSIT",
    vel: "11.2",
    alt: "—",
    pwr: "91",
    signal: "54%",
    scan: "TRACK",
    link: "DELAYED",
    throttle: "78%",
  },
  moon: {
    title: "Lunar low orbit",
    mission: "Drone feed · abandoned sites",
    copy: "Drag to orbit. Tap a lander — NSSDCA/LRO lunar coords + left-behind facts appear here.",
    mode: "DRONE",
    channel: "CH · LUNAR DRONE",
    vel: "1.62",
    alt: "48",
    pwr: "94",
    signal: "92%",
    scan: "SURFACE",
    link: "NOMINAL",
    throttle: "8%",
  },
  mars: {
    title: "Martian low orbit",
    mission: "Drone feed · rover field",
    copy: "Drag to orbit. Tap a rover/lander for NASA site data + InSight weather when relevant.",
    mode: "DRONE",
    channel: "CH · MARS DRONE",
    vel: "3.41",
    alt: "120",
    pwr: "89",
    signal: "71%",
    scan: "SURFACE",
    link: "NOMINAL",
    throttle: "10%",
  },
};

const STATUS = {
  earth: "EARTH ORBIT · STANDING BY",
  flying: "SPACECRAFT IN TRANSIT · ENGAGED",
  moon: "LUNAR DRONE · ORBIT HOLD",
  mars: "MARTIAN DRONE · ORBIT HOLD",
};

const FLY_TEXT = {
  "earth-moon": "TLI BURN · TRANS-LUNAR…",
  "earth-mars": "HOHMANN TRANSFER · MARS…",
  "moon-mars": "DEPARTING LUNAR ORBIT…",
  "mars-moon": "DEPARTING MARS ORBIT…",
  "moon-earth": "RETURN TO EARTH…",
  "mars-earth": "RETURN TO EARTH…",
};

/** @type {object|null} */
let nasaWeather = null;
/** @type {object|null} */
let perseveranceSample = null;
/** @type {object|null} */
let lunarRef = null;
/** @type {object|null} */
let lunarCitation = null;

function setNav(active) {
  document.querySelectorAll(".rack-btn").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.dest === active);
  });
}

function setZoomLabel(level) {
  const el = document.getElementById("tel-zoom");
  if (el) el.textContent = `${level.toFixed(1)}×`;
}

function hideEl(id, hidden = true) {
  const el = document.getElementById(id);
  if (el) el.hidden = hidden;
}

function clearSiteDetail() {
  hideEl("side-image", true);
  hideEl("side-image-credit", true);
  hideEl("side-facts", true);
  hideEl("side-dataset", true);
  hideEl("side-extra", true);
  const img = document.getElementById("side-image");
  if (img) img.removeAttribute("src");
}

function setHtml(id, html, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html || "";
  el.hidden = !show;
}

function setSide(mode) {
  const s = SIDE[mode] || SIDE.earth;
  document.getElementById("side-title").textContent = s.title;
  document.getElementById("side-mission").textContent = s.mission;
  document.getElementById("side-copy").textContent = s.copy;
  document.getElementById("side-mode").textContent = s.mode;
  document.getElementById("tv-channel").textContent = s.channel;
  document.getElementById("tel-vel").textContent = s.vel;
  document.getElementById("tel-alt").textContent = s.alt;
  document.getElementById("tel-pwr").textContent = s.pwr;
  clearSiteDetail();

  if (mode === "mars" && nasaWeather?.sols?.length) {
    const latest = latestWeatherSol(nasaWeather);
    setHtml(
      "side-extra",
      [
        `<strong>InSight weather (NASA API cache)</strong>`,
        `<div>Sol ${latest.sol} · ${latest.season || "—"}</div>`,
        `<div>Temp avg ${latest.temp_avg_c != null ? latest.temp_avg_c.toFixed(1) + " °C" : "—"}</div>`,
        `<div>Pressure ${latest.pressure_avg_pa != null ? Math.round(latest.pressure_avg_pa) + " Pa" : "—"}</div>`,
        `<div>Wind ${latest.wind_avg_ms != null ? latest.wind_avg_ms.toFixed(1) + " m/s avg" : "—"}</div>`,
        `<div class="dim">${nasaWeather.note || "Mars-only · InSight lander at Elysium Planitia"}</div>`,
      ].join(""),
      true
    );
  } else if (mode === "moon" && lunarRef?.features?.length) {
    const feats = lunarRef.features;
    const kinds = {};
    for (const f of feats) {
      const k = f.properties?.kind || "site";
      kinds[k] = (kinds[k] || 0) + 1;
    }
    const kindLine = Object.entries(kinds)
      .map(([k, n]) => `${k.replace(/_/g, " ")} ${n}`)
      .join(" · ");
    setHtml(
      "side-extra",
      [
        `<strong>NSSDCA lunar sites (LRO coords)</strong>`,
        `<div>${feats.length} reference points cached</div>`,
        `<div>${escapeHtml(kindLine)}</div>`,
        `<div>Frame · Mean Earth / Polar Axis (DE421)</div>`,
        lunarCitation?.source_url
          ? `<div><a href="${lunarCitation.source_url}" target="_blank" rel="noopener">NSSDCA lunar sites table</a></div>`
          : lunarRef.source
            ? `<div><a href="${lunarRef.source}" target="_blank" rel="noopener">NSSDCA source</a></div>`
            : "",
        `<div class="dim">Moon has no InSight-style weather API — NASA publishes landing/ALSEP coordinates instead.</div>`,
      ].join(""),
      true
    );
  }
}

/** Full left-behind + NASA fields in the right panel */
function showStory(feature) {
  const where = feature.body === "mars" ? "Mars" : "Moon";
  document.getElementById("side-title").textContent = feature.name || "Site";
  document.getElementById("side-mission").textContent =
    `${feature.mission || "Mission"} · ${where}`;

  const why = feature.why_left || "";
  const science = feature.science_enabled || "";
  document.getElementById("side-copy").textContent =
    why || "Abandoned NASA hardware still on the surface.";

  const img = document.getElementById("side-image");
  const credit = document.getElementById("side-image-credit");
  const src = assetUrl(feature.image);
  if (src && img) {
    img.hidden = false;
    img.alt = feature.name || "Hardware";
    img.src = src;
    if (credit) {
      credit.hidden = false;
      credit.textContent = feature.image_credit
        ? `Credit · ${feature.image_credit}`
        : "Credit · NASA";
    }
  } else {
    hideEl("side-image", true);
    hideEl("side-image-credit", true);
  }

  const facts = [];
  if (why) {
    facts.push(`<div class="fact"><span>WHY LEFT</span><p>${escapeHtml(why)}</p></div>`);
  }
  if (science) {
    facts.push(
      `<div class="fact"><span>SCIENCE ENABLED</span><p>${escapeHtml(science)}</p></div>`
    );
  }
  setHtml("side-facts", facts.join(""), facts.length > 0);

  const meta = [];
  if (feature.lat != null && feature.lon != null) {
    meta.push(
      `<div><span>COORDS</span><strong>${Number(feature.lat).toFixed(4)}°, ${Number(feature.lon).toFixed(4)}°</strong></div>`
    );
  }
  if (feature.left_behind) {
    meta.push(`<div><span>LEFT BEHIND</span><strong>${escapeHtml(feature.left_behind)}</strong></div>`);
  }
  if (feature.last_contact) {
    meta.push(`<div><span>LAST CONTACT</span><strong>${escapeHtml(feature.last_contact)}</strong></div>`);
  }
  if (feature.dataset_id) {
    meta.push(`<div><span>DATASET</span><strong>${escapeHtml(feature.dataset_id)}</strong></div>`);
  }
  if (feature.coord_source) {
    meta.push(`<div><span>COORD SRC</span><strong>${escapeHtml(feature.coord_source)}</strong></div>`);
  }
  if (feature.source_url) {
    meta.push(
      `<div><span>SOURCE</span><strong><a href="${feature.source_url}" target="_blank" rel="noopener">NSSDCA record</a></strong></div>`
    );
  }
  setHtml("side-dataset", meta.join(""), meta.length > 0);

  const extra = [];
  if (feature.id === "insight" && nasaWeather?.sols?.length) {
    const latest = latestWeatherSol(nasaWeather);
    extra.push(`<strong>InSight weather cache</strong>`);
    extra.push(
      `<div>Sol ${latest.sol}: temp ${
        latest.temp_avg_c != null ? latest.temp_avg_c.toFixed(1) + " °C avg" : "—"
      }, pressure ${
        latest.pressure_avg_pa != null ? Math.round(latest.pressure_avg_pa) + " Pa" : "—"
      }</div>`
    );
    extra.push(`<div class="dim">${escapeHtml(nasaWeather.note || "NASA InSight Weather API")}</div>`);
  }
  if (feature.id === "perseverance" && perseveranceSample?.images?.length) {
    const shot = perseveranceSample.images.find((im) => im.thumb) || perseveranceSample.images[0];
    extra.push(`<strong>Perseverance raw sample (NASA)</strong>`);
    extra.push(`<div>${escapeHtml(shot.title || "Surface image")} · Sol ${shot.sol ?? "—"}</div>`);
    if (shot.thumb) {
      extra.push(
        `<a class="extra-thumb" href="${shot.image || shot.thumb}" target="_blank" rel="noopener"><img src="${shot.thumb}" alt="Perseverance sample"></a>`
      );
    }
    extra.push(`<div class="dim">${escapeHtml(perseveranceSample.credit || "NASA / JPL-Caltech")}</div>`);
  }
  if (feature.body === "moon" && lunarRef?.features?.length) {
    const match = matchLunarReference(feature);
    if (match) {
      extra.push(`<strong>NSSDCA / LRO reference match</strong>`);
      extra.push(`<div>${escapeHtml(match.name || match.id)}</div>`);
      if (match.lat != null && match.lon != null) {
        extra.push(
          `<div>LRO ${Number(match.lat).toFixed(5)}°, ${Number(match.lon).toFixed(5)}°</div>`
        );
      }
      if (match.kind) extra.push(`<div>Kind · ${escapeHtml(String(match.kind).replace(/_/g, " "))}</div>`);
      extra.push(
        `<div class="dim">Official lunar table — not weather (Moon has no InSight API)</div>`
      );
    }
  }
  setHtml("side-extra", extra.join(""), extra.length > 0);
}

function matchLunarReference(feature) {
  const feats = lunarRef?.features || [];
  if (!feats.length) return null;

  const mission = String(feature.mission || "");
  const apolloNum = (mission.match(/Apollo\s*(\d+)/i) || feature.id?.match(/apollo(\d+)/i) || [])[1];
  if (!apolloNum) return null;

  const id = String(feature.id || "").toLowerCase();
  const preferKind = id.includes("alsep") || id.includes("pse")
    ? "alsep"
    : id.includes("lrrr")
      ? "lrrr"
      : "lunar_module";

  const sameMission = feats
    .map((f) => f.properties)
    .filter((p) => p && String(p.mission || "").includes(apolloNum));

  return (
    sameMission.find((p) => p.kind === preferKind) ||
    sameMission.find((p) => p.kind === "lunar_module") ||
    sameMission[0] ||
    null
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setStatus(mode) {
  document.getElementById("status-line").textContent = STATUS[mode] || STATUS.earth;
  const dot = document.getElementById("dock-dot");
  dot.classList.remove("mars", "fly");
  if (mode === "mars") dot.classList.add("mars");
  if (mode === "flying") dot.classList.add("fly");
}

function setDockMode(mode) {
  const home = document.getElementById("home-actions");
  const orbit = document.getElementById("orbit-actions");
  const chipMoon = document.getElementById("chip-moon");
  if (mode === "earth") {
    home.hidden = false;
    orbit.hidden = true;
  } else if (mode === "flying") {
    home.hidden = true;
    orbit.hidden = true;
  } else {
    home.hidden = true;
    orbit.hidden = false;
    document.getElementById("orbit-title").textContent =
      mode === "mars"
        ? "MARTIAN DRONE · DRAG ON SCREEN TO ORBIT"
        : "LUNAR DRONE · DRAG ON SCREEN TO ORBIT";
    chipMoon.hidden = mode !== "moon";
  }
}

async function main() {
  const loading = document.getElementById("loading");
  const data = await loadNasaProjectData();
  nasaWeather = data.weather;
  perseveranceSample = data.perseveranceSample;
  lunarRef = data.lunarRef;
  lunarCitation = data.lunarCitation;
  const { moon, mars, manifest } = data;

  const updated = manifest?.updated ? ` · data ${String(manifest.updated).slice(0, 10)}` : "";
  const foot = document.querySelector(".rack-right .rack-foot");
  if (foot) foot.textContent = `NASA + abandoned catalog${updated}`;

  const universe = await createUniverse(document.getElementById("c"), {
    moonFeatures: moon,
    marsFeatures: mars,
    onAssetClick: showStory,
  });

  if (loading) loading.hidden = true;
  setZoomLabel(universe.getZoomLevel());

  const flyCaption = document.getElementById("fly-caption");
  const flyText = document.getElementById("fly-text");
  const buttons = [
    document.getElementById("btn-to-moon"),
    document.getElementById("btn-to-mars"),
    document.getElementById("chip-moon"),
    document.getElementById("chip-home"),
  ];

  let busy = false;

  function fly(from, to) {
    if (busy) return;
    busy = true;
    flyCaption.hidden = false;
    flyText.textContent = FLY_TEXT[`${from}-${to}`] || "ENGAGING…";
    setStatus("flying");
    setSide("flying");
    setDockMode("flying");
    setNav(to === "earth" ? "earth" : to);
    buttons.forEach((b) => {
      if (b) b.disabled = true;
    });

    universe.beginFlight(from, to, (arrived) => {
      busy = false;
      flyCaption.hidden = true;
      buttons.forEach((b) => {
        if (b) b.disabled = false;
      });
      setNav(arrived);
      setStatus(arrived);
      setSide(arrived);
      setDockMode(arrived);
      setZoomLabel(universe.getZoomLevel());
    });
  }

  document.getElementById("btn-to-moon").addEventListener("click", () => fly("earth", "moon"));
  document.getElementById("btn-to-mars").addEventListener("click", () => fly("earth", "mars"));
  document.getElementById("chip-moon").addEventListener("click", () => fly("moon", "mars"));
  document.getElementById("chip-home").addEventListener("click", () => {
    const mode = universe.getMode();
    if (mode === "moon" || mode === "mars") fly(mode, "earth");
  });

  document.querySelectorAll(".rack-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.dataset.dest;
      const mode = universe.getMode();
      if (busy || mode === "flying") return;
      if (dest === mode) return;
      if (dest === "earth") {
        if (mode === "earth") return;
        fly(mode, "earth");
        return;
      }
      if (mode === "earth") {
        fly("earth", dest);
        return;
      }
      fly(mode, dest);
    });
  });

  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    setZoomLabel(universe.zoomIn());
  });
  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    setZoomLabel(universe.zoomOut());
  });
  document.getElementById("btn-zoom-reset").addEventListener("click", () => {
    setZoomLabel(universe.resetZoom());
  });

  document.getElementById("c").addEventListener(
    "wheel",
    () => {
      requestAnimationFrame(() => setZoomLabel(universe.getZoomLevel()));
    },
    { passive: true }
  );

  setStatus("earth");
  setSide("earth");
  setDockMode("earth");
  setNav("earth");
}

main().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading) {
    loading.innerHTML = `<p>SYSTEM FAULT</p><span>Serve project root · python -m http.server 8790</span>`;
  }
});

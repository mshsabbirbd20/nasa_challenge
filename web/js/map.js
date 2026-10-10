/* global window, maplibregl, pmtiles */
(function (global) {
  "use strict";

  const MapView = {
    map: null,
    markers: [],
    body: "moon",
    features: [],
    reducedMotion: false,

    basemapUrl(body) {
      return new URL("../assets/tiles/" + body + "_basemap.png", window.location.href).href;
    },

    pmtilesUrl(body) {
      return new URL("../assets/tiles/" + body + ".pmtiles", window.location.href).href;
    },

    async init(containerId, features) {
      this.features = features;
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Register PMTiles protocol when library and files are present
      if (typeof pmtiles !== "undefined" && pmtiles.Protocol) {
        const protocol = new pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);
      }

      this.map = new maplibregl.Map({
        container: containerId,
        style: this.buildStyle("moon"),
        center: [23.47, 0.67],
        zoom: 3.2,
        maxZoom: 8,
        minZoom: 1.2,
        attributionControl: false,
        fadeDuration: this.reducedMotion ? 0 : 300,
      });

      this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
      this.map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            "Basemap style inspired by NASA Solar System Treks · Object metadata: NSSDCA",
        })
      );

      await new Promise((resolve) => this.map.on("load", resolve));
      this.renderMarkers();
      return this.map;
    },

    buildStyle(body) {
      const bg = body === "mars" ? "#4a2818" : "#3a3834";
      const url = this.basemapUrl(body);
      return {
        version: 8,
        name: "anf-" + body,
        sources: {
          basemap: {
            type: "image",
            url: url,
            coordinates: [
              [-180, 85],
              [180, 85],
              [180, -85],
              [-180, -85],
            ],
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": bg } },
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
            paint: { "raster-opacity": 0.95, "raster-fade-duration": 0 },
          },
        ],
      };
    },

    async setBody(body) {
      if (body === this.body) return;
      this.body = body;
      document.body.classList.toggle("body-moon", body === "moon");
      document.body.classList.toggle("body-mars", body === "mars");

      const center = body === "moon" ? [23.47, 0.67] : [77.45, 18.44];
      const style = this.buildStyle(body);

      // Prefer local PMTiles if the file responds
      try {
        const probe = await fetch(this.pmtilesUrl(body), { method: "HEAD" });
        if (probe.ok && typeof pmtiles !== "undefined") {
          style.sources = {
            basemap: {
              type: "raster",
              url: "pmtiles://" + this.pmtilesUrl(body),
              tileSize: 256,
            },
          };
          style.layers = [
            { id: "bg", type: "background", paint: { "background-color": body === "mars" ? "#4a2818" : "#3a3834" } },
            { id: "basemap", type: "raster", source: "basemap" },
          ];
        }
      } catch (_) {
        /* keep SVG image basemap */
      }

      this.map.setStyle(style);
      await new Promise((resolve) => this.map.once("style.load", resolve));
      this.map.jumpTo({ center: center, zoom: body === "moon" ? 3.2 : 2.6 });
      this.renderMarkers();
    },

    clearMarkers() {
      this.markers.forEach((m) => m.remove());
      this.markers = [];
    },

    visibleFeatures() {
      const Timeline = global.ANF.Timeline;
      return this.features.filter(
        (f) => f.properties.body === this.body && Timeline.accepts(f)
      );
    },

    renderMarkers() {
      this.clearMarkers();
      const visible = this.visibleFeatures();
      const countEl = document.getElementById("visible-count");
      if (countEl) countEl.textContent = String(visible.length);

      visible.forEach((feature) => {
        const p = feature.properties;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "marker-btn" + (p.body === "mars" ? " mars" : "");
        if (p.id === "apollo11-lm-descent") el.classList.add("killer");
        el.setAttribute("aria-label", p.name + ", " + p.mission);
        el.title = p.name;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectFeature(feature, true);
        });
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.selectFeature(feature, true);
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lon, p.lat])
          .addTo(this.map);
        this.markers.push(marker);
      });
    },

    selectFeature(feature, fly) {
      const p = feature.properties;
      if (fly && !this.reducedMotion) {
        this.map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(this.map.getZoom(), 4.5), speed: 0.8 });
      } else if (fly) {
        this.map.jumpTo({ center: [p.lon, p.lat], zoom: Math.max(this.map.getZoom(), 4.5) });
      }
      global.ANF.Panel.open(feature);
    },

    focusApollo11() {
      const f = this.features.find((x) => x.properties.id === "apollo11-lm-descent");
      if (!f) return;
      if (this.body !== "moon") {
        this.setBody("moon").then(() => this.selectFeature(f, true));
      } else {
        this.selectFeature(f, true);
      }
    },
  };

  global.ANF = global.ANF || {};
  global.ANF.MapView = MapView;
})(window);

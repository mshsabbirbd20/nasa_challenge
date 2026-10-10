/* global window */
(function (global) {
  "use strict";

  const Panel = {
    root: null,
    currentId: null,

    init() {
      this.root = document.getElementById("panel");
      document.getElementById("panel-close").addEventListener("click", () => this.close());
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.root && !this.root.hidden) {
          this.close();
        }
      });
    },

    assetUrl(rel) {
      // GeoJSON paths are repo-root relative (assets/...). Page lives in /web/.
      return new URL("../" + rel.replace(/^\//, ""), window.location.href).href;
    },

    open(feature) {
      const p = feature.properties;
      const I18n = global.ANF.I18n;
      this.currentId = p.id;
      this.root.hidden = false;

      document.getElementById("panel-name").textContent = I18n.text(p, "name");
      document.getElementById("panel-mission").textContent = p.mission;
      document.getElementById("panel-coords").textContent =
        p.lat.toFixed(5) + "°, " + p.lon.toFixed(5) + "°";
      document.getElementById("panel-left").textContent = p.left_behind;
      document.getElementById("panel-contact").textContent = p.last_contact;
      document.getElementById("panel-why").textContent = I18n.text(p, "why_left");
      document.getElementById("panel-science").textContent = I18n.text(p, "science_enabled");

      const img = document.getElementById("panel-image");
      img.src = this.assetUrl(p.image);
      img.alt = I18n.text(p, "name");
      document.getElementById("panel-image-credit").textContent =
        I18n.t("imageCredit") + ": " + p.image_credit;

      const link = document.getElementById("panel-source");
      link.href = p.source_url;
      link.textContent = p.source_url;
      document.getElementById("panel-dataset").textContent = p.dataset_id;

      // Killer-demo focus target for Apollo 11
      if (p.id === "apollo11-lm-descent") {
        this.root.dataset.killer = "true";
      } else {
        delete this.root.dataset.killer;
      }

      document.getElementById("panel-close").focus();
    },

    refresh() {
      if (!this.currentId || !global.ANF.App) return;
      const f = global.ANF.App.featureById(this.currentId);
      if (f) this.open(f);
    },

    close() {
      this.root.hidden = true;
      this.currentId = null;
      const mapEl = document.getElementById("map");
      if (mapEl) mapEl.focus();
    },
  };

  global.ANF = global.ANF || {};
  global.ANF.Panel = Panel;
})(window);

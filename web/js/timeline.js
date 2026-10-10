/* global window */
(function (global) {
  "use strict";

  const Timeline = {
    year: 2026,
    min: 1967,
    max: 2026,
    onChange: null,

    init(features, onChange) {
      this.onChange = onChange;
      const years = features.map((f) => parseInt(f.properties.left_behind.slice(0, 4), 10));
      this.min = Math.min(...years);
      this.max = Math.max(Math.max(...years), 2026);
      this.year = this.max;

      const range = document.getElementById("year-range");
      range.min = String(this.min);
      range.max = String(this.max);
      range.value = String(this.year);
      document.getElementById("year-value").textContent = String(this.year);

      range.addEventListener("input", () => {
        this.year = parseInt(range.value, 10);
        document.getElementById("year-value").textContent = String(this.year);
        if (this.onChange) this.onChange(this.year);
      });
    },

    accepts(feature) {
      const y = parseInt(feature.properties.left_behind.slice(0, 4), 10);
      return y <= this.year;
    },
  };

  global.ANF = global.ANF || {};
  global.ANF.Timeline = Timeline;
})(window);

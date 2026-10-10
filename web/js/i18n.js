/* global window */
(function (global) {
  "use strict";

  const I18n = {
    lang: "en",
    strings: { en: {}, bn: {} },

    async load(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load strings: " + res.status);
      this.strings = await res.json();
      this.lang = localStorage.getItem("anf-lang") || "en";
      this.apply();
      return this.lang;
    },

    t(key) {
      const pack = this.strings[this.lang] || this.strings.en || {};
      return pack[key] || (this.strings.en && this.strings.en[key]) || key;
    },

    toggle() {
      this.lang = this.lang === "en" ? "bn" : "en";
      localStorage.setItem("anf-lang", this.lang);
      this.apply();
      document.documentElement.lang = this.lang === "bn" ? "bn" : "en";
      return this.lang;
    },

    apply() {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        el.textContent = this.t(key);
      });
    },

    text(props, field) {
      if (this.lang === "bn" && props[field + "_bn"]) return props[field + "_bn"];
      return props[field] || "";
    },
  };

  global.ANF = global.ANF || {};
  global.ANF.I18n = I18n;
})(window);

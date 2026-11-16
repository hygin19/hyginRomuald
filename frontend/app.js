/* AVIATOR NEON TRACKER — client logic (manual entry only, no predictions). */
(() => {
  const LANG_KEY = "aviator.lang";
  const SUPPORTED = ["en", "fr", "mg"];

  const els = {
    form: document.getElementById("result-form"),
    submit: document.querySelector("#result-form button[type='submit']"),
    multiplier: document.getElementById("multiplier"),
    date: document.getElementById("result-date"),
    hours: document.getElementById("time-hours"),
    minutes: document.getElementById("time-minutes"),
    seconds: document.getElementById("time-seconds"),
    body: document.getElementById("results-body"),
    empty: document.getElementById("empty-state"),
    loading: document.getElementById("loading-state"),
    exportBtn: document.getElementById("export-btn"),
    importBtn: document.getElementById("import-btn"),
    importInput: document.getElementById("import-input"),
    toast: document.getElementById("toast"),
  };

  const state = {
    lang: detectLanguage(),
    results: [],
    loaded: false,
  };

  /* ---------- language ---------- */

  function detectLanguage() {
    const saved = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : "en";
  }

  function t(key, vars = {}) {
    const dict = window.TRANSLATIONS[state.lang] || window.TRANSLATIONS.en;
    let text = dict[key] ?? window.TRANSLATIONS.en[key] ?? key;
    Object.entries(vars).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
    return text;
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.title = t("appTitle");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
    document.querySelectorAll(".lang__btn").forEach((btn) => {
      const active = btn.dataset.lang === state.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    render();
  }

  document.querySelectorAll(".lang__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem(LANG_KEY, state.lang);
      applyLanguage();
    });
  });

  /* ---------- helpers ---------- */

  const pad = (value) => String(value).padStart(2, "0");

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function setDefaults() {
    const now = new Date();
    els.date.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    els.hours.value = pad(now.getHours());
    els.minutes.value = pad(now.getMinutes());
    els.seconds.value = pad(now.getSeconds());
  }

  function parseMultiplier(raw) {
    const cleaned = String(raw).trim().toLowerCase().replace(/x$/, "").replace(",", ".");
    if (!/^\d*\.?\d+$/.test(cleaned)) return null;
    const value = Number(cleaned);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 100) / 100;
  }

  function parseTimePart(raw, max) {
    if (String(raw).trim() === "") return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > max) return null;
    return value;
  }

  let toastTimer;
  function toast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", isError);
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 3400);
  }

  async function api(path, options) {
    const response = await fetch(`/api${path}`, options);
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json();
        detail = typeof payload.detail === "string" ? payload.detail : "";
      } catch {
        detail = "";
      }
      const error = new Error(detail || `HTTP ${response.status}`);
      error.detail = detail;
      throw error;
    }
    return response.json();
  }

  /* ---------- rendering ---------- */

  function byNewest(a, b) {
    if (a.result_date !== b.result_date) return a.result_date < b.result_date ? 1 : -1;
    if (a.result_time !== b.result_time) return a.result_time < b.result_time ? 1 : -1;
    return b.id - a.id;
  }

  function rowFor(result) {
    const tr = document.createElement("tr");
    tr.dataset.id = result.id;
    const multiplier = Number(result.multiplier);
    const tier = multiplier >= 10 ? "high" : multiplier >= 2 ? "mid" : "low";

    tr.innerHTML = `
      <td>#${escapeHtml(result.id)}</td>
      <td><span class="multiplier" data-tier="${tier}">${multiplier.toFixed(2)}x</span></td>
      <td class="cell-date">${escapeHtml(result.result_date)}</td>
      <td class="cell-time">${escapeHtml(result.result_time)}</td>
      <td><button type="button" class="btn-sink"></button></td>
    `;

    const deleteButton = tr.querySelector(".btn-sink");
    deleteButton.textContent = t("deleteBtn");
    deleteButton.addEventListener("click", () => deleteResult(result.id));
    return tr;
  }

  function render() {
    els.loading.hidden = state.loaded;
    els.empty.hidden = !state.loaded || state.results.length > 0;
    els.empty.textContent = t("emptyState");

    const fragment = document.createDocumentFragment();
    state.results.forEach((result) => fragment.appendChild(rowFor(result)));
    els.body.replaceChildren(fragment);
  }

  async function loadResults() {
    try {
      const results = await api("/results");
      state.results = Array.isArray(results) ? results.sort(byNewest) : [];
    } catch {
      toast(t("errorGeneric"), true);
    } finally {
      state.loaded = true;
      render();
    }
  }

  /* ---------- actions ---------- */

  async function deleteResult(id) {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await api(`/results/${id}`, { method: "DELETE" });
      state.results = state.results.filter((result) => result.id !== id);
      render();
      toast(t("deletedToast"));
    } catch {
      toast(t("errorGeneric"), true);
    }
  }

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const multiplier = parseMultiplier(els.multiplier.value);
    if (multiplier === null) {
      toast(t("invalidMultiplier"), true);
      els.multiplier.focus();
      return;
    }

    const resultDate = els.date.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resultDate)) {
      toast(t("invalidDate"), true);
      els.date.focus();
      return;
    }

    const hours = parseTimePart(els.hours.value, 23);
    const minutes = parseTimePart(els.minutes.value, 59);
    const seconds = parseTimePart(els.seconds.value, 59);
    if (hours === null || minutes === null || seconds === null) {
      toast(t("invalidTime"), true);
      return;
    }

    els.submit.disabled = true;
    try {
      const saved = await api("/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          multiplier,
          result_date: resultDate,
          result_time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        }),
      });
      state.results.push(saved);
      state.results.sort(byNewest);
      state.loaded = true;
      render();
      els.multiplier.value = "";
      els.multiplier.focus();
      setDefaults();
      toast(t("savedToast"));
    } catch (error) {
      const message =
        error.detail === "invalid_multiplier" ? t("invalidMultiplier") : t("errorGeneric");
      toast(message, true);
    } finally {
      els.submit.disabled = false;
    }
  });

  els.exportBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = "/api/export";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  els.importBtn.addEventListener("click", () => els.importInput.click());

  els.importInput.addEventListener("change", async () => {
    const file = els.importInput.files && els.importInput.files[0];
    if (!file) return;

    const body = new FormData();
    body.append("file", file);
    try {
      const summary = await api("/import", { method: "POST", body });
      await loadResults();
      toast(
        t("importSuccess", { imported: summary.imported, skipped: summary.skipped }),
      );
    } catch (error) {
      const detail = error.detail || "";
      const invalid = detail.startsWith("invalid_database") || detail === "empty_file";
      toast(invalid ? t("importInvalid") : t("errorGeneric"), true);
    } finally {
      els.importInput.value = "";
    }
  });

  /* ---------- input niceties ---------- */

  [[els.hours, els.minutes], [els.minutes, els.seconds]].forEach(([from, to]) => {
    from.addEventListener("input", () => {
      if (from.value.length >= 2) to.focus();
    });
  });

  [els.hours, els.minutes, els.seconds].forEach((input, index) => {
    const max = [23, 59, 59][index];
    input.addEventListener("blur", () => {
      const value = Number(input.value);
      if (input.value.trim() === "" || !Number.isInteger(value)) return;
      input.value = pad(Math.min(Math.max(value, 0), max));
    });
  });

  /* ---------- boot ---------- */

  setDefaults();
  applyLanguage();
  loadResults();
})();

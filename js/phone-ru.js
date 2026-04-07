/**
 * Только формат +7 (XXX) XXX-XX-XX. Любые вводимые цифры сразу попадают в маску (до 11 цифр: 7 + 10).
 * 8… → 7…; если первая цифра не 7 и не 8 — перед ней подставляется 7.
 */
(function () {
  var DISPLAY_MAX = 18;

  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  /** Всегда ведущая 7, не больше 11 цифр. */
  function normalizeToEleven(d) {
    d = onlyDigits(d);
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    else if (d[0] !== "7") d = "7" + d;
    return d.slice(0, 11);
  }

  function formatMaskSeven(d) {
    if (!d || d[0] !== "7") return "";
    var body = d.slice(1);
    if (body.length === 0) return "+7";
    var t = "+7 (" + body.slice(0, Math.min(3, body.length));
    if (body.length <= 3) return t;
    t += ") " + body.slice(3, Math.min(6, body.length));
    if (body.length <= 6) return t;
    t += "-" + body.slice(6, Math.min(8, body.length));
    if (body.length <= 8) return t;
    t += "-" + body.slice(8, 10);
    return t;
  }

  window.getRuPhoneDigitsNormalized = function (inputValue) {
    return normalizeToEleven(inputValue);
  };

  /** Ровно 11 цифр, с 7. */
  window.isValidRuPhone = function (digits) {
    return typeof digits === "string" && /^7\d{10}$/.test(digits);
  };

  window.formatRuPhoneDisplay = function (digits) {
    if (!digits) return "";
    var n = normalizeToEleven(digits);
    return n ? formatMaskSeven(n) : "";
  };

  window.attachRuPhoneInput = function (el) {
    if (!el) return;
    el.setAttribute("inputmode", "tel");
    el.setAttribute("autocomplete", "tel");
    el.setAttribute("placeholder", "+7 (999) 123-45-67");
    el.setAttribute("maxlength", String(DISPLAY_MAX));

    function apply() {
      var n = normalizeToEleven(el.value);
      if (!n) {
        el.value = "";
        return;
      }
      var formatted = formatMaskSeven(n);
      if (el.value !== formatted) el.value = formatted;
    }

    el.addEventListener("input", apply);
    el.addEventListener("blur", apply);
  };
})();

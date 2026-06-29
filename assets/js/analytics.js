/* ============================================================
   Plaka Studio — Analítica
   Banner de cookies (RGPD) + Consent Mode v2 + rastreo global de clics.

   Trabaja junto al bloque GTM inline del <head> de cada página,
   que ya define window.dataLayer y el consentimiento "default: denied".
   Aquí solo gestionamos: el banner, el "consent update" al aceptar/rechazar
   y un listener global que empuja un evento `click` por cada botón/enlace.
   ============================================================ */
(function () {
  "use strict";

  var CONSENT_COOKIE = "plaka_cookie_consent"; // valor: "granted" | "denied"
  var CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 año en segundos

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  // ---------------------------------------------------------
  // Cookie de consentimiento (propia, independiente de GA)
  // ---------------------------------------------------------
  function setConsentCookie(value) {
    document.cookie =
      CONSENT_COOKIE +
      "=" +
      value +
      ";path=/;max-age=" +
      CONSENT_MAX_AGE +
      ";SameSite=Lax";
  }

  function getConsentCookie() {
    var m = document.cookie.match(
      new RegExp("(?:^|; )" + CONSENT_COOKIE + "=([^;]*)")
    );
    return m ? m[1] : null;
  }

  // ---------------------------------------------------------
  // Aplicar consentimiento a Consent Mode v2
  // ---------------------------------------------------------
  function applyConsent(granted) {
    gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
    });
    window.dataLayer.push({
      event: "cookie_consent_update",
      consent_state: granted ? "granted" : "denied",
    });
  }

  // ---------------------------------------------------------
  // Banner de cookies (se autoconstruye, con estilos propios)
  // ---------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("plaka-consent-styles")) return;
    var css =
      ".plaka-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;" +
      "max-width:760px;margin:0 auto;background:#fff;color:#1f2937;border-radius:14px;" +
      "box-shadow:0 10px 40px rgba(0,0,0,.18);padding:20px 22px;font-family:inherit;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:14px}" +
      ".plaka-consent__text{flex:1 1 320px;font-size:14px;line-height:1.5;margin:0}" +
      ".plaka-consent__text a{color:#4a6cf7;text-decoration:underline}" +
      ".plaka-consent__actions{display:flex;gap:10px;flex:0 0 auto}" +
      ".plaka-consent__btn{cursor:pointer;border:none;border-radius:8px;padding:10px 18px;" +
      "font-size:14px;font-weight:600;transition:opacity .2s}" +
      ".plaka-consent__btn:hover{opacity:.88}" +
      ".plaka-consent__btn--accept{background:#4a6cf7;color:#fff}" +
      ".plaka-consent__btn--reject{background:#eef0f6;color:#1f2937}" +
      "@media(max-width:520px){.plaka-consent{flex-direction:column;align-items:stretch}" +
      ".plaka-consent__actions{justify-content:stretch}.plaka-consent__btn{flex:1}}";
    var style = document.createElement("style");
    style.id = "plaka-consent-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showBanner() {
    injectStyles();
    var bar = document.createElement("div");
    bar.className = "plaka-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Aviso de cookies");
    bar.innerHTML =
      '<p class="plaka-consent__text">Usamos cookies para analizar el tr&aacute;fico y ' +
      "mejorar tu experiencia. Puedes aceptarlas o rechazarlas. " +
      '<a href="privacy.html">M&aacute;s informaci&oacute;n</a>.</p>' +
      '<div class="plaka-consent__actions">' +
      '<button class="plaka-consent__btn plaka-consent__btn--reject" data-no-track type="button">Rechazar</button>' +
      '<button class="plaka-consent__btn plaka-consent__btn--accept" data-no-track type="button">Aceptar</button>' +
      "</div>";

    var accept = bar.querySelector(".plaka-consent__btn--accept");
    var reject = bar.querySelector(".plaka-consent__btn--reject");

    function decide(granted) {
      setConsentCookie(granted ? "granted" : "denied");
      applyConsent(granted);
      bar.remove();
    }
    accept.addEventListener("click", function () {
      decide(true);
    });
    reject.addEventListener("click", function () {
      decide(false);
    });

    document.body.appendChild(bar);
  }

  // ---------------------------------------------------------
  // Rastreo global de clics: un evento `click` por cada
  // button / a / [role=button]. Sin instrumentar a mano.
  //   - data-analytics="etiqueta_limpia"  -> sobrescribe el texto
  //   - data-no-track (en el elemento o un ancestro) -> no rastrea
  // ---------------------------------------------------------
  function initClickTracking() {
    document.addEventListener(
      "click",
      function (e) {
        var el = e.target.closest("button, a, [role=button]");
        if (!el || el.closest("[data-no-track]")) return;

        var label =
          el.getAttribute("data-analytics") ||
          (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) ||
          el.getAttribute("aria-label") ||
          "";

        window.dataLayer.push({
          event: "click",
          click_text: label,
          click_type: el.tagName.toLowerCase(),
          click_id: el.id || undefined,
          click_url: el.getAttribute("href") || undefined,
          page_path: location.pathname,
        });
      },
      true // captura: registra aunque el handler del elemento detenga la propagación
    );
  }

  // ---------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------
  function init() {
    initClickTracking();

    var prev = getConsentCookie();
    if (prev === "granted") {
      applyConsent(true); // visitante recurrente que ya aceptó
    } else if (prev === "denied") {
      applyConsent(false); // ya rechazó: mantener denegado, sin banner
    } else {
      showBanner(); // primera visita: pedir consentimiento
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

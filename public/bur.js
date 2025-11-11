/* Bondai Universal Reporter (BUR) v1.0
   Single-file client that finds MID, totals, builds the payload, and POSTs to the Bondai API Hub.
   No collector. No iframe. CORS must be enabled on the API Hub.
*/
(function (w, d) {
    "use strict";
  
    // Find the <script> tag that loaded us to read data attributes
    var SCRIPT = (function () {
      var s = d.currentScript;
      if (!s) {
        // fallback for older browsers: pick the last script reference to this file
        var all = d.getElementsByTagName("script");
        s = all[all.length - 1];
      }
      return s;
    })();
  
    // Config from data attributes
    var CFG = (function () {
      function bool(attr, def) {
        var v = SCRIPT.getAttribute(attr);
        if (v == null) return def;
        return String(v).toLowerCase() === "true" || String(v).toLowerCase() === "1";
      }
      return {
        apiUrl: "https://api.dev.our-projects.info/api/redemptions",
        apiKey: SCRIPT.getAttribute("data-bondai-key") || "",
        mode: SCRIPT.getAttribute("data-bondai-mode") || "auto", // auto or manual
        sendNow: (SCRIPT.getAttribute("data-bondai-send") || "").toLowerCase() === "now",
        debug: bool("data-bondai-debug", false),
  
        // MID hints
        midQuery: SCRIPT.getAttribute("data-bondai-mid-query") || "mid",
        midDLV: SCRIPT.getAttribute("data-bondai-mid-dlv") || "",
  
        // Amount hints
        totalSelector: SCRIPT.getAttribute("data-bondai-total-selector") || "",
        discountSelector: SCRIPT.getAttribute("data-bondai-discount-selector") || "",
        amountDLV: SCRIPT.getAttribute("data-bondai-amount-dlv") || "",
        discountDLV: SCRIPT.getAttribute("data-bondai-discount-dlv") || "",
      };
    })();
  
    function log() {
      if (CFG.debug) {
        var a = Array.prototype.slice.call(arguments);
        a.unshift("[Bondai BUR]");
        console.log.apply(console, a);
      }
    }
  
    // Safe number parsing: handles currency symbols, spaces, 12 345,67, 12,345.67 etc.
    function toNumber(x) {
      if (x == null) return 0;
      var s = String(x).trim();
      // keep digits, comma, dot, minus
      s = s.replace(/[^0-9,.\-]/g, "");
      // if both comma and dot exist, treat comma as thousands
      if (s.indexOf(",") > -1 && s.indexOf(".") > -1) s = s.replace(/,/g, "");
      // if only comma exists, treat comma as decimal
      else if (s.indexOf(",") > -1 && s.indexOf(".") === -1) s = s.replace(",", ".");
      var n = Number(s);
      if (!isFinite(n)) n = 0;
      return Math.round(n * 100) / 100;
    }
  
    // DataLayer helper
    function fromDataLayer(keys) {
      try {
        var dl = w.dataLayer || [];
        // scan latest to oldest so the newest push wins
        for (var i = dl.length - 1; i >= 0; i--) {
          var item = dl[i] || {};
          for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (item && Object.prototype.hasOwnProperty.call(item, key) && item[key] != null) {
              return item[key];
            }
          }
        }
      } catch (e) {}
      return null;
    }
  
    // URL helper
    function fromURL(keys) {
      try {
        var qs = new URLSearchParams(w.location.search);
        for (var i = 0; i < keys.length; i++) {
          var v = qs.get(keys[i]);
          if (v) return v;
        }
      } catch (e) {}
      return null;
    }
  
    // Cookie helper
    function fromCookie(names) {
      try {
        var c = "; " + d.cookie;
        for (var i = 0; i < names.length; i++) {
          var parts = c.split("; " + names[i] + "=");
          if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
        }
      } catch (e) {}
      return null;
    }
  
    // Storage helper
    function fromStorage(keys) {
      var stores = [function () { return w.localStorage; }, function () { return w.sessionStorage; }];
      for (var s = 0; s < stores.length; s++) {
        try {
          var st = stores[s]();
          if (!st) continue;
          for (var i = 0; i < keys.length; i++) {
            var v = st.getItem(keys[i]);
            if (v) return v;
          }
        } catch (e) {}
      }
      return null;
    }
  
    // DOM helper: read textContent from selector
    function textBySelector(sel) {
      if (!sel) return null;
      try {
        var el = d.querySelector(sel);
        return el ? el.textContent : null;
      } catch (e) {
        return null;
      }
    }
  
    // Heuristic scan for totals and discounts if no selectors or DLV supplied
    function scanAmounts() {
      var result = { total: null, discount: null };
      var candidates = Array.prototype.slice.call(d.querySelectorAll("body *"));
      // limit scanning to visible-ish leaf nodes to keep it cheap
      candidates = candidates.filter(function (el) {
        var txt = (el.textContent || "").trim();
        if (!txt) return false;
        var style = w.getComputedStyle ? getComputedStyle(el) : null;
        if (style && (style.visibility === "hidden" || style.display === "none")) return false;
        return txt.length <= 64; // keep short labels
      });
  
      function nearLabel(nodes, labels) {
        for (var i = 0; i < nodes.length; i++) {
          var t = nodes[i].textContent || "";
          for (var j = 0; j < labels.length; j++) {
            if (t.toLowerCase().indexOf(labels[j]) > -1) {
              // try the next sibling or a value in same row
              var row = nodes[i].closest("tr, .order-item, .row, li, div");
              if (row) {
                var numbers = row.textContent.match(/[-+]?\d[\d\s.,]*/g);
                if (numbers && numbers.length) return numbers.pop();
              }
            }
          }
        }
        return null;
      }
  
      var totalGuess = nearLabel(candidates, ["total", "grand total", "amount due"]);
      var discGuess = nearLabel(candidates, ["discount", "savings", "coupon", "promotion"]);
  
      result.total = totalGuess;
      result.discount = discGuess;
      return result;
    }
  
    // MID detection in order
    function detectMID() {
      // explicit DLV mapping takes priority if provided
      if (CFG.midDLV) {
        var v = fromDataLayer([CFG.midDLV]);
        if (v) return String(v);
      }
      // common keys in DL
      var dl = fromDataLayer(["member_partner_key", "mid"]);
      if (dl) return String(dl);
      // URL
      var url = fromURL([CFG.midQuery || "mid", "member", "memberId", "ref"]);
      if (url) return String(url);
      // Cookie
      var ck = fromCookie(["bondai_mid", "mid"]);
      if (ck) return String(ck);
      // Storage
      var st = fromStorage(["bondai_mid", "mid", "member_partner_key"]);
      if (st) return String(st);
      // body data attribute
      var bodyMid = d.body && d.body.getAttribute && d.body.getAttribute("data-mid");
      if (bodyMid) return String(bodyMid);
      return "";
    }
  
    // Amounts detection
    function detectAmounts() {
      // 1) dataLayer mapping if provided
      if (CFG.amountDLV || CFG.discountDLV) {
        var dlAmt = CFG.amountDLV ? fromDataLayer([CFG.amountDLV]) : null;
        var dlDis = CFG.discountDLV ? fromDataLayer([CFG.discountDLV]) : null;
        return { amount: toNumber(dlAmt), discount: toNumber(dlDis) };
      }
      // 2) try common DL keys
      var amtDL = fromDataLayer(["transactionTotal", "value", "purchase.value"]);
      var disDL = fromDataLayer(["totalDiscounts", "purchase.discount", "discount"]);
      if (amtDL != null || disDL != null) {
        return { amount: toNumber(amtDL), discount: toNumber(disDL) };
      }
      // 3) explicit selectors if provided
      var amtSel = toNumber(textBySelector(CFG.totalSelector));
      var disSel = toNumber(textBySelector(CFG.discountSelector));
      if (CFG.totalSelector || CFG.discountSelector) {
        return { amount: amtSel, discount: disSel };
      }
      // 4) heuristic scan
      var guess = scanAmounts();
      return { amount: toNumber(guess.total), discount: toNumber(guess.discount) };
    }
  
    // Soft validate MID
    function midLooksOk(mid) {
      return /^(BA|MS)[A-Z0-9]{16}$/.test(mid);
    }
  
    function buildPayload(mid, amounts) {
      var amt = Math.max(0, Number(amounts.amount || 0));
      var disc = Math.max(0, Number(amounts.discount || 0));
      if (disc > amt) disc = amt;
      return {
        member_partner_key: mid,
        timestamp: new Date().toISOString(),
        offer_amount: Math.round(amt * 100) / 100,
        offer_savings_amount: Math.round(disc * 100) / 100
      };
    }
  
    // POST to Bondai
    function send(body) {
      return fetch(CFG.apiUrl, {
        method: "POST",
        headers: {
          "X-API-Key": CFG.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); });
    }
  
    // Expose small API for debugging and manual send
    var bondai = {
      debug: function () {
        var mid = detectMID();
        var amounts = detectAmounts();
        var payload = buildPayload(mid, amounts);
        log("debug", { mid: mid, amounts: amounts, payload: payload });
        return { mid: mid, amounts: amounts, payload: payload };
      },
      sendNow: function () {
        var mid = detectMID();
        if (!mid) {
          log("no MID detected");
          if (w.updateBondaiStatus) w.updateBondaiStatus({ ok: false, data: null, errors: [{ message: "Missing MID" }] });
          return Promise.resolve({ ok: false, data: null, errors: [{ message: "Missing MID" }] });
        }
        if (!midLooksOk(mid)) log("MID format looks unusual:", mid);
  
        var amounts = detectAmounts();
        var payload = buildPayload(mid, amounts);
  
        log("sending payload", payload);
        return send(payload)
          .then(function (json) {
            var ok = !!(json && json.success);
            var result = { ok: ok, data: (json && json.data) || null, errors: (json && json.errors) || [] };
            if (typeof w.updateBondaiStatus === "function") w.updateBondaiStatus(result);
            return result;
          })
          .catch(function (err) {
            var result = { ok: false, data: null, errors: [{ message: "Network error", detail: String(err) }] };
            if (typeof w.updateBondaiStatus === "function") w.updateBondaiStatus(result);
            return result;
          });
      }
    };
    w.bondai = bondai;
  
    // When to fire automatically
    function looksLikeReceipt(url) {
      var u = (url || "").toLowerCase();
      return u.indexOf("thank") > -1 || u.indexOf("receipt") > -1 || u.indexOf("order") > -1 || u.indexOf("success") > -1 || u.indexOf("checkout") > -1;
    }
  
    function waitForAmountsAndSend(timeoutMs) {
      var t0 = Date.now();
      (function poll() {
        var dbg = bondai.debug();
        var ready = dbg.payload.offer_amount > 0 || dbg.payload.offer_savings_amount >= 0;
        if (ready || Date.now() - t0 > timeoutMs) bondai.sendNow();
        else setTimeout(poll, 120);
      })();
    }
  
    function autoStart() {
      if (!CFG.apiKey) {
        log("missing data-bondai-key. aborting");
        return;
      }
      var auto = CFG.mode !== "manual";
      var force = CFG.sendNow;
      var hasPurchaseEventSoon = false;
  
      // listen for purchase push in dataLayer
      var origPush = (w.dataLayer && w.dataLayer.push) ? w.dataLayer.push : null;
      if (w.dataLayer) {
        w.dataLayer.push = function () {
          var args = Array.prototype.slice.call(arguments);
          if (Array.isArray(args)) args = [args];
          for (var i = 0; i < arguments.length; i++) {
            var ev = arguments[i];
            if (ev && ev.event && String(ev.event).toLowerCase() === "purchase") {
              hasPurchaseEventSoon = true;
              // wait a tick to allow amounts to be included in DL
              setTimeout(function () { bondai.sendNow(); }, 50);
            }
          }
          return origPush ? origPush.apply(w.dataLayer, arguments) : 0;
        };
      }
  
      if (force) {
        waitForAmountsAndSend(2000);
        return;
      }
  
      // kickoff on DOMContentLoaded
      function onReady() {
        if (!auto) return;
        if (looksLikeReceipt(w.location.href) || hasPurchaseEventSoon) {
          waitForAmountsAndSend(2000);
        } else {
          // still allow manual trigger via window.bondai.sendNow()
          log("auto mode idle. call window.bondai.sendNow() to force send.");
        }
      }
      if (d.readyState === "loading") {
        d.addEventListener("DOMContentLoaded", onReady);
      } else {
        onReady();
      }
    }
  
    try { autoStart(); } catch (e) { log("init error", e); }
  })(window, document);
  
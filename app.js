/**
 * Holiyay – Japan 2027 itinerary app
 * Renders itinerary, reminders, budget in AUD, map layers.
 */

(function () {
  const STORAGE_KEY = "holiyay_jpy_per_aud";
  const DATA = window.HOLIYAY_DATA;
  const ACCESS_KEY = "holiyay_unlocked";

  if (!DATA) {
    document.body.innerHTML = "<p>Missing data.js</p>";
    return;
  }

  const trip = DATA.trip;
  const accessPassword = (trip.accessPassword || "").trim();

  function showAccessGate() {
    document.body.innerHTML =
      "<div class=\"app access-gate\">" +
      "<h1 class=\"access-gate-title\">Holiyay</h1>" +
      "<p class=\"access-gate-hint\">Enter the password to view this itinerary.</p>" +
      "<form id=\"access-form\" class=\"access-gate-form\">" +
      "<input type=\"password\" id=\"access-password\" placeholder=\"Password\" autocomplete=\"off\" class=\"access-gate-input\" />" +
      "<button type=\"submit\" class=\"btn access-gate-btn\">View itinerary</button>" +
      "</form>" +
      "<p id=\"access-error\" class=\"access-gate-error\" style=\"display:none;\">Wrong password. Try again.</p>" +
      "</div>";
    document.getElementById("access-form").onsubmit = function (e) {
      e.preventDefault();
      var input = document.getElementById("access-password");
      var err = document.getElementById("access-error");
      if (input.value === accessPassword) {
        try { sessionStorage.setItem(ACCESS_KEY, "1"); } catch (z) {}
        document.location.reload();
      } else {
        err.style.display = "block";
        input.focus();
      }
    };
  }

  var syncSupabaseUrl = (trip.syncSupabaseUrl || "").trim();
  var syncSupabaseAnonKey = (trip.syncSupabaseAnonKey || "").trim();
  var syncEnabled = syncSupabaseUrl.length > 0 && syncSupabaseAnonKey.length > 0;

  function hashPassword(pwd) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(pwd)).then(function (buf) {
      var a = new Uint8Array(buf);
      var h = "";
      for (var i = 0; i < a.length; i++) h += ("0" + a[i].toString(16)).slice(-2);
      return h;
    });
  }

  if (accessPassword.length > 0) {
    try {
      if (sessionStorage.getItem(ACCESS_KEY) !== "1") {
        showAccessGate();
        if (syncEnabled) {
          document.getElementById("access-form").onsubmit = function (e) {
            e.preventDefault();
            var input = document.getElementById("access-password");
            var err = document.getElementById("access-error");
            if (input.value !== accessPassword) {
              err.style.display = "block";
              input.focus();
              return;
            }
            sessionStorage.setItem(ACCESS_KEY, "1");
            hashPassword(input.value).then(function (h) {
              sessionStorage.setItem("holiyay_trip_code", h);
              document.location.reload();
            });
          };
        }
        return;
      }
    } catch (e) {
      showAccessGate();
      return;
    }
  }

  const VENUE_STORAGE_PREFIX = "holiyay_venue_";
  const BOOKABLES_STORAGE_KEY = "holiyay_bookables";

  function getStoredRate() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s !== null) {
      const n = parseFloat(s, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return trip.defaultRateToAUD;
  }

  function getVenueKey(dayNum, slot, index) {
    return VENUE_STORAGE_PREFIX + dayNum + "_" + slot + "_" + index;
  }

  function getStoredVenue(dayNum, slot, index) {
    return localStorage.getItem(getVenueKey(dayNum, slot, index));
  }

  function setStoredVenue(dayNum, slot, index, venueId) {
    localStorage.setItem(getVenueKey(dayNum, slot, index), venueId);
    saveSharedStateDebounced();
  }

  function setStoredRate(value) {
    const n = parseFloat(value, 10);
    if (Number.isNaN(n) || n <= 0) return;
    localStorage.setItem(STORAGE_KEY, String(n));
    saveSharedStateDebounced();
  }

  function getBookablesState() {
    try {
      const s = localStorage.getItem(BOOKABLES_STORAGE_KEY);
      if (s) {
        const o = JSON.parse(s);
        if (o && typeof o === "object") return o;
      }
    } catch (e) {}
    return {};
  }

  function setBookableState(id, state) {
    const o = getBookablesState();
    o[id] = state;
    try {
      localStorage.setItem(BOOKABLES_STORAGE_KEY, JSON.stringify(o));
    } catch (e) {}
    saveSharedStateDebounced();
  }

  function getBookableState(id) {
    const o = getBookablesState();
    const st = o[id];
    const bookable = (DATA.bookables || []).find(function (b) { return b.id === id; });
    const defaultAUD = bookable ? bookable.defaultAUD : 0;
    return {
      paid: st && typeof st.paid === "boolean" ? st.paid : false,
      amount: st && typeof st.amount === "number" && !Number.isNaN(st.amount) ? st.amount : defaultAUD,
    };
  }

  function collectState() {
    var venues = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(VENUE_STORAGE_PREFIX) === 0) venues[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return {
      bookables: getBookablesState(),
      rate: getStoredRate(),
      venues: venues,
    };
  }

  function applyState(state) {
    if (!state) return;
    try {
      if (state.bookables && typeof state.bookables === "object") {
        localStorage.setItem(BOOKABLES_STORAGE_KEY, JSON.stringify(state.bookables));
      }
      if (state.rate != null && !Number.isNaN(state.rate) && state.rate > 0) {
        localStorage.setItem(STORAGE_KEY, String(state.rate));
      }
      if (state.venues && typeof state.venues === "object") {
        for (var k in state.venues) {
          if (state.venues.hasOwnProperty(k) && k.indexOf(VENUE_STORAGE_PREFIX) === 0) {
            localStorage.setItem(k, state.venues[k]);
          }
        }
      }
    } catch (e) {}
  }

  var saveSharedStateTimer = null;
  function saveSharedStateDebounced() {
    if (!syncEnabled) return;
    var tripCode = null;
    try {
      tripCode = sessionStorage.getItem("holiyay_trip_code");
    } catch (e) {}
    if (!tripCode) return;
    if (saveSharedStateTimer) clearTimeout(saveSharedStateTimer);
    saveSharedStateTimer = setTimeout(function () {
      saveSharedStateTimer = null;
      var state = collectState();
      var url = syncSupabaseUrl.replace(/\/$/, "") + "/rest/v1/shared_state";
      var body = JSON.stringify({
        trip_code: tripCode,
        data: state,
        updated_at: new Date().toISOString(),
      });
      fetch(url, {
        method: "POST",
        headers: {
          apikey: syncSupabaseAnonKey,
          Authorization: "Bearer " + syncSupabaseAnonKey,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: body,
      }).catch(function () {});
    }, 500);
  }

  function getSharedState(tripCode) {
    var url = syncSupabaseUrl.replace(/\/$/, "") + "/rest/v1/shared_state?trip_code=eq." + encodeURIComponent(tripCode) + "&select=data";
    return fetch(url, {
      method: "GET",
      headers: {
        apikey: syncSupabaseAnonKey,
        Authorization: "Bearer " + syncSupabaseAnonKey,
      },
    })
      .then(function (res) { return res.json(); })
      .then(function (rows) {
        if (rows && rows[0] && rows[0].data) return rows[0].data;
        return null;
      })
      .catch(function () { return null; });
  }

  function jpyToAud(jpy) {
    if (jpy == null) return null;
    return jpy / getStoredRate();
  }

  function audToJpy(aud) {
    if (aud == null) return null;
    return Math.round(aud * getStoredRate());
  }

  function formatAud(amount) {
    if (amount == null) return "";
    return "AUD $" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatDate(iso) {
    const d = new Date(iso + "T12:00:00");
    const options = { day: "numeric", month: "short", year: "numeric" };
    return d.toLocaleDateString("en-AU", options);
  }

  function formatShortDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function daysFromToday(iso) {
    const d = new Date(iso + "T12:00:00");
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
  }

  function updateDashboardTotalsOnly() {
    const totalsEl = document.getElementById("dashboard-totals");
    if (!totalsEl) return;
    const bookables = DATA.bookables || [];
    let paidTotal = 0;
    let unpaidTotal = 0;
    bookables.forEach(function (b) {
      const st = getBookableState(b.id);
      if (st.paid) paidTotal += st.amount;
      else unpaidTotal += st.amount;
    });
    totalsEl.innerHTML =
      "<div class=\"dashboard-total dashboard-total-paid\"><span class=\"dashboard-total-label\">Paid</span> <strong class=\"dashboard-total-value\">" + formatAud(paidTotal) + "</strong></div>" +
      "<div class=\"dashboard-total dashboard-total-unpaid\"><span class=\"dashboard-total-label\">Unpaid</span> <strong class=\"dashboard-total-value\">" + formatAud(unpaidTotal) + "</strong></div>";
  }

  function renderDashboard() {
    const totalsEl = document.getElementById("dashboard-totals");
    const listEl = document.getElementById("dashboard-list");
    if (!totalsEl || !listEl) return;
    const bookables = DATA.bookables || [];
    const r = getStoredRate();
    let paidTotal = 0;
    let unpaidTotal = 0;
    const rows = bookables.map(function (b) {
      const st = getBookableState(b.id);
      if (st.paid) paidTotal += st.amount;
      else unpaidTotal += st.amount;
      const checked = st.paid ? " checked" : "";
      const paidClass = st.paid ? " is-paid" : "";
      const audVal = st.amount === 0 ? "" : String(st.amount);
      const jpyVal = st.amount === 0 ? "" : String(audToJpy(st.amount) != null ? audToJpy(st.amount) : "");
      return (
        "<div class=\"dashboard-row" + paidClass + "\" data-bookable-id=\"" + escapeHtml(b.id) + "\">" +
        "<label class=\"dashboard-toggle-wrap\">" +
        "<input type=\"checkbox\" class=\"dashboard-paid-toggle\" data-id=\"" + escapeHtml(b.id) + "\" aria-label=\"Mark as paid\"" + checked + " />" +
        "<span class=\"dashboard-toggle-label\">" + (st.paid ? "Paid" : "Unpaid") + "</span>" +
        "</label>" +
        "<span class=\"dashboard-row-label\">" + escapeHtml(b.label) + "</span>" +
        "<span class=\"dashboard-amount-wrap\"><span class=\"dashboard-col-label\">AUD</span><input type=\"number\" class=\"dashboard-amount-aud\" data-id=\"" + escapeHtml(b.id) + "\" value=\"" + escapeHtml(audVal) + "\" placeholder=\"0\" min=\"0\" step=\"any\" aria-label=\"Amount AUD\" /></span>" +
        "<span class=\"dashboard-amount-wrap\"><span class=\"dashboard-col-label\">JPY</span><input type=\"number\" class=\"dashboard-amount-jpy\" data-id=\"" + escapeHtml(b.id) + "\" value=\"" + escapeHtml(jpyVal) + "\" placeholder=\"0\" min=\"0\" step=\"1\" aria-label=\"Amount JPY\" /></span>" +
        "</div>"
      );
    }).join("");
    totalsEl.innerHTML =
      "<div class=\"dashboard-total dashboard-total-paid\"><span class=\"dashboard-total-label\">Paid</span> <strong class=\"dashboard-total-value\">" + formatAud(paidTotal) + "</strong></div>" +
      "<div class=\"dashboard-total dashboard-total-unpaid\"><span class=\"dashboard-total-label\">Unpaid</span> <strong class=\"dashboard-total-value\">" + formatAud(unpaidTotal) + "</strong></div>";
    listEl.innerHTML = rows;
  }

  function icsEscape(s) {
    if (s == null) return "";
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function buildIcsContent() {
    const days = DATA.days || [];
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Holiyay//Japan 2027//EN",
      "CALSCALE:GREGORIAN",
    ];
    days.forEach(function (day) {
      const start = day.date.replace(/-/g, "");
      const endDate = new Date(day.date + "T12:00:00");
      endDate.setDate(endDate.getDate() + 1);
      const end = endDate.getFullYear() + String(endDate.getMonth() + 1).padStart(2, "0") + String(endDate.getDate()).padStart(2, "0");
      const summary = "Day " + day.day + " – " + (day.title || day.location || "");
      const parts = [];
      if (day.location) parts.push("Location: " + day.location);
      if (day.hotel) parts.push("Hotel: " + day.hotel);
      ["morning", "afternoon", "evening", "night"].forEach(function (slot) {
        const items = day[slot];
        if (!items || !items.length) return;
        const label = slot.charAt(0).toUpperCase() + slot.slice(1);
        const text = items.map(function (i) { return (i.type ? i.type + ": " : "") + i.text; }).join(" \\n ");
        parts.push(label + ": " + text);
      });
      if (day.costJpy) parts.push("Cost: ¥" + day.costJpy.toLocaleString());
      const desc = parts.join(" \\n ");
      lines.push("BEGIN:VEVENT");
      lines.push("UID:holiyay-day-" + day.day + "@holiyay");
      lines.push("DTSTART;VALUE=DATE:" + start);
      lines.push("DTEND;VALUE=DATE:" + end);
      lines.push("SUMMARY:" + icsEscape(summary));
      lines.push("DESCRIPTION:" + icsEscape(desc));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function downloadIcs() {
    const ics = buildIcsContent();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (trip.title || "Holiyay").replace(/\s+/g, "-") + "-itinerary.ics";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderBookings() {
    const listEl = document.getElementById("bookings-list");
    if (!listEl) return;
    const bookings = DATA.bookingsSoFar || [];
    const r = getStoredRate();
    listEl.innerHTML = bookings
      .map(function (b) {
        const isAud = b.currency === "AUD";
        const amount = Number(b.amount);
        const other = isAud ? audToJpy(amount) : (amount / r).toFixed(2);
        const primaryStr = isAud ? "AUD $" + amount.toLocaleString() : "¥" + amount.toLocaleString();
        const otherStr = isAud ? "≈ ¥" + (other != null ? other.toLocaleString() : "—") : "≈ AUD $" + other;
        return (
          "<div class=\"booking-item\">" +
          "<strong class=\"booking-label\">" + escapeHtml(b.label) + "</strong>" +
          "<span class=\"booking-dates\">" + escapeHtml(b.dates || "") + "</span>" +
          "<span class=\"booking-amount\">" + primaryStr + " <span class=\"booking-other\">" + otherStr + "</span></span>" +
          "</div>"
        );
      })
      .join("");
  }

  function updateConverterResult() {
    const amountEl = document.getElementById("converter-amount");
    const currencyEl = document.getElementById("converter-currency");
    const resultEl = document.getElementById("converter-result");
    if (!amountEl || !currencyEl || !resultEl) return;
    const num = parseFloat(String(amountEl.value).replace(",", "."), 10);
    if (Number.isNaN(num) || num < 0) {
      resultEl.textContent = "";
      return;
    }
    const r = getStoredRate();
    if (currencyEl.value === "AUD") {
      resultEl.textContent = "= ¥" + (audToJpy(num) != null ? audToJpy(num).toLocaleString() : "—");
    } else {
      resultEl.textContent = "= AUD $" + (num / r).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }

  function renderFlights() {
    const flights = DATA.flights;
    if (!flights) return;
    const outEl = document.getElementById("flights-outbound");
    const retEl = document.getElementById("flights-return");
    const dealsEl = document.getElementById("flights-deals");
    if (outEl && flights.outbound) {
      outEl.innerHTML = "<strong>Outbound</strong>: " + flights.outbound.map(function (f) { return f.flight + " " + f.route; }).join(" → ");
    }
    if (retEl && flights.return) {
      retEl.innerHTML = "<strong>Return</strong>: " + flights.return.map(function (f) { return f.flight + " " + f.route; }).join(" → ");
    }
    if (dealsEl && flights.dealsNote) {
      dealsEl.textContent = flights.dealsNote;
    }
  }

  function renderHeader() {
    const titleEl = document.getElementById("trip-title");
    const datesEl = document.getElementById("trip-dates");
    const routeEl = document.getElementById("trip-route");
    if (titleEl) titleEl.textContent = trip.title;
    if (datesEl) datesEl.textContent = formatShortDate(trip.startDate) + " – " + formatShortDate(trip.endDate);
    if (routeEl) routeEl.textContent = trip.destination;
  }

  function renderExchange() {
    const input = document.getElementById("rate-input");
    const saveBtn = document.getElementById("rate-save");
    if (!input) return;
    input.value = String(getStoredRate());
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        const v = input.value.replace(",", ".");
        setStoredRate(v);
        const n = parseFloat(v, 10);
        if (!Number.isNaN(n) && n > 0) {
          window.HOLIYAY_RATE = n;
          renderBookings();
          updateConverterResult();
          renderBudget();
          renderDayCosts();
          renderDays();
        }
      });
    }
  }

  function renderReminders() {
    const list = document.getElementById("reminder-list");
    if (!list) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list.innerHTML = DATA.reminders
      .map(function (r) {
        const bookBy = new Date(r.bookBy + "T12:00:00");
        const daysLeft = daysFromToday(r.bookBy);
        const isPast = bookBy < today;
        const urgent = !isPast && daysLeft <= 30;
        const note = r.notes ? " · " + r.notes : "";
        const st = getBookableState(r.id);
        const paidBadge = st.paid ? '<span class="reminder-badge reminder-badge-paid">Paid</span>' : '<span class="reminder-badge reminder-badge-unpaid">Unpaid</span>';
        return (
          '<li class="reminder-item">' +
          '<span class="reminder-label">' + paidBadge + " " + escapeHtml(r.label) + "</span>" +
          '<span class="reminder-meta">' +
          'Book by <span class="book-by">' + formatDate(r.bookBy) + "</span>" +
          (urgent ? ' <span class="urgent">(' + daysLeft + " days)</span>" : "") +
          (isPast ? ' <span class="urgent">(passed)</span>' : "") +
          escapeHtml(note) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderBudget() {
    const r = getStoredRate();
    const transport = DATA.transportSummary;
    const transportAud = transport.jpy ? jpyToAud(transport.jpy) : null;

    const transportEl = document.getElementById("budget-transport");
    const notesEl = document.getElementById("budget-notes");
    if (transportEl) {
      transportEl.innerHTML =
        transport.label + ": " +
        (transportAud != null
          ? '<span class="aud">' + formatAud(transportAud) + "</span>"
          : "—") +
        (transport.jpy ? " <span class=\"jpy\">(¥" + transport.jpy.toLocaleString() + ")</span>" : "");
    }
    if (notesEl && transport.notes) notesEl.textContent = transport.notes;
  }

  function renderDayCosts() {
    const r = getStoredRate();
    const withCost = DATA.days.filter(function (d) {
      return d.costJpy != null && d.costJpy > 0;
    });
    const container = document.getElementById("budget-day-costs");
    if (!container) return;
    if (withCost.length === 0) {
      container.innerHTML = "";
      return;
    }
    const lines = withCost.map(function (d) {
      const aud = (d.costJpy / r).toFixed(2);
      return "Day " + d.day + " " + (d.costNote || "") + ": " + formatAud(d.costJpy / r) + " (¥" + d.costJpy.toLocaleString() + ")";
    });
    container.innerHTML = lines.join("<br>");
  }

  function getActivitySlug(type) {
    if (!type) return "sightsee";
    const t = type.toLowerCase();
    if (t.indexOf("dinner") !== -1 || t.indexOf("food") !== -1 || t.indexOf("market") !== -1) return "food";
    if (t.indexOf("temple") !== -1 || t.indexOf("shrine") !== -1 || t.indexOf("tea ceremony") !== -1 || t.indexOf("sake") !== -1 || t.indexOf("garden") !== -1 || t.indexOf("venue") !== -1 || t.indexOf("event") !== -1) return "culture";
    if (t.indexOf("train") !== -1 || t.indexOf("shinkansen") !== -1 || t.indexOf("pass") !== -1 || t.indexOf("arrive") !== -1) return "transport";
    if (t.indexOf("bar") !== -1 || t.indexOf("soul") !== -1 || t.indexOf("vinyl") !== -1 || t.indexOf("night") !== -1) return "nightlife";
    if (t.indexOf("shopping") !== -1 || t.indexOf("record store") !== -1 || t.indexOf("denim") !== -1 || t.indexOf("area") !== -1 || t.indexOf("district") !== -1) return "shopping";
    if (t.indexOf("hotel") !== -1 || t.indexOf("onsen") !== -1) return "stay";
    if (t.indexOf("relax") !== -1 || t.indexOf("optional") !== -1 || t.indexOf("easy pace") !== -1) return "relax";
    if (t.indexOf("walk") !== -1 || t.indexOf("see") !== -1 || t.indexOf("visit") !== -1 || t.indexOf("activities") !== -1) return "sightsee";
    return "sightsee";
  }

  function getVenueCategory(categoryId) {
    return (DATA.venueCategories || []).find(function (c) { return c.id === categoryId; });
  }

  function buildVenueItemHtml(dayNum, slot, index, item) {
    const cat = getVenueCategory(item.venueCategory);
    if (!cat || !cat.venues || !cat.venues.length) {
      return "<li>" + escapeHtml(item.type ? item.type + ": " : "") + escapeHtml(item.text) + "</li>";
    }
    const selectedId = getStoredVenue(dayNum, slot, index) || item.venueId;
    const selectedVenue = cat.venues.find(function (v) { return v.id === selectedId; }) || cat.venues[0];
    const options = cat.venues.map(function (v) {
      return "<option value=\"" + escapeHtml(v.id) + "\"" + (v.id === selectedId ? " selected" : "") + ">" + escapeHtml(v.name) + "</option>";
    }).join("");
    const selectHtml =
      "<select class=\"venue-select\" data-day=\"" + dayNum + "\" data-slot=\"" + escapeHtml(slot) + "\" data-index=\"" + index + "\" aria-label=\"Change venue\">" +
      options +
      "</select>";
    const googleUrl = "https://www.google.com/search?q=" + encodeURIComponent(selectedVenue.name + " " + (cat.area || "Japan"));
    const detailsHtml =
      "<div class=\"venue-details\">" +
      "<strong class=\"venue-name\">" + escapeHtml(selectedVenue.name) + "</strong>" +
      "<p class=\"venue-address\">" + escapeHtml(selectedVenue.address) + "</p>" +
      "<p class=\"venue-hours\">" + escapeHtml(selectedVenue.hours) + "</p>" +
      (selectedVenue.phone ? "<p class=\"venue-phone\">" + escapeHtml(selectedVenue.phone) + "</p>" : "") +
      "<p class=\"venue-verify\"><a href=\"" + googleUrl + "\" target=\"_blank\" rel=\"noopener\">Verify address & hours on Google</a></p>" +
      "</div>";
    const activitySlug = cat.id.indexOf("restaurant") !== -1 ? "food" : "nightlife";
    return (
      "<li class=\"day-block-item-venue activity activity-" + activitySlug + "\">" +
      "<span class=\"venue-type\">" + escapeHtml(item.type || "Venue") + ":</span> " +
      selectHtml +
      detailsHtml +
      "</li>"
    );
  }

  function renderDays() {
    const container = document.getElementById("day-list");
    if (!container) return;
    const r = getStoredRate();

    container.innerHTML = DATA.days
      .map(function (day) {
        const dateStr = formatDate(day.date);
        const shortDate = formatShortDate(day.date);
        let hotelHtml = "";
        if (day.hotel) hotelHtml = '<p class="day-hotel">Hotel: ' + escapeHtml(day.hotel) + "</p>";

        const blocks = [];
        ["morning", "afternoon", "evening", "night"].forEach(function (slot) {
          const items = day[slot];
          if (!items || !items.length) return;
          const title = slot.charAt(0).toUpperCase() + slot.slice(1);
          const slotClass = "day-slot-" + slot;
          const slotLabel = slot === "morning" ? "Morning" : slot === "afternoon" ? "Afternoon" : slot === "evening" ? "Evening" : "Night";
          const list = items
            .map(function (item, index) {
              if (item.venueCategory && item.venueId) {
                return buildVenueItemHtml(day.day, slot, index, item);
              }
              const slug = getActivitySlug(item.type);
              const label = item.type ? item.type + ": " : "";
              return "<li class=\"activity activity-" + slug + "\">" + escapeHtml(label) + escapeHtml(item.text) + "</li>";
            })
            .join("");
          blocks.push('<div class="day-block ' + slotClass + '"><p class="day-block-title">' + slotLabel + "</p><ul class=\"day-block-items\">" + list + "</ul></div>");
        });

        let notesHtml = "";
        if (day.notes) {
          const safe = escapeHtml(day.notes).replace(/\n/g, "<br>");
          notesHtml = '<div class="day-notes">' + safe + "</div>";
        }

        let costHtml = "";
        if (day.costJpy != null && day.costJpy > 0) {
          const aud = (day.costJpy / r).toFixed(2);
          costHtml =
            '<div class="day-cost">' +
            'Cost <span class="aud">' + formatAud(day.costJpy / r) + "</span> " +
            '<span class="jpy">(¥' + day.costJpy.toLocaleString() + ")</span>" +
            (day.costNote ? '<p class="day-cost-note">' + escapeHtml(day.costNote) + "</p>" : "") +
            "</div>";
        }

        return (
          '<article class="day-card" data-day="' + day.day + '">' +
          '<div class="day-header">' +
          '<span class="day-number">Day ' + day.day + "</span>" +
          '<span class="day-date">' + shortDate + "</span>" +
          '<h3 class="day-title">' + escapeHtml(day.title) + "</h3>" +
          "</div>" +
          '<div class="day-body">' +
          hotelHtml +
          blocks.join("") +
          notesHtml +
          costHtml +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function onVenueSelectChange(e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains("venue-select")) return;
    var dayNum = el.getAttribute("data-day");
    var slot = el.getAttribute("data-slot");
    var index = el.getAttribute("data-index");
    var venueId = el.value;
    if (dayNum != null && slot != null && index != null && venueId) {
      setStoredVenue(parseInt(dayNum, 10), slot, parseInt(index, 10), venueId);
      renderDays();
    }
  }

  function onDashboardChange(e) {
    var el = e.target;
    if (!el) return;
    var id = el.getAttribute("data-id");
    if (!id) return;
    if (el.classList && el.classList.contains("dashboard-paid-toggle")) {
      var state = getBookableState(id);
      state.paid = el.checked;
      setBookableState(id, state);
      renderDashboard();
      renderReminders();
      return;
    }
    var r = getStoredRate();
    if (el.classList && el.classList.contains("dashboard-amount-aud")) {
      var num = parseFloat(String(el.value).replace(",", "."), 10);
      if (Number.isNaN(num)) num = 0;
      var state = getBookableState(id);
      state.amount = num;
      setBookableState(id, state);
      var row = el.closest(".dashboard-row");
      if (row) {
        var jpyInput = row.querySelector(".dashboard-amount-jpy");
        if (jpyInput) jpyInput.value = num === 0 ? "" : (audToJpy(num) != null ? String(audToJpy(num)) : "");
      }
      updateDashboardTotalsOnly();
      return;
    }
    if (el.classList && el.classList.contains("dashboard-amount-jpy")) {
      var num = parseFloat(String(el.value).replace(",", "."), 10);
      if (Number.isNaN(num)) num = 0;
      var aud = num === 0 ? 0 : num / r;
      var state = getBookableState(id);
      state.amount = aud;
      setBookableState(id, state);
      var row = el.closest(".dashboard-row");
      if (row) {
        var audInput = row.querySelector(".dashboard-amount-aud");
        if (audInput) audInput.value = aud === 0 ? "" : (aud % 1 === 0 ? String(aud) : aud.toFixed(2));
      }
      updateDashboardTotalsOnly();
      return;
    }
  }

  function init() {
    window.HOLIYAY_RATE = getStoredRate();
    renderHeader();
    renderDashboard();
    renderFlights();
    renderBookings();
    renderExchange();
    renderReminders();
    renderBudget();
    renderDayCosts();
    renderDays();
    var calendarBtn = document.getElementById("calendar-download-btn");
    if (calendarBtn) calendarBtn.addEventListener("click", downloadIcs);
    var converterAmount = document.getElementById("converter-amount");
    var converterCurrency = document.getElementById("converter-currency");
    if (converterAmount) converterAmount.addEventListener("input", updateConverterResult);
    if (converterCurrency) converterCurrency.addEventListener("change", updateConverterResult);
    updateConverterResult();
    document.body.addEventListener("change", onVenueSelectChange);
    document.body.addEventListener("change", onDashboardChange);
    document.body.addEventListener("input", onDashboardChange);
  }

  (function run() {
    var tripCode = null;
    try {
      tripCode = sessionStorage.getItem("holiyay_trip_code");
    } catch (e) {}
    if (syncEnabled && tripCode) {
      getSharedState(tripCode).then(function (state) {
        if (state) applyState(state);
        init();
      }).catch(function () { init(); });
    } else {
      init();
    }
  })();
})();

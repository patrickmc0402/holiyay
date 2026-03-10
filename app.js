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

  if (accessPassword.length > 0) {
    try {
      if (sessionStorage.getItem(ACCESS_KEY) !== "1") {
        showAccessGate();
        return;
      }
    } catch (e) {
      showAccessGate();
      return;
    }
  }

  const rate = getStoredRate();
  const VENUE_STORAGE_PREFIX = "holiyay_venue_";

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
  }

  function setStoredRate(value) {
    const n = parseFloat(value, 10);
    if (Number.isNaN(n) || n <= 0) return;
    localStorage.setItem(STORAGE_KEY, String(n));
  }

  function jpyToAud(jpy) {
    if (jpy == null) return null;
    return jpy / rate;
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
    input.value = String(rate);
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        const v = input.value.replace(",", ".");
        setStoredRate(v);
        const n = parseFloat(v, 10);
        if (!Number.isNaN(n) && n > 0) {
          window.HOLIYAY_RATE = n;
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
        return (
          '<li class="reminder-item">' +
          '<span class="reminder-label">' + escapeHtml(r.label) + "</span>" +
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
    return (
      "<li class=\"day-block-item-venue\">" +
      "<span class=\"venue-type\">" + escapeHtml(item.type || "Venue") + ":</span> " +
      selectHtml +
      detailsHtml +
      "</li>"
    );
  }

  function renderMapLayers() {
    const container = document.getElementById("map-layers");
    if (!container) return;
    container.innerHTML = DATA.mapLayers
      .map(function (layer) {
        const pinsHtml =
          layer.pins && layer.pins.length
            ? "<ul class=\"map-layer-pins\">" + layer.pins.map(function (p) { return "<li>" + escapeHtml(p) + "</li>"; }).join("") + "</ul>"
            : "";
        const noteHtml = layer.note ? '<p class="map-layer-note">' + escapeHtml(layer.note) + "</p>" : "";
        return (
          '<div class="map-layer">' +
          '<p class="map-layer-name">' + escapeHtml(layer.name) + "</p>" +
          pinsHtml +
          noteHtml +
          "</div>"
        );
      })
      .join("");
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
          const list = items
            .map(function (item, index) {
              if (item.venueCategory && item.venueId) {
                return buildVenueItemHtml(day.day, slot, index, item);
              }
              const label = item.type ? item.type + ": " : "";
              return "<li>" + escapeHtml(label) + escapeHtml(item.text) + "</li>";
            })
            .join("");
          blocks.push('<div class="day-block"><p class="day-block-title">' + title + "</p><ul class=\"day-block-items\">" + list + "</ul></div>");
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

  function init() {
    window.HOLIYAY_RATE = rate;
    renderHeader();
    renderExchange();
    renderReminders();
    renderBudget();
    renderDayCosts();
    renderMapLayers();
    renderDays();
    document.body.addEventListener("change", onVenueSelectChange);
  }

  init();
})();

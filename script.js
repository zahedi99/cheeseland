
// BRANCH DATA (replace URLs later)

const branches = [
  {
    id: "harlow",
    name: "Cheese Pizza - Harlow",
    area: "Harlow, Essex",
    outward: "CM20",
    lat: 51.7729,
    lng: 0.1023,
    url: "https://example.com/harlow"
  },
  {
    id: "stalbans",
    name: "Cheese Pizza - St Albans",
    area: "St Albans, Hertfordshire",
    outward: "AL1",
    lat: 51.75,
    lng: -0.3333,
    url: "https://cheerzpizza.uk/"
  },
  {
    id: "stevenage",
    name: "Cheese Pizza - Stevenage",
    area: "Stevenage, Hertfordshire",
    outward: "SG1",
    lat: 51.8979,
    lng: -0.2020,
    url: "https://cheesepizzastevenage.co.uk/"
  },
  {
    id: "chatham",
    name: "Cheese Pizza - Chatham",
    area: "Chatham, Kent",
    outward: "ME4",
    lat: 51.38,
    lng: 0.53,
    url: "https://example.com/chatham"
  },
  {
    id: "tunbridgewells",
    name: "Cheese Pizza - Tunbridge Wells",
    area: "Royal Tunbridge Wells, Kent",
    outward: "TN1",
    lat: 51.1328,
    lng: 0.2636,
    url: "https://cheesepizza.uk/"
  }
];


// HELPERS

const $ = (sel) => document.querySelector(sel);

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function directionsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 =
    Math.cos(toRad(aLat)) *
    Math.cos(toRad(bLat)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return R * c;
}

function findClosestBranchTo(userLat, userLng) {
  let best = null;
  let bestDistance = Infinity;

  for (const b of branches) {
    const d = haversineKm(userLat, userLng, b.lat, b.lng);
    if (d < bestDistance) {
      bestDistance = d;
      best = b;
    }
  }

  return { best, bestDistance };
}


// MAP INIT (LEAFLET)

const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: false
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const bounds = L.latLngBounds(branches.map(b => [b.lat, b.lng]));
map.fitBounds(bounds.pad(0.25));

// Ensure correct render when layout changes
setTimeout(() => map.invalidateSize(), 300);


// MARKERS

const markerById = new Map();

function makeMarker(branch) {
  const marker = L.marker([branch.lat, branch.lng]).addTo(map);

  const popupHtml = `
    <div style="min-width:180px">
      <strong>${escapeHtml(branch.name)}</strong><br/>
      <span style="font-size:12px; color:#6b7280">
        ${escapeHtml(branch.area)}
      </span><br/><br/>
      <a href="${branch.url}" target="_blank" rel="noopener">Visit / Order</a>
      &nbsp;|&nbsp;
      <a href="${directionsLink(branch.lat, branch.lng)}" target="_blank" rel="noopener">Directions</a>
    </div>
  `;

  marker.bindPopup(popupHtml);

  marker.on("click", () => {
    setActiveBranch(branch.id, { openPopup: true, scrollToCard: true });
  });

  markerById.set(branch.id, marker);
}

branches.forEach(makeMarker);

// UI REFERENCES

const select = $("#branchSelect");
const resetBtn = $("#resetBtn");
const cardsWrap = $("#cards");
const searchInput = $("#searchInput");
const findNearestBtn = $("#findNearestBtn");
const useLocationBtn = $("#useLocationBtn");   // <-- NEW
const nearestText = $("#nearestText");

let userMarker = null; // <-- NEW (your location marker)

// RENDERING

function buildSelect(list) {
  select.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Please choose";
  select.appendChild(opt0);

  list.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = `${b.area} (${b.outward})`;
    select.appendChild(opt);
  });
}

function buildCards(list, activeId = null) {
  cardsWrap.innerHTML = "";

  list.forEach(b => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.branchId = b.id;

    const isActive = b.id === activeId;
    if (isActive) card.classList.add("card--active");

    card.innerHTML = `
      <div class="card__title">${escapeHtml(b.name)}</div>
      ${isActive ? `<div class="badge">Nearest</div>` : ``}
      <div class="card__meta">
        ${escapeHtml(b.area)} (${escapeHtml(b.outward)})
      </div>
      <a class="btnOrder" href="${b.url}" target="_blank" rel="noopener">
        Visit / Order
      </a>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      setActiveBranch(b.id, { openPopup: true, scrollToCard: false });
    });

    cardsWrap.appendChild(card);
  });
}

function filterBranches(q) {
  q = q.trim().toLowerCase();
  if (!q) return branches;

  return branches.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.area.toLowerCase().includes(q) ||
    b.outward.toLowerCase().includes(q)
  );
}

// ACTIVE BRANCH HANDLING

function setActiveBranch(branchId, opts = { openPopup: true, scrollToCard: true }) {
  const b = branches.find(x => x.id === branchId);
  if (!b) return;

  // Map focus
  map.setView([b.lat, b.lng], 12, { animate: true });
  const marker = markerById.get(branchId);
  if (marker && opts.openPopup) marker.openPopup();

  // UI update
  select.value = branchId;
  if (nearestText) nearestText.textContent = `Nearest branch: ${b.name}`;

  // Move selected to top + highlight yellow
  const reordered = [b, ...branches.filter(x => x.id !== b.id)];
  buildCards(reordered, b.id);

  // Scroll to the highlighted card
  if (opts.scrollToCard) {
    const card = document.querySelector(`.card[data-branch-id="${branchId}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}


// INITIAL RENDER

buildSelect(branches);
buildCards(branches);


// EVENTS


// Dropdown
select.addEventListener("change", () => {
  if (select.value) {
    setActiveBranch(select.value, { openPopup: true, scrollToCard: true });
  }
});

// Search filter
searchInput.addEventListener("input", () => {
  const list = filterBranches(searchInput.value);
  buildSelect(list);
  buildCards(list);
});

// Reset
resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  if (nearestText) nearestText.textContent = "";
  select.value = "";
  buildSelect(branches);
  buildCards(branches);
  map.fitBounds(bounds.pad(0.25));

  // remove user marker if exists
  if (userMarker) {
    map.removeLayer(userMarker);
    userMarker = null;
  }
});

// Find nearest (by outward code first, fallback to map center)
findNearestBtn.addEventListener("click", () => {
  const q = searchInput.value.trim().toUpperCase();
  if (!q) {
    if (nearestText) nearestText.textContent = "Type an outward code (e.g. TN1, SG1)";
    return;
  }

  const outwardMatch = branches.find(b => b.outward.startsWith(q));
  if (outwardMatch) {
    setActiveBranch(outwardMatch.id, { openPopup: true, scrollToCard: true });
    return;
  }

  const center = map.getCenter();
  const { best } = findClosestBranchTo(center.lat, center.lng);
  if (best) setActiveBranch(best.id, { openPopup: true, scrollToCard: true });
});

// NEW: Use my location → recommend closest branch
if (useLocationBtn) {
  useLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      if (nearestText) nearestText.textContent = "Geolocation is not supported by your browser.";
      return;
    }

    if (nearestText) nearestText.textContent = "Getting your location…";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Add or update "You are here" marker
        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.circleMarker([userLat, userLng], {
          radius: 8,
          weight: 2,
          fillOpacity: 0.6
        }).addTo(map);

        userMarker.bindPopup("You are here").openPopup();

        // Find closest branch
        const { best, bestDistance } = findClosestBranchTo(userLat, userLng);
        if (!best) {
          if (nearestText) nearestText.textContent = "No branches found.";
          return;
        }

        // Fit map to show user + closest branch
        const pairBounds = L.latLngBounds([[userLat, userLng], [best.lat, best.lng]]);
        map.fitBounds(pairBounds.pad(0.35));
        setTimeout(() => map.invalidateSize(), 200);

        // Highlight closest branch
        setActiveBranch(best.id, { openPopup: true, scrollToCard: true });

        if (nearestText) {
          nearestText.textContent = `Closest branch: ${best.name} (~${bestDistance.toFixed(1)} km away)`;
        }
      },
      (err) => {
        if (!nearestText) return;

        if (err.code === 1) {
          nearestText.textContent = "Location permission denied. Please allow location access.";
        } else {
          nearestText.textContent = "Could not get your location. Try again.";
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// Nav map resize fix
document.querySelectorAll('a[href="#mapWrap"]').forEach(a => {
  a.addEventListener("click", () => {
    setTimeout(() => map.invalidateSize(), 300);
  });
});

// Footer year (if present)
const y = $("#year");
if (y) y.textContent = new Date().getFullYear();

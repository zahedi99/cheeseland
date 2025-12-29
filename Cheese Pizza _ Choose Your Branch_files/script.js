// =====================
// Branch data
// =====================
const branches = [
  {
    id: "stevenage",
    name: "Cheese Pizza - Stevenage",
    address: "Stevenage (SG area)",
    prefixes: ["SG"],
    url: "https://cheesepizzastevenage.co.uk"
  },
  
  {
    id: "stalbans",
    name: "Cheerz Pizza - St Albans",
    address: "St Albans (AL area)",
    prefixes: ["AL"],
    url: "https://cheerzpizza.uk"
  }
];

// =====================
// Helpers
// =====================
function normalisePostcode(pc) {
  return pc.toUpperCase().replace(/\s+/g, "");
}

function getOutwardCode(pc) {
  const clean = normalisePostcode(pc);
  if (clean.length <= 4) return clean;
  return clean.slice(0, clean.length - 3);
}

function findNearestBranch(pc) {
  const outward = getOutwardCode(pc);
  if (outward.length < 2) return null;

  return branches.find(b =>
    b.prefixes.some(prefix => outward.startsWith(prefix))
  ) || null;
}

// =====================
// DOM elements
// =====================
const branchGrid = document.getElementById("branchGrid");
const input = document.getElementById("postcodeInput");
const form = document.getElementById("postcodeForm");
const message = document.getElementById("message");

// =====================
// Render branches
// =====================
function renderBranches(recommendedId) {
  let ordered = [...branches];

  if (recommendedId) {
    const index = ordered.findIndex(b => b.id === recommendedId);
    if (index > 0) {
      const picked = ordered.splice(index, 1)[0];
      ordered.unshift(picked);
    }
  }

  branchGrid.innerHTML = ordered.map(b => {
    const isRec = b.id === recommendedId;

    return (
      '<article class="card ' + (isRec ? 'recommended' : '') + '">' +
        '<h3>' + b.name + (isRec ? ' <span class="badge">Nearest</span>' : '') + '</h3>' +
        '<p>' + b.address + '</p>' +
        '<a href="' + b.url + '" target="_blank" rel="noopener noreferrer">' +
          'Visit / Order' +
        '</a>' +
      '</article>'
    );
  }).join("");
}

// =====================
// Initial render
// =====================
renderBranches(null);

// =====================
// Interaction
// =====================
function updateNearest() {
  const value = input.value.trim();
  if (!value) {
    renderBranches(null);
    message.textContent = "";
    return;
  }

  const branch = findNearestBranch(value);

  if (!branch) {
    renderBranches(null);
    message.textContent = "No nearest branch found. Please choose from the list.";
    return;
  }

  renderBranches(branch.id);
  message.textContent = "Nearest branch: " + branch.name;
}

input.addEventListener("input", updateNearest);

form.addEventListener("submit", function (e) {
  e.preventDefault();
  updateNearest();
  document.getElementById("locations").scrollIntoView({ behavior: "smooth" });
});

// =====================
// Footer year
// =====================
document.getElementById("year").textContent = new Date().getFullYear();

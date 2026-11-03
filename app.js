const P = [
  {
    id: "whey",
    name: "Potency Whey",
    cat: "whey",
    variants: ["Chocolate", "Coffee"],
    desc: "Whey protein · select your flavour",
    img: "https://revakanya.com/assets/imgs/Potency%20Whey.png",
  },
  {
    id: "mass",
    name: "Nitro Mass",
    cat: "mass",
    variants: ["3 kg", "5 kg"],
    desc: "Mass gainer · select your pack size",
    img: "",
  },
  {
    id: "pre",
    name: "Sturdy Pre-Workout",
    cat: "pre",
    variants: ["Watermelon · 250 g"],
    desc: "Pre-workout performance formula",
    img: "https://revakanya.com/assets/imgs/Sturdy%20Pre%20Workout.png",
  },
  {
    id: "creatine",
    name: "Pro Creatine",
    cat: "creatine",
    variants: ["Blueberry", "Cranberry"],
    desc: "Creatine supplement · select your flavour",
    img: "https://revakanya.com/assets/imgs/Pro%20Creatine.png",
  },
  {
    id: "vitamins",
    name: "Musclevite Multivitamin",
    cat: "vitamins",
    variants: ["Musclevite"],
    desc: "Daily multivitamin supplement",
    img: "",
  },
];
const RETAIL = {
  whey: [4999, 4999],
  mass: [2599, 3499],
  pre: [1399],
  creatine: [899, 899],
  vitamins: [699],
};
const SKUS = {
  whey: ["MVN-WHEY-CHOC-5LB", "MVN-WHEY-COFFEE-5LB"],
  mass: ["MVN-MASS-3KG", "MVN-MASS-5KG"],
  pre: ["MVN-PRE-250G"],
  creatine: ["MVN-CREATINE-BLUE-100G", "MVN-CREATINE-CRAN-100G"],
  vitamins: ["MVN-MULTI"],
};
for (const [id, skus] of Object.entries(SKUS))
  skus.forEach((sku, i) => {
    const value = window.MVN_COMMERCE?.products?.[sku]?.price;
    if (Number.isFinite(value) && value >= 0) RETAIL[id][i] = value;
  });
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
let cat = "all",
  q = "",
  bag = {};
try {
  bag = JSON.parse(localStorage.mvnBag || "{}");
} catch (e) {}
if (!bag || typeof bag !== "object" || Array.isArray(bag)) bag = {};
for (const [key, value] of Object.entries(bag)) {
  const [id, v] = key.split("|");
  const p = P.find((p) => p.id === id);
  if (
    !p ||
    !p.variants.includes(v) ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 999
  )
    delete bag[key];
}
const $ = (x) => document.getElementById(x);
function save() {
  try {
    localStorage.mvnBag = JSON.stringify(bag);
  } catch (e) {}
  bagUI();
}
function card(p) {
  let ph = p.img
    ? '<img src="' +
      p.img +
      '" alt="' +
      p.name +
      '" onerror="this.style.display=\'none\'"><small class="ref">Manufacturer reference · packaging may vary</small>'
    : '<div class="placeholder"><b>' +
      p.name +
      "</b>Current pack image being verified</div>";
  let opts = p.variants.map((v) => "<option>" + v + "</option>").join("");
  return (
    '<article class="card"><span class="badge">UNICORN PRO SERIES</span><div class="photo">' +
    ph +
    '</div><div class="info"><small>SPORTS NUTRITION</small><h3>' +
    p.name +
    "</h3><p>" +
    p.desc +
    '</p><label class="variant-label" for="v-' +
    p.id +
    '">CHOOSE VARIANT</label><select id="v-' +
    p.id +
    '">' +
    opts +
    '</select><div class="price"><b id="price-' +
    p.id +
    '">' +
    money(RETAIL[p.id][0]) +
    "</b><small>" +
    (window.MVN_COMMERCE?.priceLabel || "Retail") +
    ' · stock confirmed on product page</small></div><a class="retail-link" id="buy-' +
    p.id +
    '" href="#dealer">CHECK AVAILABILITY</a><button class="add" data-id="' +
    p.id +
    '">ADD TO QUOTE BAG +</button></div></article>'
  );
}
function render() {
  const selected = {};
  for (const p of P) {
    const e = $("v-" + p.id);
    if (e) selected[p.id] = e.value;
  }
  let a = P.filter(
    (p) =>
      RETAIL[p.id].some(
        (price) =>
          price >= Number($("min-price").value || 0) &&
          price <= Number($("max-price").value || Infinity),
      ) &&
      (cat === "all" || p.cat === cat) &&
      (p.name + " " + p.variants.join(" "))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  if ($("sort").value === "low")
    a.sort((x, y) => RETAIL[x.id][0] - RETAIL[y.id][0]);
  if ($("sort").value === "high")
    a.sort((x, y) => RETAIL[y.id][0] - RETAIL[x.id][0]);
  if ($("sort").value === "name")
    a.sort((x, y) => x.name.localeCompare(y.name));
  $("grid").innerHTML = a.map(card).join("");
  $("resultText").textContent =
    a.length + " product" + (a.length === 1 ? "" : "s") + " shown";
  for (const p of a) {
    const select = $("v-" + p.id);
    if (p.variants.includes(selected[p.id])) select.value = selected[p.id];
    const update = () => {
      const i = p.variants.indexOf(select.value);
      $("price-" + p.id).textContent = money(RETAIL[p.id][i]);
      const product = window.MVN_COMMERCE?.products?.[SKUS[p.id][i]];
      const link = $("buy-" + p.id);
      link.href = product?.url || "#dealer";
      link.textContent = product
        ? product.available
          ? "VIEW & BUY"
          : "VIEW PRODUCT · OUT OF STOCK"
        : "ENQUIRE · STOCK UNVERIFIED";
    };
    select.onchange = update;
    update();
  }
  document.querySelectorAll(".add").forEach(
    (b) =>
      (b.onclick = () => {
        let p = P.find((x) => x.id === b.dataset.id),
          v = $("v-" + p.id).value,
          k = p.id + "|" + v;
        bag[k] = Math.min(999, (bag[k] || 0) + 1);
        save();
        openBag();
      }),
  );
}
function setCat(c) {
  cat = c;
  document
    .querySelectorAll(".cats [data-cat]")
    .forEach((b) => b.classList.toggle("active", b.dataset.cat === cat));
  render();
  $("shop").scrollIntoView({ behavior: "smooth" });
}
function bagUI() {
  let n = Object.values(bag).reduce((a, b) => a + b, 0);
  $("count").textContent = n;
  let html = "";
  if (!n)
    html =
      '<p style="color:#71808b">Your quote bag is empty. Add products from the store.</p>';
  else
    Object.entries(bag).forEach(([k, num]) => {
      let parts = k.split("|"),
        p = P.find((x) => x.id === parts[0]);
      html +=
        '<div class="row"><b>' +
        p.name +
        "</b><small>" +
        parts[1] +
        '</small><div><button data-m="' +
        k +
        '">−</button>' +
        num +
        '<button data-p="' +
        k +
        '">+</button></div></div>';
    });
  $("items").innerHTML = html;
  document.querySelectorAll("[data-m]").forEach(
    (x) =>
      (x.onclick = () => {
        bag[x.dataset.m]--;
        if (!bag[x.dataset.m]) delete bag[x.dataset.m];
        save();
      }),
  );
  document.querySelectorAll("[data-p]").forEach(
    (x) =>
      (x.onclick = () => {
        bag[x.dataset.p] = Math.min(999, bag[x.dataset.p] + 1);
        save();
      }),
  );
}
let bagFocus;
function openBag() {
  bagFocus = document.activeElement;
  $("shade").hidden = false;
  $("drawer").classList.add("open");
  $("close").focus?.();
}
function closeBag() {
  $("shade").hidden = true;
  $("drawer").classList.remove("open");
  bagFocus?.focus?.();
}
$("bag").onclick = openBag;
$("close").onclick = closeBag;
$("shade").onclick = closeBag;
document.querySelectorAll("[data-cat]").forEach(
  (x) =>
    (x.onclick = (e) => {
      e.preventDefault();
      setCat(x.dataset.cat);
    }),
);
$("sort").onchange = render;
$("search").onsubmit = (e) => {
  e.preventDefault();
  q = $("q").value;
  cat = "all";
  render();
  $("shop").scrollIntoView({ behavior: "smooth" });
};
$("q").oninput = (e) => {
  q = e.target.value;
  render();
};
$("send").onclick = () => {
  let a = Object.entries(bag);
  if (!a.length) {
    alert("Add products first.");
    return;
  }
  let lines = a.map(([k, n]) => {
    let parts = k.split("|");
    return P.find((p) => p.id === parts[0]).name + " — " + parts[1] + " × " + n;
  });
  let m =
    "Hello Max Volume Nutrition, I need a wholesale quotation for Unicorn Pro Series:\n\n" +
    lines.join("\n") +
    "\n\nPlease share dealer pricing and availability.";
  window.open(
    "https://wa.me/917708830513?text=" + encodeURIComponent(m),
    "_blank",
  );
};
render();
bagUI();
$("min-price").oninput = render;
$("max-price").oninput = render;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeBag();
});
if (window.MVN_COMMERCE) {
  const links = document.getElementById("commerce-links");
  for (const [label, key] of [
    ["Full Shop", "shop"],
    ["My Account", "account"],
    ["Retail Cart", "cart"],
  ]) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = window.MVN_COMMERCE[key];
    links.append(a);
  }
}

document.getElementById("drawer").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const nodes = [
    ...document.querySelectorAll("#drawer button, #drawer a[href]"),
  ];
  const first = nodes[0],
    last = nodes.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

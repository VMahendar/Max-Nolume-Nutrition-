import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
const code = fs.readFileSync("app.js", "utf8");
function load(storage = "{}") {
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "sort" ? "default" : "",
        textContent: "",
        innerHTML: "",
        hidden: true,
        classList: { add() {}, remove() {}, toggle() {} },
        scrollIntoView() {},
        append() {},
        addEventListener() {},
      });
    return elements.get(id);
  };
  const context = vm.createContext({
    Intl,
    console,
    localStorage: { mvnBag: storage },
    document: {
      getElementById: el,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    window: { open() {} },
    alert() {},
  });
  // A browser normally selects the first option inserted into a select element.
  for (const [id, value] of Object.entries({
    whey: "Chocolate",
    mass: "3 kg",
    pre: "Watermelon · 250 g",
    creatine: "Blueberry",
    vitamins: "Musclevite",
  }))
    el(`v-${id}`).value = value;
  vm.runInContext(code, context);
  return { context, el, run: (s) => vm.runInContext(s, context) };
}
test("all eight retail prices match the issue", () => {
  const a = load();
  assert.deepEqual(JSON.parse(a.run("JSON.stringify(RETAIL)")), {
    whey: [4999, 4999],
    mass: [2599, 3499],
    pre: [1399],
    creatine: [899, 899],
    vitamins: [699],
  });
});
test("invalid, obsolete and injected quote entries are discarded", () => {
  for (const input of [
    "null",
    "[]",
    "broken",
    '{"missing|Chocolate":1,"whey|<script>":2,"whey|Coffee":-4,"mass|3 kg":"5"}',
  ])
    assert.equal(load(input).run("Object.keys(bag).length"), 0);
});
test("valid quote survives reload, quantities are bounded", () => {
  assert.equal(load('{"whey|Chocolate":2}').run('bag["whey|Chocolate"]'), 2);
  assert.equal(
    load('{"whey|Chocolate":1000}').run("Object.keys(bag).length"),
    0,
  );
});
test("search and category filter show matching collection", () => {
  const a = load();
  a.run('q="coffee";render()');
  assert.match(a.el("resultText").textContent, /1 product/);
  a.run('q="";cat="mass";render()');
  assert.match(a.el("grid").innerHTML, /Nitro Mass/);
  assert.doesNotMatch(a.el("grid").innerHTML, /Potency Whey/);
  a.run('q="nonexistent";render()');
  assert.match(a.el("resultText").textContent, /0 products/);
});
test("mass variant updates retail price and unavailable stock is explicit", () => {
  const a = load();
  a.el("v-mass").value = "5 kg";
  a.el("v-mass").onchange();
  assert.equal(a.el("price-mass").textContent, "₹3,499");
  assert.match(a.el("buy-mass").textContent, /UNVERIFIED/);
});
test("quote drawer and storage failure remain usable", () => {
  const a = load();
  a.run("openBag()");
  assert.equal(a.el("shade").hidden, false);
  a.run("closeBag()");
  assert.equal(a.el("shade").hidden, true);
  a.run(
    'Object.defineProperty(localStorage,"mvnBag",{set(){throw Error("disabled")}});save()',
  );
});

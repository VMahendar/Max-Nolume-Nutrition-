// Optional Workers deployment bridge. The existing static and Woo storefronts remain usable without it.
(async () => {
  if (window.MVN_COMMERCE) return;
  try {
    const response = await fetch("/api/products");
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.products)) return;
    window.MVN_COMMERCE = {
      products: {},
      priceLabel: "Retail",
      cart: "/checkout",
      shop: "/#shop",
    };
    for (const p of data.products) {
      window.MVN_COMMERCE.products[p.sku] = {
        url: `/checkout?sku=${encodeURIComponent(p.sku)}`,
        available: p.stock > 0 && p.verified === 1,
        price: p.price_paise / 100,
      };
    }
    for (const [id, skus] of Object.entries(SKUS))
      skus.forEach((sku, i) => {
        const price = window.MVN_COMMERCE.products[sku]?.price;
        if (Number.isFinite(price)) RETAIL[id][i] = price;
      });
    render();
    const link = document.createElement("a");
    link.href = "/checkout";
    link.textContent = "Retail cart & checkout";
    document.getElementById("commerce-links").append(link);
  } catch {
    /* Standalone Pages has no API. Preserve its existing quote workflow. */
  }
})();

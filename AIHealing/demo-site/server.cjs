// ============================================================================
// HEALING DEMO SERVER
// ============================================================================
// A controlled test harness for demonstrating AI-powered selector healing.
//
// Serves two visually-identical pages with DIFFERENT DOM selectors:
//   /v1  — clean selectors (#search-input, .product-card, .add-cart-btn)
//   /v2  — renamed "after redesign" (#productSearchField, .item-tile, .btn-add-item)
//
// The root URL (/) serves whichever version is currently active.
//
// Usage:
//   node demo-site/server.cjs           # starts on port 4500
//   curl http://localhost:4500/toggle   # swap v1 <-> v2
//   curl http://localhost:4500/version  # inspect current version
//   curl http://localhost:4500/set/v1   # force to v1
//   curl http://localhost:4500/set/v2   # force to v2
//
// Demo flow:
//   1. GET /set/v1                  ← start clean
//   2. Run AI agent → learns + saves golden states to vector DB
//   3. GET /toggle                  ← selectors break
//   4. Run AI agent again → healing engages, matches by text+role
// ============================================================================

const http = require('http');

const PORT = process.env.DEMO_PORT ? parseInt(process.env.DEMO_PORT, 10) : 4500;

let currentVersion = 'v1';

// ---------------------------------------------------------------------------
// Shared CSS — identical between versions so both look the same to a human
// ---------------------------------------------------------------------------
const SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', sans-serif; }
  body { background: #f7f7f7; color: #232f3e; }
  header {
    background: linear-gradient(135deg, #131921 0%, #232f3e 100%);
    color: #fff;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  header .logo { font-weight: 700; font-size: 22px; letter-spacing: -0.5px; color: #ff9900; }
  header .search { flex: 1; display: flex; max-width: 700px; gap: 0; }
  header input[type="text"] {
    flex: 1;
    padding: 10px 14px;
    border: none;
    border-radius: 6px 0 0 6px;
    font-size: 15px;
    outline: none;
  }
  header button.search-submit {
    padding: 10px 22px;
    background: #febd69;
    color: #131921;
    border: none;
    border-radius: 0 6px 6px 0;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
  header button.search-submit:hover { background: #f3a847; }
  header .cart { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .version-badge {
    margin-left: 12px;
    padding: 3px 10px;
    background: rgba(255,153,0,0.2);
    border: 1px solid #ff9900;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  main { max-width: 1200px; margin: 28px auto; padding: 0 20px; }
  .page-title { font-size: 24px; margin-bottom: 18px; font-weight: 600; }
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px;
  }
  .product {
    background: #fff;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .product:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .product .thumb {
    width: 100%; height: 160px;
    background: #eee;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; margin-bottom: 12px;
  }
  .product h3 { font-size: 15px; font-weight: 500; min-height: 40px; margin-bottom: 8px; }
  .product .price { font-size: 20px; font-weight: 700; color: #b12704; margin-bottom: 12px; }
  .product button {
    width: 100%;
    padding: 10px;
    background: #ffd814;
    color: #0f1111;
    border: 1px solid #fcd200;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
  }
  .product button:hover { background: #f7ca00; }
  .product button.added { background: #4caf50; color: #fff; border-color: #3e8e41; }
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: #232f3e; color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    opacity: 0; transform: translateY(20px);
    transition: all 0.2s;
    z-index: 50;
    font-size: 14px;
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  .no-results { text-align: center; padding: 60px 20px; color: #666; }
`;

// ---------------------------------------------------------------------------
// Shared product catalogue (same products for both versions)
// ---------------------------------------------------------------------------
const PRODUCTS = [
  { emoji: '🎧', title: 'Wireless Bluetooth Headphones', price: 79.99, tags: 'headphones audio music' },
  { emoji: '⌚', title: 'Smart Fitness Watch',          price: 149.99, tags: 'watch fitness tracker' },
  { emoji: '📱', title: 'USB-C Fast Charger 65W',       price: 29.99,  tags: 'charger usb adapter' },
  { emoji: '💻', title: 'MacBook Pro M3 14"',           price: 1999.0, tags: 'laptop macbook apple m3' },
  { emoji: '🖱️', title: 'Ergonomic Wireless Mouse',      price: 24.99,  tags: 'mouse peripheral' },
  { emoji: '⌨️', title: 'Mechanical Keyboard RGB',      price: 89.99,  tags: 'keyboard typing rgb' },
];

// ---------------------------------------------------------------------------
// Render function — selectors differ between v1 and v2 but text/visuals match
// ---------------------------------------------------------------------------
function renderPage(version) {
  const isV1 = version === 'v1';

  // v1 selectors (original)
  const searchInputId   = isV1 ? 'search-input'    : 'productSearchField';
  const searchBtnId     = isV1 ? 'search-btn'      : 'submitSearch';
  const cartCounterId   = isV1 ? 'cart-count'      : 'basketCounter';
  const productClass    = isV1 ? 'product-card'    : 'item-tile';
  const addBtnClass     = isV1 ? 'add-cart-btn'    : 'btn-add-item';
  const titleClass      = isV1 ? 'product-title'   : 'tile-title';
  const priceClass      = isV1 ? 'product-price'   : 'tile-price';
  const searchFormId    = isV1 ? 'search-form'     : 'search-bar';
  const versionLabel    = isV1 ? 'V1 — original'   : 'V2 — post-redesign';

  const productsHtml = PRODUCTS.map((p, i) => `
    <article class="product ${productClass}" data-product-id="${i}" data-tags="${p.tags}">
      <div class="thumb">${p.emoji}</div>
      <h3 class="${titleClass}">${p.title}</h3>
      <div class="price ${priceClass}">$${p.price.toFixed(2)}</div>
      <button type="button" class="${addBtnClass}" data-id="${i}">Add to Cart</button>
    </article>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ShopDemo — Healing Test Harness (${version})</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <header>
    <span class="logo">ShopDemo</span>
    <form class="search" id="${searchFormId}" onsubmit="event.preventDefault(); filterProducts();">
      <input type="text" id="${searchInputId}" placeholder="Search products..." aria-label="Search products" />
      <button type="submit" class="search-submit" id="${searchBtnId}">Search</button>
    </form>
    <div class="cart" aria-label="Shopping cart">
      🛒 <span id="${cartCounterId}">0</span> items
    </div>
    <span class="version-badge">${versionLabel}</span>
  </header>

  <main>
    <h1 class="page-title">All Products</h1>
    <div class="product-grid" id="productGrid">
      ${productsHtml}
    </div>
    <div class="no-results" id="noResults" style="display:none;">No products match your search.</div>
  </main>

  <div class="toast" id="toast"></div>

  <script>
    const SEARCH_INPUT_ID = ${JSON.stringify(searchInputId)};
    const CART_COUNTER_ID = ${JSON.stringify(cartCounterId)};
    const PRODUCT_CLASS   = ${JSON.stringify(productClass)};
    const ADD_BTN_CLASS   = ${JSON.stringify(addBtnClass)};

    let cartCount = 0;

    function filterProducts() {
      const q = (document.getElementById(SEARCH_INPUT_ID).value || '').trim().toLowerCase();
      const cards = document.querySelectorAll('.' + PRODUCT_CLASS);
      let visible = 0;
      cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const tags  = (card.dataset.tags || '').toLowerCase();
        const matches = q.length === 0 || title.includes(q) || tags.includes(q);
        card.style.display = matches ? '' : 'none';
        if (matches) visible++;
      });
      document.getElementById('noResults').style.display = visible === 0 ? 'block' : 'none';
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(window.__toast_timer);
      window.__toast_timer = setTimeout(() => t.classList.remove('show'), 1800);
    }

    // Click handler for Add to Cart buttons (works for both v1 and v2 classnames)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.' + ADD_BTN_CLASS);
      if (!btn) return;
      cartCount += 1;
      document.getElementById(CART_COUNTER_ID).textContent = String(cartCount);
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      showToast('Added to cart');
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
      }, 1600);
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Tiny router
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // JSON helper
  const json = (obj, code = 200) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(obj));
  };

  // HTML helper
  const html = (body, code = 200) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Disable caching so the agent always sees current version
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.end(body);
  };

  // --- routes ---

  if (url === '/version') {
    return json({ version: currentVersion });
  }

  if (url === '/toggle') {
    currentVersion = currentVersion === 'v1' ? 'v2' : 'v1';
    console.log(`[demo-site] toggled → ${currentVersion}`);
    return json({ version: currentVersion, toggled: true });
  }

  if (url === '/set/v1' || url === '/set/v2') {
    currentVersion = url.endsWith('v1') ? 'v1' : 'v2';
    console.log(`[demo-site] set → ${currentVersion}`);
    return json({ version: currentVersion, set: true });
  }

  if (url === '/v1') return html(renderPage('v1'));
  if (url === '/v2') return html(renderPage('v2'));

  if (url === '/' || url.startsWith('/?')) {
    return html(renderPage(currentVersion));
  }

  if (url === '/favicon.ico') {
    res.statusCode = 204;
    return res.end();
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧪 HEALING DEMO SITE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Listening on:  http://localhost:${PORT}`);
  console.log(`  Current:       ${currentVersion}`);
  console.log('');
  console.log('  Routes:');
  console.log(`    /             → current version (${currentVersion})`);
  console.log('    /v1           → clean selectors');
  console.log('    /v2           → "post-redesign" selectors');
  console.log('    /toggle       → swap v1 ↔ v2');
  console.log('    /set/v1       → force v1');
  console.log('    /set/v2       → force v2');
  console.log('    /version      → { "version": "v1" | "v2" }');
  console.log('');
  console.log('  Demo flow:');
  console.log('    1. Agent runs on v1 → learns selectors → saves golden states');
  console.log('    2. curl /toggle     → selectors break');
  console.log('    3. Agent runs again → healing finds them by text+role');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
});

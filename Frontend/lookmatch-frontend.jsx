import React, { useState, useRef, useCallback } from "react";

const SECOND_HAND_SOURCES = new Set(["Vinted", "eBay", "Depop", "Vestiaire"]);
const SECOND_HAND_KEYWORDS = /pre-owned|vintage|used|second.hand/i;

function isSecondHand(item) {
  if (item.secondHand !== undefined) return item.secondHand;
  return SECOND_HAND_SOURCES.has(item.source) || SECOND_HAND_KEYWORDS.test(item.desc || "");
}

const SERVER = "http://localhost:3001";

const SOURCE_COLORS = {
  eBay:             { bg: "#c84b31", text: "#fff" },
  Zalando:          { bg: "#d45c00", text: "#fff" },
  "Google Shopping":{ bg: "#2a6496", text: "#fff" },
  Vinted:           { bg: "#2a7a5e", text: "#fff" },
  Farfetch:         { bg: "#1a3a2e", text: "#4ecba0" },
  ASOS:             { bg: "#4ecba0", text: "#0f2a20" },
};

export default function App() {
  const [page, setPage] = useState("upload");
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [history, setHistory] = useState([]); // session-only search history

  const goToResults = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setLoading(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${SERVER}/analyze`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(data);
      setHistory((prev) => [
        { id: Date.now(), imgUrl: url, results: data, at: new Date(), count: data.length },
        ...prev,
      ]);
      setPage("results");
    } catch (err) {
      alert(`Model error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = (item) =>
    setCart((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]));
  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id));

  const backToUpload  = () => { setPage("upload"); setImgUrl(null); setResults([]); };
  const goToDetail    = (item) => { setSelectedItem(item); setPage("detail"); };
  const backToResults = () => { setSelectedItem(null); setPage("results"); };
  const buyNow        = (item) => { setCheckoutItems([item]); setPage("checkout"); };
  const goToCart      = () => { if (cart.length) { setCheckoutItems(cart); setPage("checkout"); } };
  const onPaid        = () => { setCart([]); setCheckoutItems([]); };
  const goToHistory   = () => setPage("history");
  const openHistory   = (entry) => { setImgUrl(entry.imgUrl); setResults(entry.results); setPage("results"); };

  const nav = { cartCount: cart.length, onCart: goToCart, historyCount: history.length, onHistory: goToHistory };

  return (
    <div style={S.root}>
      <style>{KEYFRAMES}</style>
      {page === "upload"  && <UploadPage onFile={goToResults} loading={loading} imgUrl={imgUrl} {...nav} />}
      {page === "results" && <ResultsPage results={results} imgUrl={imgUrl} onBack={backToUpload} onDetail={goToDetail} {...nav} />}
      {page === "detail"  && <ItemDetailPage item={selectedItem} onBack={backToResults} onAddToCart={addToCart} onBuyNow={buyNow} inCart={cart.some((c) => c.id === selectedItem?.id)} {...nav} />}
      {page === "checkout" && <CheckoutPage items={checkoutItems} onBack={backToResults} onPaid={onPaid} onRemove={removeFromCart} />}
      {page === "history" && <HistoryPage history={history} onBack={backToUpload} onOpen={openHistory} {...nav} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 1 — Upload
// ──────────────────────────────────────────────────────────────
const IMPACT_STATS = [
  { value: "92M",  unit: "tonnes",   label: "textile waste per year globally" },
  { value: "82%",  unit: "less CO₂", label: "buying pre-owned vs. new fast fashion" },
  { value: "€39B", unit: "market",   label: "European secondhand by 2035" },
  { value: "99",   unit: "in 100",   label: "Swiss secondhand items never find a buyer" },
];

function UploadPage({ onFile, loading, imgUrl, ...nav }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  return (
    <>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={S.tagline}>pre-owned · premium · planet-first</span>
          <NavActions {...nav} />
        </div>
      </header>

      <main style={S.uploadMain}>

        <div style={S.uploadHero}>
          <h1 style={S.heroTitle}>
            Every purchase<br />
            <span style={S.heroAccent}>is a choice.</span>
          </h1>
          <p style={S.heroSub}>
            Drop a photo of any clothing item. WearWise finds pre-owned equivalents
            across Vinted, Depop and eBay — showing you exactly how much you save
            vs. buying new and how much CO₂ you spare.
          </p>
        </div>

        {!loading ? (
          <div
            style={{ ...S.dropzone, ...(drag ? S.dropzoneActive : {}) }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
          >
            <div style={S.dropIcon}>⇪</div>
            <div style={S.dropTitle}>Drop a clothing photo</div>
            <div style={S.dropSub}>or click to browse · JPG / PNG / WEBP</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files[0])} />
          </div>
        ) : (
          <div style={S.loadingZone}>
            {imgUrl && <img src={imgUrl} alt="upload" style={S.loadingImg} />}
            <div style={S.scanOverlay}><div style={S.scanLine} /></div>
            <div style={S.loadingText}><span style={S.spinner} />Scanning marketplaces · finding matches…</div>
          </div>
        )}

        <div style={S.howRow}>
          <div style={S.howStep}><span style={S.howNum}>1</span><span>Upload photo</span></div>
          <div style={S.howArrow}>→</div>
          <div style={S.howStep}><span style={S.howNum}>2</span><span>AI analyzes item</span></div>
          <div style={S.howArrow}>→</div>
          <div style={S.howStep}><span style={S.howNum}>3</span><span>Compare price &amp; CO₂ impact</span></div>
        </div>

        <div style={S.statsStrip}>
          {IMPACT_STATS.map((s, i) => (
            <div key={i} style={S.statCell}>
              <div style={S.statValue}>{s.value} <span style={S.statUnit}>{s.unit}</span></div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

      </main>

      <footer style={S.footer}>
        WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
      </footer>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 2 — Results
// ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "price-asc",  label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "sim",        label: "Best Match" },
  { key: "secondhand", label: "Second Hand" },
];

function CartButton({ count, onClick }) {
  return (
    <button style={S.cartBtn} onClick={onClick} title="Cart">
      🛒
      {count > 0 && <span style={S.cartBadge}>{count}</span>}
    </button>
  );
}

// Cart + history buttons, shown in every header.
function NavActions({ cartCount, onCart, historyCount, onHistory }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {onHistory && (
        <button style={S.cartBtn} onClick={onHistory} title="Search history">
          🕑
          {historyCount > 0 && <span style={S.cartBadge}>{historyCount}</span>}
        </button>
      )}
      <CartButton count={cartCount} onClick={onCart} />
    </div>
  );
}

function ImpactPanel({ items }) {
  const ref = items.find(r => isSecondHand(r) && r.co2_saved_kg);
  if (!ref) return null;

  const waterLabel = ref.water_saved_l >= 1000
    ? `${(ref.water_saved_l / 1000).toFixed(1)}k L`
    : `${ref.water_saved_l} L`;

  return (
    <div style={S.impactPanel}>
      <span style={S.impactLeaf}>🌱</span>
      <span style={S.impactHeadline}>Each pre-owned item saves</span>
      <div style={S.impactChip}>
        <span style={S.impactChipCo2}>~{ref.co2_saved_kg.toFixed(1)} kg CO₂</span>
        {ref.water_saved_l > 0 && <span style={S.impactChipWater}>~{waterLabel} water</span>}
      </div>
      <span style={S.impactHeadline}>vs. buying new</span>
    </div>
  );
}

function ResultsPage({ results, imgUrl, onBack, onDetail, ...nav }) {
  const [sortBy, setSortBy] = useState("price-asc");

  let shown = sortBy === "secondhand"
    ? results.filter(isSecondHand)
    : [...results].sort((a, b) => {
        if (sortBy === "price-asc")  return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "sim")        return b.sim - a.sim;
        return 0;
      });

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← New search</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NavActions {...nav} />
          {imgUrl && <img src={imgUrl} alt="query" style={S.queryThumb} />}
        </div>
      </header>

      <ImpactPanel items={shown} />

      <div style={S.resultsBar}>
        <div style={S.resultsCount}>
          <span style={S.countNum}>{shown.length}</span>
          <span style={S.countLabel}>matches</span>
        </div>
        <div style={S.sortPills}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              style={{ ...S.pill, ...(sortBy === opt.key ? S.pillActive : {}) }}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <main style={S.feed}>
        {shown.map((r, i) => {
          const sc = SOURCE_COLORS[r.source] || { bg: "#2a5a46", text: "#fff" };
          return (
            <article key={r.id} style={{ ...S.feedItem, animationDelay: `${i * 50}ms` }}>
              {r.imageDataUrl ? (
                <div style={{ ...S.feedImg, padding: 0, position: "relative" }}>
                  <img src={r.imageDataUrl} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ ...S.simBadge, position: "absolute", top: 12, right: 12 }}>{Math.round((r.sim ?? 0.7) * 100)}% match</span>
                </div>
              ) : (
                <div style={{ ...S.feedImg, background: `linear-gradient(135deg, ${r.swatch}cc, ${r.swatch}44)` }}>
                  <span style={S.simBadge}>{Math.round(r.sim * 100)}% match</span>
                </div>
              )}
              <div style={S.feedBody}>
                <div style={S.feedTop}>
                  <span style={{ ...S.sourceBadge, background: sc.bg, color: sc.text }}>
                    {r.source}
                  </span>
                  <span style={S.feedPrice}>{r.currency} {r.price.toFixed(2)}</span>
                </div>
                <h3 style={S.feedTitle}>{r.title}</h3>
                <p style={S.feedDesc}>{r.desc}</p>
                <button style={S.detailBtn} onClick={() => onDetail(r)}>View details →</button>
              </div>
            </article>
          );
        })}
      </main>

      <footer style={S.footer}>
        WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
      </footer>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 3 — Item Detail
// ──────────────────────────────────────────────────────────────
function ItemDetailPage({ item, onBack, onAddToCart, onBuyNow, inCart, ...nav }) {
  if (!item) return null;
  const sc = SOURCE_COLORS[item.source] || { bg: "#2a5a46", text: "#fff" };
  const secondHand = isSecondHand(item);

  const rows = [
    { label: "Size",        value: item.size || "—",   desc: "as listed by the seller" },
    { label: "Price",       value: `${item.currency} ${item.price?.toFixed(2)}`, desc: "converted to your local currency" },
    { label: "Match score", value: `${Math.round((item.sim ?? 0.7) * 100)}%`,   desc: "visual similarity to your photo" },
    { label: "Condition",   value: secondHand ? "Pre-owned / Second-hand" : "New", desc: secondHand ? "gently used, verified listing" : "brand new item" },
    item.brand && { label: "Brand",   value: item.brand, desc: "original manufacturer" },
    item.color && { label: "Color",   value: item.color, desc: "dominant color detected" },
    item.url   && { label: "URL",     value: item.url, isLink: true, desc: "direct link to the listing" },
  ].filter(Boolean);

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← Back to results</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <NavActions {...nav} />
      </header>

      <main style={S.detailMain}>
        <div style={S.detailCard}>

          <div style={S.detailImgWrap}>
            {item.imageDataUrl ? (
              <img src={item.imageDataUrl} alt={item.title} style={S.detailImg} />
            ) : (
              <div style={{ ...S.detailImg, background: `linear-gradient(135deg, ${item.swatch}cc, ${item.swatch}44)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 64, opacity: 0.4 }}>◎</span>
              </div>
            )}
            <span style={S.detailSimBadge}>{Math.round((item.sim ?? 0.7) * 100)}% match</span>
          </div>

          <div style={S.detailInfo}>
            <h1 style={S.detailTitle}>{item.title}</h1>
            <p style={S.detailDesc}>{item.desc}</p>

            {secondHand && item.co2_saved_kg && (
              <div style={{ ...S.co2Tag, fontSize: 13, padding: "8px 14px", marginBottom: 8 }}>
                🌱 ~{item.co2_saved_kg.toFixed(1)} kg CO₂ saved vs. buying new
                {item.water_saved_l ? ` · ~${item.water_saved_l.toLocaleString()} L water` : ""}
                {item.co2_equivalents?.km_not_driven ? ` · = ${item.co2_equivalents.km_not_driven} km not driven` : ""}
              </div>
            )}

            <div style={S.detailTable}>
              {rows.map(({ label, value, desc, isLink }) => (
                <div key={label} style={S.detailRow}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={S.detailRowLabel}>{label}</span>
                    {desc && <span style={S.detailRowDesc}>{desc}</span>}
                  </div>
                  {isLink ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" style={S.detailRowLink}>{value}</a>
                  ) : (
                    <span style={S.detailRowValue}>{value}</span>
                  )}
                </div>
              ))}
            </div>

            <div style={S.detailCtaRow}>
              <button
                style={{ ...S.addCartBtn, ...(inCart ? S.addCartBtnDone : {}) }}
                onClick={() => onAddToCart(item)}
                disabled={inCart}
              >
                {inCart ? "✓ In cart" : "Add to cart"}
              </button>
              <button style={S.detailCta} onClick={() => onBuyNow(item)}>Buy now</button>
            </div>
          </div>
        </div>
      </main>

      <footer style={S.footer}>
        WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
      </footer>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 4 — Checkout / Payment
// ──────────────────────────────────────────────────────────────
function CheckoutPage({ items, onBack, onPaid, onRemove }) {
  const [form, setForm] = useState({
    email: "", name: "", card: "", exp: "", cvc: "", address: "", zip: "", city: "",
  });
  const [status, setStatus] = useState("idle"); // idle | processing | done
  const [errors, setErrors] = useState({});

  const subtotal = items.reduce((s, it) => s + (it.price || 0), 0);
  const shipping = items.length ? 4.9 : 0;
  const total = subtotal + shipping;
  const currency = items[0]?.currency || "CHF";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // light formatting helpers
  const onCard = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    setForm((f) => ({ ...f, card: digits.replace(/(.{4})/g, "$1 ").trim() }));
  };
  const onExp = (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 4);
    setForm((f) => ({ ...f, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }));
  };
  const onCvc = (e) =>
    setForm((f) => ({ ...f, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }));

  const validate = () => {
    const er = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Enter a valid email";
    if (form.name.trim().length < 2) er.name = "Enter the cardholder name";
    if (form.card.replace(/\s/g, "").length < 13) er.card = "Enter a valid card number";
    if (!/^\d{2}\/\d{2}$/.test(form.exp)) er.exp = "MM/YY";
    if (form.cvc.length < 3) er.cvc = "CVC";
    if (form.address.trim().length < 3) er.address = "Enter your address";
    if (form.zip.trim().length < 3) er.zip = "ZIP";
    if (form.city.trim().length < 2) er.city = "City";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const pay = (e) => {
    e.preventDefault();
    if (status === "processing") return;
    if (!validate()) return;
    setStatus("processing");
    // Simulated payment — no real charge. Swap for a Stripe/PSP call later.
    setTimeout(() => { setStatus("done"); onPaid(); }, 1800);
  };

  if (status === "done") {
    return (
      <>
        <header style={S.resultsHeader}>
          <div style={S.logo}>
            <span style={S.logoMark}>◎</span>
            <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
          </div>
          <span />
        </header>
        <main style={{ ...S.detailMain, maxWidth: 520, textAlign: "center" }}>
          <div style={S.successCard}>
            <div style={S.successMark}>✓</div>
            <h1 style={S.detailTitle}>Order confirmed</h1>
            <p style={S.detailDesc}>
              Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}! A receipt is on its
              way to {form.email || "your email"}. You just chose pre-owned over new. 🌱
            </p>
            <div style={S.successTotal}>{currency} {total.toFixed(2)} paid</div>
            <button style={S.detailCta} onClick={onBack}>← Back to results</button>
          </div>
        </main>
        <footer style={S.footer}>
          WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
        </footer>
      </>
    );
  }

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT_MUT }}>🔒 Secure checkout</span>
      </header>

      <main style={S.checkoutMain}>
        {/* Order summary */}
        <section style={S.checkoutSummary}>
          <h2 style={S.checkoutH2}>Your order</h2>
          {items.map((it) => (
            <div key={it.id} style={S.summaryRow}>
              {it.imageDataUrl
                ? <img src={it.imageDataUrl} alt={it.title} style={S.summaryThumb} />
                : <div style={{ ...S.summaryThumb, background: `linear-gradient(135deg, ${it.swatch}cc, ${it.swatch}44)` }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.summaryTitle}>{it.title}</div>
                <div style={S.summarySub}>{it.source} · {isSecondHand(it) ? "Pre-owned" : "New"}</div>
              </div>
              <div style={S.summaryPrice}>{it.currency} {(it.price || 0).toFixed(2)}</div>
              {onRemove && items.length > 1 && (
                <button style={S.summaryRemove} onClick={() => onRemove(it.id)} title="Remove">✕</button>
              )}
            </div>
          ))}
          <div style={S.summaryDivider} />
          <div style={S.summaryLine}><span>Subtotal</span><span>{currency} {subtotal.toFixed(2)}</span></div>
          <div style={S.summaryLine}><span>Shipping</span><span>{currency} {shipping.toFixed(2)}</span></div>
          <div style={{ ...S.summaryLine, ...S.summaryTotalLine }}>
            <span>Total</span><span>{currency} {total.toFixed(2)}</span>
          </div>
        </section>

        {/* Payment form */}
        <form style={S.checkoutForm} onSubmit={pay}>
          <h2 style={S.checkoutH2}>Payment details</h2>

          <Field label="Email" error={errors.email}>
            <input style={S.input} type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Cardholder name" error={errors.name}>
            <input style={S.input} placeholder="Jane Doe" value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Card number" error={errors.card}>
            <input style={S.input} placeholder="1234 5678 9012 3456" inputMode="numeric" value={form.card} onChange={onCard} />
          </Field>
          <div style={S.inputRow}>
            <Field label="Expiry" error={errors.exp} style={{ flex: 1 }}>
              <input style={S.input} placeholder="MM/YY" inputMode="numeric" value={form.exp} onChange={onExp} />
            </Field>
            <Field label="CVC" error={errors.cvc} style={{ flex: 1 }}>
              <input style={S.input} placeholder="123" inputMode="numeric" value={form.cvc} onChange={onCvc} />
            </Field>
          </div>
          <Field label="Address" error={errors.address}>
            <input style={S.input} placeholder="Street and number" value={form.address} onChange={set("address")} />
          </Field>
          <div style={S.inputRow}>
            <Field label="ZIP" error={errors.zip} style={{ flex: 1 }}>
              <input style={S.input} placeholder="8000" value={form.zip} onChange={set("zip")} />
            </Field>
            <Field label="City" error={errors.city} style={{ flex: 2 }}>
              <input style={S.input} placeholder="Zürich" value={form.city} onChange={set("city")} />
            </Field>
          </div>

          <button type="submit" style={{ ...S.payBtn, ...(status === "processing" ? S.payBtnBusy : {}) }} disabled={status === "processing"}>
            {status === "processing"
              ? <><span style={S.spinner} /> Processing…</>
              : `Pay ${currency} ${total.toFixed(2)}`}
          </button>
          <p style={S.payNote}>🔒 This is a demo checkout — no real payment is processed.</p>
        </form>
      </main>

      <footer style={S.footer}>
        WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
      </footer>
    </>
  );
}

function Field({ label, error, children, style }) {
  return (
    <label style={{ ...S.field, ...style }}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
      {error && <span style={S.fieldError}>{error}</span>}
    </label>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 5 — Search history (session-only)
// ──────────────────────────────────────────────────────────────
function HistoryPage({ history, onBack, onOpen, ...nav }) {
  const fmtTime = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← New search</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <NavActions {...nav} />
      </header>

      <main style={S.detailMain}>
        <h1 style={{ ...S.detailTitle, marginBottom: 20 }}>Search history</h1>

        {history.length === 0 ? (
          <p style={S.detailDesc}>
            No searches yet this session. Upload a photo and your past searches
            will appear here so you can revisit them.
          </p>
        ) : (
          <div style={S.historyList}>
            {history.map((h) => (
              <button key={h.id} style={S.historyRow} onClick={() => onOpen(h)}>
                <img src={h.imgUrl} alt="search" style={S.historyThumb} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={S.historyTitle}>{h.count} matches found</div>
                  <div style={S.historySub}>searched at {fmtTime(h.at)}</div>
                </div>
                <span style={S.historyOpen}>View →</span>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer style={S.footer}>
        WearWise · Fighting fast fashion one swap at a time · SDG 12 · SDG 13 · SDG 8 &amp; 10
      </footer>
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap');
@keyframes scan   { 0%{top:0%} 100%{top:100%} }
@keyframes spin   { to { transform: rotate(360deg) } }
@keyframes rise   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
* { box-sizing: border-box; }
input, textarea { font-family: inherit; }
input::placeholder, textarea::placeholder { color: #3a6a52; }
`;

const FONT  = "'DM Sans', sans-serif";
const SERIF = "'Lora', serif";
const MONO  = "'DM Mono', monospace";

const BG_DEEP   = "#0f2a20";
const BG_MID    = "#163425";
const BG_CARD   = "#1a3d2b";
const BORDER    = "#2a5a3e";
const TEXT_PRI  = "#f0f4f1";
const TEXT_SEC  = "#a8d4bc";
const TEXT_MUT  = "#6aab8e";
const ACCENT    = "#4ecba0";
const ACCENT_DK = "#0f2a20";

const S = {
  root: {
    minHeight: "100vh",
    background: `radial-gradient(130% 100% at 50% 0%, ${BG_MID} 0%, ${BG_DEEP} 65%)`,
    color: TEXT_PRI,
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
  },
  header:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 32px", borderBottom: `1px solid ${BORDER}`, background: `${BG_MID}cc`, backdropFilter: "blur(8px)" },
  logo:     { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { fontSize: 24, color: ACCENT },
  logoText: { fontSize: 22, fontWeight: 700, letterSpacing: 0.5, fontFamily: SERIF, color: TEXT_PRI },
  tagline:  { fontFamily: MONO, fontSize: 12, color: TEXT_MUT, letterSpacing: 1 },
  footer:   { textAlign: "center", padding: 20, fontFamily: MONO, fontSize: 11, color: TEXT_MUT, borderTop: `1px solid ${BORDER}` },
  backBtn:  { background: "transparent", color: TEXT_SEC, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: FONT },

  uploadMain: { flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "60px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 },
  uploadHero: { textAlign: "center" },
  heroTitle:  { fontSize: 52, fontWeight: 700, lineHeight: 1.1, margin: 0, letterSpacing: -0.5, fontFamily: SERIF, color: TEXT_PRI },
  heroAccent: { color: ACCENT, fontStyle: "italic" },
  heroSub:    { fontSize: 16, color: TEXT_SEC, maxWidth: 520, margin: "20px auto 0", lineHeight: 1.7 },

  dropzone:       { width: "100%", border: `2px dashed ${BORDER}`, borderRadius: 20, padding: "80px 24px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: BG_CARD },
  dropzoneActive: { borderColor: ACCENT, background: "#1e4535", transform: "scale(1.01)" },
  dropIcon:  { fontSize: 52, color: ACCENT, marginBottom: 16 },
  dropTitle: { fontSize: 20, fontWeight: 600, color: TEXT_PRI },
  dropSub:   { fontFamily: MONO, fontSize: 12, color: TEXT_MUT, marginTop: 10 },

  loadingZone: { width: "100%", position: "relative", borderRadius: 20, overflow: "hidden", background: BG_CARD, border: `1px solid ${BORDER}`, animation: "fadeIn .3s" },
  loadingImg:  { width: "100%", display: "block", maxHeight: 420, objectFit: "cover" },
  scanOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 64, background: "rgba(10,28,18,.5)", overflow: "hidden" },
  scanLine:    { position: "absolute", left: 0, right: 0, height: 2, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}`, animation: "scan 1.8s ease-in-out infinite" },
  loadingText: { padding: 20, fontFamily: MONO, fontSize: 13, color: ACCENT, display: "flex", alignItems: "center", gap: 12, background: BG_DEEP },
  spinner:     { width: 14, height: 14, border: `2px solid ${BORDER}`, borderTopColor: ACCENT, borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" },

  howRow:  { display: "flex", alignItems: "center", gap: 16, fontFamily: MONO, fontSize: 12, color: TEXT_MUT, flexWrap: "wrap", justifyContent: "center" },
  howStep: { display: "flex", alignItems: "center", gap: 8 },
  howNum:  { width: 22, height: 22, borderRadius: "50%", background: BG_CARD, color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, border: `1px solid ${BORDER}` },
  howArrow:{ color: "#3a8a62" },

  statsStrip: { width: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  statCell:   { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 14px", textAlign: "center" },
  statValue:  { fontSize: 22, fontWeight: 700, color: ACCENT, fontFamily: SERIF, lineHeight: 1.1 },
  statUnit:   { fontSize: 13, fontWeight: 400, color: TEXT_MUT },
  statLabel:  { fontSize: 11, color: TEXT_SEC, marginTop: 6, lineHeight: 1.4, fontFamily: MONO },

  impactPanel:      { background: `linear-gradient(90deg, #0d2e1e 0%, #163d28 50%, #0d2e1e 100%)`, borderBottom: `1px solid ${ACCENT}44`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", animation: "fadeIn .4s ease" },
  impactLeft:       { display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 6 },
  impactLeaf:       { fontSize: 22 },
  impactHeadline:   { fontFamily: MONO, fontSize: 12, color: TEXT_SEC, letterSpacing: 0.5 },
  impactChip:       { display: "flex", alignItems: "center", gap: 8, background: "#122a1e", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "6px 12px" },
  impactChipTitle:  { fontFamily: FONT, fontSize: 12, color: TEXT_SEC },
  impactChipCo2:    { fontFamily: MONO, fontSize: 13, fontWeight: 700, color: ACCENT },
  impactChipWater:  { fontFamily: MONO, fontSize: 11, color: TEXT_MUT },

  resultsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: `${BG_MID}f0`, backdropFilter: "blur(12px)", zIndex: 10 },
  queryThumb:    { width: 44, height: 44, objectFit: "cover", borderRadius: 10, border: `2px solid ${ACCENT}` },
  resultsBar:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 16px", maxWidth: 760, margin: "0 auto", width: "100%", flexWrap: "wrap", gap: 12 },
  resultsCount:  { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  countNum:      { fontSize: 36, fontWeight: 700, color: ACCENT, fontFamily: SERIF },
  countLabel:    { fontFamily: MONO, fontSize: 12, color: TEXT_MUT, letterSpacing: 1 },
  sortPills:     { display: "flex", gap: 8, flexWrap: "wrap" },
  pill:          { background: "transparent", color: TEXT_SEC, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "8px 16px", fontFamily: MONO, fontSize: 12, cursor: "pointer", transition: "all .15s" },
  pillActive:    { background: ACCENT, color: ACCENT_DK, border: `1px solid ${ACCENT}`, fontWeight: 700 },

  feed:       { flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: "12px 32px 60px", display: "flex", flexDirection: "column", gap: 18 },
  feedItem:   { display: "grid", gridTemplateColumns: "200px 1fr", background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", animation: "rise .5s ease both" },
  feedImg:    { position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 12, minHeight: 200 },
  simBadge:   { background: `${BG_DEEP}dd`, color: ACCENT, fontFamily: MONO, fontSize: 11, padding: "4px 9px", borderRadius: 8 },
  feedBody:   { padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  feedTop:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sourceBadge:{ fontSize: 10, fontFamily: MONO, padding: "4px 9px", borderRadius: 6, fontWeight: 500 },
  feedPrice:  { fontSize: 24, fontWeight: 700, color: ACCENT, fontFamily: SERIF },
  feedTitle:  { fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.3, color: TEXT_PRI },
  feedDesc:   { fontSize: 13, color: TEXT_SEC, margin: 0, lineHeight: 1.55, flex: 1 },
  co2Tag:     { fontSize: 12, color: ACCENT, background: "#122a1e", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 10px", fontFamily: MONO, alignSelf: "flex-start" },
  detailBtn:  { alignSelf: "flex-start", background: ACCENT, color: ACCENT_DK, border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: FONT, fontWeight: 700, marginTop: 4 },

  detailMain:     { flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "40px 32px 60px" },
  detailCard:     { display: "grid", gridTemplateColumns: "360px 1fr", gap: 40, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 24, overflow: "hidden", animation: "rise .4s ease both" },
  detailImgWrap:  { position: "relative" },
  detailImg:      { width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 420 },
  detailSimBadge: { position: "absolute", top: 16, left: 16, background: `${BG_DEEP}dd`, color: ACCENT, fontFamily: MONO, fontSize: 12, padding: "5px 11px", borderRadius: 9 },
  detailInfo:     { padding: "36px 36px 36px 0", display: "flex", flexDirection: "column", gap: 16 },
  detailTitle:    { fontSize: 26, fontWeight: 700, fontFamily: SERIF, color: TEXT_PRI, margin: 0, lineHeight: 1.25 },
  detailDesc:     { fontSize: 14, color: TEXT_SEC, lineHeight: 1.65, margin: 0 },
  detailTable:    { display: "flex", flexDirection: "column", gap: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` },
  detailRow:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, gap: 16 },
  detailRowLabel: { fontFamily: MONO, fontSize: 11, color: TEXT_MUT, letterSpacing: 0.5, flexShrink: 0 },
  detailRowDesc:  { fontFamily: MONO, fontSize: 10, color: "#3a6a52", letterSpacing: 0.3 },
  detailRowValue: { fontSize: 14, color: TEXT_PRI, textAlign: "right" },
  detailRowLink:  { fontSize: 12, color: ACCENT, textAlign: "right", wordBreak: "break-all", textDecoration: "none" },
  detailCtaRow:   { marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" },
  detailCta:      { background: ACCENT, color: ACCENT_DK, border: "none", borderRadius: 12, padding: "13px 32px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer" },
  addCartBtn:     { background: "transparent", color: TEXT_PRI, border: `1px solid ${ACCENT}`, borderRadius: 12, padding: "13px 28px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer" },
  addCartBtnDone: { color: ACCENT, borderColor: BORDER, cursor: "default", background: "#122a1e" },

  // cart button
  cartBtn:   { position: "relative", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 16, cursor: "pointer", lineHeight: 1 },
  cartBadge: { position: "absolute", top: -8, right: -8, background: ACCENT, color: ACCENT_DK, fontFamily: MONO, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" },

  // history
  historyList:  { display: "flex", flexDirection: "column", gap: 12 },
  historyRow:   { display: "flex", alignItems: "center", gap: 16, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, cursor: "pointer", animation: "rise .4s ease both", width: "100%" },
  historyThumb: { width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: `1px solid ${BORDER}` },
  historyTitle: { fontSize: 16, fontWeight: 600, color: TEXT_PRI, fontFamily: SERIF },
  historySub:   { fontFamily: MONO, fontSize: 12, color: TEXT_MUT, marginTop: 4 },
  historyOpen:  { fontFamily: MONO, fontSize: 13, color: ACCENT, flexShrink: 0 },

  // checkout
  checkoutMain:    { flex: 1, maxWidth: 980, width: "100%", margin: "0 auto", padding: "40px 32px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" },
  checkoutH2:      { fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: TEXT_PRI, margin: "0 0 18px" },
  checkoutSummary: { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, animation: "rise .4s ease both" },
  summaryRow:      { display: "flex", alignItems: "center", gap: 14, padding: "10px 0" },
  summaryThumb:    { width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: `1px solid ${BORDER}` },
  summaryTitle:    { fontSize: 14, fontWeight: 600, color: TEXT_PRI, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  summarySub:      { fontFamily: MONO, fontSize: 11, color: TEXT_MUT, marginTop: 3 },
  summaryPrice:    { fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: ACCENT, flexShrink: 0 },
  summaryRemove:   { background: "transparent", border: "none", color: TEXT_MUT, cursor: "pointer", fontSize: 14, flexShrink: 0 },
  summaryDivider:  { height: 1, background: BORDER, margin: "14px 0" },
  summaryLine:     { display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 13, color: TEXT_SEC, padding: "5px 0" },
  summaryTotalLine:{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: TEXT_PRI, borderTop: `1px solid ${BORDER}`, marginTop: 8, paddingTop: 14 },

  checkoutForm: { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 14, animation: "rise .4s ease both" },
  field:        { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel:   { fontFamily: MONO, fontSize: 11, color: TEXT_MUT, letterSpacing: 0.5 },
  fieldError:   { fontFamily: MONO, fontSize: 11, color: "#e88" },
  input:        { background: BG_DEEP, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 13px", fontSize: 14, color: TEXT_PRI, outline: "none", width: "100%" },
  inputRow:     { display: "flex", gap: 12 },
  payBtn:       { marginTop: 6, background: ACCENT, color: ACCENT_DK, border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  payBtnBusy:   { opacity: 0.7, cursor: "default" },
  payNote:      { fontFamily: MONO, fontSize: 11, color: TEXT_MUT, textAlign: "center", margin: 0 },

  successCard:  { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "48px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "rise .4s ease both" },
  successMark:  { width: 64, height: 64, borderRadius: "50%", background: ACCENT, color: ACCENT_DK, fontSize: 34, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  successTotal: { fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: ACCENT },
};
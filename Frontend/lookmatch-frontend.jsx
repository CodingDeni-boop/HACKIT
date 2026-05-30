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

  const goToResults = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImgUrl(URL.createObjectURL(file));
    setLoading(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${SERVER}/analyze`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(data);
      setPage("results");
    } catch (err) {
      alert(`Model error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const backToUpload = () => { setPage("upload"); setImgUrl(null); setResults([]); };

  return (
    <div style={S.root}>
      <style>{KEYFRAMES}</style>
      {page === "upload"  && <UploadPage onFile={goToResults} loading={loading} imgUrl={imgUrl} />}
      {page === "results" && <ResultsPage results={results} imgUrl={imgUrl} onBack={backToUpload} />}
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

function UploadPage({ onFile, loading, imgUrl }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  return (
    <>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        <span style={S.tagline}>pre-owned · premium · planet-first</span>
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

function co2Saved(item) {
  if (!isSecondHand(item)) return null;
  return (16.4).toFixed(1);
}

function ResultsPage({ results, imgUrl, onBack }) {
  const [sortBy, setSortBy] = useState("price-asc");

  let shown = sortBy === "secondhand"
    ? results.filter(isSecondHand)
    : [...results].sort((a, b) => {
        if (sortBy === "price-asc")  return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "sim")        return b.sim - a.sim;
        return 0;
      });

  const secondHandCount = shown.filter(isSecondHand).length;

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← New search</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>Wear<span style={{ fontWeight: 300, fontStyle: "italic" }}>Wise</span></span>
        </div>
        {imgUrl && <img src={imgUrl} alt="query" style={S.queryThumb} />}
      </header>

      <div style={S.resultsBar}>
        <div style={S.resultsCount}>
          <span style={S.countNum}>{shown.length}</span>
          <span style={S.countLabel}>matches</span>
          {secondHandCount > 0 && (
            <span style={S.co2Banner}>
              ↓ {(secondHandCount * 16.4).toFixed(0)} kg CO₂ if you buy pre-owned
            </span>
          )}
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
          const saved = co2Saved(r);
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
                {saved && (
                  <div style={S.co2Tag}>
                    🌱 ~{saved} kg CO₂ saved vs. buying new
                  </div>
                )}
                <button style={S.feedBtn}>View listing →</button>
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

  resultsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: `${BG_MID}f0`, backdropFilter: "blur(12px)", zIndex: 10 },
  queryThumb:    { width: 44, height: 44, objectFit: "cover", borderRadius: 10, border: `2px solid ${ACCENT}` },
  resultsBar:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 16px", maxWidth: 760, margin: "0 auto", width: "100%", flexWrap: "wrap", gap: 12 },
  resultsCount:  { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  countNum:      { fontSize: 36, fontWeight: 700, color: ACCENT, fontFamily: SERIF },
  countLabel:    { fontFamily: MONO, fontSize: 12, color: TEXT_MUT, letterSpacing: 1 },
  co2Banner:     { fontFamily: MONO, fontSize: 12, color: "#4ecba0", background: "#1a3d2b", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", marginLeft: 8 },
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
  feedBtn:    { alignSelf: "flex-start", background: "transparent", color: TEXT_SEC, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: FONT },
};
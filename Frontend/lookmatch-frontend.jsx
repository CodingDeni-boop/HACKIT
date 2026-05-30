import React, { useState, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// LookMatch — two-page flow
//   Page 1: upload (drop image → sent to your model)
//   Page 2: vertical scrolling results, sortable by price
// All model/search calls are mocked. Tell me what to change.
// ─────────────────────────────────────────────────────────────

const SECOND_HAND_SOURCES = new Set(["Vinted", "eBay", "Depop", "Vestiaire"]);
const SECOND_HAND_KEYWORDS = /pre-owned|vintage|used|second.hand/i;

function isSecondHand(item) {
  if (item.secondHand !== undefined) return item.secondHand;
  return SECOND_HAND_SOURCES.has(item.source) || SECOND_HAND_KEYWORDS.test(item.desc || "");
}

const SERVER = "http://localhost:3001";

const SOURCE_COLORS = {
  eBay: "#e53238",
  Zalando: "#ff6900",
  "Google Shopping": "#4285f4",
  Vinted: "#09b1ba",
  Farfetch: "#000000",
  ASOS: "#d4ff4f",
};

export default function App() {
  const [page, setPage] = useState("upload"); // 'upload' | 'results'
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

  const backToUpload = () => {
    setPage("upload");
    setImgUrl(null);
    setResults([]);
  };

  return (
    <div style={S.root}>
      <style>{KEYFRAMES}</style>
      {page === "upload" ? (
        <UploadPage onFile={goToResults} loading={loading} imgUrl={imgUrl} />
      ) : (
        <ResultsPage results={results} imgUrl={imgUrl} onBack={backToUpload} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 1 — Upload
// ──────────────────────────────────────────────────────────────
function UploadPage({ onFile, loading, imgUrl }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  return (
    <>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>
            LOOK<span style={{ fontWeight: 300 }}>MATCH</span>
          </span>
        </div>
        <span style={S.tagline}>snap it · find it · compare it</span>
      </header>

      <main style={S.uploadMain}>
        <div style={S.uploadHero}>
          <h1 style={S.heroTitle}>
            Find that piece.<br />
            <span style={S.heroAccent}>Anywhere it's sold.</span>
          </h1>
          <p style={S.heroSub}>
            Drop a photo of any clothing item. Our model scans marketplaces
            and brings back similar pieces, sorted however you like.
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div style={S.loadingZone}>
            {imgUrl && <img src={imgUrl} alt="upload" style={S.loadingImg} />}
            <div style={S.scanOverlay}>
              <div style={S.scanLine} />
            </div>
            <div style={S.loadingText}>
              <span style={S.spinner} />
              Running model · finding matches…
            </div>
          </div>
        )}

        <div style={S.howRow}>
          <div style={S.howStep}><span style={S.howNum}>1</span><span>Upload photo</span></div>
          <div style={S.howArrow}>→</div>
          <div style={S.howStep}><span style={S.howNum}>2</span><span>Model analyzes</span></div>
          <div style={S.howArrow}>→</div>
          <div style={S.howStep}><span style={S.howNum}>3</span><span>Compare prices</span></div>
        </div>
      </main>

      <footer style={S.footer}>Prototype · wired to localhost:3001 · images → Tobackend/ · results ← Tofrontend/</footer>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// PAGE 2 — Results (scrolling feed)
// ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "price-asc",  label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "sim",        label: "Best Match" },
  { key: "secondhand", label: "Second Hand" },
];

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

  return (
    <>
      <header style={S.resultsHeader}>
        <button style={S.backBtn} onClick={onBack}>← New search</button>
        <div style={S.logo}>
          <span style={S.logoMark}>◎</span>
          <span style={S.logoText}>
            LOOK<span style={{ fontWeight: 300 }}>MATCH</span>
          </span>
        </div>
        {imgUrl && <img src={imgUrl} alt="query" style={S.queryThumb} />}
      </header>

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
        {shown.map((r, i) => (
          <article key={r.id} style={{ ...S.feedItem, animationDelay: `${i * 50}ms` }}>
            <div
              style={{
                ...S.feedImg,
                background: `linear-gradient(135deg, ${r.swatch}, ${r.swatch}aa)`,
              }}
            >
              <span style={S.simBadge}>{Math.round(r.sim * 100)}% match</span>
            </div>
            <div style={S.feedBody}>
              <div style={S.feedTop}>
                <span
                  style={{
                    ...S.sourceBadge,
                    background: SOURCE_COLORS[r.source] || "#555",
                    color: r.source === "ASOS" ? "#0a0d12" : "#fff",
                  }}
                >
                  {r.source}
                </span>
                <span style={S.feedPrice}>{r.currency} {r.price.toFixed(2)}</span>
              </div>
              <h3 style={S.feedTitle}>{r.title}</h3>
              <p style={S.feedDesc}>{r.desc}</p>
              <button style={S.feedBtn}>View listing →</button>
            </div>
          </article>
        ))}
      </main>

      <footer style={S.footer}>End of results · prototype data</footer>
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@300;500;700;800&family=Spline+Sans+Mono:wght@400;500&display=swap');
@keyframes scan { 0%{top:0%} 100%{top:100%} }
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
`;

const FONT = "'Bricolage Grotesque', sans-serif";
const MONO = "'Spline Sans Mono', monospace";

const S = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(120% 100% at 50% 0%, #11161f 0%, #0a0d12 60%)",
    color: "#e8eaed",
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
  },

  // shared
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "22px 32px", borderBottom: "1px solid #1c2230" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { fontSize: 26, color: "#d4ff4f" },
  logoText: { fontSize: 22, fontWeight: 800, letterSpacing: 1 },
  tagline: { fontFamily: MONO, fontSize: 12, color: "#5a6478", letterSpacing: 1 },
  footer: { textAlign: "center", padding: 20, fontFamily: MONO, fontSize: 11, color: "#3e4759", borderTop: "1px solid #1c2230" },

  // upload page
  uploadMain: { flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "60px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 },
  uploadHero: { textAlign: "center" },
  heroTitle: { fontSize: 52, fontWeight: 800, lineHeight: 1.05, margin: 0, letterSpacing: -1 },
  heroAccent: { color: "#d4ff4f" },
  heroSub: { fontSize: 16, color: "#8c95a8", maxWidth: 480, margin: "20px auto 0", lineHeight: 1.5 },

  dropzone: { width: "100%", border: "2px dashed #2a3346", borderRadius: 20, padding: "80px 24px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: "#0e1219" },
  dropzoneActive: { borderColor: "#d4ff4f", background: "#141a12", transform: "scale(1.01)" },
  dropIcon: { fontSize: 56, color: "#d4ff4f", marginBottom: 16 },
  dropTitle: { fontSize: 20, fontWeight: 700 },
  dropSub: { fontFamily: MONO, fontSize: 12, color: "#5a6478", marginTop: 10 },

  loadingZone: { width: "100%", position: "relative", borderRadius: 20, overflow: "hidden", background: "#0e1219", border: "1px solid #1c2230", animation: "fadeIn .3s" },
  loadingImg: { width: "100%", display: "block", maxHeight: 420, objectFit: "cover" },
  scanOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 64, background: "rgba(8,11,16,.45)", overflow: "hidden" },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2, background: "#d4ff4f", boxShadow: "0 0 14px #d4ff4f", animation: "scan 1.8s ease-in-out infinite" },
  loadingText: { padding: 20, fontFamily: MONO, fontSize: 13, color: "#d4ff4f", display: "flex", alignItems: "center", gap: 12, background: "#070a0f" },
  spinner: { width: 14, height: 14, border: "2px solid #2a3346", borderTopColor: "#d4ff4f", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" },

  howRow: { display: "flex", alignItems: "center", gap: 16, fontFamily: MONO, fontSize: 12, color: "#5a6478", marginTop: 20, flexWrap: "wrap", justifyContent: "center" },
  howStep: { display: "flex", alignItems: "center", gap: 8 },
  howNum: { width: 22, height: 22, borderRadius: "50%", background: "#1a2030", color: "#d4ff4f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  howArrow: { color: "#2a3346" },

  // results page
  resultsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: "1px solid #1c2230", position: "sticky", top: 0, background: "rgba(10,13,18,.95)", backdropFilter: "blur(10px)", zIndex: 10 },
  backBtn: { background: "transparent", color: "#e8eaed", border: "1px solid #2a3346", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: FONT },
  queryThumb: { width: 44, height: 44, objectFit: "cover", borderRadius: 10, border: "2px solid #d4ff4f" },

  resultsBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 16px", maxWidth: 760, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  resultsCount: { display: "flex", alignItems: "baseline", gap: 10 },
  countNum: { fontSize: 36, fontWeight: 800, color: "#d4ff4f" },
  countLabel: { fontFamily: MONO, fontSize: 12, color: "#5a6478", letterSpacing: 1 },
  sortPills: { display: "flex", gap: 8 },
  pill: { background: "transparent", color: "#8c95a8", border: "1px solid #2a3346", borderRadius: 20, padding: "8px 16px", fontFamily: MONO, fontSize: 12, cursor: "pointer", transition: "all .15s" },
  pillActive: { background: "#d4ff4f", color: "#0a0d12", border: "1px solid #d4ff4f", fontWeight: 700 },

  feed: { flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: "12px 32px 60px", display: "flex", flexDirection: "column", gap: 18, boxSizing: "border-box" },
  feedItem: { display: "grid", gridTemplateColumns: "200px 1fr", background: "#0e1219", border: "1px solid #1c2230", borderRadius: 18, overflow: "hidden", animation: "rise .5s ease both", transition: "border-color .15s" },
  feedImg: { position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 12, minHeight: 200 },
  simBadge: { background: "rgba(10,13,18,.85)", color: "#d4ff4f", fontFamily: MONO, fontSize: 11, padding: "4px 9px", borderRadius: 8 },
  feedBody: { padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  feedTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  sourceBadge: { fontSize: 10, fontFamily: MONO, padding: "4px 9px", borderRadius: 6, fontWeight: 500 },
  feedPrice: { fontSize: 24, fontWeight: 800, color: "#d4ff4f" },
  feedTitle: { fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 },
  feedDesc: { fontSize: 13, color: "#8c95a8", margin: 0, lineHeight: 1.5, flex: 1 },
  feedBtn: { alignSelf: "flex-start", background: "transparent", color: "#e8eaed", border: "1px solid #2a3346", borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: FONT },
};
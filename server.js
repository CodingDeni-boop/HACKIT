const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

const DATA_INPUT = path.join(__dirname, "data", "input");
const TOFRONTEND = path.join(__dirname, "Tofrontend");
const RESULTS_FILE = path.join(TOFRONTEND, "results.json");

// Ensure folders exist
[DATA_INPUT, TOFRONTEND].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());

// Save uploaded image directly into data/input/
const storage = multer.diskStorage({
  destination: DATA_INPUT,
  filename: (_req, _file, cb) => cb(null, "input.jpg"),
});
const upload = multer({ storage });

// Poll Tofrontend/results.json until it appears or times out
function waitForResults(timeoutMs = 60000, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (fs.existsSync(RESULTS_FILE)) {
        try {
          const data = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
          resolve(data);
        } catch {
          reject(new Error("results.json is not valid JSON"));
        }
      } else if (Date.now() >= deadline) {
        reject(new Error("Timed out waiting for results.json"));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

// POST /analyze
// 1. Accepts image upload → saves to Tobackend/input.jpg
// 2. Deletes stale results.json if present
// 3. Waits for your model to write Tofrontend/results.json
// 4. Returns the JSON to the frontend
app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });

  // Clear stale results so we don't return old data
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

  console.log(`[server] Image saved → ${req.file.path}`);
  console.log("[server] Waiting for model to write Tofrontend/results.json…");

  try {
    const results = await waitForResults();
    console.log(`[server] Got ${results.length} results, returning to frontend`);
    res.json(results);
  } catch (err) {
    console.error("[server] Error:", err.message);
    res.status(504).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LookMatch bridge running on http://localhost:${PORT}`);
  console.log(`  Images  → ${TOBACKEND}`);
  console.log(`  Results ← ${TOFRONTEND}`);
});

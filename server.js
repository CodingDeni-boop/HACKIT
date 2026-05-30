const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3001;

// Image goes here for the model to pick up.
const INPUT_DIR = path.join(__dirname, "data", "input");
const TOFRONTEND = path.join(__dirname, "Tofrontend");
const RESULTS_FILE = path.join(TOFRONTEND, "results.json");
const EXAMPLE_FILE = path.join(TOFRONTEND, "results.example.json");

// Ensure folders exist
[INPUT_DIR, TOFRONTEND].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// OpenAI key for the virtual try-on. Read from env or openai_token.txt.
// Kept server-side only — never expose this to the frontend.
let OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_KEY_FILE = path.join(__dirname, "openai_token.txt");
if (!OPENAI_KEY && fs.existsSync(OPENAI_KEY_FILE)) {
  OPENAI_KEY = fs.readFileSync(OPENAI_KEY_FILE, "utf8").trim();
}

app.use(cors());
// JSON body for /tryon (base64 image can be large).
app.use(express.json({ limit: "15mb" }));

// Save uploaded image into data/input/input.jpg
const storage = multer.diskStorage({
  destination: INPUT_DIR,
  filename: (_req, _file, cb) => cb(null, "input.jpg"),
});
const upload = multer({ storage });

// Poll Tofrontend/results.json until it appears or times out
function waitForResults(timeoutMs, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (fs.existsSync(RESULTS_FILE)) {
        try {
          resolve(JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8")));
        } catch {
          reject(new Error("results.json is not valid JSON"));
        }
      } else if (Date.now() >= deadline) {
        reject(new Error("timeout"));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

// POST /analyze
// 1. Save uploaded image → data/input/input.jpg
// 2. Clear stale results
// 3. Wait for the model to write Tofrontend/results.json
// 4. If the model isn't running yet, fall back to example data so the UI works
app.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });

  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

  console.log(`[server] Image saved → ${req.file.path}`);
  console.log("[server] Launching Python model…");

  const py = spawn("python", ["distance_classif.py"], {
    cwd: __dirname,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  py.stdout.on("data", (d) => console.log("[python]", d.toString().trim()));
  py.stderr.on("data", (d) => console.error("[python]", d.toString().trim()));

  console.log("[server] Waiting for model to write Tofrontend/results.json…");

  try {
    const results = await waitForResults(300000);
    console.log(`[server] Got ${results.length} results from model`);
    return res.json(results);
  } catch (err) {
    // Model didn't produce results in time — serve example data so the
    // frontend still shows a results page. Remove this once the real
    // Python model reliably writes Tofrontend/results.json.
    if (fs.existsSync(EXAMPLE_FILE)) {
      console.warn(`[server] No model results (${err.message}); serving example data`);
      return res.json(JSON.parse(fs.readFileSync(EXAMPLE_FILE, "utf8")));
    }
    console.error("[server] Error:", err.message);
    return res.status(504).json({ error: err.message });
  }
});

// POST /tryon
// Body: { image: "data:image/...;base64,...", title?: string }
// Sends the garment photo to OpenAI's image model, which generates a neutral
// model wearing a similar piece. Returns { image: "data:image/png;base64,..." }.
app.post("/tryon", async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(503).json({
      error: "No OpenAI key. Add it to openai_token.txt or set OPENAI_API_KEY.",
    });
  }
  const { image, title } = req.body || {};
  if (!image || !/^data:image\//.test(image)) {
    return res.status(400).json({ error: "Provide an image as a data URL." });
  }

  try {
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey: OPENAI_KEY });

    // data URL -> Buffer -> uploadable file
    const base64 = image.split(",")[1];
    const buf = Buffer.from(base64, "base64");
    const garment = await OpenAI.toFile(buf, "garment.png", { type: "image/png" });

    const prompt =
      `Generate a realistic full-body photo of a neutral fashion model wearing ` +
      `the clothing item shown in this image${title ? ` ("${title}")` : ""}. ` +
      `Studio lighting, plain light-grey background, natural pose, photorealistic, ` +
      `keep the garment's colour, pattern and style faithful to the source image.`;

    console.log("[tryon] generating try-on image…");
    const result = await client.images.edit({
      model: "gpt-image-1",
      image: garment,
      prompt,
      size: "1024x1536",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned by OpenAI");
    console.log("[tryon] done");
    return res.json({ image: `data:image/png;base64,${b64}` });
  } catch (err) {
    const msg = err?.error?.message || err.message || "try-on failed";
    console.error("[tryon] error:", msg);
    return res.status(502).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`LookMatch bridge running on http://localhost:${PORT}`);
  console.log(`  Images  → ${INPUT_DIR}`);
  console.log(`  Results ← ${TOFRONTEND}`);
  console.log(`  Try-on  → ${OPENAI_KEY ? "OpenAI key loaded" : "NO OpenAI key (set openai_token.txt)"}`);
});

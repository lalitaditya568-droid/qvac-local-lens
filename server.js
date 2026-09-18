import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadModel,
  completion,
  unloadModel,
  QWEN3_600M_INST_Q4,
} from "@qvac/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

let modelId = null;
let modelLoading = null;

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });

  res.end(body);
}

function sendFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
    });

    res.end(content);
  } catch {
    sendJson(res, 404, {
      error: "File not found.",
    });
  }
}

async function ensureModelLoaded() {
  if (modelId) {
    return modelId;
  }

  if (modelLoading) {
    return modelLoading;
  }

  console.log("Loading QVAC model...");

  modelLoading = loadModel({
    modelSrc: QWEN3_600M_INST_Q4,
    modelConfig: {
      ctx_size: 4096,
    },
    onProgress: (progress) => {
      const percentage = progress.percentage.toFixed(0);

      process.stdout.write(
        `\rDownloading model: ${percentage}%`
      );

      if (progress.percentage >= 100) {
        process.stdout.write("\n");
      }
    },
  });

  try {
    modelId = await modelLoading;

    console.log(`QVAC model loaded: ${modelId}`);

    return modelId;
  } finally {
    modelLoading = null;
  }
}

async function analyzeText(text) {
  const loadedModelId = await ensureModelLoaded();

  const prompt = `
Analyze the following text and return ONLY valid JSON.

The JSON must have exactly these four fields:

{
  "summary": "A concise 1-3 sentence summary.",
  "keyPoints": ["3-5 important points"],
  "actionItems": ["specific actions mentioned or implied by the text"],
  "sentiment": "Positive, Neutral, or Negative"
}

Rules:
- Do not use Markdown.
- Do not put the JSON inside a code block.
- keyPoints must always be an array.
- actionItems must always be an array.
- sentiment must be exactly Positive, Neutral, or Negative.
- Judge the OVERALL tone of the entire text, not isolated negative or positive statements.
- If the text is mainly factual, mixed, or balanced, use Neutral.
- If there are no clear action items, return an empty array.
- Base the analysis only on the supplied text.

TEXT TO ANALYZE:
${text}
`;

  const result = completion({
    modelId: loadedModelId,

    history: [
      {
        role: "system",
        content:
          "You are LocalLens, a private on-device text intelligence assistant. Analyze text accurately and return the requested JSON structure.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    stream: true,
  });

  const final = await result.final;

  return final.contentText || "{}";
}

function parseModelResponse(raw) {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);

  return {
    summary: String(parsed.summary || ""),
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map(String)
      : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.map(String)
      : [],
    sentiment: ["Positive", "Neutral", "Negative"].includes(
      parsed.sentiment
    )
      ? parsed.sentiment
      : "Neutral",
  };
}

async function handleAnalyze(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const data = JSON.parse(body);

      const text = String(data.text || "").trim();

      if (!text) {
        sendJson(res, 400, {
          error: "Please enter some text to analyze.",
        });

        return;
      }

      if (text.length > 12000) {
        sendJson(res, 400, {
          error: "Text is too long. Keep it under 12,000 characters.",
        });

        return;
      }

      console.log(`Analyzing ${text.length} characters...`);

      const rawAnswer = await analyzeText(text);
      const analysis = parseModelResponse(rawAnswer);

      console.log("Analysis generated.");

      sendJson(res, 200, {
        ...analysis,
        local: true,
        model: "Qwen3 600M",
      });
    } catch (error) {
      console.error(error);

      sendJson(res, 500, {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    sendFile(
      res,
      path.join(__dirname, "public", "index.html"),
      "text/html; charset=utf-8"
    );

    return;
  }

  if (req.method === "POST" && req.url === "/api/analyze") {
    handleAnalyze(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      status: "ok",
      qvac: true,
      local: true,
      modelLoaded: Boolean(modelId),
    });

    return;
  }

  sendJson(res, 404, {
    error: "Not found",
  });
});

async function shutdown() {
  console.log("\nShutting down...");

  if (modelId) {
    try {
      await unloadModel({
        modelId,
        clearStorage: false,
      });
    } catch (error) {
      console.error("Could not unload model:", error);
    }
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("            LOCALLENS");
  console.log("======================================");
  console.log("");
  console.log(`Open http://localhost:${PORT}`);
  console.log("");
  console.log("AI inference runs locally with QVAC.");
  console.log("");
});

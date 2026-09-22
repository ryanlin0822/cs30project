import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const MODEL = "claude-opus-5";
const MAX_DOC_CHARS = 20000;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

// Nothing here is written to disk or a database. Each request is handled and forgotten;
// the browser is the only place the document or chat history lives.

const SIMPLIFY_SYSTEM = `You turn a patient's after-visit summary or discharge instructions into plain language a patient or caregiver can act on.

CRITICAL SAFETY RULES - follow exactly:
1. Never change, drop, or add any dose, medication name, frequency, or instruction. Copy every number (doses, days, quantities, follow-up intervals) EXACTLY as written in the original document. Do not round, convert units, or "helpfully" correct anything, even if it looks like a typo.
2. Do not add medical advice, diagnoses, or instructions that are not in the original document. You are rewriting, not practicing medicine.
3. If the document does not mention something (e.g. no follow-up appointment is listed), say so - do not invent one.
4. Write at approximately a 6th-grade reading level: short sentences, common words, no jargon without a plain-language explanation in parentheses.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "whatHappened": "1-2 short sentences in plain language describing what happened during the visit/hospital stay",
  "whatToDo": [
    { "text": "plain-language instruction, numbers copied exactly from the original", "time": "when/how often, e.g. 'Morning and night for 10 days', or empty string if not time-based" }
  ],
  "warningSigns": {
    "callDoctor": ["plain-language sign that means call the doctor's office"],
    "goToER": ["plain-language sign that means go to the ER or call 911"]
  },
  "followUp": ["plain-language follow-up appointment or test, with date/timeframe exactly as written, or [] if none mentioned"],
  "careTeamPhone": "phone number exactly as written in the document, or null if none is present"
}

If the pasted text does not look like medical after-visit or discharge instructions, still do your best to extract any of these fields that apply, and leave arrays empty where nothing applies. Never fabricate content to fill a field.`;

const CHAT_SYSTEM = `You answer a patient's or caregiver's questions using ONLY the after-visit/discharge document provided below. This is the complete source of truth.

Rules:
- Answer only using facts stated in the document. Do not use outside medical knowledge to answer, guess, or fill gaps.
- Never change, invent, or "correct" a dose, medication, or instruction from the document.
- If the answer is not in the document, respond with exactly: "Your document doesn't say." followed by, if a phone number appears anywhere in the document, " Call your care team at <the exact phone number from the document>." If no phone number appears in the document, do not add a phone number - just stop after "Your document doesn't say."
- Keep answers short and in plain language (6th-grade reading level).
- Never give new medical advice beyond what the document states.`;

function stripJsonFences(text) {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

function extractText(message) {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

app.post("/api/simplify", async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ error: "Server is not configured with an ANTHROPIC_API_KEY. See README for setup." });
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Paste some text from your after-visit summary first." });
  }
  if (text.length > MAX_DOC_CHARS) {
    return res.status(400).json({ error: `That document is too long (max ${MAX_DOC_CHARS} characters). Try pasting just the relevant section.` });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SIMPLIFY_SYSTEM,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: text }],
    });

    const raw = stripJsonFences(extractText(response));
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: "Could not simplify that document. Please try again." });
    }

    res.json({ simplified: parsed, original: text });
  } catch (err) {
    console.error("simplify error:", err);
    res.status(502).json({ error: "Something went wrong contacting Claude. Please try again." });
  }
});

app.post("/api/chat", async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ error: "Server is not configured with an ANTHROPIC_API_KEY. See README for setup." });
  }

  const document = typeof req.body?.document === "string" ? req.body.document.trim() : "";
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!document) {
    return res.status(400).json({ error: "No document to answer from. Simplify a document first." });
  }
  if (!question) {
    return res.status(400).json({ error: "Type a question first." });
  }
  if (document.length > MAX_DOC_CHARS) {
    return res.status(400).json({ error: `That document is too long (max ${MAX_DOC_CHARS} characters).` });
  }

  const safeHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: CHAT_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: "DOCUMENT:\n" + document },
      ],
      output_config: { effort: "medium" },
      messages: [...safeHistory, { role: "user", content: question }],
    });

    const answer = extractText(response).trim();
    res.json({ answer: answer || "Your document doesn't say." });
  } catch (err) {
    console.error("chat error:", err);
    res.status(502).json({ error: "Something went wrong contacting Claude. Please try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Visit Translator running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Warning: ANTHROPIC_API_KEY is not set. /api/simplify and /api/chat will return 503 until it is.");
  }
});

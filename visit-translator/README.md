# After-Visit Translator

A single-page app that turns a confusing after-visit summary or discharge printout into plain language a patient or caregiver can act on. A small Node/Express server proxies two endpoints to the Claude API — the API key never touches the browser, and nothing is written to a database. Each request is stateless; conversation history lives only in the browser tab's memory and disappears on reload.

## What it does

1. Paste or type text from a discharge summary.
2. **Simplify this** rewrites it at roughly a 6th-grade reading level, organized as:
   - **What happened** (1–2 sentences)
   - **What to do** — a checklist with times (e.g. "Take amoxicillin 500mg — Morning and night for 10 days")
   - **Warning signs** — when to call the doctor vs. go to the ER
   - **Follow-up appointments**
3. The original text is always shown side by side with the simplified version.
4. A chat box answers follow-up questions **using only the pasted document** — if the answer isn't there, it says so instead of guessing.

**Safety rules baked into the prompts:** every dose, medication name, frequency, and number is copied exactly from the original — never changed, dropped, rounded, or invented. A persistent banner reminds the user that the original document is what counts.

## Setup

```bash
cd visit-translator
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...  (get one at https://console.anthropic.com/)
npm start
# open http://localhost:3000
```

Without a valid `ANTHROPIC_API_KEY`, the server still starts and serves the page, but `/api/simplify` and `/api/chat` return a clear 503 error explaining the key is missing — the UI surfaces that as an error message rather than failing silently.

## How to test it (sample discharge summary)

Below is a discharge summary for a fictional patient treated for pneumonia — written for this test, not a real document. Paste the whole block into the textarea.

```
DISCHARGE SUMMARY

Patient: Jordan Ramirez
Admitted: for 2 days with community-acquired pneumonia (a lung infection)

DIAGNOSIS: Community-acquired pneumonia, right lower lobe.

DISCHARGE MEDICATIONS:
- Amoxicillin 500mg by mouth, three times a day, for 10 days. Finish the entire course even if you feel better.
- Acetaminophen 500mg by mouth every 6 hours as needed for fever or pain. Do not exceed 3000mg in 24 hours.
- Albuterol inhaler, 2 puffs every 4-6 hours as needed for shortness of breath or wheezing.

ACTIVITY: Rest for the next 3-5 days. Resume normal activity as tolerated. No strenuous exercise for 1 week.

DIET: Drink plenty of fluids. No dietary restrictions.

FOLLOW-UP:
- Follow up with Dr. Patel (primary care) in 7-10 days. Call (555) 867-5309 to schedule.
- Repeat chest X-ray in 6 weeks to confirm the pneumonia has cleared.

RETURN TO THE EMERGENCY DEPARTMENT OR CALL 911 IF YOU EXPERIENCE:
- Worsening shortness of breath or difficulty breathing
- Chest pain
- Coughing up blood
- Confusion or extreme drowsiness
- Fever above 103F that does not respond to acetaminophen

CALL YOUR DOCTOR'S OFFICE IF:
- Fever persists beyond 3 days of antibiotics
- Symptoms are not improving after 3-5 days
- New rash or signs of allergic reaction to the antibiotic

Questions? Call the discharge nurse line at (555) 867-5309.
```

### Steps

1. Paste the text above into the box and tap **Simplify this**.
2. Check the plain-language panel on the left:
   - **What happened** should mention pneumonia / a lung infection in 1–2 short sentences.
   - **What to do** should list all three medications, each with its exact dose and schedule — *500mg*, *three times a day*, *10 days*; *500mg every 6 hours*, *3000mg in 24 hours*; *2 puffs every 4-6 hours* — unchanged from the original.
   - **Warning signs** should split into "Call your doctor if" (fever past 3 days, symptoms not improving, rash) and "Go to the ER or call 911 if" (worsening breathing, chest pain, coughing blood, confusion, fever above 103°F).
   - **Follow-up appointments** should mention Dr. Patel in 7–10 days and the repeat chest X-ray in 6 weeks.
   - **Care team phone** should show `(555) 867-5309`.
3. Confirm the **original text panel** on the right shows exactly what you pasted, unedited — this is the side-by-side check.
4. Try the chat box with a question the document *does* answer, e.g. *"How many days do I take the amoxicillin?"* — it should answer "10 days" (or similar), grounded in the text.
5. Try a question the document does **not** answer, e.g. *"What imaging do I need for my knee?"* — it should reply with something like *"Your document doesn't say. Call your care team at (555) 867-5309."* rather than guessing.
6. Confirm the yellow **"This is a simplified version..."** banner stays visible the whole time.
7. Reload the page — the pasted document, the simplified version, and the chat history should all be gone (nothing is persisted).

### If you don't have an API key handy

You can still verify the app's wiring without spending API credits: start the server without `ANTHROPIC_API_KEY` set, paste any text, and confirm you get a clear "Server is not configured..." error instead of a crash or a silent failure.

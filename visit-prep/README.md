# Visit Brief

A mobile-first app that helps a patient prepare for a 15-minute primary care visit. Pure static HTML/CSS/JS — **no backend, no accounts, no data leaves the browser.** All answers live in `sessionStorage`, which is cleared automatically when the tab is closed.

## What it does

1. Six short questions, one per screen: main reason for the visit, when it started, what makes it better/worse, current medications, what's already been tried, and up to three questions for the doctor.
2. Generates a one-page **Visit Brief**: chief concern at the top, a symptom timeline, medication list, and prioritized questions — each with blank space for notes during the visit.
3. The patient can **print** it, **copy** it as plain text, or just **show the screen** to the doctor.
4. If any answer mentions chest pain, trouble breathing, or suicidal thoughts, a red banner appears immediately with `tel:` links to call 911 or 988 — it does not wait for the appointment.

It never diagnoses or advises — it only organizes what the patient already told it.

## Run it

No build step, no dependencies. Any static file server works:

```bash
cd visit-prep
python3 -m http.server 8080
# open http://localhost:8080 on your phone or a resized browser window
```

Or just double-click `index.html` to open it directly in a browser (everything works from `file://` too, since there's no network calls).

## How to test it (worked example)

Scenario: **a 52-year-old with 3 weeks of knee pain, taking lisinopril, who wants to know if they need an X-ray.**

1. Open the app. Read the welcome card, tap **Start**.
2. **Step 1 — main reason.** Type: *"My knee has been hurting for about 3 weeks. I want to know if I need an X-ray."* Tap **Next**.
3. **Step 2 — when it started.** Tap the **2–4 weeks ago** chip (or type your own). Tap **Next**.
4. **Step 3 — better/worse.** "What helps": *Resting and ice*. "What makes it worse": *Walking up stairs, standing a long time*. Tap **Next**.
5. **Step 4 — medications.** Leave "I'm not taking any medications" unchecked. In the first row: name *Lisinopril*, dose *10mg*, frequency *once a day*. Tap **Next**.
6. **Step 5 — already tried.** Type: *Ibuprofen and a knee brace*. Tap **Next**.
7. **Step 6 — questions.** Q1 (most important): *Do I need an X-ray?* Q2: *Could this be arthritis?* Q3: *Should I avoid running?* Tap **Create my Visit Brief**.
8. You should now see a one-page brief:
   - **Chief concern** at the top, in the highlighted box, exactly as typed in Step 1.
   - **Symptom timeline**: Started "2-4 weeks ago", What helps "Resting and ice", What makes it worse "Walking up stairs, standing a long time".
   - **Current medications**: "Lisinopril — 10mg — once a day".
   - **What they've already tried**: "Ibuprofen and a knee brace".
   - **Questions for the doctor**, numbered 1–3, each with a blank "Notes during visit" line under it.
9. Tap **Copy text** — it should briefly say "Copied!" and the plain-text version is now on your clipboard (paste it anywhere to check).
10. Tap **Print** — your browser's print dialog opens with a clean, button-free version of the brief (the buttons and the safety footer are hidden on the printed page).
11. Tap **Start over** — confirms the form resets and the browser back button / reload doesn't bring old answers back (because `sessionStorage` was cleared).

### Testing the emergency banner

- Go back to Step 1 and type something containing *"chest pain"* (or *"trouble breathing"*, or *"suicidal"*) anywhere in any of the free-text fields. A red banner should appear immediately at the top of every screen — including the Visit Brief — with **Call 911** and **Call or text 988** buttons that dial on a phone. It should *not* block you from continuing to fill out the form; it's a persistent warning, not a wall.
- Clear that text back out and the banner should disappear.

### Things to check on an actual phone

- All buttons should be easy to tap with a thumb (they're sized for at least a 48px target).
- Try resizing the browser very narrow (or use your phone) — layout should stay single-column and readable without horizontal scrolling.
- Try leaving fields blank and generating the brief anyway — it should print "Not answered" rather than break.

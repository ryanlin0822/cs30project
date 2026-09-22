# cs30project

Two small, privacy-first tools for patients around a doctor visit:

- **[`visit-prep/`](visit-prep/)** — *Visit Brief*: a guided questionnaire that turns a patient's answers into a one-page brief for a 15-minute primary care visit. Pure static site, no backend, no accounts. Data lives only in the browser tab.
- **[`visit-translator/`](visit-translator/)** — *After-Visit Translator*: pastes a confusing discharge summary and rewrites it in plain language, with a document-grounded Q&A chat. Uses the Claude API via a small Node/Express server. No database — nothing is stored after the session ends.

See each folder's own README for setup and a full test walkthrough.

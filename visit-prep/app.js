(function () {
  "use strict";

  var STORAGE_KEY = "visitPrepData";

  var SCREENS = ["welcome", "reason", "onset", "modifiers", "meds", "tried", "questions", "brief"];

  var state = {
    step: 0, // index into SCREENS
    reason: "",
    onset: "",
    better: "",
    worse: "",
    noMeds: false,
    meds: [], // {name, dose, frequency}
    tried: "",
    q1: "",
    q2: "",
    q3: ""
  };

  // ---------- Safety keyword detection ----------
  var EMERGENCY_PATTERNS = [
    /chest\s*pain/i,
    /(pain|pressure|tightness).{0,20}chest/i,
    /chest.{0,20}(pain|pressure|tightness)/i,
    /trouble\s*breathing/i,
    /(can'?t|cannot|difficult(y)?|hard)\s*(to\s*)?breath(e|ing)/i,
    /shortness\s*of\s*breath/i,
    /suicid/i,
    /kill\s*myself/i,
    /want(ed)?\s*to\s*die/i,
    /end(ing)?\s*my\s*life/i,
    /hurt(ing)?\s*myself/i,
    /harm(ing)?\s*myself/i
  ];

  function textContainsEmergency(text) {
    if (!text) return false;
    for (var i = 0; i < EMERGENCY_PATTERNS.length; i++) {
      if (EMERGENCY_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  function allFreeText() {
    return [state.reason, state.onset, state.better, state.worse, state.tried, state.q1, state.q2, state.q3].join(" \n ");
  }

  function updateEmergencyBanner() {
    var flagged = textContainsEmergency(allFreeText());
    var banner = document.getElementById("emergencyBanner");
    if (flagged) {
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
    return flagged;
  }

  // ---------- Persistence ----------
  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // sessionStorage unavailable (e.g. private mode) - fail silently, app still works in-memory
    }
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        Object.assign(state, parsed);
      }
    } catch (e) {
      // ignore corrupt/unavailable storage
    }
  }

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showScreen(index) {
    state.step = index;
    saveState();
    var name = SCREENS[index];
    SCREENS.forEach(function (s) {
      var el = document.getElementById("screen-" + s);
      if (el) el.classList.toggle("hidden", s !== name);
    });

    var nav = $("screenNav");
    if (name === "welcome" || name === "brief") {
      nav.classList.add("hidden");
    } else {
      nav.classList.remove("hidden");
      $("btnBack").disabled = index === 0;
      $("btnNext").textContent = (index === SCREENS.length - 2) ? "Create my Visit Brief" : "Next";
    }

    if (name === "meds") renderMeds();
    if (name === "brief") renderBrief();

    updateEmergencyBanner();
    window.scrollTo(0, 0);
  }

  // ---------- Medications ----------
  function renderMeds() {
    var list = $("medsList");
    list.innerHTML = "";
    var disabled = state.noMeds;
    $("inputNoMeds").checked = state.noMeds;
    list.style.display = disabled ? "none" : "block";
    $("btnAddMed").style.display = disabled ? "none" : "inline-flex";

    if (state.meds.length === 0 && !disabled) {
      addMedRow(); // start with one row for convenience
    }

    state.meds.forEach(function (med, i) {
      var row = document.createElement("div");
      row.className = "med-entry";
      row.innerHTML =
        '<button type="button" class="med-remove" data-idx="' + i + '" aria-label="Remove medication">Remove</button>' +
        '<label class="field-label">Medication name</label>' +
        '<input type="text" class="med-name" data-idx="' + i + '" value="' + escapeHtml(med.name) + '" placeholder="e.g., Lisinopril" maxlength="100" />' +
        '<label class="field-label">Dose (if known)</label>' +
        '<input type="text" class="med-dose" data-idx="' + i + '" value="' + escapeHtml(med.dose) + '" placeholder="e.g., 10mg" maxlength="60" />' +
        '<label class="field-label">How often?</label>' +
        '<input type="text" class="med-freq" data-idx="' + i + '" value="' + escapeHtml(med.frequency) + '" placeholder="e.g., once a day" maxlength="60" />';
      list.appendChild(row);
    });

    list.querySelectorAll(".med-name").forEach(function (input) {
      input.addEventListener("input", function () {
        state.meds[+input.dataset.idx].name = input.value;
        saveState();
      });
    });
    list.querySelectorAll(".med-dose").forEach(function (input) {
      input.addEventListener("input", function () {
        state.meds[+input.dataset.idx].dose = input.value;
        saveState();
      });
    });
    list.querySelectorAll(".med-freq").forEach(function (input) {
      input.addEventListener("input", function () {
        state.meds[+input.dataset.idx].frequency = input.value;
        saveState();
      });
    });
    list.querySelectorAll(".med-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.meds.splice(+btn.dataset.idx, 1);
        saveState();
        renderMeds();
      });
    });
  }

  function addMedRow() {
    state.meds.push({ name: "", dose: "", frequency: "" });
    saveState();
  }

  // ---------- Wiring inputs to state ----------
  function bindTextField(id, key) {
    var el = $(id);
    el.addEventListener("input", function () {
      state[key] = el.value;
      saveState();
      updateEmergencyBanner();
    });
  }

  function initFieldsFromState() {
    $("inputReason").value = state.reason;
    $("inputOnset").value = state.onset;
    $("inputBetter").value = state.better;
    $("inputWorse").value = state.worse;
    $("inputTried").value = state.tried;
    $("inputQ1").value = state.q1;
    $("inputQ2").value = state.q2;
    $("inputQ3").value = state.q3;
    document.querySelectorAll("#onsetChips .chip").forEach(function (chip) {
      chip.classList.toggle("selected", chip.dataset.value === state.onset);
    });
  }

  // ---------- Visit Brief rendering ----------
  function buildBriefSections() {
    var reason = state.reason.trim() || "(Not answered)";
    var onset = state.onset.trim();
    var better = state.better.trim();
    var worse = state.worse.trim();
    var tried = state.tried.trim();
    var meds = state.noMeds ? [] : state.meds.filter(function (m) { return m.name.trim(); });
    var questions = [state.q1, state.q2, state.q3].map(function (q) { return q.trim(); }).filter(Boolean);

    return { reason: reason, onset: onset, better: better, worse: worse, tried: tried, meds: meds, noMeds: state.noMeds, questions: questions };
  }

  function renderBrief() {
    var flagged = updateEmergencyBanner();
    var briefEmergency = $("briefEmergency");
    if (flagged) {
      briefEmergency.innerHTML =
        '<div class="emergency-banner" role="alert">' +
        "<p><strong>If this is an emergency, don't wait for your appointment.</strong></p>" +
        "<p>Chest pain, trouble breathing, or thoughts of suicide need help right now.</p>" +
        '<div class="emergency-actions">' +
        '<a class="btn btn-emergency" href="tel:911">Call 911</a>' +
        '<a class="btn btn-emergency" href="tel:988">Call or text 988</a>' +
        "</div></div>";
    } else {
      briefEmergency.innerHTML = "";
    }

    var d = buildBriefSections();
    var html = "";

    html += '<div class="chief-concern">' + escapeHtml(d.reason) + "</div>";

    html += '<div class="section"><h3>Symptom timeline</h3><ul>';
    html += "<li><strong>Started:</strong> " + (d.onset ? escapeHtml(d.onset) : '<span class="empty-note">Not answered</span>') + "</li>";
    html += "<li><strong>What helps:</strong> " + (d.better ? escapeHtml(d.better) : '<span class="empty-note">Not answered</span>') + "</li>";
    html += "<li><strong>What makes it worse:</strong> " + (d.worse ? escapeHtml(d.worse) : '<span class="empty-note">Not answered</span>') + "</li>";
    html += "</ul></div>";

    html += '<div class="section"><h3>Current medications</h3>';
    if (d.noMeds) {
      html += '<p class="empty-note">Patient reports taking no medications.</p>';
    } else if (d.meds.length === 0) {
      html += '<p class="empty-note">Not answered</p>';
    } else {
      html += "<ul>";
      d.meds.forEach(function (m) {
        var parts = [escapeHtml(m.name.trim())];
        if (m.dose.trim()) parts.push(escapeHtml(m.dose.trim()));
        if (m.frequency.trim()) parts.push(escapeHtml(m.frequency.trim()));
        html += "<li>" + parts.join(" — ") + "</li>";
      });
      html += "</ul>";
    }
    html += "</div>";

    html += '<div class="section"><h3>What they\'ve already tried</h3>';
    html += d.tried ? "<p>" + escapeHtml(d.tried) + "</p>" : '<p class="empty-note">Not answered</p>';
    html += "</div>";

    html += '<div class="section"><h3>Questions for the doctor</h3>';
    if (d.questions.length === 0) {
      html += '<p class="empty-note">No questions entered</p>';
    } else {
      d.questions.forEach(function (q, i) {
        html +=
          '<div class="question-block">' +
          '<p class="q-text">' + (i + 1) + ". " + escapeHtml(q) + "</p>" +
          '<div class="notes-space" aria-hidden="true"></div>' +
          '<p class="notes-label">Notes during visit</p>' +
          "</div>";
      });
    }
    html += "</div>";

    $("briefContent").innerHTML = html;
  }

  function briefAsPlainText() {
    var d = buildBriefSections();
    var lines = [];
    lines.push("VISIT BRIEF");
    lines.push("");
    lines.push("Chief concern: " + d.reason);
    lines.push("");
    lines.push("SYMPTOM TIMELINE");
    lines.push("Started: " + (d.onset || "Not answered"));
    lines.push("What helps: " + (d.better || "Not answered"));
    lines.push("What makes it worse: " + (d.worse || "Not answered"));
    lines.push("");
    lines.push("CURRENT MEDICATIONS");
    if (d.noMeds) {
      lines.push("Patient reports taking no medications.");
    } else if (d.meds.length === 0) {
      lines.push("Not answered");
    } else {
      d.meds.forEach(function (m) {
        var parts = [m.name.trim()];
        if (m.dose.trim()) parts.push(m.dose.trim());
        if (m.frequency.trim()) parts.push(m.frequency.trim());
        lines.push("- " + parts.join(" — "));
      });
    }
    lines.push("");
    lines.push("WHAT THEY'VE ALREADY TRIED");
    lines.push(d.tried || "Not answered");
    lines.push("");
    lines.push("QUESTIONS FOR THE DOCTOR");
    if (d.questions.length === 0) {
      lines.push("No questions entered");
    } else {
      d.questions.forEach(function (q, i) {
        lines.push((i + 1) + ". " + q);
        lines.push("   Notes: ______________________________");
      });
    }
    if (textContainsEmergency(allFreeText())) {
      lines.push("");
      lines.push("EMERGENCY: If this is chest pain, trouble breathing, or thoughts of suicide, call 911 or 988 now.");
    }
    return lines.join("\n");
  }

  function copyBrief() {
    var text = briefAsPlainText();
    var btn = $("btnCopy");
    function done(ok) {
      btn.textContent = ok ? "Copied!" : "Copy failed — select text manually";
      setTimeout(function () { btn.textContent = "Copy text"; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) {
        done(false);
      }
    }
  }

  // ---------- Navigation ----------
  function goNext() {
    if (state.step < SCREENS.length - 1) showScreen(state.step + 1);
  }
  function goBack() {
    if (state.step > 0) showScreen(state.step - 1);
  }

  function resetAll() {
    state = {
      step: 0, reason: "", onset: "", better: "", worse: "",
      noMeds: false, meds: [], tried: "", q1: "", q2: "", q3: ""
    };
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    initFieldsFromState();
    showScreen(0);
  }

  // ---------- Init ----------
  function init() {
    loadState();
    initFieldsFromState();

    $("btnStart").addEventListener("click", goNext);
    $("btnNext").addEventListener("click", goNext);
    $("btnBack").addEventListener("click", goBack);
    $("btnStartOver").addEventListener("click", resetAll);
    $("btnPrint").addEventListener("click", function () { window.print(); });
    $("btnCopy").addEventListener("click", copyBrief);

    bindTextField("inputReason", "reason");
    bindTextField("inputOnset", "onset");
    bindTextField("inputBetter", "better");
    bindTextField("inputWorse", "worse");
    bindTextField("inputTried", "tried");
    bindTextField("inputQ1", "q1");
    bindTextField("inputQ2", "q2");
    bindTextField("inputQ3", "q3");

    document.querySelectorAll("#onsetChips .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.onset = chip.dataset.value;
        $("inputOnset").value = state.onset;
        document.querySelectorAll("#onsetChips .chip").forEach(function (c) { c.classList.toggle("selected", c === chip); });
        saveState();
      });
    });

    $("inputNoMeds").addEventListener("change", function () {
      state.noMeds = $("inputNoMeds").checked;
      saveState();
      renderMeds();
    });

    $("btnAddMed").addEventListener("click", function () {
      addMedRow();
      renderMeds();
    });

    showScreen(state.step || 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

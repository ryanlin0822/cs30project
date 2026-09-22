(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // In-memory only - nothing here touches localStorage/sessionStorage,
  // and it's gone the moment the tab is closed or reloaded.
  var state = {
    originalText: "",
    simplified: null,
    chatHistory: [] // [{role, content}]
  };

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
  function clearError(el) {
    el.classList.add("hidden");
    el.textContent = "";
  }

  function renderSimplified(data) {
    var html = "";

    html += "<h3>What happened</h3>";
    html += "<p>" + escapeHtml(data.whatHappened || "") + "</p>";

    html += "<h3>What to do</h3>";
    if (Array.isArray(data.whatToDo) && data.whatToDo.length) {
      html += "<ul>";
      data.whatToDo.forEach(function (item) {
        var text = escapeHtml(item && item.text ? item.text : "");
        var time = item && item.time ? escapeHtml(item.time) : "";
        html += "<li>" + text + (time ? '<span class="time-tag">' + time + "</span>" : "") + "</li>";
      });
      html += "</ul>";
    } else {
      html += '<p class="empty-note">Your document doesn\'t list specific steps.</p>';
    }

    html += "<h3>Warning signs</h3>";
    var ws = data.warningSigns || {};
    html += "<p><strong>Call your doctor if:</strong></p>";
    if (Array.isArray(ws.callDoctor) && ws.callDoctor.length) {
      html += "<ul>" + ws.callDoctor.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>";
    } else {
      html += '<p class="empty-note">Not mentioned in your document.</p>';
    }
    html += '<p class="warn-er"><strong>Go to the ER or call 911 if:</strong></p>';
    if (Array.isArray(ws.goToER) && ws.goToER.length) {
      html += "<ul>" + ws.goToER.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>";
    } else {
      html += '<p class="empty-note">Not mentioned in your document.</p>';
    }

    html += "<h3>Follow-up appointments</h3>";
    if (Array.isArray(data.followUp) && data.followUp.length) {
      html += "<ul>" + data.followUp.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>";
    } else {
      html += '<p class="empty-note">No follow-up appointment is mentioned in your document.</p>';
    }

    if (data.careTeamPhone) {
      html += "<h3>Care team phone</h3><p>" + escapeHtml(data.careTeamPhone) + "</p>";
    }

    $("simplifiedContent").innerHTML = html;
  }

  async function simplify() {
    var text = $("inputDoc").value.trim();
    var errEl = $("inputError");
    clearError(errEl);

    if (!text) {
      showError(errEl, "Paste some text first.");
      return;
    }

    $("inputSection").classList.add("hidden");
    $("loadingSection").classList.remove("hidden");
    $("resultSection").classList.add("hidden");

    try {
      var res = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });
      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      state.originalText = data.original;
      state.simplified = data.simplified;
      state.chatHistory = [];

      $("originalText").textContent = state.originalText;
      renderSimplified(state.simplified);
      $("chatLog").innerHTML = "";

      $("loadingSection").classList.add("hidden");
      $("resultSection").classList.remove("hidden");
      window.scrollTo(0, 0);
    } catch (err) {
      $("loadingSection").classList.add("hidden");
      $("inputSection").classList.remove("hidden");
      showError(errEl, err.message || "Something went wrong. Please try again.");
    }
  }

  function appendChatBubble(role, text) {
    var div = document.createElement("div");
    div.className = "chat-msg " + (role === "user" ? "user" : "assistant");
    div.textContent = text;
    $("chatLog").appendChild(div);
    $("chatLog").scrollTop = $("chatLog").scrollHeight;
  }

  async function askQuestion() {
    var input = $("chatInput");
    var question = input.value.trim();
    var errEl = $("chatError");
    clearError(errEl);

    if (!question) return;

    appendChatBubble("user", question);
    input.value = "";
    input.disabled = true;
    $("btnAsk").disabled = true;

    try {
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: state.originalText,
          question: question,
          history: state.chatHistory
        })
      });
      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      appendChatBubble("assistant", data.answer);
      state.chatHistory.push({ role: "user", content: question });
      state.chatHistory.push({ role: "assistant", content: data.answer });
    } catch (err) {
      showError(errEl, err.message || "Something went wrong. Please try again.");
    } finally {
      input.disabled = false;
      $("btnAsk").disabled = false;
      input.focus();
    }
  }

  function startOver() {
    state = { originalText: "", simplified: null, chatHistory: [] };
    $("inputDoc").value = "";
    $("charCount").textContent = "0 characters";
    $("resultSection").classList.add("hidden");
    $("loadingSection").classList.add("hidden");
    $("inputSection").classList.remove("hidden");
    clearError($("inputError"));
    window.scrollTo(0, 0);
  }

  function init() {
    $("inputDoc").addEventListener("input", function () {
      $("charCount").textContent = $("inputDoc").value.length + " characters";
    });
    $("btnSimplify").addEventListener("click", simplify);
    $("btnStartOver").addEventListener("click", startOver);
    $("btnAsk").addEventListener("click", askQuestion);
    $("chatInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        askQuestion();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

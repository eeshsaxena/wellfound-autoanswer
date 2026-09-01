// ==UserScript==
// @name         Wellfound Auto-Answer (Ollama)
// @namespace    eeshsaxena.local
// @version      1.0.0
// @description  Draft answers to Wellfound job-application questions using a local Ollama model. Fills fields for review; never auto-submits.
// @author       Eesh
// @match        https://wellfound.com/*
// @match        https://*.wellfound.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* --------------------------- default background -------------------------- */
  const DEFAULT_RESUME = `Eesh Saxena — Gandhinagar, Gujarat, India
eeshsaxena@gmail.com | eeshsaxena.com | github.com/eeshsaxena | linkedin.com/in/eeshsaxena | leetcode.com/u/eeshsaxena

EDUCATION
Indian Institute of Information Technology Senapati, Manipur (Imphal) — B.Tech in Computer Science and Engineering, Oct 2023 – Present.
Relevant coursework: Data Structures & Algorithms, Machine Learning, Computer Vision, Operating Systems, Database Management Systems, Computer Networks.

WORK EXPERIENCE
Research Intern, Reversible Data Hiding & Image Security — IIIT Vadodara, under Dr. Abhisek Paul (Jan 2026 – Present).
- Studied and experimentally evaluated the Zhang (IEEE SPL 2011) framework on Reversible Data Hiding in Encrypted Images, comparing embedding strategies and reversibility guarantees.
- Developed and tested the encryption / data-embedding / extraction process ensuring separability between data retrieval and image reconstruction.
- Measured embedding capacity and reconstruction fidelity using PSNR and embedding-rate metrics, contributing toward publication-oriented work.

Winter Research Intern, Multi-Object Tracking — IIT Tirupati (Online), SEVA Lab, under Dr. Chalavadi Vishnu (Dec 2025 – Jan 2026).
- Reproduced and analyzed the MOTIP (CVPR 2025) framework for Multiple Object Tracking, focusing on transformer-based identity prediction without Hungarian association.
- Examined spatio-temporal feature embeddings under occlusion and dense-scene conditions, applying temporal regularization to reduce identity switches.
- Evaluated performance using MOTA, IDF1, and HOTA metrics after tuning optimization parameters to improve tracking stability.

PROJECTS
Conflict-Aware Graph RAG (Python, LangChain, Neo4j, Ollama, 2026): graph-based RAG pipeline converting unstructured text into structured triples with LLMs; query-aware reasoning-path retrieval over a Neo4j knowledge graph with Ref(p) scoring; entropy-based conflict module comparing parametric vs graph-augmented responses; benchmarked on multi-hop QA, reducing hallucination and improving attributability vs vector RAG.
RajNLP-50K (Python, HuggingFace, MuRIL, 2026): building India's first open Rajasthani-Hindi code-switched NLP corpus by scraping 50,000 sentences; fine-tuned MuRIL models outperforming GPT-4o on sentiment, NER, and toxicity; extended to power BolKota, a Rajasthani voice assistant; published dataset and checkpoints on HuggingFace Hub.
Smart Money Tracker (Python, Pandas, Plotly Dash, scikit-learn, yfinance, BeautifulSoup, 2026): scraped SEBI portfolio disclosures and AMFI NAV data to track holdings of 10+ top Indian fund managers across 25+ funds; built a Smart Money Flow Detector with conviction scoring; engineered a Fund Manager Style Fingerprint (P/E, P/B, Herfindahl, turnover) with K-Means clustering.

TECHNICAL SKILLS
Languages: C++, Python, JavaScript, PHP, SQL.
Frameworks & Libraries: React.js, Node.js, Express.js, NumPy, Pandas, Matplotlib, PyTorch.
Databases: MySQL, MongoDB, Supabase, Firebase.
Tools & Platforms: Git, Postman, Linux, AWS, Railway, Vercel, Netlify.

ACHIEVEMENTS (competitive programming)
CodeChef: 4-Star (1866), Top 1% in India; Global Rank 1 in Starters 180 (Div. 3), Rank 78 in Starters 183 (Div. 2).
Codeforces: Specialist (1582), Top 1% in India.
LeetCode: Guardian (1873), Top 5% in World; Global Rank 75 in Weekly Contest 446.
Solved 1,500+ problems across 50+ contests; 40+ repositories on GitHub.`;

  /* ----------------------------- config store ----------------------------- */
  const CFG = {
    get resume()   { return GM_getValue('waa_resume', DEFAULT_RESUME); },
    set resume(v)  { GM_setValue('waa_resume', v); },
    get model()    { return GM_getValue('waa_model', 'llama3.1'); },
    set model(v)   { GM_setValue('waa_model', v); },
    get url()      { return GM_getValue('waa_url', 'http://localhost:11434'); },
    set url(v)     { GM_setValue('waa_url', v); },
    get words()    { return GM_getValue('waa_words', 120); },
    set words(v)   { GM_setValue('waa_words', v); },
    get tone()     { return GM_getValue('waa_tone', 'warm, concise, specific, first-person; no buzzwords or clichés'); },
    set tone(v)    { GM_setValue('waa_tone', v); },
    get autorun()  { return GM_getValue('waa_autorun', false); },
    set autorun(v) { GM_setValue('waa_autorun', v); },
  };

  /* ------------------------------- styling -------------------------------- */
  GM_addStyle(`
    #waa-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;
      font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;
      background:#fff;border:1px solid #d5d7db;border-radius:12px;
      box-shadow:0 8px 30px rgba(0,0,0,.18);overflow:hidden}
    #waa-head{display:flex;align-items:center;justify-content:space-between;
      padding:10px 12px;background:#0b0b0c;color:#fff;cursor:default}
    #waa-head b{font-size:13px;font-weight:600}
    #waa-head .waa-dot{width:8px;height:8px;border-radius:50%;background:#888;display:inline-block;margin-right:6px}
    #waa-head .waa-dot.ok{background:#22c55e}
    #waa-head .waa-dot.bad{background:#ef4444}
    #waa-body{padding:12px;max-height:70vh;overflow:auto}
    #waa-body label{display:block;font-weight:600;margin:8px 0 3px}
    #waa-body input,#waa-body textarea,#waa-body select{width:100%;box-sizing:border-box;
      padding:7px 8px;border:1px solid #cfd2d6;border-radius:7px;font:inherit;background:#fbfbfc}
    #waa-body textarea{resize:vertical;min-height:90px}
    .waa-row{display:flex;gap:8px}
    .waa-row>*{flex:1}
    #waa-actions{display:flex;gap:8px;margin-top:12px}
    .waa-btn{flex:1;padding:9px 10px;border:0;border-radius:8px;font:inherit;font-weight:600;
      cursor:pointer;background:#111;color:#fff}
    .waa-btn.sec{background:#eef0f2;color:#111}
    .waa-btn:disabled{opacity:.5;cursor:progress}
    #waa-status{margin-top:8px;font-size:12px;color:#555;white-space:pre-wrap;min-height:16px}
    #waa-toggle{position:fixed;right:16px;bottom:16px;z-index:2147483647;
      padding:10px 14px;border-radius:999px;border:0;background:#111;color:#fff;
      font:600 13px -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;
      box-shadow:0 6px 20px rgba(0,0,0,.25)}
    .waa-mini{position:absolute;transform:translateY(-100%);margin-top:-4px;
      background:#111;color:#fff;border:0;border-radius:6px;padding:4px 8px;
      font:600 11px sans-serif;cursor:pointer;z-index:2147483646;box-shadow:0 3px 10px rgba(0,0,0,.3)}
    .waa-mini:disabled{opacity:.5}
    .waa-hi{outline:2px solid #22c55e !important;outline-offset:1px;transition:outline .3s}
  `);

  /* --------------------------- native value setter ------------------------- */
  // React overrides the value setter; set through the prototype + dispatch events.
  function setFieldValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.classList.add('waa-hi');
    setTimeout(() => el.classList.remove('waa-hi'), 1200);
  }

  /* ----------------------- find question fields on page -------------------- */
  function labelFor(el) {
    // 1) explicit <label for=id> or aria-labelledby
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l && l.innerText.trim()) return l.innerText.trim();
    }
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\s+/).map(id => document.getElementById(id))
        .filter(Boolean).map(n => n.innerText.trim()).join(' ').trim();
      if (t) return t;
    }
    const al = el.getAttribute('aria-label') || el.getAttribute('placeholder');
    // 2) climb ancestors, collect the nearest text that isn't a form control
    let node = el, best = '';
    for (let i = 0; i < 5 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      // text of this container minus the value of controls
      const clone = node.cloneNode(true);
      clone.querySelectorAll('input,textarea,select,button,label.waa-x').forEach(n => n.remove());
      const t = (clone.innerText || '').replace(/\s+/g, ' ').trim();
      if (t && t.length > 8 && t.length < 400) { best = t; break; }
    }
    let q = best || al || '';
    // trim UI noise
    q = q.replace(/\*\s*$/, '').replace(/\(optional\)/ig, '').trim();
    return q;
  }

  function findFields() {
    const out = [];
    const els = document.querySelectorAll('textarea, input[type="text"], input:not([type])');
    els.forEach(el => {
      if (el.closest('#waa-panel')) return;
      if (el.disabled || el.readOnly) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (!el.offsetParent && style.position !== 'fixed') return;
      const q = labelFor(el);
      // skip obvious non-question fields
      if (/name|email|phone|url|linkedin|github|portfolio|website|location|city|salary|search/i.test(
            (el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '')))
        {
          // still allow if it clearly ends in a question mark
          if (!/\?\s*$/.test(q)) return;
        }
      if (el.tagName !== 'TEXTAREA' && q.length < 12) return; // short inputs need a real question
      out.push({ el, q });
    });
    return out;
  }

  /* ------------------------------- Ollama call ----------------------------- */
  function ollamaAnswer(question) {
    const sys =
      `You are helping a job applicant answer an application question on Wellfound.\n` +
      `Write the answer in the FIRST PERSON as the applicant, ready to paste into the form.\n` +
      `Style: ${CFG.tone}. Target about ${CFG.words} words (shorter is fine).\n` +
      `Only use facts supported by the applicant's background below. If a specific fact ` +
      `(dates, numbers, employer names) is not present, stay general rather than inventing it.\n` +
      `Do NOT include a greeting, sign-off, the question text, or quotation marks. Output only the answer.\n\n` +
      `APPLICANT BACKGROUND:\n${CFG.resume || '(none provided)'}`;

    const body = JSON.stringify({
      model: CFG.model,
      stream: false,
      options: { temperature: 0.6 },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: `Question: ${question}` },
      ],
    });

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: CFG.url.replace(/\/$/, '') + '/api/chat',
        headers: { 'Content-Type': 'application/json' },
        data: body,
        timeout: 120000,
        onload: (r) => {
          if (r.status < 200 || r.status >= 300) {
            return reject(new Error(`Ollama HTTP ${r.status}: ${r.responseText.slice(0, 200)}`));
          }
          try {
            const j = JSON.parse(r.responseText);
            const txt = (j.message && j.message.content || '').trim();
            if (!txt) return reject(new Error('Empty response from model.'));
            resolve(txt);
          } catch (e) { reject(new Error('Bad JSON from Ollama: ' + e.message)); }
        },
        onerror: () => reject(new Error('Cannot reach Ollama. Is it running? Set OLLAMA_ORIGINS="*" and restart it.')),
        ontimeout: () => reject(new Error('Ollama timed out (model may be loading; try again).')),
      });
    });
  }

  async function pingOllama() {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: CFG.url.replace(/\/$/, '') + '/api/tags',
        timeout: 5000,
        onload: (r) => resolve(r.status === 200),
        onerror: () => resolve(false),
        ontimeout: () => resolve(false),
      });
    });
  }

  /* ------------------------------- draft flow ------------------------------ */
  let busy = false;

  async function draftOne(field, statusEl) {
    const ans = await ollamaAnswer(field.q);
    setFieldValue(field.el, ans);
    return ans;
  }

  async function draftAll() {
    if (busy) return;
    const fields = findFields();
    const status = document.getElementById('waa-status');
    if (!CFG.resume.trim()) { status.textContent = 'Add your resume/background in settings first.'; return; }
    if (!fields.length) { status.textContent = 'No question fields detected on this page.'; return; }
    busy = true;
    setButtons(true);
    let done = 0;
    for (const f of fields) {
      status.textContent = `Drafting ${done + 1}/${fields.length}: ${f.q.slice(0, 60)}…`;
      try { await draftOne(f, status); done++; }
      catch (e) { status.textContent = 'Error: ' + e.message; busy = false; setButtons(false); return; }
    }
    status.textContent = `Done. Drafted ${done} answer(s). Review, edit, then submit yourself.`;
    busy = false;
    setButtons(false);
  }

  function setButtons(disabled) {
    document.querySelectorAll('.waa-btn, .waa-mini').forEach(b => b.disabled = disabled);
  }

  /* ---------------------- per-field inline mini buttons -------------------- */
  function decorateFields() {
    findFields().forEach(f => {
      if (f.el.dataset.waaBtn) return;
      f.el.dataset.waaBtn = '1';
      const btn = document.createElement('button');
      btn.className = 'waa-mini';
      btn.textContent = '✦ draft';
      btn.title = 'Draft this answer with Ollama';
      btn.addEventListener('click', async ( e) => {
        e.preventDefault(); e.stopPropagation();
        if (busy) return;
        if (!CFG.resume.trim()) { document.getElementById('waa-status').textContent = 'Add your resume in settings first.'; openPanel(); return; }
        busy = true; setButtons(true);
        btn.textContent = '…';
        try { await draftOne(f); btn.textContent = '✓'; setTimeout(() => btn.textContent = '✦ draft', 1500); }
        catch (err) { btn.textContent = '✦ draft'; document.getElementById('waa-status').textContent = 'Error: ' + err.message; openPanel(); }
        busy = false; setButtons(false);
      });
      const r = f.el.getBoundingClientRect();
      btn.style.left = (window.scrollX + r.left) + 'px';
      btn.style.top  = (window.scrollY + r.top) + 'px';
      document.body.appendChild(btn);
      // keep it glued to the field
      f.el.__waaBtn = btn;
    });
    repositionMinis();
  }

  function repositionMinis() {
    document.querySelectorAll('textarea, input').forEach(el => {
      const b = el.__waaBtn;
      if (!b) return;
      if (!el.offsetParent) { b.style.display = 'none'; return; }
      b.style.display = '';
      const r = el.getBoundingClientRect();
      b.style.left = (window.scrollX + r.left) + 'px';
      b.style.top  = (window.scrollY + r.top) + 'px';
    });
  }
  window.addEventListener('scroll', repositionMinis, true);
  window.addEventListener('resize', repositionMinis);

  /* --------------------------------- panel --------------------------------- */
  let panel;
  function openPanel()  { if (panel) { panel.style.display = 'block'; toggleBtn.style.display = 'none'; refreshPanel(); } }
  function closePanel() { if (panel) { panel.style.display = 'none';  toggleBtn.style.display = ''; } }

  function refreshPanel() {
    panel.querySelector('#waa-resume').value = CFG.resume;
    panel.querySelector('#waa-model').value = CFG.model;
    panel.querySelector('#waa-url').value = CFG.url;
    panel.querySelector('#waa-words').value = CFG.words;
    panel.querySelector('#waa-tone').value = CFG.tone;
    panel.querySelector('#waa-autorun').checked = CFG.autorun;
    pingOllama().then(ok => {
      const dot = panel.querySelector('.waa-dot');
      dot.className = 'waa-dot ' + (ok ? 'ok' : 'bad');
      dot.title = ok ? 'Ollama reachable' : 'Ollama not reachable';
    });
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'waa-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div id="waa-head">
        <b><span class="waa-dot"></span>Wellfound Auto-Answer</b>
        <span style="cursor:pointer" id="waa-close">✕</span>
      </div>
      <div id="waa-body">
        <label>Your resume / background</label>
        <textarea id="waa-resume" placeholder="Paste your resume, skills, projects, why you're a fit… (stored locally in this browser)"></textarea>
        <div class="waa-row">
          <div><label>Model</label><input id="waa-model" placeholder="llama3.1"></div>
          <div><label>~Words</label><input id="waa-words" type="number" min="30" max="400"></div>
        </div>
        <label>Ollama URL</label>
        <input id="waa-url" placeholder="http://localhost:11434">
        <label>Answer style</label>
        <input id="waa-tone">
        <label style="font-weight:600;display:flex;align-items:center;gap:6px;margin-top:10px;cursor:pointer">
          <input type="checkbox" id="waa-autorun" style="width:auto;margin:0">
          Auto-draft as soon as an application page opens
        </label>
        <div id="waa-actions">
          <button class="waa-btn sec" id="waa-save">Save</button>
          <button class="waa-btn" id="waa-draft">✦ Draft all answers</button>
        </div>
        <div id="waa-status"></div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelector('#waa-close').onclick = closePanel;
    panel.querySelector('#waa-save').onclick = () => {
      CFG.resume = panel.querySelector('#waa-resume').value;
      CFG.model  = panel.querySelector('#waa-model').value.trim() || 'llama3.1';
      CFG.url    = panel.querySelector('#waa-url').value.trim() || 'http://localhost:11434';
      CFG.words  = parseInt(panel.querySelector('#waa-words').value) || 120;
      CFG.tone   = panel.querySelector('#waa-tone').value;
      CFG.autorun = panel.querySelector('#waa-autorun').checked;
      panel.querySelector('#waa-status').textContent = 'Saved.';
      refreshPanel();
    };
    panel.querySelector('#waa-draft').onclick = draftAll;
  }

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'waa-toggle';
  toggleBtn.textContent = '✦ Auto-Answer';
  toggleBtn.onclick = openPanel;
  document.body.appendChild(toggleBtn);

  buildPanel();

  /* --------------------- watch for dynamically added fields ---------------- */
  const mo = new MutationObserver(() => {
    clearTimeout(mo._t);
    mo._t = setTimeout(() => { decorateFields(); maybeAutoRun(); }, 400);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { decorateFields(); maybeAutoRun(); }, 800);

  // Auto-draft once per page load when enabled and questions are present.
  let autoRan = '';
  function maybeAutoRun() {
    if (!CFG.autorun || busy) return;
    if (!CFG.resume.trim()) return;
    const key = location.pathname;
    if (autoRan === key) return;
    if (!findFields().length) return;
    autoRan = key;
    draftAll();
  }
})();

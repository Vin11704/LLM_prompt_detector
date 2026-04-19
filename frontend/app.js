'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let parsedPrompts = [];
let finalReport = null;
let completed = 0;
let total = 0;

// ── DOM refs ───────────────────────────────────────────────────────────────
const fileInput        = document.getElementById('fileInput');
const fileInfo         = document.getElementById('fileInfo');
const runBtn           = document.getElementById('runBtn');
const errorBanner      = document.getElementById('errorBanner');
const errorBannerMsg   = document.getElementById('errorBannerMsg');
const progressPanel    = document.getElementById('progressPanel');
const progressBar      = document.getElementById('progressBar');
const progressText     = document.getElementById('progressText');
const stepClassify     = document.getElementById('stepClassify');
const stepTest         = document.getElementById('stepTest');
const stepEval         = document.getElementById('stepEval');
const currentPrompt    = document.getElementById('currentPrompt');
const resultsPanel     = document.getElementById('resultsPanel');
const resultsBody      = document.getElementById('resultsBody');
const summaryPanel     = document.getElementById('summaryPanel');
const summaryGrid      = document.getElementById('summaryGrid');
const vulnScore        = document.getElementById('vulnScore');
const classBreakdown   = document.getElementById('classBreakdown');
const downloadBtn      = document.getElementById('downloadBtn');

// ── Helpers ────────────────────────────────────────────────────────────────
function showGlobalError(msg) {
  errorBannerMsg.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function truncate(text, n = 80) {
  if (!text) return '';
  return text.length > n ? text.slice(0, n) + '…' : text;
}

function makeExpandableCell(fullText) {
  const td = document.createElement('td');
  const short = truncate(fullText);
  td.dataset.full = fullText || '';
  td.textContent = short;
  td.classList.add('expandable');
  td.title = 'Click to expand';
  td.addEventListener('click', () => {
    const expanded = td.classList.toggle('expanded');
    td.textContent = expanded ? td.dataset.full : truncate(td.dataset.full);
  });
  return td;
}

function classificationBadge(cls) {
  const span = document.createElement('span');
  span.classList.add('badge');
  span.textContent = cls || 'UNKNOWN';
  if (!cls || cls === 'UNKNOWN') {
    span.classList.add('badge-gray');
  } else if (cls === 'BENIGN') {
    span.classList.add('badge-green');
  } else {
    span.classList.add('badge-red');
  }
  return span;
}

function verdictBadge(verdict) {
  const span = document.createElement('span');
  span.classList.add('badge');
  span.textContent = verdict || 'UNKNOWN';
  if (verdict === 'REFUSED')       span.classList.add('badge-green');
  else if (verdict === 'COMPLIED') span.classList.add('badge-red');
  else if (verdict === 'PARTIAL')  span.classList.add('badge-yellow');
  else                             span.classList.add('badge-gray');
  return span;
}

function confidenceBadge(conf) {
  const span = document.createElement('span');
  span.classList.add('badge');
  span.textContent = conf || '—';
  if (conf === 'HIGH')        span.classList.add('badge-red');
  else if (conf === 'MEDIUM') span.classList.add('badge-yellow');
  else if (conf === 'LOW')    span.classList.add('badge-green');
  else                        span.classList.add('badge-gray');
  return span;
}

function riskBadge(risk) {
  const span = document.createElement('span');
  span.classList.add('badge');
  span.textContent = risk || '—';
  if (risk === 'HIGH')        span.classList.add('badge-red');
  else if (risk === 'MEDIUM') span.classList.add('badge-yellow');
  else if (risk === 'LOW')    span.classList.add('badge-green');
  else                        span.classList.add('badge-gray');
  return span;
}

function setStep(active) {
  // active: 'classify' | 'test' | 'eval' | null
  stepClassify.classList.toggle('active', active === 'classify');
  stepTest.classList.toggle('active', active === 'test');
  stepEval.classList.toggle('active', active === 'eval');
}

// ── File upload → /parse ───────────────────────────────────────────────────
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  fileInfo.textContent = `${file.name} — parsing…`;
  runBtn.disabled = true;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/parse', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    parsedPrompts = data.prompts;
    total = data.total;
    if (total === 0) {
      fileInfo.textContent = `${file.name} — no prompts found`;
      runBtn.disabled = true;
    } else {
      fileInfo.textContent = `${file.name} — ${total} prompt${total !== 1 ? 's' : ''} loaded`;
      runBtn.disabled = false;
    }
  } catch (e) {
    fileInfo.textContent = 'Failed to parse file';
    showGlobalError(`Backend unreachable: ${e.message}. Is the server running on http://localhost:8000?`);
    runBtn.disabled = true;
  }
});

// ── Run evaluation ─────────────────────────────────────────────────────────
runBtn.addEventListener('click', async () => {
  if (!parsedPrompts.length) return;

  // Reset state
  completed = 0;
  finalReport = null;
  resultsBody.innerHTML = '';
  summaryGrid.innerHTML = '';
  classBreakdown.innerHTML = '';
  errorBanner.classList.add('hidden');

  // Show panels
  progressPanel.classList.remove('hidden');
  resultsPanel.classList.remove('hidden');
  summaryPanel.classList.add('hidden');

  // Disable controls during run
  runBtn.disabled = true;
  fileInput.disabled = true;

  updateProgress();

  try {
    await runEvaluation(parsedPrompts);
  } catch (e) {
    showGlobalError(`Evaluation stream error: ${e.message}`);
  } finally {
    runBtn.disabled = false;
    fileInput.disabled = false;
    setStep(null);
  }
});

function updateProgress() {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${completed} of ${total} prompts complete`;
}

// ── SSE via fetch() streaming ──────────────────────────────────────────────
async function runEvaluation(prompts) {
  const response = await fetch('/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompts }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are double-newline delimited
    const parts = buffer.split('\n\n');
    buffer = parts.pop(); // keep the incomplete last chunk

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch {
            // skip malformed event
          }
        }
      }
    }
  }
}

// ── Event handler ──────────────────────────────────────────────────────────
function handleEvent(event) {
  if (event.status === 'classifying') {
    setStep('classify');
    currentPrompt.textContent = truncate(parsedPrompts[event.index] || '', 120);
    return;
  }

  if (event.status === 'testing') {
    setStep('test');
    return;
  }

  if (event.status === 'evaluating') {
    setStep('eval');
    return;
  }

  if (event.status === 'done') {
    completed++;
    updateProgress();
    appendResultRow(event.result);
    return;
  }

  if (event.status === 'error') {
    completed++;
    updateProgress();
    appendErrorRow(event.index, event.message);
    return;
  }

  if (event.status === 'complete') {
    setStep(null);
    currentPrompt.textContent = '';
    progressText.textContent = `All ${total} prompts processed.`;

    finalReport = {
      generated_at: new Date().toISOString(),
      target_model: 'gemini-2.5-flash',
      classifier_model: 'gemini-3.1-pro-preview',
      judge_model: 'gemini-3.1-pro-preview',
      total_prompts: event.summary.total,
      summary: event.summary,
      results: event.results,
    };

    renderSummary(event.summary);
    summaryPanel.classList.remove('hidden');
    summaryPanel.scrollIntoView({ behavior: 'smooth' });
  }
}

// ── Row builders ───────────────────────────────────────────────────────────
function appendResultRow(r) {
  const tr = document.createElement('tr');

  const tdIdx = document.createElement('td');
  tdIdx.textContent = r.index;

  const tdReason = document.createElement('td');
  tdReason.textContent = r.verdict_reason || '—';

  tr.appendChild(tdIdx);
  tr.appendChild(makeExpandableCell(r.prompt));

  const tdCls = document.createElement('td');
  tdCls.appendChild(classificationBadge(r.classification));
  tr.appendChild(tdCls);

  const tdConf = document.createElement('td');
  tdConf.appendChild(confidenceBadge(r.classification_confidence));
  tr.appendChild(tdConf);

  tr.appendChild(makeExpandableCell(r.target_response));

  const tdVerdict = document.createElement('td');
  tdVerdict.appendChild(verdictBadge(r.verdict));
  tr.appendChild(tdVerdict);

  const tdRisk = document.createElement('td');
  tdRisk.appendChild(riskBadge(r.risk_level));
  tr.appendChild(tdRisk);

  tr.appendChild(tdReason);

  resultsBody.appendChild(tr);
}

function appendErrorRow(index, message) {
  const tr = document.createElement('tr');
  tr.classList.add('row-error');
  tr.innerHTML = `
    <td>${index + 1}</td>
    <td colspan="7">ERROR: ${escapeHtml(message || 'Unknown error')}</td>
  `;
  resultsBody.appendChild(tr);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Summary rendering ──────────────────────────────────────────────────────
function renderSummary(s) {
  const cards = [
    { label: 'Total',    value: s.total,    color: '#58a6ff' },
    { label: 'Tested',   value: s.tested,   color: '#8b949e' },
    { label: 'Complied', value: s.complied, color: '#f85149' },
    { label: 'Refused',  value: s.refused,  color: '#3fb950' },
    { label: 'Partial',  value: s.partial,  color: '#d29922' },
    { label: 'Errors',   value: s.errors,   color: '#8b949e' },
  ];

  summaryGrid.innerHTML = cards.map(c => `
    <div class="summary-card">
      <span class="sc-value" style="color:${c.color}">${c.value}</span>
      <span class="sc-label">${c.label}</span>
    </div>
  `).join('');

  const score = s.vulnerability_score_pct;
  vulnScore.textContent = `${score}%`;
  vulnScore.classList.toggle('safe', score <= 20);

  // Classification breakdown
  classBreakdown.innerHTML = '';
  const byClass = s.by_classification || {};
  for (const [cat, counts] of Object.entries(byClass)) {
    const card = document.createElement('div');
    card.classList.add('breakdown-card');
    const pct = counts.total > 0 ? Math.round((counts.complied / counts.total) * 100) : 0;
    card.innerHTML = `
      <div class="bc-title">${escapeHtml(cat)}</div>
      <div class="bc-row"><span>Total</span><span>${counts.total}</span></div>
      <div class="bc-row"><span>Refused</span><span>${counts.refused}</span></div>
      <div class="bc-row"><span>Complied</span><span>${counts.complied}</span></div>
      <div class="bc-row"><span>Partial</span><span>${counts.partial}</span></div>
      <div class="bc-row"><span>Vuln rate</span><span>${pct}%</span></div>
    `;
    classBreakdown.appendChild(card);
  }
}

// ── Download report ────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!finalReport) return;
  const blob = new Blob([JSON.stringify(finalReport, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `llm-security-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

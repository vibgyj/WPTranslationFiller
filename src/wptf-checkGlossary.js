/**
 * GlotPress glossary QA sweep
 * -----------------------------------------------------------------------------
 * Walks the visible translations table. For every row whose ORIGINAL contains
 * one or more glossary words, it checks whether each glossary word is translated
 * as the glossary suggests. If any isn't, it opens the editor via the "Details"
 * link, ticks the glossary reason, writes a note naming the offending term(s),
 * and clicks "Request changes" (changes-requested state, not a hard reject).
 *
 * Run it from the browser console on a GlotPress translation-set page (filter to
 * waiting first: add ?filters[status]=waiting).
 *
 * SAFETY: flip the DryRun switch below. true = report only, changes nothing.
 * false = actually tick / fill / request changes.
 *
 *   DryRun = true;  glossaryQaSweep();                  // report only (whole page)
 *   DryRun = false; glossaryQaSweep();                  // act on flagged rows
 *   glossaryQaSweep({ onlyRow: '33706261-158682287' }); // scope to one row (testing)
 *
 * The feedback wording is the `warningText` constant at the top of the function.
 */

// Flip this and re-run. true = dry run (safe), false = perform the actions.
var DryRun = true;

// -----------------------------------------------------------------------------
// LOCALE PROFILES — the only language-specific part. The matching engine below
// is locale-agnostic; each profile supplies the bits that depend on the target
// language. To support a new locale, add an entry here — no engine changes.
//
//   message         : note shown to the translator (their language, or English).
//   exactTerms      : short terms that must match as a WHOLE word, not inside a
//                     compound (e.g. "site" must not be found in "website").
//   singular(word)  : reduce a word to a comparison stem, i.e. strip the plural.
//   inflectionMatch : is `tok` an inflected form of candidate `cand`? Return
//                     false to disable inflection tolerance for a language.
// -----------------------------------------------------------------------------
const LOCALES = {
  // Dutch — the calibrated default.
  nl: {
    message: 'Please translate the glossary term(s) as suggested:',
    exactTerms: ['site', 'website', 'tab', 'log', 'content'],
    singular: (w) => w.replace(/['\u2019]?s$/, ''),   // drop trailing "s" / "'s"
    // Dutch inflects by suffix (beschikbaar~beschikbare, deactiveer~deactivering):
    // the candidate must be almost fully a prefix of the token.
    inflectionMatch: (cand, tok, cfg) => {
      const shared = sharedPrefixLen(cand, tok);
      return shared >= cfg.prefixLength && shared >= cand.length - cfg.stemSlack;
    },
    prefixLength: 4,   // min shared stem length before an inflected form counts
    stemSlack: 2,      // how many trailing chars an inflection may differ by
  },
};

async function glossaryQaSweep(options = {}) {
  // Don't start while the page-open check is still running — the two overlap and
  // cause save (403) errors. That check shows an indeterminate progress bar; wait
  // for it to finish, and if it's still going after a timeout, warn and abort.
  {
    const barSelector = options.progressBarSelector || '.indeterminate-progress-bar';
    const running = () => {
      const bar = document.querySelector(barSelector);
      return !!bar && getComputedStyle(bar).display !== 'none' && bar.getClientRects().length > 0;
    };
    const hasSpinner = typeof showTranslationSpinner === 'function'
      && typeof hideTranslationSpinner === 'function';

    if (running()) {
      // Non-blocking status while we wait (no confirmation button).
      if (hasSpinner) showTranslationSpinner(__('Waiting for the page check to finish…'));

      const cleared = await waitFor(() => !running(), options.progressWait || 60000, 250);

      if (hasSpinner) hideTranslationSpinner();

      if (!cleared) {
        const msg = 'The page check is still running — wait until it finishes, then run the glossary check again.';
        if (typeof messageBox === 'function') messageBox('warning', msg);
        else console.warn('[glossaryQA]', msg);
        return [];
      }
    }
  }

  // Detect the current locale from the page. checkLocale() is provided by the
  // addon; options.locale is only an override for console testing. The slug is
  // normalized (e.g. "nl_NL" -> "nl") to match a LOCALES key.
  const rawLocale = options.locale
    || (typeof checkLocale === 'function' ? checkLocale() : null)
    || 'nl';
  const locale = String(rawLocale).toLowerCase().split(/[_-]/)[0];
  const profile = LOCALES[locale] || LOCALES.nl;

  // Fixed feedback wording — comes from the active locale profile.
  const warningText = profile.message;

  const cfg = {
    locale,

    // Builds the note written into the feedback box. Receives the list of
    // untranslated glossary words, and the translator's display name (or '').
    formatMessage: (missing, name) => {
      const lines = missing.map((m) => {
        const exp = (m.expected || []).join(', ');
        const count = m.needed > 1 ? ` (${m.found}/${m.needed})` : '';
        return exp ? `\u2022 ${m.word} \u2192 ${exp}${count}` : `\u2022 ${m.word}${count}`;
      });
      const greeting = name ? [`Hi ${name},`] : [];       // greeting on its own line
      return [...greeting, warningText, ...lines].join('\n').replace(/\n{3,}/g, '\n\n');
    },

    // --- selectors ---------------------------------------------------------
    glossaryWordSelector:     '.glossary-word',          // words marked in the original
    translationTextSelector:  '.translation-text',       // current translation in the preview row
    glossaryCheckboxSelector: 'input[name="feedback_reason"][value="glossary"]', // reject-reason checkbox
    standardTextSelector:     'textarea[name="feedback_comment"]',               // reject feedback note
    translatorSelector:       'a[href*="profiles.wordpress.org"]',               // link showing who translated
    rejectSelector:           'button.reject',                                   // hard-reject button
    changesRequestedSelector: 'button.changesrequested',                         // appears once a reason is checked
    editSelector:             'a.action.edit',                                   // GlotPress "Details" link that opens the editor
    metaTabSelector:          'li.tab-meta',                                     // the Meta tab holding the feedback form
    activeTabClass:           'current',                                         // class marking the active tab
    // -----------------------------------------------------------------------

    action: 'changesrequested', // 'changesrequested' (check reason + Request changes)
                                // or 'reject' (hard reject)
    matchMode: 'prefix',   // 'includes' = substring only; 'prefix' = also allow inflectionMatch

    // --- from the locale profile (see LOCALES above) -----------------------
    exactTerms:      profile.exactTerms,
    singular:        profile.singular,
    inflectionMatch: profile.inflectionMatch,
    prefixLength:    profile.prefixLength,
    stemSlack:       profile.stemSlack,
    // -----------------------------------------------------------------------

    onlyRow: null,         // e.g. '33706304' -> only walk/act on rows whose id contains it
    // Protected phrases: brand names / fixed terms that must not be translated.
    // A glossary word sitting inside one of these in the original is skipped, so
    // e.g. "Search" inside "Google Search Console" is never flagged. Case-insensitive.
    // Loaded from the "spellCheckIgnore" setting below; add extras here or via options.
    ignorePhrases: [],
    openTimeout: 5000,     // ms to wait for the editor to open and become visible (2 attempts)
    buttonTimeout: 4000,   // ms to keep re-asserting the reason until the button appears
    pollStep: 200,         // ms between re-assert/poll iterations
    dryRun: DryRun,        // driven by the top-level DryRun switch
    logActions: false,     // log each row id as its change-request starts/clicks (debug the 403)
    logHighlight: false,    // log what the highlighter sees each pass (noisy; debug only)
    highlightStep: 250,    // ms between highlight re-applies (to survive the row re-render)
    actionDelay: 2000,     // ms to wait after acting so the AJAX can settle
    ...options,
  };

  // Merge the stored brand/ignore list from settings with anything configured above.
  cfg.ignorePhrases = [...(cfg.ignorePhrases || []), ...await loadIgnoreList()];

  const rows = [...document.querySelectorAll('tr.preview')];
  const report = [];

  for (const row of rows) {                                    // (1) walk the table
    if (cfg.onlyRow && !(row.id || '').includes(cfg.onlyRow)) continue;

    const original = row.querySelector('td.original');
    let glossaryWords = original
      ? [...original.querySelectorAll(cfg.glossaryWordSelector)]
      : [];

    // Drop glossary words that fall inside a protected phrase (brand names etc.),
    // e.g. "Search" inside "Google Search Console" — those must not be translated.
    glossaryWords = dropProtected(glossaryWords, original, cfg);

    if (glossaryWords.length === 0) continue;                  // (3) no glossary word to check -> skip

    const translation = readTranslation(row, cfg);
    const missingInfo = unmetGlossary(glossaryWords, translation, cfg); // (4)

    if (missingInfo.length === 0) {                           // (5) all good -> skip
      report.push({ row: row.id, status: 'ok' });
      continue;
    }

    report.push({                                              // (6) something missing
      row: row.id,
      status: cfg.dryRun
        ? (cfg.action === 'reject' ? 'would-reject' : 'would-request-changes')
        : 'processing',
      missing: missingInfo,
      translation,
    });

    if (cfg.dryRun) continue;

    try {
      // openEditor confirms this row's editor is visible (DOM only — the page's
      // $gp isn't readable from a content script).
      const editor = await openEditor(row, cfg);
      if (!editor) {
        report[report.length - 1].status = 'editor-not-active';
        closeEditor(row, cfg);   // don't leave the editor hanging open
        continue;
      }

      if (cfg.action === 'reject') {
        // Hard reject: just needs the button (also under the Meta tab).
        activateMetaTab(editor, row, cfg);
        const rej = await waitForEl(
          () => visibleEl(editor.querySelector(cfg.rejectSelector)),
          cfg.buttonTimeout
        );
        if (rej) { rej.click(); report[report.length - 1].status = 'rejected'; }
        else { report[report.length - 1].status = 'reject-button-missing'; closeEditor(row, cfg); }
        await wait(cfg.actionDelay);
        continue;
      }

      // Changes-requested: the feedback form lives in the Meta tab and loads a
      // moment after the editor opens. Wait for the reason checkbox to exist,
      // then tick it EXACTLY ONCE — the native click fires its own change, and
      // re-firing change would make GlotPress render the reason list again
      // (that was the doubled-checkbox bug). After that, just poll for the button.
      if (cfg.logActions) console.log('[glossaryQA] START', row.id,
        '|', missingInfo.map((m) => m.word).join(', '));
      activateMetaTab(editor, row, cfg);
      const checkbox = await waitForEl(
        () => editor.querySelector(cfg.glossaryCheckboxSelector),
        cfg.buttonTimeout
      );
      if (!checkbox) {
        report[report.length - 1].status = 'feedback-form-not-ready';
        closeEditor(row, cfg);
        continue;
      }

      await wait(cfg.pollStep);              // brief settle so the change handler is wired
      activateMetaTab(editor, row, cfg);     // in case the tab switched back
      if (!checkbox.checked) checkbox.click(); // single tick; native change does the rest

      const tb = editor.querySelector(cfg.standardTextSelector);
      if (tb) {
        tb.value = cfg.formatMessage(missingInfo, translatorName(editor, cfg));
        tb.dispatchEvent(new Event('input',  { bubbles: true }));
        tb.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const btn = await waitForEl(
        () => visibleEl(editor.querySelector(cfg.changesRequestedSelector)),
        cfg.buttonTimeout
      );

      if (btn) {
        // Highlight the offending word(s) in the PREVIEW original BEFORE clicking,
        // so that if GlotPress's status handler throws (e.g. a 403), the mark is
        // already applied. Re-applied a few times below to survive the re-render.
        highlightMissing(row, missingInfo, cfg);

        // Log the row and the button's nonce right before the POST fires, so a
        // 403 in the console can be matched to this row (and its nonce compared).
        if (cfg.logActions) console.log('[glossaryQA] CLICK', row.id,
          '| nonce:', btn.getAttribute('data-nonce'));
        try {
          btn.click();
        } catch (clickErr) {
          if (cfg.logActions) console.warn('[glossaryQA] click threw', row.id, clickErr && clickErr.message);
        }
        report[report.length - 1].status = 'changes-requested';

        // GlotPress recolours/re-renders the row after the POST, which can strip
        // an early highlight — re-apply a few times over ~1.5s to land after it.
        for (let i = 0; i < 6; i++) {
          await wait(cfg.highlightStep);
          highlightMissing(row, missingInfo, cfg);
        }
      } else {
        report[report.length - 1].status = 'changesrequested-not-shown';
        closeEditor(row, cfg);
      }

      await wait(cfg.actionDelay);                             // let the AJAX settle
    } catch (err) {
      report[report.length - 1].status = 'action-error';
      report[report.length - 1].error = String(err && err.message || err);
        }
    }
   messageBox("info", __("Glossary Check is ready"));
  //console.table(report);
  const flagged = report.filter((r) => r.status !== 'ok').length;
  //console.log(`Scanned ${rows.length} rows, flagged ${flagged}.`);
  return report;
}

// --- helpers -----------------------------------------------------------------

function readTranslation(row, cfg) {
  const cell = row.querySelector('td.translation');
  if (!cell) return '';
  const parts = [...cell.querySelectorAll(cfg.translationTextSelector)];
  const text = parts.length ? parts.map((n) => n.textContent).join(' ') : cell.textContent;
  return text.trim();
}

function expectedFor(wordSpan) {
  try {
    return JSON.parse(wordSpan.dataset.translations || '[]')
      .map((e) => (e.translation || '').trim())
      .filter(Boolean);
  } catch (e) {
    return ['<unparseable data-translations>'];
  }
}

// Returns a list of glossary terms that aren't translated enough times.
// Terms are grouped by the (lower-cased) source word, so a word appearing
// N times in the original needs N matching occurrences in the translation.
function unmetGlossary(glossaryWords, translationText, cfg) {
  const haystack = normalize(translationText);
  // Split on non-word chars but keep in-word hyphens, so "lay-out" stays one
  // token (matching a glossary "lay-out") while "frontend" stays distinct from
  // "front-end". Trim any hyphens left at token edges (e.g. Dutch "Elementor-").
  const tokens = haystack
    .split(/[^\p{L}\p{N}-]+/u)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter(Boolean);

  // Group spans by source word: { key -> { word, count, expectedRaw[], candidates[] } }
  const groups = new Map();
  for (const w of glossaryWords) {
    const key = normalize(w.textContent);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, { word: w.textContent.trim(), count: 0, expectedRaw: [], candidates: [] });
    }
    const g = groups.get(key);
    g.count += 1;
    for (const raw of expectedFor(w)) {
      if (!g.expectedRaw.includes(raw)) g.expectedRaw.push(raw);
      for (const cand of raw.split(/[\/,;|]+/).map(normalize).filter(Boolean)) {
        if (!g.candidates.includes(cand)) g.candidates.push(cand);
      }
    }
  }

  const missing = [];
  for (const g of groups.values()) {
    if (g.candidates.length === 0) continue;   // no glossary target -> can't judge

    // Split candidates into single-word (matched against individual tokens) and
    // multi-word phrases like "geheime sleutel" (matched when ALL their words are
    // present in the translation — a single token can never equal a phrase).
    const singleCands = g.candidates.filter((c) => !/\s/.test(c));
    const phraseCands = g.candidates.filter((c) => /\s/.test(c));

    // A phrase candidate is satisfied if each of its words matches some token.
    const phraseSatisfied = phraseCands.some((phrase) =>
      phrase.split(/\s+/).filter(Boolean)
        .every((wordCand) => tokens.some((tok) => tokenMatches(tok, [wordCand], g.word, cfg)))
    );

    // Greedily consume one distinct translation token per required occurrence
    // (single-word candidates), or count the phrase as satisfying one occurrence.
    const used = new Array(tokens.length).fill(false);
    let found = 0;
    for (let need = 0; need < g.count; need++) {
      const idx = singleCands.length
        ? tokens.findIndex((tok, i) => !used[i] && tokenMatches(tok, singleCands, g.word, cfg))
        : -1;
      if (idx !== -1) { used[idx] = true; found += 1; continue; }
      if (phraseSatisfied) { found += 1; continue; }  // phrase counts once per needed occurrence
      break;
    }

    if (found < g.count) {
      missing.push({ word: g.word, expected: g.expectedRaw, needed: g.count, found });
    }
  }
  return missing;
}

// Does one translation token satisfy any candidate? Substring handles compounds
// and derived forms ("sleutels" in "providersleutels", "reset" in "resetten");
// stem handles Dutch inflection ("beschikbaar" ~ "beschikbare"). Short glossary
// terms that would match spuriously inside a compound (e.g. "tab" in "tabbladen")
// are handled by listing a more specific form (e.g. the plural) in the glossary.
function tokenMatches(tok, candidates, sourceWord, cfg) {
  const src = normalize(sourceWord);
  const terms = cfg.exactTerms || [];
  const singular = cfg.singular || ((w) => w);            // plural rule (locale profile)
  const stems = terms.map(singular);
  const isExactTerm = (w) => stems.includes(singular(w));

  return candidates.some((cand) => {
    // Whole-word terms: the term must appear as its own word (or plural of it),
    // not as a substring of a bigger word — so the target "site" isn't counted
    // inside "website"/"websites". Triggered by the source word OR the target
    // form, and tolerant of singular/plural on both sides.
    if (isExactTerm(cand) || isExactTerm(src)) {
      return singular(tok) === singular(cand);
    }

    if (tok.includes(cand)) return true;                     // exact / compound / derived

    // Keep-as-is terms (glossary target equals the English source, e.g. "format",
    // "reset") must match exactly — no inflection tolerance, or "format" would
    // wrongly match "formaat". Inflection is only for real translations.
    if (cand === src) return false;

    // Inflection tolerance is supplied by the locale profile.
    if (cfg.matchMode === 'prefix' && typeof cfg.inflectionMatch === 'function') {
      return cfg.inflectionMatch(cand, tok, cfg);
    }
    return false;
  });
}

function sharedPrefixLen(a, b) {
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  return i;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}


function getEditorFor(row) {
  if (row.id) {
    const ed = document.getElementById(row.id.replace(/^preview-/, 'editor-'));
    if (ed) return ed;
  }
  const sib = row.nextElementSibling;
  if (sib && sib.classList.contains('editor')) return sib;
  return null;
}

async function openEditor(row, cfg) {
  const editSelector = (cfg && cfg.editSelector) || 'a.action.edit';
  const timeout = (cfg && cfg.openTimeout) || 5000;
  const visible = (ed) => !!ed && ed.getClientRects().length > 0;
  const opener = () => row.querySelector(editSelector)
    || row.querySelector('td.translation')
    || row;

  // Detect the editor via the DOM only. We deliberately do NOT read $gp here:
  // in a browser-extension content script the page's $gp global isn't visible
  // (isolated world), even though the click still drives GlotPress in the page.
  // Only one editor is open at a time, so this row's editor being visible means
  // GlotPress has made it current (which its own reject handler reads server-side).
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!visible(getEditorFor(row))) opener().click();
    const ok = await waitFor(() => visible(getEditorFor(row)), Math.ceil(timeout / 2));
    if (ok) return getEditorFor(row);
  }
  return null;
}

// Make sure the Meta tab (which holds the feedback checkbox, note and buttons)
// is the active one for this row; the feedback form isn't in the DOM otherwise.
function activateMetaTab(editor, row, cfg) {
  const rowId = (row.id || '').replace(/^preview-/, '');
  const tab = editor.querySelector(cfg.metaTabSelector)
    || document.querySelector(`${cfg.metaTabSelector}[data-row-id="${rowId}"]`);
  if (tab && !tab.classList.contains(cfg.activeTabClass)) tab.click();
  return tab;
}

// Remove glossary-word spans that sit inside a protected phrase (brand name,
// fixed term). Uses the span's character offset within the original cell to test
// containment against each phrase occurrence, so only the occurrence inside the
// phrase is dropped — a standalone use of the same word elsewhere is still checked.
function dropProtected(spans, cell, cfg) {
  const phrases = (cfg.ignorePhrases || []).filter(Boolean);
  if (!phrases.length || !cell || !spans.length) return spans;

  const lower = cell.textContent.toLowerCase();
  const ranges = [];
  for (const phrase of phrases) {
    const p = String(phrase).toLowerCase().trim();
    if (!p) continue;
    let idx = lower.indexOf(p);
    while (idx !== -1) {
      ranges.push([idx, idx + p.length]);
      idx = lower.indexOf(p, idx + p.length);
    }
  }
  if (!ranges.length) return spans;

  return spans.filter((span) => {
    let start;
    try {
      const r = document.createRange();
      r.setStart(cell, 0);
      r.setEndBefore(span);
      start = r.toString().length;
    } catch (e) {
      return true;                      // can't locate it -> keep (check it) to be safe
    }
    const end = start + span.textContent.length;
    // Protect only when the word is a PROPER part of a bigger phrase (e.g. "Search"
    // inside "Google Search Console"). If an ignore entry equals the word itself,
    // that's a spell-check exclusion, not a reason to skip the glossary check.
    const inside = ranges.some(([bs, be]) =>
      bs <= start && end <= be && (be - bs) > (end - start));
    return !inside;                     // keep only spans NOT inside a bigger protected phrase
  });
}

// Load the protected-phrase list from the extension settings. The setting
// "spellCheckIgnore" is a single string with one phrase per line ("\n").
// Handles both the Promise and callback forms of chrome.storage.
async function loadIgnoreList() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return [];
    const call = chrome.storage.local.get('spellCheckIgnore');
    const res = (call && typeof call.then === 'function')
      ? await call
      : await new Promise((resolve) => chrome.storage.local.get('spellCheckIgnore', resolve));
    const raw = res && res.spellCheckIgnore;
    if (!raw) return [];
    return String(raw).split('\n').map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

// Read the translator's display name from the Meta tab, dropping the "(handle)"
// suffix — "Marijan Karajanov (matzedoon)" -> "Marijan Karajanov". Returns ''
// if the link isn't found.
function translatorName(editor, cfg) {
  try {
    const link = editor.querySelector(cfg.translatorSelector);
    if (!link) return '';
    return (link.textContent || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  } catch (e) {
    return '';
  }
}

// Add the 'highlight' class to the flagged glossary-word spans in the PREVIEW
// row's original cell (td.original), so the word that caused the changes-requested
// is visible at a glance in the list. Re-reads the live DOM at call time (the row
// re-renders after the status change, so span references captured earlier are stale).
function highlightMissing(row, missingInfo, cfg) {
  try {
    // On a status change GlotPress renames the original row by appending "-old"
    // and inserts a fresh row. row.id then resolves to the stale, hidden "-old"
    // node, so highlighting it shows nothing. Prefer the current row: strip any
    // "-old", and pick the visible one.
    const baseId = row.id.replace(/-old$/, '');
    const candidates = [
      document.getElementById(baseId),
      ...document.querySelectorAll(`[id^="${baseId}"]`),
      row,
    ].filter(Boolean);
    const live = candidates.find((el) => !/-old$/.test(el.id) && el.getClientRects().length > 0)
      || candidates.find((el) => !/-old$/.test(el.id))
      || row;

    const scope = live.querySelector('.original .original-text')
      || live.querySelector('.original-text')
      || live.querySelector('td.original')
      || live.querySelector('.original')
      || live;
    const wanted = new Set(missingInfo.map((m) => (m.word || '').toLowerCase().trim()));
    const spans = scope ? [...scope.querySelectorAll(cfg.glossaryWordSelector)] : [];
    if (cfg.logHighlight) {
      console.log('[glossaryQA] highlight', row.id, '-> live', live.id,
        '| wanted:', [...wanted],
        '| spans:', spans.map((s) => (s.textContent || '').toLowerCase().trim()));
    }
    if (!spans.length || !wanted.size) return;
    spans.forEach((span) => {
      const t = (span.textContent || '').toLowerCase().trim();
      if (wanted.has(t)) span.classList.add('highlight');
    });
  } catch (e) {
    if (cfg.logHighlight) console.warn('[glossaryQA] highlight error', row.id, e && e.message);
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Best-effort close of a row's editor (click its close control, or the opener
// again to toggle it shut). Used when we bail out so it doesn't stay open.
function closeEditor(row, cfg) {
  try {
    const ed = getEditorFor(row);
    const closer = (ed && ed.querySelector('a.close, .editor-panel .close'))
      || row.querySelector((cfg && cfg.editSelector) || 'a.action.edit');
    if (closer) closer.click();
  } catch (e) { /* ignore */ }
}

async function waitFor(pred, timeout = 2000, step = 50) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (pred()) return true; } catch (e) { /* keep waiting */ }
    await wait(step);
  }
  try { return !!pred(); } catch (e) { return false; }
}

// Returns the element if it exists and is rendered (has layout), else null.
function visibleEl(el) {
  return el && el.getClientRects().length > 0 ? el : null;
}

// Polls getter until it returns a truthy element (or times out), then returns it.
async function waitForEl(getter, timeout = 3000, step = 150) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const el = getter(); if (el) return el; } catch (e) { /* keep waiting */ }
    await wait(step);
  }
  try { return getter() || null; } catch (e) { return null; }
}
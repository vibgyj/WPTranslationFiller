/**
 * translatePageKimi.js
 *
 * Bulk / batch translation via Kimi.
 * Mirrors translatePageClaude() / translatePageGroq() — same page walk, same JSON
 * {"i","t"} -> {"results":[{"i","tr"}]} contract, tolerant parser + retry, and
 * row-by-row write-back via postProcessTranslation() + processTransl().
 *
 * Rows are fetched from the page (NOT via a passed-in record):
 *   document.querySelectorAll("tr.editor div.editor-panel__left div.panel-content")
 *   -> rowId from closest("tr.editor").id ("editor-<n>")
 *   -> original from span.original-raw
 *
 * Plural handling (same as Groq):
 *   - Plural when `#preview-{rowId} .original li:nth-of-type(2)` exists (checked
 *     BEFORE determineType, so pretranslated plurals are still caught).
 *   - Label line ("Singular:" / "Plural:") is stripped, then findTransline()
 *     looks up each form in the local DB using checkLocale().
 *   - Both forms found (!= 'notFound') -> IMMEDIATE, written per-line with "Local".
 *   - Otherwise -> API batch as { type:"plural", items:[{id,line,original}] },
 *     expanded into per-form items keyed `rowId#line`.
 *   - Non-plural rows: determineType() -> name/URL & pretranslated go IMMEDIATE,
 *     everything else -> API single.
 *
 * Transport: the existing chrome background message "Kimi" (no handler changes).
 * Single-line editor translation keeps using the existing KimiTranslate().
 *
 * Depends on: determineType, findTransline, checkLocale, preProcessOriginal,
 *   pruneGlossary, estimateMaxTokens, postProcessTranslation, processTransl,
 *   setPreTranslationReplace, setPostTranslationReplace, messageBox, __ (i18n)
 * Optional: stripPluralLabel (reused if present; otherwise a local fallback is used)
 * Globals: replaceVerb, DebugMode
 */

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

const KIMI_BATCH_DEFAULT_SIZE = 20;
const KIMI_CONCURRENCY = 3;

function getKimiBatchSize(override) {
    if (Number.isInteger(override) && override > 0) return override;
  const stored = parseInt(localStorage.getItem('groqBatchSize'), 10);
  if (Number.isInteger(stored) && stored > 0) return stored;
  return KIMI_BATCH_DEFAULT_SIZE;
}

/**
 * Model-specific reasoning fields for the Moonshot request.
 *  - kimi-k3            -> reasoning_effort (k3 always reasons; keep it low for translation)
 *  - kimi-k2.6 / k2.5   -> thinking.type: "disabled" (translation needs no reasoning)
 *  - kimi-k2.7-code     -> always thinks; nothing to pass (needs a big max_tokens instead)
 * Never send both `thinking` and `reasoning_effort` — Moonshot returns 400.
 */
function kimiReasoningParams(model) {
  const m = (model || '').toLowerCase();
  if (m === 'kimi-k3') return { reasoning_effort: 'low' };
  if (m.startsWith('kimi-k2.6') || m.startsWith('kimi-k2.5')) {
    return { thinking: { type: 'disabled' } };
  }
  return {};
}

/** True for models whose reasoning can't be turned off — they need max_tokens headroom. */
function kimiAlwaysThinks(model) {
  const m = (model || '').toLowerCase();
  return m === 'kimi-k3' || m.startsWith('kimi-k2.7-code');
}

/** Clear the progress bar / spinner the caller put up. */
function hideKimiProgress() {
  const progressbar = document.querySelector('.indeterminate-progress-bar');
  if (progressbar) progressbar.style.display = 'none';
  if (typeof hideTranslationSpinner === 'function') hideTranslationSpinner();
}

/* ------------------------------------------------------------------ *
 * DOM helpers (taken over from the Groq/single-line flow)
 * ------------------------------------------------------------------ */

function getBubble(rowId) {
  return document.querySelector(`#editor-${rowId} span.panel-header__bubble`);
}

/** Adds the "Local" label to a preview cell, matching processTransl's DOM. */
function addLocalLabel(rowId) {
  const preview = document.querySelector('#preview-' + rowId);
  if (!preview) return;
  const previewName = preview.querySelector('td.translation');
  if (!previewName) return;
  if (previewName.querySelector('.trans_local_div')) return;
  const div = document.createElement('div');
  div.setAttribute('class', 'trans_local_div');
  div.setAttribute('id', 'trans_local_div');
  const label = (typeof __ === 'function') ? __('Local') : 'Local';
  div.appendChild(document.createTextNode(label));
  previewName.appendChild(div);
}

/** Strip the "Singular:" / "Plural:" label line — prefer an existing global. */
function kimiStripPluralLabel(text) {
  if (typeof stripPluralLabel === 'function') return stripPluralLabel(text);
  const lines = (text || '').split('\n');
  return lines.length > 1 ? lines.slice(1).join('\n').trim() : (text || '').trim();
}

/* ------------------------------------------------------------------ *
 * Scan the page -> immediate (local) queue + batch (API) queue
 * (walks the DOM itself; identical to the Groq table-walker)
 * ------------------------------------------------------------------ */

async function scanRowsKimi() {
  const immediateQueue = [];
  const batchQueue = [];

  const rows = document.querySelectorAll(
    'tr.editor div.editor-panel__left div.panel-content'
  );

  for (const e of rows) {
    const rowfound = e.closest('tr.editor')?.id;
    if (!rowfound) continue;

    // Row ids are "editor-<originalId>" for untranslated strings and
    // "editor-<originalId>-<translationId>" for rows that already have a
    // translation (fuzzy/current). Capture the whole suffix so both match the
    // corresponding #editor-/#preview- elements used downstream.
    const rowId = rowfound.match(/^editor-(.+)$/)?.[1];
    if (!rowId) continue;

    const original = e.querySelector('span.original-raw')?.innerText;
    if (!original) continue;

    // Fuzzy rows carry an existing (questionable) translation; GlotPress marks
    // them with "status-fuzzy" — on the tr.editor row in this editor DOM (and on
    // tr.preview in the list view). Detect either so fuzzy rows get re-translated.
    const isFuzzy =
      (e.closest('tr.editor')?.className || '').includes('status-fuzzy') ||
      (document.querySelector('#preview-' + rowId)?.className || '').includes('status-fuzzy');

    // ── PLURAL CHECK FIRST (before determineType) ──
    const plural1 = document.querySelector(`#preview-${rowId} .original li:nth-of-type(1)`);
    const plural2 = document.querySelector(`#preview-${rowId} .original li:nth-of-type(2)`);

    if (plural2) {
      const form1 = kimiStripPluralLabel(plural1?.innerText);
      const form2 = kimiStripPluralLabel(plural2?.innerText);
      const rowLocale = checkLocale();
      const tr1 = await findTransline(form1, rowLocale);
      const tr2 = await findTransline(form2, rowLocale);

      if (!isFuzzy && tr1 !== 'notFound' && tr2 !== 'notFound') {
        // Both forms local (and not fuzzy) — write immediately, no API call.
        immediateQueue.push({
          id: rowId, record: e, original, render: false,
          pluralForms: [
            { original: form1, translation: tr1, line: 1 },
            { original: form2, translation: tr2, line: 2 },
          ],
        });
      } else {
        // Needs the API — one item per form, written back per line.
        if (DebugMode) console.debug(`[Kimi] Plural detected rowId=${rowId} form1=${form1} form2=${form2}`);
        batchQueue.push({
          id: rowId, type: 'plural', record: e,
          items: [
            { id: rowId, line: 1, original: form1 },
            { id: rowId, line: 2, original: form2 },
          ],
        });
      }
      continue;
    }

    // ── Non-plural fuzzy: local-first, else API — skip determineType, which
    //    would otherwise keep the existing fuzzy translation. ──
    if (isFuzzy) {
      const rowLocale = checkLocale();
      const trLocal = await findTransline(original, rowLocale);
      if (trLocal !== 'notFound') {
        immediateQueue.push({ id: rowId, record: e, original, translation: trLocal, render: false });
      } else {
        batchQueue.push({ id: rowId, type: 'single', record: e, original });
      }
      continue;
    }

    // ── Non-plural: classify like the single-line flow ──
    const [myType, myTranslated] = await determineType(rowId, e);

    if (myType === 'name' || myType === 'URL') {
      immediateQueue.push({ id: rowId, record: e, original, translation: original, render: true });
    } else if (myType === 'pretranslated') {
      immediateQueue.push({ id: rowId, record: e, original, translation: myTranslated, render: false });
    } else {
      batchQueue.push({ id: rowId, type: 'single', record: e, original });
    }
  }

  return { immediateQueue, batchQueue };
}

/* ------------------------------------------------------------------ *
 * Prompt building (same template/placeholders as the other bulk fns)
 * ------------------------------------------------------------------ */

function kimiLangName(destlang) {
  const map = {
    nl: 'Dutch', de: 'German', fr: 'French', uk: 'Ukrainian',
    es: 'Spanish', id: 'Indonesian', it: 'Italian',
    pt: 'Portuguese', ru: 'Russian',
  };
  return map[destlang] || destlang;
}

function kimiApplyTone(template, tone, destlang) {
  if (tone === 'formal') {
    if (destlang === 'nl') return template.replaceAll('{{tone}}', tone + " and use 'u' instead of 'je'");
    if (destlang === 'de') return template.replaceAll('{{tone}}', tone + " and use 'Sie' instead of 'du'");
    if (destlang === 'fr') return template.replaceAll('{{tone}}', tone + " use 'vous' instead of 'tu'");
  }
  return template.replaceAll('{{tone}}', tone);
}

function buildKimiBatchPrompt(shared, promptItems, compactGloss) {
  let p = (shared.template || '') + '\n';
  p = kimiApplyTone(p, shared.tone, shared.destlang);
  p = p.replaceAll('{{toLanguage}}', kimiLangName(shared.destlang));
  p = p.replaceAll('{{OpenAiGloss}}', compactGloss);
  p = p.replaceAll('{{text}}', JSON.stringify(promptItems));
  return p;
}

/* ------------------------------------------------------------------ *
 * Response parsing (tolerant, same aliasing as parseClaude/parseGroq)
 * ------------------------------------------------------------------ */

function parseKimi(raw) {
  if (!raw) return null;
  let text = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch (_) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch (_) {} }
  }
  if (!obj) return null;

  const arr = Array.isArray(obj) ? obj : (obj.results || obj.translations || null);
  if (!Array.isArray(arr)) return null;

  const out = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const i = it.i ?? it.id ?? it.rowId;
    const tr = it.tr ?? it.t ?? it.translation ?? it.text;
    if (i != null && tr != null) out.push({ i: String(i), tr });
  }
  return out.length ? out : null;
}

/* ------------------------------------------------------------------ *
 * Transport + retry
 * ------------------------------------------------------------------ */

async function callKimiWithRetry(messages, maxTokens, model, apikeyKimi, attempts = 3) {
  for (let a = 1; a <= attempts; a++) {
    const dataNew = {
      model, messages, max_tokens: maxTokens, apiKey: apikeyKimi,
      ...kimiReasoningParams(model),
    };

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'Kimi', data: dataNew }, (res) => resolve(res));
    });

    if (!result || result.error) {
      if (DebugMode) console.debug(`[Kimi] attempt ${a} transport error:`, result?.error);
      continue;
    }

    const raw = result.result?.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = parseKimi(raw);
    if (parsed) return parsed;

    if (DebugMode) console.debug(`[Kimi] attempt ${a} returned no valid JSON.\n--- RAW ---\n${raw}\n--- END ---`);
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * One batch of items -> array of {i, tr}
 * ------------------------------------------------------------------ */

async function kimiTranslateBatch(items, shared) {
  const promptItems = items.map((it) => ({ i: it.key, t: it.preprocessed }));

  // Batch-level glossary prune over the combined text (no single record here).
  const combined = items.map((it) => it.preprocessed).join('\n');
  const compactGloss = pruneGlossary(shared.openAiGloss, combined, null).replace(/\n+/g, '|');

  const prompt = buildKimiBatchPrompt(shared, promptItems, compactGloss);
  const messages = [{ role: 'user', content: prompt }];
  let maxTokens = items.reduce((s, it) => s + estimateMaxTokens(it.preprocessed), 0) + 4000;
  // Thinking models share one budget for reasoning_content + content — give them room.
  if (kimiAlwaysThinks(shared.model)) maxTokens = Math.max(maxTokens, 16000);

  const results = await callKimiWithRetry(messages, maxTokens, shared.model, shared.apikeyKimi);
  if (!results) {
    console.warn(`[Kimi] batch of ${items.length} failed after retries. Skipping.`);
    return [];
  }
  return results;
}

/* ------------------------------------------------------------------ *
 * IMMEDIATE queue — local/pretranslated writes (taken over from Groq)
 * ------------------------------------------------------------------ */

async function processKimiImmediate(immediateQueue, ctx) {
  const { language, locale, convertToLower, spellCheckIgnore } = ctx;

  for (const item of immediateQueue) {
    const id = item.id ?? item.rowId;
    const rec = item.record;

    // Pretranslated plural — write each form directly from the local database
    if (item.pluralForms) {
      for (let fi = 0; fi < item.pluralForms.length; fi++) {
        const form = item.pluralForms[fi];
        const pre = await preProcessOriginal(form.original, replaceVerb, 'Kimi');
        const finalText = await postProcessTranslation(
          form.original, form.translation, replaceVerb, pre,
          'Kimi', convertToLower, spellCheckIgnore ?? '', locale
        );
        if (DebugMode) console.debug(`[Kimi] Writing local plural id=${id} line=${form.line} translation=${finalText}`);
        await processTransl(
          form.original, finalText, language, rec, id,
          'plural', String(form.line), locale, convertToLower, getBubble(id)
        );
      }
      addLocalLabel(id);      // label once, after the last form is written
      continue;
    }

    // Pretranslated single — write directly from the local database
    if (item.render === false) {
      const pre = await preProcessOriginal(item.original, replaceVerb, 'Kimi');
      const finalText = await postProcessTranslation(
        item.original, item.translation, replaceVerb, pre,
        'Kimi', convertToLower, spellCheckIgnore ?? '', locale
      );
      if (DebugMode) console.debug(`[Kimi] Writing local single id=${id} translation=${finalText}`);
      await processTransl(
        item.original, finalText, language, rec, id,
        'single', '', locale, convertToLower, getBubble(id)
      );
      addLocalLabel(id);
      continue;
    }

    // name/URL — run through pre/postProcess and write (no API, no Local label)
    const pre = await preProcessOriginal(item.original, replaceVerb, 'Kimi');
    const finalText = await postProcessTranslation(
      item.original, item.translation, replaceVerb, pre,
      'Kimi', convertToLower, spellCheckIgnore ?? '', locale
    );
    await processTransl(
      item.original, finalText, language, rec, id,
      'single', '', locale, convertToLower, getBubble(id)
    );
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

async function translatePageKimi(destlang, apikeyKimi, OpenAIPrompt, formal, locale, convertToLower, editor, KimiSelect, OpenAItemp, spellCheckIgnore, OpenAITone, is_editor, openAiGloss, preTranslationReplace, postTranslationReplace) {
  if (!KimiSelect) {
    messageBox('error', 'You did not set the Kimi model!<br> Please check your options');
    hideKimiProgress();
    return 'NOK';
  }

  const language = (destlang || '').toUpperCase();
  const batchSize = getKimiBatchSize();

  const shared = {
    model: KimiSelect,
    apikeyKimi,
    template: OpenAIPrompt,
    tone: OpenAITone,
    destlang,
    openAiGloss,
    formal,
  };

  setPostTranslationReplace(postTranslationReplace, formal);
  setPreTranslationReplace(preTranslationReplace);

  try {
  /* ── 1. SCAN THE PAGE: immediate (local) vs batch (API) ──── */
  const { immediateQueue, batchQueue } = await scanRowsKimi();

  if (!immediateQueue.length && !batchQueue.length) {
    if (DebugMode) console.debug('[Kimi] No translatable rows found on the page.');
    return 'OK';
  }

  // Local / pretranslated writes first — no API round-trip.
  await processKimiImmediate(immediateQueue, {
    language, locale, convertToLower, spellCheckIgnore,
  });

  if (!batchQueue.length) {
    if (DebugMode) console.debug('[Kimi] Only local rows; nothing sent to the API.');
    return 'OK';
  }

  /* ── 2. BUILD ITEMS (expand plural rows into per-form items) ─ */
  const items = [];
  for (const row of batchQueue) {
    if (row.type === 'plural' && Array.isArray(row.items)) {
      for (const form of row.items) {
        items.push({
          key: `${row.id}#${form.line}`,
          rowId: row.id,
          original: form.original,
          preprocessed: await preProcessOriginal(form.original, replaceVerb, 'Kimi'),
          transtype: 'plural',
          plural_line: String(form.line),
          record: row.record,
        });
      }
    } else {
      items.push({
        key: String(row.id),
        rowId: row.id,
        original: row.original,
        preprocessed: await preProcessOriginal(row.original, replaceVerb, 'Kimi'),
        transtype: 'single',
        plural_line: '',
        record: row.record,
      });
    }
  }

  /* ── 3. CHUNK ────────────────────────────────────────────── */
  const chunks = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }

  /* ── 4. TRANSLATE IN PARALLEL WINDOWS ────────────────────── */
  const allResults = [];
  for (let ci = 0; ci < chunks.length; ci += KIMI_CONCURRENCY) {
    const window = chunks.slice(ci, ci + KIMI_CONCURRENCY);
    const settled = await Promise.all(window.map((chunk) => kimiTranslateBatch(chunk, shared)));
    for (const arr of settled) allResults.push(...(arr || []));
    if (ci + KIMI_CONCURRENCY < chunks.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  /* ── 5. WRITE RESULTS BACK, ITEM BY ITEM ─────────────────── */
  for (const resultItem of allResults) {
    if (!resultItem.tr) {
      console.warn(`[Kimi] No translation for key ${resultItem.i}`);
      continue;
    }

    const item = items.find((it) => String(it.key) === String(resultItem.i));
    if (!item) {
      console.warn(`[Kimi] Could not match key ${resultItem.i} back to an item.`);
      continue;
    }

    try {
      const finalText = await postProcessTranslation(
        item.original,
        resultItem.tr,
        replaceVerb,
        item.preprocessed,
        'Kimi',
        convertToLower,
        spellCheckIgnore ?? '',
        locale
      );

      await processTransl(
        item.original,
        finalText,
        language,
        item.record,
        item.rowId,
        item.transtype,       // "plural" for expanded forms, else "single"
        item.plural_line,     // line number for plural forms, else ""
        locale,
        convertToLower,
        getBubble(item.rowId)
      );
    } catch (err) {
      console.error(`[Kimi] postProcess/processTransl error for key ${resultItem.i}:`, err);
    }
  }

  if (DebugMode) {
    console.debug(`[Kimi] Done. immediate=${immediateQueue.length} api-items=${items.length} translated=${allResults.filter((r) => r.tr).length}`);
  }
  return 'OK';
  } finally {
    // Whatever the exit path (early return, error, or success), clear the bar.
    hideKimiProgress();
  }
}

/* ------------------------------------------------------------------ *
 * DISPATCH — in translatePage() (wptf-commonTranslate.js):
 *
 *   else if (transsel == "kimi") {
 *     result = await translatePageKimi(
 *       destlang, apikeyKimi, OpenAIPrompt, formal, locale, convertToLower,
 *       editor, KimiSelect, OpenAItemp, spellCheckIgnore, OpenAITone,
 *       is_editor, openAiGloss, preTranslationReplace, postTranslationReplace
 *     );
 *   }
 * ------------------------------------------------------------------ */
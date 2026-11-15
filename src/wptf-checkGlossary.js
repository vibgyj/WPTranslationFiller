/**
 * GlotPress glossary QA sweep — batch edition
 * -----------------------------------------------------------------------------
 * Walks the visible translations table. For every row whose ORIGINAL contains
 * one or more glossary words, it checks whether each glossary word is translated
 * as the glossary suggests. Glossary words WITHOUT a translation in the glossary
 * are ignored (not checked, not counted, not highlighted).
 *
 * FIRST QUESTION (before anything happens): "Batch" or "Row by row".
 *
 *   ROW BY ROW — the original behaviour. A second question asks "Create"
 *     (changes requested with glossary reason + note) or "Reject" (hard reject).
 *     Every flagged row is handled on its own, so one mail per row.
 *
 *   BATCH
 *     1. SCAN (changes nothing): all rows are checked, problems are collected.
 *     2. REVIEW: a modal lists the problems. Each row has a checkbox, so false
 *        positives can be unticked; the combined note is editable. Then:
 *          - "Bulk reject: save now" : tick the selected rows in the table, choose
 *                                  "Reject" in the bulk dropdown, click Apply,
 *                                  paste the combined note in the text box that
 *                                  opens and save it -> ONE action.
 *          - "Bulk reject: prepare"  : same, but does NOT save; you check the note
 *                                  and click save yourself.
 *          - "Cancel" / Esc      : change nothing.
 *
 *   DRY RUN — no questions; scan and show the list (only "Copy note" / "Close").
 *
 * Run it from the browser console on a GlotPress translation-set page (filter to
 * waiting first: add ?filters[status]=waiting).
 *
 *   DryRun = true;  glossaryQaSweep();                  // scan + show list only
 *   DryRun = false; glossaryQaSweep();                  // scan, show list, then act
 *   glossaryQaSweep({ onlyRow: '33706261-158682287' }); // scope to one row (testing)
 *
 * After a run, the findings and the combined note stay available in the console:
 *   window.glossaryQaLast       // array of findings
 *   window.glossaryQaLastNote   // the note that was (or would be) sent
 *
 * NOTE: the bulk-toolbar selectors (cfg.bulk*) are configurable. If the bulk
 * "Reject" option, the Apply button or the text box can't be found, the note is
 * copied to the clipboard and the rows stay ticked, so you can finish by hand.
 */

// Flip this and re-run. true = dry run (safe), false = perform the actions.
var DryRun = true;

// -----------------------------------------------------------------------------
// LOCALE PROFILES — the only language-specific part. The matching engine below
// is locale-agnostic; each profile supplies the bits that depend on the target
// language. To support a new locale, add an entry here — no engine changes.
//
//   exactTerms      : short terms that must match as a WHOLE word, not inside a
//                     compound (e.g. "site" must not be found in "website").
//   singular(word)  : reduce a word to a comparison stem, i.e. strip the plural.
//   inflectionMatch : is `tok` an inflected form of candidate `cand`? Return
//                     false to disable inflection tolerance for a language.
// -----------------------------------------------------------------------------
const LOCALES = {
    // Dutch — the calibrated default.
    nl: {
        exactTerms: ['site', 'website', 'tab', 'log', 'content'],
        singular: (w) => w.replace(/['’]?s$/, ''),   // drop trailing "s" / "'s"
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

// UI text goes through the addon's translator when it is available.
// Fill numbered placeholders after translating: qaSprintf('%1$s of %2$s', a, b).
// Translators may reorder %1$s / %2$s; a plain %s is filled in order.
function qaSprintf(text, ...args) {
    let i = 0;
    return String(text)
        .replace(/%(\d+)\$s/g, (m, n) => String(args[Number(n) - 1] ?? ''))
        .replace(/%s/g, () => String(args[i++] ?? ''));
}

function notify(type, msg) {
    if (typeof messageBox === 'function') messageBox(type, msg);
    else console[type === 'warning' ? 'warn' : 'log']('[glossaryQA]', msg);
}

// =============================================================================
// MAIN
// =============================================================================
async function glossaryQaSweep(options = {}) {
    if (!(await waitForPageCheck(options))) return [];

    const cfg = buildConfig(options);

    // ---- STEP 0: first choice — batch or row by row ------------------------
    // Row by row = the original behaviour (incl. the Create / Reject question).
    // Batch      = scan everything, show the list, then one bulk action.
    if (!cfg.dryRun) {
        const mode = await askChoice(
            __('Glossary check'),
            __('Do you want to handle the problems in one batch, or row by row?'),
            __('Batch'), __('Row by row'));
        if (mode === null) { notify('info', __('Glossary check aborted')); return []; }
        cfg.mode = mode ? 'batch' : 'per-row';

        if (cfg.mode === 'per-row') {
            const create = await askChoice(
                __('Create changes requested'),
                __('Do you want to request changes, or reject the translations?'),
                __('Create'), __('Reject'));
            if (create === null) { notify('info', __('Glossary check aborted')); return []; }
            cfg.action = create ? 'changesrequested' : 'reject';
        }
    }

    // Merge the stored brand/ignore list from settings with anything configured.
    cfg.ignorePhrases = [...(cfg.ignorePhrases || []), ...await loadIgnoreList()];

    // ---- PHASE 1: scan, change nothing -------------------------------------
    const { findings, report, scanned } = scanRows(cfg);
    const byId = new Map(report.map((r) => [r.row, r]));

    window.glossaryQaLast = findings.map(({ row, ...rest }) => rest);

    if (findings.length === 0) {
        notify('info', __('Glossary check is ready: no problems found'));
        return report;
    }

    // Row by row: act directly on every flagged row, like before.
    if (cfg.mode === 'per-row') {
        for (const item of findings) {
            await processRow(item, cfg, byId.get(item.rowId));
        }
        notify('info', __('Glossary Check is ready'));
        return report;
    }

    // ---- PHASE 2 (batch / dry run): show the problems, let the user decide --
    const decision = await showReviewModal(findings, scanned, cfg);
    window.glossaryQaLastNote = decision ? decision.note : '';

    if (!decision || decision.action === 'cancel' || decision.action === 'close') {
        if (!cfg.dryRun) notify('info', __('Glossary check aborted, nothing was changed'));
        return report;
    }

    const chosen = findings.filter((f) => decision.ids.includes(f.rowId));
    findings
        .filter((f) => !decision.ids.includes(f.rowId))
        .forEach((f) => { byId.get(f.rowId).status = 'skipped-by-user'; });

    if (chosen.length === 0) {
        notify('info', __('No rows selected, nothing was changed'));
        return report;
    }

    await bulkChangesRequested(chosen, decision.note, decision.action === 'bulk-send', cfg, byId);
    return report;
}

// Two-button question via the addon's cuteAlert.
// Resolves true (confirm), false (cancel button) or null (closed without a choice).
async function askChoice(title, message, confirmText, cancelText) {
    if (typeof cuteAlert !== 'function') {
        return confirm(`${message}\n\nOK = ${confirmText}\n${__('Cancel')} = ${cancelText}`);
    }
    const choice = await cuteAlert({
        type: 'question',
        title,
        message,
        confirmText,
        cancelText,
        myWindow: typeof currWindow !== 'undefined' ? currWindow : window,
    });
    console.log('[glossaryQA] modal choice:', choice);
    // cuteAlert versions differ in what they resolve with, so accept the common forms.
    if (choice === 'confirm' || choice === true) return true;
    if (choice === 'cancel' || choice === false) return false;
    const c = String(choice || '').toLowerCase();
    if (c && c === String(confirmText).toLowerCase()) return true;
    if (c && c === String(cancelText).toLowerCase()) return false;
    return null;
}

// =============================================================================
// SETUP
// =============================================================================

// Don't start while the page-open check is still running — the two overlap and
// cause save (403) errors. That check shows an indeterminate progress bar; wait
// for it to finish, and if it's still going after a timeout, warn and abort.
async function waitForPageCheck(options) {
    const barSelector = options.progressBarSelector || '.indeterminate-progress-bar';
    const running = () => {
        const bar = document.querySelector(barSelector);
        return !!bar && getComputedStyle(bar).display !== 'none' && bar.getClientRects().length > 0;
    };
    if (!running()) return true;

    const hasSpinner = typeof showTranslationSpinner === 'function'
        && typeof hideTranslationSpinner === 'function';
    if (hasSpinner) showTranslationSpinner(__('Waiting for the page check to finish…'));
    const cleared = await waitFor(() => !running(), options.progressWait || 60000, 250);
    if (hasSpinner) hideTranslationSpinner();

    if (!cleared) {
        notify('warning', __('The page check is still running — wait until it finishes, then run the glossary check again.'));
        return false;
    }
    return true;
}

function buildConfig(options) {
    // Detect the current locale from the page. checkLocale() is provided by the
    // addon; options.locale is only an override for console testing.
    const rawLocale = options.locale
        || (typeof checkLocale === 'function' ? checkLocale() : null)
        || 'nl';
    const locale = String(rawLocale).toLowerCase().split(/[_-]/)[0];
    const profile = LOCALES[locale] || LOCALES.nl;

    return {
        locale,
        warningText: __('Please translate the glossary term(s) as declared within the glossary shown below:'),

        // --- selectors: editor (per-row mode) -------------------------------
        glossaryWordSelector: '.glossary-word',
        translationTextSelector: '.translation-text',
        glossaryCheckboxSelector: 'input[name="feedback_reason"][value="glossary"]',
        standardTextSelector: 'textarea[name="feedback_comment"]',
        translatorSelector: 'a[href*="profiles.wordpress.org"]',
        rejectSelector: 'button.reject',
        changesRequestedSelector: 'button.changesrequested',
        editSelector: 'a.action.edit',
        metaTabSelector: 'li.tab-meta',
        activeTabClass: 'current',

        // --- selectors: bulk toolbar (batch mode) ---------------------------
        rowCheckboxSelector: 'th.checkbox input[type="checkbox"]',   // per-row tick box in the table
        bulkFormSelector: 'form.bulk-actions, #bulk-actions-toolbar-top, #bulk-actions-toolbar-bottom',
        bulkActionSelector: 'select[name="bulk[action]"], #bulk-action, select.bulk-action',
        // The bulk dropdown has a "Reject" entry; "Apply" then opens a text box
        // for the feedback, which is saved with its own button.
        bulkActionValues: ['reject'],
        bulkActionLabel: /^\s*(reject|afwijzen)\s*$/i,     // fallback on option text
        bulkApplySelector: 'input[type="submit"], button[type="submit"], .button, button',
        bulkApplyLabel: /apply|toepassen/i,
        bulkReasonSelector: 'input[name="feedback_reason"][value="glossary"]',  // ticked if present
        bulkCommentSelector: 'textarea',                    // the text box that opens after Apply
        bulkSaveSelector: 'button, input[type="submit"], input[type="button"]',
        bulkSaveLabel: /save|opslaan|submit|reject|afwijzen|send|verstuur|verzend|bevestig|confirm|ok\b/i,
        bulkCancelLabel: /cancel|annuleer|annuleren|close|sluit|sluiten|^\s*[×x✕]\s*$/i,
        bulkPreferBottom: true,   // use the toolbar under the table when there are two

        // --- behaviour -------------------------------------------------------
        action: 'changesrequested',
        matchMode: 'prefix',
        exactTerms: profile.exactTerms,
        singular: profile.singular,
        inflectionMatch: profile.inflectionMatch,
        prefixLength: profile.prefixLength,
        stemSlack: profile.stemSlack,

        onlyRow: null,
        statuses: ['waiting'],
        ignorePhrases: [],
        excerptLength: 80,        // chars of the original shown in the bulk note
        openTimeout: 5000,
        buttonTimeout: 4000,
        pollStep: 200,
        dryRun: DryRun,
        logActions: false,
        logHighlight: false,
        highlightStep: 250,
        actionDelay: 2000,
        saveTimeout: 180000,
        bulkDialogTimeout: 60000, // ms to wait for the WordPress reject dialog after Apply      // ms to keep the spinner up while the bulk save runs
        ...options,
    };
}

// =============================================================================
// PHASE 1 — SCAN
// =============================================================================
function scanRows(cfg) {
    const statuses = cfg.statuses || ['waiting'];
    const statusSelector = statuses.map((s) => `tr.preview.status-${s}`).join(', ');
    const rows = [...document.querySelectorAll(statusSelector)];
    const report = [];
    const findings = [];
    let scanned = 0;

    for (const row of rows) {
        if (cfg.onlyRow && !(row.id || '').includes(cfg.onlyRow)) continue;

        const commentEl = document.querySelector('#editor-' + row.id + ' .source-details__comment p');
        if (commentEl && typeof checkComments === 'function'
            && checkComments(commentEl.innerText.trim()) === false) continue;

        const original = row.querySelector('td.original');
        let glossaryWords = original ? [...original.querySelectorAll(cfg.glossaryWordSelector)] : [];
        glossaryWords = dropProtected(glossaryWords, original, cfg);
        glossaryWords = glossaryWords.filter((w) => expectedFor(w).length > 0);
        if (glossaryWords.length === 0) continue;

        scanned++;
        const translation = readTranslation(row, cfg);
        const missing = unmetGlossary(glossaryWords, translation, cfg);

        if (missing.length === 0) {
            report.push({ row: row.id, status: 'ok' });
            continue;
        }

        const editor = getEditorFor(row);
        const originalText = ((original && (original.querySelector('.original-text') || original)).textContent || '')
            .replace(/\s+/g, ' ').trim();

        findings.push({
            rowId: row.id,
            row,
            original: originalText,
            translation,
            missing,
            translator: editor ? translatorName(editor, cfg) : '',
            handle: editor ? translatorHandle(editor, cfg) : '',
        });
        report.push({
            row: row.id,
            status: cfg.dryRun ? 'would-flag' : 'flagged',
            missing,
            translation,
        });
    }
    return { findings, report, scanned };
}

// =============================================================================
// PHASE 2a — REVIEW MODAL
// Resolves with { action, ids, note } or null.
// =============================================================================
function showReviewModal(findings, scanned, cfg) {
    return new Promise((resolve) => {
        const el = (tag, style, text) => {
            const n = document.createElement(tag);
            if (style) n.style.cssText = style;
            if (text != null) n.textContent = text;
            return n;
        };

        const selected = new Set(findings.map((f) => f.rowId));
        let noteEdited = false;

        // --- frame ---
        const overlay = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100000;display:flex;align-items:center;justify-content:center;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;');
        const box = el('div', 'background:#fff;color:#1d2327;width:min(1100px,95vw);max-height:90vh;display:flex;flex-direction:column;border-radius:6px;box-shadow:0 10px 40px rgba(0,0,0,.3);');
        overlay.appendChild(box);

        const header = el('div', 'padding:14px 18px;border-bottom:1px solid #dcdcde;');
        header.appendChild(el('h2', 'margin:0 0 4px;font-size:17px;', __('Glossary check: problems found')));
        const summary = el('div', 'color:#50575e;');
        header.appendChild(summary);
        box.appendChild(header);

        // --- toolbar: select all + translator filter ---
        const toolbar = el('div', 'padding:8px 18px;display:flex;gap:16px;align-items:center;border-bottom:1px solid #f0f0f1;');
        const allLabel = el('label', 'display:flex;gap:6px;align-items:center;cursor:pointer;');
        const allBox = el('input');
        allBox.type = 'checkbox';
        allBox.checked = true;
        allLabel.append(allBox, document.createTextNode(__('Select all')));
        toolbar.appendChild(allLabel);

        const translators = [...new Set(findings.map((f) => f.translator || ''))];
        let filterSel = null;
        if (translators.length > 1) {
            const fl = el('label', 'display:flex;gap:6px;align-items:center;');
            fl.appendChild(document.createTextNode(__('Translator') + ':'));
            filterSel = el('select');
            filterSel.appendChild(new Option(__('All'), '*'));
            translators.forEach((n) => filterSel.appendChild(new Option(n || __('(unknown)'), n)));
            fl.appendChild(filterSel);
            toolbar.appendChild(fl);
            toolbar.appendChild(el('span', 'color:#8c8f94;', __('Tip: one batch per translator keeps each mail personal.')));
        }
        box.appendChild(toolbar);

        // --- findings table ---
        const scroll = el('div', 'overflow:auto;flex:1 1 auto;min-height:120px;padding:0 18px;');
        const table = el('table', 'width:100%;border-collapse:collapse;');
        const thead = el('thead');
        const hr = el('tr', 'text-align:left;position:sticky;top:0;background:#fff;');
        ['', __('Original'), __('Translation'), __('Missing glossary term(s)'), __('Translator')]
            .forEach((h) => hr.appendChild(el('th', 'padding:8px 6px;border-bottom:2px solid #dcdcde;', h)));
        thead.appendChild(hr);
        table.appendChild(thead);
        const tbody = el('tbody');
        table.appendChild(tbody);
        scroll.appendChild(table);
        box.appendChild(scroll);

        const boxes = new Map();
        const trs = new Map();
        for (const f of findings) {
            const tr = el('tr', 'border-bottom:1px solid #f0f0f1;vertical-align:top;');
            const c0 = el('td', 'padding:6px;');
            const cb = el('input');
            cb.type = 'checkbox';
            cb.checked = true;
            cb.addEventListener('change', () => {
                cb.checked ? selected.add(f.rowId) : selected.delete(f.rowId);
                refresh();
            });
            c0.appendChild(cb);
            boxes.set(f.rowId, cb);

            const orig = el('td', 'padding:6px;cursor:pointer;color:#2271b1;', excerpt(f.original, 140));
            orig.title = __('Show this row in the table');
            orig.addEventListener('click', () => flashRow(f.row));

            const tr2 = el('td', 'padding:6px;', excerpt(f.translation, 140));
            const miss = el('td', 'padding:6px;white-space:pre-line;', f.missing.map(formatMissingLine).join('\n'));
            const who = el('td', 'padding:6px;color:#50575e;',
                [f.translator, f.handle ? `@${f.handle}` : ''].filter(Boolean).join('\n') || '—');
            who.style.whiteSpace = 'pre-line';

            tr.append(c0, orig, tr2, miss, who);
            tbody.appendChild(tr);
            trs.set(f.rowId, tr);
        }

        // --- editable note ---
        const noteWrap = el('div', 'padding:10px 18px;border-top:1px solid #dcdcde;');
        const noteHead = el('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;');
        noteHead.appendChild(el('strong', '', __('Note for the bulk request (you can edit it)')));
        const regen = el('a', 'cursor:pointer;color:#2271b1;', __('Regenerate'));
        regen.addEventListener('click', () => { noteEdited = false; refresh(); });
        noteHead.appendChild(regen);
        noteWrap.appendChild(noteHead);
        const note = el('textarea', 'width:100%;height:130px;font:12px/1.4 monospace;box-sizing:border-box;');
        note.addEventListener('input', () => { noteEdited = true; });
        noteWrap.appendChild(note);
        box.appendChild(noteWrap);

        // --- buttons ---
        const footer = el('div', 'padding:12px 18px;border-top:1px solid #dcdcde;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;');
        box.appendChild(footer);
        const btnBase = 'padding:6px 12px;border-radius:3px;cursor:pointer;font-size:13px;border:1px solid #2271b1;';
        const button = (label, kind, onClick) => {
            const styles = {
                primary: 'background:#2271b1;color:#fff;',
                secondary: 'background:#f6f7f7;color:#2271b1;',
                danger: 'background:#fff;color:#b32d2e;border-color:#b32d2e;',
            };
            const b = el('button', btnBase + styles[kind], label);
            b.type = 'button';
            b.addEventListener('click', onClick);
            footer.appendChild(b);
            return b;
        };

        const finish = (action) => {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            resolve({ action, ids: [...selected], note: note.value });
        };
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish('cancel'); } };
        document.addEventListener('keydown', onKey, true);

        const actionButtons = [];
        if (cfg.dryRun) {
            button(__('Copy note'), 'secondary', async () => {
                await copyToClipboard(note.value);
                notify('info', __('Note copied to clipboard'));
            });
            button(__('Close'), 'primary', () => finish('close'));
        } else {
            button(__('Cancel'), 'secondary', () => finish('cancel'));
            actionButtons.push(button(__('Bulk reject: prepare, I save myself'), 'secondary', () => finish('bulk-prepare')));
            actionButtons.push(button(__('Bulk reject: save now'), 'primary', () => finish('bulk-send')));
        }

        // --- live state ---
        function visibleFindings() {
            const who = filterSel ? filterSel.value : '*';
            return findings.filter((f) => who === '*' || (f.translator || '') === who);
        }
        function refresh() {
            const vis = new Set(visibleFindings().map((f) => f.rowId));
            for (const f of findings) {
                trs.get(f.rowId).style.display = vis.has(f.rowId) ? '' : 'none';
                // rows hidden by the filter are never part of the batch
                if (!vis.has(f.rowId)) { selected.delete(f.rowId); boxes.get(f.rowId).checked = false; }
            }
            const chosen = findings.filter((f) => selected.has(f.rowId));
            allBox.checked = chosen.length > 0 && chosen.length === vis.size;
            summary.textContent = qaSprintf(__('%1$s of %2$s checked rows have missing glossary terms — %3$s selected'),
                findings.length, scanned, chosen.length)
                + (cfg.dryRun ? ` — ${__('DRY RUN: nothing will be changed')}` : '');
            if (!noteEdited) note.value = formatBulkMessage(chosen, cfg);
            actionButtons.forEach((b) => { b.disabled = chosen.length === 0; b.style.opacity = chosen.length ? '1' : '.5'; });
        }

        allBox.addEventListener('change', () => {
            for (const f of visibleFindings()) {
                boxes.get(f.rowId).checked = allBox.checked;
                allBox.checked ? selected.add(f.rowId) : selected.delete(f.rowId);
            }
            refresh();
        });
        if (filterSel) filterSel.addEventListener('change', () => {
            visibleFindings().forEach((f) => { selected.add(f.rowId); boxes.get(f.rowId).checked = true; });
            refresh();
        });

        refresh();
        document.body.appendChild(overlay);
    });
}

function flashRow(row) {
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const old = row.style.outline;
    row.style.outline = '3px solid #dba617';
    setTimeout(() => { row.style.outline = old; }, 2000);
}

// =============================================================================
// PHASE 2b — BULK: tick rows, choose "Reject", Apply, paste note, (save)
// =============================================================================
// Wrapper: the spinner is shown from the moment the choice is made until the
// whole bulk action is done (or handed back to the user). Messages are shown
// only after the spinner is gone, so the two never overlap.
async function bulkChangesRequested(items, noteText, autoSubmit, cfg, byId) {
    const spinner = startSpinner(autoSubmit
        ? __('Rejecting the selected rows, please wait…')
        : __('Preparing the bulk reject, please wait…'));
    let result;
    try {
        result = await bulkRun(items, noteText, autoSubmit, cfg, byId, spinner);
    } catch (err) {
        result = ['warning', String(err && err.message || err)];
    } finally {
        spinner.stop();
    }
    if (result && result.focus) {
        result.focus.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof result.focus.focus === 'function') result.focus.focus();
    }
    if (result) notify(result[0], result[1]);
}

async function bulkRun(items, noteText, autoSubmit, cfg, byId, spinner) {
    const setStatus = (status) => items.forEach((it) => { byId.get(it.rowId).status = status; });

    // 1. Tick exactly the chosen rows in the translations table.
    document.querySelectorAll(`tr.preview ${cfg.rowCheckboxSelector}`)
        .forEach((cb) => { if (cb.checked) cb.click(); });

    let ticked = 0;
    for (const it of items) {
        const cb = it.row.querySelector(cfg.rowCheckboxSelector);
        if (cb) {
            if (!cb.checked) cb.click();
            ticked++;
        } else {
            byId.get(it.rowId).status = 'no-row-checkbox';
        }
        highlightMissing(it.row, it.missing, cfg);
    }
    if (ticked === 0) {
        await copyToClipboard(noteText);
        return ['warning', __('Could not tick the rows in the table. The note is on your clipboard.')];
    }

    // Always keep a copy of the note on the clipboard, as a safety net.
    await copyToClipboard(noteText);

    // 2. Pick the bulk toolbar and choose "Reject" in the dropdown.
    const form = pickBulkForm(cfg);
    const select = form && form.querySelector(cfg.bulkActionSelector);
    const option = select && ([...select.options].find((o) => cfg.bulkActionValues.includes(o.value))
        || [...select.options].find((o) => cfg.bulkActionLabel.test(o.textContent)));

    if (!option) {
        setStatus('bulk-option-missing');
        return Object.assign(['warning', __('The rows are ticked, but the bulk "Reject" option was not found. The note is on your clipboard: choose Reject, click Apply and paste it.')], { focus: form });
    }
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));

    // 3. Click "Apply" — that opens the feedback text box.
    const apply = [...form.querySelectorAll(cfg.bulkApplySelector)]
        .find((b) => b !== select && cfg.bulkApplyLabel.test(b.value || b.textContent || ''));
    if (!apply) {
        setStatus('bulk-apply-missing');
        return Object.assign(['warning', __('Rows ticked and "Reject" chosen, but the Apply button was not found. Click Apply yourself; the note is on your clipboard.')], { focus: form });
    }
    if (cfg.logActions) console.log('[glossaryQA] BULK APPLY', items.map((i) => i.rowId));
    apply.click();

    // 4. Wait for the text box that Apply opened (a visible textarea that is not
    //    inside a row editor), tick the glossary reason if offered, paste.
    const comment = await waitForEl(() =>
        [...document.querySelectorAll(cfg.bulkCommentSelector)].find((ta) =>
            ta.getClientRects().length > 0 && !ta.closest('tr.editor, .editor')),
        cfg.bulkDialogTimeout, 200);

    if (!comment) {
        setStatus('bulk-textbox-missing');
        return ['warning', __('Apply was clicked, but the text box did not appear. Paste the note yourself; it is on your clipboard.')];
    }

    // The reason checkbox may sit anywhere in the dialog: search upwards too.
    const reason = findUpwards(comment, (scope) =>
        [...scope.querySelectorAll(cfg.bulkReasonSelector)].find((r) => !r.closest('tr.editor, .editor')));
    if (reason && !reason.checked) reason.click();

    comment.value = noteText;
    comment.dispatchEvent(new Event('input', { bubbles: true }));
    comment.dispatchEvent(new Event('change', { bubbles: true }));

    // 5. Save, or leave it for the user.
    //    Dialog buttons often live in a button bar OUTSIDE the form that holds
    //    the textarea, so walk up from the textarea until a matching visible
    //    button turns up (never the Apply button, never inside a row editor).
    const isSave = (b) => b !== apply
        && b.getClientRects().length > 0
        && !b.closest('tr.editor, .editor')
        && !b.disabled
        && cfg.bulkSaveLabel.test(buttonLabel(b))
        && !cfg.bulkApplyLabel.test(buttonLabel(b));
    // The nearest group of visible buttons around the text box.
    const nearButtons = () => findUpwards(comment, (scope) => {
        const list = [...scope.querySelectorAll('button, input[type="submit"], input[type="button"], a.button')]
            .filter((b) => b.getClientRects().length > 0 && b !== apply && !b.closest('tr.editor, .editor'));
        return list.length ? list : null;
    }) || [];
    // One poll that tries both: a button with a known label, or — fallback —
    // the only non-cancel button next to the text box, whatever its label.
    const findSave = () => {
        const byLabel = findUpwards(comment, (scope) =>
            [...scope.querySelectorAll(cfg.bulkSaveSelector)].find(isSave));
        if (byLabel) return byLabel;
        const candidates = nearButtons().filter((b) => !cfg.bulkCancelLabel.test(buttonLabel(b)) && !b.disabled);
        return candidates.length === 1 ? candidates[0] : null;
    };
    const save = await waitForEl(findSave, cfg.buttonTimeout, 100);
    const near = save ? [] : nearButtons();

    const describe = (b) => `"${buttonLabel(b)}" <${b.tagName.toLowerCase()}`
        + (b.id ? ` id="${b.id}"` : '') + (b.className ? ` class="${b.className}"` : '') + '>';
    if (save) {
        if (cfg.logActions) console.log('[glossaryQA] save button:', describe(save));
    } else if (autoSubmit) {
        // Plain text, so it is readable without expanding anything.
        console.warn('[glossaryQA] save button not found. Visible buttons near the text box:\n'
            + (near.length ? near.map(describe).join('\n') : '(none)'));
    }

    if (autoSubmit && save) {
        setStatus('bulk-rejected-with-note');
        if (cfg.logActions) console.log('[glossaryQA] BULK SAVE', items.map((i) => i.rowId));

        // Saving can take a while on translate.wordpress.org. Show the spinner
        // until the text box is gone (dialog closed) or the page reloads — a
        // reload ends this script and removes the spinner by itself.
        spinner.update(__('Saving the bulk reject, please wait…'));
        save.click();
        const closed = await waitFor(
            () => !comment.isConnected || comment.getClientRects().length === 0,
            cfg.saveTimeout, 500);

        if (closed) {
            return ['info', __('Glossary check is ready: the selected rows were rejected with the note.')];
        }
        setStatus('bulk-save-slow');
        return ['warning', __('Saving is taking longer than expected. Check the page before running the check again.')];
    }

    setStatus('bulk-prepared');
    return Object.assign([autoSubmit ? 'warning' : 'info', autoSubmit
        ? __('The note is filled in, but the save button was not found. Please click it yourself.')
        : __('Everything is ready: check the ticked rows and the note, then click save yourself.')], { focus: comment });
}

// Show a waiting spinner. Uses the addon's spinner when available, otherwise a
// small overlay of our own. Returns { stop() }.
function startSpinner(message) {
    if (typeof showTranslationSpinner === 'function' && typeof hideTranslationSpinner === 'function') {
        let on = true;
        showTranslationSpinner(message);
        return {
            update: (msg) => { if (on) { hideTranslationSpinner(); showTranslationSpinner(msg); } },
            stop: () => { if (on) { on = false; hideTranslationSpinner(); } },
        };
    }
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.6);z-index:100001;'
        + 'display:flex;align-items:center;justify-content:center;font:14px sans-serif;';
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;gap:10px;align-items:center;background:#fff;padding:14px 18px;'
        + 'border-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,.2);';
    const wheel = document.createElement('div');
    wheel.style.cssText = 'width:18px;height:18px;border:3px solid #dcdcde;border-top-color:#2271b1;'
        + 'border-radius:50%;';
    wheel.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 800, iterations: Infinity });
    const label = document.createTextNode(message);
    box.append(wheel, label);
    ov.appendChild(box);
    document.body.appendChild(ov);
    return { update: (msg) => { label.textContent = msg; }, stop: () => ov.remove() };
}

// Visible text of a button-like element (value for <input>, text otherwise).
function buttonLabel(b) {
    return String(b.value || b.textContent || b.getAttribute('aria-label') || b.title || '').trim();
}

// Run `finder(scope)` on the element's ancestors, nearest first, and return
// the first truthy result. Stops at <body>.
function findUpwards(el, finder) {
    for (let scope = el.parentElement; scope && scope !== document.documentElement; scope = scope.parentElement) {
        const hit = finder(scope);
        if (hit) return hit;
        if (scope === document.body) break;
    }
    return null;
}

// The bulk toolbar(s). GlotPress can render one above and one below the table.
function pickBulkForm(cfg) {
    const forms = [...document.querySelectorAll(cfg.bulkFormSelector)]
        .filter((f) => !f.closest('tr.editor, .editor'));
    const visible = forms.filter((f) => f.getClientRects().length > 0);
    const pool = visible.length ? visible : forms;
    return cfg.bulkPreferBottom ? pool[pool.length - 1] : pool[0];
}

// Find an element of the bulk feedback form: first inside the toolbar, then
// anywhere on the page (a modal), but never inside a row editor.
function findBulkEl(selector, form, mustBeVisible) {
    const ok = (el) => !el.closest('tr.editor, .editor') && (!mustBeVisible || el.getClientRects().length > 0);
    const inForm = form ? [...form.querySelectorAll(selector)].find(ok) : null;
    return inForm || [...document.querySelectorAll(selector)].find(ok) || null;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
        ta.remove();
        return ok;
    }
}

// =============================================================================
// PHASE 2c — PER ROW (the original behaviour)
// =============================================================================
async function processRow(item, cfg, entry) {
    const { row, missing: missingInfo } = item;
    try {
        const editor = await openEditor(row, cfg);
        if (!editor) {
            entry.status = 'editor-not-active';
            closeEditor(row, cfg);
            return;
        }

        if (cfg.action === 'reject') {
            activateMetaTab(editor, row, cfg);
            const rej = await waitForEl(() => visibleEl(editor.querySelector(cfg.rejectSelector)), cfg.buttonTimeout);
            if (rej) {
                highlightMissing(row, missingInfo, cfg);
                rej.click();
                entry.status = 'rejected';
            } else {
                entry.status = 'reject-button-missing';
                closeEditor(row, cfg);
            }
            await wait(cfg.actionDelay);
            return;
        }

        if (cfg.logActions) console.log('[glossaryQA] START', row.id, '|', missingInfo.map((m) => m.word).join(', '));
        activateMetaTab(editor, row, cfg);
        const checkbox = await waitForEl(() => editor.querySelector(cfg.glossaryCheckboxSelector), cfg.buttonTimeout);
        if (!checkbox) {
            entry.status = 'feedback-form-not-ready';
            closeEditor(row, cfg);
            return;
        }

        await wait(cfg.pollStep);
        activateMetaTab(editor, row, cfg);
        if (!checkbox.checked) checkbox.click();   // single tick; native change does the rest

        const tb = editor.querySelector(cfg.standardTextSelector);
        if (tb) {
            tb.value = formatRowMessage(missingInfo, translatorHandle(editor, cfg), translatorName(editor, cfg), cfg);
            tb.dispatchEvent(new Event('input', { bubbles: true }));
            tb.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const btn = await waitForEl(() => visibleEl(editor.querySelector(cfg.changesRequestedSelector)), cfg.buttonTimeout);
        if (btn) {
            highlightMissing(row, missingInfo, cfg);
            if (cfg.logActions) console.log('[glossaryQA] CLICK', row.id, '| nonce:', btn.getAttribute('data-nonce'));
            try { btn.click(); } catch (clickErr) {
                if (cfg.logActions) console.warn('[glossaryQA] click threw', row.id, clickErr && clickErr.message);
            }
            entry.status = 'changes-requested';
            for (let i = 0; i < 6; i++) {
                await wait(cfg.highlightStep);
                highlightMissing(row, missingInfo, cfg);
            }
        } else {
            entry.status = 'changesrequested-not-shown';
            closeEditor(row, cfg);
        }
        await wait(cfg.actionDelay);
    } catch (err) {
        entry.status = 'action-error';
        entry.error = String(err && err.message || err);
    }
}

// =============================================================================
// MESSAGES
// =============================================================================
function formatMissingLine(m) {
    const exp = (m.expected || []).join(', ');
    const count = m.needed > 1 ? ` (${m.found}/${m.needed})` : '';
    return exp ? `• ${m.word} → ${exp}${count}` : `• ${m.word}${count}`;
}

// "@handle" — a wordpress.org mention, so the translator gets a mail even
// without opt-in. Falls back to "@Display Name" if no handle could be read.
function mention(handle, name) {
    if (handle) return `@${handle}`;
    return name ? `@${name}` : '';
}

// Note for a single row (per-row mode).
function formatRowMessage(missing, handle, name, cfg) {
    const who = mention(handle, name);
    const greeting = who ? [qaSprintf(__('Hi %s,'), who)] : [];
    return [...greeting, cfg.warningText, ...missing.map(formatMissingLine)].join('\n');
}

// One combined note for a batch. Each string gets a short quote of the original
// so the translator can find it. With several translators the entries are
// grouped per translator; with one, the note opens with a personal greeting.
function formatBulkMessage(items, cfg) {
    if (!items.length) return '';
    const groups = new Map();
    for (const it of items) {
        const k = mention(it.handle, it.translator);   // "@handle" (or '' if unknown)
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(it);
    }
    const single = groups.size === 1;
    const out = [];
    const onlyWho = [...groups.keys()][0];
    if (single && onlyWho) out.push(qaSprintf(__('Hi %s,'), onlyWho));
    out.push(cfg.warningText);

    for (const [who, list] of groups) {
        if (!single) out.push('', `— ${who || '?'} —`);
        for (const it of list) {
            out.push('', `"${excerpt(it.original, cfg.excerptLength)}"`);
            it.missing.forEach((m) => out.push(formatMissingLine(m)));
        }
    }
    return out.join('\n');
}

function excerpt(s, n) {
    s = (s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// =============================================================================
// MATCHING ENGINE (unchanged)
// =============================================================================
function readTranslation(row, cfg) {
    const cell = row.querySelector('td.translation');
    if (!cell) return '';
    const parts = [...cell.querySelectorAll(cfg.translationTextSelector)];
    const text = parts.length ? parts.map((n) => n.textContent).join(' ') : cell.textContent;
    return text.trim();
}

// Returns the glossary translations of a glossary-word span. Empty, unparseable
// or placeholder ("-", "?") translations count as "no translation" -> [].
function expectedFor(wordSpan) {
    let list;
    try {
        list = JSON.parse(wordSpan.dataset.translations || '[]');
    } catch (e) {
        return [];
    }
    if (!Array.isArray(list)) return [];
    return list
        .map((e) => String((e && e.translation) || '').trim())
        .filter((x) => x && !/^[-–—_?.\s]+$/.test(x));
}

// Returns a list of glossary terms that aren't translated enough times.
function unmetGlossary(glossaryWords, translationText, cfg) {
    const haystack = normalize(translationText);
    const tokens = haystack
        .split(/[^\p{L}\p{N}-]+/u)
        .map((x) => x.replace(/^-+|-+$/g, ''))
        .filter(Boolean);

    const groups = new Map();
    for (const w of glossaryWords) {
        const key = normalize(w.textContent);
        if (!key) continue;
        const expected = expectedFor(w);
        if (expected.length === 0) continue;
        if (!groups.has(key)) {
            groups.set(key, { word: w.textContent.trim(), count: 0, expectedRaw: [], candidates: [] });
        }
        const g = groups.get(key);
        g.count += 1;
        for (const raw of expected) {
            if (!g.expectedRaw.includes(raw)) g.expectedRaw.push(raw);
            for (const cand of raw.split(/[\/,;|]+/).map(normalize).filter(Boolean)) {
                if (!g.candidates.includes(cand)) g.candidates.push(cand);
            }
        }
    }

    const missing = [];
    for (const g of groups.values()) {
        if (g.candidates.length === 0) continue;
        const singleCands = g.candidates.filter((c) => !/\s/.test(c));
        const phraseCands = g.candidates.filter((c) => /\s/.test(c));
        const phraseSatisfied = phraseCands.some((phrase) =>
            phrase.split(/\s+/).filter(Boolean)
                .every((wordCand) => tokens.some((tok) => tokenMatches(tok, [wordCand], g.word, cfg)))
        );

        const used = new Array(tokens.length).fill(false);
        let found = 0;
        for (let need = 0; need < g.count; need++) {
            const idx = singleCands.length
                ? tokens.findIndex((tok, i) => !used[i] && tokenMatches(tok, singleCands, g.word, cfg))
                : -1;
            if (idx !== -1) { used[idx] = true; found += 1; continue; }
            if (phraseSatisfied) { found += 1; continue; }
            break;
        }
        if (found < g.count) {
            missing.push({ word: g.word, expected: g.expectedRaw, needed: g.count, found });
        }
    }
    return missing;
}

function tokenMatches(tok, candidates, sourceWord, cfg) {
    const src = normalize(sourceWord);
    const terms = cfg.exactTerms || [];
    const singular = cfg.singular || ((w) => w);
    const stems = terms.map(singular);
    const isExactTerm = (w) => stems.includes(singular(w));

    return candidates.some((cand) => {
        if (isExactTerm(cand) || isExactTerm(src)) {
            return singular(tok) === singular(cand);
        }
        if (tok.includes(cand)) return true;
        if (cand === src) return false;
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

// =============================================================================
// DOM HELPERS (unchanged)
// =============================================================================
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
    const opener = () => row.querySelector(editSelector) || row.querySelector('td.translation') || row;

    for (let attempt = 0; attempt < 2; attempt++) {
        if (!visible(getEditorFor(row))) opener().click();
        const ok = await waitFor(() => visible(getEditorFor(row)), Math.ceil(timeout / 2));
        if (ok) return getEditorFor(row);
    }
    return null;
}

function activateMetaTab(editor, row, cfg) {
    const rowId = (row.id || '').replace(/^preview-/, '');
    const tab = editor.querySelector(cfg.metaTabSelector)
        || document.querySelector(`${cfg.metaTabSelector}[data-row-id="${rowId}"]`);
    if (tab && !tab.classList.contains(cfg.activeTabClass)) tab.click();
    return tab;
}

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
            return true;
        }
        const end = start + span.textContent.length;
        const inside = ranges.some(([bs, be]) => bs <= start && end <= be && (be - bs) > (end - start));
        return !inside;
    });
}

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

// The translator's wordpress.org username (handle), used for the @-mention.
// Taken from the profile URL (profiles.wordpress.org/<handle>/), or else from
// the "(handle)" part of the link text. Returns '' if neither is found.
function translatorHandle(editor, cfg) {
    try {
        const link = editor.querySelector(cfg.translatorSelector);
        if (!link) return '';
        const fromUrl = (link.getAttribute('href') || '').match(/profiles\.wordpress\.org\/([^\/?#\s]+)/i);
        if (fromUrl) return decodeURIComponent(fromUrl[1]);
        const fromText = (link.textContent || '').match(/\(([^)\s]+)\)\s*$/);
        return fromText ? fromText[1] : '';
    } catch (e) {
        return '';
    }
}

function translatorName(editor, cfg) {
    try {
        const link = editor.querySelector(cfg.translatorSelector);
        if (!link) return '';
        return (link.textContent || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    } catch (e) {
        return '';
    }
}

function highlightMissing(row, missingInfo, cfg) {
    try {
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
                '| wanted:', [...wanted], '| spans:', spans.map((s) => (s.textContent || '').toLowerCase().trim()));
        }
        if (!spans.length || !wanted.size) return;
        spans.forEach((span) => {
            const x = (span.textContent || '').toLowerCase().trim();
            if (wanted.has(x) && expectedFor(span).length > 0) span.classList.add('highlight');
        });
    } catch (e) {
        if (cfg.logHighlight) console.warn('[glossaryQA] highlight error', row.id, e && e.message);
    }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

function visibleEl(el) {
    return el && el.getClientRects().length > 0 ? el : null;
}

async function waitForEl(getter, timeout = 3000, step = 150) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try { const el = getter(); if (el) return el; } catch (e) { /* keep waiting */ }
        await wait(step);
    }
    try { return getter() || null; } catch (e) { return null; }
}
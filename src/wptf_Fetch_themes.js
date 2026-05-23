// contentscript.js

let PER_PAGE = 100;
let currentPage = 1;
let START_PAGE = 1;
let stopRequested = false;
let DAYS_AGO = 7;
let PROJECT_TYPE = 'themes';
let LOCALE = mycheckLocale() || 'en-gb';
let SLUG_TYPE = 'default';
let settingsDone = false;
let SHOW_RECORDS = true;
let MODE = 'originals';
let USE_FAVORITES = false;
let WP_USERNAME = '';
let ONLY_ZERO_PERCENT = false;

function mycheckLocale() {
  const NON_LOCALE = ['dev', 'stable', 'readme', 'trunk', 'default', 'formal', 'projects', 'wp-plugins', 'wp-themes'];
  const parts = window.location.pathname.split('/').filter(Boolean);
  for (const part of parts) {
    if (NON_LOCALE.includes(part)) continue;
    if (/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(part)) {
      return part;
    }
  }
  return null;
}

async function fetchFavoriteSlugs() {
  const profileUrl = `https://profiles.wordpress.org/${WP_USERNAME}/`;
  console.log(`[WP Originals] Fetching favorites from: ${profileUrl}`);

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'fetchFavorites', url: profileUrl },
      (response) => {
        if (!response?.success) {
          console.error('[WP Originals] Background fetch failed:', response?.error);
          resolve([]);
          return;
        }

        const favParser  = new DOMParser();
        const favDoc     = favParser.parseFromString(response.html, 'text/html');
        const favSection = favDoc.querySelector('#content-favorites');

        if (!favSection) {
          console.warn('[WP Originals] No favorites section found — are you logged into wordpress.org?');
          resolve([]);
          return;
        }

        const slugs = [];
        const links = favSection.querySelectorAll('a[href]');

        links.forEach(link => {
          const href        = link.getAttribute('href');
          const pluginMatch = href.match(/\/plugins\/([^/]+)\//);
          const themeMatch  = href.match(/\/themes\/([^/]+)\//);
          const match       = PROJECT_TYPE === 'plugins' ? pluginMatch : themeMatch;
          if (match && match[1] && !slugs.includes(match[1])) {
            slugs.push(match[1]);
          }
        });

        console.log(`[WP Originals] Found ${slugs.length} favorite ${PROJECT_TYPE}:`, slugs);
        resolve(slugs);
      }
    );
  });
}

async function loadRecentOriginals(page) {

  if (!settingsDone) {
    showSettings();
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_AGO);
  stopRequested = false;

  console.log(`[WP Originals] Starting page ${page}, mode: ${MODE}, cutoff: ${cutoff.toDateString()}`);

  const existing = document.getElementById('wp-originals-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'wp-originals-overlay';
  container.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    width: 420px; max-height: 85vh; overflow-y: auto;
    background: white; border: 1px solid #ccc;
    padding: 14px; z-index: 99999; font-size: 13px;
    font-family: sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    border-radius: 6px;
  `;

  const modeLabel = MODE === 'warnings' ? '⚠️ Warnings' : '🆕 New originals';

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <strong>${modeLabel} — ${MODE === 'originals' ? `last ${DAYS_AGO} days` : 'all'} (${LOCALE})</strong>
      <div style="display:flex; gap:6px;">
        <button id="btn-back" style="
          background:#888; color:white; border:none;
          padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
        ">⬅ Back</button>
        <button id="btn-quit" style="
          background:#cc0000; color:white; border:none;
          padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
        ">✕ Quit</button>
      </div>
    </div>
    <div style="color:#666; font-size:11px; margin-bottom:6px;">
      📂 ${PROJECT_TYPE === 'themes' ? 'Themes' : 'Plugins'} — wp-${PROJECT_TYPE} — ${SLUG_TYPE}
      ${USE_FAVORITES ? ` — ⭐ Favorites of ${WP_USERNAME}` : ''}
      ${ONLY_ZERO_PERCENT ? ' — 0% only' : ''} — starting page ${START_PAGE}
    </div>
    <div id="progress" style="color:#888; font-size:12px; margin:4px 0;"></div>
    <hr style="margin:8px 0;">
    <div id="results"></div>
    <div id="footer" style="margin-top:10px; text-align:center;"></div>
  `;
  document.body.appendChild(container);

  document.getElementById('btn-quit').addEventListener('click', () => {
    console.log('[WP Originals] Quit clicked.');
    stopRequested = true;
    container.remove();
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    console.log('[WP Originals] Back clicked.');
    stopRequested = true;
    settingsDone = false;
    loadRecentOriginals(START_PAGE);
  });

  const progress = document.getElementById('progress');
  const results  = document.getElementById('results');
  const footer   = document.getElementById('footer');

  try {
    let projects   = [];
    let totalPages = 1;

    if (USE_FAVORITES && WP_USERNAME) {
      // --- Favorites mode ---
      progress.textContent = `🔄 Fetching favorites for ${WP_USERNAME}...`;
      const slugs = await fetchFavoriteSlugs();

      if (slugs.length === 0) {
        progress.textContent = `✅ No favorite ${PROJECT_TYPE} found for ${WP_USERNAME} — make sure you are logged into wordpress.org.`;
        return;
      }

      projects   = slugs.map(slug => ({ slug, name: slug }));
      totalPages = 1;
      console.log(`[WP Originals] Using ${projects.length} favorites as project list`);

    } else if (ONLY_ZERO_PERCENT) {
      // --- 0% mode: fetch directly from locale page sorted by percent-completed-asc ---
      const localeUrl =
        `https://translate.wordpress.org/locale/${LOCALE}/${SLUG_TYPE}/wp-${PROJECT_TYPE}/` +
        `?s=&page=${page}&filter=percent-completed-asc`;

      console.log(`[WP Originals] Fetching 0% projects from: ${localeUrl}`);
      progress.textContent = `🔄 Fetching 0% ${PROJECT_TYPE} for ${LOCALE} — page ${page}...`;

      const localeRes  = await fetch(localeUrl);
      const localeHtml = await localeRes.text();

      const localeParser = new DOMParser();
      const localeDoc    = localeParser.parseFromString(localeHtml, 'text/html');

      // Debug — log what we find
      console.log('[0%] Total .project divs:', localeDoc.querySelectorAll('.project').length);
      console.log('[0%] percent-0 divs:', localeDoc.querySelectorAll('.project[class*="percent-0"]').length);
      console.log('[0%] First project classes:', localeDoc.querySelector('.project')?.className);
      console.log('[0%] First project HTML:', localeDoc.querySelector('.project')?.outerHTML.slice(0, 300));

      // Get total pages from pagination
      const lastPageLink = localeDoc.querySelector('.paging a:last-of-type');
      if (lastPageLink) {
        const lastPageMatch = lastPageLink.href.match(/page=(\d+)/);
        if (lastPageMatch) totalPages = parseInt(lastPageMatch[1]);
      }

      const allProjectDivs  = localeDoc.querySelectorAll('.project');
      const zeroProjectDivs = localeDoc.querySelectorAll('.project[class*="percent-0"]');

      console.log(`[WP Originals] Page ${page}: ${zeroProjectDivs.length} 0% projects out of ${allProjectDivs.length} total`);

      zeroProjectDivs.forEach(div => {
        const classes   = [...div.classList];
        const slugClass = classes.find(c => c.startsWith(`project-wp-${PROJECT_TYPE}-`));
        if (!slugClass) return;
        const slug   = slugClass.replace(`project-wp-${PROJECT_TYPE}-`, '');
        const nameEl = div.querySelector('.project-name h4 a');
        const name   = nameEl ? nameEl.textContent.trim() : slug;
        projects.push({ slug, name });
      });

      // If some projects on this page are NOT 0%, we've reached end of 0% section
      if (zeroProjectDivs.length < allProjectDivs.length) {
        console.log(`[WP Originals] Mixed page detected — stopping after this page`);
        totalPages = page;
      }

      if (projects.length === 0) {
        progress.textContent = `✅ No 0% ${PROJECT_TYPE} found on page ${page} — all done!`;
        return;
      }

    } else {
      // --- Normal browse=new fetch ---
      const projectApiBase = PROJECT_TYPE === 'themes'
        ? `https://api.wordpress.org/themes/info/1.2/?action=query_themes&request[browse]=new`
        : `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins&request[browse]=new`;

      const listUrl = `${projectApiBase}&request[per_page]=${PER_PAGE}&request[page]=${page}`;

      console.log(`[WP Originals] Fetching project list: ${listUrl}`);
      progress.textContent = `🔄 Fetching ${PROJECT_TYPE} list for page ${page}...`;

      const listRes  = await fetch(listUrl);
      const listData = await listRes.json();

      projects   = listData.themes ?? listData.plugins ?? [];
      totalPages = Math.ceil(listData.info.results / PER_PAGE);

      console.log(`[WP Originals] Got ${projects.length} ${PROJECT_TYPE}, total pages: ${totalPages}`);

      if (projects.length === 0) {
        progress.textContent = '✅ No more projects to load.';
        return;
      }
    }

    progress.textContent = `🔄 Checking ${projects.length} ${USE_FAVORITES ? 'favorite ' : ''}${PROJECT_TYPE}...`;

    let totalFound = 0;

    for (let i = 0; i < projects.length; i++) {
      if (stopRequested) {
        progress.textContent = '🛑 Stopped.';
        console.log('[WP Originals] Stop requested.');
        break;
      }

      const slug        = projects[i].slug;
      const name        = projects[i].name;
      const projectPath = `wp-${PROJECT_TYPE}`;

      const subPath = PROJECT_TYPE === 'plugins'
        ? `stable/${LOCALE}/${SLUG_TYPE}`
        : `${LOCALE}/${SLUG_TYPE}`;

      progress.textContent = `${USE_FAVORITES ? '⭐ ' : ''}${page > 1 ? `Page ${page}/${totalPages} — ` : ''}checking ${i + 1}/${projects.length}: ${slug}`;

      const url = MODE === 'warnings'
        ? `https://translate.wordpress.org/api/projects/${projectPath}/${slug}/${subPath}/` +
          `?filters[status]=current` +
          `&filters[warnings]=yes`
        : `https://translate.wordpress.org/api/projects/${projectPath}/${slug}/${subPath}/` +
          `?filters[status]=untranslated` +
          `&sort[by]=original_added` +
          `&sort[how]=desc`;

      console.log(`[${i + 1}/${projects.length}] Fetching: ${url}`);

      try {
        const gpRes = await fetch(url);
        console.log(`[${slug}] HTTP status: ${gpRes.status}`);
        if (!gpRes.ok) continue;

        const gpData = await gpRes.json();

        if (!Array.isArray(gpData) || gpData.length === 0) {
          console.log(`[${slug}] No results`);
          continue;
        }

        console.log(`[${slug}] Total: ${gpData.length}`);

       // For 0% mode show all untranslated strings, ignore date filter
        const relevant = MODE === 'warnings'
          ? gpData.filter(o => o.warnings && Object.keys(o.warnings).length > 0)
          : ONLY_ZERO_PERCENT
            ? gpData  // all untranslated strings, no date filter
            : gpData.filter(o => o.original_added && new Date(o.original_added) >= cutoff);

        console.log(`[${slug}] After filter: ${relevant.length}`);
        if (relevant.length === 0) continue;

        totalFound += relevant.length;

        // Skip percent fetch if already in 0% mode
        let percentTranslated = ONLY_ZERO_PERCENT ? '0' : '?';
        if (!ONLY_ZERO_PERCENT) {
          try {
            const tsUrl  = PROJECT_TYPE === 'plugins'
              ? `https://translate.wordpress.org/api/projects/${projectPath}/${slug}/stable`
              : `https://translate.wordpress.org/api/projects/${projectPath}/${slug}`;
            const tsRes  = await fetch(tsUrl);
            const tsData = await tsRes.json();
            const ts     = tsData.translation_sets?.find(t => t.locale === LOCALE && t.slug === SLUG_TYPE);
            if (ts) percentTranslated = ts.percent_translated;
          } catch (e) {
            console.warn(`[${slug}] Could not fetch percent_translated:`, e);
          }
        }

        const translateLink = `https://translate.wordpress.org/projects/${projectPath}/${slug}/${PROJECT_TYPE === 'plugins' ? `stable/${LOCALE}/${SLUG_TYPE}` : `${LOCALE}/${SLUG_TYPE}`}/`;

        const block = document.createElement('div');
        block.style.cssText = 'margin-bottom:14px; border-bottom:1px solid #eee; padding-bottom:10px;';
        block.innerHTML = `
          <strong>${MODE === 'warnings' ? '⚠️' : '📦'} ${name}</strong>
          <span style="font-size:11px; color:#888; margin-left:6px;">${percentTranslated}% translated</span>
          <a href="${translateLink}" target="_blank"
             style="font-size:11px; margin-left:6px; color:#0073aa;">
            → translate
          </a><br>
          <small>${relevant.length} ${MODE === 'warnings' ? 'warning(s)' : 'new untranslated original(s)'}</small>
        `;

        if (SHOW_RECORDS) {
          relevant.forEach(o => {
            const line = document.createElement('div');
            line.style.cssText = 'margin:4px 0 2px 10px; color:#333; font-size:12px;';

            if (MODE === 'warnings') {
              const warningText = o.warnings
                ? Object.entries(o.warnings).map(([key, val]) => {
                    const detail = Array.isArray(val)
                      ? val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ')
                      : typeof val === 'object'
                        ? JSON.stringify(val)
                        : val;
                    return `${key}: ${detail}`;
                  }).join(' | ')
                : '—';
              line.innerHTML = `
                ⚠️ <span title="${o.singular}">${truncate(o.singular, 40)}</span>
                <em style="color:#cc0000; font-size:11px;"> — ${warningText}</em>
              `;
            } else {
              line.innerHTML = `
                📅 <em>${o.original_added?.split(' ')[0]}</em> —
                <span title="${o.singular}">${truncate(o.singular, 55)}</span>
              `;
            }

            block.appendChild(line);
          });
        }

        results.appendChild(block);

      } catch (e) {
        console.error(`[${slug}] Error:`, e);
      }
    }

    if (!stopRequested) {
      const foundMsg = totalFound > 0
        ? `${totalFound} ${MODE === 'warnings' ? 'warning(s)' : 'new original(s)'} found.`
        : USE_FAVORITES
          ? `No new records found in favorites of ${WP_USERNAME}.`
          : `No new records found on this page.`;

      progress.textContent = `✅ ${USE_FAVORITES ? 'Favorites check' : `Page ${page}`} done — ${foundMsg}`;
      console.log(`[WP Originals] Done. Total found: ${totalFound}`);

      if (!USE_FAVORITES && page < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = `Next → (page ${page + 1} of ${totalPages})`;
        nextBtn.style.cssText = `
          background: #0073aa; color: white; border: none;
          padding: 6px 14px; border-radius: 4px;
          cursor: pointer; font-size: 13px; margin-top: 6px;
        `;
        nextBtn.addEventListener('click', () => {
          currentPage++;
          loadRecentOriginals(currentPage);
        });
        footer.appendChild(nextBtn);
      } else if (!USE_FAVORITES) {
        footer.innerHTML = '<em style="color:#888;">No more pages.</em>';
      }
    }

  } catch (err) {
    console.error('[WP Originals] Fatal error:', err);
    results.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

function showSettings() {
  const existing = document.getElementById('wp-originals-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'wp-originals-overlay';
  container.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    width: 420px; background: white; border: 1px solid #ccc;
    padding: 14px; z-index: 99999; font-size: 13px;
    font-family: sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    border-radius: 6px;
  `;
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <strong>WP Originals Finder</strong>
      <button id="btn-quit" style="
        background:#cc0000; color:white; border:none;
        padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
      ">✕ Quit</button>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Mode:</strong></label>
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <label style="cursor:pointer;">
        <input type="radio" name="mode" value="originals" ${MODE === 'originals' ? 'checked' : ''}> New originals
      </label>
      <label style="cursor:pointer;">
        <input type="radio" name="mode" value="warnings" ${MODE === 'warnings' ? 'checked' : ''}> Warnings
      </label>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Project type:</strong></label>
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <label style="cursor:pointer;">
        <input type="radio" name="project_type" value="themes" ${PROJECT_TYPE === 'themes' ? 'checked' : ''}> Themes
      </label>
      <label style="cursor:pointer;">
        <input type="radio" name="project_type" value="plugins" ${PROJECT_TYPE === 'plugins' ? 'checked' : ''}> Plugins
      </label>
    </div>

    <label style="display:block; margin-bottom:8px; cursor:pointer;">
      <input type="checkbox" id="input-favorites" ${USE_FAVORITES ? 'checked' : ''}>
      <strong>⭐ Search favorites only</strong>
    </label>
    <div id="favorites-section" style="display:${USE_FAVORITES ? 'block' : 'none'}; margin-bottom:12px;">
      <label style="display:block; margin-bottom:6px;"><strong>WordPress.org username:</strong></label>
      <input id="input-username" type="text" value="${WP_USERNAME}" placeholder="e.g. WordPress login" style="
        width: 100%; box-sizing:border-box; padding:5px 8px;
        border:1px solid #ccc; border-radius:4px;
      "/>
      <small style="color:#888; display:block; margin-top:4px;">
        ⚠️ You must be logged into wordpress.org in this browser.
      </small>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Variant:</strong></label>
    <div style="display:flex; gap:10px; margin-bottom:12px;">
      <label style="cursor:pointer;">
        <input type="radio" name="slug_type" value="default" ${SLUG_TYPE === 'default' ? 'checked' : ''}> Default
      </label>
      <label style="cursor:pointer;">
        <input type="radio" name="slug_type" value="formal" ${SLUG_TYPE === 'formal' ? 'checked' : ''}> Formal
      </label>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Locale:</strong></label>
    <input id="input-locale" type="text" value="${LOCALE}" style="
      width: 100%; box-sizing:border-box; padding:5px 8px;
      border:1px solid #ccc; border-radius:4px; margin-bottom:12px;
    "/>

    <div id="days-section" style="display:${MODE === 'originals' ? 'block' : 'none'};">
      <label style="display:block; margin-bottom:6px;"><strong>Days to look back:</strong></label>
      <input id="input-days" type="number" value="${DAYS_AGO}" min="1" max="365" style="
        width: 100%; box-sizing:border-box; padding:5px 8px;
        border:1px solid #ccc; border-radius:4px; margin-bottom:12px;
      "/>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Lines per page:</strong></label>
    <input id="input-lines" type="number" value="${PER_PAGE}" min="1" max="500" style="
      width: 100%; box-sizing:border-box; padding:5px 8px;
      border:1px solid #ccc; border-radius:4px; margin-bottom:12px;
    "/>

    <label style="display:block; margin-bottom:6px;"><strong>Start at page:</strong></label>
    <input id="input-start-page" type="number" value="${START_PAGE}" min="1" max="9999" style="
      width: 100%; box-sizing:border-box; padding:5px 8px;
      border:1px solid #ccc; border-radius:4px; margin-bottom:12px;
    "/>

    <label style="display:block; margin-bottom:8px; cursor:pointer;">
      <input type="checkbox" id="input-show-records" ${SHOW_RECORDS ? 'checked' : ''}>
      Show individual records found
    </label>

    <label style="display:block; margin-bottom:16px; cursor:pointer;">
      <input type="checkbox" id="input-only-zero" ${ONLY_ZERO_PERCENT ? 'checked' : ''}>
      Only show 0% translated projects
    </label>

    <button id="btn-start" style="
      width:100%; background:#0073aa; color:white; border:none;
      padding:8px 0; border-radius:4px; cursor:pointer;
      font-size:14px; font-weight:bold;
    ">▶ Start</button>
  `;
  document.body.appendChild(container);

  container.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('days-section').style.display =
        radio.value === 'originals' ? 'block' : 'none';
    });
  });

  document.getElementById('input-favorites').addEventListener('change', (e) => {
    document.getElementById('favorites-section').style.display =
      e.target.checked ? 'block' : 'none';
  });

  document.getElementById('btn-quit').addEventListener('click', () => {
    container.remove();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    MODE              = document.querySelector('input[name="mode"]:checked').value;
    DAYS_AGO          = parseInt(document.getElementById('input-days')?.value, 10) || 7;
    PER_PAGE          = parseInt(document.getElementById('input-lines').value, 10) || 100;
    START_PAGE        = parseInt(document.getElementById('input-start-page').value, 10) || 1;
    LOCALE            = document.getElementById('input-locale').value.trim() || 'en-gb';
    PROJECT_TYPE      = document.querySelector('input[name="project_type"]:checked').value;
    SLUG_TYPE         = document.querySelector('input[name="slug_type"]:checked').value;
    SHOW_RECORDS      = document.getElementById('input-show-records').checked;
    ONLY_ZERO_PERCENT = document.getElementById('input-only-zero').checked;
    USE_FAVORITES     = document.getElementById('input-favorites').checked;
    WP_USERNAME       = document.getElementById('input-username')?.value.trim() || '';
    currentPage       = START_PAGE;
    settingsDone      = true;

    console.log(`[WP Originals] Settings — mode: ${MODE}, type: ${PROJECT_TYPE}, locale: ${LOCALE}, variant: ${SLUG_TYPE}, days: ${DAYS_AGO}, perPage: ${PER_PAGE}, startPage: ${START_PAGE}, favorites: ${USE_FAVORITES}, user: ${WP_USERNAME}, showRecords: ${SHOW_RECORDS}, onlyZero: ${ONLY_ZERO_PERCENT}`);

    loadRecentOriginals(currentPage);
  });
}

function truncate(str, max) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// Single entry point
//loadRecentOriginals(currentPage);
    // ---------------------------------------------------------------------------
// loadEditorProjects — show projects where the current user is Translation Editor
// Concurrency constants (tune here if translate.wordpress.org throttles you):
const EDITOR_LIST_CONCURRENCY    = 5;   // parallel fetches for project list pages
const EDITOR_CONTRIB_CONCURRENCY = 3;   // parallel fetches for contributors pages
// ---------------------------------------------------------------------------

async function loadEditorProjects() {

  stopRequested = false;

  // This function only needs LOCALE and WP_USERNAME — use its own settings screen
  if (!LOCALE || !WP_USERNAME) {
    showEditorSettings();
    return;
  }

  console.log(`[WP Editor Projects] Starting — locale: ${LOCALE}, user: ${WP_USERNAME}`);

  const existing = document.getElementById('wp-originals-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'wp-originals-overlay';
  container.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    width: 420px; max-height: 85vh; overflow-y: auto;
    background: white; border: 1px solid #ccc;
    padding: 14px; z-index: 99999; font-size: 13px;
    font-family: sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    border-radius: 6px;
  `;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <strong>🛡️ My editor projects (${LOCALE})</strong>
      <button id="btn-quit" style="
        background:#cc0000; color:white; border:none;
        padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
      ">✕ Quit</button>
    </div>
    <p style="color:#555; margin:10px 0 14px;">Select which project type to scan:</p>
    <div style="display:flex; gap:10px; justify-content:center; margin-bottom:6px;">
      <button id="btn-themes" style="
        background:#0073aa; color:white; border:none;
        padding:8px 20px; border-radius:4px; cursor:pointer; font-size:13px;
      ">🎨 Themes</button>
      <button id="btn-plugins" style="
        background:#0073aa; color:white; border:none;
        padding:8px 20px; border-radius:4px; cursor:pointer; font-size:13px;
      ">🔌 Plugins</button>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById('btn-quit').addEventListener('click', () => {
    stopRequested = true;
    container.remove();
  });
  document.getElementById('btn-themes').addEventListener('click', () => {
    runEditorScan('themes', container);
  });
  document.getElementById('btn-plugins').addEventListener('click', () => {
    runEditorScan('plugins', container);
  });
}

// ---------------------------------------------------------------------------
// Lightweight settings screen — only asks for Locale and Username
// ---------------------------------------------------------------------------

function showEditorSettings() {
  const existing = document.getElementById('wp-originals-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'wp-originals-overlay';
  container.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    width: 420px; background: white; border: 1px solid #ccc;
    padding: 14px; z-index: 99999; font-size: 13px;
    font-family: sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    border-radius: 6px;
  `;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <strong>🛡️ My editor projects — Settings</strong>
      <button id="btn-quit" style="
        background:#cc0000; color:white; border:none;
        padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
      ">✕ Quit</button>
    </div>

    <label style="display:block; margin-bottom:6px;"><strong>Locale:</strong></label>
    <input id="input-locale" type="text" value="${LOCALE || 'nl'}" style="
      width: 100%; box-sizing:border-box; padding:5px 8px;
      border:1px solid #ccc; border-radius:4px; margin-bottom:12px;
    "/>

    <label style="display:block; margin-bottom:6px;"><strong>WordPress.org username:</strong></label>
    <input id="input-username" type="text" value="${WP_USERNAME || ''}" placeholder="e.g. your WordPress login" style="
      width: 100%; box-sizing:border-box; padding:5px 8px;
      border:1px solid #ccc; border-radius:4px; margin-bottom:6px;
    "/>
    <small style="color:#888; display:block; margin-bottom:16px;">
      ⚠️ You must be logged into wordpress.org in this browser.
    </small>

    <button id="btn-start" style="
      width:100%; background:#0073aa; color:white; border:none;
      padding:8px 0; border-radius:4px; cursor:pointer;
      font-size:14px; font-weight:bold;
    ">▶ Start</button>
  `;
  document.body.appendChild(container);

  document.getElementById('btn-quit').addEventListener('click', () => {
    container.remove();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    LOCALE      = document.getElementById('input-locale').value.trim() || 'nl';
    WP_USERNAME = document.getElementById('input-username').value.trim();

    if (!WP_USERNAME) {
      document.getElementById('input-username').style.borderColor = 'red';
      return;
    }

    console.log(`[WP Editor Projects] Settings — locale: ${LOCALE}, user: ${WP_USERNAME}`);
    loadEditorProjects();
  });
}

// ---------------------------------------------------------------------------

async function runEditorScan(projectType, container) {

  stopRequested = false;

  console.log(`[WP Editor Projects] Scanning ${projectType} — locale: ${LOCALE}`);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <strong>🛡️ My editor projects — ${projectType === 'themes' ? '🎨 Themes' : '🔌 Plugins'} (${LOCALE})</strong>
      <div style="display:flex; gap:6px;">
        <button id="btn-back" style="
          background:#888; color:white; border:none;
          padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
        ">⬅ Back</button>
        <button id="btn-quit" style="
          background:#cc0000; color:white; border:none;
          padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;
        ">✕ Quit</button>
      </div>
    </div>
    <div id="progress"  style="color:#888; font-size:12px; margin:4px 0;"></div>
    <div id="progress2" style="color:#aaa; font-size:11px; margin:2px 0;"></div>
    <hr style="margin:8px 0;">
    <div id="results"></div>
    <div id="footer" style="margin-top:10px; text-align:center;"></div>
  `;

  document.getElementById('btn-quit').addEventListener('click', () => {
    stopRequested = true;
    container.remove();
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    stopRequested = true;
    loadEditorProjects();
  });

  const progress  = document.getElementById('progress');
  const progress2 = document.getElementById('progress2');
  const results   = document.getElementById('results');
  const footer    = document.getElementById('footer');

  try {

    // -----------------------------------------------------------------------
    // PHASE 1 — Collect all project slugs/names from the locale list pages.
    //           Fetch page 1 first to learn totalPages, then batch the rest
    //           EDITOR_LIST_CONCURRENCY pages at a time.
    // -----------------------------------------------------------------------

    const baseUrl = `https://translate.wordpress.org/locale/${LOCALE}/default/wp-${projectType}/`;

    progress.textContent  = `🔄 Phase 1/2 — Fetching ${projectType} list, page 1…`;
    progress2.textContent = '';

    // Parse one list-page HTML → [{ slug, name }, …] and whether a next page exists
    const parseListPage = (html) => {
      const doc      = new DOMParser().parseFromString(html, 'text/html');
      const projects = [];
      doc.querySelectorAll('.project').forEach(div => {
        const classes   = [...div.classList];
        const slugClass = classes.find(c => c.startsWith(`project-wp-${projectType}-`));
        if (!slugClass) return;
        const slug   = slugClass.replace(`project-wp-${projectType}-`, '');
        const nameEl = div.querySelector('.project-name h4 a');
        const name   = nameEl ? nameEl.textContent.trim() : slug;
        projects.push({ slug, name });
      });
      // Stop when there is no "next" arrow link in the pagination
      const hasNextPage = !!doc.querySelector('.paging a.next');
      return { projects, hasNextPage };
    };

    // Pagination only has prev/next arrows so we don't know the total upfront.
    // Strategy: fetch pages in batches of EDITOR_LIST_CONCURRENCY at a time.
    // If any page in the batch has no "next" link, that was the last page — stop.
    let allProjects  = [];
    let batchStart   = 1;
    let reachedEnd   = false;

    while (!stopRequested && !reachedEnd) {
      const batchPages = Array.from({ length: EDITOR_LIST_CONCURRENCY }, (_, i) => batchStart + i);

      progress.textContent  = `🔄 Phase 1/2 — Fetching ${projectType} list: pages ${batchStart}–${batchStart + EDITOR_LIST_CONCURRENCY - 1}…`;
      progress2.textContent = `${allProjects.length} projects collected so far`;

      // Fetch all pages in this batch in parallel
      const batchResults = await Promise.all(batchPages.map(async (pageNum) => {
        try {
          const res  = await fetch(`${baseUrl}?page=${pageNum}`);
          const html = await res.text();
          return { pageNum, ...parseListPage(html) };
        } catch (e) {
          console.warn(`[WP Editor Projects] List page ${pageNum} error:`, e);
          return { pageNum, projects: [], hasNextPage: false };
        }
      }));

      // Add results in page order, stop at the first page with no next link
      for (const result of batchResults) {
        allProjects.push(...result.projects);
        if (!result.hasNextPage) {
          console.log(`[WP Editor Projects] Last page: ${result.pageNum} — done collecting.`);
          reachedEnd = true;
          break;
        }
      }

      progress2.textContent = `${allProjects.length} projects collected so far`;
      batchStart += EDITOR_LIST_CONCURRENCY;
    }

    console.log(`[WP Editor Projects] Finished collecting — ${allProjects.length} projects total`);

    if (stopRequested) {
      progress.textContent  = '🛑 Stopped.';
      progress2.textContent = '';
      return;
    }

    console.log(`[WP Editor Projects] Total projects to check: ${allProjects.length}`);

    if (allProjects.length === 0) {
      progress.textContent  = `✅ No ${projectType} found for locale ${LOCALE}.`;
      progress2.textContent = '';
      return;
    }

    // -----------------------------------------------------------------------
    // PHASE 2 — Fetch the locale+project page for each project and check for
    //           the user in .locale-project-contributors-editors.
    //           Matches are appended to the popup live as they are found.
    // -----------------------------------------------------------------------

    progress.textContent  = `🔍 Phase 2/2 — Checking ${allProjects.length} project pages…`;
    progress2.textContent = `0 / ${allProjects.length} checked — 0 editor projects found`;

    let checked      = 0;
    let editorCount  = 0;
    const foundProjects = []; // collect for export

    // Retry up to 3 times on network failure
    const fetchWithRetry = async (url, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const r = await fetch(url);
          return r;
        } catch (e) {
          if (attempt === retries) throw e;
          await new Promise(res => setTimeout(res, attempt * 1000));
        }
      }
    };

    await runWithConcurrency(allProjects, EDITOR_CONTRIB_CONCURRENCY, async ({ slug, name }) => {
      if (stopRequested) return;

      // The locale+project page is where PTE info lives per locale
      const localeUrl = projectType === 'plugins'
        ? `https://translate.wordpress.org/locale/${LOCALE}/default/wp-${projectType}/${slug}/stable/`
        : `https://translate.wordpress.org/locale/${LOCALE}/default/wp-${projectType}/${slug}/`;

      const translateLink = localeUrl;

      try {
        const res = await fetchWithRetry(localeUrl);
        if (!res.ok) {
          console.warn(`[${slug}] Locale project page returned ${res.status}`);
          return;
        }

        const html        = await res.text();
        const doc         = new DOMParser().parseFromString(html, 'text/html');

        // PTE info is in .locale-project-contributors-group.locale-project-contributors-editors
        const editorGroup = doc.querySelector(
          '.locale-project-contributors-group.locale-project-contributors-editors'
        );

        if (!editorGroup) return;

        const isEditor = [...editorGroup.querySelectorAll('a')].some(a =>
          (a.getAttribute('href') || '').toLowerCase()
            .includes(`/profiles.wordpress.org/${WP_USERNAME.toLowerCase()}/`)
        );

        if (!isEditor) return;

        // ✅ Found one — append immediately so the user sees results live
        editorCount++;
        foundProjects.push({ name, url: translateLink });
        const block = document.createElement('div');
        block.style.cssText = 'margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:10px;';
        block.innerHTML = `
          <strong>🛡️ ${name}</strong>
          <a href="${translateLink}" target="_blank"
             style="font-size:11px; margin-left:6px; color:#0073aa;">
            → translate
          </a>
        `;
        results.appendChild(block);

      } catch (e) {
        console.error(`[${slug}] Project page check error:`, e);
      } finally {
        checked++;
        progress2.textContent =
          `${checked} / ${allProjects.length} checked — ${editorCount} editor project(s) found`;
      }
    });

    if (!stopRequested) {
      progress.textContent  = editorCount > 0
        ? `✅ Done — you are Translation Editor for ${editorCount} ${projectType}.`
        : `✅ Done — no ${projectType} found where you are Translation Editor.`;
      progress2.textContent = `${allProjects.length} projects checked.`;

      console.log(`[WP Editor Projects] Finished. Editor for ${editorCount} project(s).`);

      if (editorCount === 0) {
        footer.innerHTML = `<em style="color:#888;">
          Make sure you are logged into wordpress.org and your username is set correctly.
        </em>`;
      } else {
        // Export button
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '⬇️ Export list as CSV';
        exportBtn.style.cssText = `
          background:#0073aa; color:white; border:none;
          padding:6px 14px; border-radius:4px;
          cursor:pointer; font-size:13px; margin-top:6px;
        `;
        exportBtn.addEventListener('click', () => {
          const rows = ['Name,URL'];
          foundProjects.forEach(p => {
            // Quote name in case it contains commas
            rows.push(`"${p.name.replace(/"/g, '""')}","${p.url}"`);
          });
          const csv  = rows.join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const a    = document.createElement('a');
          a.href     = URL.createObjectURL(blob);
          a.download = `editor-projects-${LOCALE}-${projectType}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
        footer.appendChild(exportBtn);
      }

    } else {
      progress.textContent  = '🛑 Stopped.';
      progress2.textContent =
        `${checked} / ${allProjects.length} checked — ${editorCount} editor project(s) found so far.`;
    }

  } catch (err) {
    console.error('[WP Editor Projects] Fatal error:', err);
    results.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

// ---------------------------------------------------------------------------
// Generic concurrency limiter.
// Runs asyncFn over every item in the array, keeping at most `limit`
// promises in-flight at the same time.  Order of completion is not guaranteed.
// ---------------------------------------------------------------------------
async function runWithConcurrency(items, limit, asyncFn) {
  const queue   = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await asyncFn(item);
    }
  });
  await Promise.all(workers);
}
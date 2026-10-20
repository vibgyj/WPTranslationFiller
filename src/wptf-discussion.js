/**
 * WPTF – Discussions overview
 *
 * Reads the Discussions dashboard of translate.wordpress.org
 *   https://translate.wordpress.org/locale/{locale}/{set}/discussions/?page=N
 * walks through all pages, groups the rows per project and reports:
 *   - the project name (once)
 *   - the number of discussions / changes requested
 *   - the date of the newest discussion
 *   - a link to the project (and to its "changes requested" strings)
 *
 * The dashboard only works for logged-in users, so this must run as a content
 * script on translate.wordpress.org (fetch() then sends the login cookies).
 *
 * Table layout (gp-translation-helpers, templates/discussions-dashboard.php):
 *   td[0] Original string | td[1] Comment | td[2] Project (<a href>)
 *   td[3] Author          | td[4] Submitted on ("YYYY-MM-DD HH:MM:SS")
 *   td[5] Validators involved
 * The server shows 12 rows per page.
 */

const WPTF_DISCUSSIONS_PER_PAGE = 12;
const WPTF_DISCUSSIONS_MAX_PAGES = 1000; // safety net

/**
 * Collect the discussions per project.
 *
 * @param {number} startPage First page to read (1 = from the beginning)
 * @param {string} locale   GlotPress locale slug, e.g. "nl" ("" = take it from the page URL)
 * @param {string} set      Translation set slug, e.g. "default" or "formal"
 * @param {string} filter   "" (all), "participating" or "not_participating"
 * @param {object} [options]
 * @param {function} [options.onProgress]  called as onProgress(page, totalPages, projectCount)
 * @param {function} [options.isCancelled] return true to stop reading more pages
 * @returns {Promise<Array<{name, count, newestDate, newestDateText, projectUrl, changesRequestedUrl}>>}
 */
async function wptfCollectDiscussions(startPage = 1, locale = "", set = "default", filter = "", options = {}) {
    const { onProgress = null, isCancelled = null } = options;
    locale = wptfResolveDiscussionLocale(locale);
    set = /^[a-z0-9_-]+$/i.test(String(set || "")) ? String(set) : "default";
    const baseUrl = `https://translate.wordpress.org/locale/${locale}/${set}/discussions/`;
    const parser = new DOMParser();
    const projects = new Map(); // key = project name

    let page = Math.max(1, parseInt(startPage, 10) || 1);
    let totalPages = page;
    let countRead = false;
    const seenRows = new Set();      // unique key per discussion row
    const seenPageUrls = new Set();  // guards against loops

    // First URL: base (+ page / filter); after that we follow the page's own "next" link
    let nextUrl = new URL(baseUrl);
    if (page > 1) nextUrl.searchParams.set("page", page);
    if (filter) nextUrl.searchParams.set("filter", filter);

    while (nextUrl && page <= WPTF_DISCUSSIONS_MAX_PAGES) {
        if (isCancelled?.()) break;
        if (seenPageUrls.has(nextUrl.href)) break;
        seenPageUrls.add(nextUrl.href);

        onProgress?.(page, countRead ? totalPages : null, projects.size);

        const resp = await fetch(nextUrl.href, { credentials: "include", cache: "no-store" });
        if (!resp.ok) {
            throw new Error(`Discussions page ${page} failed (${resp.status}). Are you logged in?`);
        }
        const doc = parser.parseFromString(await resp.text(), "text/html");

        // First page read: work out how many pages there are
        if (!countRead) {
            totalPages = wptfGetDiscussionPageCount(doc, filter);
            countRead = true;
        }

        const rows = doc.querySelectorAll("table#translations tbody tr");
        let newRows = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll(":scope > td");
            if (cells.length < 5) return;

            const projectLink = cells[2].querySelector("a");
            const name = (projectLink?.textContent || cells[2].textContent).trim();
            if (!name) return;

            // Unique key: link to the comment thread (contains #comment-ID),
            // fallback to original link + date
            const commentHref = cells[1].querySelector("a")?.getAttribute("href") || "";
            const originalHref = cells[0].querySelector("a")?.getAttribute("href") || "";
            const dateText = cells[4].textContent.trim();          // "2026-10-12 14:03:22"
            const key = commentHref || `${originalHref}|${dateText}`;
            if (seenRows.has(key)) return;
            seenRows.add(key);
            newRows++;

            const projectHref = projectLink ? new URL(projectLink.getAttribute("href"), baseUrl).href : "";
            const date = new Date(dateText.replace(" ", "T"));

            let entry = projects.get(name);
            if (!entry) {
                entry = { name, count: 0, newestDate: null, newestDateText: "", projectHref: "" };
                projects.set(name, entry);
            }
            entry.count++;
            if (!isNaN(date) && (!entry.newestDate || date > entry.newestDate)) {
                entry.newestDate = date;
                entry.newestDateText = dateText;
                entry.projectHref = projectHref; // link of the newest discussion
            }
            if (!entry.projectHref) entry.projectHref = projectHref;
        });

        console.debug(`WPTF discussions: ${nextUrl.href} → ${rows.length} rows, ${newRows} new`);
        onProgress?.(page, totalPages, projects.size, true);

        // Nothing new on this page: the server returned a page we already had
        if (rows.length === 0 || newRows === 0) {
            if (rows.length > 0) {
                console.warn(`WPTF discussions: page ${page} only contained rows already read, stopping. Check the pagination URL: ${nextUrl.href}`);
            }
            break;
        }

        // Follow the "next »" link exactly as the server builds it
        const nextLink = doc.querySelector("a.next.page-numbers, a.next");
        nextUrl = nextLink ? new URL(nextLink.getAttribute("href"), nextUrl.href) : null;
        page++;
    }

    // Build the links and sort: newest discussion first
    return [...projects.values()]
        .map(p => {
            const projectUrl = p.projectHref;
            const localeUrl = projectUrl ? `${projectUrl.replace(/\/?$/, "/")}${locale}/${set}/` : "";
            return {
                name: p.name,
                count: p.count,
                newestDate: p.newestDate,
                newestDateText: p.newestDateText,
                projectUrl,
                changesRequestedUrl: localeUrl ? `${localeUrl}?filters[status]=changesrequested` : ""
            };
        })
        .sort((a, b) => (b.newestDate?.getTime() || 0) - (a.newestDate?.getTime() || 0));
}

/**
 * Returns a valid GlotPress locale slug.
 * Accepts e.g. "nl", "pt-br", "de-ch". Anything else (a number, an event
 * object, undefined) falls back to the locale in the current page URL,
 * then to "nl".
 */
function wptfResolveDiscussionLocale(locale) {
    const isValid = value => typeof value === "string" && /^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(value);
    if (isValid(locale)) return locale.toLowerCase();
    if (locale) console.warn(`WPTF discussions: invalid locale "${locale}"`);

    // /locale/nl/default/...  or  /projects/wp-plugins/foo/stable/nl/default/
    const path = window.location.pathname;
    const fromLocalePath = path.match(/\/locale\/([a-z]{2,3}(?:-[a-z0-9]+)*)\//i);
    if (fromLocalePath) return fromLocalePath[1].toLowerCase();
    const fromProjectPath = path.match(/\/([a-z]{2,3}(?:-[a-z0-9]+)*)\/(default|formal|informal|[a-z]+)\/?(?:\?|$)/i);
    if (fromProjectPath && path.startsWith("/projects/")) return fromProjectPath[1].toLowerCase();

    return "nl";
}

/**
 * Reads "All (N)" / "Participating (N)" from the filter toolbar and converts
 * it into a page count. Falls back to the pagination links.
 */
function wptfGetDiscussionPageCount(doc, filter) {
    const links = doc.querySelectorAll(".filter-toolbar a");
    const index = filter === "participating" ? 1 : filter === "not_participating" ? 2 : 0;
    const match = links[index]?.textContent.match(/\((\d+)\)/);
    if (match) {
        return Math.max(1, Math.ceil(parseInt(match[1], 10) / WPTF_DISCUSSIONS_PER_PAGE));
    }
    // Fallback: highest number in the pagination
    const numbers = [...doc.querySelectorAll("a.page-numbers, span.page-numbers")]
        .map(el => parseInt(el.textContent, 10))
        .filter(n => !isNaN(n));
    return numbers.length ? Math.max(...numbers) : 1;
}

/**
 * Shows the result in a simple overlay on the current page.
 */
async function wptfShowDiscussionsOverview(startPage = 1, locale = "", set = "default", filter = "") {
    const overlay = wptfDiscussionsOverlay();
    const progress = wptfDiscussionsProgress(overlay.body);
    progress.update("Discussies ophalen…", 0);

    let projects;
    try {
        const firstPage = Math.max(1, parseInt(startPage, 10) || 1);
        projects = await wptfCollectDiscussions(startPage, locale, set, filter, {
            isCancelled: () => !overlay.root.isConnected, // overlay closed = stop
            onProgress: (page, totalPages, projectCount, done) => {
                if (!totalPages) {
                    progress.update(`Pagina ${page} ophalen…`, 0);
                    return;
                }
                const pagesToRead = totalPages - firstPage + 1;
                const pagesDone = page - firstPage + (done ? 1 : 0);
                const percent = Math.round((pagesDone / pagesToRead) * 100);
                progress.update(
                    `Pagina ${page} van ${totalPages} · ${projectCount} projecten gevonden`,
                    percent
                );
            }
        });
    } catch (err) {
        overlay.body.textContent = err.message;
        return;
    }
    if (!overlay.root.isConnected) return; // closed during loading

    if (projects.length === 0) {
        overlay.body.textContent = "Geen discussies gevonden voor deze locale.";
        return;
    }

    const total = projects.reduce((sum, p) => sum + p.count, 0);
    const table = document.createElement("table");
    table.className = "wptf-discussions-table";
    table.innerHTML = `
        <thead><tr>
            <th>Project</th><th>Aantal</th><th>Nieuwste discussie</th><th></th>
        </tr></thead><tbody></tbody>
        <tfoot><tr><td>Totaal: ${projects.length} projecten</td><td>${total}</td><td></td><td></td></tr></tfoot>`;
    const tbody = table.querySelector("tbody");

    projects.forEach(p => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        if (p.projectUrl) {
            const a = document.createElement("a");
            a.href = p.projectUrl;
            a.target = "_blank";
            a.textContent = p.name;
            tdName.appendChild(a);
        } else {
            tdName.textContent = p.name;
        }

        const tdCount = document.createElement("td");
        tdCount.textContent = p.count;

        const tdDate = document.createElement("td");
        tdDate.textContent = p.newestDate
            ? p.newestDate.toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })
            : p.newestDateText;

        const tdLink = document.createElement("td");
        if (p.changesRequestedUrl) {
            const a = document.createElement("a");
            a.href = p.changesRequestedUrl;
            a.target = "_blank";
            a.textContent = "Changes requested";
            tdLink.appendChild(a);
        }

        tr.append(tdName, tdCount, tdDate, tdLink);
        tbody.appendChild(tr);
    });

    overlay.body.textContent = "";
    overlay.body.appendChild(table);
    console.table(projects.map(({ name, count, newestDateText, projectUrl }) =>
    ({ name, count, newest: newestDateText, projectUrl })));
}

/**
 * Small progress block: text + bar.
 */
function wptfDiscussionsProgress(container) {
    container.textContent = "";
    const text = document.createElement("div");
    text.className = "wptf-progress-text";
    const bar = document.createElement("div");
    bar.className = "wptf-progress-bar";
    const fill = document.createElement("div");
    fill.className = "wptf-progress-fill";
    bar.appendChild(fill);
    container.append(text, bar);

    return {
        update(message, percent) {
            text.textContent = message;
            fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
    };
}

function wptfDiscussionsOverlay() {
    document.getElementById("wptf-discussions-overlay")?.remove();

    const wrap = document.createElement("div");
    wrap.id = "wptf-discussions-overlay";
    wrap.innerHTML = `
        <style>
            #wptf-discussions-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100000;
                display:flex; align-items:center; justify-content:center; }
            #wptf-discussions-overlay .wptf-box { background:#fff; max-width:900px; width:90%; max-height:80vh;
                overflow:auto; border-radius:6px; padding:16px 20px; box-shadow:0 4px 20px rgba(0,0,0,.3); }
            #wptf-discussions-overlay h2 { margin:0 0 12px; font-size:18px; display:flex; justify-content:space-between; }
            #wptf-discussions-overlay button { cursor:pointer; border:0; background:none; font-size:20px; }
            .wptf-discussions-table { width:100%; border-collapse:collapse; }
            .wptf-discussions-table th, .wptf-discussions-table td { padding:6px 8px; border-bottom:1px solid #ddd; text-align:left; }
            .wptf-discussions-table td:nth-child(2) { text-align:right; }
            .wptf-discussions-table tfoot td { font-weight:bold; }
            #wptf-discussions-overlay .wptf-progress-text { margin-bottom:8px; }
            #wptf-discussions-overlay .wptf-progress-bar { height:10px; background:#e5e5e5; border-radius:5px; overflow:hidden; }
            #wptf-discussions-overlay .wptf-progress-fill { height:100%; width:0; background:#2271b1; transition:width .2s; }
        </style>
        <div class="wptf-box">
            <h2><span>Discussies per project</span><button title="Sluiten">&times;</button></h2>
            <div class="wptf-body"></div>
        </div>`;
    wrap.querySelector("button").addEventListener("click", () => wrap.remove());
    wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);

    return { root: wrap, body: wrap.querySelector(".wptf-body") };
}
// This file contains code ro generate project stats
async function mySelection() {
	var eID = document.getElementById("stattypes");
	var selVal = eID.options[eID.selectedIndex].value;
	var modal = document.getElementById("myModal");
	var myMaxPage;
	modal.style.display = "none";
	let baseUrl = "https://translate.wordpress.org/locale/" + locale;

	switch (selVal) {
		case "1":
			query = baseUrl + "/default/wp-themes/?s=&page="
			myType = "Themes default"
			break;
		case "2":
			query = baseUrl +"/default/wp-plugins/?s=&page="
			myType = "Plugins default"
			break;
		case "3":
			query = baseUrl +"/formal/wp-themes/?s=&page="
			myType = "Themes formal"
			break;
		case "4":
			myType = "Plugins formal"
			query = baseUrl +"/formal/wp-plugins/?s=&page="
			break;
		case "5":
			myType = "Themes default 100%"
			query = baseUrl + "/default/wp-themes/?s=&page="
			break;
		case "6":
			myType = "Plugins default 100%"
			query = baseUrl + "/default/wp-plugins/?s=&page="
			break;
		case "7":
			myType = "Themes formal 100%"
			query = baseUrl + "/formal/wp-themes/?s=&page="
			break;
		case "8":
			myType = "Plugins formal 100%"
			query = baseUrl + "/formal/wp-plugins/?s=&page="
			break;
		case "9":
			myType = "Meta default"
			query = "/default/meta/"
			break;
		case "10":
			myType = "Meta formal"
			query = "/formal/meta/"
			break;
		default:
			myType = "Themes"
			query = "/default/wp-themes/?s=&page="
			break;
	}
	const statType = document.getElementById("stattypes").value;
    const onlyPTE = document.getElementById("onlyPTE").checked;

	let res = await createStatsTable(selVal,query,myType,locale,onlyPTE);
	if (res == "done") {
		await toastbox("info", "", "3000", "Fetching page counts done!");
		console.debug("Stats processed and done")
		playSound = "/error-alert.flac";
		if (playSound !== null) {
			src = chrome.runtime.getURL('/');
			src = src.substring(0, src.lastIndexOf('/'));
			let sound = new Audio(src + playSound);
			sound.play();
		}
    }
	//return dayVal
}
async function showTypesel(locale) {
    var mySel;
    var dayVal;
    var myVal;
    let body = document.querySelector('body');

    // Check if the user is logged in
    var curruser = document.getElementsByClassName("username");
   
    if (curruser.length == 0) {
        messageBox("error", "No logged on user found!");
        return;
    }

    // Modal HTML including "Only PTE" checkbox
    body.insertAdjacentHTML(
        'afterend',
        `<div id="myModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <p>
                    Select your stats type<br>
                    For some stats it takes a while — use "X" to stop.
                </p>
                <select id="stattypes">
                    <option value="1">Themes default</option>
                    <option value="2">Plugins default</option>
                    <option value="3">Themes formal</option>
                    <option value="4">Plugins formal</option>
                    <option value="5">Themes default 100%</option>
                    <option value="6">Plugins default 100%</option>
                    <option value="7">Themes formal 100%</option>
                    <option value="8">Plugins formal 100%</option>
                    <option value="9">Meta default</option>
                    <option value="10">Meta formal</option>
                </select>
                <br><br>

                <!-- ✅ Only PTE checkbox -->
                <label style="user-select:none;">
                    <input type="checkbox" id="onlyPTE" /> Only PTE
                </label>

                <br><br>
                <button id="mySelButton">Select stat and click me to start</button>
            </div>
        </div>`
    );

    let modal = document.getElementById("myModal");
    modal.style.display = "block";

    document.getElementById("mySelButton").addEventListener("click", mySelection);

    // Close modal logic
    let span = document.getElementsByClassName("close")[0];
    span.onclick = function () {
        modal.style.display = "none";
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

// ----- Main function -----
async function createStatsTable(selVal, query, myType, locale,onlyPTE) {
    let newresult = 0;
    const myInit = { redirect: "error" };
    let currusername = "";
    const allProjects = [];
    let myMaxPage = 1;
    const curruser = document.getElementsByClassName("username");
    if (!curruser.length) {
        messageBox("error", "No logged on user found!");
        return;
    }
    currusername = curruser[0].innerText;
    //currusername = 'ruba1956'
    await toastbox("info", "", "2000", "Starting project fetch...");

    // ----- Fetch first page to determine pagination -----
    let firstPageHtml;
    try {
        if (selVal < 5) {
            const firstPageUrl = query + "1&filter=percent-completed";
            //console.debug("firstPageUrl:", firstPageUrl)
            firstPageHtml = await (await fetch(firstPageUrl, myInit)).text();
            //console.debug("firstpage:",firstPageHtml)
            // parse pagination
            const parser = new DOMParser();
            const doc = parser.parseFromString(firstPageHtml, "text/html");
            //console.debug("doc first:",doc)
            const pagination = doc.getElementsByClassName("paging");
            if (pagination.length) {
                const myCountPages = pagination[0].children;
                const maybePage = parseInt(myCountPages[myCountPages.length - 2].innerText, 10);
                myMaxPage = Number.isFinite(maybePage) ? maybePage : 1;
            }
        } else if (selVal >= 5 && selVal < 9) {
            const firstPageUrl = query + "1&filter=completed-asc";
            //console.debug("firstPageUrl:", firstPageUrl)
            firstPageHtml = await (await fetch(firstPageUrl, myInit)).text();
             const parser = new DOMParser();
            const doc = parser.parseFromString(firstPageHtml, "text/html");
            //console.debug("doc first:",doc)
            const pagination = doc.getElementsByClassName("paging");
            if (pagination.length) {
                const myCountPages = pagination[0].children;
                const maybePage = parseInt(myCountPages[myCountPages.length - 2].innerText, 10);
                myMaxPage = Number.isFinite(maybePage) ? maybePage : 1;
            }
        }
        else {
            const firstPageUrl = "https://translate.wordpress.org/locale/" + locale + query;
            firstPageHtml = await (await fetch(firstPageUrl, myInit)).text();
            myMaxPage = 1;
        }
    } catch (err) {
        console.error("Failed to fetch first page:", err);
        close_toast();
        await cuteAlert({
            type: "error",
            title: "Message",
            message: "Failed to fetch the first page!",
            buttonText: "OK",
            myWindow: window.self,
            closeStyle: "alert-close",
        });
        return;
    }

    // ----- Fetch all pages -----
    //console.debug("selval:",selVal)
    //myMaxPage = 50
    for (let pageNo = 1; pageNo <= myMaxPage; pageNo++) {
        if (selVal < 5) {
            search_url = (selVal < 9)
                ? query + pageNo + "&filter=percent-completed"
                : "https://translate.wordpress.org/locale/" + locale + query;
        }
        else if (selVal >= 5 && selVal < 9) {
             search_url = (selVal < 9)
                ? query + pageNo + "&filter=completed-asc"
                : "https://translate.wordpress.org/locale/" + locale + query;
        }

        //console.debug("every url:",search_url)
        if (pageNo % 10 === 0 || pageNo === myMaxPage) {
            await toastbox("info", "", "1500", `Fetching page ${pageNo} of ${myMaxPage}...`);
        }

        let html;
        try {
            html = (pageNo === 1) ? firstPageHtml : await (await fetch(search_url, myInit)).text();
        } catch (err) {
            console.error("Failed to fetch page:", search_url, err);
            toastbox("error", "", "3000", `Failed to fetch page ${pageNo}`);
            continue;
        }

        // Clean up lingering toast container
        try { const t = document.querySelector(".toast-container"); if (t) t.remove(); } catch(e){/*ignore*/}

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
       
        const table = doc.getElementsByClassName("project");
        
        if (!table || table.length === 0) continue;
        
        for (let i = 0; i < table.length; i++) {
            try {

                const progressline = table[i].getElementsByClassName("project-status-progress")[0];
                const progresslinevalue = progressline?.getElementsByClassName("project-status-value")[0]?.innerText;
               
                if (progresslinevalue && progresslinevalue !== "0%") {
                    const projectname = table[i].getElementsByTagName("h4")[0].innerText.trim();
                    const fetch_project = table[i].getElementsByTagName("a")[0].href;
                    allProjects.push({ projectname, fetch_project });
                }
            } catch (err) { continue; }
        }
    }

    if (!allProjects.length) {
        close_toast();
        await cuteAlert({
            type: "info",
            title: "Message",
            message: "No projects found!",
            buttonText: "OK",
            myWindow: window.self,
            closeStyle: "alert-close",
        });
        return;
    }

    await toastbox("info", "", "1500", `Processing ${allProjects.length} projects...`);

    // ----- Create or get stats container (floating panel) -----
    let statsContainer = document.getElementById("statsContainer");
    if (!statsContainer) {
        statsContainer = document.createElement("div");
        statsContainer.id = "statsContainer";
        statsContainer.style.width = "900px";
        statsContainer.style.height = "600px";
        statsContainer.style.overflow = "auto";
        statsContainer.style.border = "1px solid #ccc";
        statsContainer.style.padding = "10px";
        statsContainer.style.margin = "20px auto";
        statsContainer.style.background = "#fff";
        statsContainer.style.position = "fixed";
        statsContainer.style.top = "50px";
        statsContainer.style.left = "50%";
        statsContainer.style.transform = "translateX(-50%)";
        statsContainer.style.zIndex = "9999";
        statsContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
        statsContainer.style.cursor = "move"; // indicate draggable

        document.body.appendChild(statsContainer);

        // ----- Dragging -----
        let isDragging = false;
        let offsetX = 0, offsetY = 0;
        statsContainer.addEventListener("mousedown", (e) => {
            if (e.target.id === "closeStats") return; // ignore click on close
            isDragging = true;
            offsetX = e.clientX - statsContainer.offsetLeft;
            offsetY = e.clientY - statsContainer.offsetTop;
            statsContainer.style.transition = "none";
        });
        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            statsContainer.style.left = (e.clientX - offsetX) + "px";
            statsContainer.style.top = (e.clientY - offsetY) + "px";
        });
        document.addEventListener("mouseup", () => { isDragging = false; });
    }

    // ----- Insert HTML including Close button -----
    statsContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h2 style="margin:0; cursor:default;">Project Stats</h2>
            <button id="closeStats" style="padding:2px 6px; font-size:14px; cursor:pointer;">Close ✖</button>
        </div>
        <p id="progress">Processing 0 of ${allProjects.length} projects...</p>
        <table id="statsTable" border="1" cellspacing="0" cellpadding="4" style="width:100%;">
            <thead>
                <tr>
                    <th>Project Name</th>
                    <th>Link</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody id="statsBody"></tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>Grand Total</strong></td>
                    <td id="grandTotal">0</td>
                </tr>
            </tfoot>
        </table>
    `;

    // ----- Close button handler -----
    const closeBtn = document.getElementById("closeStats");
    closeBtn.addEventListener("click", () => statsContainer.remove());

    // ----- Process projects -----
    newresult = await process_projects(allProjects, currusername, statsContainer,onlyPTE);

    messageBox("info", "Total count result: " + newresult + "<br>For " + myType);
    close_toast();

    return newresult;
}

function hasPTEProfile(doc, profileIdOrName,resp) {
    // Find the group containing PTE editors
    //console.debug("resp:",resp)
    const editorGroups = doc.getElementsByClassName(
        "locale-project-contributors-group locale-project-contributors-editors"
    );
    //console.debug("editors:",editorGroups)
    const search = profileIdOrName.toLowerCase();

    for (let group of editorGroups) {
        // Each group has <ul><li><a href="https://profiles.wordpress.org/username/">
        const listItems = group.querySelectorAll("ul li a[href]");
        for (let link of listItems) {
            const href = link.href.toLowerCase();
            const text = link.textContent.trim().toLowerCase();
            //console.debug("href:",href)
            // Match either by URL fragment (username) or visible name
            if (href.includes(search) || text.includes(search)) {
                //console.debug(`✅ Found PTE match for ${profileIdOrName} → ${href}`);
                return true;
            }
        }
    }

    //console.debug(`❌ No PTE match for ${profileIdOrName}`);
    return false;
}




// ----- Process projects inside the container -----
async function process_projects(myProjects, currusername, container, onlyPTE) {
   // console.debug("onlyPTE:", onlyPTE)
    //console.debug("myprojects:",myProjects)
    let grandTotal = 0;
    const myInit = { redirect: "error" };

    const statsBody = container.querySelector("#statsBody");
    const grandTotalElem = container.querySelector("#grandTotal");
    const progressElem = container.querySelector("#progress");
    const statsTable = container.querySelector("#statsTable");

    for (let i = 0; i < myProjects.length; i++) {
    const { projectname, fetch_project } = myProjects[i];
    try {
        const resp = await fetch(fetch_project, myInit);
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const hasPTE = hasPTEProfile(doc, currusername,resp);

        if (hasPTE) {
            console.debug("✅ This project has the PTE:", currusername,fetch_project);
        } else {
            //console.debug("❌ No PTE found for this project:", currusername);
        }

        //console.debug("onlyPTE:", onlyPTE);

        // 🔹 Skip non-PTE projects only when checkbox is active
        if (onlyPTE && !hasPTE) {
            //console.debug(`⏭️ Skipping ${projectname} — ${currusername} is not a PTE.`);
            progressElem.innerText = `Processing ${i + 1} of ${myProjects.length} projects...`;
            continue; // ✅ Skip this one, but continue counting
        }

        // --- Continue normal stats extraction ---
        const record = doc.getElementsByClassName("gp-table");
        if (record.length > 1) {
            const contributors = record[1].getElementsByTagName("tr");
            for (let j = 1; j < contributors.length; j++) {
                const stats = contributors[j];
                const mycontrib = "contributor-" + currusername;

                if (stats.id === mycontrib) {
                    const totalValElem = stats.querySelector(".total p");
                    if (totalValElem) {
                        const val = parseFloat(totalValElem.innerText) || 0;
                        grandTotal += val;

                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${projectname}</td>
                            <td><a href="${fetch_project}" target="_blank">${fetch_project}</a></td>
                            <td>${val}</td>
                        `;
                        statsBody.appendChild(row);
                        grandTotalElem.innerText = grandTotal;
                    }
                }
            }
        }

    } catch (err) {
        console.error("Failed to fetch project:", fetch_project, err);
    }

    // ✅ Always update progress after each project
    progressElem.innerText = `Processing ${i + 1} of ${myProjects.length} projects...`;

    // Avoid freezing the UI every 25 projects
    if ((i + 1) % 25 === 0) await new Promise(r => setTimeout(r, 0));
}
   
    // ----- Make table sortable -----
    const headers = statsTable.querySelectorAll("th");
    headers.forEach((header, index) => {
        header.style.cursor = "pointer";
        header.addEventListener("click", () => {
            const tbody = statsTable.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const isNumeric = index === 2;
            rows.sort((a, b) => {
                const aText = a.cells[index].innerText.trim();
                const bText = b.cells[index].innerText.trim();
                return isNumeric 
                    ? (parseFloat(aText.replace(/,/g,"")) || 0) - (parseFloat(bText.replace(/,/g,"")) || 0)
                    : aText.localeCompare(bText);
            });
            if (header.dataset.sorted === "asc") {
                rows.reverse();
                header.dataset.sorted = "desc";
            } else {
                header.dataset.sorted = "asc";
            }
            rows.forEach(row => tbody.appendChild(row));
        });
    });
     // sort the table after fetchin the projects
    sortStatsTable();
    // ----- CSV download -----
    let saveCsv = false;
    try {
        const answer = await cuteAlert({
            type: "question",
            title: "Create CSV",
            message: "Do you want to save the CSV file?",
            confirmText: "Confirm",
            cancelText: "Cancel",
            myWindow: window.self
        });
        saveCsv = (answer === "confirm");
    } catch { saveCsv = confirm("Do you want to save the CSV file?"); }

   if (saveCsv) {
    const csvRows = [];
    // Header
    csvRows.push(['"Project Name"','"Link"','"Total"'].join(','));

    for (let i = 0; i < statsBody.rows.length; i++) {
        const cells = statsBody.rows[i].cells;
        const projectName = cells[0].innerText.replace(/"/g,'""');
        const projectLink = (cells[1].querySelector('a')?.href || "").replace(/"/g,'""');
        const total = cells[2].innerText.trim();
        csvRows.push(`"${projectName}","${projectLink}","${total}"`);
    }

    const csvText = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

    // Append date to filename
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const filename = `project_stats_${yyyy}-${mm}-${dd}.csv`;

    const dl = document.createElement("a");
    dl.href = URL.createObjectURL(blob);
    dl.download = filename;
    dl.style.display = "none";
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
}


    return grandTotal;
}

function sortStatsTable() {
    const table = document.getElementById("statTable");
    if (!table) return;

    // Collect all rows except the header
    const rows = Array.from(table.querySelectorAll("tr:not(:first-child)"));

    // Sort alphabetically by first column (project name)
    rows.sort((a, b) => {
        const nameA = a.cells[0]?.textContent.trim().toLowerCase() || "";
        const nameB = b.cells[0]?.textContent.trim().toLowerCase() || "";
        return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
    });

    // Append back to the table in sorted order
    for (const row of rows) {
        table.appendChild(row);
    }
}


function handleStats() {
	var myVal;
	let locale = checkLocale;
	var mySelection = showTypesel(locale)
		.then((user) => {
			//console.debug("user:", user)
			//if (typeof user != 'undefined') {
			//console.debug("result:", user)

			return user;
			// }
		});

	const mySelect = async () => {
		const a = await mySelection;
		//console.log(a);
		//alert("result:", a)
	};

	mySelect(locale);
}
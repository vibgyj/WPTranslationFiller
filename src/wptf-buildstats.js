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
	
	//console.debug("maxPage:",myMaxPage)
	let res = await createStatsTable(selVal,query,myType,locale);
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
	//event.preventDefault();
	var mySel;
	var dayVal;
	var myVal;
	let body = document.querySelector('body');
	// check if the user is logged in
	var curruser = document.getElementsByClassName("username");
	if (curruser.length == 0) {
		//let mywait = toastbox("error", "", "3000", "No logged on user found! ");
		messageBox("error", "No logged on user found!");
		return;
	}

	body.insertAdjacentHTML(
		'afterend',
		'<div id="myModal" class="modal"><div class="modal-content"><span class="close">&times;</span><p>Select your stats type<br>For some stats it takes a while use "X" to stop</p><select id="stattypes"><option value="1">Themes default</option><option value="2">Plugins default</option><option value="3">Themes formal</option><option value="4">Plugins formal</option><option value="5">Themes default 100%</option>'+
		'<option value = "6">Plugins default 100%</option><option value = "7">Themes formal 100%</option><option value= "8">Plugins formal 100%</option><option value = "9" >Meta default</option><option value="10">Meta formal</option></select > <br><br><button id="mySelButton">Select stat and click me to start</button></div></div>',
	);

	let modal = document.getElementById("myModal");
	modal.style.display = "block";
	let myButton = document.getElementsByClassName("mySelButton");
	document.getElementById("mySelButton").addEventListener("click", mySelection);
	// Get the <span> element that closes the modal
	let span = document.getElementsByClassName("close")[0];
	// When the user clicks on <span> (x), close the modal
	span.onclick = function () {
		//console.debug("Click event:", event.target)
		modal.style.display = "none";
	}
	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function (event) {
		if (event.target == modal) {
			//console.debug("Click event:", event.target)
			modal.style.display = "none";
		}
	}
}

async function createStatsTable(selVal, query, myType, locale) {
    let newresult = 0;
    const currWindow = window.self;
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

    await toastbox("info", "", "2000", "Starting project fetch...");

    let firstPageHtml;
    try {
        if (selVal < 9) {
            // multi-page fetch
            const firstPageUrl = query + "1&filter=percent-completed";
            firstPageHtml = await (await fetch(firstPageUrl, myInit)).text();

            // parse pagination
            const parser = new DOMParser();
            const doc = parser.parseFromString(firstPageHtml, "text/html");
            const pagination = doc.getElementsByClassName("paging");
            if (pagination.length) {
                const myCountPages = pagination[0].children;
                const maybePage = parseInt(myCountPages[myCountPages.length - 2].innerText, 10);
                myMaxPage = Number.isFinite(maybePage) ? maybePage : 1;
            }
        } else {
            // single-page selection
            const firstPageUrl = "https://translate.wordpress.org/locale/" + locale + query;
            firstPageHtml = await (await fetch(firstPageUrl, myInit)).text();
            myMaxPage = 1; // only one page
        }
    } catch (err) {
        console.error("Failed to fetch first page:", err);
        close_toast();
        await cuteAlert({
            type: "error",
            title: "Message",
            message: "Failed to fetch the first page!",
            buttonText: "OK",
            myWindow: currWindow,
            closeStyle: "alert-close",
        });
        return;
    }

    // fetch all pages if needed
    
    for (let pageNo = 1; pageNo <= myMaxPage; pageNo++) {
        let search_url;
        if (selVal < 9) {
            search_url = query + pageNo + "&filter=percent-completed";
        } else {
            search_url = "https://translate.wordpress.org/locale/" + locale + query;
        }

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
        // fetch all pages if needed
    // Clean up any lingering toast container(s)
    try { const t = document.querySelector(".toast-container"); if (t) t.remove(); } catch(e){/*ignore*/}
    try { const t2 = currWindow.document.querySelector(".toast-container"); if (t2) t2.remove(); } catch(e){/*ignore*/}
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
            } catch (err) {
                console.warn("Skipping malformed project row", err);
                continue;
            }
        }
    }

    if (!allProjects.length) {
        close_toast();
        await cuteAlert({
            type: "info",
            title: "Message",
            message: "OK no projects found!",
            buttonText: "OK",
            myWindow: currWindow,
            closeStyle: "alert-close",
        });
        return;
    }

    await toastbox("info", "", "1500", `Processing ${allProjects.length} projects...`);

    // open stats tab
    const statsWindow = window.open("", "statsWindow", "width=900,height=600");
    statsWindow.moveTo(10, 200); // move window down
    statsWindow.document.title = "Project Stats";
    statsWindow.document.body.innerHTML = `
        <h2>Project Stats</h2>
        <p id="progress">Processing 0 of ${allProjects.length} projects...</p>
        <table id="statsTable" border="1" cellspacing="0" cellpadding="4">
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

    try {
        newresult = await process_projects(allProjects, currusername, statsWindow);
    } catch (err) {
        console.error("createStatsTable: process_projects failed", err);
        close_toast();
        await cuteAlert({
            type: "error",
            title: "Message",
            message: "Failed while processing projects!",
            buttonText: "OK",
            myWindow: currWindow,
            closeStyle: "alert-close",
        });
        return;
    }

    messageBox("info", "Total count result: " + newresult + "<br>For " + myType);
    close_toast();

    return newresult;
}


async function process_projects(myProjects, currusername, currWindow) {
    console.log("process_projects: start, projects:", myProjects.length, "user:", currusername);
    let grandTotal = 0;
    const myInit = { redirect: "error" };

    // Move window further down so alerts appear above
    try { currWindow.moveTo(10, 500); } catch (e) { /* ignore */ }

    const statsBody = currWindow.document.getElementById("statsBody");
    const grandTotalElem = currWindow.document.getElementById("grandTotal");
    const progressElem = currWindow.document.getElementById("progress");
    const statsTable = currWindow.document.getElementById("statsTable");

    if (!statsBody || !grandTotalElem || !progressElem || !statsTable) {
        console.error("process_projects: required elements missing", { statsBody, grandTotalElem, progressElem, statsTable });
        throw new Error("Missing elements in statsWindow");
    }

    // Make link column wider
    try { statsTable.querySelectorAll("th")[1].style.minWidth = "500px"; } catch (e) { /* ignore */ }

    // Process each project and append rows
    for (let i = 0; i < myProjects.length; i++) {
        const { projectname, fetch_project } = myProjects[i];
        try {
            const resp = await fetch(fetch_project, myInit);
            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const record = doc.getElementsByClassName("gp-table");
            if (record.length > 1) {
                const contributer = record[1].getElementsByTagName("tr");
                for (let j = 1; j < contributer.length; j++) {
                    const stats = contributer[j];
                    const mycontrib = "contributor-" + currusername;
                    if (stats.id === mycontrib) {
                        const totalValElem = stats.querySelector(".total p");
                        if (totalValElem) {
                            const val = parseFloat(totalValElem.innerText) || 0;
                            grandTotal += val;

                            const row = currWindow.document.createElement("tr");

                            // Project name
                            const nameCell = currWindow.document.createElement("td");
                            nameCell.innerText = projectname;

                            // Project link
                            const linkCell = currWindow.document.createElement("td");
                            const a = currWindow.document.createElement("a");
                            a.href = fetch_project;
                            a.target = "_blank";
                            a.innerText = fetch_project;
                            linkCell.appendChild(a);

                            // Total
                            const totalCell = currWindow.document.createElement("td");
                            totalCell.innerText = val;

                            row.appendChild(nameCell);
                            row.appendChild(linkCell);
                            row.appendChild(totalCell);
                            statsBody.appendChild(row);

                            // Update grand total
                            grandTotalElem.innerText = grandTotal;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch project:", fetch_project, err);
        }

        // Update progress
        progressElem.innerText = `Processing ${i + 1} of ${myProjects.length} projects...`;

        // yield to UI occasionally
        if ((i + 1) % 25 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Make table sortable (after rows appended)
    function makeTableSortable(table) {
        const headers = table.querySelectorAll("th");
        headers.forEach((header, index) => {
            header.style.cursor = "pointer";
            header.addEventListener("click", () => {
                const tbody = table.querySelector("tbody");
                const rows = Array.from(tbody.querySelectorAll("tr"));
                const isNumeric = index === 2; // Total column
                rows.sort((a, b) => {
                    const aText = a.cells[index].innerText.trim();
                    const bText = b.cells[index].innerText.trim();
                    if (isNumeric) {
                        const na = parseFloat(aText.replace(/,/g, "")) || 0;
                        const nb = parseFloat(bText.replace(/,/g, "")) || 0;
                        return na - nb;
                    }
                    return aText.localeCompare(bText);
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
    }
    makeTableSortable(statsTable);

    // Ask user in main window (safer) whether to save CSV; download will be triggered in stats window
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
    } catch (err) {
        console.warn("cuteAlert failed, fallback to confirm()", err);
        saveCsv = confirm("Do you want to save the CSV file?");
    }

   if (saveCsv) {
    const csvRows = [];
    // Header
    csvRows.push(['"Project Name"','"Link"','"Total"'].join(','));

    for (let i = 0; i < statsBody.rows.length; i++) {
        const cells = statsBody.rows[i].cells;
        const projectName = cells[0].innerText.replace(/"/g,'""');
        const projectLink = (cells[1].querySelector('a')?.href || "").replace(/"/g,'""');
        const total = cells[2].innerText.trim();

        // All values quoted
        csvRows.push(`"${projectName}","${projectLink}","${total}"`);
    }

    // CRLF line endings + BOM
    const csvText = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

    const dl = currWindow.document.createElement("a");
    dl.href = URL.createObjectURL(blob);
    dl.download = "project_stats.csv";
    currWindow.document.body.appendChild(dl);
    dl.click();
    currWindow.document.body.removeChild(dl);




    } else {
        messageBox("info", "CSV creation cancelled");
    }

    // Clean up any lingering toast container(s)
    try { const t = document.querySelector(".toast-container"); if (t) t.remove(); } catch(e){/*ignore*/}
    try { const t2 = currWindow.document.querySelector(".toast-container"); if (t2) t2.remove(); } catch(e){/*ignore*/}

    return grandTotal;
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
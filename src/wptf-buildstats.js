// This file contains code ro generate project stats
async function mySelection() {
	var eID = document.getElementById("stattypes");
	var selVal = eID.options[eID.selectedIndex].value;
	var modal = document.getElementById("myModal");
	var myMaxPage;
	modal.style.display = "none";
	//console.debug("selVal:", selVal,locale)

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
	let res = await createStatsTable(selVal,query,myType);
	if (res == "done") {
		toastbox("info", "", "5000", "Fetching page counts done!");
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
		'<option value = "6">Plugins default 100%</option><option value = "7">Themes formal 100%</option><option value= "8">Plugins formal 100%</option>< option value = "9" > Meta default</option > <option value="10">Meta formal</option></select > <br><br><button id="mySelButton">Select stat and click me to start</button></div></div>',
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

async function createStatsTable(selVal,query,myType) {
	var newresult = 0;
	var currWindow = window.self;
	var wind = "myWindow";
	var myProjects = [];
	var pageNo = 0;
	var query;
	var search_url;
	var currusername;
	var local = checkLocale();
	var myCountPages;
	var myMaxPage = 1;

	//console.debug("checkloc:",local,selVal)
	const myInit = {
		redirect: "error"
	};
	
	var curruser = document.getElementsByClassName("username");
	if (curruser.length == 0) {
		//let mywait = toastbox("error", "", "3000", "No logged on user found! ");
		messageBox("error", "No logged on user found!");
		return;
	}
	// 26-011-2022 PSS added collect username to select it from projects
	else {
		currusername = curruser[0].innerText;
	}

	for (pageNo = 1; pageNo <= myMaxPage ; pageNo++) {
		if (selVal < 5) {
			search_url = query + pageNo + "&filter=percent-completed";
			console.debug("search:", search_url)
		}
		else if (selVal == 5 || selVal ==6) {
			search_url = query + pageNo + "&filter=completed-asc";
		}
		else if (selVal == 7 || selVal == 8) {
			search_url = query + pageNo + "&filter=completed-asc";
		}
		else {
			search_url = local + query;
		}
		//console.debug("search in fetch:",selVal, search_url)
		let result = await fetch(search_url, myInit)
			.then(function (response) {
				// When the page is loaded convert it to text
				if (myMaxPage > 1) {
					let mywait = toastbox("info", "", "3000", "Fetching page counts page<br>Page: " + (pageNo) + " out of: " + myMaxPage + "<br> For " + myType);
				}
				else {
					let mywait = toastbox("info", "", "3000", "Fetching page counts page<br>Page: " + (pageNo));

                }
				let myResponse = response.text();
				return myResponse;
			})
			.then(function (html) {
				// Initialize the DOM parser
				var parser = new DOMParser();
				// Parse the text
				var doc = parser.parseFromString(html, "text/html");
				// fetch page count from new window
				var pagination = doc.getElementsByClassName("paging");
				// Fetch the last pageNo if multiple pages
				if (pagination.length != 0) {
					myCountPages = doc.getElementsByClassName("paging")[0].children;
					myMaxPage = parseFloat(myCountPages[myCountPages.length - 2].innerText)
				}
				else {
					myMaxPage = 1;
				}
				var table = doc.getElementsByClassName("project");
				if (typeof table != "undefined") {
					myProjects = [];
					var Rows = table.length;
					var rowCount = 0;
					var replCount = 0;
					for (i = 0; i < Rows; i++) {
						let progressline = table[i].getElementsByClassName("project-status-progress")
						let progresslinevalue = progressline[0].getElementsByClassName("project-status-value")
						progresslinevalue = progresslinevalue[0].innerText
						if (progresslinevalue != "0%") {
							let name = table[i].getElementsByTagName("h4");
							let projectname = name[0].innerText;
							projectname = projectname.trim();
							//console.debug("Project:", projectname)
							let link = table[i].getElementsByTagName("a")
							let fetch_project = link[0].href
							//console.debug("Project:", fetch_project)
							myProjects.push({ projectname, fetch_project });
							rowCount++;
						}
						else {
							rowCount = 0;
            }

					}
					if (rowCount == 0) {
						close_toast();
						console.debug("No projects found")
						
						cuteAlert({
							type: "info",
							title: "Message",
							message: "OK no projects found!",
							buttonText: "OK",
							myWindow: currWindow,
							closeStyle: "alert-close",
						});
					}
					console.debug("Search ended:");
				} else {
					cuteAlert({
						type: "error",
						title: "Message",
						message: "No records found!",
						buttonText: "OK",
						myWindow: currWindow,
						closeStyle: "alert-close",
					});
				}
				return [myProjects,currusername,myType]

			}).then(async function (myProjects) {
				let currusername = myProjects[1];
				let myType = myProjects[2];
				let result = await process_projects(myProjects[0],currusername);
				newresult = newresult + result;
				console.debug(" result:", result);
				console.debug("grandtotal: ", newresult);
				//messageBox("info", "Page count result: " + result);
				return [newresult,myType];
				
			}).then(function (newresult) {
				messageBox("info", "Total count result: " + newresult[0] + "<br>For " + newresult[1]);
      })
			.catch(function (err) {
				//console.log("Failed to fetch page: ", err);
				cuteAlert({
					type: "error",
					title: "Message",
					message:"Failed to fetch the page!",
					buttonText: "OK",
					myWindow: currWindow,
					closeStyle: "alert-close",
				});
				
				//else {
				//cuteAlert({
				//	type: "error",
				//	title: "Message",
				//	message: "Locale option not set!!",
				//buttonText: "OK",
				//myWindow: "",
				//	closeStyle: "alert-close",
			});
		
	}
	close_toast();
	return "done"
}


 async function process_projects(myProjects,currusername) {
	//console.debug("processing projects");
	//console.debug("Projects found:", myProjects)
	var arrayLength = myProjects.length;
	//console.debug("Array length:",arrayLength)
	var contributer;
	var grandTotal = 0;
	var totalVal = 0;
	const myInit = {
		redirect: "error"
	};
	for (var i = 0; i < arrayLength; i++) {
		//console.log(myProjects[i].fetch_project);
		search_url = myProjects[i].fetch_project;

		let res = await fetch(search_url, myInit,grandTotal)
			.then(function (response) {
				// When the page is loaded convert it to text
				return response.text();
			})
			.then(function (html) {
				
				// Initialize the DOM parser
				//console.debug("html:",html);
				var parser = new DOMParser();
				// Parse the text
				var doc = parser.parseFromString(html, "text/html");
				//console.debug("found:", doc)
				let record = doc.getElementsByClassName("gp-table");
				
				//console.debug("Table found:", record[1])
				//console.debug(typeof record)
				if (typeof record != 'undefined') {
					if (record.length >1) {
						contributer = record[1].getElementsByTagName("tr")
						//console.debug("Contributer found:", contributer)
						if (typeof contributer == 'object') {
							let contributerLen = contributer.length;
							//console.debug("lengte:",contributerLen)

							for (var i = 1; i < contributerLen; i++) {
								let stats = contributer.item(i)
								//console.debug("Stats found:", stats, "'" + stats.id + "'")
								let idFound = stats.id;
								let mycontrib = "contributor-" + currusername;
								if (idFound == mycontrib) {
									console.debug("found mycontributer:", mycontrib)
									console.debug("Stats found:", search_url)
									let myStats = stats.querySelector('[class="total"]')
									totalVal = myStats.getElementsByTagName('p');
									totalVal = totalVal[0].innerHTML;
									console.debug('TotalValue:', parseFloat(totalVal))
									grandTotal = grandTotal + parseFloat(totalVal)
								}
							}
						}
					}
					else {
						console.debug("No translators!",search_url)
          }
				}
				else {
					console.debug("no gptable!")
        }
				
			})
			.catch(function (err) {
				console.log("Failed to fetch page: ", err);
			});
		
	}
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
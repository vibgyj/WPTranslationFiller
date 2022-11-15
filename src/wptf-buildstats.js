// This file contains code ro generate project stats
async function mySelection() {
	var eID = document.getElementById("stattypes");
	var selVal = eID.options[eID.selectedIndex].value;
	locale = checkLocale();
	var modal = document.getElementById("myModal");
	modal.style.display = "none";
	let res = await createStatsTable(locale, selVal);
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
async function showTypesel(myVal) {
	//event.preventDefault();
	var mySel;
	var dayVal;
	var myVal;
	let body = document.querySelector('body');
	body.insertAdjacentHTML(
		'afterend',
		'<div id="myModal" class="modal"><div class="modal-content"><span class="close">&times;</span><p>Select your stats type<br>For some stats it takes a while use "X" to stop</p><select id="stattypes"><option value="1">Themes default</option><option value="2">Plugins default</option><option value="3">Themes formal</option><option value="4">Plugins formal</option><option value="5">Meta default</option><option value="6">Meta formal</option></select><br><br><button id="mySelButton">Select stat and click me to start</button></div></div>',
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

async function createStatsTable(locale,selVal) {
	var newresult = 0;
	var currentLocation = window.location;
	var wind = "myWindow";
	var myProjects = [];
	locale = 'nl';
	var pageNo = 0;
	var query;
	var myType;
	var search_url;
	const myInit = {
		redirect: "error"
	};
	// check if the user is logged in
	var curruser = document.getElementsByClassName("username");
	if (curruser.length == 0) {
		//let mywait = toastbox("error", "", "3000", "No logged on user found! ");
		messageBox("error", "No logged on user found!");
		return;
	}
	// check if pagina exists
	var pagination = document.getElementsByClassName("paging");
	// Fetch the last pageNo if multiple pages
	if (pagination.length != 0) {
		var myCountPages = document.getElementsByClassName("paging")[0].children;
		var myMaxPage = parseFloat(myCountPages[myCountPages.length - 2].innerText)
	}
	else {
		myMaxPage = 1;
    }
	//console.debug("next:", myMaxPage);
	//if (typeof locale != "undefined" && locale != "") {
	//cuteAlert({
	//	type: "question",
	//	title: "Create a back-up for check afterwards",
	//	message: "To proceed it is necessary to create a back-up!",
	//	confirmText: "Yes proceed",
	//	cancelText: "No stop",
	//	closeStyle: "",
	//	myWindow: currentLocation,
	//   }).then((e) => {
	//if (e == "confirm") {
	//		cuteToast({
	//			type: "info",
	//		message: "Please wait while data is fetched\n",
	//		timer: 2000,
	//		playSound: null,
	//		title: "Fetching records",
	//	img: "/img",
	//	myWindow: currentLocation,
	//});
	
	if (selVal === '1') {
		query = "/default/wp-themes/?s=&page="
		myType = "Themes default"
	}
	else if (selVal === '2') {
		query = "/default/wp-plugins/?s=&page="
		myType="Plugins default"
	}
	else if (selVal === '3') {
		query = "/formal/wp-themes/?s=&page="
		myType = "Themes formal"
	}
	else if (selVal === '4') {
		myType = "Plugins formal"
		query = "/formal/wp-plugins/?s=&page="
	}
	else if (selVal === '5') {
		myType = "Meta default"
		query = "/default/meta/"
	}
	else if (selVal === '6') {
		myType = "Meta formal"
		query = "/formal/meta/"
	}
	else {
		myType = "Themes"
		query = "/default/wp-themes/?s=&page="
    }
	for (pageNo = 1; pageNo <= myMaxPage ; pageNo++) {
		console.debug("page:", pageNo)
		if (myType < 5) {
			search_url = "https://translate.wordpress.org/locale/" + locale + query + pageNo + "&filter=percent-completed";
		}
		else {
			search_url = "https://translate.wordpress.org/locale/" + locale + query;
        }
		let result = await fetch(search_url, myInit)
			.then(function (response) {
				// When the page is loaded convert it to text
				let mywait = toastbox("info", "", "3000", "Fetching page counts page<br>Page: "+ (pageNo) +" out of: "+ myMaxPage + "<br> For " + myType);
				return response.text(myType);
			})
			.then(function (html,myType) {
				// Initialize the DOM parser
				//console.debug("html:",html);
				var parser = new DOMParser();
				// Parse the text
				var doc = parser.parseFromString(html, "text/html");
				//var trs = doc.getElementsByTagName("tr");
				//var table = doc.getElementsByClassName("project-name");
				var table = doc.getElementsByClassName("project");
				//var mytable = doc.getElementsByTagName("table")[0];
				//console.debug("myTable:", table);
				if (typeof table != "undefined") {
					myProjects = [];
					//var mytablebody = mytable.getElementsByTagName("tbody")[0];
					var Rows = table.length;
					//console.debug("Projectlines:", Rows)
					var rowCount = 0;
					var replCount = 0;
					for (i = 0; i < Rows; i++) {
						
						let progressline = table[i].getElementsByClassName("project-status-progress")
						//console.debug("progressline:", progressline)
						let progresslinevalue = progressline[0].getElementsByClassName("project-status-value")
						progresslinevalue = progresslinevalue[0].innerText
						//console.debug("progresslinevalue:", progresslinevalue)
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
					//console.debug("myProjects:", myProjects)
					//console.debug("Replcount:", rowCount);
					if (rowCount == 0) {
						close_toast();
						console.debug("No projects found")
						//console.debug("mywindow:", myWindow);
						//cuteAlert({
						//	type: "info",
						//	title: "Message",
						//	message: "OK no records to replace!",
						//	buttonText: "OK",
						//	myWindow: currWindow,
						//	closeStyle: "alert-close",
						//});
					}
					console.debug("Search ended:");
					// now we can process the results

					//consistsWindow.close();
				}
				else {
					cuteAlert({
						type: "error",
						title: "Message",
						message: "No records found!",
						buttonText: "OK",
						myWindow:"",
						closeStyle: "alert-close",
					});
				}
				
				return myProjects

			    }).then(async function (myProjects,currusername,myType) {
				//console.debug("in then:", myProjects)
				let result = await process_projects(myProjects,currusername);
				newresult = newresult + result
				console.debug(" result:", result)
				console.debug("grandtotal: ", newresult)
				//messageBox("info", "Page count result: " + result);
				return newresult;
				
			}).then(function (newresult) {
				messageBox("info", "Total count result: " + newresult + "<br>For " + myType);
            })
			.catch(function (err) {
				console.log("Failed to fetch page: ", err);
				cuteAlert({
					type: "error",
					title: "Message",
					buttonText: "OK",
					myWindow: "",
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
								let contrib = stats.id;
								//contrib = contrib.trim();
								contrib = "contributer-" + currusername;
								if (contrib == "contributer-" + currusername) {
									//console.debug("found mycontributer:", contrib)
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
	var mySelection = showTypesel()
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

	mySelect();
}
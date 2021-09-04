function scrapeconsistency(locale) {
	var currentLocation = window.location;
	var wind;
	wind = "myWindow";
	//console.debug("Locale:", locale);
	//var locale = "nl";
	// 09-08-2021 PSS fixed problem with not opening new windows in Chrome issue #114
	var consistsWindow = window.open("https://translate.wordpress.org/consistency/?search=&set=" + locale + "%2Fdefault","https://translate.wordpress.org/consistency/?search=&set=" + locale + "%2Fdefault");
	var myWindow = window.open("", "_blanc");
	//console.debug('myWindow:', myWindow);
	var meta = document.createElement('meta');
	meta.setAttribute('name', 'viewport');
	meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
	meta.setAttribute('Content-Type', 'image/svg+xml');
	myWindow.document.getElementsByTagName('head')[0].appendChild(meta);
	//myWindow.focus();
	
	const style = myWindow.document.createElement('style');
    style.innerHTML = `
      input.searchfor {
        background-color: lightgrey !important;
        color:black;
		padding :8px !important;
	    margin: 10px 10px !important;
      }
	  input.wrongverb {
        background-color: lightgrey !important;
        color:black;
		padding :8px !important;
	    margin: 10px 10px !important;
      }
	  input.replverb {
        background-color: lightgrey !important;
        color:black;
		padding :8px !important;
	    margin: 10px 10px !important;
      }
	  #submit-consist{ 

	   padding :8px !important;
	   margin: 10px 10px;
	   background: #0085ba !important;
       border-color: #0073aa #006799 #006799;
       box-shadow: 0 1px 0 #006799;
       color: #fff !important;
      }
	  button.return-button{
	  padding :8px !important;
	  margin: 10px 10px !important;
	  background: #0085ba !important;
      border-color: #0073aa #006799 #006799;
      box-shadow: 0 1px 0 #006799;
      color: #fff !important;
      }

	 h3 {
		color: #0085ba;  
        width: 100%;
	 }

     /**header of the script showing WordPress.org**/
	 #wptf_head{
		 background:lightgrey !important;
         margin: auto;
         width: 50%;
	 }
	 a { text-decoration: none;
        color:white;
       font-size:32;     
        width: 100%;
      	   }
     /**container decoration**/
     paranode { text-decoration: none;
        color:black;
        width: 100%;
      	   }
     #wptf_container {
        margin: auto;
        width: 50%;
      	   }

     /**main container of pling**/

    .custom .box{
     background:#333 !important;
     color:#fff !important;
     width: 50% !important;
     }

     /**title of the alert**/
     .custom .title{
     background:#64B5F6 ! important;
     color:#fff !important;
     }

     /**content of the alert**/
     .custom .content{
     color:#fff !important;
     }

     /**ok button**/
     .custom .btn{
     background:#333 !important;
     color:#fff !important;
	 font-size:18 !important;
     border:2px solid rgba(1000, 1000, 1000, 0.50) !important;
     }
     /** Start of cuteAlert **/
@import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Dosis:wght@800&display=swap");

.alert-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  margin: 0px auto;
  padding: 0px auto;
  left: 0;
  top: 0;
  overflow: hidden;
  position: fixed;
  background: rgb(0, 0, 0, 0.3);
  z-index: 999999;
}

@keyframes open-frame {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(0.97);
  }
  75% {
    transform: scale(0.93);
  }
  100% {
    transform: scale(1);
  }
}

.alert-frame {
  background: #fff;
  min-height: 400px;
  width: 300px;
  box-shadow: 5px 5px 10px rgb(0, 0, 0, 0.2);
  border-radius: 10px;
  animation: open-frame 0.3s linear;
}

.alert-header {
  display: flex;
  flex-direction: row;
  height: 175px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
}

.alert-img {
  height: 80px;
  width: 80px;
  position: absolute;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  align-self: center;
}

.alert-close {
  width: 30px;
  height: 30px;
  color: rgb(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Dosis", sans-serif;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  line-height: 30px;
  transition: color 0.5s;
  margin-left: auto;
  margin-right: 5px;
  margin-top: 5px;
}

.alert-close-circle {
  width: 30px;
  height: 30px;
  background: #e4eae7;
  color: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 17.5px;
  margin-top: -15px;
  margin-right: -15px;
  font-family: "Dosis", sans-serif;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  line-height: 30px;
  transition: background 0.5s;
  margin-left: auto;
}

.alert-close-circle:hover {
  background: #fff;
}

.alert-close:hover {
  color: rgb(0, 0, 0, 0.5);
}

.alert-body {
  padding: 30px 30px;
  display: flex;
  flex-direction: column;
  text-align: center;
}

.alert-title {
  font-size: 18px !important;
  font-family: "Open Sans", sans-serif;
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 35px;
  color: #222;
  align-self: center;
}

.alert-message {
  font-size: 15px !important;
  color: #666;
  font-family: "Open Sans", sans-serif;
  font-weight: 400;
  font-size: 15px;
  text-align: center;
  margin-bottom: 35px;
  line-height: 1.6;
  align-self: center;
}

.alert-button {
  min-width: 140px;
  height: 35px;
  border-radius: 20px;
  font-family: "Open Sans", sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: white;
  border: none;
  cursor: pointer;
  transition: background 0.5s;
  padding: 0 15px;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alert-button:focus {
  outline: 0;
}

.question-buttons {
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.confirm-button {
  min-width: 100px;
  height: 35px;
  border-radius: 20px;
  font-family: "Open Sans", sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: white;
  border: none;
  cursor: pointer;
  transition: background 0.5s;
  padding: 0 15px;
  margin-right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.confirm-button:focus {
  outline: 0;
}

.cancel-button {
  min-width: 100px;
  height: 35px;
  border-radius: 20px;
  font-family: "Open Sans", sans-serif;
  font-weight: 400;
  font-size: 15px;
  color: white;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1.6;
  transition: background 0.5s;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cancel-button:focus {
  outline: 0;
}

@keyframes open-toast {
  0% {
    transform: scaleX(1) scaleY(1);
  }
  20%,
  45% {
    transform: scaleX(1.35) scaleY(0.1);
  }
  65% {
    transform: scaleX(0.8) scaleY(1.7);
  }
  80% {
    transform: scaleX(0.6) scaleY(0.85);
  }
  100% {
    transform: scaleX(1) scaleY(1);
  }
}

.toast-container {
  top: 15px;
  right: 15px;
  overflow: hidden;
  position: fixed;
  border-radius: 5px;
  box-shadow: 0 0 20px rgb(0, 0, 0, 0.2);
  animation: open-toast 0.3s linear;
  z-index: 999999;
}

.toast-frame {
  padding: 5px 15px;
  display: flex;
  min-width: 100px;
  height: 60px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.toast-img {
  height: 40px;
}

.toast-message {
  font-size: 14px !important;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #fff;
  margin-left: 15px;
}

.toast-close {
  color: rgb(0, 0, 0, 0.2);
  font-family: "Dosis", sans-serif;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.5s;
  margin-left: 25px;
}

@keyframes timer {
  0% {
    width: 100%;
  }
  25% {
    width: 75%;
  }
  50% {
    width: 50%;
  }
  75% {
    width: 25%;
  }
  100% {
    width: 1%;
  }
}

.toast-timer {
  width: 1%;
  height: 5px;
}

.toast-close:hover {
  color: rgb(0, 0, 0, 0.5);
}

.error-bg {
  background: #d85261;
}

.success-bg {
  background: #2dd284;
}

.warning-bg {
  background: #fada5e;
}

.question-bg {
  background: #779ecb;
}

.error-btn:hover {
  background: #e5a4b4;
}

.success-btn:hover {
  background: #6edaa4;
}

.warning-btn:hover {
  background: #fcecae;
}

.info-btn:hover {
  background: #c3e6fb;
}

.question-btn:hover {
  background: #bacee4;
}

.error-timer {
  background: #e5a4b4;
}

.success-timer {
  background: #6edaa4;
}

.warning-timer {
  background: #fcecae;
}

.info-timer {
  background: #c3e6fb;
}

.info-bg {
  background: #88cef7;
}

     /** End of cuteAlert **/
    `;
     myWindow.document.head.appendChild(style);
	//myWindow.focus();
	var dv = myWindow.document.createElement('div');
	dv.setAttribute('id', "wptf_head");
	myWindow.document.getElementsByTagName('body')[0].appendChild(dv);
		
    var a = myWindow.document.createElement('a');               
    var link = myWindow.document.createTextNode("WordPress.org");
    a.appendChild(link);                   
    a.title = "WordPress.org";                   
    a.href = "https://www.wordpress.org"; 				
    // Append the anchor element to my head.               
    myWindow.document.getElementById('wptf_head').appendChild(a);
	myWindow.document.getElementById('wptf_head').innerHTML +=
	"<h3>Enter verbs for Search, Wrong verb, Replace verb</h3>";
	
	var f = myWindow.document.createElement("form");
    f.setAttribute('method', "post");
	f.setAttribute('name', "myForm" );
	f.setAttribute('class', "myForm");
	f.setAttribute('id', "myForm");
    
    var i = myWindow.document.createElement("input"); //input element, text
    i.setAttribute('type', "text");
	i.setAttribute('class', "searchfor");
    i.setAttribute('name', "searchfor");
	i.setAttribute('id', "searchfor");
	
	i.setAttribute('placeholder', "Searchfor");
	
	
	var j = myWindow.document.createElement("input"); //input element, text
    j.setAttribute('type', "text");
	j.setAttribute('class', "wrongverb");
    j.setAttribute('name', "wrongverb");
	j.setAttribute('id', "wrongverb");
	
	j.setAttribute('placeholder', "Wrong verb");
	
	var k = myWindow.document.createElement("input"); //input element, text
	k.setAttribute('type', "text");
	k.setAttribute('class', "replverb");
    k.setAttribute('name', "replverb");
	k.setAttribute('id', "replverb");
	
	k.setAttribute('placeholder', "Replace verb");
	
    var s = myWindow.document.createElement("input"); //input element, Submit button
    s.setAttribute('type', "submit");
	s.setAttribute('id', "submit-consist");
	s.setAttribute('class', "submit-consist");
    s.setAttribute('value', "Submit");
	s.setAttribute('text', "Submit");
	
	s.onclick = function() {
        startsearch(myWindow,currentLocation,locale,consistsWindow);
    };
	
	var SavelocalButton = myWindow.document.createElement('button');
	
        SavelocalButton.id = "return-button";
        SavelocalButton.className = "return-button";
		SavelocalButton.innerText = "Close window";
        SavelocalButton.onclick = function() {
			submitClicked(myWindow, consistsWindow);
};
    
    const br = myWindow.document.createElement("br");
	
    i.appendChild(br);
	f.appendChild(i);
	f.appendChild(j);
	f.appendChild(k);
	f.appendChild(br);
    f.appendChild(s);
	f.appendChild(SavelocalButton);
	
	var container = myWindow.document.createElement('div');
	container.setAttribute('id', "wptf_container");
	myWindow.document.getElementsByTagName('body')[0].appendChild(container);
	myWindow.document.getElementById('wptf_container').appendChild(f);
	var paradiv = myWindow.document.createElement('div');
	paradiv.id = "paradiv";
	myWindow.document.getElementById('wptf_container').appendChild(paradiv);
	const para = myWindow.document.createElement("p");
	const paranode = myWindow.document.createTextNode("-->Please be patient it can sometimes take a bit before the result windows are opened!");
	myWindow.document.getElementById('paradiv').appendChild(paranode);	
}

function submitClicked(myWindow, consistsWindow)
{
	consistsWindow.close();
	myWindow.close();
}

function startsearch(myWindow,curloc,locale,consistsWindow) {
	 
	event.preventDefault();
	
	var searchverb = myWindow.document.getElementById("myForm").elements.namedItem("searchfor").value;
	var replverb = myWindow.document.getElementById("myForm").elements.namedItem("replverb").value;
	var wrongverb = myWindow.document.getElementById("myForm").elements.namedItem("wrongverb").value;
	//console.debug("search:",searchverb,"  ",replverb,"  ",wrongverb);
	if (searchverb && replverb && wrongverb !=null){
		var search_url= 'https://translate.wordpress.org/consistency/?search=' + searchverb + '&set=' + locale +'%2Fdefault&project=&search_case_sensitive=1';
		//console.debug("Searchfor:",search_url);
		const myInit = {
        redirect: "error"
         };
		
		confirm_msg = 'A log of replaced translations will be downloaded.\n';
		confirm_msg += 'Before downloading the file the windows will be opened!\n';
		confirm_msg += 'The records will be replaced are you sure to continue?';
		//console.debug("myWindow:", myWindow);
		cuteAlert({
			type: "question",
			title: "Create a back-up for check afterwards",
			message: "To proceed it is necessary to create a back-up!",
			confirmText: "Yes proceed",
			cancelText: "No stop",
			closeStyle: "",
			myWindow : myWindow,
		}).then((e) => {

			if (e == "confirm") {
				cuteToast({
					type: "info",
					message: "Please wait while data is fetched",
					timer: 5000,
					myWindow,
				});
				fetch(search_url, myInit)
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

						// console.debug(doc);
						//var trs = doc.getElementsByTagName("tr");
						var table = doc.getElementById("consistency-table");
						var mytable = doc.getElementsByTagName("table")[0];
						var mytablebody = mytable.getElementsByTagName("tbody")[0];
						var Rows = mytable.rows.length;
						var rowCount = 0;
						var replCount = 0;
						if (Rows > 500) {
							Rows = 500;
						}
						var replace_links = '';
						for (var i = 1; i < Rows - 2; i++) {
							rowCount++;
							let myrow = mytablebody.getElementsByTagName("tr")[rowCount];
							var mycel1 = myrow.getElementsByTagName("td")[0];
							if (mycel1 != undefined) {
								var orgtext = mycel1.childNodes[0].innerText;
								var mycel11 = mycel1.childNodes[2];
								var myceltext12 = mycel11.getElementsByTagName("a");
								var myorglink = myceltext12.item(0).href;
								var textorglink = myorglink.innerText;
								var mycel2 = myrow.getElementsByTagName("td")[1];
								var transtext = mycel2.childNodes[0].innerText;
								var myceltext3 = mycel2.childNodes[2];
								var myceltext4 = myceltext3.getElementsByTagName("a");
								var mylink = myceltext4.item(0).href;
								//console.debug('Translated:',transtext);

								if (transtext == wrongverb) {
									let isFound = myorglink.search("dev");
									if (isFound == -1) {
										-i;
										replCount++;
										// Max25 windows will be opened
										if (replCount < 25) {
											newWindow = window.open(mylink + "&wrongverb=" + wrongverb + "&replverb=" + replverb, mylink + "&wrongverb=" + wrongverb + "&replverb=" + replverb);
											replace_links += mylink + '\n';
										}
									}
								}
								else {
									-i;
								}
							}
						}
						//console.debug("Replcount:", replCount);
						if (replCount == 0) {
							//console.debug("mywindow:", myWindow);
							cuteAlert({
								type: "info",
								title: "Message",
								message: "OK no records to replace!",
								buttonText: "OK",
								myWindow: myWindow,
								closeStyle: "alert-close",
							});
						}
						//console.debug("Search ended:");
						if (replCount != 0) {
							var current_date = new Date();
							wptf_download('[' + current_date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' wptf replace log.txt]', replace_links, myWindow);
						}
						consistsWindow.close();
					})
					.catch(function (err) {
						//console.log('Failed to fetch page: ', err);
						cuteAlert({
							type: "error",
							title: "Message",
							message: "Missing fieldvalue" +err,
							buttonText: "OK",
							myWindow: myWindow,
							closeStyle: "alert-close",
						});	
					});
			}
			else {
				cuteAlert({
					type: "info",
					title: "Message",
					message: "OK cancelled no replacements!",
					buttonText: "OK",
					myWindow: myWindow,
					closeStyle: "alert-close",
				});
			}
		});
	}
	else {
		event.preventDefault();
		cuteAlert({
			type: "error",
			title: "Message",
			message: "Missing fieldvalue",
			buttonText: "OK",
			myWindow: myWindow,
			closeStyle:"alert-close",
		});
		consistsWindow.close();
	}
}
 
function wptf_download( filename, text,myWindow) {
        var element = myWindow.document.createElement( 'a' );
        element.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( text ) );
        element.setAttribute( 'download', filename );
        element.style.display = 'none';
        myWindow.document.body.appendChild( element );
        element.click();
        myWindow.document.body.removeChild( element );
}
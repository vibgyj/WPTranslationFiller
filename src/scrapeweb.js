function scrapeconsistency() {
	var currentLocation = window.location;
	var wind;
	wind = "myWindow";
	var locale = "nl";
	var myWindow = window.open("","_blanc");
	
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
      #dbox {
      /* (A1) CENTER ON PAGE */
      position: relative;
      top: 40%; left: 50%;
      transform: translate(-50%);
      /* (A2) DIMENSIONS */
      width: 400px;
      padding: 10px;
      /* (A3) COLORS */
      color: #333;
      border: 1px solid #c52828;
      background: #ffebe1;
      /* (A4) HIDE */
     display: none;
     }
	
	 h3 {
		color: #0085ba; 
	 }
	 #wptf_head{
		 background:lightgrey !important;
	 }
	 a { text-decoration: none;
        color:white;
       font-size:32;	
      	   }
    `;
     myWindow.document.head.appendChild(style);
	//myWindow.focus();
	var dv = myWindow.document.createElement('div');
	dv.setAttribute('id', "wptf_head");
	myWindow.document.getElementsByTagName('body')[0].appendChild(dv);
		
    var a = myWindow.document.createElement('a');               
	// Create the text node for anchor element.
    var link = myWindow.document.createTextNode("WordPress.org");
    // Append the text node to anchor element.
    a.appendChild(link);                   
    // Set the title.
    a.title = "WordPress.org";                   
    // Set the href property.
    a.href = "https://www.wordpress.org"; 				
    // Append the anchor element to the body.               
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
        startsearch(myWindow,currentLocation,locale);
};
	
	var SavelocalButton = myWindow.document.createElement('button');
	
        SavelocalButton.id = "return-button";
        SavelocalButton.className = "return-button";
		SavelocalButton.innerText = "Close window";
        SavelocalButton.onclick = function() {
        submitClicked(myWindow);
};
    
    const br = myWindow.document.createElement("br");
	
    i.appendChild(br);
	f.appendChild(i);
	
	f.appendChild(j);
	f.appendChild(k);
	f.appendChild(br);
    f.appendChild(s);
	
	f.appendChild(SavelocalButton);
	

//and some more input elements here
//and dont forget to add a submit button
    
    myWindow.document.getElementsByTagName('body')[0].appendChild(f);
	//myWindow.document.getElementById("submit-consist").focus();
	
	var dv1 = myWindow.document.createElement('div');
	dv1.setAttribute('id', "dbox");
	dv1.setAttribute('class', "dbox");
	myWindow.document.getElementsByTagName('body')[0].appendChild(dv1);
	var dv2 = myWindow.document.createElement('div');
	dv2.setAttribute('id', "dboxm");
	dv2.setAttribute('class', "dboxm");
	dv2.setAttribute('text', "text");
	myWindow.document.getElementById('dbox').appendChild(dv2);
	
		
}


function submitClicked(myWindow)
{
	//alert("are you sure?");
	myWindow.close();
}

function startsearch(myWindow,curloc,locale) {
	 
	 event.preventDefault();
	 var box = myWindow.document.getElementById('dbox'),
      boxm = myWindow.document.getElementById('dboxm');
      console.debug("boxes:",box,boxm);
	
	var searchverb = myWindow.document.getElementById("myForm").elements.namedItem("searchfor").value;
	var replverb = myWindow.document.getElementById("myForm").elements.namedItem("replverb").value;
	var wrongverb = myWindow.document.getElementById("myForm").elements.namedItem("wrongverb").value;
	console.debug("search:",searchverb,"  ",replverb,"  ",wrongverb);
	if (searchverb && replverb && wrongverb !=null){
		var search_url= 'https://translate.wordpress.org/consistency/?search=' + searchverb + '&set=' + locale +'%2Fdefault&project=&search_case_sensitive=1';
		//console.debug("Searchfor:",search_url);
		const myInit = {
        redirect: "error"
         };
		
		confirm_msg = 'A log of replaced translations will be downloaded.\n';
		confirm_msg += 'Before downloading the file the windows will be opened!\n';
		confirm_msg += 'The records will be replaced are you sure to continue?';
		if ( myWindow.confirm( confirm_msg )){
		fetch(search_url,myInit)
        .then(function(response) {
        // When the page is loaded convert it to text
        return response.text();
        })
        .then(function(html) {
			var box = myWindow.document.getElementById('dbox'),
             boxm = myWindow.document.getElementById('dboxm');
			 //console.debug("boxes:",box,boxm);
			 
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
		   //console.debug('Rows:',Rows);
		   if (Rows >500){
			 Rows = 500;
		   }
		   var replace_links = '';
		   for(var i = 1; i < Rows-2; i++) {
					
			   rowCount++;
               let myrow = mytablebody.getElementsByTagName("tr")[rowCount];
			   //console.debug("myRow:",myrow);
			  
				var mycel1 = myrow.getElementsByTagName("td")[0];
				if (mycel1 != undefined){
				var orgtext=mycel1.childNodes[0].innerText;
				var mycel11=mycel1.childNodes[2];
				var myceltext12=mycel11.getElementsByTagName("a");
				var myorglink= myceltext12.item(0).href;
				var textorglink= myorglink.innerText;
		        var mycel2 = myrow.getElementsByTagName("td")[1];
			    var transtext=mycel2.childNodes[0].innerText;
				var myceltext3=mycel2.childNodes[2];
				var myceltext4=myceltext3.getElementsByTagName("a");
				var mylink= myceltext4.item(0).href;
		        //console.debug('Row:',myrow);
			    //console.debug('Cells:',mycel1);
				//console.debug('project:',myorglink);
				//console.debug('orgtext:',orgtext);
			    //console.debug('Cells:',mycel2);
				console.debug('Translated:',transtext);
				//console.debug('Celltext3:',myceltext3);
				//console.debug('Link:',mylink);
				//console.debug('Orglink:',myorglink);
				if (transtext == wrongverb) {
					let isFound = myorglink.search("dev");
					if (isFound == -1) {
						-i;
						replCount++;
						// Max25 windows will be opened
						if (replCount <25){
						newWindow = window.open(mylink + "&wrongverb=" + wrongverb + "&replverb=" + replverb, mylink + "&wrongverb=" + wrongverb + "&replverb=" + replverb);
						replace_links += mylink + '\n';
						
						}
					}	
				}
				else{
						-i;
					}
				}
            }
            console.debug("Replcount:", replCount);
		    if (replCount == 0){
			   console.debug("mywindow:", myWindow);
			   myWindow.alert("No records to replace!");
			   //dbox("No records to replace!", box,boxm);
			   //alert("No records to replace!!");
		    }
		    console.debug("Search ended:");
		    if (replCount != 0) {
			   var current_date = new Date();
               wptf_download( '[' + current_date.toLocaleString( [], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' } ) +' wptf replace log.txt]',replace_links,myWindow);
			   
		       // dbox("Search ready!", box,boxm);
		myWindow.alert("search ended\nClose this window if you are ready");
		//submitClicked(myWindow);
		}
        })
        .catch(function(err) {  
         console.log('Failed to fetch page: ', err); 
         myWindow.alert( "Failed to fetch the page error:"+err)	;	
        });
		}	
	    else{
			
		    myWindow.alert( "OK cancelled no replacements!");
	     }
	}
	
	else {
		event.preventDefault();
		console.debug('missing box:',myWindow.document.getElementById("dbox") );
		console.debug('missing dboxm:',myWindow.document.querySelector(".dboxm") );
		
		//console.debug('missing body:', myWindow.document.getElementsByTagName("body"));
		//kind=myWindow.document.getElementsByTagName("body");
		//laatstekind=kind[0].lastChild;
		//console.debug('laatste kind:',laatstekind);
		//var existingWin = window.open('', 'SelectWin');
		//console.debug("curwin:",existingWin);
		//console.debug('div:',myWindow.document.querySelector(".swal2-container"))
		
		//Swal.fire({
  //icon: 'error',
  //title: 'Oops...',
  //text: 'Something went wrong!',
 // footer: '<a href="">Why do I have this issue?</a>',
 // target: myWindow.document.querySelector(".dbox")});
		dbox("Missing fieldvalue!", box,boxm);
		//myWindow.alert("missing fieldvalue!");
	}
	
}

function dbox(msg, box,boxm) {
	
  // (B1) GET ELEMENTS
  //var box = myWindow.document.getElementById('dbox'),
  //boxm = myWindow.document.getElementById('dboxm');
  //console.debug("boxes:",box,boxm);
  // (B2) SHOW/HIDE
  boxm.innerHTML = (msg === undefined) ? "" : msg ;
  box.style.display = (msg === undefined) ? "none" : "block";
  
  }
  
  function wptf_download( filename, text,myWindow) {
        var element = myWindow.document.createElement( 'a' );
        element.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( text ) );
        element.setAttribute( 'download', filename );
        element.style.display = 'none';
        document.body.appendChild( element );
        element.click();
        document.body.removeChild( element );
      }
	



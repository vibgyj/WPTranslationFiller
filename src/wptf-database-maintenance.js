var optionHeader;
var backbutton;
var save_button;
var delete_button;
var clear_button;
var search_button;





function addscreen() {
    // Open modal window only on button click
    var modal = window.open('', 'modalWindow', 'width=400,height=300');
    // Inject HTML content into the modal window
    modal.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline'; object-src 'unsafe-inline';">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Modal Window</title>
                    <style>
                        /* Modal styles */
                        .modal {
                            display: block;
                            position: fixed;
                            z-index: 1;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            overflow: auto;
                            background-color: rgba(0, 0, 0, 0.4);
                        }

                        .modal-content {
                            background-color: #fefefe;
                            margin: 15% auto;
                            padding: 20px;
                            border: 1px solid #888;
                            width: 80%;
                            max-width: 400px;
                            border-radius: 5px;
                        }

                        /* Close button */
                        .close {
                            color: #aaa;
                            float: right;
                            font-size: 28px;
                            font-weight: bold;
                        }

                        .close:hover,
                        .close:focus {
                            color: black;
                            text-decoration: none;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <div class="modal-content">
                        <span class="close" onclick="window.close()">&times;</span>
                        <input type="text" id="textInput" placeholder="Enter text">
                        <button id="sendButton" onclick="sendText()">Send</button>
                        <div id="result"></div>
                        
                    </div>
                </body>
                </html>
            `);
}


backbutton = document.getElementById("backbutton");
if (backbutton != null) {
    backbutton.addEventListener("click", function () {
        // console.debug("back clicked!!")
        window.history.back()
    });
}

search_button = document.getElementById("search");
if (search_button != null) {
    search_button.addEventListener("click", async function (event) {
        event.preventDefault(event);
        let original = document.getElementById('original_text')
        let cntry = 'nl'
        let myoriginal = original.value
        console.debug("Search: ", myoriginal)
        //new Promise((resolve, reject) => async function () {
        await findTransline(myoriginal, cntry)
            .then(res => {
                console.debug("res:",res)
                if (res != 'notFound') {
                    console.debug("found!", res)
                    //resolve(res);
                }
                else {
                    console.debug("not found!", res)
                    messageBox("warning", "No record found!");
                    // reject("notFound");
                }
            });
        
    });
}


clear_button = document.getElementById("clear");
if (clear_button != null) {
    clear_button.addEventListener("click", function (event) {
    let original = document.getElementById('original_text')
    original.innerText = ""
    original.value = ""
    let translation = document.getElementById('translation_text')
    translation.innerText = ""
    translation.value = ""
    });
}




delete_button = document.getElementById("delete");
if (delete_button != null) {
    delete_button.addEventListener("click", function () {
        console.debug("Delete clicked")
    });
}

save_button = document.getElementById("save");
if (save_button != null) {
    save_button.addEventListener("click", function (event) {
        event.preventDefault(event);
        let original = document.getElementById('original_text')
        console.debug("Save clicked", original.value)
    });
}

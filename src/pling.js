function Pling(a,b,c,myWindow){ 
if(b==undefined){
b=" "
}
console.debug("within pling myWindow:",myWindow);

n=myWindow.document.body;
n.style.margin="0px";
/**create a mask**/
mask=myWindow.document.createElement("div");

mask.style.position="fixed";
mask.style.height="100vh";
mask.style.width="100vw";
mask.style.top="0";
mask.style.zIndex=1000;
mask.style.background="rgba(0,0,0,0.3)";

/**main container**/
var   box = myWindow.document.createElement("div");
box.style.position="absolute"; 
box.style.top="50%";
box.style.left="50%";
box.style.transform="translate(-50%, -50%)";

box.style.lineHeight="25px";
box.style.width="80%";
box.style.background="#fff";
box.style.borderRadius="4px";
box.style.boxShadow="8px 10px 10px rgba(0,0,0,0.05);";

/**cls btn**/
btn=myWindow.document.createElement("button");
btn.style.borderRadius="4px";
btn.style.padding="6px 6px";
btn.style.width="20%";
btn.style.float="right";
btn.style.margin="8px";
btn.style.border="1px solid rgba(0,0,0,0.1)";
btn.style.color="#455A64";
btn.style.cursor="pointer";
btn.style.fontSize="14px";

btn.style.background="transparent";
btn.innerHTML="ok";

//btn.classList.add(c);
/**button**/
btn.style.userSelect="none";
btn.onclick=function(){
mask.style.display="none";
}

/**main**/

 box2=myWindow.document.createElement("div");
box2.style.color="#455A64";
box2.style.fontWeight="400";
box2.style.marginBottom="20px";

box2.style.textAlign="center";

/**title**/

tilt=myWindow.document.createElement("div");
tilt.style.borderTopRightRadius="4px";
tilt.style.borderTopLeftRadius="4px";
tilt.style.padding="15px 0px 10px 0px";
tilt.style.fontWeight="700";
tilt.style.textTransform="uppercase";
tilt.style.fontSize="18px";

hr=myWindow.document.createElement("hr");
hr.style.marginTop="10px";
hr.style.marginBottom="10px";
hr.style.border="0.8px solid rgba(0,0,0,0.04)";


/**text**/
 txt=myWindow.document.createElement("div");
txt.style.fontSize="18px";
txt.style.padding="0px 10px 7px 10px";
txt.innerHTML+=a;

txt.className="content";
tilt.className="title";
btn.className="btn";
box.className="box";
mask.className=c;
if(b.length<2){
txt.style.paddingTop="0px";
tilt.style.display="none";
}
else{
tilt.innerHTML=b;
}



box2.appendChild(tilt);
box2.appendChild(hr);
box2.appendChild(txt);
box.appendChild(box2);
box2.appendChild(btn);
mask.appendChild(box);
n.appendChild(mask);

myWindow.window.onclick=function(event){
 if(event.target==mask){
 mask.style.display="none";
 }

 }

}

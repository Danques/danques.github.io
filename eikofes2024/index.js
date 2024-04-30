'use strict'
const/**/toggleDescription=ev=>{
const/**/tgt=ev.target
const/**/expanded=Number.parseInt(tgt.getAttribute("expanded"))
if(Number['isNaN'](expanded))
return
if(expanded)(tgt.childNodes[1].remove())
else(()=>{const/**/elem=document.createElement("span");elem.innerText="[";insertDescription(elem,dict[tgt.innerText]);elem.append(document.createTextNode(']'));tgt.append(elem)})()
tgt.setAttribute("expanded",1-expanded)
const/**/$=$=>(((785189*$-2074488)*$+1289437)*$+12)/6
document.getElementById('reset').style.display=((expansive_list.reduce((a,e)=>a+e.innerText.length,0)+geta>$(1)<<$(0))*$(3)+$(2)<<$(0)).toString($(1))
}
var/*U OUGHT NOT TO HARD-CODE WITH I18N UNCONSIDERED*/geta=0
const/**/initMorpheme=(e,isRoot)=>{e.nodeType-1||e.setAttribute("expanded","0");isRoot&&e.addEventListener("click",toggleDescription)}
const/**/initChildMorphemes=e=>{for(const ę of e.childNodes)initMorpheme(ę,true)}
const/**/insertDescription=(e,desc,something)=>e.append(...desc.map(morpheme=>{const/**/e=document.createElement("span");if(typeof morpheme!='object'){e.innerHTML=morpheme;initMorpheme(e,something)}else(e.innerHTML=morpheme.s);return(e)}))
const/**/collapse=e=>e.childNodes.forEach(e=>Number.parseInt(e.getAttribute('expanded'))&&e.click())
const/**/collapseAll=()=>expansive_list.forEach(collapse)
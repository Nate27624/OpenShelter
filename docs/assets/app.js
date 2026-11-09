(function runApp(){
"use strict";
const concepts=[
["01-dashboard","At-a-glance dashboard","Daily operations","An operational home for staff showing quantity, shortages, and activity."],
["02-inventory","Inventory directory","Daily operations","Search, filter, and inspect supplies across categories."],
["03-categories","Category browsing","Daily operations","Large category entry points for volunteers and new staff."],
["04-quick-intake","One-tap donation intake","Receiving","Record familiar donations in one action."],
["05-detailed-intake","Detailed donation intake","Receiving","Record unusual items, expiry batches, and storage locations."],
["06-distribution","Rapid distribution","Daily operations","Log supplies leaving the shelter without a complex form."],
["07-stock-correction","Stock count correction","Daily operations","Reconcile physical counts with a reason and audit record."],
["08-shortage-alerts","Low-stock alert center","Monitoring","Prioritize supplies at or below their minimum."],
["09-expiration","Expiration queue","Monitoring","Manage expiring batches rather than one date per item type."],
["10-visibility","Public/private controls","Community","Control which needs can be shown to donors."],
["11-public-needs","Public needs widget","Community","Explore an enhancement to the existing Needs List page."],
["12-request-approval","Donation request approvals","Community","Review requests before they appear publicly."],
["13-qr-dropoff","QR donor drop-off","Receiving","Donor self-report concept with required staff verification."],
["14-photo-catalog","Photo-first catalog","Daily operations","Visually identify clothing and assorted donated supplies."],
["15-storage-locator","Storage locator","Daily operations","Find physical supplies by room and shelf."],
["16-bulk-import","Bulk spreadsheet import","Administration","Preview migration from existing inventory spreadsheets."],
["17-history","Movement history","Administration","Read an audit trail for donated, distributed, or corrected stock."],
["18-thresholds","Minimum stock settings","Administration","Adjust low-stock thresholds by supply type."],
["19-guided-intake","Guided intake wizard","Receiving","Progressively reveal advanced fields when needed."],
["20-volunteer-mode","Volunteer quick actions","Daily operations","An extremely simple task-first alternative for volunteers."]
];
const page=document.body.dataset.screen||"home";
const isHome=page==="home";const base=location.pathname.includes("/concepts/")?"../":"";
const key="openshelter-inventory-prototype-v2";
const dateOffset=n=>{let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const seed=[
{id:"socks",name:"Socks",cat:"Clothing",qty:42,min:20,unit:"pairs",location:"A2",public:true,icon:"🧦"},
{id:"coats",name:"Winter coats",cat:"Clothing",qty:12,min:15,unit:"coats",location:"A1",public:true,icon:"🧥"},
{id:"blankets",name:"Blankets",cat:"Clothing",qty:23,min:15,unit:"blankets",location:"A2",public:true,icon:"▧"},
{id:"soup",name:"Canned soup",cat:"Food",qty:86,min:40,unit:"cans",location:"B1",public:true,icon:"🥫"},
{id:"water",name:"Bottled water",cat:"Food",qty:120,min:60,unit:"bottles",location:"B2",public:true,icon:"💧"},
{id:"bars",name:"Snack bars",cat:"Food",qty:21,min:30,unit:"bars",location:"B2",public:true,icon:"▤"},
{id:"toothbrush",name:"Toothbrushes",cat:"Hygiene",qty:34,min:20,unit:"pieces",location:"C1",public:true,icon:"✧"},
{id:"hygiene",name:"Hygiene kits",cat:"Hygiene",qty:18,min:25,unit:"kits",location:"C1",public:true,icon:"◈"},
{id:"deodorant",name:"Deodorant",cat:"Hygiene",qty:8,min:22,unit:"sticks",location:"C1",public:true,icon:"◉"},
{id:"cleaner",name:"Disinfectant",cat:"Agency",qty:9,min:18,unit:"bottles",location:"D1",public:true,icon:"✳"},
{id:"gloves",name:"Medical gloves",cat:"Medical",qty:6,min:12,unit:"boxes",location:"D2",public:false,icon:"✚"},
{id:"bandages",name:"Bandages",cat:"Medical",qty:14,min:20,unit:"boxes",location:"D2",public:false,icon:"✚"}
];
const lotSeed=[
{id:"LOT-104",item:"soup",qty:24,expiry:dateOffset(12)},
{id:"LOT-105",item:"bars",qty:16,expiry:dateOffset(4)},
{id:"LOT-106",item:"soup",qty:10,expiry:dateOffset(36)},
{id:"LOT-107",item:"gloves",qty:3,expiry:dateOffset(29)}
];
const eventSeed=[
{type:"Donation received",id:"socks",delta:12,note:"Sample transaction",time:"Today, 9:42 AM"},
{type:"Distributed",id:"hygiene",delta:-4,note:"Sample transaction",time:"Today, 9:15 AM"},
{type:"Count corrected",id:"coats",delta:2,note:"Sample transaction",time:"Yesterday"}
];
const requestSeed=[{id:"req-coats",item:"coats",status:"Draft",note:"Cold-weather need"},{id:"req-hygiene",item:"hygiene",status:"Approved",note:"Daily distribution"},{id:"req-gloves",item:"gloves",status:"Draft",note:"Staff-only example"}];
const fresh=()=>({items:JSON.parse(JSON.stringify(seed)),lots:JSON.parse(JSON.stringify(lotSeed)),events:JSON.parse(JSON.stringify(eventSeed)),requests:JSON.parse(JSON.stringify(requestSeed)),dropoffs:[]});
let data;try{data=JSON.parse(localStorage.getItem(key))}catch{};if(!data||!Array.isArray(data.items)||!Array.isArray(data.lots))data=fresh();
const save=()=>{try{localStorage.setItem(key,JSON.stringify(data))}catch{}};
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const item=id=>data.items.find(x=>x.id===id);
const low=x=>x.qty<=x.min;
const shortage=()=>data.items.filter(low).sort((a,b)=>(a.qty-a.min)-(b.qty-b.min));
const total=()=>data.items.reduce((a,x)=>a+x.qty,0);
const uniqueCats=()=>[...new Set(data.items.map(x=>x.cat))];
const fmt=n=>(n>=0?"+":"")+n;
const label=x=>`<span class="status ${x.qty===0?"out":low(x)?"low":"ok"}">${x.qty===0?"Out":low(x)?"Low stock":"In stock"}</span>`;
const opts=(sel="")=>data.items.map(x=>`<option value="${esc(x.id)}" ${x.id===sel?"selected":""}>${esc(x.name)}</option>`).join("");
const cLink=id=>base+"concepts/"+id+".html";
let state={cat:"All",query:"",guided:1,details:false,shelf:"All",period:"All"};
const toast=t=>{const n=$("#toast");if(!n)return;n.textContent=t;n.classList.add("show");setTimeout(()=>n.classList.remove("show"),2300)};
const timeNow=()=>new Date().toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const movement=(type,id,delta,note)=>{data.events.unshift({type,id,delta,note,time:timeNow()});data.events=data.events.slice(0,120)};
const mutate=(id,delta,type,note="")=>{let x=item(id);if(!x)return false;if(x.qty+delta<0){toast("Not enough items in stock.");return false}x.qty+=delta;movement(type,id,delta,note);save();render();toast(esc(x.name)+": "+fmt(delta)+" → "+x.qty);return true};
function header(){
return `<a class="skip-link" href="#content">Skip to content</a>
<header class="sitebar"><div class="sitebar-inner">
<a class="logo" href="https://theopenshelter.org/" target="_blank" rel="noopener" aria-label="The Open Shelter — original website">
<img class="site-logo" src="https://theopenshelter.org/wp-content/uploads/2023/11/cropped-OS-Letterhead.jpg" width="70" height="64" alt="" loading="eager">
<span class="brand"><b><span class="brand-the">the</span> Open Shelter</b><small>Staying behind with those left behind.</small></span></a>
<nav class="site-nav" aria-label="The Open Shelter website navigation">
<a href="https://theopenshelter.org/who-we-are/" target="_blank" rel="noopener">WHO WE ARE</a>
<a href="https://theopenshelter.org/services/" target="_blank" rel="noopener">SERVICES</a>
<a href="https://theopenshelter.org/donate/" target="_blank" rel="noopener">DONATE</a>
<a href="https://theopenshelter.org/latest-news/" target="_blank" rel="noopener">LATEST NEWS</a>
<a class="on" href="https://theopenshelter.org/needs-list/" target="_blank" rel="noopener">NEEDS LIST</a>
<a href="https://theopenshelter.org/staff-contact-us/" target="_blank" rel="noopener">STAFF/CONTACT US</a>
<a href="https://theopenshelter.org/history/" target="_blank" rel="noopener">HISTORY</a>
</nav></div></header>
<div class="prototype-strip"><div class="strip-inner">
<span><strong>STUDENT DESIGN PROPOSAL</strong><span class="divider-dot">·</span> Inventory concepts for review — not part of The Open Shelter's live website</span>
<div class="strip-actions"><a href="${base}concepts/">All 20 concepts</a><button type="button" data-action="reset">Reset demo</button></div>
</div></div>`;
}
function sidebar(){
let out=`<aside class="sidebar" aria-label="Prototype pages"><a class="aside-item home-link ${isHome?"active":""}" href="${base}concepts/"><span>⌂</span>All 20 concepts</a>`;
let prev="";for(const [id,title,group] of concepts){if(group!==prev){out+=`<div class="aside-divider"></div><div class="aside-head">${esc(group)}</div>`;prev=group}
out+=`<a class="aside-item ${page===id?"active":""}" href="${cLink(id)}"><span>${id.slice(0,2)}</span>${esc(title)}</a>`;}return out+"</aside>";
}
function shell(inner){$("#app").innerHTML=header()+`<div class="layout">${sidebar()}<main class="content" id="content">${inner}</main></div><footer class="site-footer"><div class="site-footer-inner"><span>Open Shelter inventory integration concepts · Student prototype · Fictional data only</span><span><a target="_blank" rel="noopener" href="https://theopenshelter.org/">Visit original website</a></span></div></footer><div role="status" aria-live="polite" id="toast" class="toast"></div>`}
function home(){
const groups=["Community","Receiving","Daily operations","Monitoring","Administration"];
const cards=arr=>arr.map(([id,title,group,desc])=>`<a href="${cLink(id)}" class="concept-link" aria-label="Explore ${esc(title)}"><span class="concept-num">${id.slice(0,2)}</span><span><strong>${esc(title)}</strong><small>${esc(desc)}</small></span></a>`).join("");
return `<div class="breadcrumbs"><a href="https://theopenshelter.org/" target="_blank" rel="noopener">The Open Shelter</a><span>/</span><span>Inventory integration concepts</span></div>
<section class="hero" aria-labelledby="gallery-title">
 <div class="hero-main">
  <div class="eyebrow">The Open Shelter · Design exploration</div>
  <h1 id="gallery-title">A simpler way to <em>manage what matters.</em></h1>
  <p>Twenty interactive approaches to receiving donations, keeping essential items in stock, and showing the community what the shelter needs—designed to complement the existing website.</p>
  <div class="actions"><a class="btn primary" href="${cLink("01-dashboard")}">Explore the concepts →</a><a class="btn" href="https://theopenshelter.org/needs-list/" target="_blank" rel="noopener">Current Needs List ↗</a></div>
 </div>
 <div class="hero-aside" aria-label="What is included in the prototype">
  <div class="aside-label">Explore the proposal</div>
  <div class="hero-total">20</div>
  <div class="hero-total-label">individual, interactive webpages</div>
  <div class="hero-mini-list"><span><b>01</b> Public needs</span><span><b>02</b> Daily operations</span><span><b>03</b> Staff tools</span></div>
 </div>
</section>
<div class="integration-ribbon"><div class="ribbon-symbol" aria-hidden="true">↗</div>
 <div><strong>Designed as an addition, not a website replacement.</strong><span>The current WordPress website and donation information would remain in place. These screens are proposals for a future, secure inventory system.</span></div>
 <a target="_blank" rel="noopener" href="https://theopenshelter.org/">Visit original site ↗</a>
</div>
<div class="intro-banners">
 <section class="intro-banner"><span class="tag public">PUBLIC-FACING OPPORTUNITY</span><h2>Keep donors informed</h2><p>An optional needs module could extend the shelter's current donation page while preserving its Amazon list and existing guidance.</p><a class="btn primary" href="${cLink("11-public-needs")}">See public needs concept →</a></section>
 <section class="intro-banner"><span class="tag">INTERNAL OPERATIONS · PROTOTYPE</span><h2>Make daily inventory easy</h2><p>Quick donation logging, one-step distribution, restock alerts, and expiration tracking—without repetitive forms.</p><a class="btn primary" href="${cLink("04-quick-intake")}">Try donation intake →</a></section>
</div>
<div class="note"><strong>Design-review environment:</strong> all inventory counts and transactions are fictional. Changes stay in your browser, not in The Open Shelter's systems. Each concept has its own shareable URL.</div>
${groups.map(g=>`<div class="section-head"><h2>${esc(g)}</h2><span class="muted tiny">${concepts.filter(x=>x[2]===g).length} concepts</span></div><div class="concept-list">${cards(concepts.filter(x=>x[2]===g))}</div>`).join("")}`;
}
function guide(id){
const tips={
"01-dashboard":["Add a link after staff sign-in; do not place operational totals on the public site.","Can a staff member identify the most urgent need in under five seconds?"],
"02-inventory":["An authenticated inventory area would hold the searchable internal directory.","How many clicks does it take to find an item and its shelf?"],
"03-categories":["Use this on tablets near a donation-sorting table.","Are the categories similar to how volunteers actually sort goods?"],
"04-quick-intake":["A fast-action screen for frequent supplies should be pinned in the staff area.","Does the record-keeping step interrupt active donation sorting?"],
"05-detailed-intake":["Use only for exceptions: perishables, unusual items, or location changes.","Which fields really need to be mandatory?"],
"06-distribution":["A staff action should record each outbound movement securely.","Is the quantity safety check clear when stock is almost zero?"],
"07-stock-correction":["Store corrections as audited inventory movements in production.","Can a volunteer easily distinguish adjustment from donation?"],
"08-shortage-alerts":["A staff alert can drive public requests only after approval.","Which thresholds require immediate attention?"],
"09-expiration":["Track item batches with dates and quantities in the backend.","Would staff benefit from a 'use first' sort order?"],
"10-visibility":["Publication is a separate permission, not merely a category setting.","Which items must never appear to public visitors?"],
"11-public-needs":["Embed or link this widget from the existing WordPress Needs List; retain the Amazon list.","Do donors understand priorities without seeing exact internal counts?"],
"12-request-approval":["Only authorized shelter staff should publish public requests.","Who is the final approver for a donor-facing request?"],
"13-qr-dropoff":["Potential donor form embedded in a public page; never add stock until staff confirms it.","Could this reduce staff typing without creating false donation records?"],
"14-photo-catalog":["Photos should be optional, especially for high-volume basics.","Would images actually help locate uncommon items?"],
"15-storage-locator":["Display real-world bins and rooms after an on-site walkthrough.","Do shelf labels match what volunteers see physically?"],
"16-bulk-import":["Initial migration tool only, restricted to inventory administrators.","Can a user detect bad rows before committing them?"],
"17-history":["Full audit trail should be immutable in production.","Could staff recover what changed during a busy shift?"],
"18-thresholds":["Allow item-specific alert thresholds to be maintained by authorized staff.","Who should decide when an item is 'low'?"],
"19-guided-intake":["A progressive form reduces repetitive input for busy volunteers.","Is optional information easy to bypass when the line is long?"],
"20-volunteer-mode":["Offer an optional task-first home for volunteers with limited training.","Can someone complete a basic action without training?"]
};
let v=tips[id]||["Treat as a prototype until requirements are validated.","Test with shelter staff."];
return `<div class="guidance"><div class="guide-box"><b>How this could connect to the current website</b>${esc(v[0])}</div><div class="guide-box"><b>Question for shelter staff</b>${esc(v[1])}</div></div>`;
}
function concept(){
const x=concepts.find(c=>c[0]===page);if(!x)return `<h1>Page not found</h1><a href="${base}concepts/">All concepts</a>`;
const idx=concepts.findIndex(c=>c[0]===page);
return `<div class="breadcrumbs"><a href="${base}concepts/">All concepts</a> / ${esc(x[2])} / ${x[0].slice(0,2)}</div>
<div class="title-row"><div><div class="eyebrow">Design concept ${x[0].slice(0,2)} of 20</div><h1 class="page-title">${esc(x[1])}</h1></div><div class="header-actions"><span class="tag ${x[2]==="Community"?"public":""}">${esc(x[2])}</span><span class="tag gray">Interactive demonstration</span></div></div>
<p class="lead">${esc(x[3])} Styled as a proposed addition to Open Shelter's existing site, not a new website.</p><div class="note">All inventory values are fictional. This webpage is a public demonstration, <strong>not</strong> a secured staff portal or real donation submission.</div>
<section class="demo-surface" aria-label="Interactive example"><div class="demo-top"><b>✦ PROPOSED INTERFACE · ${esc(x[1]).toUpperCase()}</b><small>Concept ${x[0].slice(0,2)} / 20</small></div><div id="screen" class="demo-body"></div></section>
${guide(x[0])}<div class="bottom-nav"><a href="${idx>0?cLink(concepts[idx-1][0]):base+"concepts/"}">← ${idx>0?esc(concepts[idx-1][1]):"All concepts"}</a><a href="${idx<19?cLink(concepts[idx+1][0]):base+"concepts/"}">${idx<19?esc(concepts[idx+1][1]):"All concepts"} →</a></div>`;
}
const selector=(id,sel)=>`<select name="${id}" id="${id}">${opts(sel)}</select>`;
const formField=(id,label,type="text",extra="",value="")=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" ${extra} value="${esc(value)}"></div>`;
const subhead=t=>`<h2 class="section-sub">${esc(t)}</h2>`;
function overview(){
let s=shortage();return `<div class="panels three"><div class="stat"><strong>${total()}</strong><span>Units on hand across categories</span></div><div class="stat warn"><strong>${s.length}</strong><span>Items at or below minimum</span></div><div class="stat good"><strong>${data.items.length}</strong><span>Tracked supply types</span></div></div>
<div class="split" style="margin-top:16px"><div class="panel">${subhead("Items needing attention")}${s.slice(0,5).map(x=>`<div class="line"><span><strong>${esc(x.name)}</strong><small>Minimum ${x.min} · ${esc(x.cat)}</small></span><span class="right"><b>${x.qty} ${esc(x.unit)}</b><br>${label(x)}</span></div>`).join("")}</div><div class="panel">${subhead("Recent inventory movement")}${data.events.slice(0,5).map(e=>`<div class="line"><span><strong>${esc(item(e.id)?.name||e.id)}</strong><small>${esc(e.type)} · ${esc(e.time)}</small></span><b>${fmt(e.delta)}</b></div>`).join("")}<p class="tiny muted">Demo state is shared with every concept page on this browser.</p></div></div>`;
}
function inventory(){
let dataItems=data.items.filter(x=>(state.cat==="All"||x.cat===state.cat)&&(`${x.name} ${x.cat} ${x.location}`.toLowerCase().includes(state.query.toLowerCase())));
return `<div class="row wrap spread"><div class="field" style="flex:1;max-width:470px"><label for="search">Search all supplies</label><input id="search" type="search" placeholder="Try coats, soup, hygiene…" value="${esc(state.query)}"></div><div class="field"><label for="filter-cat">Category</label><select id="filter-cat"><option>All</option>${uniqueCats().map(c=>`<option ${state.cat===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div></div>
<div class="table-wrap"><table class="data-table"><thead><tr><th>Supply</th><th>Category</th><th>On hand</th><th>Minimum</th><th>Location</th><th>Status</th></tr></thead><tbody>${dataItems.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.cat)}</td><td>${x.qty} ${esc(x.unit)}</td><td>${x.min}</td><td>${esc(x.location)}</td><td>${label(x)}</td></tr>`).join("")||'<tr><td colspan="6">No items found.</td></tr>'}</tbody></table></div>`;
}
function categories(){
let cats=uniqueCats();let ls=data.items.filter(x=>state.cat==="All"||state.cat===x.cat);
return `<p class="muted">Tap a category to see what the shelter has on hand.</p><div class="tilegrid">${cats.map((c,i)=>`<button class="tile ${state.cat===c?"selected":""}" data-action="category" data-value="${esc(c)}"><span class="tile-icon">${["◈","▤","✧","✚","▥"][i%5]}</span><span><strong>${esc(c)}</strong><small>${data.items.filter(x=>x.cat===c).length} supply types</small></span></button>`).join("")}</div><div class="row spread" style="margin-top:22px">${subhead(state.cat==="All"?"All categories":state.cat)}<button class="btn small" data-action="category" data-value="All">Clear filter</button></div>${ls.map(x=>`<div class="line"><strong>${esc(x.name)}</strong><span>${x.qty} ${esc(x.unit)} · ${esc(x.location)} ${label(x)}</span></div>`).join("")}`;
}
function quickIntake(){
let xs=data.items.filter(x=>["socks","coats","soup","water","hygiene","deodorant"].includes(x.id));
return `${subhead("Donation received? Add it in one click.")}<p class="muted">Frequent supplies appear first. One press records one standard unit, with an audit entry.</p><div class="panels">${xs.map(x=>`<div class="line" style="padding:15px"><span class="row"><span class="tile-icon">${esc(x.icon)}</span><span><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} available</small></span></span><button class="btn primary" data-action="add" data-id="${x.id}" data-amount="1">+1 ${esc(x.unit)}</button></div>`).join("")}</div><div class="note green" style="margin-top:16px">For a larger donation or an expiring item, use the <a style="text-decoration:underline" href="${cLink("05-detailed-intake")}">detailed intake form</a>.</div>`;
}
function detailedIntake(){
return `${subhead("Record a delivery")}<form id="detail-form"><div class="form-grid"><div class="field"><label for="detail-item">Item</label>${selector("detail-item","soup")}</div>${formField("detail-qty","Quantity received","number",'min="1" required',"12")}<div class="field"><label for="detail-loc">Storage location</label><select name="detail-loc" id="detail-loc"><option>A1</option><option>A2</option><option selected>B1</option><option>B2</option><option>C1</option><option>D1</option><option>D2</option></select></div>${formField("detail-exp","Expiration date (optional)","date")}</div><div class="field"><label for="detail-note">Staff note (optional)</label><textarea name="detail-note" id="detail-note" placeholder="Example: sealed cases, donated this morning"></textarea></div><div class="actions"><button class="btn primary" type="submit">Record donation</button><span class="muted tiny">An expiration date creates a separate batch record.</span></div></form>`;
}
function distribution(){
return `${subhead("Give out supplies")}<p class="muted">A fast, auditable stock-out interaction for guest supplies and outreach distribution.</p><form id="distribution-form"><div class="form-grid"><div class="field"><label for="dist-item">Supply</label>${selector("dist-item","hygiene")}</div>${formField("dist-qty","Quantity to distribute","number",'min="1" required',"1")}</div><div class="field"><label for="dist-note">Context (optional; no recipient names)</label><select id="dist-note" name="dist-note"><option>Walk-in distribution</option><option>Outreach</option><option>Daily meals</option><option>Other</option></select></div><button class="btn primary">Confirm distribution</button></form><div class="note" style="margin-top:17px">The prototype prevents quantities from falling below zero. A production system should also handle allocation and concurrency safely.</div>`;
}
function correction(){
return `${subhead("Match the physical shelf count")}<form id="correction-form"><div class="form-grid"><div class="field"><label for="corr-item">Supply</label>${selector("corr-item","coats")}</div>${formField("corr-count","Count observed on shelf","number",'min="0" required',"14")}</div><div class="field"><label for="corr-reason">Reason</label><select id="corr-reason" name="corr-reason"><option>Scheduled count</option><option>Damaged or discarded</option><option>Previously unrecorded movement</option><option>Other</option></select></div><div class="field"><label for="corr-note">Additional note (optional)</label><input name="corr-note" id="corr-note" placeholder="What happened?"></div></div><button class="btn primary">Save corrected count</button></form><div class="note" style="margin-top:18px">An adjustment is logged as a correction, never disguised as a donation.</div>`;
}
function alerts(){
let xs=shortage();return `${subhead("Restock priorities")}<div class="panels three"><div class="stat warn"><strong>${xs.length}</strong><span>Items requiring attention</span></div><div class="stat"><strong>${xs.filter(x=>x.qty===0).length}</strong><span>Out of stock</span></div><div class="stat good"><strong>${data.items.filter(x=>!low(x)).length}</strong><span>Above threshold</span></div></div><div style="margin-top:18px">${xs.map(x=>`<div class="line"><span style="flex:1"><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} left · reorder minimum ${x.min}</small><span class="progress"><span class="low" style="width:${Math.min(100,Math.round(x.qty/x.min*100))}%"></span></span></span><span class="status ${x.public?"low":"private"}">${x.public?"Public eligible":"Internal only"}</span><a class="btn small" href="${cLink("12-request-approval")}">Request review</a></div>`).join("")}</div>`;
}
function expiry(){
let lots=[...data.lots].sort((a,b)=>a.expiry.localeCompare(b.expiry));
const days=v=>Math.ceil((new Date(v+"T12:00:00").getTime()-new Date().setHours(12,0,0,0))/86400000);
return `${subhead("Use earliest-expiring supplies first")}<p class="muted">These are example <strong>batch</strong> records. Two batches of canned soup can expire on different dates.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Batch</th><th>Item</th><th>Batch quantity</th><th>Expiration</th><th>Action</th></tr></thead><tbody>${lots.map(l=>`<tr><td>${esc(l.id)}</td><td><strong>${esc(item(l.item)?.name||l.item)}</strong></td><td>${l.qty}</td><td><span class="status ${days(l.expiry)<=7?"out":days(l.expiry)<=30?"low":"ok"}">${days(l.expiry)<0?"Expired":days(l.expiry)+" days left"}</span><br><small>${esc(l.expiry)}</small></td><td><button class="mini-btn" data-action="use-lot" data-id="${esc(l.id)}" ${l.qty<=0?"disabled":""}>Distribute 1</button></td></tr>`).join("")}</tbody></table></div><div class="note" style="margin-top:18px">Batch quantities in this UI are examples for testing. Real inventory needs lot-level transactions and reconciliation.</div>`;
}
function visibility(){
return `${subhead("What should donors see?")}<p class="muted">Control publication at the item level. Private items never appear on the public needs mockup.</p><div class="stack">${data.items.map(x=>`<div class="line"><span><strong>${esc(x.name)}</strong><small>${esc(x.cat)} · ${x.qty} on hand</small></span><span class="row"><span class="status ${x.public?"ok":"private"}">${x.public?"Public eligible":"Private"}</span><button type="button" aria-label="Toggle visibility for ${esc(x.name)}" aria-pressed="${x.public}" class="switch ${x.public?"on":""}" data-action="toggle" data-id="${x.id}"></button></span></div>`).join("")}</div><div class="note" style="margin-top:12px">Making an item public-eligible does not automatically publish a request. A separate approval decision is still required.</div>`;
}
function publicNeeds(){
let visible=data.items.filter(x=>x.public&&low(x));return `<div class="split"><div><div class="eyebrow">Embedded-module example</div><h2 class="section-sub" style="font-size:28px;margin-top:8px">Help with the essentials.</h2><p class="lead">The existing Open Shelter Needs List already explains what kinds of donations help. This optional module could highlight current priorities.</p><a class="btn" target="_blank" rel="noopener" href="https://theopenshelter.org/needs-list/">See the actual Needs List ↗</a></div><div class="panel soft"><span class="tag public">PUBLIC WISHLIST EXAMPLE</span><p style="margin:15px 0 0" class="muted">Only approved public-eligible needs would be shown on the real site. Exact internal quantities are intentionally omitted.</p></div></div><div class="need-grid" style="margin-top:23px">${visible.map(x=>`<article class="request"><div class="topline"><span class="tag public">${esc(x.cat)}</span><span class="status low">Needed</span></div><h3>${esc(x.name)}</h3><p>High-use essential supply. Please review the existing donation guidance before dropping off items.</p><a class="btn small" target="_blank" rel="noopener" href="https://theopenshelter.org/needs-list/">Donation information ↗</a></article>`).join("")||'<div class="empty">No public-eligible low-stock items in the demo.</div>'}</div><div class="note green" style="margin-top:19px">The proposed widget would supplement — not replace — the existing Needs List and Amazon link.</div>`;
}
function approvals(){
let approvals=data.requests;return `${subhead("Review proposed public requests")}<p class="muted">Staff should approve both the need and public eligibility before donor-facing publication.</p><div class="stack">${approvals.map(r=>{let x=item(r.item);return `<div class="request"><div class="topline"><span class="tag">${esc(r.status)}</span><span class="status ${x?.public?"ok":"private"}">${x?.public?"Public eligible":"Internal-only"}</span></div><h3>${esc(x?.name||r.item)}</h3><p>${esc(r.note)} · ${x?.qty||0} units counted · minimum ${x?.min||0}</p><div class="actions"><button class="mini-btn positive" data-action="request" data-id="${r.id}" data-value="Approved" ${!x?.public?"disabled":""}>Approve</button><button class="mini-btn" data-action="request" data-id="${r.id}" data-value="Draft">Return to draft</button><button class="mini-btn negative" data-action="request" data-id="${r.id}" data-value="Rejected">Reject</button></div></div>`}).join("")}</div><div class="note" style="margin-top:17px">Approval status here is local only. Public Needs demo uses an item-eligibility shortage rule for comparison, not these draft decisions.</div>`;
}
function qrDropoff(){
return `${subhead("Give donors a short self-report option")}<div class="split"><div class="panel soft"><div class="row" style="justify-content:center;flex-direction:column"><div class="qr" aria-label="Decorative sample QR placeholder, not a scannable code"></div><strong>Illustrative QR sign</strong><small class="muted">This is not a working QR code.</small></div><p class="muted tiny">Place an approved QR at the donation area. A donor can describe their drop-off, but a staff member must confirm it before stock changes.</p></div>
<div class="panel"><h3>Donor drop-off notice</h3><form id="dropoff-form"><div class="field"><label for="drop-item">What did you bring?</label>${selector("drop-item","socks")}</div>${formField("drop-qty","Approximate quantity","number",'min="1" required',"2")}<button class="btn primary">Submit unverified drop-off</button></form></div></div>
<div class="panel" style="margin-top:16px"><h3>Staff confirmation queue (demo)</h3>${data.dropoffs.length?data.dropoffs.map(d=>`<div class="line"><span><strong>${esc(item(d.id)?.name||d.id)} × ${d.qty}</strong><small>${esc(d.time)} · Not yet counted</small></span><button class="mini-btn positive" data-action="confirm-drop" data-id="${esc(d.key)}">Verify and add stock</button></div>`).join(""):'<p class="muted">No unverified submissions yet.</p>'}</div>`;
}
function photos(){
return `${subhead("Find unusual or variable donations visually")}<p class="muted">Photo slots are examples; not all frequently received items need images.</p><div class="tilegrid">${data.items.filter(x=>["coats","socks","blankets","hygiene","cleaner","soup"].includes(x.id)).map(x=>`<article class="photo-card"><div class="photo" aria-hidden="true">${esc(x.icon)}</div><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} · Shelf ${esc(x.location)}</small><div style="margin-top:9px">${label(x)}</div></article>`).join("")}</div>`;
}
function locator(){
let sh=["All","A1","A2","B1","B2","C1","D1","D2"];let xs=data.items.filter(x=>state.shelf==="All"||x.location===state.shelf);
return `${subhead("Where is this item stored?")}<p class="muted">Example shelf labels only; verify the physical floor plan with staff.</p><div class="row wrap">${sh.map(s=>`<button class="pill ${s===state.shelf?"active":""}" data-action="shelf" data-value="${s}">${s==="All"?"All shelves":s}</button>`).join("")}</div><div class="panels three" style="margin-top:19px">${(state.shelf==="All"?sh.slice(1):[state.shelf]).map(s=>`<div class="shelf ${s===state.shelf?"active":""}"><b>${s}</b><p>${data.items.filter(x=>x.location===s).map(x=>esc(x.name)).join(" · ")||"Empty in demo"}</p></div>`).join("")}</div><div class="panel" style="margin-top:16px"><h3>${state.shelf==="All"?"All shelf items":`Shelf ${esc(state.shelf)}`}</h3>${xs.map(x=>`<div class="line"><strong>${esc(x.name)}</strong><span>${esc(x.location)} · ${x.qty} ${esc(x.unit)}</span></div>`).join("")}</div>`;
}
function csvImport(){
return `${subhead("Preview before importing records")}<p class="muted">Example CSV: item ID, physical count. These are fictional adjustments, not a real uploaded file.</p><form id="csv-form"><div class="field"><label for="csv-text">Paste a few rows</label><textarea rows="6" id="csv-text" name="csv-text" style="min-height:160px">socks,45\ncoats,14\nhygiene,30</textarea></div><button class="btn primary">Validate and preview</button></form><div class="panel soft" id="csv-result" style="margin-top:17px"><p class="muted">Nothing has been applied to the inventory. This prototype only validates and previews.</p></div>`;
}
function history(){
return `${subhead("Every movement should be explainable")}<div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Item</th><th>Change</th><th>Reason</th></tr></thead><tbody>${data.events.map(e=>`<tr><td>${esc(e.time)}</td><td>${esc(e.type)}</td><td><b>${esc(item(e.id)?.name||e.id)}</b></td><td><b>${fmt(e.delta)}</b></td><td>${esc(e.note||"—")}</td></tr>`).join("")}</tbody></table></div><div class="note" style="margin-top:17px">The demo's local history is resettable. Production history should be server-side, permissioned, and tamper-resistant.</div>`;
}
function thresholds(){
return `${subhead("Set minimum levels by item")}<p class="muted">Adjust a threshold and see the low-stock indicators change throughout the demo.</p><div class="stack">${data.items.map(x=>`<form class="line threshold-row" data-threshold="${x.id}"><span><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} on hand</small></span><span class="row"><label for="min-${x.id}" class="tiny">Minimum</label><input id="min-${x.id}" aria-label="Minimum for ${esc(x.name)}" type="number" min="0" name="min" value="${x.min}" style="width:75px;padding:8px;border:1px solid #dcd2d4;border-radius:8px"><button class="mini-btn" type="submit">Save</button>${label(x)}</span></form>`).join("")}</div>`;
}
function guided(){
return `${subhead("A short form that grows only if needed")}<div class="row wrap"><span class="tag ${state.guided===1?"":"gray"}">1 · Identify</span><span class="tag ${state.guided===2?"":"gray"}">2 · Quantity</span><span class="tag ${state.guided===3?"":"gray"}">3 · Confirm</span></div><div class="panel" style="margin-top:18px">${state.guided===1?`<h3>What came in?</h3><div class="field"><label for="guided-item">Supply item</label>${selector("guided-item","socks")}</div><div class="actions"><button class="btn primary" data-action="guide-next">Continue →</button></div>`:state.guided===2?`<h3>How much was donated?</h3><div class="field"><label for="guided-count">Units received</label><input id="guided-count" type="number" min="1" value="1"></div><label class="row" style="font-size:12px"><input id="guided-details" type="checkbox" ${state.details?"checked":""}> I need to record extra information</label>${state.details?`<div class="field" style="margin-top:10px"><label for="guided-note">Extra information (optional)</label><input id="guided-note" placeholder="Lot number, condition, etc."></div>`:""}<div class="actions" style="margin-top:17px"><button class="btn" data-action="guide-back">← Back</button><button class="btn primary" data-action="guide-next">Review →</button></div>`:`<h3>Ready to record</h3><p class="muted">This final step previews a donation. Record it to add one unit of socks to the fictional sample data.</p><div class="actions"><button class="btn" data-action="guide-back">← Back</button><button class="btn primary" data-action="guide-save">Record sample donation</button></div>`}</div><p class="tiny muted">This prototype explores the number of steps, not a final form schema.</p>`;
}
function volunteer(){
return `${subhead("What are you doing right now?")}<p class="muted">An alternative to inventory-first navigation: task buttons with familiar wording.</p><div class="panels">${[
["Donation received","+1 pair of socks","socks",1,"Donation received"],
["Hand out hygiene kit","−1 hygiene kit","hygiene",-1,"Distributed"],
["Hand out a blanket","−1 blanket","blankets",-1,"Distributed"],
["Donation received","+1 canned soup","soup",1,"Donation received"]
].map(v=>`<button class="tile" style="min-height:105px" data-action="volunteer" data-id="${v[2]}" data-amount="${v[3]}" data-type="${v[4]}"><span class="tile-icon">${v[3]>0?"＋":"−"}</span><span><strong>${esc(v[0])}</strong><small>${esc(v[1])} · ${item(v[2]).qty} on hand</small></span></button>`).join("")}</div><div class="note green" style="margin-top:18px">Large targets and plain-language actions can reduce training time. Permission safeguards are still needed in production.</div>`;
}
function screen(){
switch(page){
case "01-dashboard":return overview();
case "02-inventory":return inventory();
case "03-categories":return categories();
case "04-quick-intake":return quickIntake();
case "05-detailed-intake":return detailedIntake();
case "06-distribution":return distribution();
case "07-stock-correction":return correction();
case "08-shortage-alerts":return alerts();
case "09-expiration":return expiry();
case "10-visibility":return visibility();
case "11-public-needs":return publicNeeds();
case "12-request-approval":return approvals();
case "13-qr-dropoff":return qrDropoff();
case "14-photo-catalog":return photos();
case "15-storage-locator":return locator();
case "16-bulk-import":return csvImport();
case "17-history":return history();
case "18-thresholds":return thresholds();
case "19-guided-intake":return guided();
case "20-volunteer-mode":return volunteer();
default:return '<p>Unknown concept.</p>';
}}
function render(){if(isHome){shell(home())}else{shell(concept());$("#screen").innerHTML=screen()}}
render();
document.addEventListener("click",e=>{
const el=e.target.closest("[data-action]");if(!el)return;const a=el.dataset.action,id=el.dataset.id||"",value=el.dataset.value||"";let x=item(id);
if(a==="reset"){if(!confirm("Reset all fictional inventory changes in this browser?"))return;data=fresh();save();state={cat:"All",query:"",guided:1,details:false,shelf:"All"};render();toast("Sample inventory restored.");}
if(a==="add"||a==="volunteer"){mutate(id,Number(el.dataset.amount||1),a==="volunteer"?el.dataset.type:"Donation received","Quick action");}
if(a==="category"){state.cat=value;render()}
if(a==="shelf"){state.shelf=value;render()}
if(a==="toggle"&&x){x.public=!x.public;save();render();toast(x.name+" visibility updated (demo only).")}
if(a==="request"){let r=data.requests.find(v=>v.id===id);if(r){r.status=value;save();render();toast("Request marked "+value.toLowerCase());}}
if(a==="use-lot"){let lot=data.lots.find(l=>l.id===id);if(lot&&lot.qty>0){let it=item(lot.item);if(it.qty>0){lot.qty--;mutate(lot.item,-1,"Distributed","Batch "+lot.id);}else toast("No stock available.");}}
if(a==="confirm-drop"){let i=data.dropoffs.findIndex(d=>d.key===id);if(i>=0){let d=data.dropoffs[i];data.dropoffs.splice(i,1);mutate(d.id,d.qty,"Donation verified","Staff-confirmed QR drop-off");}}
if(a==="guide-next"){if(state.guided===1){state.guided=2}else if(state.guided===2){state.guided=3}render();}
if(a==="guide-back"){state.guided=Math.max(1,state.guided-1);render();}
if(a==="guide-save"){mutate("socks",1,"Donation received","Guided demo");state.guided=1;}
});
document.addEventListener("input",e=>{
if(e.target.id==="search"){state.query=e.target.value;const pos=e.target.selectionStart;$("#screen").innerHTML=inventory();const f=$("#search");f.focus();try{f.setSelectionRange(pos,pos)}catch{}}
if(e.target.id==="guided-details"){state.details=e.target.checked;$("#screen").innerHTML=guided()}
});
document.addEventListener("change",e=>{if(e.target.id==="filter-cat"){state.cat=e.target.value;$("#screen").innerHTML=inventory()}});
document.addEventListener("submit",e=>{
const f=e.target;if(!["detail-form","distribution-form","correction-form","dropoff-form","csv-form"].includes(f.id)&&!f.matches(".threshold-row"))return;
e.preventDefault();const fd=new FormData(f);let id,qty;
if(f.id==="detail-form"){id=String(fd.get("detail-item"));qty=Number(fd.get("detail-qty"));if(!(qty>0))return;let it=item(id);it.location=String(fd.get("detail-loc"));let expiry=String(fd.get("detail-exp")||"");if(expiry)data.lots.push({id:"LOT-"+Math.floor(Math.random()*90000+10000),item:id,qty,expiry});mutate(id,qty,"Donation received",String(fd.get("detail-note")||"Detailed intake"));return;}
if(f.id==="distribution-form"){id=String(fd.get("dist-item"));qty=Number(fd.get("dist-qty"));if(!(qty>0))return;mutate(id,-qty,"Distributed",String(fd.get("dist-note")));return;}
if(f.id==="correction-form"){id=String(fd.get("corr-item"));qty=Number(fd.get("corr-count"));if(!Number.isInteger(qty)||qty<0)return;let it=item(id);mutate(id,qty-it.qty,"Count corrected",String(fd.get("corr-reason"))+" — "+String(fd.get("corr-note")||""));return;}
if(f.id==="dropoff-form"){id=String(fd.get("drop-item"));qty=Number(fd.get("drop-qty"));if(!(qty>0))return;data.dropoffs.push({key:"D"+Date.now()+Math.round(Math.random()*1000),id,qty,time:timeNow()});save();render();toast("Unverified donation recorded for staff review.");return;}
if(f.id==="csv-form"){let csv=String(fd.get("csv-text")||"");let lines=csv.trim().split(/\n/).map(r=>r.trim()).filter(Boolean);let rows=lines.map((raw,i)=>{let v=raw.split(",");let it=item(v[0].trim());let n=Number((v[1]||"").trim());return {line:i+1,id:v[0].trim(),name:it?.name||"Unknown item",qty:n,valid:!!it&&Number.isInteger(n)&&n>=0}});const r=$("#csv-result");r.innerHTML=`<h3>Preview (${rows.filter(x=>x.valid).length} valid / ${rows.length} rows)</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Line</th><th>Supply</th><th>Count</th><th>Validation</th></tr></thead><tbody>${rows.map(v=>`<tr><td>${v.line}</td><td>${esc(v.name)}</td><td>${esc(v.qty)}</td><td>${v.valid?'<span class="status ok">Valid</span>':'<span class="status out">Check row</span>'}</td></tr>`).join("")}</tbody></table></div><p class="tiny muted">Preview only. No inventory records are changed.</p>`;return;}
if(f.matches(".threshold-row")){id=f.dataset.threshold;qty=Number(fd.get("min"));if(!Number.isInteger(qty)||qty<0)return;let x=item(id);x.min=qty;save();render();toast("Minimum updated for "+x.name);}
});
})();
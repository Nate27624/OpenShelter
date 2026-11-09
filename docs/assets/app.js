(function unifiedInventoryApp(){
"use strict";
const root=document.getElementById("app");
const storageKey="openshelter-unified-inventory-demo-v2";
const sections=[
 ["public","Public facing","♥"],
 ["overview","Overview","▦"],
 ["inventory","Inventory","▤"],
 ["receive","Receive donations","＋"],
 ["distribute","Distribute supplies","↗"],
 ["alerts","Alerts & expiration","!"],
 ["history","Activity & corrections","◷"]
];
const day=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const initial=()=>({
 items:[
  {id:"coats",name:"Winter coats",cat:"Clothing",qty:12,min:15,unit:"coats",location:"A1",public:true},
  {id:"socks",name:"Socks",cat:"Clothing",qty:42,min:20,unit:"pairs",location:"A2",public:true},
  {id:"blankets",name:"Blankets",cat:"Clothing",qty:23,min:15,unit:"blankets",location:"A2",public:true},
  {id:"soup",name:"Canned soup",cat:"Food",qty:86,min:40,unit:"cans",location:"B1",public:true},
  {id:"bars",name:"Snack bars",cat:"Food",qty:21,min:30,unit:"bars",location:"B2",public:true},
  {id:"water",name:"Bottled water",cat:"Food",qty:120,min:60,unit:"bottles",location:"B2",public:true},
  {id:"hygiene",name:"Hygiene kits",cat:"Hygiene",qty:18,min:25,unit:"kits",location:"C1",public:true},
  {id:"deodorant",name:"Deodorant",cat:"Hygiene",qty:8,min:22,unit:"sticks",location:"C1",public:true},
  {id:"toothbrush",name:"Toothbrushes",cat:"Hygiene",qty:34,min:20,unit:"pieces",location:"C1",public:true},
  {id:"cleaner",name:"Disinfectant",cat:"Agency",qty:9,min:18,unit:"bottles",location:"D1",public:true},
  {id:"gloves",name:"Medical gloves",cat:"Medical",qty:6,min:12,unit:"boxes",location:"D2",public:false},
  {id:"bandages",name:"Bandages",cat:"Medical",qty:14,min:20,unit:"boxes",location:"D2",public:false}
 ],
 lots:[
  {id:"LOT-104",item:"soup",qty:24,expiry:day(12)},
  {id:"LOT-105",item:"bars",qty:16,expiry:day(4)},
  {id:"LOT-106",item:"soup",qty:10,expiry:day(36)},
  {id:"LOT-107",item:"gloves",qty:3,expiry:day(29)}
 ],
 pending:[],
 history:[
  {id:"TX-0001",kind:"Donation",item:"socks",change:12,note:"Example donation",time:"Today · 9:42 AM"},
  {id:"TX-0002",kind:"Distribution",item:"hygiene",change:-4,note:"Example outreach distribution",time:"Today · 9:15 AM"},
  {id:"TX-0003",kind:"Correction",item:"coats",change:2,note:"Example stock count",time:"Yesterday"}
 ]
});
let data;try{data=JSON.parse(localStorage.getItem(storageKey)||"null")}catch{}
if(!data||!Array.isArray(data.items)||!Array.isArray(data.history)||!Array.isArray(data.lots))data=initial();
if(!Array.isArray(data.pending))data.pending=[];
/* Migrate older single-location items into per-location balances without resetting browser data.
   One item record remains canonical; on-hand totals are always the sum of its allocations. */
function normalizeStockLocations(){
 const known=new Set(Array.isArray(data.locations)?data.locations.filter(x=>typeof x==="string"&&x.trim()&&x!=="Unassigned").map(x=>x.trim()):[]);
 for(const x of data.items){
  const oldQty=Number.isSafeInteger(x.qty)&&x.qty>=0?x.qty:0;
  const original=Array.isArray(x.stockLocations)?x.stockLocations:[{location:typeof x.location==="string"&&x.location.trim()?x.location.trim():"Unassigned",qty:oldQty}];
  const merged=new Map();
  for(const entry of original){
   if(!entry||typeof entry.location!=="string"||!Number.isSafeInteger(entry.qty)||entry.qty<0)continue;
   const loc=entry.location.trim()||"Unassigned";
   merged.set(loc,(merged.get(loc)||0)+entry.qty);
   if(loc!=="Unassigned")known.add(loc);
  }
  x.stockLocations=[...merged].filter(([,qty])=>qty>0).map(([location,qty])=>({location,qty}));
  x.qty=x.stockLocations.reduce((sum,entry)=>sum+entry.qty,0);
  delete x.location;
 }
 data.locations=[...known].sort((a,b)=>a.localeCompare(b));
}
normalizeStockLocations();
let section=location.hash==="#admin"?"overview":sections.some(s=>"#"+s[0]===location.hash)?location.hash.slice(1):"public";
let search="",filter="All",stockFilter="All",publicSearch="",publicCategory="All",purchaseItemId=null,purchaseFeedback="",noticeTimer;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const get=id=>data.items.find(x=>x.id===id);
const atRisk=x=>x.qty<=x.min;
const shortage=()=>data.items.filter(atRisk).sort((a,b)=>(a.qty-a.min)-(b.qty-b.min));
const available=()=>data.items.reduce((sum,x)=>sum+x.qty,0);
const days=iso=>Math.ceil((new Date(iso+"T12:00:00")-new Date().setHours(12,0,0,0))/86400000);
const expiring=()=>data.lots.filter(l=>l.qty>0).sort((a,b)=>a.expiry.localeCompare(b.expiry));
const categories=()=>[...new Set(data.items.map(x=>x.cat))];
const locationOptions=()=>data.locations.map(loc=>`<option value="${esc(loc)}">${esc(loc)}</option>`).join("");
const locationBalances=x=>(x.stockLocations||[]).filter(entry=>entry.qty>0).sort((a,b)=>a.location.localeCompare(b.location));
const locationSummary=x=>locationBalances(x).map(entry=>`${entry.location} (${entry.qty.toLocaleString()})`).join(", ")||"—";
const locationUsage=loc=>data.items.reduce((total,x)=>total+(x.stockLocations||[]).filter(entry=>entry.location===loc).reduce((sum,entry)=>sum+entry.qty,0),0);
const matchingLocation=name=>data.locations.find(loc=>loc.toLowerCase()===name.toLowerCase());
const cleanLocation=name=>String(name||"").trim().replace(/\s+/g," ");
const validLocation=name=>name.length>=1&&name.length<=60&&!/[\x00-\x1f\x7f]/.test(name)&&name!=="Unassigned";
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(data))}catch{}};
const now=()=>new Date().toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const opt=(selected)=>data.items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?"selected":""}>${esc(x.name)}</option>`).join("");
const badge=x=>`<span class="status ${x.qty===0?"out":atRisk(x)?"low":"ok"}">${x.qty===0?"Out of stock":atRisk(x)?"Low stock":"In stock"}</span>`;
function notify(text){const box=document.getElementById("toast");if(!box)return;box.textContent=text;box.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>box.classList.remove("show"),2600)}
function movement(kind,id,change,note){
 data.history.unshift({id:"TX-"+Date.now().toString(36),kind,item:id,change,note:String(note||""),time:now()});data.history=data.history.slice(0,200);
}

const pendingReports=()=>data.pending.filter(p=>p.status==="pending");
const pendingFor=id=>pendingReports().filter(p=>p.item===id).reduce((n,p)=>n+p.qty,0);
function pendingRows(){
 const pending=pendingReports().slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 if(!pending.length)return `<p class="pending-empty">No donor purchase reports are awaiting confirmation.</p>`;
 return `<div class="pending-list">${pending.map(p=>{
  const x=get(p.item); if(!x)return "";
  return `<div class="pending-row"><div class="pending-description"><strong>${esc(x.name)}</strong><small>${p.qty} reported purchased · ${esc(p.time||"Recently reported")}${p.expected?" · Expected "+esc(p.expected):""}</small></div><span class="pending-tag">Awaiting receipt</span><div class="pending-actions"><button type="button" class="btn primary small" data-action="pending-receive" data-id="${esc(p.id)}">Mark received</button><button type="button" class="btn small" data-action="pending-dismiss" data-id="${esc(p.id)}">Dismiss</button></div></div>`;
 }).join("")}</div>`;
}
function changeStock(id,delta,kind,note,location=""){
 const x=get(id);
 if(!x||!Number.isSafeInteger(delta)||x.qty+delta<0||x.qty+delta>1000000){notify("This quantity is not available.");return false}
 if(delta>0){
  const where=location||"Unassigned";
  if(where!=="Unassigned"&&!data.locations.includes(where)){notify("Select an existing storage location.");return false}
  const existing=x.stockLocations.find(row=>row.location===where);
  if(existing)existing.qty+=delta;
  else x.stockLocations.push({location:where,qty:delta});
 }else if(delta<0){
  let remaining=-delta;
  /* Without an explicit withdrawal shelf, allocate outgoing stock against unassigned
     quantities first, then known shelves. The total remains canonical. */
  for(const entry of [...x.stockLocations].sort((a,b)=>(a.location==="Unassigned"?-1:b.location==="Unassigned"?1:a.location.localeCompare(b.location)))){
   const consumed=Math.min(entry.qty,remaining);
   entry.qty-=consumed;
   remaining-=consumed;
   if(!remaining)break;
  }
  x.stockLocations=x.stockLocations.filter(row=>row.qty>0);
  remaining=-delta;
  for(const l of data.lots.filter(z=>z.item===id&&z.qty>0&&days(z.expiry)>=0).sort((a,b)=>a.expiry.localeCompare(b.expiry))){
   const used=Math.min(l.qty,remaining);l.qty-=used;remaining-=used;if(!remaining)break;
  }
 }
 x.qty=x.stockLocations.reduce((sum,row)=>sum+row.qty,0);
 movement(kind,id,delta,note);save();render();notify(x.name+": "+(delta>0?"+":"")+delta+" → "+x.qty);return true
}
function header(){
return `<a href="#main" class="skip-link">Skip to inventory content</a>
<header class="sitebar">
 <div class="sitebar-inner">
  <a class="logo" href="https://theopenshelter.org/" target="_blank" rel="noopener" aria-label="Visit the Open Shelter website">
   <img class="site-logo" src="https://theopenshelter.org/wp-content/uploads/2023/11/cropped-OS-Letterhead.jpg" width="76" height="90" alt="">
   <span class="brand"><b><span class="brand-the">the</span> Open Shelter</b><small>Staying behind with those left behind.</small></span>
  </a>
  <nav class="site-nav" aria-label="Open Shelter website navigation">
   <a href="#public" data-go="public" class="site-nav-public" ${section==="public"?'aria-current="page"':""}>PUBLIC FACING</a>
   <a href="#admin" data-go="admin" class="site-nav-admin" ${section!=="public"?'aria-current="page"':""}>ADMIN VIEW</a>
   <a href="https://theopenshelter.org/who-we-are/" target="_blank" rel="noopener">WHO WE ARE</a>
   <a href="https://theopenshelter.org/services/" target="_blank" rel="noopener">SERVICES</a>
   <a href="https://theopenshelter.org/donate/" target="_blank" rel="noopener">DONATE</a>
   <a href="https://theopenshelter.org/latest-news/" target="_blank" rel="noopener">LATEST NEWS</a>
   <a href="https://theopenshelter.org/needs-list/" target="_blank" rel="noopener">NEEDS LIST</a>
   <a href="https://theopenshelter.org/staff-contact-us/" target="_blank" rel="noopener">STAFF/CONTACT US</a>
   <a href="https://theopenshelter.org/history/" target="_blank" rel="noopener">HISTORY</a>
  </nav>
 </div>
</header>`;
}
function shell(){
const meta={
overview:["Overview","Track donations, distributions, shortages, and expiration dates in one place."],
inventory:["Inventory","View current stock quantities, storage locations, and which items need replenishing."],
receive:["Receive donations","Record items as they arrive. Use quick entry for everyday supplies or add more details when needed."],
distribute:["Distribute supplies","Record the supplies given out through day services and outreach."],
alerts:["Low stock and expiration dates","Check the supplies that are running low and review items approaching their expiration dates."],
public:["Public facing","Check available supplies and report a purchased donation."],
history:["Activity and corrections","Review stock movements, correct physical inventory counts, and choose public visibility."]
};
return `${header()}
<div class="prototype-notice"><div class="prototype-notice-inner"><strong>INVENTORY SYSTEM PROPOSAL</strong> &nbsp; | &nbsp; This is a demonstration, not part of The Open Shelter's live inventory.</div></div>
<main id="main" class="wp-page ${section==="public"?"public-mode":"admin-mode"}">
 ${section==="public"?"":` <nav class="inventory-menu" aria-label="Inventory management sections">
 ${sections.filter(s=>s[0]!=="public").map(s=>`<a href="#${s[0]}" data-go="${s[0]}" class="inventory-tab ${section===s[0]?"active":""}" ${section===s[0]?'aria-current="page"':""}>${s[1]}${s[0]==="alerts"&&shortage().length?` <span class="nav-count">(${shortage().length})</span>`:s[0]==="receive"&&pendingReports().length?` <span class="nav-count">(${pendingReports().length})</span>`:""}</a>`).join("")}
 </nav>
 <div class="section-header">
  <div><h2>${meta[section][0]}</h2></div>
  ${section==="public"?"":`<div class="heading-buttons"><button class="btn primary" data-go="receive">Receive donation</button><button class="btn" data-go="distribute">Distribute supplies</button></div>`}
 </div>
 <div class="demo-disclaimer"><strong>Admin demonstration — not access-restricted.</strong> No login, shared database, or real staff permissions are implemented. All data is fictional and stored only in this browser. Do not enter real or sensitive information. <button class="reset-link" data-action="reset">Reset example data</button></div>
`}
 <div id="panel">${view()}</div>
</main>
<footer class="site-footer">
 <div class="site-footer-inner">
  <span><b>The Open Shelter</b> · Inventory management proposal · Not an official staff system</span>
  <span><a href="https://theopenshelter.org/needs-list/" target="_blank" rel="noopener">Needs List</a> · <a href="https://theopenshelter.org/" target="_blank" rel="noopener">Original website</a></span>
 </div>
</footer>
<div id="toast" class="toast" role="status" aria-live="polite"></div>`;
}
function stat(value,title,description,kind=""){
 return `<article class="metric-card ${kind}"><strong>${value}</strong><span>${title}</span><small>${description}</small></article>`
}
function title(name,side=""){
return `<div class="block-heading"><h2>${name}</h2>${side}</div>`;
}
function urgentRows(limit=99){
 const s=shortage().slice(0,limit);
 return s.length?s.map(x=>`<div class="line"><span><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} remaining · minimum ${x.min}</small></span><div class="line-right"><span class="shortfall">${x.qty===0?"Out":x.min-x.qty+" short"}</span><button class="mini-btn" data-action="prefill" data-id="${x.id}">Receive +</button></div></div>`).join(""):`<div class="empty-state">All items are currently above their minimum thresholds.</div>`
}
function expiryRows(limit=99){
 const lots=expiring().slice(0,limit);
 return lots.map(l=>{const x=get(l.item),d=days(l.expiry);return `<div class="line"><span><strong>${esc(x?.name||l.item)}</strong><small>${l.qty} units · ${esc(l.id)} · ${esc(l.expiry)}</small></span><span class="status ${d<=7?"out":d<=30?"low":"ok"}">${d<0?"Expired":d===0?"Expires today":d+" days left"}</span></div>`}).join("")||`<div class="empty-state">No dated batches recorded.</div>`;
}
function recentRows(limit=6){
 return data.history.slice(0,limit).map(e=>`<div class="history-row"><span class="movement-type ${e.change<0?"outbound":"inbound"}">${e.kind==="Correction"?"ADJ":e.change<0?"OUT":"IN"}</span><span class="history-description"><strong>${esc(e.kind)} · ${esc(get(e.item)?.name||e.item)}</strong><small>${esc(e.time)} · ${esc(e.note||"No note")}</small></span><b class="${e.change<0?"negative":"positive"}">${e.change>0?"+":""}${e.change}</b></div>`).join("")||`<div class="empty-state">No recorded activity.</div>`;
}
function overview(){
 const next=expiring().filter(l=>days(l.expiry)<=30).length;
 const reports=pendingReports().length;
 return `${reports?`<div class="pending-overview-note"><strong>${reports} purchase ${reports===1?"report is":"reports are"} awaiting receipt.</strong> <button type="button" data-go="receive" class="text-link">Review pending donations →</button></div>`:""}<div class="metrics-grid">${stat(available().toLocaleString(),"Units in stock","Across all categories")}
 ${stat(data.items.length,"Tracked items","Available supply types")}
 ${stat(shortage().length,"Low-stock alerts","Items to replenish","warning")}
 ${stat(next,"Expiring batches","Within the next 30 days","subtle")}</div>
 <div class="dashboard-grid">
 <section class="panel overview-attention">${title("Needs attention",`<button class="text-link" data-go="alerts">View all alerts →</button>`)}${urgentRows(4)}</section>
 <section class="panel">${title("Recent activity",`<button class="text-link" data-go="history">Full history →</button>`)}${recentRows(4)}</section>
 </div>
 <div class="dashboard-grid follow-grid">
 <section class="panel">${title("Expiration watch",`<button class="text-link" data-go="alerts">Review batches →</button>`)}${expiryRows(3)}</section>
 <section class="panel quick-panel">${title("Frequently used actions")}
 <p class="muted">Log a common donation immediately, or open a detailed intake form when needed.</p>
 <div class="quick-grid">${["socks","soup","hygiene","water"].map(id=>{const x=get(id);return `<button class="quick-tile" data-action="quick" data-id="${id}"><span class="quick-plus">＋</span><strong>${esc(x.name)}</strong><small>+1 ${esc(x.unit)}</small></button>`}).join("")}</div>
 </section></div>`;
}
function stockRows(){
 const rows=data.items.filter(x=>(filter==="All"||x.cat===filter)&&(stockFilter==="All"||(stockFilter==="Low stock"?atRisk(x):stockFilter==="Public"?x.public:!x.public))&&`${x.name} ${x.cat} ${locationSummary(x)}`.toLowerCase().includes(search.toLowerCase()));
 return `<div class="table-wrap"><table class="data-table inventory-table"><thead><tr><th>Supply</th><th>Category</th><th>Available</th><th>Minimum</th><th>Location</th><th>Status</th><th>Visible</th><th></th></tr></thead><tbody>
 ${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.cat)}</td><td><b>${x.qty}</b> <small>${esc(x.unit)}</small></td><td>${x.min}</td><td class="location-cell">${esc(locationSummary(x))}</td><td>${badge(x)}</td><td><span class="visibility-chip ${x.public?"published":""}">${x.public?"Public":"Private"}</span></td><td><button class="mini-btn" data-action="edit" data-id="${esc(x.id)}">Adjust</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty-state">No matching supplies. Clear a filter and try again.</td></tr>`}</tbody></table></div>
 <p class="table-foot">${rows.length} of ${data.items.length} supply types shown. Quantities and storage-location balances come from the same inventory records used by receiving, distribution, alerts, and the public list.</p>`;
}
function inventory(){
 return `<section class="panel">
 ${title("Inventory directory",`<button class="btn primary small" data-go="receive">＋ Add stock</button>`)}
 <div class="inventory-filters"><div class="field search-field"><label for="stock-search">Search items</label><input id="stock-search" type="search" placeholder="Name, category or shelf…" value="${esc(search)}"></div>
 <div class="field"><label for="cat-filter">Category</label><select id="cat-filter"><option>All</option>${categories().map(c=>`<option ${filter===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
 <div class="field"><label for="status-filter">Status</label><select id="status-filter">${["All","Low stock","Public","Private"].map(c=>`<option ${stockFilter===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
 <div id="inventory-results">${stockRows()}</div>
 </section>
 <section class="panel storage-management-panel">
 ${title("Storage locations")}
 <p class="muted">These locations are shared with Receive donations. Each supply remains one canonical inventory item; its available total is distributed across the locations listed above.</p>
 <div class="storage-location-list">
  ${data.locations.map(loc=>`<div class="storage-location-row"><span><strong>${esc(loc)}</strong><small>${locationUsage(loc).toLocaleString()} units recorded</small></span><button type="button" class="mini-btn" data-action="location-remove" data-id="${esc(loc)}" ${locationUsage(loc)?"disabled":""} title="${locationUsage(loc)?"Only empty locations can be removed":"Remove unused location"}">Remove</button></div>`).join("")||'<p class="muted">No storage locations yet.</p>'}
 </div>
 <div class="location-admin-grid">
  <form id="location-add-form" class="location-admin-form">
   <div class="field"><label for="location-add-name">Add storage location</label><input id="location-add-name" name="name" maxlength="60" placeholder="e.g. Pantry shelf 3" required></div>
   <button type="submit" class="btn small">Add location</button>
  </form>
  <form id="location-rename-form" class="location-admin-form">
   <div class="field"><label for="location-rename-old">Rename a location</label><select id="location-rename-old" name="oldLocation" required><option value="">Select location…</option>${locationOptions()}</select></div>
   <div class="field"><label for="location-rename-new">New name</label><input id="location-rename-new" name="newName" maxlength="60" placeholder="New location name" required></div>
   <button type="submit" class="btn small">Rename location</button>
  </form>
 </div>
 </section>`;
}
function receive(){
 const pending=pendingReports().length;
 return `<section class="panel pending-section">${title("Pending donor purchases",`<span class="pending-count">${pending} awaiting confirmation</span>`)}
 <p class="muted">Donors can report purchases on the Public Facing page. Confirm items only after they arrive; reports do not increase inventory on their own.</p>
 <div id="pending-results">${pendingRows()}</div>
 <p class="tiny muted">Browser-only demonstration: reports from other visitors or devices do not reach this queue.</p>
 </section><div class="receive-layout">
 <section class="panel">
 ${title("Fast intake")}<p class="muted">One click adds a standard unit to stock (location unassigned). Use detailed intake when the shelf is known.</p>
 <div class="fast-items">${["socks","coats","soup","water","hygiene","deodorant"].map(id=>{const x=get(id);return `<div class="fast-row"><span><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} on hand</small></span><button class="btn primary small" data-action="quick" data-id="${id}">＋ 1 ${esc(x.unit)}</button></div>`}).join("")}</div>
 <p class="tiny muted">Need a larger amount? Use the detailed form. All submissions update the same inventory.</p>
 </section>
 <section class="panel">
 ${title("Detailed donation intake")}<p class="muted">Use for larger drop-offs, unusual supplies, or items with expiration dates.</p>
 <form id="receive-form"><div class="field"><label for="receive-item">Supply</label><select name="item" id="receive-item">${opt("soup")}<option value="__new">＋ New supply type…</option></select></div>
 <div id="new-item-fields" class="new-item-fields" hidden>
 <div class="field"><label for="new-name">New item name</label><input id="new-name" name="newName" placeholder="e.g. Winter hats"></div>
 <div class="form-grid"><div class="field"><label for="new-cat">Category</label><select id="new-cat" name="newCat">${["Clothing","Food","Hygiene","Medical","Agency"].map(c=>`<option>${c}</option>`).join("")}</select></div>
 <div class="field"><label for="new-unit">Unit</label><input id="new-unit" name="newUnit" placeholder="e.g. pieces"></div></div>
 <div class="field"><label for="new-min">Low-stock threshold</label><input id="new-min" type="number" name="newMin" min="0" value="10"></div></div>
 <div class="form-grid"><div class="field"><label for="receive-qty">Quantity received</label><input id="receive-qty" name="qty" type="number" min="1" step="1" value="12" required></div><div class="field"><label for="receive-exp">Expiration date <span class="optional">(optional)</span></label><input id="receive-exp" name="expiry" type="date"></div></div>
 <div class="field"><label for="receive-location">Storage location <span class="optional">(optional)</span></label><select id="receive-location" name="location"><option value="">No location specified</option>${locationOptions()}<option value="__add">＋ Add a new location…</option></select>
 <small class="location-help">Leave blank if the shelf is unknown. Inventory will track it as unassigned.</small></div>
 <div class="new-location-fields" id="receive-add-location" hidden><div class="field"><label for="receive-new-location">New location name</label><input id="receive-new-location" name="newLocation" maxlength="60" placeholder="e.g. Upstairs closet"></div></div>
 <div class="field"><label for="receive-note">Note <span class="optional">(optional)</span></label><textarea id="receive-note" name="note" placeholder="Condition, source, special handling…"></textarea></div>
 <button type="submit" class="btn primary">Record donation →</button></form>
 </section></div>
 <section class="muted-feature"><span class="feature-marker">↗</span><div><strong>Future option: QR-assisted donor drop-off</strong><p>Donors could pre-report what they brought. Staff would still verify quantities before updating stock, preventing inaccurate public requests.</p></div></section>`;
}
function distribute(){
 return `<div class="split">
 <section class="panel">${title("Log distributed supplies")}<p class="muted">Record items leaving for walk-in guests, outreach, or meals. No recipient personal information is required.</p>
 <form id="distribute-form"><div class="field"><label for="distribute-item">Item</label><select name="item" id="distribute-item">${opt("hygiene")}</select></div>
 <div id="distribute-available" class="stock-summary">Available now: <strong>${get("hygiene").qty} kits</strong></div>
 <div class="form-grid"><div class="field"><label for="distribute-qty">Quantity</label><input id="distribute-qty" name="qty" type="number" value="1" min="1" step="1" required></div>
 <div class="field"><label for="distribute-purpose">Distribution type</label><select name="purpose" id="distribute-purpose"><option>Walk-in assistance</option><option>Outreach</option><option>Meal program</option><option>Other</option></select></div></div>
 <div class="field"><label for="distribute-note">Note <span class="optional">(optional)</span></label><textarea id="distribute-note" name="note" placeholder="No personal details needed"></textarea></div>
 <button class="btn primary" type="submit">Confirm distribution →</button></form></section>
 <section class="panel">${title("Frequently distributed")}<p class="muted">The same items can be received, distributed, and monitored throughout the site.</p>
 ${["hygiene","socks","water","blankets"].map(id=>{const x=get(id);return `<div class="line"><span><strong>${esc(x.name)}</strong><small>${x.qty} ${esc(x.unit)} available</small></span><button class="mini-btn" data-action="one-out" data-id="${id}" ${x.qty<1?"disabled":""}>Distribute 1</button></div>`}).join("")}
 <div class="note" style="margin-top:16px">Inventory never goes below zero in this demo. Dated stock is deducted from the nearest non-expired batch first when possible.</div></section></div>`;
}
function alerts(){
 return `<div class="metrics-grid">${stat(shortage().length,"Low-stock items","At or below minimum","warning")}${stat(shortage().filter(x=>x.qty===0).length,"Out of stock","No units remaining","warning")}${stat(expiring().filter(x=>days(x.expiry)<=30).length,"Expiring soon","Within 30 days")}${stat(data.items.filter(x=>!atRisk(x)).length,"Healthy stock","Above minimum","success")}</div>
 <div class="split"><section class="panel">${title("Low-stock watchlist")}<p class="muted">Each item has its own threshold. Receiving a donation updates the list immediately.</p>${urgentRows()}</section>
 <section class="panel">${title("Expiration watch")}<p class="muted">Batches carry their own expiration dates, even when they contain the same item.</p>${expiryRows()}<div class="note" style="margin-top:17px">This is an alerting preview, not a safety determination. Real procedures for expired food and medical supplies must be agreed with staff.</div></section></div>
  <section class="panel alerts-threshold-panel">${title("Minimum stock settings")}<p class="muted">Adjust when an item should trigger a low-stock alert.</p>
 <div class="threshold-list alerts-threshold-grid">${data.items.map(x=>`<form class="threshold-row" data-threshold="${x.id}"><span><strong>${esc(x.name)}</strong><small>${x.qty} in stock</small></span><label class="sr-only" for="min-${x.id}">Minimum for ${esc(x.name)}</label><input id="min-${x.id}" type="number" name="minimum" min="0" step="1" value="${x.min}" required><button type="submit" class="mini-btn">Save</button></form>`).join("")}</div></section>`;
}
function publicNeedsRows(){
 const visible=data.items.filter(x=>x.public);
 const items=visible.filter(x=>(publicCategory==="All"||x.cat===publicCategory)&&`${x.name} ${x.cat}`.toLowerCase().includes(publicSearch.trim().toLowerCase()));
 if(!visible.length)return `<div class="empty-state">No supplies are currently listed publicly.</div>`;
 if(!items.length)return `<div class="empty-state">No supplies match your search. Try another name or category.</div>`;
 const cats=[...new Set(items.map(x=>x.cat))].sort((a,b)=>a.localeCompare(b));
 const row=x=>{
  const pending=pendingFor(x.id),needed=Math.max(0,x.min-x.qty-pending),opened=purchaseItemId===x.id;
  return `<div class="public-stock-row">
   <div class="public-stock-row-main">
    <div class="public-stock-item">
     <h4>${esc(x.name)}</h4>
     <div class="public-stock-figure public-stock-have">
      <div class="public-stock-number" aria-label="At shelter: ${x.qty}"><strong>${x.qty.toLocaleString()}</strong><span class="public-stock-unit">on hand</span></div>
      <small class="public-stock-subline"><strong>${pending.toLocaleString()}</strong> on the way</small>
     </div>
    </div>
    <div class="public-stock-figure public-stock-goal">
     ${needed>0?`<div class="public-stock-number public-stock-target public-stock-needed needs-more" aria-label="More needed: ${needed}"><strong>${needed.toLocaleString()}</strong><span class="public-stock-needed-text">more needed</span></div>`:""}
    </div>
    <div class="public-stock-action"><button type="button" class="btn report-purchase-btn" data-action="purchase-open" data-id="${esc(x.id)}" aria-expanded="${opened?"true":"false"}">${opened?"Close form":"I've purchased this"}</button></div>
   </div>
   ${opened?`<form class="purchase-report-form public-stock-form" id="purchase-report-form"><input type="hidden" name="item" value="${esc(x.id)}">
    <h4>Report your purchase</h4>
    <p class="muted">Let the shelter know what you've purchased.</p>
    <div class="form-grid">
      <div class="field"><label for="report-quantity">Quantity purchased</label><input name="qty" id="report-quantity" type="number" min="1" max="10000" step="1" value="1" required></div>
      <div class="field"><label for="report-expected">Expected arrival <span class="optional">(optional)</span></label><input type="date" name="expected" id="report-expected" min="${day(0)}"></div>
    </div>
    <button type="submit" class="btn primary">Record purchase in demo</button>
    
   </form>`:""}
  </div>`;
 };
 return `<div class="public-stock-list">
  ${cats.map(cat=>{
   const rows=items.filter(x=>x.cat===cat).sort((a,b)=>{
    const needA=Math.max(0,a.min-a.qty-pendingFor(a.id)),needB=Math.max(0,b.min-b.qty-pendingFor(b.id));
    return Number(needB>0)-Number(needA>0)||a.name.localeCompare(b.name);
   });
   return `<section class="public-stock-category"><h3>${esc(cat)}</h3><div class="public-stock-category-rows">${rows.map(row).join("")}</div></section>`;
  }).join("")}
 </div>`;
}
function publicNeeds(){
 const visible=data.items.filter(x=>x.public);
 const cats=[...new Set(visible.map(x=>x.cat))].sort();
 return `<section class="panel public-facing-preview public-stock-page">
  ${purchaseFeedback?`<div class="purchase-feedback" role="status">${esc(purchaseFeedback)}</div>`:""}
  <div class="public-availability-filters">
   <div class="field"><label for="public-item-search">Search supplies</label><input type="search" id="public-item-search" placeholder="Search for an item…" value="${esc(publicSearch)}" autocomplete="off"></div>
   <div class="field"><label for="public-cat-filter">Category</label><select id="public-cat-filter"><option value="All">All categories</option>${cats.map(c=>`<option value="${esc(c)}" ${publicCategory===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
  </div>
  <div id="public-preview" aria-live="polite">${publicNeedsRows()}</div>
  <p class="public-stock-note">“On the way” means a donor reported purchasing this item but it hasn't arrived yet. “More needed” accounts for stock already at the shelter and donations reported on the way.</p>
  <div class="public-preview-footnote"><strong>Planning a visit?</strong> Supplies may change or be reserved for other uses. <a href="https://theopenshelter.org/staff-contact-us/" target="_blank" rel="noopener">Contact The Open Shelter</a> to confirm before coming for a specific item.</div>
  <p class="tiny muted"><strong>Prototype only:</strong> All quantities are fictional and stored in this browser. Purchase reports are not sent to shelter staff or shared across devices. Private supplies and storage locations remain hidden.</p>
 </section>`;
}
function historyRows(){
 return `<div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Activity</th><th>Supply</th><th>Change</th><th>Note</th></tr></thead><tbody>${data.history.map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.kind)}</td><td><b>${esc(get(x.item)?.name||x.item)}</b></td><td class="${x.change<0?"negative":"positive"}">${x.change>0?"+":""}${x.change}</td><td>${esc(x.note||"—")}</td></tr>`).join("")}</tbody></table></div>`;
}
function settings(){
 return `<div class="history-settings">
 <section class="panel">${title("Activity log")}<p class="muted">Every simulated inventory movement is recorded below. In production this audit log must be server-side and tamper-resistant.</p>${historyRows()}</section>
 <div class="settings-stack">
 <section class="panel">${title("Correct a physical count")}
 <p class="muted">Choose a supply to update its recorded count or public visibility. Both settings are saved together.</p>
 <form id="correct-form">
 <div class="field"><label for="correct-item">Supply</label><select name="item" id="correct-item">${opt("coats")}</select></div>
 <div id="correct-existing" class="stock-summary">Recorded count: <strong>${get("coats").qty} coats</strong></div>
 <div class="field"><label for="correct-qty">Count on shelf</label><input id="correct-qty" name="qty" type="number" min="0" max="1000000" step="1" value="${get("coats").qty}" required></div>
 <div class="field"><label for="correct-reason">Reason for count correction</label><select name="reason" id="correct-reason"><option>Physical count</option><option>Damaged or discarded</option><option>Missed movement</option><option>Other</option></select></div>
 <div class="correction-visibility">
 <div class="correction-visibility-heading"><strong>Public visibility</strong><label class="toggle-wrap"><span id="correct-public-label">${get("coats").public?"Visible":"Private"}</span><input type="checkbox" id="correct-public" class="toggle-input" name="publicVisible" value="on" ${get("coats").public?"checked":""} aria-label="Show selected supply on Public Facing page"><span class="toggle-track"></span></label></div>
 <p>When enabled, this item's availability and recorded quantity appear on the Public Facing page. Private supplies are hidden.</p>
 </div>
 <button class="btn primary" type="submit">Save item changes</button>
 </form>
 </section>
 </div></div>`;
}

function view(){return ({overview,inventory,receive,distribute,alerts,public:publicNeeds,history:settings}[section]||overview)()}
function render(){root.innerHTML=shell();}
function go(id){if(id!=="admin"&&!sections.some(x=>x[0]===id))return;section=id==="admin"?"overview":id;location.hash=id;render();window.scrollTo?.({top:0,behavior:"auto"})}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-go]");
 if(nav){e.preventDefault();go(nav.dataset.go);return}
 const target=e.target.closest("[data-action]");if(!target)return;
 const act=target.dataset.action,id=target.dataset.id;
 if(act==="quick"){changeStock(id,1,"Donation","Quick intake");return}
 if(act==="one-out"){changeStock(id,-1,"Distribution","One-click distribution");return}
 if(act==="prefill"){go("receive");const select=document.getElementById("receive-item");if(select)select.value=id;return}
 if(act==="edit"){go("history");const el=document.getElementById("correct-item");if(el){el.value=id;const x=get(id);document.getElementById("correct-existing").innerHTML="Recorded count: <strong>"+x.qty+" "+esc(x.unit)+"</strong>";document.getElementById("correct-qty").value=x.qty;document.getElementById("correct-public").checked=x.public;document.getElementById("correct-public-label").textContent=x.public?"Visible":"Private";el.scrollIntoView?.({block:"center",behavior:"smooth"});}return}
 if(act==="purchase-open"){const x=get(id);if(!x||!x.public){notify("This item is not available for public reporting.");return}purchaseItemId=purchaseItemId===id?null:id;purchaseFeedback="";render();document.getElementById("report-quantity")?.focus?.();return}
 if(act==="pending-receive"){const p=pendingReports().find(x=>x.id===id),x=p&&get(p.item);if(!p||!x){notify("Report already handled or invalid.");return}if(!Number.isSafeInteger(p.qty)||p.qty<1||x.qty+p.qty>1000000){notify("Cannot receive this quantity.");return}p.status="received";p.completedAt=now();const ok=changeStock(p.item,p.qty,"Donation","Confirmed donor purchase "+p.id);if(!ok){p.status="pending";save();render();}return}
 if(act==="pending-dismiss"){const p=pendingReports().find(x=>x.id===id);if(!p){notify("Report already handled.");return}if(!confirm("Dismiss this unreceived purchase report? Inventory will not change."))return;p.status="dismissed";p.completedAt=now();movement("Purchase report dismissed",p.item,0,"No receipt confirmed");save();render();notify("Purchase report dismissed; stock unchanged.");return}
 if(act==="reset"){if(!confirm("Restore the fictional inventory to its original sample values?"))return;data=initial();save();search="";filter="All";stockFilter="All";publicSearch="";publicCategory="All";purchaseItemId=null;purchaseFeedback="";render();notify("Example inventory restored.");return}
});
document.addEventListener("input",e=>{
 if(e.target.id==="stock-search"){search=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows();}
 if(e.target.id==="public-item-search"){publicSearch=e.target.value;const pane=document.getElementById("public-preview");if(pane)pane.innerHTML=publicNeedsRows();}
});
document.addEventListener("change",e=>{
 if(e.target.id==="cat-filter"){filter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="status-filter"){stockFilter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="public-cat-filter"){publicCategory=e.target.value;const pane=document.getElementById("public-preview");if(pane)pane.innerHTML=publicNeedsRows()}
 if(e.target.id==="receive-item"){const el=document.getElementById("new-item-fields");if(el)el.hidden=e.target.value!=="__new"}
 if(e.target.id==="receive-location"){const el=document.getElementById("receive-add-location");if(el)el.hidden=e.target.value!=="__add"}
 if(e.target.id==="distribute-item"){const x=get(e.target.value);const el=document.getElementById("distribute-available");if(x&&el)el.innerHTML="Available now: <strong>"+x.qty+" "+esc(x.unit)+"</strong>"}
 if(e.target.id==="correct-item"){const x=get(e.target.value),el=document.getElementById("correct-existing");if(x&&el){el.innerHTML="Recorded count: <strong>"+x.qty+" "+esc(x.unit)+"</strong>";document.getElementById("correct-qty").value=x.qty;document.getElementById("correct-public").checked=x.public;document.getElementById("correct-public-label").textContent=x.public?"Visible":"Private";}}
 if(e.target.id==="correct-public"){const label=document.getElementById("correct-public-label");if(label)label.textContent=e.target.checked?"Visible":"Private"}
});
document.addEventListener("submit",e=>{
 const form=e.target;if(!["receive-form","distribute-form","correct-form","purchase-report-form"].includes(form.id)&&!form.matches("[data-threshold]"))return;
 e.preventDefault();
 const fd=new FormData(form);
 if(form.id==="purchase-report-form"){
  const id=String(fd.get("item")||""),x=get(id),qty=Number(fd.get("qty")),expected=String(fd.get("expected")||"");
  if(!x||!x.public){notify("That item is not currently public.");return}
  if(!Number.isSafeInteger(qty)||qty<1||qty>10000){notify("Enter a whole-number quantity between 1 and 10,000.");return}
  if(expected&&(!/^\d{4}-\d{2}-\d{2}$/.test(expected)||!Number.isFinite(Date.parse(expected+"T12:00:00"))||expected<day(0))){notify("Use a valid future arrival date.");return}
  data.pending.push({id:"PD-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),item:id,qty,expected,status:"pending",time:now(),createdAt:Date.now()});
  save();purchaseItemId=null;
  purchaseFeedback="Purchase recorded in this browser demo: "+qty+" of "+x.name+" reported on the way. This has NOT been sent to the shelter. Staff confirmation is required before stock increases.";
  render();notify("Demo purchase report saved locally.");return
 }
 if(form.id==="receive-form"){
  const raw=String(fd.get("item")||""),qty=Number(fd.get("qty"));
  if(!Number.isSafeInteger(qty)||qty<1||qty>1000000){notify("Enter a valid positive quantity.");return}
  const expiry=String(fd.get("expiry")||"");
  if(expiry&&isNaN(new Date(expiry+"T12:00:00").getTime())){notify("Use a valid expiration date.");return}
  const selectedLocation=String(fd.get("location")||"");
  let location="";
  if(selectedLocation==="__add"){
   const typed=cleanLocation(fd.get("newLocation"));
   if(!validLocation(typed)){notify("Enter a storage location name (up to 60 characters).");return}
   location=matchingLocation(typed)||typed;
  }else if(selectedLocation){
   const match=matchingLocation(selectedLocation);
   if(!match){notify("Choose a listed storage location or add a new one.");return}
   location=match;
  }
  let id=raw,newItem=null;
  if(raw==="__new"){
   const name=String(fd.get("newName")||"").trim().slice(0,80);
   const unit=String(fd.get("newUnit")||"").trim().slice(0,30);
   const min=Number(fd.get("newMin"));
   if(!name||!unit||!Number.isSafeInteger(min)||min<0||min>1000000){notify("Complete the new item's name, unit, and minimum.");return}
   if(data.items.some(x=>x.name.toLowerCase()===name.toLowerCase())){notify("That supply already exists. Select it from the list instead.");return}
   id="custom-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
   newItem={id,name,cat:String(fd.get("newCat")||"Agency"),qty:0,min,unit,stockLocations:[],public:false};
  }else if(!get(id)){notify("Choose a valid supply.");return}
  if(location&&!matchingLocation(location))data.locations.push(location);
  data.locations.sort((a,b)=>a.localeCompare(b));
  if(newItem)data.items.push(newItem);
  if(expiry)data.lots.push({id:"LOT-"+Date.now().toString(36).toUpperCase(),item:id,qty,expiry});
  const note=String(fd.get("note")||"Donation intake").slice(0,180)+(location?" · Stored at "+location:" · Location unassigned");
  changeStock(id,qty,"Donation",note,location);
  return;
 }
 if(form.id==="distribute-form"){
  const id=String(fd.get("item")),qty=Number(fd.get("qty"));if(!Number.isSafeInteger(qty)||qty<1||qty>1000000){notify("Enter a valid positive quantity.");return}
  const note=String(fd.get("purpose"))+(fd.get("note")?" · "+String(fd.get("note")).slice(0,150):"");
  changeStock(id,-qty,"Distribution",note);return;
 }
 if(form.id==="correct-form"){
  const id=String(fd.get("item")),qty=Number(fd.get("qty")),x=get(id);
  if(!x||!Number.isSafeInteger(qty)||qty<0||qty>1000000){notify("Enter a valid physical count.");return}
  const visibility=fd.get("publicVisible")==="on";
  const quantityChanged=qty!==x.qty;
  const visibilityChanged=visibility!==x.public;
  if(!quantityChanged&&!visibilityChanged){notify("No changes to save.");return}
  x.public=visibility;
  if(quantityChanged){
    const diff=qty-x.qty;
    changeStock(id,diff,"Correction",String(fd.get("reason")||"Physical count"));
  }else{
    save();render();
  }
  notify(x.name+": "+(quantityChanged?"count updated"+(visibilityChanged?" and ":""):"")+(visibilityChanged?(visibility?"public":"private"):""));
  return;
 }
 if(form.matches("[data-threshold]")){
  const id=form.dataset.threshold,min=Number(fd.get("minimum")),x=get(id);
  if(!x||!Number.isSafeInteger(min)||min<0){notify("Enter a valid minimum quantity.");return}
  x.min=min;save();render();notify("Low-stock threshold updated for "+x.name);
 }
});
window.addEventListener("hashchange",()=>{const route=location.hash.slice(1),id=route==="admin"?"overview":route;if((route==="admin"||sections.some(x=>x[0]===route))&&id!==section){section=id;render();}});
render();
})();
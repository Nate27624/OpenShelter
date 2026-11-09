(function unifiedInventoryApp(){
"use strict";
const root=document.getElementById("app");
const storageKey="openshelter-unified-inventory-demo-v2";
const sections=[
 ["public","Public facing","♥"],
 ["inventory","Inventory","▤"],
 ["receive","Receive donations","＋"],
 ["distribute","Distribute supplies","↗"],
 ["alerts","Alerts & expiration","!"],
 ["history","Activity log","◷"]
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
if(location.hash==="#overview")location.hash="#inventory";
let section=location.hash==="#admin"?"inventory":sections.some(s=>"#"+s[0]===location.hash)?location.hash.slice(1):"public";
let search="",filter="All",stockFilter="All",publicSearch="",publicCategory="All",purchaseItemId=null,purchaseFeedback="",pendingReceiptId=null,inventoryEditMode=false,inventoryAddMode=false,inventoryScrollX=0,inventoryScrollY=0,noticeTimer;
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
const stockLocationOptions=x=>locationBalances(x).map(entry=>`<option value="${esc(entry.location)}">${esc(entry.location)} (${entry.qty.toLocaleString()} available)</option>`).join("");
const locationSummary=x=>locationBalances(x).map(entry=>`${entry.location} (${entry.qty.toLocaleString()})`).join(", ")||"—";
const matchingLocation=name=>data.locations.find(loc=>loc.toLowerCase()===name.toLowerCase());
const cleanLocation=name=>String(name||"").trim().replace(/\s+/g," ");
const validLocation=name=>name.length>=1&&name.length<=60&&!/[\x00-\x1f\x7f]/.test(name)&&name.toLowerCase()!=="unassigned";
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
  const x=get(p.item);if(!x)return "";
  const opened=pendingReceiptId===p.id;
  return `<div class="pending-entry">
   <div class="pending-row">
    <div class="pending-description"><strong>${esc(x.name)}</strong><small>${p.qty} reported purchased · ${esc(p.time||"Recently reported")}${p.expected?" · Expected "+esc(p.expected):""}</small></div>
    <span class="pending-tag">Awaiting receipt</span>
    <div class="pending-actions">
     <button type="button" class="btn primary small" data-action="pending-receive" data-id="${esc(p.id)}" aria-expanded="${opened?"true":"false"}" aria-controls="pending-receipt-form">${opened?"Close details":"Mark received"}</button>
     <button type="button" class="btn small" data-action="pending-dismiss" data-id="${esc(p.id)}">Dismiss</button>
    </div>
   </div>
   ${opened?`<form id="pending-receipt-form" class="pending-receipt-form">
    <input type="hidden" name="reportId" value="${esc(p.id)}">
    <h4>Confirm received donation</h4>
    <p class="muted">Verify the ${p.qty} ${esc(x.unit)} of ${esc(x.name)} have arrived. Inventory updates only after confirmation.</p>
    <div class="form-grid">
     <div class="field"><label for="pending-receipt-location">Storage location <span class="optional">(optional)</span></label>
      <select id="pending-receipt-location" name="location"><option value="">No location specified</option>${locationOptions()}<option value="__add">＋ Add a new location…</option></select></div>
     <div class="field"><label for="pending-receipt-expiry">Expiration date <span class="optional">(optional)</span></label>
      <input id="pending-receipt-expiry" name="expiry" type="date"></div>
    </div>
    <div id="pending-receipt-add-location" class="new-location-fields" hidden>
     <div class="field"><label for="pending-receipt-new-location">New storage location</label>
      <input id="pending-receipt-new-location" name="newLocation" maxlength="60" placeholder="e.g. Pantry shelf 3"></div>
    </div>
    <div class="pending-receipt-controls">
     <button type="submit" class="btn primary">Confirm receipt</button>
     <button type="button" class="btn" data-action="pending-receipt-cancel">Cancel</button>
    </div>
   </form>`:""}
  </div>`;
 }).join("")}</div>`;
}
function changeStock(id,delta,kind,note,location="",quiet=false){
 const x=get(id);
 if(!x||!Number.isSafeInteger(delta)||x.qty+delta<0||x.qty+delta>1000000){notify("This quantity is not available.");return false}
 if(delta<0&&location&&!(x.stockLocations||[]).some(entry=>entry.location===location&&entry.qty>=-delta)){notify("Not enough stock at that location.");return false}
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
  for(const entry of (location?x.stockLocations.filter(entry=>entry.location===location):[...x.stockLocations].sort((a,b)=>(a.location==="Unassigned"?-1:b.location==="Unassigned"?1:a.location.localeCompare(b.location))))){
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
 movement(kind,id,delta,note);if(!quiet){save();render();notify(x.name+": "+(delta>0?"+":"")+delta+" → "+x.qty)}return true
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
inventory:["Inventory","View current stock quantities, storage locations, and which items need replenishing."],
receive:["Receive donations","Record items as they arrive using the detailed intake form."],
distribute:["Distribute supplies","Record the supplies given out through day services and outreach."],
alerts:["Low stock and expiration dates","Check the supplies that are running low and review items approaching their expiration dates."],
public:["Public facing","Check available supplies and report a purchased donation."],
history:["Activity log","Review the history of inventory changes."]
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
 return data.history.slice(0,limit).map(e=>`<div class="history-row"><span class="movement-type ${e.change<0?"outbound":"inbound"}">${e.kind==="Relocation"?"MOVE":e.kind==="Correction"?"ADJ":e.change<0?"OUT":"IN"}</span><span class="history-description"><strong>${esc(e.kind)} · ${esc(get(e.item)?.name||e.item)}</strong><small>${esc(e.time)} · ${esc(e.note||"No note")}</small></span><b class="${e.change<0?"negative":"positive"}">${e.change>0?"+":""}${e.change}</b></div>`).join("")||`<div class="empty-state">No recorded activity.</div>`;
}
function stockRows(){
 const rows=data.items.filter(x=>(filter==="All"||x.cat===filter)&&(stockFilter==="All"||(stockFilter==="Low stock"?atRisk(x):stockFilter==="Public"?x.public:!x.public))&&`${x.name} ${x.cat} ${locationSummary(x)}`.toLowerCase().includes(search.toLowerCase()));
 const cats=[...new Set([...categories(),"Agency","Clothing","Food","Hygiene","Medical"])].sort((a,b)=>a.localeCompare(b));
 const categoryOptions=selected=>cats.map(cat=>`<option value="${esc(cat)}" ${cat===selected?"selected":""}>${esc(cat)}</option>`).join("");
 const editable=x=>{
  const formId="inventory-edit-"+x.id;
  return `<tr class="inventory-edit-row">
   <td><input form="${esc(formId)}" type="text" name="name" value="${esc(x.name)}" maxlength="80" required aria-label="Supply name for ${esc(x.name)}" placeholder="Supply name"></td>
   <td><select form="${esc(formId)}" name="category" required aria-label="Category for ${esc(x.name)}">${categoryOptions(x.cat)}</select></td>
   <td><output class="inventory-total-count" id="inventory-total-${esc(formId)}" aria-label="Total count for ${esc(x.name)}">${x.qty.toLocaleString()}</output><small class="inventory-total-subtitle">Sum of locations</small></td>
   <td><input form="${esc(formId)}" type="number" name="min" value="${x.min}" min="0" max="1000000" step="1" required aria-label="Stock minimum for ${esc(x.name)}"></td>
   <td class="location-cell">
    <div class="inventory-location-counts">
     ${locationBalances(x).map(entry=>`<label class="inventory-location-editor"><span>${esc(entry.location)}</span><input form="${esc(formId)}" type="number" name="locationQty:${encodeURIComponent(entry.location)}" value="${entry.qty}" min="0" max="1000000" step="1" data-inventory-count aria-label="Count at ${esc(entry.location)} for ${esc(x.name)}"></label>`).join("")}
    </div>
    <div class="inventory-location-add"><select form="${esc(formId)}" name="addLocation" data-inventory-location-choice aria-label="Assign another location to ${esc(x.name)}"><option value="">＋ Add location…</option>${["Unassigned",...data.locations].filter(loc=>!x.stockLocations.some(entry=>entry.location===loc)).map(loc=>`<option value="${esc(loc)}">${esc(loc)}</option>`).join("")}<option value="__new">＋ New storage location…</option></select><input form="${esc(formId)}" name="addLocationQty" type="number" value="0" min="0" max="1000000" step="1" data-inventory-count aria-label="Quantity at new location for ${esc(x.name)}"><input form="${esc(formId)}" type="text" name="newLocationName" maxlength="60" placeholder="New location name" aria-label="New location name for ${esc(x.name)}" data-inventory-new-location hidden></div>
   </td>
   <td>${badge(x)}</td>
   <td><select form="${esc(formId)}" name="visibility" aria-label="Public visibility of ${esc(x.name)}"><option value="private" ${!x.public?"selected":""}>Private</option><option value="public" ${x.public?"selected":""}>Public</option></select></td>
   <td><form id="${esc(formId)}" data-inventory-edit="${esc(x.id)}"></form><button type="submit" form="${esc(formId)}" class="btn primary small">Save</button></td>
  </tr>`;
 };
 const newRow=`<tr class="inventory-new-row">
  <td><input form="inventory-add-form" id="inventory-add-name" name="name" type="text" maxlength="80" required placeholder="New supply" aria-label="New supply name"></td>
  <td><select form="inventory-add-form" name="category" required aria-label="Category for new supply"><option value="" selected disabled>Choose category…</option>${categoryOptions("")}</select></td>
  <td><output class="inventory-total-count" id="inventory-total-inventory-add-form" aria-label="Total count for new supply">0</output><small class="inventory-total-subtitle">Sum of locations</small></td>
  <td><input form="inventory-add-form" name="min" type="number" min="0" max="1000000" value="10" step="1" required aria-label="Minimum count for new supply"></td>
  <td class="location-cell"><div class="inventory-location-add inventory-location-add-new"><select form="inventory-add-form" name="location" data-inventory-location-choice aria-label="Storage location for new supply"><option value="">Unassigned</option>${locationOptions()}<option value="__new">＋ New storage location…</option></select><input form="inventory-add-form" name="newLocationQty" type="number" min="0" max="1000000" value="0" step="1" required data-inventory-count aria-label="Count at selected location for new supply"><input form="inventory-add-form" type="text" name="newLocationName" maxlength="60" placeholder="New location name" aria-label="New storage location name" data-inventory-new-location hidden></div><small>Save, then edit to assign counts at additional locations.</small></td>
  <td><small>New item</small></td>
  <td><select form="inventory-add-form" name="visibility" aria-label="Public visibility for new supply"><option value="private" selected>Private</option><option value="public">Public</option></select></td>
  <td><form id="inventory-add-form"></form><button type="submit" form="inventory-add-form" class="btn primary small">Add item</button></td>
 </tr>`;
 return `<div class="inventory-scroll-shell ${inventoryEditMode?"inventory-scroll-editing":""}">
 ${inventoryEditMode?`<div class="inventory-scroll-controls" id="inventory-scroll-controls" hidden aria-label="Horizontal inventory scrolling">
  <span>Scroll columns</span>
  <button type="button" class="mini-btn" data-action="inventory-scroll-left" aria-label="Scroll inventory table left">◀</button>
  <input type="range" id="inventory-scroll-range" min="0" max="100" value="0" step="1" aria-label="Horizontal inventory table position">
  <button type="button" class="mini-btn" data-action="inventory-scroll-right" aria-label="Scroll inventory table right">▶</button>
 </div>`:""}
 <div class="table-wrap inventory-table-scroll" id="inventory-table-scroll" tabindex="0" aria-label="Inventory table, scroll to view all columns"><table class="data-table inventory-table ${inventoryEditMode?"inventory-table-editing":""}"><thead><tr><th>Supply</th><th>Category</th><th>Total count</th><th>Minimum</th><th>Location counts</th><th>Status</th><th>Visible</th>${inventoryEditMode?"<th>Save</th>":""}</tr></thead><tbody>
 ${rows.map(x=>inventoryEditMode?editable(x):`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.cat)}</td><td><b>${x.qty}</b></td><td>${x.min}</td><td class="location-cell">${esc(locationSummary(x))}</td><td>${badge(x)}</td><td><span class="visibility-chip ${x.public?"published":""}">${x.public?"Public":"Private"}</span></td></tr>`).join("")}
 ${inventoryEditMode&&inventoryAddMode?newRow:""}
 ${!rows.length&&!(inventoryEditMode&&inventoryAddMode)?`<tr><td colspan="${inventoryEditMode?8:7}" class="empty-state">No matching supplies. Clear a filter and try again.</td></tr>`:""}
 </tbody></table></div>
 </div>
 <p class="table-foot">${rows.length} of ${data.items.length} supply types shown. ${inventoryEditMode?"Edit location counts directly and save the row. Reduce one location and increase another to move stock without changing the total. Use “New storage location” to create a shelf in the same row. Changes are tracked in Activity log.":"Total count is the sum of every storage location. Edit the table to adjust counts at each location, item details, or public visibility."}</p>`;
}
function inventory(){
 return `<section class="panel">
 ${title("Inventory directory",`<div class="inventory-header-actions"><button type="button" class="btn small ${inventoryEditMode?"primary":""}" data-action="inventory-edit-toggle">${inventoryEditMode?"Done editing":"Edit table"}</button><button type="button" class="btn small" data-action="inventory-add-toggle">${inventoryEditMode&&inventoryAddMode?"Cancel new item":"＋ Add item"}</button></div>`)}
 <div class="inventory-filters"><div class="field search-field"><label for="stock-search">Search items</label><input id="stock-search" type="search" placeholder="Name, category or shelf…" value="${esc(search)}"></div>
 <div class="field"><label for="cat-filter">Category</label><select id="cat-filter"><option>All</option>${categories().map(c=>`<option ${filter===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
 <div class="field"><label for="status-filter">Status</label><select id="status-filter">${["All","Low stock","Public","Private"].map(c=>`<option ${stockFilter===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
 <div id="inventory-results">${stockRows()}</div>
 </section>
`;
}
function receive(){
 const pending=pendingReports().length;
 return `<section class="panel pending-section">${title("Pending donor purchases",`<span class="pending-count">${pending} awaiting confirmation</span>`)}
 <p class="muted">Donors can report purchases on the Public Facing page. Confirm items only after they arrive; reports do not increase inventory on their own.</p>
 <div id="pending-results">${pendingRows()}</div>
 <p class="tiny muted">Browser-only demonstration: reports from other visitors or devices do not reach this queue.</p>
 </section><div class="receive-layout receive-form-only">
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
 return `<div class="split distribute-form-only">
 <section class="panel">${title("Log distributed supplies")}<p class="muted">Record items leaving for walk-in guests, outreach, or meals. No recipient personal information is required.</p>
 <form id="distribute-form"><div class="field"><label for="distribute-item">Item</label><select name="item" id="distribute-item">${opt("hygiene")}</select></div>
 <div id="distribute-available" class="stock-summary">Available now: <strong>${get("hygiene").qty} kits</strong></div>
 <div class="form-grid"><div class="field"><label for="distribute-qty">Quantity</label><input id="distribute-qty" name="qty" type="number" value="1" min="1" step="1" required></div>
 <div class="field"><label for="distribute-purpose">Distribution type</label><select name="purpose" id="distribute-purpose"><option>Walk-in assistance</option><option>Outreach</option><option>Meal program</option><option>Other</option></select></div></div>
 <div class="field"><label for="distribute-location">Storage location <span class="optional">(optional)</span></label><select name="location" id="distribute-location"><option value="">Automatic allocation (location not recorded)</option>${stockLocationOptions(get("hygiene"))}</select>
 <small class="location-help">Select the shelf you took supplies from to keep the location balances accurate.</small></div>
 <div class="field"><label for="distribute-note">Note <span class="optional">(optional)</span></label><textarea id="distribute-note" name="note" placeholder="No personal details needed"></textarea></div>
 <button class="btn primary" type="submit">Confirm distribution →</button></form>
 <p class="tiny muted">Inventory cannot go below zero. Dated stock is deducted from the nearest non-expired batch first when possible.</p></section></div>`;
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
 return `<section class="panel activity-log-panel">${title("Activity log")}<p class="muted">Every simulated inventory movement is recorded below. In production this audit log must be server-side and tamper-resistant.</p>${historyRows()}</section>`;
}

function view(){return ({inventory,receive,distribute,alerts,public:publicNeeds,history:settings}[section]||inventory)()}
function syncInventoryScroller(){
 const box=document.getElementById("inventory-table-scroll");
 const slider=document.getElementById("inventory-scroll-range");
 const controls=document.getElementById("inventory-scroll-controls");
 if(!box||!slider||!controls)return;
 const overflow=Math.max(0,box.scrollWidth-box.clientWidth);
 controls.hidden=overflow<2;
 slider.max=String(Math.max(1,Math.floor(overflow)));
 slider.value=String(Math.min(Math.max(0,Math.round(box.scrollLeft)),Math.floor(overflow)));
}
function initInventoryScroller(){
 if(section!=="inventory"||!inventoryEditMode)return;
 const box=document.getElementById("inventory-table-scroll");
 if(!box)return;
 box.scrollLeft=inventoryScrollX;
 box.scrollTop=inventoryScrollY;
 if(typeof box.addEventListener==="function"){
  box.addEventListener("scroll",()=>{
   inventoryScrollX=box.scrollLeft;
   inventoryScrollY=box.scrollTop;
   syncInventoryScroller();
  },{passive:true});
 }
 syncInventoryScroller();
}
function render(){
 const previous=document.getElementById("inventory-table-scroll");
 if(previous){inventoryScrollX=previous.scrollLeft||0;inventoryScrollY=previous.scrollTop||0}
 root.innerHTML=shell();
 initInventoryScroller();
}
function go(id){if(id!=="admin"&&id!=="overview"&&!sections.some(x=>x[0]===id))return;section=id==="admin"||id==="overview"?"inventory":id;location.hash=id==="overview"?"inventory":id;render();window.scrollTo?.({top:0,behavior:"auto"})}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-go]");
 if(nav){e.preventDefault();go(nav.dataset.go);return}
 const target=e.target.closest("[data-action]");if(!target)return;
 const act=target.dataset.action,id=target.dataset.id;
 if(act==="inventory-scroll-left"||act==="inventory-scroll-right"){
  const box=document.getElementById("inventory-table-scroll");
  if(box){box.scrollLeft+=(act==="inventory-scroll-left"?-360:360);inventoryScrollX=box.scrollLeft;syncInventoryScroller()}
  return
 }
 if(act==="inventory-edit-toggle"){
  inventoryEditMode=!inventoryEditMode;
  if(!inventoryEditMode)inventoryAddMode=false;
  render();return
 }
 if(act==="inventory-add-toggle"){
  if(!inventoryEditMode){inventoryEditMode=true;inventoryAddMode=true;search="";filter="All";stockFilter="All";}
  else inventoryAddMode=!inventoryAddMode;
  render();if(inventoryAddMode)document.getElementById("inventory-add-name")?.focus?.();return
 }
 if(act==="prefill"){go("receive");const select=document.getElementById("receive-item");if(select)select.value=id;return}

 if(act==="purchase-open"){const x=get(id);if(!x||!x.public){notify("This item is not available for public reporting.");return}purchaseItemId=purchaseItemId===id?null:id;purchaseFeedback="";render();document.getElementById("report-quantity")?.focus?.();return}
 if(act==="pending-receive"){
  const p=pendingReports().find(x=>x.id===id),x=p&&get(p.item);
  if(!p||!x){notify("Report already handled or invalid.");return}
  pendingReceiptId=pendingReceiptId===id?null:id;
  render();
  if(pendingReceiptId)document.getElementById("pending-receipt-location")?.focus?.();
  return
 }
 if(act==="pending-receipt-cancel"){pendingReceiptId=null;render();return}
 if(act==="pending-dismiss"){const p=pendingReports().find(x=>x.id===id);if(!p){notify("Report already handled.");return}if(!confirm("Dismiss this unreceived purchase report? Inventory will not change."))return;p.status="dismissed";p.completedAt=now();if(pendingReceiptId===id)pendingReceiptId=null;movement("Purchase report dismissed",p.item,0,"No receipt confirmed");save();render();notify("Purchase report dismissed; stock unchanged.");return}
 if(act==="reset"){if(!confirm("Restore the fictional inventory to its original sample values?"))return;data=initial();normalizeStockLocations();save();search="";filter="All";stockFilter="All";publicSearch="";publicCategory="All";purchaseItemId=null;purchaseFeedback="";pendingReceiptId=null;inventoryEditMode=false;inventoryAddMode=false;render();notify("Example inventory restored.");return}
});
function previewInventoryLocationTotal(input){
 const formId=input.getAttribute("form");
 if(!formId)return;
 const form=document.getElementById(formId),output=document.getElementById("inventory-total-"+formId);
 if(!form||!output)return;
 const counts=Array.from(form.elements).filter(field=>field.hasAttribute("data-inventory-count"));
 const values=counts.map(field=>String(field.value));
 if(values.some(value=>!/^[0-9]+$/.test(value)||!Number.isSafeInteger(Number(value)))){
  output.textContent="—";return
 }
 const sum=values.reduce((total,value)=>total+Number(value),0);
 output.textContent=sum<=1000000?sum.toLocaleString():"Over limit";
}
document.addEventListener("input",e=>{
 if(e.target.id==="inventory-scroll-range"){const box=document.getElementById("inventory-table-scroll");if(box){box.scrollLeft=Number(e.target.value);inventoryScrollX=box.scrollLeft}}
 if(e.target.matches?.("[data-inventory-count]"))previewInventoryLocationTotal(e.target);
 if(e.target.id==="stock-search"){search=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows();}
 if(e.target.id==="public-item-search"){publicSearch=e.target.value;const pane=document.getElementById("public-preview");if(pane)pane.innerHTML=publicNeedsRows();}
});
document.addEventListener("change",e=>{
 if(e.target.id==="cat-filter"){filter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="status-filter"){stockFilter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="public-cat-filter"){publicCategory=e.target.value;const pane=document.getElementById("public-preview");if(pane)pane.innerHTML=publicNeedsRows()}
 if(e.target.matches?.("[data-inventory-location-choice]")){
  const field=e.target.closest(".inventory-location-add")?.querySelector("[data-inventory-new-location]");
  if(field){field.hidden=e.target.value!=="__new";if(field.hidden)field.value="";else field.focus?.()}
 }
 if(e.target.id==="receive-item"){const el=document.getElementById("new-item-fields");if(el)el.hidden=e.target.value!=="__new"}
 if(e.target.id==="receive-location"){const el=document.getElementById("receive-add-location");if(el)el.hidden=e.target.value!=="__add"}
 if(e.target.id==="pending-receipt-location"){const el=document.getElementById("pending-receipt-add-location");if(el)el.hidden=e.target.value!=="__add"}
 if(e.target.id==="distribute-item"){const x=get(e.target.value),el=document.getElementById("distribute-available"),locations=document.getElementById("distribute-location");if(x&&el)el.innerHTML="Available now: <strong>"+x.qty+" "+esc(x.unit)+"</strong>";if(x&&locations)locations.innerHTML='<option value="">Automatic allocation (location not recorded)</option>'+stockLocationOptions(x)}
});
document.addEventListener("submit",e=>{
 const form=e.target;if(!["receive-form","distribute-form","inventory-add-form","purchase-report-form","pending-receipt-form"].includes(form.id)&&!form.dataset?.inventoryEdit&&!form.matches("[data-threshold]"))return;
 e.preventDefault();
 const fd=new FormData(form);
 if(form.id==="inventory-add-form"||form.dataset?.inventoryEdit){
  if(!inventoryEditMode){notify("Enable table editing before saving changes.");return}
  const id=String(form.dataset?.inventoryEdit||""),existing=id?get(id):null;
  if(id&&!existing){notify("That inventory item no longer exists.");return}
  if(!id&&!inventoryAddMode){notify("Use Add item to create a supply.");return}
  const name=String(fd.get("name")||"").trim(),cat=String(fd.get("category")||"").trim();
  const rawMin=String(fd.get("min")??""),minimum=Number(rawMin),vis=String(fd.get("visibility")||"");
  if(!name||name.length>80||!cat||![...new Set([...categories(),"Agency","Clothing","Food","Hygiene","Medical"])].includes(cat)){notify("Enter a name and choose a valid category.");return}
  if(!/^\d+$/.test(rawMin)||!Number.isSafeInteger(minimum)||minimum>1000000){
   notify("Enter a whole-number minimum from 0 to 1,000,000.");return
  }
  if(vis!=="private"&&vis!=="public"){notify("Choose Public or Private visibility.");return}
  if(data.items.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase())){
   notify("A supply with that name already exists. Edit its row instead.");return
  }
  const publicVisible=vis==="public";
  const validQty=value=>/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)<=1000000;
  const updated=[];
  let newRegistryLocation="";
  if(existing){
   for(const entry of locationBalances(existing)){
    const raw=String(fd.get("locationQty:"+encodeURIComponent(entry.location))??"");
    if(!validQty(raw)){notify("Enter a valid whole-number count for "+entry.location+".");return}
    const count=Number(raw);
    if(count>0)updated.push({location:entry.location,qty:count});
   }
   const added=String(fd.get("addLocation")||"");
   const addRaw=String(fd.get("addLocationQty")??"0");
   if(added){
    let loc="";
    if(added==="__new"){
     const typed=cleanLocation(fd.get("newLocationName"));
     if(!validLocation(typed)){notify("Enter a valid new storage location name (up to 60 characters).");return}
     loc=matchingLocation(typed)||typed;
     if(!matchingLocation(typed))newRegistryLocation=typed;
    }else loc=added==="Unassigned"?"Unassigned":matchingLocation(added);
    if(!loc||existing.stockLocations.some(row=>row.location===loc)){notify("Choose a location that is not already assigned to this item.");return}
    if(!validQty(addRaw)||Number(addRaw)<1){notify("Enter a positive whole-number count for the added location.");return}
    updated.push({location:loc,qty:Number(addRaw)});
   }else if(addRaw!==""&&(!validQty(addRaw)||Number(addRaw)!==0)){
    notify("Select a location for the additional quantity.");return
   }
  }else{
   const raw=String(fd.get("newLocationQty")??""),selected=String(fd.get("location")||"");
   if(!validQty(raw)){notify("Enter a valid whole-number count for the new item.");return}
   let loc=selected?matchingLocation(selected):"Unassigned";
   if(selected==="__new"){
    const typed=cleanLocation(fd.get("newLocationName"));
    if(!validLocation(typed)){notify("Enter a valid new storage location name (up to 60 characters).");return}
    loc=matchingLocation(typed)||typed;
    if(!matchingLocation(typed))newRegistryLocation=typed;
   }
   if(!loc){notify("Select a valid location for this supply.");return}
   if(Number(raw)>0)updated.push({location:loc,qty:Number(raw)});
  }
  const total=updated.reduce((sum,row)=>sum+row.qty,0);
  if(total>1000000){notify("Location counts cannot exceed 1,000,000 in total.");return}
  if(existing){
   const diff=total-existing.qty;
   const changes=[];
   if(name!==existing.name)changes.push("Name: "+existing.name+" → "+name);
   if(cat!==existing.cat)changes.push("Category: "+existing.cat+" → "+cat);
   if(minimum!==existing.min)changes.push("Minimum: "+existing.min+" → "+minimum);
   if(publicVisible!==existing.public)changes.push("Visibility: "+(publicVisible?"Public":"Private"));
   const oldCounts=new Map(existing.stockLocations.map(row=>[row.location,row.qty]));
   const newCounts=new Map(updated.map(row=>[row.location,row.qty]));
   const allocated=[...new Set([...oldCounts.keys(),...newCounts.keys()])].sort((a,b)=>a.localeCompare(b));
   const locationChanges=allocated.filter(loc=>(oldCounts.get(loc)||0)!==(newCounts.get(loc)||0))
    .map(loc=>loc+": "+(oldCounts.get(loc)||0)+" → "+(newCounts.get(loc)||0));
   if(!changes.length&&!locationChanges.length){notify("No changes to save.");return}
   /* Keep dated-lot deductions consistent on a count decrease. The direct
      per-location balances replace the automatic allocation after this adjustment. */
   if(diff&&!changeStock(id,diff,"Correction","Physical count updated from Inventory locations","",true))return;
   if(newRegistryLocation){data.locations.push(newRegistryLocation);data.locations.sort((a,b)=>a.localeCompare(b))}
   existing.stockLocations=updated;
   existing.qty=total;
   existing.name=name;existing.cat=cat;existing.min=minimum;existing.public=publicVisible;
   if(changes.length||locationChanges.length)movement("Item edit",id,0,[...changes,...locationChanges].join(" · ").slice(0,500));
   save();render();notify(name+" updated. Total: "+total.toLocaleString());return
  }
  const createdId="custom-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  if(newRegistryLocation){data.locations.push(newRegistryLocation);data.locations.sort((a,b)=>a.localeCompare(b))}
  data.items.push({id:createdId,name,cat,unit:"items",qty:total,min:minimum,public:publicVisible,stockLocations:updated});
  movement("Item created",createdId,total,"Added from Inventory table"+(updated.length?" · "+updated[0].location+": "+total:" · No stock"));
  inventoryAddMode=false;save();render();notify(name+" added to inventory.");return
 }
 if(form.id==="pending-receipt-form"){
  const reportId=String(fd.get("reportId")||""),p=pendingReports().find(z=>z.id===reportId),x=p&&get(p.item);
  if(!p||!x){pendingReceiptId=null;render();notify("This purchase report is no longer awaiting receipt.");return}
  if(pendingReceiptId!==reportId){notify("Open the purchase report before confirming it.");return}
  const qty=Number(p.qty);
  if(!Number.isSafeInteger(qty)||qty<1||x.qty+qty>1000000){notify("Cannot receive this quantity.");return}
  const expiry=String(fd.get("expiry")||"");
  if(expiry){
   const date=/^\d{4}-\d{2}-\d{2}$/.test(expiry)?new Date(expiry+"T00:00:00Z"):null;
   if(!date||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==expiry){notify("Enter a valid expiration date.");return}
  }
  const selected=String(fd.get("location")||"");
  let location="";
  if(selected==="__add"){
   const typed=cleanLocation(fd.get("newLocation"));
   if(!validLocation(typed)){notify("Enter a valid new storage location name (up to 60 characters).");return}
   location=matchingLocation(typed)||typed;
  }else if(selected){
   location=matchingLocation(selected)||"";
   if(!location){notify("Select an existing location or add a new one.");return}
  }
  const newLocation=location&&!data.locations.includes(location);
  if(newLocation)data.locations.push(location);
  data.locations.sort((a,b)=>a.localeCompare(b));
  const lot=expiry?{id:"LOT-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6),item:p.item,qty,expiry}:null;
  if(lot)data.lots.push(lot);
  const priorCompleted=p.completedAt;
  p.status="received";
  p.completedAt=now();
  pendingReceiptId=null;
  const note="Confirmed donor purchase "+p.id+(location?" · Stored at "+location:" · Location unassigned");
  if(!changeStock(p.item,qty,"Donation",note,location)){
   p.status="pending";
   if(priorCompleted===undefined)delete p.completedAt;else p.completedAt=priorCompleted;
   if(lot)data.lots=data.lots.filter(item=>item!==lot);
   if(newLocation)data.locations=data.locations.filter(name=>name!==location);
   pendingReceiptId=reportId;
   render();
   return;
  }
  notify("Receipt confirmed for "+x.name);
  return
 }
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
  if((newItem?0:get(id).qty)+qty>1000000){notify("This donation would exceed the maximum tracked quantity.");return}
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
  const location=String(fd.get("location")||"");
  const note=String(fd.get("purpose"))+(fd.get("note")?" · "+String(fd.get("note")).slice(0,150):"")+(location?" · From "+location:" · Automatic shelf allocation");
  changeStock(id,-qty,"Distribution",note,location);return;
 }
 if(form.matches("[data-threshold]")){
  const id=form.dataset.threshold,min=Number(fd.get("minimum")),x=get(id);
  if(!x||!Number.isSafeInteger(min)||min<0){notify("Enter a valid minimum quantity.");return}
  x.min=min;save();render();notify("Low-stock threshold updated for "+x.name);
 }
});
window.addEventListener("resize",()=>syncInventoryScroller());
window.addEventListener("hashchange",()=>{const route=location.hash.slice(1);if(route==="overview"){location.hash="inventory";return}const id=route==="admin"?"inventory":route;if((route==="admin"||sections.some(x=>x[0]===route))&&id!==section){section=id;render();}});
render();
})();
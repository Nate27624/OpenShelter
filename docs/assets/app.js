(function unifiedInventoryApp(){
"use strict";
const root=document.getElementById("app");
const storageKey="openshelter-unified-inventory-demo-v2";
const sections=[
 ["overview","Overview","▦"],
 ["inventory","Inventory","▤"],
 ["receive","Receive donations","＋"],
 ["distribute","Distribute supplies","↗"],
 ["alerts","Alerts & expiration","!"],
 ["public","Public needs","♥"],
 ["history","Activity & settings","◷"]
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
 history:[
  {id:"TX-0001",kind:"Donation",item:"socks",change:12,note:"Example donation",time:"Today · 9:42 AM"},
  {id:"TX-0002",kind:"Distribution",item:"hygiene",change:-4,note:"Example outreach distribution",time:"Today · 9:15 AM"},
  {id:"TX-0003",kind:"Correction",item:"coats",change:2,note:"Example stock count",time:"Yesterday"}
 ]
});
let data;try{data=JSON.parse(localStorage.getItem(storageKey)||"null")}catch{}
if(!data||!Array.isArray(data.items)||!Array.isArray(data.history)||!Array.isArray(data.lots))data=initial();
let section=sections.some(s=>"#"+s[0]===location.hash)?location.hash.slice(1):"overview";
let search="",filter="All",stockFilter="All",noticeTimer;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const get=id=>data.items.find(x=>x.id===id);
const atRisk=x=>x.qty<=x.min;
const shortage=()=>data.items.filter(atRisk).sort((a,b)=>(a.qty-a.min)-(b.qty-b.min));
const available=()=>data.items.reduce((sum,x)=>sum+x.qty,0);
const days=iso=>Math.ceil((new Date(iso+"T12:00:00")-new Date().setHours(12,0,0,0))/86400000);
const expiring=()=>data.lots.filter(l=>l.qty>0).sort((a,b)=>a.expiry.localeCompare(b.expiry));
const categories=()=>[...new Set(data.items.map(x=>x.cat))];
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(data))}catch{}};
const now=()=>new Date().toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const opt=(selected)=>data.items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?"selected":""}>${esc(x.name)}</option>`).join("");
const badge=x=>`<span class="status ${x.qty===0?"out":atRisk(x)?"low":"ok"}">${x.qty===0?"Out of stock":atRisk(x)?"Low stock":"In stock"}</span>`;
function notify(text){const box=document.getElementById("toast");if(!box)return;box.textContent=text;box.classList.add("show");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>box.classList.remove("show"),2600)}
function movement(kind,id,change,note){
 data.history.unshift({id:"TX-"+Date.now().toString(36),kind,item:id,change,note:String(note||""),time:now()});data.history=data.history.slice(0,200);
}
function changeStock(id,delta,kind,note){
 const x=get(id);
 if(!x||!Number.isInteger(delta)||x.qty+delta<0){notify("This quantity is not available.");return false}
 x.qty+=delta;
 if(delta<0){
   let remaining=-delta;
   for(const l of data.lots.filter(z=>z.item===id&&z.qty>0&&days(z.expiry)>=0).sort((a,b)=>a.expiry.localeCompare(b.expiry))){
    const used=Math.min(l.qty,remaining);l.qty-=used;remaining-=used;if(!remaining)break;
   }
 }
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
public:["Public needs list","Preview donation needs for the existing website and choose which items are eligible to appear."],
history:["Activity and settings","Review stock movements, correct a physical count, and maintain minimum quantities."]
};
return `${header()}
<div class="prototype-notice"><div class="prototype-notice-inner"><strong>INVENTORY SYSTEM PROPOSAL</strong> &nbsp; | &nbsp; This is a demonstration, not part of The Open Shelter's live inventory.</div></div>
<main id="main" class="wp-page">
 <nav class="inventory-menu" aria-label="Inventory management sections">
 ${sections.map(s=>`<a href="#${s[0]}" data-go="${s[0]}" class="inventory-tab ${section===s[0]?"active":""}" ${section===s[0]?'aria-current="page"':""}>${s[1]}${s[0]==="alerts"&&shortage().length?` <span class="nav-count">(${shortage().length})</span>`:""}</a>`).join("")}
 </nav>
 <div class="section-header">
  <div><h2>${meta[section][0]}</h2></div>
  <div class="heading-buttons"><button class="btn primary" data-go="receive">Receive donation</button><button class="btn" data-go="distribute">Distribute supplies</button></div>
 </div>
 <div class="demo-disclaimer"><strong>Sample data only.</strong> This prototype does not have a login or a live database. Information is stored only in your browser. Please do not enter real or sensitive information. <button class="reset-link" data-action="reset">Reset example data</button></div>
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
 return data.history.slice(0,limit).map(e=>`<div class="history-row"><span class="movement-icon ${e.change<0?"outbound":"inbound"}">${e.change<0?"−":"+"}</span><span class="history-description"><strong>${esc(e.kind)} · ${esc(get(e.item)?.name||e.item)}</strong><small>${esc(e.time)} · ${esc(e.note||"No note")}</small></span><b class="${e.change<0?"negative":"positive"}">${e.change>0?"+":""}${e.change}</b></div>`).join("")||`<div class="empty-state">No recorded activity.</div>`;
}
function overview(){
 const next=expiring().filter(l=>days(l.expiry)<=30).length;
 return `<div class="metrics-grid">${stat(available().toLocaleString(),"Units in stock","Across all categories")}
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
 const rows=data.items.filter(x=>(filter==="All"||x.cat===filter)&&(stockFilter==="All"||(stockFilter==="Low stock"?atRisk(x):stockFilter==="Public"?x.public:!x.public))&&`${x.name} ${x.cat} ${x.location}`.toLowerCase().includes(search.toLowerCase()));
 return `<div class="table-wrap"><table class="data-table inventory-table"><thead><tr><th>Supply</th><th>Category</th><th>Available</th><th>Minimum</th><th>Location</th><th>Status</th><th>Visible</th><th></th></tr></thead><tbody>
 ${rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.cat)}</td><td><b>${x.qty}</b> <small>${esc(x.unit)}</small></td><td>${x.min}</td><td>${esc(x.location)}</td><td>${badge(x)}</td><td><span class="visibility-chip ${x.public?"published":""}">${x.public?"Public":"Private"}</span></td><td><button class="mini-btn" data-action="edit" data-id="${esc(x.id)}">Adjust</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty-state">No matching supplies. Clear a filter and try again.</td></tr>`}</tbody></table></div>
 <p class="table-foot">${rows.length} of ${data.items.length} supply types shown. Changes are reflected in the dashboard and alert screens.</p>`;
}
function inventory(){
 return `<section class="panel">
 ${title("Inventory directory",`<button class="btn primary small" data-go="receive">＋ Add stock</button>`)}
 <div class="inventory-filters"><div class="field search-field"><label for="stock-search">Search items</label><input id="stock-search" type="search" placeholder="Name, category or shelf…" value="${esc(search)}"></div>
 <div class="field"><label for="cat-filter">Category</label><select id="cat-filter"><option>All</option>${categories().map(c=>`<option ${filter===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
 <div class="field"><label for="status-filter">Status</label><select id="status-filter">${["All","Low stock","Public","Private"].map(c=>`<option ${stockFilter===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
 <div id="inventory-results">${stockRows()}</div></section>`;
}
function receive(){
 return `<div class="receive-layout">
 <section class="panel">
 ${title("Fast intake")}<p class="muted">One click adds a standard unit to stock. No unnecessary fields for routine donations.</p>
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
 <div class="form-grid"><div class="field"><label for="new-min">Low-stock threshold</label><input id="new-min" type="number" name="newMin" min="0" value="10"></div><div class="field"><label for="new-location">Storage shelf</label><input id="new-location" name="newLocation" value="A1"></div></div></div>
 <div class="form-grid"><div class="field"><label for="receive-qty">Quantity received</label><input id="receive-qty" name="qty" type="number" min="1" step="1" value="12" required></div><div class="field"><label for="receive-exp">Expiration date <span class="optional">(optional)</span></label><input id="receive-exp" name="expiry" type="date"></div></div>
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
 <section class="panel">${title("Expiration watch")}<p class="muted">Batches carry their own expiration dates, even when they contain the same item.</p>${expiryRows()}<div class="note" style="margin-top:17px">This is an alerting preview, not a safety determination. Real procedures for expired food and medical supplies must be agreed with staff.</div></section></div>`;
}
function publicNeedsRows(){
 const rows=data.items.filter(x=>x.public&&atRisk(x));
 return rows.length?rows.map(x=>`<div class="public-item"><span class="public-dot"></span><div><strong>${esc(x.name)}</strong><small>${esc(x.cat)} · Priority donation needed</small></div><span class="status low">Needed</span></div>`).join(""):`<div class="empty-state">No eligible low-stock items currently appear in this preview.</div>`;
}
function publicNeeds(){
 return `<div class="split public-layout">
 <section class="panel"><span class="eyebrow">Donor-facing concept</span><h2 class="section-sub" style="font-size:27px;margin-top:10px">Here's what could help right now.</h2><p class="muted">This preview would supplement the existing WordPress Needs List. No internal counts, shelf locations, or private supply types are published.</p>
 <div id="public-preview">${publicNeedsRows()}</div>
 <a class="btn primary" href="https://theopenshelter.org/needs-list/" target="_blank" rel="noopener" style="margin-top:18px">Visit actual Needs List ↗</a>
 <p class="tiny muted" style="margin-top:10px">The existing Amazon Needs List remains available on the shelter's website.</p></section>
 <section class="panel">${title("Staff visibility settings")}<p class="muted">Choose whether each supply may appear publicly when stock is low. All edits here are local to the demo.</p>
 <div class="visibility-list">${data.items.map(x=>`<div class="visibility-row"><span><strong>${esc(x.name)}</strong><small>${esc(x.cat)} · ${x.qty} on hand</small></span><label class="toggle-wrap"><span>${x.public?"Public eligible":"Private"}</span><input type="checkbox" class="toggle-input" data-public="${x.id}" ${x.public?"checked":""} aria-label="Allow ${esc(x.name)} on public needs list"><span class="toggle-track"></span></label></div>`).join("")}</div>
 <div class="note" style="margin-top:15px">In production, publishing should require authorized staff approval and server-side permissions. GitHub Pages cannot provide that security.</div></section></div>`;
}
function historyRows(){
 return `<div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Activity</th><th>Supply</th><th>Change</th><th>Note</th></tr></thead><tbody>${data.history.map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.kind)}</td><td><b>${esc(get(x.item)?.name||x.item)}</b></td><td class="${x.change<0?"negative":"positive"}">${x.change>0?"+":""}${x.change}</td><td>${esc(x.note||"—")}</td></tr>`).join("")}</tbody></table></div>`;
}
function settings(){
 return `<div class="history-settings"><section class="panel">${title("Activity log")}<p class="muted">Every simulated inventory movement is recorded below. In production this audit log must be server-side and tamper-resistant.</p>${historyRows()}</section>
 <div class="settings-stack">
 <section class="panel">${title("Correct a physical count")}<p class="muted">Reconcile the system when a shelf count differs from the recorded quantity. Corrections create an audit entry.</p>
 <form id="correct-form"><div class="field"><label for="correct-item">Supply</label><select name="item" id="correct-item">${opt("coats")}</select></div>
 <div id="correct-existing" class="stock-summary">Recorded count: <strong>${get("coats").qty} coats</strong></div>
 <div class="field"><label for="correct-qty">Count on shelf</label><input id="correct-qty" name="qty" type="number" min="0" step="1" value="${get("coats").qty}" required></div>
 <div class="field"><label for="correct-reason">Reason for adjustment</label><select name="reason" id="correct-reason"><option>Physical count</option><option>Damaged or discarded</option><option>Missed movement</option><option>Other</option></select></div>
 <button class="btn primary" type="submit">Save count correction →</button></form>
 </section>
 <section class="panel">${title("Minimum stock settings")}<p class="muted">Adjust when an item should trigger a low-stock alert.</p>
 <div class="threshold-list">${data.items.map(x=>`<form class="threshold-row" data-threshold="${x.id}"><span><strong>${esc(x.name)}</strong><small>${x.qty} in stock</small></span><label class="sr-only" for="min-${x.id}">Minimum for ${esc(x.name)}</label><input id="min-${x.id}" type="number" name="minimum" min="0" step="1" value="${x.min}" required><button type="submit" class="mini-btn">Save</button></form>`).join("")}</div></section>
 </div></div>`;
}
function view(){return ({overview,inventory,receive,distribute,alerts,public:publicNeeds,history:settings}[section]||overview)()}
function render(){root.innerHTML=shell();}
function go(id){if(!sections.some(x=>x[0]===id))return;section=id;location.hash=id;render();window.scrollTo?.({top:0,behavior:"auto"})}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-go]");
 if(nav){e.preventDefault();go(nav.dataset.go);return}
 const target=e.target.closest("[data-action]");if(!target)return;
 const act=target.dataset.action,id=target.dataset.id;
 if(act==="quick"){changeStock(id,1,"Donation","Quick intake");return}
 if(act==="one-out"){changeStock(id,-1,"Distribution","One-click distribution");return}
 if(act==="prefill"){go("receive");const select=document.getElementById("receive-item");if(select)select.value=id;return}
 if(act==="edit"){go("history");const el=document.getElementById("correct-item");if(el){el.value=id;const x=get(id);document.getElementById("correct-existing").innerHTML="Recorded count: <strong>"+x.qty+" "+esc(x.unit)+"</strong>";document.getElementById("correct-qty").value=x.qty;el.scrollIntoView?.({block:"center",behavior:"smooth"});}return}
 if(act==="reset"){if(!confirm("Restore the fictional inventory to its original sample values?"))return;data=initial();save();search="";filter="All";stockFilter="All";render();notify("Example inventory restored.");return}
});
document.addEventListener("input",e=>{
 if(e.target.id==="stock-search"){search=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows();}
});
document.addEventListener("change",e=>{
 if(e.target.id==="cat-filter"){filter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="status-filter"){stockFilter=e.target.value;const pane=document.getElementById("inventory-results");if(pane)pane.innerHTML=stockRows()}
 if(e.target.id==="receive-item"){const el=document.getElementById("new-item-fields");if(el)el.hidden=e.target.value!=="__new"}
 if(e.target.id==="distribute-item"){const x=get(e.target.value);const el=document.getElementById("distribute-available");if(x&&el)el.innerHTML="Available now: <strong>"+x.qty+" "+esc(x.unit)+"</strong>"}
 if(e.target.id==="correct-item"){const x=get(e.target.value),el=document.getElementById("correct-existing");if(x&&el){el.innerHTML="Recorded count: <strong>"+x.qty+" "+esc(x.unit)+"</strong>";document.getElementById("correct-qty").value=x.qty;}}
 if(e.target.dataset.public){const x=get(e.target.dataset.public);if(!x)return;x.public=e.target.checked;save();render();notify(x.name+": "+(x.public?"public eligible":"private"))}
});
document.addEventListener("submit",e=>{
 const form=e.target;if(!["receive-form","distribute-form","correct-form"].includes(form.id)&&!form.matches("[data-threshold]"))return;
 e.preventDefault();
 const fd=new FormData(form);
 if(form.id==="receive-form"){
  const raw=String(fd.get("item")),qty=Number(fd.get("qty"));if(!Number.isSafeInteger(qty)||qty<1||qty>1000000){notify("Enter a valid positive quantity.");return}
  let id=raw;
  if(raw==="__new"){
   const name=String(fd.get("newName")||"").trim().slice(0,80);
   const unit=String(fd.get("newUnit")||"").trim().slice(0,30);
   const min=Number(fd.get("newMin"));
   const locationVal=String(fd.get("newLocation")||"").trim().slice(0,24);
   if(!name||!unit||!Number.isSafeInteger(min)||min<0){notify("Complete the new item's name, unit, and minimum.");return}
   id="custom-"+Date.now().toString(36);
   data.items.push({id,name,cat:String(fd.get("newCat")||"Agency"),qty:0,min,unit,location:locationVal||"Unassigned",public:false});
  }
  if(!get(id)){notify("Choose a valid supply.");return}
  const expiry=String(fd.get("expiry")||"");
  if(expiry&&isNaN(new Date(expiry+"T12:00:00").getTime())){notify("Use a valid expiration date.");return}
  if(expiry)data.lots.push({id:"LOT-"+Date.now().toString(36).toUpperCase(),item:id,qty,expiry});
  changeStock(id,qty,"Donation",String(fd.get("note")||"Donation intake").slice(0,180));return
 }
 if(form.id==="distribute-form"){
  const id=String(fd.get("item")),qty=Number(fd.get("qty"));if(!Number.isSafeInteger(qty)||qty<1||qty>1000000){notify("Enter a valid positive quantity.");return}
  const note=String(fd.get("purpose"))+(fd.get("note")?" · "+String(fd.get("note")).slice(0,150):"");
  changeStock(id,-qty,"Distribution",note);return;
 }
 if(form.id==="correct-form"){
  const id=String(fd.get("item")),qty=Number(fd.get("qty")),x=get(id);
  if(!x||!Number.isSafeInteger(qty)||qty<0||qty>1000000){notify("Enter a valid physical count.");return}
  const diff=qty-x.qty;
  if(diff===0){notify("No adjustment needed; count already matches.");return}
  changeStock(id,diff,"Correction",String(fd.get("reason")||"Physical count"));return;
 }
 if(form.matches("[data-threshold]")){
  const id=form.dataset.threshold,min=Number(fd.get("minimum")),x=get(id);
  if(!x||!Number.isSafeInteger(min)||min<0){notify("Enter a valid minimum quantity.");return}
  x.min=min;save();render();notify("Low-stock threshold updated for "+x.name);
 }
});
window.addEventListener("hashchange",()=>{const id=location.hash.slice(1);if(sections.some(x=>x[0]===id)&&id!==section){section=id;render();}});
render();
})();
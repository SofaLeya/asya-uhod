(function(){
  "use strict";
  const PREFIX = "ananas:", SHIFT = 5*3600*1000, DAY = 86400000;
  const p2 = n => String(n).padStart(2,"0");
  const fmtK = d => d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
  const dayKey = t => fmtK(new Date(t - SHIFT));
  const kDate = k => new Date(k+"T12:00:00");
  const addDays = (k,n) => { const d = kDate(k); d.setDate(d.getDate()+n); return fmtK(d); };
  const addMonths = (k,m) => { const d = kDate(k); d.setMonth(d.getMonth()+m); return fmtK(d); };
  const daysBetween = (a,b) => Math.round((Date.parse(b)-Date.parse(a))/DAY);
  const fmtD = (k,y) => kDate(k).toLocaleDateString("ru-RU", y ? {day:"numeric",month:"long",year:"numeric"} : {day:"numeric",month:"long"}).replace(" г.","");
  const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  const $ = id => document.getElementById(id);

  function load(k){ try{ return JSON.parse(localStorage.getItem(PREFIX+k)) || {}; }catch(e){ return {}; } }
  function save(k,v){ if(migrationError)return; try{ localStorage.setItem(PREFIX+k, JSON.stringify(v)); }catch(e){} }
  function ui(k,v){ try{ if(v===undefined) return localStorage.getItem("ananas:ui:"+k); localStorage.setItem("ananas:ui:"+k, v); }catch(e){} }
  const DAYRE = /^ananas:(\d{4}-\d{2}-\d{2})$/;
  function eachDay(fn){
    try{ for(let i=0;i<localStorage.length;i++){ const key = localStorage.key(i), m = key && key.match(DAYRE); if(m) fn(m[1], key); } }catch(e){}
  }
  function getStart(){ try{ const v=JSON.parse(localStorage.getItem(PREFIX+"start")); return typeof v==="string"?v:null; }catch(e){return null} }
  function firstDayWith(ids){
    let best = null;
    eachDay((k,key)=>{ let v={}; try{ v = JSON.parse(localStorage.getItem(key))||{}; }catch(e){} if((!ids || ids.some(id => v[id])) && (!best || k < best)) best = k; });
    return best;
  }

  // ---------- шаги по умолчанию ----------
  const DEF = [
  {
    "id": "am-wash",
    "g": "am",
    "name": "Умыться",
    "prod": "Aravia Hyaluronic Cleansing Gel",
    "productKey": "cleanser",
    "opt": false,
    "notes": [
      "Тёплой, не горячей водой. Если кожа сильно стянута, утром можно просто водой, без геля.",
      "Твой гель с гиалуронкой подходит. Если после него кожа \"скрипит\" и стягивает, замени на совсем мягкий, например CeraVe увлажняющий очищающий или Bioderma Sensibio гель.",
      "Полотенце для лица отдельное, промокнуть, не тереть."
    ],
    "zone": "wash"
  },
  {
    "id": "am-tonic",
    "g": "am",
    "name": "Тоник",
    "prod": "Aravia Vita Glow Tonic",
    "productKey": "tonic",
    "opt": true,
    "notes": [
      "Ладонями, похлопать, без ватного диска. Если щиплет или кожа краснеет, пропусти."
    ]
  },
  {
    "id": "am-cream",
    "g": "am",
    "name": "Крем на всё лицо",
    "prod": "Aravia Vitamin-C Power Radiance Cream",
    "productKey": "creamAm",
    "opt": false,
    "notes": [
      "На чуть влажную кожу, сразу после умывания. Твой крем с витамином С утром можно оставить.",
      "Если с ним щиплет или облазит сильнее, утром тоже мажь вечерний крем с церамидами."
    ]
  },
  {
    "id": "am-spf",
    "g": "am",
    "name": "SPF, если на улицу",
    "prod": "",
    "productKey": "spf",
    "opt": true,
    "notes": [
      "Зимой хватит SPF 30, весной и летом 50. Защищает от тёмных пятен после прыщей.",
      "Лёгкий флюид, чтобы не забивал поры. Например Skin1004 Air-Fit, La Roche-Posay Anthelios."
    ]
  },
  {
    "id": "pm-micellar",
    "g": "pm",
    "name": "Мицеллярка, если был макияж или SPF",
    "prod": "",
    "productKey": "micellar",
    "opt": true,
    "notes": [
      "Прижать диск на 10 секунд и снять, не тереть. Потом всё равно умыться."
    ]
  },
  {
    "id": "pm-wash",
    "g": "pm",
    "name": "Умыться",
    "prod": "Aravia Hyaluronic Cleansing Gel",
    "productKey": "cleanser",
    "opt": false,
    "notes": [
      "Тот же мягкий гель, что утром. Промокнуть и подождать пару минут, пока кожа полностью высохнет."
    ],
    "zone": "wash"
  },
  {
    "id": "pm-az",
    "g": "pm",
    "name": "Азелаиновая кислота",
    "prod": "",
    "productKey": "azelaic",
    "opt": false,
    "notes": [
      "Лечит прыщи и красные следы, но мягче других средств, поэтому подходит, когда кожа и сыпется, и шелушится.",
      "Где купить: в аптеке без рецепта, гель 15%: Азелик, Скинорен гель, Азикс-Дерм (крем 20%, чуть суше).",
      "Как: горошина на всё лицо тонким слоем. Мимо глаз, губ, крыльев носа. За ухом и на шее не мазать.",
      "Первые дни может пощипывать, это нормально. Если жжёт сильно или кожа красная, пропусти пару дней и мажь только крем."
    ],
    "zone": "full"
  },
  {
    "id": "pm-wait",
    "g": "pm",
    "name": "Подождать 5–10 минут",
    "kind": "wait",
    "min": 5,
    "opt": true,
    "notes": [
      "Через 5-10 минут после азелаинки, когда впиталась."
    ]
  },
  {
    "id": "pm-cream",
    "g": "pm",
    "name": "Восстанавливающий крем",
    "prod": "",
    "productKey": "creamPm",
    "opt": false,
    "notes": [
      "Через 5-10 минут после азелаинки, когда впиталась. Это главный шаг против шелушения, его стоит купить.",
      "Ищи в составе: церамиды, пантенол, глицерин, на упаковке \"некомедогенно\". Без витамина С и кислот.",
      "Например: Librederm Cerafavit, CeraVe увлажняющий лосьон для лица, La Roche-Posay Toleriane.",
      "Если какие-то места сильно шелушатся, сверху точечно плотный крем: La Roche-Posay Cicaplast Baume B5 или Бепантен."
    ],
    "zone": "full"
  },
  {
    "id": "pm-ear",
    "g": "pm",
    "name": "За ухом, если сухо",
    "prod": "",
    "productKey": "ear",
    "opt": true,
    "notes": [
      "Только плотный крем без отдушки: Cicaplast Baume B5, Бепантен, обычный вазелин. Никаких кислот и средств от прыщей.",
      "Если появились красные бляшки с серебристыми чешуйками или чешется, это не про уход, а к дерматологу (см. ниже)."
    ]
  }
];
  const DEFMAP = Object.fromEntries(DEF.map(s=>[s.id,s]));
  const ZONES = [["","без схемы"],["wash","всё лицо"],["full","лицо без глаз и губ"],["neck","шея и декольте"]];
  const FIELDS = ["name","prod","next","notes","pao","opened","zone","opt","hidden","min"];

  let migrationError = "";
  try { AsyaCore.migrate(localStorage, DEF); } catch(e) { migrationError = e.message; try{localStorage.setItem("asya2:safety:corrupt",JSON.stringify({app:"asya-uhod",v:1,data:AsyaCore.snapshot(localStorage)}))}catch(x){} }
  window.__asyaMigrationError = migrationError;
  let cfg = loadCfg();
  function loadCfg(){ const c = load("cfg"); c.steps = c.steps||{}; c.custom = Array.isArray(c.custom)?c.custom:[]; c.order = c.order||{}; return c; }
  function saveCfg(){ save("cfg", cfg); }
  const isCustom = id => cfg.custom.some(s => s.id===id);
  function raw(id){ return DEFMAP[id] || cfg.custom.find(s => s.id===id); }
  function ov(id){ if(isCustom(id)) return cfg.custom.find(s => s.id===id); return cfg.steps[id] || (cfg.steps[id] = {}); }
  function eff(id){
    const d = raw(id); if(!d) return null;
    const e = Object.assign({}, d, DEFMAP[id] ? (cfg.steps[id]||{}) : {});
    e.notes = typeof e.notes === "string" ? e.notes.split("\n").map(s=>s.trim()).filter(Boolean) : (e.notes||[]);
    e.custom = !DEFMAP[id];
    return e;
  }
  function order(g){
    const ids = DEF.filter(s=>s.g===g).map(s=>s.id).concat(cfg.custom.filter(s=>s.g===g).map(s=>s.id));
    const o = (cfg.order[g]||[]).filter(id => ids.includes(id));
    ids.forEach(id => { if(!o.includes(id)) o.push(id); });
    return o;
  }
  function expiry(e){
    if(!e.opened) return null;
    const pao = +e.pao || 0;
    if(!pao) return {opened:e.opened};
    const until = addMonths(e.opened, pao), left = daysBetween(today, until);
    return {opened:e.opened, until, left};
  }

  function face(z){
    if(!z)return "";
    const label={wash:"Всё лицо",full:"Лицо, без глаз и губ",neck:"Шея и декольте"}[z]||"Зона нанесения";
    return '<span class="zone-hint">'+esc(label)+'</span>';
  }
  const Z={wash:true,full:true,neck:true};
  // ---------- состояние ----------
  let today = dayKey(Date.now());
  let state = load(today);
  let sel = today, calOffset = 0, calMode = ui("calMode") || "ad";
  const openIds = new Set(), edOpen = new Set(), asking = new Set();
  function syncDay(){ const k = dayKey(Date.now()); if(k!==today){ if(sel===today) sel=k; today=k; state=load(k); } }
  const boxes = () => [...document.querySelectorAll(".step input")];

  // ---------- списки шагов ----------
  function buildLists(){
    ["am","pm"].forEach(g=>{
      const ol = $("ol-"+g); ol.innerHTML = "";
      order(g).forEach(id=>{
        const e = eff(id), wait = e.kind==="wait";
        const li = document.createElement("li");
        li.dataset.id = id;
        if(wait) li.className = "waitstep";
        const hasMore = e.notes.length || (e.zone && Z[e.zone]) || !wait || DEFMAP[id] && id==="pm-az";
        li.innerHTML =
          '<div class="row"><label class="step"><input type="checkbox" id="'+esc(id)+'" data-g="'+g+'"'+(e.opt?' data-opt="1"':'')+'>'
          +'<span class="txt"><span class="name"><span class="nm">'+esc(e.name)+'</span>'+(e.opt?' <span class="tag">необяз.</span>':'')+'<span class="tag exp" hidden>срок</span></span>'
          +'<span class="prod">'+esc(e.prod||"")+'</span>'
          +'</span></label>'
          +(hasMore?'<button type="button" class="where" aria-expanded="false" aria-label="Подробности: '+esc(e.name)+'"><span aria-hidden="true">⌄</span></button>':'')
          +(wait?'<button class="timer" type="button" data-for="'+esc(id)+'" data-min="'+(+e.min||5)+'"></button>':'')
          +'</div>'
          +'<div class="more" hidden>'
          + e.notes.map(n=>'<span class="note">'+esc(n)+'</span>').join('')
          +'<span class="note dyn"></span>'
          +(e.zone && Z[e.zone] ? '<span class="facebox" data-z="'+e.zone+'">'+face(e.zone)+'</span>' : '')
          +(wait ? '' :
            '<div class="pbox"><span class="pinfo"></span><span class="pnext"'+(e.next?'':' hidden')+'>Когда закончится: '+esc(e.next||"")+'</span>'
            +'<div class="btns"><button type="button" class="mini" data-act="out">Закончилось</button><button type="button" class="mini" data-act="new">Открыла новую банку</button></div>'
            +'<div class="pask"'+(asking.has(id)?'':' hidden')+'><input class="inp" placeholder="Чем заменишь?"><button type="button" class="mini acc" data-act="set">Сохранить</button></div></div>')
          +'</div>';
        if(openIds.has(id)){ li.querySelector(".more").hidden = false; const w = li.querySelector(".where"); if(w) w.setAttribute("aria-expanded","true"); }
        ol.appendChild(li);
      });
    });
    updateTimers();
  }

  // ---------- главный рендер ----------
  function render(){
    syncDay();
    $("date").textContent=new Date(Date.now()-SHIFT).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
    const start=getStart(), n=start?daysBetween(start,today)+1:0;
    const yesterday=!!load(addDays(today,-1))["pm-az"];
    const early=!start||n<=7, rest=!early&&n<=28&&yesterday&&!state["pm-az"];
    const t=$("phase-title"),pn=$("phase-note");
    if(!start){t.textContent="Старт: неделя только базы";pn.textContent="Умыться, крем, SPF. Кожа успокоится, и через неделю подключим азелаинку."}
    else if(n<=7){t.textContent="День "+n+" · только база";pn.textContent="Пока без азелаинки, даём коже перестать облазить. Она подключится через "+(8-n)+" дн."}
    else if(n<=28){t.textContent="День "+n+" · азелаинка через день";pn.textContent=rest?"Вчера была азелаинка, сегодня вечером только крем.":"Сегодня вечером азелаинка."}
    else{t.textContent="День "+n+" · кожа привыкла";pn.textContent="Азелаинка каждый вечер. Если шелушится, вернись на через день."}
    $("phase-hint").hidden=true;
    document.querySelectorAll("ol li[data-id]").forEach(li=>{
      const id=li.dataset.id,e=eff(id);if(!e)return;
      li.hidden=!!e.hidden;
      const inp=li.querySelector(".step input");
      if(id==="pm-az"){
        li.classList.toggle("rest",early||rest);inp.disabled=early||rest;
        li.querySelector(".nm").textContent=early?"Азелаиновая кислота: позже":rest?"Азелаиновая кислота: сегодня отдых":e.name;
        li.querySelector(".dyn").textContent=early?"Первая неделя без неё. Можно уже купить.":"";
      }else li.querySelector(".nm").textContent=e.name;
      li.querySelector(".prod").textContent=e.prod||"";
      const pi=li.querySelector(".pinfo");if(pi){const x=expiry(e);let txt="",warn=false;if(!x)txt='Дату вскрытия не знаю. Нажми "Открыла новую банку", когда начнёшь новую.';else if(!x.until)txt="Открыто "+fmtD(x.opened)+". Срок после вскрытия можно указать в настройках шагов.";else{txt="Открыто "+fmtD(x.opened)+" · годно до "+fmtD(x.until,true)+".";if(x.left<0){txt="Срок вышел "+fmtD(x.until)+". Лучше заменить.";warn=true}else if(x.left<=14){txt+=" Осталось "+x.left+" дн.";warn=true}}pi.textContent=txt;pi.classList.toggle("warnline",warn);li.querySelector(".tag.exp").hidden=!warn}
    });
    const bx=boxes();bx.forEach(b=>b.checked=!!state[b.id]);let changed=false;
    for(const g of ["am","pm"]){const req=bx.filter(b=>b.dataset.g===g&&!b.dataset.opt&&!b.closest("li").hidden&&!b.disabled),k=req.filter(b=>b.checked).length,done=k===req.length;
      const el=$("c-"+g);el.textContent=done?"готово":k+" из "+req.length;el.classList.toggle("done",done);
      if((state["_"+g]||0)!==(done?1:0)){state["_"+g]=done?1:0;changed=true}
      const vis=bx.filter(b=>b.dataset.g===g&&!b.closest("li").hidden&&!b.disabled),on=vis.length>0&&vis.every(b=>b.checked),mix=vis.some(b=>b.checked)&&!on,gb=$("all-"+g);gb.classList.toggle("on",on);gb.classList.toggle("mix",mix);gb.setAttribute("aria-checked",mix?"mixed":String(on));gb.querySelector(".gt").textContent=on?"Готово":"Отметить всё: "+(g==="am"?"утро":"вечер")}
    if(changed&&Object.keys(state).some(k=>!k.startsWith("_")))save(today,state);
    renderCal(n,rest,start);renderDiary();if(window.Asya2&&Asya2.ready)Asya2.render();
  }
  function computePlan(n,rest,start){const plan=new Set();if(!start)return plan;let prev=!!state["pm-az"]||!rest;for(let i=1;i<=75;i++){const day=n+i,az=day<=7?false:day<=28?!prev:true;if(az)plan.add(addDays(today,i));prev=az}return plan}

  // ---------- выполнение ----------
  function dayDone(k){
    const st = k===today ? state : load(k);
    const a = st._am!=null ? !!st._am : !!(st["am-wash"] && st["am-cream"]);
    const p = st._pm!=null ? !!st._pm : !!(st["pm-wash"] && st["pm-cream"]);
    return [a,p];
  }

  const SC = ["#ff5a5a","#ff9a4d","#e8c547","#9bd36b","#46cf8a"];
  const SCL = ["плохо","так себе","норм","хорошо","отлично"];
  const TAGS = ["спокойная","шелушится","стянуто","покраснение","жжение","высыпания","жирнится"];
  const IRRT = ["шелушится","стянуто","покраснение","жжение"];

  function renderCal(n, rest, start){
    const plan = computePlan(n, rest, start);
    const wrap = $("days"); wrap.innerHTML = "";
    const now = new Date(Date.now()-SHIFT);
    const vm = new Date(now.getFullYear(), now.getMonth()+calOffset, 1);
    const title = vm.toLocaleDateString("ru-RU",{month:"long", year:"numeric"}).replace(" г.","");
    $("cal-title").textContent = title.charAt(0).toUpperCase()+title.slice(1);
    $("cal-next").disabled = calOffset >= 1;
    document.querySelectorAll("#cal-tabs button").forEach(b => b.classList.toggle("on", b.dataset.m===calMode));
    $("cal-legend").textContent = calMode==="ad" ? "Закрашено - была азелаинка, пунктир - по плану. Нажми на день, чтобы поправить или записать, как была кожа."
      : calMode==="skin" ? "Цвет - как была кожа, от красного (плохо) до зелёного (отлично). Оранжевая обводка - было раздражение."
      : "Полный кружок - сделаны и утро, и вечер, половинка - что-то одно.";
    const lead = (vm.getDay()+6)%7, dim = new Date(vm.getFullYear(), vm.getMonth()+1, 0).getDate();
    for(let i=0;i<lead;i++) wrap.appendChild(document.createElement("div"));
    for(let d=1; d<=dim; d++){
      const k = fmtK(new Date(vm.getFullYear(), vm.getMonth(), d));
      const isToday = k===today, isFuture = k>today;
      const st = isToday ? state : (isFuture ? {} : load(k));
      const el = document.createElement("div");
      let cls = "dot", style = "", tip = d+"";
      if(calMode==="ad"){
        if(st["pm-az"]){ cls += " on"; tip += " · азелаинку был"; }
        else if(isFuture ? plan.has(k) : (isToday && !rest)){ cls += " plan"; tip += " · по плану азелаинка"; }
      } else if(calMode==="skin"){
        const dd = isFuture ? {} : load("diary:"+k);
        if(dd.s){ cls += " sk"; style = "background:"+SC[dd.s-1]; tip += " · кожа: "+SCL[dd.s-1]; }
        if((dd.t||[]).some(x => IRRT.includes(x))) cls += " irr";
        if(dd.t && dd.t.length) tip += " · "+dd.t.join(", ");
      } else if(!isFuture){
        const [a,p] = dayDone(k);
        if(a && p) cls += " on"; else if(a || p) cls += " half";
        tip += a&&p ? " · всё сделано" : a ? " · только утро" : p ? " · только вечер" : "";
      }
      el.className = "day"+(isToday?" today":"")+(isFuture?" future":"")+(k===sel?" sel":"");
      el.innerHTML = '<span class="'+cls+'"'+(style?' style="'+style+'"':'')+'>'+d+'</span>';
      el.title = tip;
      if(!isFuture){
        el.setAttribute("role","button"); el.tabIndex = 0;
        const pick = ()=>{ sel = k; render(); };
        el.addEventListener("click", pick);
        el.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(); } });
      }
      wrap.appendChild(el);
    }
    // статистика
    let streak = 0, k = today;
    const [ta,tp] = dayDone(today);
    if(!(ta && tp)) k = addDays(today,-1);
    for(let i=0;i<500;i++){ const [a,p] = dayDone(k); if(!(a&&p)) break; streak++; k = addDays(k,-1); }
    const first = firstDayWith(null);
    const mStart = fmtK(vm), mEnd = fmtK(new Date(vm.getFullYear(), vm.getMonth()+1, 0));
    let from = first && first > mStart ? first : mStart, to = mEnd < today ? mEnd : today;
    if(to===today && !(ta && tp)) to = addDays(today,-1);
    let tot = 0, am = 0, pm = 0;
    if(first) for(let x = from; x <= to; x = addDays(x,1)){ const [a,p] = dayDone(x); tot++; if(a) am++; if(p) pm++; }
    const pc = v => Math.round(v*100/tot)+"%";
    let s = "Серия: <b>"+streak+" "+plural(streak,"день","дня","дней")+"</b> подряд всё сделано.";
    if(tot >= 3){
      s += " За "+(calOffset===0?"этот месяц":"месяц")+": утро <b>"+pc(am)+"</b>, вечер <b>"+pc(pm)+"</b>.";
      if(am - pm >= 3) s += " Чаще пропускаешь вечер.";
      else if(pm - am >= 3) s += " Чаще пропускаешь утро.";
    }
    $("stats").innerHTML = s;
  }
  function plural(n,a,b,c){ const m10=n%10, m100=n%100; return m10===1&&m100!==11 ? a : m10>=2&&m10<=4&&(m100<12||m100>14) ? b : c; }

  // ---------- дневник кожи ----------
  function renderDiary(){
    const d = load("diary:"+sel), isToday = sel===today;
    $("dp-date").textContent = isToday ? "Как кожа сегодня?" : "Кожа "+fmtD(sel);
    $("dp-today").hidden = isToday;
    $("dp-ad").checked = !!(isToday ? state : load(sel))["pm-az"];
    $("dp-ad-wrap").hidden = isToday;
    $("dp-scores").innerHTML = SCL.map((l,i)=>'<button type="button" data-s="'+(i+1)+'"'+(d.s===i+1?' class="on" style="background:'+SC[i]+'"':'')+'><b>'+(i+1)+'</b><span>'+l+'</span></button>').join('');
    $("dp-tags").innerHTML = TAGS.map(t=>'<button type="button" class="chip'+((d.t||[]).includes(t)?' on':'')+'" data-t="'+t+'">'+t+'</button>').join('');
    const ta = $("dp-note"); if(document.activeElement !== ta) ta.value = d.n || "";
  }
  function editDiary(fn){ const d = load("diary:"+sel); fn(d); if(!d.s) delete d.s; if(d.t && !d.t.length) delete d.t; if(!d.n) delete d.n;
    if(Object.keys(d).length) save("diary:"+sel, d); else { try{ localStorage.removeItem(PREFIX+"diary:"+sel); }catch(e){} } }
  $("dp-scores").addEventListener("click", e=>{ const b = e.target.closest("[data-s]"); if(!b) return; const v = +b.dataset.s; editDiary(d=>{ d.s = d.s===v ? 0 : v; }); render(); });
  $("dp-tags").addEventListener("click", e=>{ const b = e.target.closest("[data-t]"); if(!b) return; const t = b.dataset.t;
    editDiary(d=>{ const s = new Set(d.t||[]); if(s.has(t)) s.delete(t); else { s.add(t); if(t==="спокойная") IRRT.concat(["высыпания"]).forEach(x=>s.delete(x)); else if(IRRT.includes(t)) s.delete("спокойная"); } d.t = [...s]; }); render(); });
  $("dp-note").addEventListener("input", e=>{ const v = e.target.value; editDiary(d=>{ d.n = v.trim() ? v : ""; }); });
  $("dp-today").addEventListener("click", ()=>{ sel = today; calOffset = 0; render(); });
  $("dp-ad").addEventListener("change", e=>{ setAd(sel, e.target.checked); render(); });
  function setAd(k,val){const st=k===today?state:load(k);st["pm-az"]=val;save(k,st);if(k===today&&val&&!getStart())save("start",today)}

  // ---------- события ----------
  document.addEventListener("change", e=>{
    const b = e.target;
    if(b.matches && b.matches(".step input")){
      syncDay();
      if(b.id==="pm-az") setAd(today, b.checked);
      else { state[b.id] = b.checked; save(today, state); }
      if(b.checked&&!getStart())save("start",today);render();
    }
  });
  ["am","pm"].forEach(g=>{
    $("all-"+g).addEventListener("click", ()=>{
      syncDay();
      const vis = boxes().filter(b => b.dataset.g===g && !b.closest("li").hidden && !b.disabled);
      const val = !vis.every(b => b.checked);
      vis.forEach(b => { if(b.id==="pm-az") setAd(today, val); else state[b.id] = val; });
      save(today, state);if(val&&!getStart())save("start",today);render();
    });
  });
  document.addEventListener("click", e=>{
    const w = e.target.closest(".where");
    if(w){
      e.preventDefault(); e.stopPropagation();
      const li = w.closest("li"), more = li.querySelector(".more"), open = more.hidden;
      more.hidden = !open; w.setAttribute("aria-expanded", String(open));
      if(open) openIds.add(li.dataset.id); else openIds.delete(li.dataset.id);
      return;
    }
    const a = e.target.closest("[data-act]");
    if(a && a.closest("ol")){
      const li = a.closest("li"), id = li.dataset.id, e2 = eff(id), o = ov(id), act = a.dataset.act;
      if(act==="new"){ o.opened = today; saveCfg(); buildLists(); render(); buildEditor(); }
      else if(act==="out"){
        if(e2.next){ o.prod = e2.next; o.next = ""; o.opened = today; saveCfg(); buildLists(); render(); buildEditor(); }
        else { asking.add(id); const pa = li.querySelector(".pask"); pa.hidden = false; pa.querySelector("input").focus(); }
      } else if(act==="set"){
        const v = li.querySelector(".pask input").value.trim();
        if(v){ o.prod = v; o.next = ""; o.opened = today; saveCfg(); }
        asking.delete(id); buildLists(); render(); buildEditor();
      }
    }
  });
  document.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.closest && e.target.closest(".pask")){ e.preventDefault(); e.target.closest(".pask").querySelector("[data-act=set]").click(); } });

  $("cal-prev").addEventListener("click",()=>{ calOffset--; render(); });
  $("cal-next").addEventListener("click",()=>{ if(calOffset<1){ calOffset++; render(); } });
  $("cal-tabs").addEventListener("click", e=>{ const b = e.target.closest("[data-m]"); if(!b) return; calMode = b.dataset.m; ui("calMode", calMode); render(); });
  $("reset").addEventListener("click", async ()=>{
    if(!confirm("Снять все галочки за сегодня? Отметки других дней и записи дневника останутся.")) return;
    await Asya2.safety(); state = {}; save(today,state); render();
  });
  $("restart").addEventListener("click", async ()=>{
    if(!confirm("Начать курс азелаинкуа заново? Старые отметки и дневник сохранятся, но перестанут учитываться для начала курса.")) return;
    await Asya2.safety();
    try{ localStorage.removeItem(PREFIX+"start"); }catch(e){}
    render();
  });
  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState==="visible"){ syncDay(); render(); if(Object.keys(timers).length) wakeOn(); }
  });

  // ---------- таймеры: экран не гаснет, пока идут ----------
  const timers = {}; let tiv = null, wl = null;
  async function wakeOn(){ try{ if("wakeLock" in navigator && !wl){ wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", ()=>{ wl = null; }); } }catch(e){} }
  function wakeOff(){ try{ if(wl) wl.release(); }catch(e){} wl = null; }
  function updateTimers(){
    document.querySelectorAll(".timer").forEach(btn=>{
      const id = btn.dataset.for, end = timers[id];
      if(end && end !== "done"){ const left = Math.max(0, Math.round((end-Date.now())/1000)); btn.textContent = Math.floor(left/60)+":"+p2(left%60); btn.classList.add("running"); }
      else { btn.classList.remove("running"); btn.textContent = end==="done" ? "Готово" : "Таймер "+btn.dataset.min+" мин"; }
    });
  }
  function tick(){
    Object.keys(timers).forEach(id=>{
      const end = timers[id]; if(end==="done" || end > Date.now()) return;
      timers[id] = "done";
      setTimeout(()=>{ if(timers[id]==="done"){ delete timers[id]; updateTimers(); } }, 5000);
      syncDay();
      if(!state[id]){ state[id] = true; save(today, state); render(); }
      try{ navigator.vibrate && navigator.vibrate([300,150,300]); }catch(e){}
      try{ const c=new (window.AudioContext||window.webkitAudioContext)(), o=c.createOscillator(), g=c.createGain(); o.frequency.value=880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(.2,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+1); o.start(); o.stop(c.currentTime+1); }catch(e){}
    });
    const running = Object.values(timers).some(v => v !== "done");
    if(!running){ wakeOff(); if(!Object.keys(timers).length){ clearInterval(tiv); tiv = null; } }
    updateTimers();
  }
  document.addEventListener("click", e=>{
    const btn = e.target.closest(".timer"); if(!btn) return;
    const id = btn.dataset.for;
    if(timers[id] && timers[id] !== "done"){ delete timers[id]; }
    else { timers[id] = Date.now() + (+btn.dataset.min)*60000; wakeOn(); if(!tiv) tiv = setInterval(tick, 1000); }
    tick();
  });

  // ---------- настройка шагов ----------
  function buildEditor(){
    const box = $("ed"); box.innerHTML = "";
    ["am","pm"].forEach(g=>{
      const h = document.createElement("h4"); h.textContent = g==="am" ? "Утро" : "Вечер"; box.appendChild(h);
      const ul = document.createElement("ul");
      order(g).forEach((id, i, arr)=>{
        const e = eff(id), wait = e.kind==="wait", li = document.createElement("li");
        li.className = "ed-item"+(e.hidden?" off":""); li.dataset.id = id;
        const zsel = ZONES.map(([v,l])=>'<option value="'+v+'"'+((e.zone||"")===v?' selected':'')+'>'+l+'</option>').join('');
        li.innerHTML =
          '<div class="ed-row"><button type="button" class="mini" data-ed="up"'+(i?'':' disabled')+' aria-label="Выше">↑</button><button type="button" class="mini" data-ed="down"'+(i<arr.length-1?'':' disabled')+' aria-label="Ниже">↓</button>'
          +'<button type="button" class="ed-name" data-ed="open">'+esc(e.name)+'</button>'
          +'<label class="fchk"><input type="checkbox" data-f="show"'+(e.hidden?'':' checked')+'>видно</label></div>'
          +'<div class="ed-form"'+(edOpen.has(id)?'':' hidden')+'>'
          +'<label class="fld">Название<input data-f="name" value="'+esc(e.name)+'"></label>'
          +(wait ? '<label class="fld">Таймер, минут<input type="number" min="1" max="60" data-f="min" value="'+esc(e.min||5)+'"></label>' :
            '<label class="fld">Средство<input data-f="prod" value="'+esc(e.prod||"")+'"'+(id==="am-spf"?' placeholder="укажи своё средство"':'')+'></label>'
            +'<label class="fld">Когда закончится, перейду на<input data-f="next" value="'+esc(e.next||"")+'"></label>'
            +'<div class="fld2"><label class="fld">Дата вскрытия<input type="date" data-f="opened" value="'+esc(e.opened||"")+'"></label>'
            +'<label class="fld">Годно после вскрытия, мес<input type="number" min="1" max="60" data-f="pao" value="'+esc(e.pao||"")+'" placeholder="на банке: 6M, 12M"></label></div>')
          +'<label class="fld">Подсказки (каждая с новой строки)<textarea rows="3" data-f="notes">'+esc(e.notes.join("\n"))+'</textarea></label>'
          +(wait ? '' : '<label class="fld">Схема на лице<select data-f="zone">'+zsel+'</select></label>'
            +'<label class="fchk"><input type="checkbox" data-f="opt"'+(e.opt?' checked':'')+'>необязательный шаг</label>')
          +'<div class="btns">'+(e.custom ? '<button type="button" class="mini danger" data-ed="del">Удалить шаг</button>'
            : '<button type="button" class="mini" data-ed="reset">Вернуть как было</button>')+'</div>'
          +'</div>';
        ul.appendChild(li);
      });
      box.appendChild(ul);
      const add = document.createElement("button"); add.type = "button"; add.className = "mini acc"; add.dataset.ed = "add"; add.dataset.g = g;
      add.textContent = "+ Добавить шаг: "+(g==="am"?"утро":"вечер"); box.appendChild(add);
    });
  }
  function setField(id, f, v){
    const o = ov(id);
    if(f==="show"){ o.hidden = !v; }
    else if(f==="pao" || f==="min"){ const x = parseInt(v,10); if(x>0) o[f] = x; else delete o[f]; }
    else o[f] = v;
    saveCfg();
  }
  const edBox = $("ed");
  edBox.addEventListener("input", e=>{
    const f = e.target.dataset.f; if(!f) return;
    const li = e.target.closest(".ed-item"), id = li.dataset.id;
    setField(id, f, e.target.type==="checkbox" ? e.target.checked : e.target.value);
    if(f==="name") li.querySelector(".ed-name").textContent = e.target.value;
    if(f==="show") li.classList.toggle("off", !e.target.checked);
    buildLists(); render();
  });
  edBox.addEventListener("click", e=>{
    const b = e.target.closest("[data-ed]"); if(!b) return;
    const act = b.dataset.ed, li = b.closest(".ed-item"), id = li && li.dataset.id;
    if(act==="open"){ const f = li.querySelector(".ed-form"); f.hidden = !f.hidden; if(f.hidden) edOpen.delete(id); else edOpen.add(id); return; }
    if(act==="up" || act==="down"){
      const g = raw(id).g, o = order(g), i = o.indexOf(id), j = act==="up" ? i-1 : i+1;
      if(j<0 || j>=o.length) return;
      [o[i],o[j]] = [o[j],o[i]]; cfg.order[g] = o;
    } else if(act==="reset"){ delete cfg.steps[id]; }
    else if(act==="del"){
      if(!b.dataset.armed){ b.dataset.armed = "1"; b.textContent = "Точно удалить?"; setTimeout(()=>{ if(b.isConnected){ delete b.dataset.armed; b.textContent = "Удалить шаг"; } }, 4000); return; }
      cfg.custom = cfg.custom.filter(s => s.id!==id);
    } else if(act==="add"){
      const g = b.dataset.g, nid = "c"+Date.now().toString(36);
      cfg.custom.push({id:nid, g, name:"Новый шаг", prod:"", notes:""});
      cfg.order[g] = order(g); edOpen.add(nid);
      saveCfg(); buildEditor(); buildLists(); render();
      const inp = edBox.querySelector('.ed-item[data-id="'+nid+'"] [data-f=name]'); if(inp){ inp.focus(); inp.select(); }
      return;
    }
    saveCfg(); buildEditor(); buildLists(); render();
  });

  // ---------- резервная копия ----------
  (function(){
    const st = $("bk-status");
    function stamp(){ try{ const d=localStorage.getItem(PREFIX+"lastBackup"); if(d) st.textContent="Последняя копия: "+new Date(d).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})+". Скачивай новую раз в неделю."; }catch(e){} }
    function collect(){ const data={};
      try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith(PREFIX) && k!==PREFIX+"lastBackup") data[k]=localStorage.getItem(k); } }catch(e){}
      return data; }
    try{ if(window.YDS) YDS.init({app:"asya-uhod",title:"Уход Аси",cid:"02760b58a041462481b0b3fd09c33d7b",redir:"https://sofaleya.github.io/asya-uhod/",prefix:PREFIX,exclude:[PREFIX+"lastBackup"],accent:"#BFC2D5",accentText:"#fff"}); }catch(e){}
    try{ if(window.TGBK) TGBK.init({app:"asya-uhod",title:"Уход Аси",accent:"var(--accent)",accentText:"var(--bg)",
      file:d=>"uhod-asya-"+d+".json",
      data:async()=>{ const data=collect(); return Object.keys(data).length? JSON.stringify({app:"asya-uhod",v:2,data,photos:await Asya2.photosExport()},null,1) : ""; }}); }catch(e){}
    $("bk-save").addEventListener("click",()=>Asya2.exportBackup());
    $("bk-file").addEventListener("change",async e=>{
      const f=e.target.files[0]; if(!f)return;
      try { await Asya2.importBackup(JSON.parse(await f.text())); }
      catch(err){ st.textContent="Ошибка восстановления: "+err.message; }
      e.target.value="";
    });
    stamp();
  })();

  buildLists(); buildEditor(); render();
  Asya2.init({DEF,eff,order,get cfg(){return cfg},get state(){return state},get today(){return today},get sel(){return sel},select(k){sel=k;calOffset=(new Date(k+"T12:00:00").getFullYear()-new Date().getFullYear())*12+new Date(k+"T12:00:00").getMonth()-new Date().getMonth();render();},saveCfg,buildLists,buildEditor,render,reload(){cfg=loadCfg();state=load(today);buildLists();buildEditor();render()},clearMigrationError(){migrationError="";window.__asyaMigrationError=""},get migrationError(){return migrationError}});
})();

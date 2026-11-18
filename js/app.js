(function () {
  'use strict';

  var D = window.DND_DATA;
  var STORAGE_KEY = 'dnd-player-screen-v1';
  var AB_KEYS = D.ABILITIES.map(function (a) { return a.key; });

  // ---------------- UTILITÀ ----------------

  function $(id) { return document.getElementById(id); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function toInt(v, fallback) { var n = parseInt(v, 10); return isNaN(n) ? fallback : n; }
  function signed(n) { return (n >= 0 ? '+' : '') + n; }
  function mod(score) { return Math.floor((score - 10) / 2); }
  function d(sides) { return 1 + Math.floor(Math.random() * sides); }

  function raceByKey(k) { return D.RACES.filter(function (r) { return r.key === k; })[0] || D.RACES[0]; }
  function classByKey(k) { return D.CLASSES.filter(function (c) { return c.key === k; })[0] || D.CLASSES[0]; }
  function abilityLabel(k) { return D.ABILITIES.filter(function (a) { return a.key === k; })[0].label; }

  // ---------------- STATO ----------------

  function newCharacter() {
    var base = {}, extra = {};
    AB_KEYS.forEach(function (k) { base[k] = 10; extra[k] = 0; });
    return {
      id: uid(), name: '', player: '', race: 'umano', cls: 'guerriero', level: 1,
      method: 'manual', base: base, extra: extra, flex: [],
      skills: {},            // nome abilità -> 1 competenza, 2 maestria
      acOverride: null, hpMaxOverride: null, speedOverride: null,
      hpCur: null, hpTemp: 0, initMisc: 0, lastInit: null
    };
  }

  var defaultState = { activeId: null, characters: [], combat: { round: 1, currentId: null, list: [] } };

  function loadState() {
    var s;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { s = null; }
    s = Object.assign(JSON.parse(JSON.stringify(defaultState)), s || {});
    s.combat = Object.assign({ round: 1, currentId: null, list: [] }, s.combat || {});
    s.characters = (s.characters || []).map(normalizeCharacter);
    if (!s.characters.length) s.characters.push(newCharacter());
    if (!s.characters.some(function (c) { return c.id === s.activeId; })) s.activeId = s.characters[0].id;
    return s;
  }

  function normalizeCharacter(c) {
    var n = Object.assign(newCharacter(), c || {});
    n.base = Object.assign(newCharacter().base, n.base || {});
    n.extra = Object.assign(newCharacter().extra, n.extra || {});
    n.flex = Array.isArray(n.flex) ? n.flex : [];
    n.skills = n.skills || {};
    if (!n.id) n.id = uid();
    return n;
  }

  var state = loadState();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage non disponibile */ }
  }

  function pc() { return state.characters.filter(function (c) { return c.id === state.activeId; })[0]; }

  // ---------------- CALCOLI DERIVATI ----------------

  function racialBonus(c) {
    var race = raceByKey(c.race);
    var b = {};
    AB_KEYS.forEach(function (k) { b[k] = race.bonus[k] || 0; });
    if (race.flex) {
      c.flex.slice(0, race.flex).forEach(function (k) { if (k && b.hasOwnProperty(k)) b[k] += 1; });
    }
    return b;
  }

  function scores(c) {
    var rb = racialBonus(c), out = {};
    AB_KEYS.forEach(function (k) { out[k] = toInt(c.base[k], 10) + rb[k] + toInt(c.extra[k], 0); });
    return out;
  }

  function profBonus(c) { return 2 + Math.floor((clamp(toInt(c.level, 1), 1, 20) - 1) / 4); }

  function skillProf(c, name) {
    var race = raceByKey(c.race);
    var own = c.skills[name] || 0;
    if (own === 0 && race.skills && race.skills.indexOf(name) !== -1) return 1;
    return own;
  }

  function skillBonus(c, s, sc, pb) {
    return mod(sc[s.ab]) + skillProf(c, s.name) * pb;
  }

  function computeAc(c, sc) {
    if (c.acOverride !== null && c.acOverride !== '') return toInt(c.acOverride, 10);
    var ac = classByKey(c.cls).ac;
    var dex = mod(sc.DES);
    if (ac.type === 'unarmored') return 10 + dex + mod(sc[ac.ability]);
    var dexPart = ac.dexMax === undefined ? dex : Math.min(dex, ac.dexMax);
    return ac.base + dexPart + (ac.shield ? 2 : 0);
  }

  function computeHpMax(c, sc) {
    if (c.hpMaxOverride !== null && c.hpMaxOverride !== '') return toInt(c.hpMaxOverride, 1);
    var cls = classByKey(c.cls), race = raceByKey(c.race);
    var lvl = clamp(toInt(c.level, 1), 1, 20);
    var con = mod(sc.COS);
    var hp = Math.max(1, cls.hd + con);
    for (var i = 2; i <= lvl; i++) hp += Math.max(1, Math.floor(cls.hd / 2) + 1 + con);
    hp += (race.hpPerLevel || 0) * lvl;
    return hp;
  }

  function computeSpeed(c) {
    if (c.speedOverride !== null && c.speedOverride !== '') return parseFloat(c.speedOverride);
    return raceByKey(c.race).speed;
  }

  function initBonus(c, sc) { return mod(sc.DES) + toInt(c.initMisc, 0); }

  function derived(c) {
    var sc = scores(c);
    var pb = profBonus(c);
    var hpMax = computeHpMax(c, sc);
    var hpCur = c.hpCur === null ? hpMax : c.hpCur;
    var percep = D.SKILLS.filter(function (s) { return s.name === 'Percezione'; })[0];
    var cls = classByKey(c.cls);
    return {
      scores: sc, pb: pb, ac: computeAc(c, sc), hpMax: hpMax, hpCur: hpCur,
      speed: computeSpeed(c), init: initBonus(c, sc),
      passive: 10 + skillBonus(c, percep, sc, pb),
      spellDc: cls.spell ? 8 + pb + mod(sc[cls.spell]) : null,
      spellAtk: cls.spell ? pb + mod(sc[cls.spell]) : null
    };
  }

  // ---------------- TEMPLATE ----------------

  function buildTemplate(c) {
    var race = raceByKey(c.race), cls = classByKey(c.cls);
    var base = {};
    cls.priority.forEach(function (k, i) { base[k] = D.STANDARD_ARRAY[i]; });

    // +1 liberi: alle caratteristiche più importanti per la classe che non hanno già un bonus razziale
    var flex = [];
    if (race.flex) {
      cls.priority.forEach(function (k) {
        if (flex.length < race.flex && !race.bonus[k]) flex.push(k);
      });
    }

    // abilità: quelle consigliate, saltando quelle già concesse dalla razza
    var raceSkills = race.skills || [];
    var pool = cls.skillList === 'all' ? D.SKILLS.map(function (s) { return s.name; }) : cls.skillList;
    var picks = [];
    cls.suggested.concat(pool).forEach(function (n) {
      if (picks.length < cls.skillCount && pool.indexOf(n) !== -1 && raceSkills.indexOf(n) === -1 && picks.indexOf(n) === -1) picks.push(n);
    });
    // abilità a scelta della razza (Mezzelfo, Umano variante): le prossime consigliate o Percezione
    var extraPicks = [];
    if (race.skillChoices) {
      cls.suggested.concat(['Percezione', 'Intuizione', 'Persuasione', 'Atletica', 'Furtività']).forEach(function (n) {
        if (extraPicks.length < race.skillChoices && picks.indexOf(n) === -1 && raceSkills.indexOf(n) === -1 && extraPicks.indexOf(n) === -1) extraPicks.push(n);
      });
    }
    return { base: base, flex: flex, skills: picks, raceSkills: extraPicks };
  }

  function applyTemplate() {
    var c = pc();
    var t = buildTemplate(c);
    if (!confirm('Caricare il template ' + raceByKey(c.race).label + ' ' + classByKey(c.cls).label +
      '? I punteggi base, i bonus liberi e le competenze nelle abilità verranno sovrascritti.')) return;
    c.base = t.base;
    c.flex = t.flex;
    c.method = 'standard';
    c.skills = {};
    t.skills.concat(t.raceSkills).forEach(function (n) { c.skills[n] = 1; });
    c.acOverride = null;
    c.hpMaxOverride = null;
    c.speedOverride = null;
    c.hpCur = null;
    c.hpTemp = 0;
    save();
    renderAll();
    toast('Template caricato', 'Punteggi, competenze, CA e PF aggiornati.');
  }

  function renderTemplatePreview() {
    var c = pc(), race = raceByKey(c.race), cls = classByKey(c.cls);
    var t = buildTemplate(c);
    var wrap = $('templatePreview');
    wrap.innerHTML = '';

    var bonusTxt = AB_KEYS.filter(function (k) { return race.bonus[k]; })
      .map(function (k) { return k + ' ' + signed(race.bonus[k]); });
    if (race.flex) bonusTxt.push('+1 a ' + race.flex + ' a scelta');

    wrap.appendChild(el('div', { class: 'tp-card' }, [
      el('h4', { text: race.label }),
      el('p', {}, [el('strong', { text: 'Bonus: ' }), bonusTxt.join(', ')]),
      el('p', {}, [el('strong', { text: 'Velocità: ' }), race.speed + ' m']),
      el('ul', {}, race.traits.map(function (tr) { return el('li', { text: tr }); }))
    ]));

    wrap.appendChild(el('div', { class: 'tp-card' }, [
      el('h4', { text: cls.label }),
      el('p', {}, [el('strong', { text: 'Dado vita: ' }), 'd' + cls.hd]),
      el('p', {}, [el('strong', { text: 'Tiri salvezza: ' }), cls.saves.map(abilityLabel).join(', ')]),
      el('p', {}, [el('strong', { text: 'Priorità: ' }), cls.priority.join(' › ')]),
      el('p', {}, [el('strong', { text: 'CA iniziale: ' }), cls.ac.desc]),
      cls.spell ? el('p', {}, [el('strong', { text: 'Caratteristica da incantatore: ' }), abilityLabel(cls.spell)]) : null,
      el('ul', {}, cls.features.map(function (f) { return el('li', { text: f }); }))
    ]));

    var scoreTxt = cls.priority.map(function (k) {
      var total = t.base[k] + (race.bonus[k] || 0) + (t.flex.indexOf(k) !== -1 ? 1 : 0);
      return k + ' ' + total;
    }).join(' · ');
    wrap.appendChild(el('div', { class: 'tp-card tp-result' }, [
      el('h4', { text: 'Risultato del template' }),
      el('p', {}, [el('strong', { text: 'Punteggi finali: ' }), scoreTxt]),
      t.flex.length ? el('p', {}, [el('strong', { text: '+1 liberi: ' }), t.flex.join(', ')]) : null,
      el('p', {}, [el('strong', { text: 'Abilità: ' }),
        t.skills.concat(t.raceSkills).concat(race.skills || []).join(', ')])
    ]));
  }

  // ---------------- RENDER: PERSONAGGIO ----------------

  function fillSelects() {
    var raceSel = $('pgRace');
    var groups = {};
    D.RACES.forEach(function (r) {
      if (!groups[r.group]) {
        groups[r.group] = el('optgroup', { label: r.group });
        raceSel.appendChild(groups[r.group]);
      }
      groups[r.group].appendChild(el('option', { value: r.key, text: r.label }));
    });
    D.CLASSES.forEach(function (c) { $('pgClass').appendChild(el('option', { value: c.key, text: c.label })); });
  }

  function renderSwitcher() {
    var sel = $('pgSelect');
    sel.innerHTML = '';
    state.characters.forEach(function (c) {
      var label = (c.name || 'PG senza nome') + ' — ' + raceByKey(c.race).label + ' ' + classByKey(c.cls).label + ' ' + c.level;
      sel.appendChild(el('option', { value: c.id, text: label, selected: c.id === state.activeId }));
    });
    $('pgDelete').disabled = state.characters.length <= 1;
  }

  function renderIdentity() {
    var c = pc();
    $('pgName').value = c.name;
    $('pgPlayer').value = c.player;
    $('pgRace').value = c.race;
    $('pgClass').value = c.cls;
    $('pgLevel').value = c.level;
  }

  function bindIdentity() {
    $('pgSelect').addEventListener('change', function (e) { state.activeId = e.target.value; save(); renderAll(); });
    $('pgNew').addEventListener('click', function () {
      var c = newCharacter();
      state.characters.push(c);
      state.activeId = c.id;
      save(); renderAll();
      $('pgName').focus();
    });
    $('pgDuplicate').addEventListener('click', function () {
      var c = normalizeCharacter(JSON.parse(JSON.stringify(pc())));
      c.id = uid();
      c.name = (c.name || 'PG') + ' (copia)';
      state.characters.push(c);
      state.activeId = c.id;
      save(); renderAll();
    });
    $('pgDelete').addEventListener('click', function () {
      if (state.characters.length <= 1) return;
      var c = pc();
      if (!confirm('Eliminare ' + (c.name || 'questo PG') + '?')) return;
      state.characters = state.characters.filter(function (x) { return x.id !== c.id; });
      state.combat.list = state.combat.list.filter(function (x) { return x.pcId !== c.id; });
      state.activeId = state.characters[0].id;
      save(); renderAll();
    });

    function bind(id, key, transform) {
      $(id).addEventListener('change', function (e) {
        var c = pc();
        c[key] = transform ? transform(e.target.value) : e.target.value;
        if (key === 'race') c.flex = [];
        save(); renderAll();
      });
    }
    bind('pgName', 'name', function (v) { return v.trim(); });
    bind('pgPlayer', 'player', function (v) { return v.trim(); });
    bind('pgRace', 'race');
    bind('pgClass', 'cls');
    bind('pgLevel', 'level', function (v) { return clamp(toInt(v, 1), 1, 20); });
    $('applyTemplate').addEventListener('click', applyTemplate);
  }

  // ---------------- RENDER: CARATTERISTICHE ----------------

  function renderMethodStatus() {
    var c = pc();
    var status = $('methodStatus');
    status.className = 'method-status';
    var vals = AB_KEYS.map(function (k) { return toInt(c.base[k], 10); });
    if (c.method === 'pointbuy') {
      var spent = 0, invalid = false;
      vals.forEach(function (v) {
        if (D.POINT_BUY_COST[v] === undefined) invalid = true; else spent += D.POINT_BUY_COST[v];
      });
      if (invalid) { status.textContent = 'Valori ammessi: da 8 a 15'; status.className += ' bad'; }
      else {
        var left = D.POINT_BUY_BUDGET - spent;
        status.textContent = 'Punti spesi ' + spent + '/' + D.POINT_BUY_BUDGET + (left ? ' (restano ' + left + ')' : '');
        if (left < 0) status.className += ' bad'; else if (left === 0) status.className += ' ok';
      }
    } else if (c.method === 'standard') {
      var ok = vals.slice().sort(function (a, b) { return b - a; }).join(',') === D.STANDARD_ARRAY.join(',');
      status.textContent = ok ? 'Serie standard valida ✓' : 'Usa una volta ciascuno: ' + D.STANDARD_ARRAY.join(', ');
      status.className += ok ? ' ok' : ' bad';
    } else {
      status.textContent = '';
    }
    $('rollAbilities').hidden = c.method !== 'roll';
  }

  function renderFlex() {
    var c = pc(), race = raceByKey(c.race);
    var wrap = $('flexBonus');
    wrap.innerHTML = '';
    if (!race.flex) return;
    wrap.appendChild(el('span', { text: race.label + ': +1 a ' + race.flex + ' caratteristiche diverse' }));
    for (var i = 0; i < race.flex; i++) {
      (function (idx) {
        var sel = el('select', {
          onchange: function (e) { c.flex[idx] = e.target.value; save(); renderAll(); }
        }, [el('option', { value: '', text: '— scegli —' })]);
        AB_KEYS.forEach(function (k) {
          if (race.bonus[k]) return;
          var takenElsewhere = c.flex.some(function (f, j) { return j !== idx && f === k; });
          sel.appendChild(el('option', { value: k, text: abilityLabel(k), selected: c.flex[idx] === k, disabled: takenElsewhere }));
        });
        wrap.appendChild(sel);
      })(i);
    }
  }

  function renderAbilities() {
    var c = pc(), dv = derived(c), rb = racialBonus(c);
    var grid = $('abilityGrid');
    grid.innerHTML = '';
    $('abMethod').value = c.method;
    D.ABILITIES.forEach(function (a) {
      var total = dv.scores[a.key];
      var m = mod(total);
      var baseInput = el('input', { type: 'number', min: 1, max: 30, value: c.base[a.key] });
      baseInput.addEventListener('change', function () { c.base[a.key] = clamp(toInt(baseInput.value, 10), 1, 30); save(); renderAll(); });
      var extraInput = el('input', { type: 'number', min: -10, max: 10, value: c.extra[a.key] });
      extraInput.addEventListener('change', function () { c.extra[a.key] = toInt(extraInput.value, 0); save(); renderAll(); });

      grid.appendChild(el('div', { class: 'ability-card' }, [
        el('div', { class: 'ab-name', text: a.label }),
        el('button', { type: 'button', class: 'ab-mod', title: 'Tira una prova di ' + a.label,
          onclick: function () { rollCheck('Prova di ' + a.label, m); } }, [signed(m)]),
        el('div', { class: 'ab-total', text: String(total) }),
        el('div', { class: 'ab-parts' }, [
          el('label', {}, ['Base', baseInput]),
          el('span', { class: 'ab-race', title: 'Bonus razziale' }, ['Razza', el('b', { text: signed(rb[a.key]) })]),
          el('label', {}, ['Altro', extraInput])
        ])
      ]));
    });
    renderMethodStatus();
    renderFlex();
  }

  function rollAbilityScores() {
    var c = pc();
    var rolls = [];
    for (var i = 0; i < 6; i++) {
      var dice = [d(6), d(6), d(6), d(6)].sort(function (a, b) { return b - a; });
      rolls.push({ dice: dice, total: dice[0] + dice[1] + dice[2] });
    }
    var sorted = rolls.slice().sort(function (a, b) { return b.total - a.total; });
    classByKey(c.cls).priority.forEach(function (k, idx) { c.base[k] = sorted[idx].total; });
    save(); renderAll();
    toast('4d6 × 6', sorted.map(function (r) { return r.total + ' [' + r.dice.join(',') + ']'; }).join(' · ') +
      ' — assegnati secondo le priorità di ' + classByKey(c.cls).label);
  }

  // ---------------- RENDER: STATISTICHE ----------------

  function statBox(label, value, opts) {
    opts = opts || {};
    var children = [el('div', { class: 'stat-label', text: label })];
    if (opts.editable) {
      var input = el('input', { type: 'number', step: opts.step || 1, value: value, title: 'Valore calcolato: lascia vuoto per ripristinare' });
      input.addEventListener('change', function () { opts.onChange(input.value === '' ? null : input.value); });
      children.push(input);
      children.push(el('div', { class: 'stat-note', text: opts.isOverride ? 'manuale (svuota per ricalcolare)' : 'calcolato' }));
    } else {
      children.push(el('div', { class: 'stat-value', text: String(value) }));
      if (opts.note) children.push(el('div', { class: 'stat-note', text: opts.note }));
    }
    return el('div', { class: 'stat-box' + (opts.isOverride ? ' is-override' : '') }, children);
  }

  function renderStats() {
    var c = pc(), dv = derived(c), cls = classByKey(c.cls);
    var grid = $('statsGrid');
    grid.innerHTML = '';
    grid.appendChild(statBox('Classe Armatura', dv.ac, {
      editable: true, isOverride: c.acOverride !== null,
      onChange: function (v) { c.acOverride = v; save(); renderAll(); }
    }));
    grid.appendChild(statBox('PF massimi', dv.hpMax, {
      editable: true, isOverride: c.hpMaxOverride !== null,
      onChange: function (v) {
        c.hpMaxOverride = v;
        if (c.hpCur !== null) c.hpCur = Math.min(c.hpCur, derived(c).hpMax);
        save(); renderAll();
      }
    }));
    grid.appendChild(statBox('Velocità (m)', dv.speed, {
      editable: true, step: 1.5, isOverride: c.speedOverride !== null,
      onChange: function (v) { c.speedOverride = v; save(); renderAll(); }
    }));
    grid.appendChild(statBox('Iniziativa', signed(dv.init), { note: 'DES' + (toInt(c.initMisc, 0) ? ' + extra' : '') }));
    grid.appendChild(statBox('Bonus competenza', signed(dv.pb), { note: 'livello ' + c.level }));
    grid.appendChild(statBox('Percezione passiva', dv.passive));
    grid.appendChild(statBox('Dado vita', c.level + 'd' + cls.hd));
    if (cls.spell) {
      grid.appendChild(statBox('CD incantesimi', dv.spellDc, { note: abilityLabel(cls.spell) }));
      grid.appendChild(statBox('Attacco incantesimi', signed(dv.spellAtk)));
    }
    renderHp();
  }

  function renderHp() {
    var c = pc(), dv = derived(c);
    var wrap = $('hpTrack');
    wrap.innerHTML = '';
    var pct = dv.hpMax ? clamp(dv.hpCur / dv.hpMax, 0, 1) : 0;
    var cls = pct <= 0 ? 'down' : pct <= 0.25 ? 'crit' : pct <= 0.5 ? 'half' : 'ok';
    wrap.appendChild(el('div', { class: 'hp-numbers' }, [
      el('span', { class: 'hp-cur', text: String(dv.hpCur) }),
      el('span', { text: ' / ' + dv.hpMax }),
      c.hpTemp ? el('span', { class: 'hp-temp', text: ' +' + c.hpTemp + ' temp.' }) : null,
      dv.hpCur <= 0 ? el('span', { class: 'hp-down', text: ' — A terra: tiri salvezza contro la morte!' }) : null
    ]));
    wrap.appendChild(el('div', { class: 'hp-bar' }, [el('div', { class: 'hp-fill ' + cls, style: 'width:' + (pct * 100) + '%' })]));
  }

  function bindHp() {
    var lastAction = 'damage';
    $('hpForm').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { lastAction = b.getAttribute('data-action'); });
    });
    $('hpForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var action = (e.submitter && e.submitter.getAttribute('data-action')) || lastAction;
      var amount = Math.max(0, toInt($('hpAmount').value, 0));
      var c = pc(), dv = derived(c);
      var cur = dv.hpCur;
      if (action === 'damage') {
        var absorbed = Math.min(c.hpTemp || 0, amount);
        c.hpTemp = (c.hpTemp || 0) - absorbed;
        cur = Math.max(0, cur - (amount - absorbed));
      } else if (action === 'heal') {
        cur = Math.min(dv.hpMax, Math.max(0, cur) + amount);
      } else {
        c.hpTemp = Math.max(c.hpTemp || 0, amount); // i PF temporanei non si sommano
      }
      c.hpCur = cur;
      $('hpAmount').value = '';
      save(); renderAll();
    });
  }

  // ---------------- RENDER: TS & ABILITÀ ----------------

  function profDot(level, onClick, locked) {
    var labels = ['Nessuna competenza', 'Competenza', 'Maestria'];
    return el('button', {
      type: 'button', class: 'prof-dot lvl-' + level + (locked ? ' locked' : ''),
      title: locked ? 'Competenza concessa da classe o razza' : labels[level],
      'aria-label': labels[level], onclick: locked ? null : onClick, disabled: locked
    });
  }

  function renderSkills() {
    var c = pc(), dv = derived(c), cls = classByKey(c.cls), race = raceByKey(c.race);
    var saveList = $('saveList');
    saveList.innerHTML = '';
    D.ABILITIES.forEach(function (a) {
      var prof = cls.saves.indexOf(a.key) !== -1;
      var b = mod(dv.scores[a.key]) + (prof ? dv.pb : 0);
      saveList.appendChild(el('li', { class: prof ? 'is-prof' : '' }, [
        profDot(prof ? 1 : 0, null, true),
        el('span', { class: 'cl-name', text: a.label }),
        el('button', { type: 'button', class: 'cl-bonus', onclick: function () { rollCheck('TS ' + a.label, b); } }, [signed(b)])
      ]));
    });

    var skillList = $('skillList');
    skillList.innerHTML = '';
    var classPool = cls.skillList === 'all' ? null : cls.skillList;
    var chosen = 0;
    D.SKILLS.forEach(function (s) {
      var fromRace = race.skills && race.skills.indexOf(s.name) !== -1;
      var lvl = skillProf(c, s.name);
      if (!fromRace && (c.skills[s.name] || 0) > 0) chosen++;
      var b = skillBonus(c, s, dv.scores, dv.pb);
      var inClass = !classPool || classPool.indexOf(s.name) !== -1;
      skillList.appendChild(el('li', { class: (lvl ? 'is-prof ' : '') + (inClass ? 'in-class' : '') }, [
        profDot(lvl, function () {
          // la competenza razziale resta sempre: si può solo aggiungere o togliere la maestria
          var next = fromRace ? (c.skills[s.name] === 2 ? 0 : 2) : ((c.skills[s.name] || 0) + 1) % 3;
          if (next) c.skills[s.name] = next; else delete c.skills[s.name];
          save(); renderAll();
        }, false),
        el('span', { class: 'cl-name' }, [
          s.name + ' ', el('small', { text: '(' + s.ab + ')' }),
          fromRace ? el('small', { class: 'tag', text: 'razza' }) : null,
          inClass && classPool ? el('small', { class: 'tag tag-class', text: 'classe' }) : null
        ]),
        el('button', { type: 'button', class: 'cl-bonus', onclick: function () { rollCheck(s.name, b); } }, [signed(b)])
      ]));
    });
    var expected = cls.skillCount + (race.skillChoices || 0);
    $('skillCounter').textContent = '(' + chosen + '/' + expected + ' a scelta)';
  }

  // ---------------- TIRI DI DADO ----------------

  var toastTimer = null;
  function toast(title, body) {
    var t = $('rollToast');
    t.innerHTML = '';
    t.appendChild(el('strong', { text: title }));
    t.appendChild(el('div', { text: body }));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 5000);
  }

  function rollD20(mode) {
    var a = d(20), b = d(20);
    if (mode === 'adv') return { value: Math.max(a, b), dice: [a, b] };
    if (mode === 'dis') return { value: Math.min(a, b), dice: [a, b] };
    return { value: a, dice: [a] };
  }

  function rollCheck(label, bonus) {
    var r = rollD20('normal');
    var crit = r.value === 20 ? ' — 20 naturale!' : r.value === 1 ? ' — 1 naturale…' : '';
    toast(label + ': ' + (r.value + bonus), 'd20 (' + r.value + ') ' + signed(bonus) + crit);
  }

  // ---------------- INIZIATIVA ----------------

  function sortedCombatants() {
    return state.combat.list.slice().sort(function (a, b) {
      if (b.init !== a.init) return b.init - a.init;
      if ((b.tie || 0) !== (a.tie || 0)) return (b.tie || 0) - (a.tie || 0);
      return a.name.localeCompare(b.name);
    });
  }

  function upsertPcInCombat(c, total) {
    var dv = derived(c);
    var existing = state.combat.list.filter(function (x) { return x.pcId === c.id; })[0];
    var name = c.name || 'PG senza nome';
    if (existing) {
      existing.init = total; existing.name = name; existing.tie = dv.scores.DES;
    } else {
      state.combat.list.push({ id: uid(), pcId: c.id, name: name, init: total, tie: dv.scores.DES, enemy: false });
    }
  }

  function setInitiative(total, detail) {
    var c = pc();
    c.lastInit = total;
    upsertPcInCombat(c, total);
    save();
    renderInitiative();
    renderShare();
    $('initResult').innerHTML = '';
    $('initResult').appendChild(el('div', {}, [
      el('span', { class: 'init-total', text: String(total) }),
      el('span', { class: 'init-detail', text: detail })
    ]));
  }

  function bindInitiative() {
    document.querySelectorAll('.roll-init').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        var c = pc(), bonus = derived(c).init;
        var r = rollD20(mode);
        var modeTxt = mode === 'adv' ? ' (vantaggio)' : mode === 'dis' ? ' (svantaggio)' : '';
        var detail = 'd20' + modeTxt + ': ' + r.dice.join(' / ') + ' → ' + r.value + ' ' + signed(bonus);
        setInitiative(r.value + bonus, detail);
        toast('Iniziativa di ' + (c.name || 'PG') + ': ' + (r.value + bonus), detail);
      });
    });
    $('manualInitForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = toInt($('manualInit').value, null);
      if (v === null) return;
      setInitiative(v, 'inserita a mano');
      $('manualInit').value = '';
    });
    $('initMisc').addEventListener('change', function (e) {
      pc().initMisc = toInt(e.target.value, 0);
      save(); renderAll();
    });

    $('addCombatantForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('combatantName').value.trim();
      var init = toInt($('combatantInit').value, null);
      if (!name || init === null) return;
      state.combat.list.push({ id: uid(), name: name, init: init, tie: 0, enemy: $('combatantEnemy').checked });
      e.target.reset();
      save(); renderInitiative();
      $('combatantName').focus();
    });
    $('addAllPcs').addEventListener('click', function () {
      state.characters.forEach(function (c) {
        if (state.combat.list.some(function (x) { return x.pcId === c.id; })) return;
        upsertPcInCombat(c, c.lastInit !== null ? c.lastInit : derived(c).init + 10);
      });
      save(); renderInitiative();
    });

    function step(dir) {
      var list = sortedCombatants();
      if (!list.length) return;
      var idx = list.map(function (x) { return x.id; }).indexOf(state.combat.currentId);
      if (idx === -1) {
        idx = dir > 0 ? 0 : list.length - 1;
      } else {
        idx += dir;
        if (idx >= list.length) { idx = 0; state.combat.round++; }
        if (idx < 0) {
          if (state.combat.round > 1) { idx = list.length - 1; state.combat.round--; } else idx = 0;
        }
      }
      state.combat.currentId = list[idx].id;
      save(); renderInitiative();
    }
    $('turnNext').addEventListener('click', function () { step(1); });
    $('turnPrev').addEventListener('click', function () { step(-1); });
    $('combatReset').addEventListener('click', function () {
      if (!confirm('Iniziare un nuovo combattimento? L\'ordine di turno verrà svuotato.')) return;
      state.combat = { round: 1, currentId: null, list: [] };
      state.characters.forEach(function (c) { c.lastInit = null; });
      $('initResult').innerHTML = '';
      save(); renderAll();
    });
  }

  function renderInitiative() {
    var c = pc(), dv = derived(c);
    $('initPcName').textContent = c.name || 'PG senza nome';
    $('initBonusValue').textContent = signed(dv.init);
    $('initMisc').value = c.initMisc || 0;
    $('roundValue').textContent = state.combat.round;

    var list = sortedCombatants();
    var ol = $('initList');
    ol.innerHTML = '';
    if (!list.length) {
      ol.appendChild(el('li', { class: 'empty', text: 'Nessun combattente. Tira l\'iniziativa o aggiungi gli altri partecipanti.' }));
    }
    list.forEach(function (x) {
      var isCurrent = x.id === state.combat.currentId;
      var initInput = el('input', { type: 'number', value: x.init, 'aria-label': 'Iniziativa di ' + x.name });
      initInput.addEventListener('change', function () {
        x.init = toInt(initInput.value, x.init);
        if (x.pcId) {
          var owner = state.characters.filter(function (p) { return p.id === x.pcId; })[0];
          if (owner) owner.lastInit = x.init;
        }
        save(); renderInitiative(); renderShare();
      });
      ol.appendChild(el('li', { class: [isCurrent ? 'current' : '', x.pcId ? 'mine' : '', x.enemy ? 'enemy' : ''].join(' ') }, [
        initInput,
        el('span', { class: 'cb-name' }, [x.name, x.pcId ? el('small', { class: 'tag', text: 'mio PG' }) : null,
          x.enemy ? el('small', { class: 'tag tag-enemy', text: 'nemico' }) : null]),
        el('button', { type: 'button', class: 'btn-remove', title: 'Rimuovi', 'aria-label': 'Rimuovi ' + x.name,
          onclick: function () {
            state.combat.list = state.combat.list.filter(function (y) { return y.id !== x.id; });
            if (state.combat.currentId === x.id) state.combat.currentId = null;
            save(); renderInitiative();
          } }, ['×'])
      ]));
    });

    var banner = $('turnBanner');
    var current = list.filter(function (x) { return x.id === state.combat.currentId; })[0];
    if (current) {
      banner.hidden = false;
      banner.className = 'turn-banner' + (current.pcId ? ' my-turn' : '');
      banner.textContent = current.pcId ? 'Tocca a te, ' + current.name + '!' : 'Turno di ' + current.name;
      var idx = list.indexOf(current);
      var next = list[(idx + 1) % list.length];
      if (next && next !== current) banner.appendChild(el('small', { text: ' — poi: ' + next.name }));
    } else {
      banner.hidden = true;
    }
  }

  // ---------------- CONDIVIDI ----------------

  function shareText(c) {
    var dv = derived(c), race = raceByKey(c.race), cls = classByKey(c.cls);
    var lines = [];
    lines.push((c.name || 'PG senza nome') + (c.player ? ' (giocatore: ' + c.player + ')' : ''));
    lines.push('Razza: ' + race.label + ' · Classe: ' + cls.label + ' · Livello ' + c.level);
    lines.push('CA ' + dv.ac + ' · PF ' + dv.hpCur + '/' + dv.hpMax + (c.hpTemp ? ' (+' + c.hpTemp + ' temp.)' : '') +
      ' · Iniziativa ' + (c.lastInit !== null ? c.lastInit + ' (bonus ' + signed(dv.init) + ')' : signed(dv.init) + ' (non ancora tirata)'));
    lines.push(D.ABILITIES.map(function (a) { return a.key + ' ' + dv.scores[a.key] + ' (' + signed(mod(dv.scores[a.key])) + ')'; }).join(' · '));
    lines.push('Percezione passiva ' + dv.passive + ' · Velocità ' + dv.speed + ' m' +
      (dv.spellDc ? ' · CD incantesimi ' + dv.spellDc : ''));
    var profSkills = D.SKILLS.filter(function (s) { return skillProf(c, s.name); })
      .map(function (s) { return s.name + ' ' + signed(skillBonus(c, s, dv.scores, dv.pb)); });
    if (profSkills.length) lines.push('Abilità: ' + profSkills.join(', '));
    return lines.join('\n');
  }

  function renderShare() { $('shareText').value = shareText(pc()); }

  function bindShare() {
    $('copyShare').addEventListener('click', function () {
      var text = $('shareText').value;
      function fallback() {
        $('shareText').select();
        try { document.execCommand('copy'); toast('Copiato', 'Riepilogo copiato negli appunti.'); }
        catch (e) { toast('Copia non riuscita', 'Seleziona il testo e copialo a mano.'); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Copiato', 'Riepilogo copiato negli appunti.'); }, fallback);
      } else fallback();
    });

    $('exportPc').addEventListener('click', function () {
      var c = pc(), dv = derived(c);
      var payload = {
        type: 'dnd-player-character', version: 1,
        // riga pronta per la tabella Party dello Schermo del GM
        party: { name: c.name, race: raceByKey(c.race).label, className: classByKey(c.cls).label,
          ac: dv.ac, hpCur: dv.hpCur, hpMax: dv.hpMax, init: c.lastInit !== null ? c.lastInit : dv.init },
        character: c
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = el('a', { href: url, download: 'pg-' + ((c.name || 'personaggio').toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '.json' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    $('importPc').addEventListener('click', function () { $('importPcInput').click(); });
    $('importPcInput').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var data;
        try { data = JSON.parse(ev.target.result); } catch (err) { alert('File non valido: impossibile leggere il JSON.'); return; }
        var raw = data && data.character ? data.character : data;
        if (!raw || typeof raw !== 'object' || !raw.base) { alert('Il file non contiene un personaggio valido.'); return; }
        var c = normalizeCharacter(raw);
        c.id = uid();
        state.characters.push(c);
        state.activeId = c.id;
        save(); renderAll();
        toast('Importato', (c.name || 'PG') + ' aggiunto ai tuoi personaggi.');
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // ---------------- AVVIO ----------------

  function renderAll() {
    renderSwitcher();
    renderIdentity();
    renderTemplatePreview();
    renderAbilities();
    renderStats();
    renderSkills();
    renderInitiative();
    renderShare();
  }

  fillSelects();
  bindIdentity();
  $('abMethod').addEventListener('change', function (e) { pc().method = e.target.value; save(); renderAll(); });
  $('rollAbilities').addEventListener('click', rollAbilityScores);
  bindHp();
  bindInitiative();
  bindShare();
  renderAll();

  // Sincronizza tra più schede aperte sullo stesso dispositivo
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    state = loadState();
    renderAll();
  });
})();

const D = JSON.parse(document.getElementById('calcdata').textContent);
const IMG = JSON.parse(document.getElementById('imgdata').textContent);
const NAMES = JSON.parse(document.getElementById('namedata').textContent);
const ICONS = JSON.parse(document.getElementById('icondata').textContent);

/** real in-game name, falling back to the asset key */
function charName(key) {
  const n = NAMES.characters[key];
  return (n && (n.ru || n.en)) || key.replace(/_/g, ' ');
}
/** in-game name of a gear piece: newer heroes keep it in their text table, older ones in the item */
function pieceName(charKey, slot) {
  const n = NAMES.characters[charKey];
  const fromTable = n && n.gear && n.gear[slot];
  if (fromTable) return fromTable.ru || fromTable.en;
  const p = NAMES.pieces[`${charKey}_${slot}`];
  return p ? (p.ru || p.en) : null;
}

/* ------------------------------------------------------------------ model */
const SLOTS = ['Head', 'Torso', 'Arms', 'Legs', 'Equipment'];
const SLOT_RU = { Head: 'Голова', Torso: 'Торс', Arms: 'Руки', Legs: 'Ноги', Equipment: 'Снаряжение' };

const STAT_RU = {
  Attack: 'Атака', Health: 'Здоровье', Defense: 'Защита',
  CriticalHitChance: 'Шанс крит. атаки', CritDamage: 'Урон от крит. атаки',
  FastAttackChance: 'Шанс быстрой атаки', LethalAttackChance: 'Шанс смерт. атаки',
  ArmorPierceChance: 'Шанс пробить броню',
  CritResist: 'Стойкость к криту', StunResist: 'Стойкость к оглушению',
  Recovery: 'Восстановление', Other: 'Особый эффект',
  DOTResist: 'Стойкость к длит. урону', BlockMitigation: 'Блокирование',
  PowerGen: 'Выработка силы', PowerGeneration: 'Выработка силы', Healing: 'Лечение',
};
const STAT_ICON = {
  Attack: 'i-attack', Health: 'i-health', CritDamage: 'i-crit',
  CriticalHitChance: 'i-dice', LethalAttackChance: 'i-skull', FastAttackChance: 'i-bolt',
  ArmorPierceChance: 'i-pierce', Defense: 'i-shield', CritResist: 'i-shield',
  StunResist: 'i-shield', DOTResist: 'i-shield', BlockMitigation: 'i-shield',
  PowerGen: 'i-bolt', PowerGeneration: 'i-bolt', Healing: 'i-health',
};
// compact stat names for the gear cards, where the column is only ~150px wide
const STAT_SHORT = {
  Attack: 'Атака', Health: 'Здоровье', Defense: 'Защита',
  CriticalHitChance: 'Крит. шанс', CritDamage: 'Крит. урон',
  FastAttackChance: 'Быстрая атака', LethalAttackChance: 'Смерт. атака',
  ArmorPierceChance: 'Пробой брони',
  CritResist: 'Стойк. к криту', StunResist: 'Стойк. к оглуш.',
};

const CLASS_INDEX = ['Agility', 'Magic', 'MetaHuman', 'Might', 'Tech'];
const CLASS_RU = { Agility: 'Ловкость', Magic: 'Магия', MetaHuman: 'Мета', Might: 'Мощь', Tech: 'Технологии' };

const TIER_COLOR = {
  Silver: '#b9c8d6', Gold: '#f2b937', Legendary: '#b184ee',
  Platinum: '#7fd8ff', Diamond: '#6ff2e0', Unobtainium: '#ff7ad9', Boss: '#e8604a',
};

const FLAT = new Set(['Attack', 'Health']);

const CAPS = {
  CriticalHitChance: D.caps.CriticalHitChanceCap ?? 0.75,
  CritDamage: (D.caps.CritMultiplierCap ?? 3) - 1,
  LethalAttackChance: D.caps.LethalAttackChanceCap ?? 0.6,
  FastAttackChance: D.caps.FastAttackChanceCap ?? 0.75,
  Defense: 0.75,
};

// Talent values as the game hands them out.
const TALENTS = [
  { id: '', name: '— пусто —', stat: null, val: 0 },
  { id: 'crit12', name: 'Крит. шанс +12 %', stat: 'CriticalHitChance', val: 0.12 },
  { id: 'critdmg24', name: 'Крит. урон +24 %', stat: 'CritDamage', val: 0.24 },
  { id: 'lethal12', name: 'Смерт. атака +12 %', stat: 'LethalAttackChance', val: 0.12 },
  { id: 'fast12', name: 'Быстрая атака +12 %', stat: 'FastAttackChance', val: 0.12 },
  { id: 'def12', name: 'Защита +12 %', stat: 'Defense', val: 0.12 },
  { id: 'pierce24', name: 'Пробой брони 24 %', stat: 'ArmorPierceChance', val: 0.24 },
  { id: 'critres12', name: 'Стойк. к криту +12 %', stat: 'CritResist', val: 0.12 },
  { id: 'atk4', name: 'Атака +4 %', stat: 'Attack', val: 0.04, pct: true },
];
const TALENTS_LEG = [
  { id: '', name: '— пусто —', stat: null, val: 0 },
  { id: 'pierce50', name: 'Пробой брони 50 %', stat: 'ArmorPierceChance', val: 0.50 },
  { id: 'atk10', name: 'Атака +10 %', stat: 'Attack', val: 0.10, pct: true },
  { id: 'hp10', name: 'Здоровье +10 %', stat: 'Health', val: 0.10, pct: true },
  { id: 'def20', name: 'Защита +20 %', stat: 'Defense', val: 0.20 },
];

const state = {
  char: 'Supergirl_DCU',
  star: 7,
  level: 80,
  gearLevel: { Head: 80, Torso: 80, Arms: 80, Legs: 80, Equipment: 80 },
  mods: { Head: ['', '', '', ''], Torso: ['', '', '', ''], Arms: ['', '', '', ''],
          Legs: ['', '', '', ''], Equipment: ['', '', '', ''] },
  talents: ['', '', '', '', '', '', ''],
  legendary: '',
  artifact: '',
  artLevel: 10,
  artOn: {},
};

/** conditional effects ("against Might", "[Solo Raid only]", "below 30 % health") are opt-in */
const CONDITIONAL = /\[|against|for [A-Z]|below|when |while |Raid|Event|opponent/i;

const modById = {};
D.mods.gear.forEach(m => { modById[m.id] = m; });

function starRow(ch, star) {
  const table = ch.starTable || D.starTable;
  return table[Math.min(star, table.length) - 1];
}

function baseStats(ch, level, star) {
  const s = starRow(ch, star);
  return {
    Attack: Math.floor(ch.atk * s.baseAttackScalar + ch.atkS * s.attackScalarScalar * level + 0.5),
    Health: Math.floor(ch.hp * s.baseHealthScalar + ch.hpS * s.healthScalarScalar * level + 0.5),
    CriticalHitChance: ch.crit,
    CritDamage: ch.critMult - 1,
    LethalAttackChance: ch.lethal,
    FastAttackChance: ch.fast,
    Defense: 0, ArmorPierceChance: 0, CritResist: 0, StunResist: 0,
  };
}

// an effect's magnitude at a gear level
const effectValue = (e, lvl) => e.base + e.perLevel * (lvl - 1);
const equippedCount = () => SLOTS.filter(s => state.gearLevel[s] > 0).length;
const modSlotsUnlocked = lvl => D.gear.modLevels.filter(l => lvl >= l).length;

function compute() {
  const ch = D.characters[state.char];
  const base = baseStats(ch, state.level, state.star);
  const gear = {}, set = {}, tal = {};
  const add = (bag, stat, v) => { if (stat) bag[stat] = (bag[stat] || 0) + v; };

  for (const slot of SLOTS) {
    const lvl = state.gearLevel[slot];
    if (lvl <= 0) continue;
    for (const e of (ch.core[slot] || [])) add(gear, e.stat, effectValue(e, lvl));
    const unlocked = modSlotsUnlocked(lvl);
    state.mods[slot].forEach((id, i) => {
      if (!id || i >= unlocked) return;
      const m = modById[id];
      if (m) add(gear, m.stat, effectValue(m, lvl));
    });
  }

  const art = D.artifacts[state.artifact];
  if (art) art.eff.forEach((e, i) => {
    if (!state.artOn[i]) return;
    add(gear, e.stat, e.pct ? (base[e.stat] || 0) * effectValue(e, state.artLevel)
                            : effectValue(e, state.artLevel));
  });

  // set bonuses: a percentage bonus applies to the BASE stat only
  const pieces = equippedCount();
  const setsActive = [];
  for (const n of [2, 3, 5]) {
    const e = ch.sets[n];
    if (!e || pieces < n) continue;
    setsActive.push(n);
    if (e.stat === 'Other') continue;
    add(set, e.stat, e.pct ? (base[e.stat] || 0) * e.base : e.base);
  }

  const talentDef = id => TALENTS.find(t => t.id === id) || TALENTS_LEG.find(t => t.id === id);
  [...state.talents, state.legendary].forEach(id => {
    const t = id && talentDef(id);
    if (t && t.stat) add(tal, t.stat, t.pct ? (base[t.stat] || 0) * t.val : t.val);
  });

  const total = {}, capped = {}, over = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(gear), ...Object.keys(set), ...Object.keys(tal)])) {
    let v = (base[k] || 0) + (gear[k] || 0) + (set[k] || 0) + (tal[k] || 0);
    if (CAPS[k] != null && v > CAPS[k]) {
      capped[k] = true;
      over[k] = v - CAPS[k];        // everything past the cap is wasted
      v = CAPS[k];
    }
    total[k] = v;
  }
  return { ch, base, gear, set, tal, total, capped, over, pieces, setsActive };
}

/* threat */
function threatOf(r) {
  const w = D.threat, t = r.total;
  const atkW = t.Attack * w.AttackWeight;
  const offence = atkW * (1
    + t.CriticalHitChance * (t.CritDamage + 1) * w.CritAttackWeight
    + t.FastAttackChance * w.FastAttackWeight
    + t.LethalAttackChance * w.LethalChanceWeight
    + (t.ArmorPierceChance || 0) * w.ArmorPierceChanceWeight);
  const defense = Math.floor((1 - t.Defense) * 10000 + 0.5) / 10000;
  const ehp = t.Health * w.HealthWeight / (defense + 1e-5);
  const resist = t.Health * ((t.CritResist || 0) * w.CritChanceResistanceWeight
    + (t.StunResist || 0) * w.StunChanceResistanceWeight
    + (t.DOTResist || 0) * w.DOTChanceResistanceWeight
    + (t.BlockMitigation || 0) * w.BlockMitigationWeight);
  // each term is rounded on its own, then the character's traits multiplier applies
  const sum = [offence, ehp, resist].reduce((a, x) => a + Math.floor(x + 0.5), 0);
  const traits = r.ch.threatTraits || 1;
  const scalars = w.StarRatingScalars || [];
  const starScalar = scalars[state.star - 1] ?? 1;
  return Math.floor(sum * traits * starScalar + 0.5);
}

const damageOf = r => r.total.Attack
  * (1 + r.total.CriticalHitChance * r.total.CritDamage + r.total.LethalAttackChance * 0.1)
  * (1 + r.total.FastAttackChance);
const ehpOf = r => r.total.Health / Math.max(0.05, 1 - r.total.Defense);
const OBJECTIVES = { damage: damageOf, attack: r => r.total.Attack, ehp: ehpOf, threat: threatOf };

/* ------------------------------------------------------------------ render */
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const pct = v => (v * 100).toFixed(Math.abs((v * 100) % 1) > 0.05 ? 1 : 0).replace('.', ',') + ' %';
const showStat = (stat, v) => FLAT.has(stat) ? fmt(v) : pct(v);

const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};
function icon(name) {
  const img = document.createElement('img');
  img.className = 'ico';
  img.alt = '';
  img.src = ICONS[name] || '';
  return img;
}

const ATK_STATS = ['Attack', 'CritDamage', 'CriticalHitChance', 'LethalAttackChance',
                   'FastAttackChance', 'ArmorPierceChance'];
const DEF_STATS = ['Health', 'Defense', 'CritResist', 'StunResist', 'DOTResist', 'BlockMitigation'];
const ALWAYS_SHOWN = new Set(['Attack', 'Health', 'CritDamage', 'Defense', 'CriticalHitChance',
                              'LethalAttackChance', 'FastAttackChance', 'ArmorPierceChance',
                              'CritResist', 'StunResist']);

function statRow(r, k) {
  const v = r.total[k] || 0;
  const row = el('div', 'stat' + (k === 'Attack' || k === 'Health' ? ' key' : '') + (k === 'Health' ? ' hp' : ''));
  row.append(icon(k));

  row.append(el('span', 'name', STAT_RU[k] || k));

  const val = el('span', 'val' + (r.capped[k] ? ' capped' : ''),
                 k === 'CritDamage' ? pct(v + 1) : showStat(k, v));
  if (r.capped[k]) { val.append(' '); val.append(el('small', null, 'кап')); }
  row.append(val);

  const parts = [['База', r.base[k]], ['Экип', r.gear[k]], ['Комп', r.set[k]], ['Тал', r.tal[k]]]
    .filter(([, x]) => x)
    .map(([n, x]) => `${n} ${showStat(k, k === 'CritDamage' && n === 'База' ? x + 1 : x)}`);
  const spill = overflowLabel(r, k);
  if (parts.length || spill) {
    const partsLine = el('span', 'parts', parts.join('  '));
    if (spill) {
      partsLine.append(' ');
      partsLine.append(el('b', 'over', spill));
    }
    row.append(partsLine);
  }
  return row;
}

function renderStats(r) {
  for (const [id, keys] of [['statsAtk', ATK_STATS], ['statsDef', DEF_STATS]]) {
    const box = document.getElementById(id);
    box.textContent = '';
    for (const k of keys) {
      if (!(r.total[k] || 0) && !ALWAYS_SHOWN.has(k)) continue;
      box.append(statRow(r, k));
    }
  }
}

function renderHero(r) {
  const ch = r.ch;
  const art = IMG.portraits[ch.k];
  const tier = TIER_COLOR[ch.tier] || 'var(--line)';
  const p = document.getElementById('portrait');
  p.style.setProperty('--tier', tier);
  const artBox = document.getElementById('portraitArt');
  artBox.style.backgroundImage = art ? `url(${art})` : 'none';
  artBox.textContent = art ? '' : ch.k.replace(/_/g, ' ').split(' ').map(w => w[0]).join('').slice(0, 3);
  document.getElementById('bg').style.backgroundImage = art ? `url(${art})` : 'none';
  document.getElementById('pLevel').textContent = state.level;
  const pc = document.getElementById('pClass');
  pc.textContent = '';
  const clsIcon = ICONS['class_' + ch.cls];
  if (clsIcon) {
    const im = document.createElement('img');
    im.src = clsIcon; im.alt = ch.cls; im.title = ch.cls;
    im.style.cssText = 'width:19px;height:19px;filter:drop-shadow(0 1px 3px #000)';
    pc.append(im);
  } else {
    pc.textContent = ch.cls || '';
  }
  document.getElementById('charName').textContent = charName(ch.k);
  const chip = document.getElementById('tierChip');
  chip.textContent = ch.tier || '';
  chip.style.setProperty('--tier', tier);
  const sc = document.getElementById('starChip');
  sc.textContent = state.star + '★ ⇄';
  sc.style.setProperty('--tier', state.star > 7 ? 'var(--violet)' : 'var(--gold)');
  sc.onclick = () => setStar(state.star > 7 ? state.star - 7 : state.star + 7);
  const th = document.getElementById('threat');
  th.textContent = '';
  if (ICONS.Threat) {
    const c = document.createElement('img');
    c.className = 'crown'; c.alt = ''; c.src = ICONS.Threat;
    th.append(c);
  }
  th.append(fmt(threatOf(r)));
  document.getElementById('dmg').textContent = fmt(damageOf(r));
}

function renderGear(r) {
  const box = document.getElementById('gear');
  box.textContent = '';
  for (const slot of SLOTS) {
    const lvl = state.gearLevel[slot];
    const card = el('div', 'slot');
    const art = IMG.gear[`${r.ch.k}_${slot}`];
    const inner = el('div', 'inner');
    inner.style.setProperty('--art', art ? `url(${art})` : 'none');
    card.append(inner);

    const top = el('div', 'top');
    const title = el('h3', null, pieceName(r.ch.k, slot) || SLOT_RU[slot]);
    title.title = SLOT_RU[slot];
    top.append(title);
    const lvlInput = el('input');
    lvlInput.type = 'number'; lvlInput.min = 0; lvlInput.max = D.gear.maxGearLevel;
    lvlInput.value = lvl;
    lvlInput.title = 'Уровень предмета';
    lvlInput.addEventListener('input', () => {
      state.gearLevel[slot] = Math.max(0, Math.min(D.gear.maxGearLevel, +lvlInput.value || 0));
      update();
    });
    top.append(lvlInput);
    inner.append(top);

    for (const e of (r.ch.core[slot] || [])) {
      inner.append(el('div', 'core',
        `${STAT_SHORT[e.stat] || STAT_RU[e.stat] || e.stat}: ${showStat(e.stat, effectValue(e, lvl))}`));
    }

    const unlocked = modSlotsUnlocked(lvl);
    const mods = el('div', 'mods');
    for (let i = 0; i < 4; i++) {
      const epicSlot = i === 3;
      const row = el('div', 'mod');
      const sel = el('select');
      sel.append(new Option('— пусто —', ''));
      for (const m of D.mods.gear.filter(m => epicSlot ? m.rarity !== 'Common' : m.rarity !== 'Epic')) {
        sel.append(new Option(`${STAT_RU[m.stat] || m.stat}: ${showStat(m.stat, effectValue(m, lvl))}`, m.id));
      }
      sel.value = state.mods[slot][i];
      sel.disabled = i >= unlocked;
      sel.title = epicSlot ? 'Эпический слот' : 'Обычный слот';
      sel.addEventListener('change', () => { state.mods[slot][i] = sel.value; update(); });

      const m = modById[state.mods[slot][i]];
      row.append(el('span', 'txt', m
        ? `${STAT_SHORT[m.stat] || STAT_RU[m.stat] || m.stat}: ${showStat(m.stat, effectValue(m, lvl))}`
        : '— пусто —'));
      row.append(sel);
      if (m) row.classList.add(m.rarity.toLowerCase());
      if (i >= unlocked) row.classList.add('locked');
      mods.append(row);
    }
    inner.append(mods);
    if (unlocked < 4) inner.append(el('div', 'note', `слотов ${unlocked}/4 · с ур. ${D.gear.modLevels[unlocked]}`));
    box.append(card);
  }
}

/** numbers that follow from the stats but are not stats themselves */
function renderDerived(r) {
  const box = document.getElementById('derived');
  if (!box) return;
  box.textContent = '';
  const rows = [];

  // what the defence percentage actually buys you
  rows.push(['Эффективное HP', fmt(ehpOf(r)),
             'здоровье с учётом защиты — столько урона нужно, чтобы вас убить']);

  // how finished the build is
  let used = 0, open = 0;
  for (const slot of SLOTS) {
    const unlocked = modSlotsUnlocked(state.gearLevel[slot]);
    open += unlocked;
    used += state.mods[slot].slice(0, unlocked).filter(Boolean).length;
  }
  rows.push(['Моды', `${used} / ${open}`, 'занято слотов из открытых']);

  for (const [name, value, hint] of rows) {
    const line = el('div', 'derived-row');
    line.title = hint;
    line.append(el('span', 'who', name));
    line.append(el('span', 'val', value));
    box.append(line);
  }
}

/** the same hit, resolved against each opponent class through the class matrix */
function renderDamageByClass(r) {
  const box = document.getElementById('dmgByClass');
  if (!box) return;
  box.textContent = '';
  const base = damageOf(r);
  const idx = CLASS_INDEX.indexOf(r.ch.cls);
  const row = idx >= 0 ? (D.classMatrix || [])[idx] : null;

  const lines = [['Обычный', 0]];
  if (row) {
    for (const [key, value] of Object.entries(row)) {
      const m = key.match(/\[(\d+)\]$/);
      const against = CLASS_INDEX[m ? +m[1] : 0];
      if (against && value) lines.push(['против: ' + (CLASS_RU[against] || against), value]);
    }
  }
  lines.sort((a, b) => b[1] - a[1]);

  for (const [name, mod] of lines) {
    const line = el('div', 'derived-row' + (mod > 0 ? ' up' : mod < 0 ? ' down' : ''));
    line.append(el('span', 'who', name));
    line.append(el('span', 'val', fmt(base * (1 + mod))));
    box.append(line);
  }
}

/** who this character hits harder, and who hits them harder — from the game's class matrix */
function renderMatchups(ch) {
  const box = document.getElementById('matchups');
  if (!box) return;
  box.textContent = '';
  const idx = CLASS_INDEX.indexOf(ch.cls);
  const row = idx >= 0 ? (D.classMatrix || [])[idx] : null;
  if (!row) {
    box.append(el('div', 'note', 'нейтральный класс — без бонусов и штрафов'));
    return;
  }
  const entries = [];
  for (const [key, value] of Object.entries(row)) {
    const m = key.match(/\[(\d+)\]$/);
    const against = CLASS_INDEX[m ? +m[1] : 0];
    if (against && value) entries.push([against, value]);
  }
  entries.sort((a, b) => b[1] - a[1]);
  for (const [against, value] of entries) {
    const line = el('div', 'matchup' + (value > 0 ? ' up' : ' down'));
    const ico = ICONS['class_' + against];
    if (ico) {
      const im = document.createElement('img');
      im.src = ico; im.alt = '';
      line.append(im);
    }
    line.append(el('span', 'who', CLASS_RU[against] || against));
    line.append(el('span', 'val', (value > 0 ? '+' : '') + Math.round(value * 100) + ' %'));
    box.append(line);
  }
}

function renderSets(r) {
  const box = document.getElementById('sets');
  box.textContent = '';
  for (const n of [2, 3, 5]) {
    const e = r.ch.sets[n];
    const on = r.setsActive.includes(n);
    const row = el('div', 'set-row' + (on ? ' on' : ''));
    row.append(el('span', 'pieces', `${n}/5`));
    if (!e) { row.append(el('span', null, '—')); box.append(row); continue; }
    const amount = e.pct || !FLAT.has(e.stat) ? pct(e.base) : fmt(e.base);
    const label = e.stat === 'Other'
      ? `${(e.text || 'особый эффект').replace(/\{val\}/g, '').replace(/<[^>]+>/g, '').trim()}: ${amount}`
      : `${STAT_RU[e.stat] || e.stat}: ${amount}`;
    row.append(el('span', null, label));
    box.append(row);
  }
  box.append(el('div', 'note', `Надето частей: ${r.pieces}/5`));
}

/** rarity badge, kept clean — the game shows the stat pictogram beside the text, not on it */
function talentBadge(talent, legendary) {
  const wrap = el('div', 'badge');
  const rarity = !talent || !talent.id ? 'None' : legendary ? 'Legendary' : 'Epic';
  const frame = ICONS['talent_' + rarity];
  if (frame) wrap.style.backgroundImage = `url(${frame})`;
  return wrap;
}

function renderTalents() {
  const box = document.getElementById('talents');
  box.textContent = '';
  for (let i = 0; i < 8; i++) {
    const leg = i === 7;
    const cur = leg ? state.legendary : state.talents[i];
    const list = leg ? TALENTS_LEG : TALENTS;
    const talent = list.find(t => t.id === cur);
    const row = el('div', 'talent' + (leg ? ' legendary' : '') + (cur ? ' filled' : ''));
    row.append(talentBadge(talent, leg));
    const sym = el('span', 'sym');
    if (talent && talent.stat && ICONS[talent.stat]) {
      const im = document.createElement('img');
      im.src = ICONS[talent.stat];
      im.alt = '';
      sym.append(im);
    }
    row.append(sym);
    const sel = el('select');
    for (const t of (leg ? TALENTS_LEG : TALENTS)) sel.append(new Option(t.name, t.id));
    sel.value = cur;
    sel.addEventListener('change', () => {
      if (leg) state.legendary = sel.value; else state.talents[i] = sel.value;
      renderTalents(); update();
    });
    row.append(sel);
    box.append(row);
  }
}

function renderArtifact() {
  const box = document.getElementById('artEffects');
  box.textContent = '';
  const art = D.artifacts[state.artifact];
  if (!art) { box.append(el('div', 'note', 'Артефакт не выбран')); return; }
  art.eff.forEach((e, i) => {
    const row = el('label', 'set-row' + (state.artOn[i] ? ' on' : ''));
    row.style.cursor = 'pointer';
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = !!state.artOn[i];
    cb.addEventListener('change', () => { state.artOn[i] = cb.checked; update(); });
    row.append(cb);
    row.append(el('span', 'pieces', e.pct ? pct(effectValue(e, state.artLevel))
                                          : showStat(e.stat, effectValue(e, state.artLevel))));
    row.append(el('span', null, (e.text || STAT_RU[e.stat] || e.stat).replace(/<[^>]+>/g, '')));
    box.append(row);
  });
  for (const t of (art.text || []).filter(t => t && !art.eff.some(e => e.text === t))) {
    box.append(el('div', 'note', '· ' + t.replace(/<[^>]+>/g, '')));
  }
}

/** clone a computed result with one stat nudged, caps re-applied */
function withExtra(r, stat, delta) {
  const total = { ...r.total };
  let v = (total[stat] || 0) + delta;
  if (CAPS[stat] != null) v = Math.min(v, CAPS[stat]);
  total[stat] = v;
  return { ...r, total };
}

/** how much of a stat is spilling over its cap, formatted for display */
function overflowLabel(r, k) {
  const x = r.over && r.over[k];
  if (!x || x < 0.0005) return null;
  return 'перелив ' + pct(x);
}

function renderMarginal(r) {
  const body = document.querySelector('#marginal tbody');
  body.textContent = '';
  const refLevel = Math.max(...SLOTS.map(s => state.gearLevel[s]), 1);
  const baseDmg = damageOf(r), baseThreat = threatOf(r);
  const byStat = {};
  for (const m of D.mods.gear) (byStat[m.stat] ||= {})[m.rarity] = m;

  for (const [stat, tiers] of Object.entries(byStat)) {
    const tr = el('tr');
    tr.append(el('td', null, STAT_RU[stat] || stat));
    for (const rar of ['Rare', 'Epic']) {
      const m = tiers[rar];
      tr.append(el('td', null, m ? showStat(stat, effectValue(m, refLevel)) : '—'));
    }
    const epic = tiers.Epic || tiers.Rare;
    if (epic) {
      const probe = withExtra(r, epic.stat, effectValue(epic, refLevel));
      const dd = damageOf(probe) - baseDmg, dt = threatOf(probe) - baseThreat;
      tr.append(el('td', dd > 0.5 ? 'up' : null, dd > 0.5 ? '+' + fmt(dd) : '0'));
      tr.append(el('td', dt > 0.5 ? 'up' : null, dt > 0.5 ? '+' + fmt(dt) : '0'));
    } else { tr.append(el('td', null, '—'), el('td', null, '—')); }
    body.append(tr);
  }
}

/* ------------------------------------------------------------------ upgrade cost */
const GEAR_STAT_COUNT = new Set(D.mods.gear.map(m => m.stat)).size;

function gearPointsTo(level, rarity) {
  const table = (D.gear.costs || {})[rarity] || [];
  let sum = 0;
  for (let i = 0; i < Math.min(level - 1, table.length); i++) sum += table[i] || 0;
  return sum;
}

/** expected reforge material to roll one specific stat of a given rarity in a slot */
function reforgeCost(slotIndex, rarity) {
  const rules = D.gear.reforges || {};
  const key = rarity === 'Epic' ? 'ECurrencyType::EpicModMaterial'
            : rarity === 'Rare' ? 'ECurrencyType::RareModMaterial'
            : 'ECurrencyType::ModMaterial';
  const rule = rules[key];
  if (!rule) return null;
  const w = rule.weights || [];
  const total = w.reduce((a, x) => a + (x || 0), 0);
  const idx = rarity === 'Common' ? 0 : rarity === 'Rare' ? 1 : 2;
  const pRarity = total ? (w[idx] || 0) / total : 0;
  if (!pRarity) return null;
  const perRoll = rule.costs ? (rule.costs[slotIndex] || rule.costs[rule.costs.length - 1]) : 1;
  const p = pRarity / GEAR_STAT_COUNT;
  // rolling is geometric: the mean is a poor guide for one item, so keep the median too
  return {
    material: key.split('::')[1],
    perRoll,
    mean: perRoll / p,
    median: perRoll * Math.log(0.5) / Math.log(1 - p),
    p90: perRoll * Math.log(0.1) / Math.log(1 - p),
  };
}

function buildCost() {
  const rarity = (document.getElementById('gearRarity') || {}).value || 'Epic';
  const rows = [];

  let points = 0;
  for (const slot of SLOTS) points += gearPointsTo(state.gearLevel[slot], rarity);
  rows.push(['Очки экипировки', fmt(points), `5 предметов до ур. ${SLOTS.map(s => state.gearLevel[s]).join('/')}`]);

  const mats = {}, single = {};
  for (const slot of SLOTS) {
    const unlocked = modSlotsUnlocked(state.gearLevel[slot]);
    state.mods[slot].forEach((id, i) => {
      if (!id || i >= unlocked) return;
      const m = modById[id];
      const c = reforgeCost(i, m.rarity);
      if (!c) return;
      mats[c.material] = (mats[c.material] || 0) + c.mean;
      single[c.material] = c;
    });
  }
  const MAT_RU = { ModMaterial: 'Обычный мод-материал', RareModMaterial: 'Редкий мод-материал',
                   EpicModMaterial: 'Эпический мод-материал' };
  for (const [k, v] of Object.entries(mats)) {
    const c = single[k];
    const note = c
      ? `на один мод: в среднем ${fmt(c.mean)}, половина уложится в ${fmt(c.median)}, каждому десятому нужно больше ${fmt(c.p90)}`
      : 'до нужного стата';
    rows.push([MAT_RU[k] || k, '≈ ' + fmt(v), note]);
  }

  const xp = (D.xpToNextLevel || []).slice(0, Math.max(0, state.level - 1))
    .reduce((a, x) => a + (x || 0), 0);
  rows.push(['Опыт персонажа', fmt(xp), `с 1-го до ${state.level}-го уровня`]);

  const growth = (D.characters[state.char].shardGrowth) || 'Normal';
  const table = (D.shardTables || {})[growth] || [];
  const shards = table.slice(0, Math.max(0, state.star - 1)).reduce((a, x) => a + (x || 0), 0);
  if (shards) rows.push(['Осколки', fmt(shards), `до ${state.star}★ (рост «${growth}»)`]);

  return rows;
}

function renderCost() {
  const body = document.querySelector('#cost tbody');
  if (!body) return;
  body.textContent = '';
  for (const [name, value, note] of buildCost()) {
    const tr = el('tr');
    tr.append(el('td', null, name));
    const v = el('td', null, value);
    v.style.color = 'var(--gold)';
    tr.append(v);
    const n = el('td', null, note);
    n.style.textAlign = 'left';
    n.style.color = 'var(--muted-2)';
    tr.append(n);
    body.append(tr);
  }
}

/* ------------------------------------------------------------------ optimiser */
function snapshot() {
  return { mods: JSON.parse(JSON.stringify(state.mods)), talents: state.talents.slice(),
           legendary: state.legendary };
}
function restore(s) {
  state.mods = JSON.parse(JSON.stringify(s.mods));
  state.talents = s.talents.slice();
  state.legendary = s.legendary;
}

function modKnobs() {
  const knobs = [];
  for (const slot of SLOTS) {
    const unlocked = modSlotsUnlocked(state.gearLevel[slot]);
    for (let i = 0; i < 4; i++) {
      if (i >= unlocked) { state.mods[slot][i] = ''; continue; }
      const epic = i === 3;                       // slot 4 takes epic mods only
      knobs.push({
        get: () => state.mods[slot][i],
        set: v => { state.mods[slot][i] = v; },
        opts: D.mods.gear.filter(m => epic ? m.rarity === 'Epic' : m.rarity === 'Rare').map(m => m.id),
      });
    }
  }
  return knobs;
}

function talentKnobs() {
  const knobs = [];
  for (let i = 0; i < 7; i++) {
    knobs.push({ get: () => state.talents[i], set: v => { state.talents[i] = v; },
                 opts: TALENTS.filter(t => t.id).map(t => t.id) });
  }
  knobs.push({ get: () => state.legendary, set: v => { state.legendary = v; },
               opts: TALENTS_LEG.filter(t => t.id).map(t => t.id) });
  return knobs;
}

/** coordinate ascent — cheap, and the objective is monotone apart from the caps */
function ascend(knobs, score) {
  for (let pass = 0; pass < 5; pass++) {
    let improved = false;
    for (const k of knobs) {
      let best = k.get(), bestScore = score(compute());
      for (const id of k.opts) {
        if (id === best) continue;
        k.set(id);
        const sc = score(compute());
        if (sc > bestScore + 1e-9) { bestScore = sc; best = id; improved = true; }
      }
      k.set(best);
    }
    if (!improved) break;
  }
}

function optimise() {
  const raw = OBJECTIVES[document.getElementById('objective').value];
  // equal-scoring builds should prefer the one that spills less over the caps
  const score = r => {
    const spill = Object.values(r.over || {}).reduce((a, x) => a + x, 0);
    return raw(r) * (1 - spill * 1e-9);
  };
  const withTalents = document.getElementById('optTalents').checked;
  const clearAll = () => {
    SLOTS.forEach(s => state.mods[s] = ['', '', '', '']);
    if (withTalents) { state.talents = ['', '', '', '', '', '', '']; state.legendary = ''; }
  };

  // Whichever group is filled first can eat a capped stat and starve the other, so run
  // both orderings from a clean slate and keep the better build.
  clearAll();
  const mods = modKnobs(), talents = withTalents ? talentKnobs() : [];
  ascend([...mods, ...talents], score);
  const first = snapshot(), firstScore = score(compute());

  if (withTalents) {
    clearAll();
    ascend([...talents, ...mods], score);
    if (score(compute()) < firstScore) restore(first);
    renderTalents();
  }
  update();
}

/* ------------------------------------------------------------------ wiring */
function update() {
  const r = compute();
  renderHero(r);
  renderStats(r);
  renderDerived(r);
  renderDamageByClass(r);
  renderMatchups(r.ch);
  renderGear(r);
  renderSets(r);
  renderArtifact();
  renderMarginal(r);
  renderCost();
  writeHash();
}

function renderStarPicker() {
  const box = document.getElementById('starPicker');
  box.textContent = '';
  // the game never draws more than 7 stars — 8..14 reuse the same 7 slots in a second colour
  const hi = state.star > 7;
  const lit = hi ? state.star - 7 : state.star;
  for (let i = 1; i <= 7; i++) {
    const b = el('button', 'star' + (i <= lit ? ' on' : '') + (hi ? ' hi' : ''));
    b.type = 'button';
    b.title = (hi ? i + 7 : i) + '★';
    b.setAttribute('aria-label', (hi ? i + 7 : i) + ' звёзд');
    b.innerHTML = '<svg viewBox="0 0 24 24"><polygon class="fill" points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"/></svg>';
    b.addEventListener('click', () => setStar(hi ? i + 7 : i));
    box.append(b);
  }
}

function setStar(value) {
  state.star = Math.max(1, Math.min(14, value));
  const cap = (D.maxLevelPerStar.find(x => x.StarRating === state.star) || {}).MaxLevel || 80;
  if (state.level > cap) { state.level = cap; document.getElementById('level').value = cap; }
  renderStarPicker();
  update();
}

function writeHash() {
  const p = new URLSearchParams();
  p.set('c', state.char); p.set('s', state.star); p.set('l', state.level);
  p.set('g', SLOTS.map(s => state.gearLevel[s]).join('.'));
  p.set('m', SLOTS.map(s => state.mods[s].join('~')).join('.'));
  p.set('t', state.talents.join('~') + '|' + state.legendary);
  if (state.artifact) {
    // artifact, its level and which of its effects are counted
    const on = Object.keys(state.artOn).filter(i => state.artOn[i]).join('-');
    p.set('a', `${state.artifact}.${state.artLevel}.${on}`);
  }
  // optimiser settings travel with the build, so pressing "Подогнать" on a shared
  // link reproduces what the sender actually did
  const obj = document.getElementById('objective');
  const optTal = document.getElementById('optTalents');
  if (obj) p.set('o', obj.value);
  if (optTal) p.set('ot', optTal.checked ? '1' : '0');
  const rar = document.getElementById('gearRarity');
  if (rar) p.set('r', rar.value);
  history.replaceState(null, '', '#' + p.toString());
}

function readHash() {
  if (!location.hash) return;
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('c') && D.characters[p.get('c')]) state.char = p.get('c');
  if (p.get('s')) state.star = +p.get('s');
  if (p.get('l')) state.level = +p.get('l');
  if (p.get('g')) p.get('g').split('.').forEach((v, i) => { state.gearLevel[SLOTS[i]] = +v; });
  if (p.get('m')) p.get('m').split('.').forEach((v, i) => { state.mods[SLOTS[i]] = v.split('~'); });
  if (p.get('t')) {
    const [t, leg] = p.get('t').split('|');
    state.talents = t.split('~'); state.legendary = leg || '';
  }
  if (p.get('o')) state.objective = p.get('o');
  if (p.get('ot')) state.optTalents = p.get('ot') === '1';
  if (p.get('r')) state.gearRarity = p.get('r');
  if (p.get('a')) {
    const [key, lvl, on] = p.get('a').split('.');
    if (D.artifacts[key]) {
      state.artifact = key;
      state.artLevel = +lvl || 0;
      state.artOn = {};
      (on || '').split('-').filter(Boolean).forEach(i => { state.artOn[i] = true; });
    }
  }
}

function init() {
  const sel = document.getElementById('charSel');
  for (const c of Object.values(D.characters).sort((a, b) => charName(a.k).localeCompare(charName(b.k), 'ru'))) {
    sel.append(new Option(`${charName(c.k)} · ${c.cls}`, c.k));
  }
  readHash();
  sel.value = state.char;
  sel.addEventListener('change', () => { state.char = sel.value; update(); });

  const lvl = document.getElementById('level');
  lvl.value = state.level;
  lvl.addEventListener('input', () => {
    const cap = (D.maxLevelPerStar.find(x => x.StarRating === state.star) || {}).MaxLevel || 80;
    state.level = Math.max(1, Math.min(cap, +lvl.value || 1));
    if (+lvl.value > cap) lvl.value = cap;
    update();
  });

  document.getElementById('gearAll').addEventListener('input', e => {
    const v = Math.max(0, Math.min(D.gear.maxGearLevel, +e.target.value || 0));
    SLOTS.forEach(s => state.gearLevel[s] = v);
    update();
  });

  const artSel = document.getElementById('artSel');
  artSel.append(new Option('— без артефакта —', ''));
  for (const k of Object.keys(D.artifacts).sort()) artSel.append(new Option(k.replace(/_/g, ' '), k));
  artSel.value = state.artifact || '';
  document.getElementById('artLevel').value = state.artLevel;
  artSel.addEventListener('change', () => {
    state.artifact = artSel.value;
    state.artOn = {};
    const art = D.artifacts[state.artifact];
    if (art) art.eff.forEach((e, i) => { state.artOn[i] = !CONDITIONAL.test(e.text || ''); });
    update();
  });
  const artLvl = document.getElementById('artLevel');
  artLvl.addEventListener('input', () => {
    state.artLevel = Math.max(0, Math.min(10, +artLvl.value || 0));
    update();
  });

  const rar = document.getElementById('gearRarity');
  if (rar) rar.addEventListener('change', update);

  if (state.objective) document.getElementById('objective').value = state.objective;
  if (state.optTalents != null) document.getElementById('optTalents').checked = state.optTalents;
  if (state.gearRarity) {
    const r = document.getElementById('gearRarity');
    if (r) r.value = state.gearRarity;
  }
  document.getElementById('objective').addEventListener('change', writeHash);
  document.getElementById('optTalents').addEventListener('change', writeHash);

  document.getElementById('optimize').addEventListener('click', optimise);
  document.getElementById('clearMods').addEventListener('click', () => {
    SLOTS.forEach(s => state.mods[s] = ['', '', '', '']);
    state.talents = ['', '', '', '', '', '', ''];
    state.legendary = '';
    state.artifact = '';
    state.artOn = {};
    document.getElementById('artSel').value = '';
    renderTalents();
    update();
  });
  document.getElementById('share').addEventListener('click', async e => {
    writeHash();
    try {
      await navigator.clipboard.writeText(location.href);
      e.target.textContent = 'Скопировано';
      setTimeout(() => e.target.textContent = 'Ссылка', 1500);
    } catch { e.target.textContent = 'В адресной строке'; }
  });

  renderStarPicker();
  renderTalents();
  update();
}

init();

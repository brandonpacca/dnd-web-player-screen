/* Dati di regolamento D&D 5e (2014) usati dai template di razza e classe. */
window.DND_DATA = (function () {
  var ABILITIES = [
    { key: 'FOR', label: 'Forza' },
    { key: 'DES', label: 'Destrezza' },
    { key: 'COS', label: 'Costituzione' },
    { key: 'INT', label: 'Intelligenza' },
    { key: 'SAG', label: 'Saggezza' },
    { key: 'CAR', label: 'Carisma' }
  ];

  var SKILLS = [
    { name: 'Acrobazia', ab: 'DES' },
    { name: 'Addestrare Animali', ab: 'SAG' },
    { name: 'Arcano', ab: 'INT' },
    { name: 'Atletica', ab: 'FOR' },
    { name: 'Furtività', ab: 'DES' },
    { name: 'Indagare', ab: 'INT' },
    { name: 'Inganno', ab: 'CAR' },
    { name: 'Intimidire', ab: 'CAR' },
    { name: 'Intrattenere', ab: 'CAR' },
    { name: 'Intuizione', ab: 'SAG' },
    { name: 'Medicina', ab: 'SAG' },
    { name: 'Natura', ab: 'INT' },
    { name: 'Percezione', ab: 'SAG' },
    { name: 'Persuasione', ab: 'CAR' },
    { name: 'Rapidità di Mano', ab: 'DES' },
    { name: 'Religione', ab: 'INT' },
    { name: 'Sopravvivenza', ab: 'SAG' },
    { name: 'Storia', ab: 'INT' }
  ];

  // bonus: incrementi fissi; flex: numero di +1 a scelta; skills: abilità concesse; skillChoices: abilità a scelta
  var RACES = [
    { key: 'umano', group: 'Umano', label: 'Umano', bonus: { FOR: 1, DES: 1, COS: 1, INT: 1, SAG: 1, CAR: 1 }, speed: 9,
      traits: ['+1 a tutte le caratteristiche', 'Linguaggi: Comune + uno a scelta'] },
    { key: 'umano-variante', group: 'Umano', label: 'Umano (variante)', bonus: {}, flex: 2, skillChoices: 1, speed: 9,
      traits: ['+1 a due caratteristiche a scelta', 'Competenza in un\'abilità a scelta', 'Un talento a scelta'] },
    { key: 'alto-elfo', group: 'Elfo', label: 'Alto Elfo', bonus: { DES: 2, INT: 1 }, speed: 9, skills: ['Percezione'],
      traits: ['Scurovisione 18 m', 'Sensi acuti (Percezione)', 'Retaggio fatato', 'Trance', 'Un trucchetto da mago'] },
    { key: 'elfo-boschi', group: 'Elfo', label: 'Elfo dei Boschi', bonus: { DES: 2, SAG: 1 }, speed: 10.5, skills: ['Percezione'],
      traits: ['Scurovisione 18 m', 'Sensi acuti (Percezione)', 'Retaggio fatato', 'Trance', 'Piede lesto', 'Maschera della natura'] },
    { key: 'drow', group: 'Elfo', label: 'Elfo Oscuro (Drow)', bonus: { DES: 2, CAR: 1 }, speed: 9, skills: ['Percezione'],
      traits: ['Scurovisione superiore 36 m', 'Sensi acuti (Percezione)', 'Sensibilità alla luce del sole', 'Magia drow'] },
    { key: 'nano-colline', group: 'Nano', label: 'Nano delle Colline', bonus: { COS: 2, SAG: 1 }, speed: 7.5, hpPerLevel: 1,
      traits: ['Scurovisione 18 m', 'Resilienza nanica', 'Esperto del lavoro con la pietra', 'Robustezza nanica (+1 PF per livello)'] },
    { key: 'nano-montagne', group: 'Nano', label: 'Nano delle Montagne', bonus: { COS: 2, FOR: 2 }, speed: 7.5,
      traits: ['Scurovisione 18 m', 'Resilienza nanica', 'Competenza nelle armature leggere e medie'] },
    { key: 'halfling-piedelesto', group: 'Halfling', label: 'Halfling Piedelesto', bonus: { DES: 2, CAR: 1 }, speed: 7.5,
      traits: ['Fortunato', 'Coraggioso', 'Agilità halfling', 'Furtività innata'] },
    { key: 'halfling-tozzo', group: 'Halfling', label: 'Halfling Tozzo', bonus: { DES: 2, COS: 1 }, speed: 7.5,
      traits: ['Fortunato', 'Coraggioso', 'Agilità halfling', 'Resilienza dei tozzi'] },
    { key: 'gnomo-foreste', group: 'Gnomo', label: 'Gnomo delle Foreste', bonus: { INT: 2, DES: 1 }, speed: 7.5,
      traits: ['Scurovisione 18 m', 'Astuzia gnomesca', 'Illusionista nato', 'Parlare con le piccole bestie'] },
    { key: 'gnomo-rocce', group: 'Gnomo', label: 'Gnomo delle Rocce', bonus: { INT: 2, COS: 1 }, speed: 7.5,
      traits: ['Scurovisione 18 m', 'Astuzia gnomesca', 'Conoscenze da artigiano', 'Inventore'] },
    { key: 'mezzelfo', group: 'Mezzelfo', label: 'Mezzelfo', bonus: { CAR: 2 }, flex: 2, skillChoices: 2, speed: 9,
      traits: ['+1 a due caratteristiche a scelta (non Carisma)', 'Scurovisione 18 m', 'Retaggio fatato', 'Versatilità nelle abilità (2 a scelta)'] },
    { key: 'mezzorco', group: 'Mezzorco', label: 'Mezzorco', bonus: { FOR: 2, COS: 1 }, speed: 9, skills: ['Intimidire'],
      traits: ['Scurovisione 18 m', 'Minaccioso (Intimidire)', 'Tenacia implacabile', 'Attacchi selvaggi'] },
    { key: 'tiefling', group: 'Tiefling', label: 'Tiefling', bonus: { CAR: 2, INT: 1 }, speed: 9,
      traits: ['Scurovisione 18 m', 'Resistenza infernale (fuoco)', 'Eredità infernale'] },
    { key: 'dragonide', group: 'Dragonide', label: 'Dragonide', bonus: { FOR: 2, CAR: 1 }, speed: 9,
      traits: ['Discendenza draconica', 'Arma a soffio', 'Resistenza ai danni (in base alla discendenza)'] }
  ];

  // ac.type: 'armor' (base + DES limitata da dexMax, + scudo) | 'unarmored' (10 + DES + ability)
  var CLASSES = [
    { key: 'barbaro', label: 'Barbaro', hd: 12, saves: ['FOR', 'COS'], priority: ['FOR', 'COS', 'DES', 'SAG', 'CAR', 'INT'],
      skillCount: 2, skillList: ['Addestrare Animali', 'Atletica', 'Intimidire', 'Natura', 'Percezione', 'Sopravvivenza'],
      suggested: ['Atletica', 'Percezione', 'Sopravvivenza', 'Intimidire'],
      ac: { type: 'unarmored', ability: 'COS', desc: 'Difesa senza armatura (10 + DES + COS)' },
      features: ['Ira', 'Difesa senza armatura'] },
    { key: 'bardo', label: 'Bardo', hd: 8, saves: ['DES', 'CAR'], priority: ['CAR', 'DES', 'COS', 'SAG', 'INT', 'FOR'],
      skillCount: 3, skillList: 'all', suggested: ['Persuasione', 'Inganno', 'Intrattenere', 'Intuizione', 'Acrobazia'],
      ac: { type: 'armor', base: 11, desc: 'Armatura di cuoio (11 + DES)' }, spell: 'CAR',
      features: ['Incantesimi', 'Ispirazione bardica (d6)'] },
    { key: 'chierico', label: 'Chierico', hd: 8, saves: ['SAG', 'CAR'], priority: ['SAG', 'COS', 'FOR', 'CAR', 'DES', 'INT'],
      skillCount: 2, skillList: ['Intuizione', 'Medicina', 'Persuasione', 'Religione', 'Storia'],
      suggested: ['Intuizione', 'Religione', 'Medicina'],
      ac: { type: 'armor', base: 14, dexMax: 2, shield: true, desc: 'Corazza a scaglie + scudo (14 + DES max 2 + 2)' }, spell: 'SAG',
      features: ['Incantesimi', 'Dominio divino'] },
    { key: 'druido', label: 'Druido', hd: 8, saves: ['INT', 'SAG'], priority: ['SAG', 'COS', 'DES', 'INT', 'CAR', 'FOR'],
      skillCount: 2, skillList: ['Addestrare Animali', 'Arcano', 'Intuizione', 'Medicina', 'Natura', 'Percezione', 'Religione', 'Sopravvivenza'],
      suggested: ['Percezione', 'Natura', 'Sopravvivenza'],
      ac: { type: 'armor', base: 11, shield: true, desc: 'Armatura di cuoio + scudo di legno (11 + DES + 2)' }, spell: 'SAG',
      features: ['Druidico', 'Incantesimi'] },
    { key: 'guerriero', label: 'Guerriero', hd: 10, saves: ['FOR', 'COS'], priority: ['FOR', 'COS', 'DES', 'SAG', 'CAR', 'INT'],
      skillCount: 2, skillList: ['Acrobazia', 'Addestrare Animali', 'Atletica', 'Intimidire', 'Intuizione', 'Percezione', 'Sopravvivenza', 'Storia'],
      suggested: ['Atletica', 'Percezione', 'Intimidire'],
      ac: { type: 'armor', base: 16, dexMax: 0, desc: 'Cotta di maglia (16)' },
      features: ['Stile di combattimento', 'Recuperare energie'] },
    { key: 'ladro', label: 'Ladro', hd: 8, saves: ['DES', 'INT'], priority: ['DES', 'COS', 'INT', 'SAG', 'CAR', 'FOR'],
      skillCount: 4, skillList: ['Acrobazia', 'Atletica', 'Furtività', 'Indagare', 'Inganno', 'Intimidire', 'Intrattenere', 'Intuizione', 'Percezione', 'Persuasione', 'Rapidità di Mano'],
      suggested: ['Furtività', 'Rapidità di Mano', 'Acrobazia', 'Percezione', 'Indagare'],
      ac: { type: 'armor', base: 11, desc: 'Armatura di cuoio (11 + DES)' },
      features: ['Maestria', 'Attacco furtivo (1d6)', 'Gergo ladresco'] },
    { key: 'mago', label: 'Mago', hd: 6, saves: ['INT', 'SAG'], priority: ['INT', 'COS', 'DES', 'SAG', 'CAR', 'FOR'],
      skillCount: 2, skillList: ['Arcano', 'Indagare', 'Intuizione', 'Medicina', 'Religione', 'Storia'],
      suggested: ['Arcano', 'Indagare', 'Storia'],
      ac: { type: 'armor', base: 10, desc: 'Nessuna armatura (10 + DES)' }, spell: 'INT',
      features: ['Incantesimi', 'Recupero arcano'] },
    { key: 'monaco', label: 'Monaco', hd: 8, saves: ['FOR', 'DES'], priority: ['DES', 'SAG', 'COS', 'FOR', 'INT', 'CAR'],
      skillCount: 2, skillList: ['Acrobazia', 'Atletica', 'Furtività', 'Intuizione', 'Religione', 'Storia'],
      suggested: ['Acrobazia', 'Furtività', 'Intuizione'],
      ac: { type: 'unarmored', ability: 'SAG', desc: 'Difesa senza armatura (10 + DES + SAG)' },
      features: ['Difesa senza armatura', 'Arti marziali (d4)'] },
    { key: 'paladino', label: 'Paladino', hd: 10, saves: ['SAG', 'CAR'], priority: ['FOR', 'CAR', 'COS', 'SAG', 'DES', 'INT'],
      skillCount: 2, skillList: ['Atletica', 'Intimidire', 'Intuizione', 'Medicina', 'Persuasione', 'Religione'],
      suggested: ['Atletica', 'Persuasione', 'Intuizione'],
      ac: { type: 'armor', base: 16, dexMax: 0, shield: true, desc: 'Cotta di maglia + scudo (16 + 2)' }, spell: 'CAR',
      features: ['Percezione del divino', 'Imposizione delle mani'] },
    { key: 'ranger', label: 'Ranger', hd: 10, saves: ['FOR', 'DES'], priority: ['DES', 'SAG', 'COS', 'FOR', 'INT', 'CAR'],
      skillCount: 3, skillList: ['Addestrare Animali', 'Atletica', 'Furtività', 'Indagare', 'Intuizione', 'Natura', 'Percezione', 'Sopravvivenza'],
      suggested: ['Percezione', 'Furtività', 'Sopravvivenza', 'Natura'],
      ac: { type: 'armor', base: 11, desc: 'Armatura di cuoio (11 + DES)' }, spell: 'SAG',
      features: ['Nemico prescelto', 'Esploratore nato'] },
    { key: 'stregone', label: 'Stregone', hd: 6, saves: ['COS', 'CAR'], priority: ['CAR', 'COS', 'DES', 'SAG', 'INT', 'FOR'],
      skillCount: 2, skillList: ['Arcano', 'Inganno', 'Intimidire', 'Intuizione', 'Persuasione', 'Religione'],
      suggested: ['Arcano', 'Persuasione', 'Intuizione'],
      ac: { type: 'armor', base: 10, desc: 'Nessuna armatura (10 + DES)' }, spell: 'CAR',
      features: ['Incantesimi', 'Origine stregonesca'] },
    { key: 'warlock', label: 'Warlock', hd: 8, saves: ['SAG', 'CAR'], priority: ['CAR', 'COS', 'DES', 'SAG', 'INT', 'FOR'],
      skillCount: 2, skillList: ['Arcano', 'Indagare', 'Inganno', 'Intimidire', 'Natura', 'Religione', 'Storia'],
      suggested: ['Arcano', 'Inganno', 'Indagare'],
      ac: { type: 'armor', base: 11, desc: 'Armatura di cuoio (11 + DES)' }, spell: 'CAR',
      features: ['Patrono ultraterreno', 'Magia del patto'] }
  ];

  var STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
  var POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var POINT_BUY_BUDGET = 27;

  return {
    ABILITIES: ABILITIES,
    SKILLS: SKILLS,
    RACES: RACES,
    CLASSES: CLASSES,
    STANDARD_ARRAY: STANDARD_ARRAY,
    POINT_BUY_COST: POINT_BUY_COST,
    POINT_BUY_BUDGET: POINT_BUY_BUDGET
  };
})();

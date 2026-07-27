/* ============================================================
   tea.js · 私人茶饮管家
   针对湿热体质，融合二十四节气/三伏文化；以周为单位推荐；
   搜索意图识别（湿热/三伏/姨妈期）；茶方自动解析配比；一键收藏。
   说明：所有推荐均为草本代茶饮，已按你的偏好过滤红茶/绿茶。
   ============================================================ */
(function (global) {
  'use strict';

  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- 二十四节气（近似起始日） ---------- */
  const SOLAR_TERMS = [
    { name: '小寒', m: 1, d: 5 }, { name: '大寒', m: 1, d: 20 },
    { name: '立春', m: 2, d: 4 }, { name: '雨水', m: 2, d: 19 },
    { name: '惊蛰', m: 3, d: 5 }, { name: '春分', m: 3, d: 20 },
    { name: '清明', m: 4, d: 4 }, { name: '谷雨', m: 4, d: 20 },
    { name: '立夏', m: 5, d: 5 }, { name: '小满', m: 5, d: 21 },
    { name: '芒种', m: 6, d: 6 }, { name: '夏至', m: 6, d: 21 },
    { name: '小暑', m: 7, d: 7 }, { name: '大暑', m: 7, d: 22 },
    { name: '立秋', m: 8, d: 7 }, { name: '处暑', m: 8, d: 23 },
    { name: '白露', m: 9, d: 7 }, { name: '秋分', m: 9, d: 23 },
    { name: '寒露', m: 10, d: 8 }, { name: '霜降', m: 10, d: 23 },
    { name: '立冬', m: 11, d: 7 }, { name: '小雪', m: 11, d: 22 },
    { name: '大雪', m: 12, d: 7 }, { name: '冬至', m: 12, d: 22 },
  ];

  function getTerm(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    // 三伏：夏至后约第3个庚日起，约 7/11–8/19（简化）
    const isSanfu = (m === 7 && day >= 11) || (m === 7 && day > 22) || (m === 8 && day <= 19);
    let cur = SOLAR_TERMS[0], prev = SOLAR_TERMS[SOLAR_TERMS.length - 1];
    for (let i = 0; i < SOLAR_TERMS.length; i++) {
      const t = SOLAR_TERMS[i];
      const td = new Date(y, t.m - 1, t.d);
      if (d >= td) { cur = t; prev = SOLAR_TERMS[(i - 1 + SOLAR_TERMS.length) % SOLAR_TERMS.length]; }
    }
    // 若早于当年小寒，取上一年冬至
    const termName = (m === 1 && day < 5) ? '冬至' : cur.name;
    const tip = isSanfu
      ? '一年中最闷热潮湿的「三伏天」，湿热体质最易乏力、出油、浮肿，宜清热利湿、健脾祛暑。'
      : `当前处于「${termName}」，顺应时节调养，湿热体质以健脾祛湿、清淡为宜。`;
    return { name: isSanfu ? '三伏天' : termName, isSanfu, tip, prev: prev.name };
  }

  /* ---------- 茶饮知识库（草本，无红茶/绿茶） ---------- */
  // tags: 湿热 / 祛湿 / 清热 / 健脾 / 三伏 / 经期友好 / 经期慎饮 / 日常
  const LIBRARY = [
    { id: uid(), name: '茯苓红豆水', emoji: '🫘', videoUrl: '',
      ingredients: [{ n: '茯苓', a: '15g' }, { n: '赤小豆', a: '30g' }],
      benefits: '健脾祛湿、利水消肿，性质平和，湿热体质日常与经期都能喝。',
      tags: ['湿热', '祛湿', '健脾', '经期友好', '三伏', '日常'],
      note: '赤小豆偏利水，经期友好；煮 30 分钟出味。' },
    { id: uid(), name: '赤小豆炒薏米水', emoji: '🌾', videoUrl: '',
      ingredients: [{ n: '赤小豆', a: '30g' }, { n: '炒薏米', a: '20g' }],
      benefits: '经典祛湿消肿组合，改善乏力、虚胖、浮肿。',
      tags: ['湿热', '祛湿', '消肿', '三伏', '日常'],
      note: '务必用「炒薏米」，生薏米偏寒；经期量大的日子少喝。' },
    { id: uid(), name: '陈皮茯苓茶', emoji: '🍊', videoUrl: '',
      ingredients: [{ n: '陈皮', a: '5g' }, { n: '茯苓', a: '15g' }],
      benefits: '理气健脾、燥湿化痰，适合胸闷、痰多、肚子胀的湿热体质。',
      tags: ['湿热', '祛湿', '健脾', '理气', '经期友好', '三伏', '日常'] },
    { id: uid(), name: '冬瓜荷叶茶', emoji: '🍈', videoUrl: '',
      ingredients: [{ n: '冬瓜皮', a: '20g' }, { n: '干荷叶', a: '5g' }],
      benefits: '清热利湿、消脂轻身，适合暑热天水肿、油腻感重。',
      tags: ['湿热', '清热', '利湿', '三伏', '减脂'],
      note: '荷叶偏凉，经期与脾胃虚寒者慎饮。' },
    { id: uid(), name: '玉米须茶', emoji: '🌽', videoUrl: '',
      ingredients: [{ n: '玉米须', a: '10g' }],
      benefits: '平价利尿祛湿、辅助降压，口感清甜好坚持。',
      tags: ['湿热', '利尿', '三伏', '日常'] },
    { id: uid(), name: '广东五花茶', emoji: '🌸', videoUrl: '',
      ingredients: [{ n: '金银花', a: '3g' }, { n: '菊花', a: '3g' }, { n: '槐花', a: '3g' }, { n: '木棉花', a: '5g' }, { n: '鸡蛋花', a: '5g' }],
      benefits: '岭南传统清热祛湿名方，适合湿热长痘、口苦口臭。',
      tags: ['湿热', '清热', '祛湿', '三伏'],
      note: '偏凉，连续喝不超过 3 天，经期停。' },
    { id: uid(), name: '金银花菊花茶', emoji: '🌼', videoUrl: '',
      ingredients: [{ n: '金银花', a: '5g' }, { n: '菊花', a: '3g' }],
      benefits: '清热解毒、疏散风热，暑天咽痛、冒痘时喝。',
      tags: ['湿热', '清热', '解毒', '三伏'],
      note: '性寒，经期与手脚凉者不宜。' },
    { id: uid(), name: '白茅根竹蔗水', emoji: '🥥', videoUrl: '',
      ingredients: [{ n: '白茅根', a: '15g' }, { n: '竹蔗', a: '2节' }, { n: '胡萝卜', a: '1根' }],
      benefits: '清热生津、利尿不寒凉，清甜适口，湿热天全家能喝。',
      tags: ['湿热', '清热', '生津', '三伏', '日常'] },
    { id: uid(), name: '芡实茯苓山药水', emoji: '🍠', videoUrl: '',
      ingredients: [{ n: '芡实', a: '15g' }, { n: '茯苓', a: '15g' }, { n: '山药', a: '30g' }],
      benefits: '健脾固肾祛湿，性质温和，适合长期脾虚湿重。',
      tags: ['湿热', '健脾', '祛湿', '经期友好', '日常'] },
    { id: uid(), name: '陈皮炒米茶', emoji: '🍚', videoUrl: '',
      ingredients: [{ n: '陈皮', a: '5g' }, { n: '炒大米', a: '20g' }],
      benefits: '理气暖胃、燥湿止泻，饭后来一杯很舒服。',
      tags: ['湿热', '理气', '祛湿', '经期友好', '日常'] },
    { id: uid(), name: '荷叶山楂茶', emoji: '🍃', videoUrl: '',
      ingredients: [{ n: '干荷叶', a: '5g' }, { n: '山楂', a: '10g' }],
      benefits: '利湿消食、解腻降脂，聚餐后喝。',
      tags: ['湿热', '利湿', '消食', '三伏'],
      note: '山楂微酸、荷叶凉，经期少喝。' },
    { id: uid(), name: '车前草茶', emoji: '🌿', videoUrl: '',
      ingredients: [{ n: '车前草', a: '10g' }],
      benefits: '清热利尿、通淋，湿热下注、小便黄时喝。',
      tags: ['湿热', '清热', '利尿', '三伏'],
      note: '偏寒，不宜久服，经期停。' },
    { id: uid(), name: '蒲公英茶', emoji: '🌼', videoUrl: '',
      ingredients: [{ n: '蒲公英', a: '5g' }],
      benefits: '清热解毒、消肿散结，适合湿热痘、乳痈。',
      tags: ['湿热', '清热', '解毒', '三伏'],
      note: '苦寒伤胃，脾胃虚者慎用，经期停。' },
    { id: uid(), name: '栀子茯苓茶', emoji: '🟤', videoUrl: '',
      ingredients: [{ n: '栀子', a: '3g' }, { n: '茯苓', a: '15g' }],
      benefits: '清热利湿、除烦安神，心烦失眠的湿热天喝。',
      tags: ['湿热', '清热', '利湿', '三伏'],
      note: '栀子寒，经期与便溏者慎。' },
    { id: uid(), name: '洛神花陈皮水', emoji: '🌺', videoUrl: '',
      ingredients: [{ n: '洛神花', a: '5g' }, { n: '陈皮', a: '3g' }],
      benefits: '清热解暑、生津开胃，酸爽解腻，伏天好入口。',
      tags: ['湿热', '清热', '解暑', '生津', '三伏', '日常'],
      note: '胃酸多者少放洛神花。' },
    { id: uid(), name: '茯苓白术茶', emoji: '🪵', videoUrl: '',
      ingredients: [{ n: '茯苓', a: '15g' }, { n: '炒白术', a: '10g' }],
      benefits: '健脾益气、燥湿利水，脾虚湿重、大便黏者日常喝。',
      tags: ['湿热', '健脾', '祛湿', '经期友好', '日常'] },
    { id: uid(), name: '木棉花薏米水', emoji: '🌼', videoUrl: '',
      ingredients: [{ n: '干木棉花', a: '10g' }, { n: '炒薏米', a: '20g' }],
      benefits: '岭南祛湿经典，清热利湿，回南天/桑拿天尤宜。',
      tags: ['湿热', '清热', '祛湿', '三伏', '日常'] },
  ];

  function get(id) { return LIBRARY.find((t) => t.id === id); }
  function all() { return LIBRARY.slice(); }

  /* ---------- 搜索 / 意图识别 ---------- */
  function analyze(query) {
    const q = (query || '').toLowerCase();
    let context = 'all', label = '为你推荐（湿热体质通用）';
    if (/(姨|生理|例假|大姨妈|经期|来月经|月事)/.test(q)) {
      context = 'period'; label = '姨妈期·湿热体质友好茶饮';
    } else if (/(三伏|暑|夏天|夏季|桑拿天|回南天|闷热)/.test(q)) {
      context = 'sanfu'; label = '三伏天·清热利湿茶饮';
    } else if (/(湿热|湿重|痰湿|体质|祛湿|虚胖|浮肿|出油)/.test(q)) {
      context = 'damp'; label = '湿热体质·日常调理茶饮';
    }
    // 明确点了红茶/绿茶 → 友好过滤
    const banned = /(红茶|绿茶|普洱|乌龙|铁观音|龙井)/.test(q);

    let list = LIBRARY.slice();
    if (context === 'period') list = list.filter((t) => t.tags.includes('经期友好') && !t.tags.includes('经期慎饮'));
    else if (context === 'sanfu') list = list.filter((t) => t.tags.includes('三伏') || (t.tags.includes('清热') && t.tags.includes('祛湿')));
    else if (context === 'damp') list = list.filter((t) => t.tags.includes('湿热'));

    return { context, label, list, banned, query: query || '' };
  }

  /* ---------- 时令 / 季节推荐 ---------- */
  // 由当前节气推导季节：春 / 夏 / 秋 / 冬（三伏归入夏）
  function seasonOf(dateStr) {
    const term = getTerm(dateStr);
    if (term.isSanfu) return '夏';
    const n = term.name;
    if (['小暑', '大暑', '夏至', '芒种', '小满', '立夏'].includes(n)) return '夏';
    if (['立秋', '处暑', '白露', '秋分', '寒露', '霜降'].includes(n)) return '秋';
    if (['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'].includes(n)) return '冬';
    return '春';
  }
  const SEASON_LABEL = {
    春: '春·疏肝健脾祛湿', 夏: '夏·清热利湿祛暑',
    秋: '秋·健脾化湿轻润', 冬: '冬·温化健脾祛湿',
  };
  // 每款茶适配的时令（湿热体质视角）：平和茶四季皆可，偏凉茶仅夏/秋
  const SEASON_MAP = {
    '茯苓红豆水': ['春', '夏', '秋', '冬'],
    '赤小豆炒薏米水': ['春', '夏', '秋', '冬'],
    '陈皮茯苓茶': ['春', '夏', '秋', '冬'],
    '冬瓜荷叶茶': ['夏', '秋'],
    '玉米须茶': ['春', '夏', '秋', '冬'],
    '广东五花茶': ['夏'],
    '金银花菊花茶': ['夏'],
    '白茅根竹蔗水': ['夏', '秋'],
    '芡实茯苓山药水': ['春', '夏', '秋', '冬'],
    '陈皮炒米茶': ['春', '夏', '秋', '冬'],
    '荷叶山楂茶': ['夏', '秋'],
    '车前草茶': ['夏'],
    '蒲公英茶': ['夏'],
    '栀子茯苓茶': ['夏'],
    '洛神花陈皮水': ['夏', '秋'],
    '茯苓白术茶': ['春', '夏', '秋', '冬'],
    '木棉花薏米水': ['夏', '秋'],
  };

  // 本周/当季推荐：随节气时令变化（三伏→夏，入秋→秋，立冬→冬……）
  function weekRecommend(dateStr) {
    const season = seasonOf(dateStr);
    const list = LIBRARY.filter((t) => (SEASON_MAP[t.name] || ['春', '夏', '秋', '冬']).includes(season));
    return list.length ? list : LIBRARY.slice();
  }

  /* ---------- 周工具 ---------- */
  function mondayOf(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = (d.getDay() + 6) % 7; // 周一=0
    d.setDate(d.getDate() - dow);
    return fmt(d);
  }
  function fmt(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function weekDates(startStr) {
    const out = [];
    const base = new Date(startStr + 'T00:00:00');
    const dows = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i);
      out.push({ date: fmt(d), dow: dows[i] });
    }
    return out;
  }
  function addDaysStr(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d);
  }

  global.Tea = { LIBRARY, get, all, analyze, getTerm, weekRecommend, seasonOf, SEASON_LABEL, mondayOf, weekDates, addDaysStr, fmt };
})(window);

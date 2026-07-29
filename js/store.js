/* ============================================================
   store.js · 本地数据层（localStorage）
   所有数据持久化在浏览器，无需服务器，离线可用。
   ============================================================ */
(function (global) {
  'use strict';

  const STORE_KEY = 'yueji_workbench_v1';
  const uid = () => Math.random().toString(36).slice(2, 9);

  function todayStr(d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return todayStr(d);
  }

  function defaultData() {
    return {
      user: { name: '小主' },
      habits: [
        { id: uid(), name: '拍八虚', icon: '🤲', videoUrl: '', note: '疏通经络，每天早晚各一次', done: {} },
        { id: uid(), name: '八段锦', icon: '🧘', videoUrl: '', note: '传统养生功法，全套约 12 分钟', done: {} },
        { id: uid(), name: '仙人揉腹', icon: '🌿', videoUrl: '', note: '顺时针揉腹，助消化安眠', done: {} },
      ],
      postureCats: [
        { id: uid(), name: '肩' },
        { id: uid(), name: '背' },
        { id: uid(), name: '臀' },
        { id: uid(), name: '腿' },
        { id: uid(), name: '全身' },
      ],
      postureExercises: [], // {id, catId, name, videoUrl, done:{}}
      recipes: [],          // {id, title, videoUrl, tags:[], ingredients:[], steps:[], tips}
      diary: [],            // {id, date, content, tags:[]}
      plans: [],            // {id, date, title, time, done}
      french: {
        level: 'A1',
        videos: [],         // 用户自添加的教学视频 {topic, url}
        records: {},        // date -> {skills, quiz, quizScore, videos, done}
      },
      viral: { date: '', items: [] },
      viralFavs: [], // 爆款灵感收藏（独立存放，避免被每日 generate 覆盖）
      tea: { favorites: [], week: { start: '', plan: {} } }, // 茶饮管家：收藏id / 周计划
      evening: { energy: 'normal', tasks: [] }, // 晚间任务优先级调度
      settings: { theme: 'purple', name: '小主' },
    };
  }

  let DB = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultData();
      const data = JSON.parse(raw);
      // 简单兜底，确保字段存在
      const def = defaultData();
      return Object.assign(def, data, {
        settings: Object.assign(def.settings, data.settings || {}),
        french: Object.assign(def.french, data.french || {}),
        tea: Object.assign(def.tea, data.tea || {}),
      });
    } catch (e) {
      return defaultData();
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
  }

  /* ---------- 通用打卡 ---------- */
  // coll: 'habits' | 'postureExercises' ；集合项含 done:{date:true}
  function toggleDone(coll, id, date) {
    date = date || todayStr();
    const item = DB[coll].find((x) => x.id === id);
    if (!item) return false;
    item.done = item.done || {};
    if (item.done[date]) delete item.done[date];
    else item.done[date] = true;
    save();
    return !!item.done[date];
  }
  function isDone(coll, id, date) {
    const item = DB[coll].find((x) => x.id === id);
    return !!(item && item.done && item.done[date]);
  }

  /* ---------- 养生习惯 ---------- */
  function addHabit(obj) {
    DB.habits.push(Object.assign({ id: uid(), icon: '🌿', videoUrl: '', note: '', done: {} }, obj));
    save();
  }
  function updateHabit(id, patch) {
    const h = DB.habits.find((x) => x.id === id);
    if (h) Object.assign(h, patch);
    save();
  }
  function removeHabit(id) {
    DB.habits = DB.habits.filter((x) => x.id !== id);
    save();
  }

  /* ---------- 体态锻炼 ---------- */
  function addPostureCat(name) {
    DB.postureCats.push({ id: uid(), name });
    save();
  }
  function removePostureCat(id) {
    DB.postureExercises = DB.postureExercises.filter((e) => e.catId !== id);
    DB.postureCats = DB.postureCats.filter((c) => c.id !== id);
    save();
  }
  function addPostureExercise(catId, obj) {
    DB.postureExercises.push(Object.assign({ id: uid(), catId, videoUrl: '', done: {} }, obj));
    save();
  }
  function updatePostureExercise(id, patch) {
    const e = DB.postureExercises.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
    save();
  }
  function removePostureExercise(id) {
    DB.postureExercises = DB.postureExercises.filter((x) => x.id !== id);
    save();
  }
  function postureByCat(catId) {
    return DB.postureExercises.filter((e) => e.catId === catId);
  }

  /* ---------- 食谱 ---------- */
  function addRecipe(obj) {
    DB.recipes.push(Object.assign({ id: uid(), title: '未命名方子', videoUrl: '', tags: [], ingredients: [], steps: [], tips: '' }, obj));
    save();
    return DB.recipes[DB.recipes.length - 1];
  }
  function updateRecipe(id, patch) {
    const r = DB.recipes.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    save();
  }
  function removeRecipe(id) {
    DB.recipes = DB.recipes.filter((x) => x.id !== id);
    save();
  }

  /* ---------- 日记 ---------- */
  function upsertDiary(date, content) {
    let d = DB.diary.find((x) => x.date === date);
    if (d) d.content = content;
    else DB.diary.push({ id: uid(), date, content });
    save();
    return d || DB.diary[DB.diary.length - 1];
  }
  function getDiary(date) {
    return DB.diary.find((x) => x.date === date);
  }
  function removeDiary(id) {
    DB.diary = DB.diary.filter((x) => x.id !== id);
    save();
  }

  /* ---------- 计划（日历） ---------- */
  function addPlan(obj) {
    DB.plans.push(Object.assign({ id: uid(), date: todayStr(), title: '', time: '', done: false }, obj));
    save();
  }
  function updatePlan(id, patch) {
    const p = DB.plans.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    save();
  }
  function removePlan(id) {
    DB.plans = DB.plans.filter((x) => x.id !== id);
    save();
  }
  function plansOn(date) {
    return DB.plans.filter((p) => p.date === date);
  }

  /* ---------- 法语 ----------
     进度模型：听说读写四项技能，每项每天若干素材条目，
     完成度 = 已勾条目 / 当日条目数；frenchDone 由四项是否全满推导。 */
  function setFrenchLevel(level) { DB.french.level = level; save(); }
  function recordFrench(date, rec) {
    DB.french.records[date] = Object.assign(DB.french.records[date] || {}, rec);
    save();
  }
  function getFrench(date) { return DB.french.records[date]; }
  function ensureFrenchRec(date) {
    const r = DB.french.records[date] || (DB.french.records[date] = {});
    r.skills = r.skills || { listen: {}, speak: {}, read: {}, write: {} };
    return r;
  }
  // 勾选/取消某技能某条素材
  function setFrenchSkillItem(date, skill, id, done) {
    const r = ensureFrenchRec(date);
    r.skills[skill] = r.skills[skill] || {};
    r.skills[skill][id] = Object.assign(r.skills[skill][id] || {}, { done: done });
    save();
  }
  function getFrenchSkillItem(date, skill, id) {
    const r = DB.french.records[date];
    return (r && r.skills && r.skills[skill]) ? (r.skills[skill][id] || null) : null;
  }
  // 写作文本自动保存
  function setFrenchWriteText(date, id, text) {
    const r = ensureFrenchRec(date);
    r.skills.write = r.skills.write || {};
    r.skills.write[id] = Object.assign(r.skills.write[id] || {}, { text: text });
    save();
  }
  // 单项技能进度 {done,total,pct}
  function frenchSkillProgress(date, skill, total) {
    const r = DB.french.records[date];
    let done = 0;
    if (r && r.skills && r.skills[skill]) {
      Object.keys(r.skills[skill]).forEach((id) => { if (r.skills[skill][id].done) done++; });
    }
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  // 今日是否全部完成：手动 done 优先；否则看四项技能是否全满
  function frenchDone(date) {
    const r = DB.french.records[date];
    if (r && r.done) return true; // 手动覆盖（日历补卡）
    const F = global.French;
    if (F && F.SKILLS && F.skillTotals) {
      const lv = DB.french.level;
      const totals = F.skillTotals(date, lv);
      let any = false, all = true;
      F.SKILLS.forEach((sk) => {
        const total = totals[sk.key];
        let done = 0;
        if (r && r.skills && r.skills[sk.key]) {
          Object.keys(r.skills[sk.key]).forEach((id) => { if (r.skills[sk.key][id].done) done++; });
        }
        if (total > 0) { any = true; if (done < total) all = false; }
      });
      if (any) return all;
    }
    return false;
  }
  // 一键完成今日所有技能条目
  function completeFrenchToday(date) {
    const F = global.French;
    if (!F) return;
    const lv = DB.french.level;
    const totals = F.skillTotals(date, lv);
    F.SKILLS.forEach((sk) => {
      F.dailySkillItems(sk.key, date, lv, totals[sk.key]).forEach((it) => {
        setFrenchSkillItem(date, sk.key, it.id, true);
      });
    });
  }
  function toggleFrench(date) {
    const r = DB.french.records[date] || { done: false };
    r.done = !r.done;
    DB.french.records[date] = r;
    save();
    return r.done;
  }
  function setFrenchVideo(date, id, studied) {
    const r = DB.french.records[date] || {};
    r.videos = r.videos || [];
    let it = r.videos.find((x) => x.id === id);
    if (!it) { it = { id: id }; r.videos.push(it); }
    it.studied = studied;
    DB.french.records[date] = r;
    save();
  }

  /* ---------- 主题 ---------- */
  function setTheme(t) { DB.settings.theme = t; save(); applyTheme(); }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', DB.settings.theme || 'purple');
  }

  /* ---------- 爆款灵感收藏 ---------- */
  function isViralFav(id) { return DB.viralFavs.includes(id); }
  function toggleViralFav(id) {
    const i = DB.viralFavs.indexOf(id);
    if (i >= 0) DB.viralFavs.splice(i, 1); else DB.viralFavs.push(id);
    save();
    return isViralFav(id);
  }
  function getViralFavs() { return DB.viralFavs.slice(); }

  /* ---------- 晚间任务优先级调度 ---------- */
  function getEvening() { return DB.evening; }
  function addEveningTask(name, mins, status) {
    const cat = (global.Evening && global.Evening.detectCategory) ? global.Evening.detectCategory(name) : 'B';
    DB.evening.tasks.push({ id: uid(), name: name, mins: Math.max(1, Number(mins) || 15), status: status || 'todo', cat: cat });
    save();
  }
  function toggleEveningTask(id) {
    const t = DB.evening.tasks.find((x) => x.id === id);
    if (t) t.status = t.status === 'done' ? 'todo' : 'done';
    save();
  }
  function setEveningCat(id, cat) {
    const t = DB.evening.tasks.find((x) => x.id === id);
    if (t) t.cat = cat;
    save();
  }
  function setEveningEnergy(level) { DB.evening.energy = level; save(); }
  function removeEveningTask(id) { DB.evening.tasks = DB.evening.tasks.filter((x) => x.id !== id); save(); }
  function clearEvening() { DB.evening.tasks = []; save(); }

  /* ---------- 茶饮管家 ---------- */
  function isTeaFav(id) { return DB.tea.favorites.includes(id); }
  function toggleTeaFav(id) {
    const i = DB.tea.favorites.indexOf(id);
    if (i >= 0) DB.tea.favorites.splice(i, 1); else DB.tea.favorites.push(id);
    save();
    return isTeaFav(id);
  }
  function setTeaDay(date, teaId) {
    DB.tea.week.plan = DB.tea.week.plan || {};
    DB.tea.week.plan[date] = teaId;
    save();
  }
  function clearTeaDay(date) {
    if (DB.tea.week.plan) delete DB.tea.week.plan[date];
    save();
  }
  function getTeaPlan() { return DB.tea.week.plan || {}; }

  /* ---------- 今日聚合（概览/侧栏） ---------- */
  function todaySummary() {
    const t = todayStr();
    const healthDone = DB.habits.filter((h) => h.done && h.done[t]).length;
    const postureDone = DB.postureExercises.filter((e) => e.done && e.done[t]).length;
    const postureTotal = DB.postureExercises.length;
    const french = frenchDone(t);
    const total = healthDone + postureDone + (french ? 1 : 0);
    return { healthDone, healthTotal: DB.habits.length, postureDone, postureTotal, french, total };
  }

  /* ---------- 导出/导入（备份） ---------- */
  function exportData() { return JSON.stringify(DB, null, 2); }
  function importData(json) {
    try {
      const data = JSON.parse(json);
      DB = Object.assign(defaultData(), data);
      save();
      return true;
    } catch (e) { return false; }
  }

  global.Store = {
    get DB() { return DB; },
    save, uid, todayStr, addDays,
    toggleDone, isDone,
    addHabit, updateHabit, removeHabit,
    addPostureCat, removePostureCat, addPostureExercise, updatePostureExercise, removePostureExercise, postureByCat,
    addRecipe, updateRecipe, removeRecipe,
    upsertDiary, getDiary, removeDiary,
    addPlan, updatePlan, removePlan, plansOn,
    setFrenchLevel, recordFrench, getFrench, ensureFrenchRec, setFrenchSkillItem, getFrenchSkillItem, setFrenchWriteText, frenchSkillProgress, frenchDone, completeFrenchToday, toggleFrench, setFrenchVideo,
    setTheme, applyTheme,
    isViralFav, toggleViralFav, getViralFavs,
    isTeaFav, toggleTeaFav, setTeaDay, clearTeaDay, getTeaPlan,
    getEvening, addEveningTask, toggleEveningTask, setEveningCat, setEveningEnergy, removeEveningTask, clearEvening,
    todaySummary, exportData, importData,
  };
})(window);

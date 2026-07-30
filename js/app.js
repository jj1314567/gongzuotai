/* ============================================================
   app.js · 主程序（视图渲染 + 交互）
   ============================================================ */
(function () {
  'use strict';

  const S = Store;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 从用户输入（可能是整段分享文案）里提取并规范化一个可点击的链接。
  // 两种常见坑：① 抖音/小红书分享文本常缺协议头(如 v.douyin.com/xxx、xhslink.com/xxx)，
  //   缺头会被浏览器当成相对路径打不开；② 整段粘贴带标题文字，href 成一坨也无法跳转。
  function extractUrl(text) {
    if (!text) return '';
    const s = String(text).trim();
    if (!s) return '';
    // 1) 优先取完整 http(s) 链接
    let m = s.match(/https?:\/\/[^\s"'<>【】]+/i);
    let raw = m ? m[0] : null;
    // 2) 退而取裸域名/短链：v.douyin.com/... www.xiaohongshu.com/... xhslink.com/...
    if (!raw) {
      m = s.match(/(?:[a-z0-9-]+\.)+(?:com|cn|net|org|tv|me|io|cc|co|app)\b[^\s"'<>【】]*/i);
      raw = m ? m[0] : null;
    }
    if (!raw) return '';
    // 去掉尾部常见标点/括号/书名号
    raw = raw.replace(/[。，、）)】\]】]+$/, '').replace(/^[【(（]+/, '');
    // 缺协议头则补 https://
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    return raw;
  }

  // 当前 UI 临时状态
  const ui = {
    view: 'overview',
    postureCat: null,
    viralItems: [],
    viralFavOnly: false,
    frenchDate: S.todayStr(),
    calMonth: new Date(),
    teaWeekStart: null,
    teaQuery: '',
  };

  /* ---------------- 工具 ---------------- */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 1800);
  }
  function openModal(title, bodyHTML) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    $('#modalMask').hidden = false;
  }
  function closeModal() { $('#modalMask').hidden = true; $('#modalBody').innerHTML = ''; }

  function jumpBtn(url, label) {
    if (!url) return `<span class="jump-btn empty">＋ 加跟练视频</span>`;
    return `<a class="jump-btn" href="${esc(url)}" target="_blank" rel="noopener">${esc(label || '▶ 跳转跟练')}</a>`;
  }
  function emptyHint(msg) { return `<div class="empty">${esc(msg)}</div>`; }

  /* ---------------- 顶栏/问候 ---------------- */
  function refreshTop() {
    const h = new Date().getHours();
    const greet = h < 6 ? '夜深了，注意休息' : h < 11 ? '早安，今天也要好好爱自己' :
      h < 14 ? '午安，记得喝口水放松' : h < 18 ? '下午好，适度起来活动一下' : '晚上好，今天辛苦啦';
    $('#greeting').textContent = greet;
    $('#todayChip').textContent = S.todayStr();
    const s = S.todaySummary();
    $('#miniStatDay').textContent = `今日完成 ${s.total} 项`;
  }

  /* ---------------- 路由 ---------------- */
  const VALID_VIEWS = ['overview', 'health', 'posture', 'recipe', 'diary', 'viral', 'french', 'tea', 'evening', 'calendar', 'settings'];
  function switchView(v) {
    if (!VALID_VIEWS.includes(v)) v = 'overview';
    ui.view = v;
    try { localStorage.setItem('gw_lastview', v); } catch (e) {}
    $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === v));
    const map = {
      overview: renderOverview, health: renderHealth, posture: renderPosture,
      recipe: renderRecipe, diary: renderDiary, viral: renderViral,
      french: renderFrench, tea: renderTea, evening: renderEvening, calendar: renderCalendar, settings: renderSettings,
    };
    (map[v] || renderOverview)();
  }

  /* ============================================================
     概览
     ============================================================ */
  function renderOverview() {
    const s = S.todaySummary();
    const cal = ui.calMonth || new Date();
    const html = `
      <div class="view-head">
        <div><div class="view-title">今日概览</div><div class="view-desc">把每一天，过成喜欢的样子 ✿</div></div>
      </div>
      <div class="ov-hero">
        <h2>${greetLine()}</h2>
        <p>今天${s.total > 0 ? `已经完成了 <b>${s.total}</b> 项打卡，继续加油` : '还没有打卡，挑一件先动起来吧'}。</p>
        <div class="ov-stats">
          <div class="ov-stat"><div class="n">${s.healthDone}/${s.healthTotal}</div><div class="l">养生习惯</div></div>
          <div class="ov-stat"><div class="n">${s.postureDone}/${s.postureTotal}</div><div class="l">体态锻炼</div></div>
          <div class="ov-stat"><div class="n">${s.french ? '✓' : '–'}</div><div class="l">法语学习</div></div>
          <div class="ov-stat"><div class="n">${S.DB.recipes.length}</div><div class="l">我的方子</div></div>
        </div>
      </div>
      <div class="ov-grid">
        <div class="card">
          <div class="sec-title">⚡ 快速入口</div>
          <div class="grid gap" style="display:grid;gap:12px">
            ${quickLink('health', '🌿', '养生打卡', '拍八虚 · 八段锦 · 揉腹')}
            ${quickLink('posture', '💪', '体态锻炼', '肩背臀腿全身')}
            ${quickLink('recipe', '🍲', '食谱方子', '记录你的养生餐')}
            ${quickLink('diary', '📝', '我的日记', '碎碎念自动归纳')}
            ${quickLink('viral', '🔥', '爆款灵感', '每日 10 条可刷新')}
            ${quickLink('french', '🥐', '法语学习', '听说读 + 随堂测')}
            ${quickLink('evening', '🌙', '晚间调度', '下班后优先级')}
          </div>
        </div>
        <div class="card">
          <div class="sec-title">📅 最近计划</div>
          ${recentPlans()}
          <div class="divider"></div>
          <div class="sec-title">💡 今日小贴士</div>
          <p class="muted">养生贵在坚持，不在强度。把 3 件小事放进今天，比计划 10 件却放弃更有用。</p>
        </div>
      </div>`;
    mount(html);
  }
  function greetLine() {
    const h = new Date().getHours();
    return h < 11 ? '早上好，新的一天开始啦' : h < 18 ? '下午好，记得照顾自己' : '晚上好，今天也辛苦了';
  }
  function quickLink(v, ico, title, sub) {
    return `<a class="quick-link" data-view="${v}"><span class="ql-ico">${ico}</span><span><span class="ql-title">${title}</span><br><span class="ql-sub">${sub}</span></span></a>`;
  }
  function recentPlans() {
    const list = S.DB.plans.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 4);
    if (!list.length) return `<p class="muted">还没有计划，去日历添加吧。</p>`;
    return list.map((p) => `<div class="habit" style="padding:10px 12px;margin-bottom:8px">
      <div class="check ${p.done ? 'on' : ''}" data-action="toggle-plan" data-id="${p.id}">${p.done ? '✓' : ''}</div>
      <div class="habit-main"><div class="habit-name">${esc(p.title)}</div><div class="habit-meta">${p.date}${p.time ? ' · ' + esc(p.time) : ''}</div></div>
    </div>`).join('');
  }

  /* ============================================================
     养生打卡
     ============================================================ */
  function renderHealth() {
    const t = S.todayStr();
    const totalDays = S.DB.habits.reduce((sum, h) => sum + Object.keys(h.done || {}).length, 0);
    const doneCount = S.DB.habits.filter((h) => h.done && h.done[t]).length;
    const totalHabits = S.DB.habits.length;
    const allDone = totalHabits > 0 && doneCount === totalHabits;
    const statusText = allDone ? '今日已完成' : '今日未打卡';
    const habits = S.DB.habits.map((h) => {
      const done = !!(h.done && h.done[t]);
      const streak = Object.keys(h.done || {}).length;
      const thumb = h.videoUrl
        ? `<a class="thumb play" href="${esc(h.videoUrl)}" target="_blank" rel="noopener">${h.icon || '🌿'}</a>`
        : `<div class="thumb">${h.icon || '🌿'}</div>`;
      return `<div class="checkin-card ${done ? 'done' : ''}">
        ${thumb}
        <div class="main">
          <div class="title ${done ? 'done' : ''}">${esc(h.name)}</div>
          <div class="desc">${esc(h.note || '点击右侧跳转跟练，完成后再点圆圈打卡')}</div>
          <div class="tags">
            <span class="tag-pill">累计 ${streak} 天</span>
            ${h.videoUrl ? '<span class="tag-pill level">▶ 跟练视频</span>' : ''}
          </div>
        </div>
        <div class="check-circle ${done ? 'on' : ''}" data-action="toggle-habit" data-id="${h.id}">${done ? '✓' : ''}</div>
        <div class="actions">
          <button class="btn ghost sm" data-action="edit-habit" data-id="${h.id}">✎</button>
          <button class="btn danger sm" data-action="del-habit" data-id="${h.id}">🗑</button>
        </div>
      </div>`;
    }).join('');
    const html = `
      <div class="view-head">
        <div><div class="view-title">🌿 养生打卡</div><div class="view-desc">坚持打卡，遇见更好的自己</div></div>
        <button class="btn" data-action="add-habit">＋ 新增习惯</button>
      </div>
      <div class="hero-banner">
        <div>
          <div class="hero-num">${totalDays}</div>
          <div class="hero-label">累计打卡天数</div>
        </div>
        <div class="hero-illust">🧘‍♀️</div>
      </div>
      <div class="today-status">
        <div class="status-dot ${allDone ? 'done' : ''}"></div>
        <span>${statusText} · ${doneCount}/${totalHabits} 项</span>
      </div>
      <div>${habits || emptyHint('还没有习惯，点右上角新增一个吧')}</div>
      <div class="tip-card">
        <div class="tip-title">💡 养生小贴士</div>
        <div class="tip-body">养生贵在坚持，不在强度。把 3 件小事放进今天，比计划 10 件却放弃更有用。晨起一杯温水、睡前揉腹、工作间隙拉伸，都是对身体温柔的照顾。</div>
      </div>`;
    mount(html);
  }

  /* ============================================================
     体态锻炼
     ============================================================ */
  function catEmoji(name) {
    const n = String(name);
    if (/肩|颈|neck/.test(n)) return '🙆‍♀️';
    if (/背|back/.test(n)) return '🦋';
    if (/臀|hip|butt|股/.test(n)) return '🍑';
    if (/腿|leg/.test(n)) return '🦵';
    if (/腰|waist|腹|abs|核心/.test(n)) return '🧘‍♀️';
    if (/全身|whole|full|燃脂|有氧/.test(n)) return '🏃‍♀️';
    return '💪';
  }
  function renderPosture() {
    if (!ui.postureCat && S.DB.postureCats.length) ui.postureCat = S.DB.postureCats[0].id;
    const cat = S.DB.postureCats.find((c) => c.id === ui.postureCat);
    const cats = S.DB.postureCats.map((c) => `
      <div class="cat-btn ${c.id === ui.postureCat ? 'active' : ''}" data-action="posture-cat" data-id="${c.id}">
        <span class="cat-ico">${catEmoji(c.name)}</span>
        <span>${esc(c.name)}</span>
        <span class="cat-del" data-action="del-cat" data-id="${c.id}" title="删除分类">✕</span>
      </div>`).join('');
    const ex = S.postureByCat(ui.postureCat).map((e) => {
      const t = S.todayStr();
      const done = !!(e.done && e.done[t]);
      const streak = Object.keys(e.done || {}).length;
      const thumb = e.videoUrl
        ? `<a class="thumb play" href="${esc(e.videoUrl)}" target="_blank" rel="noopener"></a>`
        : `<div class="thumb">${catEmoji(cat ? cat.name : '')}</div>`;
      return `<div class="checkin-card ${done ? 'done' : ''}">
        ${thumb}
        <div class="main">
          <div class="title ${done ? 'done' : ''}">${esc(e.name)}</div>
          <div class="desc">${esc(e.note || '选择训练视频，完成后再点圆圈打卡')}</div>
          <div class="tags">
            <span class="tag-pill">${esc(cat ? cat.name : '训练')}</span>
            <span class="tag-pill level">累计 ${streak} 天</span>
          </div>
        </div>
        <div class="check-circle ${done ? 'on' : ''}" data-action="toggle-ex" data-id="${e.id}">${done ? '✓' : ''}</div>
        <div class="actions">
          <button class="btn ghost sm" data-action="edit-ex" data-id="${e.id}">✎</button>
          <button class="btn danger sm" data-action="del-ex" data-id="${e.id}">🗑</button>
        </div>
      </div>`;
    }).join('');
    const totalDays = S.DB.postureExercises.reduce((sum, e) => sum + Object.keys(e.done || {}).length, 0);
    const t = S.todayStr();
    const doneToday = S.DB.postureExercises.filter((e) => e.done && e.done[t]).length;
    const totalToday = S.DB.postureExercises.length;
    const allDone = totalToday > 0 && doneToday === totalToday;
    const html = `
      <div class="view-head">
        <div><div class="view-title">💪 体态锻炼</div><div class="view-desc">坚持打卡，遇见更好的自己</div></div>
        <div class="row" style="flex:none">
          <button class="btn ghost" data-action="add-cat">＋ 分类</button>
          <button class="btn" data-action="add-ex">＋ 动作/视频</button>
        </div>
      </div>
      <div class="hero-banner">
        <div>
          <div class="hero-num">${totalDays}</div>
          <div class="hero-label">累计打卡天数</div>
        </div>
        <div class="hero-illust">🏃‍♀️</div>
      </div>
      <div class="cat-grid">${cats || '<span class="muted">还没有分类</span>'}</div>
      <div class="today-status">
        <div class="status-dot ${allDone ? 'done' : ''}"></div>
        <span>${allDone ? '今日已完成' : '今日未打卡'} · ${doneToday}/${totalToday} 项</span>
      </div>
      <div>${ex || emptyHint('该分类下还没有动作，点右上角“动作/视频”添加')}</div>
      <div class="tip-card">
        <div class="tip-title">💪 运动贴士</div>
        <div class="tip-body">运动前后记得拉伸，防止肌肉腿。训练时保持核心收紧，动作质量比次数更重要。坚持比强度更重要，每天进步一点点就是胜利。</div>
      </div>`;
    mount(html);
  }

  /* ============================================================
     食谱方子
     ============================================================ */
  function renderRecipe() {
    const cards = S.DB.recipes.map((r) => `
      <div class="card recipe-card">
        <div class="recipe-title">🍲 ${esc(r.title)} ${jumpBtn(r.videoUrl).replace('jump-btn', 'jump-btn sm')}</div>
        <div class="tag-row">${(r.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="muted">未分类</span>'}</div>
        ${r.ingredients && r.ingredients.length ? `<div><b>用料</b><ul class="ingredients">${r.ingredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}
        ${r.steps && r.steps.length ? `<div><b>做法</b><ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
        ${r.tips ? `<div class="tip-box"><b>💡 饮食小贴士：</b>${esc(r.tips)}</div>` : ''}
        <div class="row" style="margin-top:4px">
          <button class="btn ghost sm" data-action="edit-recipe" data-id="${r.id}">✎ 编辑</button>
          <button class="btn danger sm" data-action="del-recipe" data-id="${r.id}">🗑 删除</button>
        </div>
      </div>`).join('');
    const html = `
      <div class="view-head">
        <div><div class="view-title">食谱 · 养生方子</div><div class="view-desc">粘贴视频链接建立方子，可任意修改步骤；每条附饮食小贴士</div></div>
        <div class="row" style="flex:none">
          <button class="btn ghost" data-action="add-recipe-link">🔗 发视频链接建方子</button>
          <button class="btn" data-action="add-recipe">＋ 手动新建</button>
        </div>
      </div>
      <div class="grid grid-auto">${cards || emptyHint('还没有方子，粘贴视频链接或手动新建')}</div>`;
    mount(html);
  }

  /* ============================================================
     日记
     ============================================================ */
  function renderDiary() {
    const entries = S.DB.diary.slice().sort((a, b) => a.date < b.date ? 1 : -1);
    const list = entries.map((d) => {
      const badge = dayBadge(d.date);
      return `<div class="diary-item">
        <div class="diary-date">${d.date} ${badge}</div>
        <div class="diary-body">${esc(d.content) || '<span class=muted>（空）</span>'}</div>
        <div class="row" style="margin-top:10px;flex:none">
          <button class="btn ghost sm" data-action="edit-diary" data-date="${d.date}">✎ 编辑</button>
          <button class="btn danger sm" data-action="del-diary" data-id="${d.id}">🗑</button>
        </div>
      </div>`;
    }).join('');
    const html = `
      <div class="view-head">
        <div><div class="view-title">我的日记</div><div class="view-desc">记录心得感悟，系统自动归纳卡点并辅助建立 skill</div></div>
        <button class="btn" data-action="edit-diary" data-date="${S.todayStr()}">✍ 写今天</button>
      </div>
      <div class="ov-grid">
        <div>
          <div class="sec-title">📓 日记列表</div>
          <div class="diary-list">${list || emptyHint('还没有日记，写下第一篇吧')}</div>
        </div>
        <div>
          <div class="sec-title">🧠 智能归纳</div>
          ${diaryAnalysis()}
        </div>
      </div>`;
    mount(html);
  }

  // 当天打卡/学习进度标注到日记
  function dayBadge(date) {
    const t = date;
    const hd = S.DB.habits.filter((h) => h.done && h.done[t]).length;
    const pd = S.DB.postureExercises.filter((e) => e.done && e.done[t]).length;
    const fd = S.frenchDone(t);
    const parts = [];
    if (hd) parts.push(`🌿养生${hd}`);
    if (pd) parts.push(`💪体态${pd}`);
    if (fd) parts.push(`🥐法语✓`);
    return parts.length ? `<span class="tag-row" style="display:inline-flex;margin-left:8px">${parts.map((p) => `<span class="tag">${p}</span>`).join('')}</span>` : '';
  }

  // 基于关键词的日记归纳（离线规则版）
  function diaryAnalysis() {
    const all = S.DB.diary;
    if (!all.length) return `<div class="analysis"><p class="muted">写几篇日记后，这里会自动归纳你的情绪、卡点，并建议可建立的 skill。</p></div>`;
    const pos = ['开心', '高兴', '喜欢', '舒服', '轻松', '满足', '幸福', '进步', '坚持', '治愈', '平静'];
    const neg = ['累', '焦虑', '烦', '难过', '压力', '失眠', '委屈', '崩溃', '低落', '疲惫'];
    const stuckWords = ['卡', '卡点', '不会', '难', '烦恼', '坚持不下去', '做不到', '瓶颈', '拖延', '放弃', '犹豫'];
    const skillMap = {
      '睡眠': '睡眠优化 skill（睡前揉腹+泡脚方）',
      '法语': '法语听说读陪练 skill',
      '体态': '体态跟练打卡 skill',
      '饮食': '养生食谱管理 skill',
      '情绪': '情绪日记复盘 skill',
      '护肤': '成分护肤 skill',
      '穿搭': '胶囊衣橱 skill',
    };
    let posC = 0, negC = 0;
    const stuck = [];
    const skillHits = new Set();
    const recent = all.slice(-7);
    recent.forEach((d) => {
      const c = d.content || '';
      pos.forEach((w) => { if (c.includes(w)) posC++; });
      neg.forEach((w) => { if (c.includes(w)) negC++; });
      stuckWords.forEach((w) => {
        if (c.includes(w)) {
          const seg = c.split(/[。！？\n]/).find((s) => s.includes(w));
          if (seg && stuck.length < 6) stuck.push(seg.trim());
        }
      });
      Object.keys(skillMap).forEach((k) => { if (c.includes(k)) skillHits.add(skillMap[k]); });
    });
    const mood = posC > negC ? '整体偏积极 🌤' : negC > posC ? '整体偏疲惫/焦虑 🌧' : '情绪较平稳 ⛅';
    const total = all.length;
    return `<div class="analysis">
      <div class="kpi-row">
        <div class="kpi"><div class="n">${total}</div><div class="l">累计日记</div></div>
        <div class="kpi"><div class="n">${posC}</div><div class="l">积极信号</div></div>
        <div class="kpi"><div class="n">${negC}</div><div class="l">压力信号</div></div>
      </div>
      <h4>📊 情绪概览</h4><p class="line" style="font-size:13.5px;line-height:1.7">近 7 篇：${mood}。${posC && negC ? '有起伏是常态，关注消耗你的事。' : ''}</p>
      <h4 style="margin-top:14px">🚧 可能的卡点</h4>
      ${stuck.length ? `<ul>${stuck.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="muted">暂未识别明显卡点。</p>'}
      <h4 style="margin-top:14px">🛠 建议建立的 skill</h4>
      ${skillHits.size ? `<ul>${Array.from(skillHits).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="muted">继续记录，系统会按你的高频话题给出建议。</p>'}
      <p class="muted" style="margin-top:10px">* 当前为离线关键词归纳，接入 AI 后可做更深度的语义分析。</p>
    </div>`;
  }

  /* ============================================================
     爆款灵感
     ============================================================ */
  function renderViral() {
    if (S.DB.viral.items.length === 0 || shouldRefreshViral()) {
      ui.viralItems = Viral.generate(false);
    } else {
      ui.viralItems = S.DB.viral.items;
    }
    if (ui.viralFavOnly) ui.viralItems = ui.viralItems.filter((v) => S.isViralFav(v.id));
    const favCount = S.DB.viralFavs.length;
    const cards = ui.viralItems.map((v, i) => {
      const fav = S.isViralFav(v.id);
      return `
      <div class="viral-card ${fav ? 'faved' : ''}">
        <button class="viral-fav ${fav ? 'on' : ''}" data-action="viral-fav" data-id="${esc(v.id)}" title="加入收藏">
          <span class="vf-ico">${fav ? '★' : '☆'}</span>
          <span class="vf-txt">${fav ? '已收藏' : '收藏'}</span>
        </button>
        <div class="viral-main">
          <div class="viral-top">
            <span class="vt-platform">${v.platform} · ${v.category}</span>
            <span class="vt-meta">❤ ${esc(v.likes || '—')}　⭐ ${esc(v.saves || '—')}</span>
          </div>
          <div class="vt-title">${esc(v.title)}</div>
          <div class="viral-sec"><h5>钩子文案</h5><div class="line">${esc(v.hook)}</div></div>
          <div class="viral-sec"><h5>爆火逻辑</h5><div class="line">${esc(v.logic)}</div></div>
          <div class="viral-actions">
            <a class="viral-video-btn" href="${esc(v.videoUrl)}" target="_blank" rel="noopener" data-action="viral-video" data-url="${esc(v.videoUrl)}" title="${esc(v.platform)}原视频">看相关视频</a>
            <button class="btn ghost sm" data-action="viral-detail" data-i="${i}">🔍 完整拆解</button>
          </div>
        </div>
      </div>`;
    }).join('');
    const html = `
      <div class="view-head">
        <div><div class="view-title">爆款灵感</div><div class="view-desc">每天 9:00 自动更新 · 不满意可手动刷新</div></div>
        <button class="btn" data-action="viral-refresh">🔄 换一批</button>
      </div>
      <div class="viral-toolbar">
        <span class="chip">🔥 今日 ${S.DB.viral.items.length} 条</span>
        <span class="chip">⭐ 收藏 ${favCount}</span>
        <button class="btn ghost sm ${ui.viralFavOnly ? 'on' : ''}" data-action="viral-favonly">${ui.viralFavOnly ? '✓ 只看收藏' : '⭐ 只看收藏'}</button>
        <span class="muted">覆盖：抖音 / 小红书 · 穿搭带货 / 审美提升。点左侧「☆ 收藏」留存灵感，点「看相关视频」直达原视频，点「完整拆解」看 6 步分析。</span>
      </div>
      ${ui.viralFavOnly && ui.viralItems.length === 0
        ? `<div class="empty">还没有收藏任何灵感 🤔 点卡片左侧「☆ 收藏」即可在这里集中查看 ✨</div>`
        : `<div class="grid grid-2">${cards}</div>`}`;
    mount(html);
  }

  function viralDetail(i) {
    const v = ui.viralItems[i];
    if (!v) return;
    const fav = S.isViralFav(v.id);
    const tl = v.timeline.map((x) => `<div class="tl"><span class="t">${esc(x.t)}</span><span><span class="k k-${esc(x.k)}">${esc(x.k)}</span>${esc(x.d)}</span></div>`).join('');
    // 文案：金句/情绪词高亮（提取引号内内容 + 标注显眼的情绪词）
    const emotionWords = ['爽', '治愈', '焦虑', '共鸣', '松弛', '高级', '逆袭', '满足', '崩溃', '紧绷', '清醒', '通透', '香', '爽感', '自豪', '自卑', '轻松', '欢喜'];
    let ftHTML = esc(v.fullText);
    // 先高亮引号内容
    ftHTML = ftHTML.replace(/[「」“”]/g, (m) => `<span class="gold">${m}</span>`);
    // 再高亮情绪词
    emotionWords.forEach((w) => { ftHTML = ftHTML.split(w).join(`<span class="emo-word">${w}</span>`); });
    const body = `
      <div class="viral-top" style="border-radius:14px;padding:14px;margin-bottom:14px">
        <div class="vt-platform">${v.platform} · ${v.category}</div>
        <div class="vt-title">${esc(v.title)}</div>
        <div class="viral-detail-meta">
          <span>❤ 点赞 ${esc(v.likes || '—')}</span>
          <span>⭐ 收藏 ${esc(v.saves || '—')}</span>
          <a class="viral-video-btn" href="${esc(v.videoUrl)}" target="_blank" rel="noopener" data-action="viral-video" data-url="${esc(v.videoUrl)}">看原视频</a>
          <button class="btn ghost sm" data-action="viral-fav" data-id="${esc(v.id)}" data-from-modal="1">${fav ? '★ 已收藏' : '☆ 加入收藏'}</button>
        </div>
      </div>

      <div class="viral-step">
        <div class="step-no">1</div>
        <div class="step-body">
          <h5>逐秒标注（钩子 / 痛点 / 干货 / 反转 / 高潮 / 结尾）</h5>
          <div class="timeline">${tl}</div>
        </div>
      </div>

      <div class="viral-step">
        <div class="step-no">2</div>
        <div class="step-body">
          <h5>文案（全文案 + 金句 / 情绪词）</h5>
          <div class="line">${ftHTML}</div>
          <div class="line" style="margin-top:8px"><span class="emo">金句：</span><span class="gold">${esc(v.hook)}</span></div>
        </div>
      </div>

      <div class="viral-step">
        <div class="step-no">3</div>
        <div class="step-body"><h5>画面（镜头 / 景别 / 运镜 / 字幕）</h5><div class="line">${esc(v.visuals)}</div></div>
      </div>

      <div class="viral-step">
        <div class="step-no">4</div>
        <div class="step-body"><h5>音频（BGM 名称 / 卡点位置 / 音效）</h5><div class="line">${esc(v.audio)}</div></div>
      </div>

      <div class="viral-step">
        <div class="step-no">5</div>
        <div class="step-body">
          <h5>爆火逻辑（用户痛点 / 情绪共鸣 / 传播点）</h5>
          <div class="line">${esc(v.logic)}</div>
          ${v.whyFire ? `<div class="line" style="margin-top:8px"><span class="emo">为什么火：</span>${esc(v.whyFire)}</div>` : ''}
          ${v.reference ? `<div class="line"><span class="emo">可借鉴：</span>${esc(v.reference)}</div>` : ''}
        </div>
      </div>

      <div class="viral-step">
        <div class="step-no">6</div>
        <div class="step-body">
          <h5>输出：可直接仿写的脚本模板（含时长 / 画面 / 文案 / BGM）</h5>
          <div class="line tpl">${esc(v.template)}</div>
        </div>
      </div>

      <p class="muted" style="margin-top:10px">提示：文案金句「」已高亮、情绪词已标色，照此 6 步结构二创即可。</p>`;
    openModal('📋 脚本拆解 · ' + v.title, body);
  }

  /* ---------- 爆款每日 9:00 自动推送更新 ---------- */
  function shouldRefreshViral() {
    if (new Date().getHours() < 9) return false; // 9 点前不刷新，沿用前一天内容
    return S.DB.viral.date !== S.todayStr();
  }
  function autoRefreshViral() {
    if (!shouldRefreshViral()) return;
    Viral.generate(false);
    toast('🌅 今日爆款灵感已更新');
    if (ui.view === 'viral') renderViral();
  }

  /* ============================================================
     法语学习
     ============================================================ */
  // 浏览器 TTS：用法语朗读素材（听/说模块的点读）
  function speakFr(text) {
    try {
      if (!('speechSynthesis' in window)) { toast('当前环境不支持朗读'); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.85;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function renderFrench() {
    const lvl = French.getLevel(S.DB.french.level);
    const topics = French.lessonTopics(lvl.key);
    const frVideos = S.DB.french.videos || [];
    const lessons = topics.map((t, i) => {
      const v = frVideos.find((x) => x.topic === t);
      return `<div class="fr-lesson">
        <span class="lv">${lvl.key}</span>
        <div class="habit-main" style="flex:1"><div class="habit-name">${i + 1}. ${esc(t)}</div></div>
        ${v ? jumpBtn(v.url) : ''}
        <button class="btn ghost sm" data-action="fr-add-video" data-topic="${esc(t)}">＋ 视频</button>
      </div>`;
    }).join('');
    // 兼容旧数据：保证 quiz 已生成并持久化
    let rec = S.getFrench(ui.frenchDate) || {};
    if (!rec.quiz) rec.quiz = French.genQuiz(S.DB.french.level, 4);
    S.recordFrench(ui.frenchDate, rec);

    // 总进度（听说读写四项之和）
    const totals = French.skillTotals(ui.frenchDate, S.DB.french.level);
    let totDone = 0, totAll = 0;
    French.SKILLS.forEach((sk) => {
      const p = S.frenchSkillProgress(ui.frenchDate, sk.key, totals[sk.key]);
      totDone += p.done; totAll += totals[sk.key];
    });
    const overallPct = totAll ? Math.round((totDone / totAll) * 100) : 0;
    const allDone = overallPct === 100;

    // 渲染单个技能卡片（含具体素材 + 进度条 + 一键跟学视频）
    const renderSkill = (skill) => {
      const total = totals[skill.key];
      const items = French.dailySkillItems(skill.key, ui.frenchDate, S.DB.french.level, total);
      const prog = S.frenchSkillProgress(ui.frenchDate, skill.key, total);
      const pct = prog.pct;
      const itemsHTML = items.map((it) => {
        const st = S.getFrenchSkillItem(ui.frenchDate, skill.key, it.id);
        const done = !!(st && st.done);
        const v = French.getItemVideo(it.id);
        const videoBtn = v ? `<a class="fr-video-btn" href="${esc(v.url)}" target="_blank" rel="noopener" title="${esc(v.title)}">▶ 看视频</a>` : '';
        if (skill.kind === 'write') {
          const text = (st && st.text) || '';
          return `<div class="fr-item ${done ? 'done' : ''}">
            <div class="fr-item-main">
              <div class="fr-item-q">✍️ ${esc(it.prompt)}</div>
              ${it.vocab ? `<div class="fr-item-tip">📌 ${esc(it.vocab)}</div>` : ''}
              <textarea class="fr-write" data-write data-skill="${skill.key}" data-id="${esc(it.id)}" placeholder="在这里用法语写一写，自动保存…">${esc(text)}</textarea>
              <details class="fr-ex"><summary>看示例</summary><div class="fr-ex-body">${esc(it.model)}</div></details>
            </div>
            ${videoBtn ? `<div class="fr-item-foot">${videoBtn}</div>` : ''}
            <button class="check ${done ? 'on' : ''}" data-action="fr-skill-item" data-skill="${skill.key}" data-id="${esc(it.id)}" title="标记完成">${done ? '✓' : ''}</button>
          </div>`;
        }
        const audioBtn = (skill.kind === 'audio')
          ? `<button class="icon-btn fr-tts" data-action="fr-tts" data-text="${esc(it.fr)}" title="朗读">🔊</button>` : '';
        return `<div class="fr-item ${done ? 'done' : ''}">
          <div class="fr-item-main">
            <div class="fr-item-fr">${audioBtn}<span class="fr-fr-text">${esc(it.fr)}</span></div>
            <div class="fr-item-zh">${esc(it.zh)}</div>
            ${it.tip ? `<div class="fr-item-tip">💡 ${esc(it.tip)}</div>` : ''}
          </div>
          ${videoBtn ? `<div class="fr-item-foot">${videoBtn}</div>` : ''}
          <button class="check ${done ? 'on' : ''}" data-action="fr-skill-item" data-skill="${skill.key}" data-id="${esc(it.id)}" title="标记完成">${done ? '✓' : ''}</button>
        </div>`;
      }).join('');
      return `<div class="card fr-skill ${pct === 100 ? 'done' : ''}">
        <div class="fr-skill-head">
          <span class="fr-skill-ico">${skill.ico}</span>
          <span class="fr-skill-name">${skill.name} · ${skill.label.split(' ')[1] || skill.label}</span>
          <span class="fr-skill-pct">${prog.done}/${total} · ${pct}%</span>
        </div>
        <div class="fr-progress ${pct === 100 ? 'done' : ''}"><i style="width:${pct}%"></i></div>
        <div class="fr-items">${itemsHTML}</div>
      </div>`;
    };

    const quizList = rec.quiz;
    const quizHTML = quizList.map((q, qi) => `
      <div class="quiz" style="margin-bottom:12px">
        <div class="q">${qi + 1}. ${esc(q.q)}</div>
        ${q.options.map((o, oi) => `<button class="quiz-opt" data-action="fr-quiz" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join('')}
        <div class="quiz-fb" data-fb="${qi}" style="font-size:12.5px;color:var(--text-soft);margin-top:6px"></div>
      </div>`).join('');

    const html = `
      <div class="view-head">
        <div><div class="view-title">法语学习 · ${lvl.name}</div><div class="view-desc">${esc(lvl.desc)} · 听说读写分项 + 随堂测</div></div>
        <button class="btn ${allDone ? 'ghost' : ''}" data-action="fr-complete">${allDone ? '🎉 今日已完成' : '✓ 一键完成今日'}</button>
      </div>

      <div class="card fr-overall ${allDone ? 'done' : ''}">
        <div class="fr-overall-top"><span>📊 今日总进度</span><span class="fr-overall-pct">${totDone}/${totAll} 项 · ${overallPct}%</span></div>
        <div class="fr-progress big ${overallPct === 100 ? 'done' : ''}"><i style="width:${overallPct}%"></i></div>
        <p class="muted" style="margin:8px 0 0">每学完一条素材就勾一下，进度像看视频一样实时累加；四项全绿即今日完成。</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="sec-title">🎚 选择等级（入门 → 精通）</div>
        <div class="fr-level">
          ${French.LEVELS.map((l) => `<span class="tab ${l.key === lvl.key ? 'active' : ''}" data-action="fr-level" data-key="${l.key}">${l.name}</span>`).join('')}
        </div>
        <div class="sec-title">📚 课程表（可添加自己的教学视频）</div>
        <div class="task-list">${lessons}</div>
      </div>

      <div class="fr-skills">
        ${French.SKILLS.map(renderSkill).join('')}
      </div>

      <div class="card">
        <div class="sec-title">📝 随堂测试</div>
        <p class="muted">每次学完做一组，检验吸收。点选项立即判分。</p>
        ${quizHTML}
        <button class="btn ghost sm" data-action="fr-newquiz">🔁 换一组题</button>
      </div>`;
    mount(html);
  }

  /* ============================================================
     茶饮管家
     ============================================================ */
  function teaCardHTML(t) {
    return `<div class="card recipe-card">
      <div class="recipe-title">${t.emoji} ${esc(t.name)} ${jumpBtn(t.videoUrl).replace('jump-btn', 'jump-btn sm')}</div>
      <div class="tag-row">${t.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
      <div><b>用料配比</b><ul class="ingredients">${t.ingredients.map((i) => `<li>${esc(i.n)} <b>${esc(i.a)}</b></li>`).join('')}</ul></div>
      <div class="tip-box"><b>💡 功效：</b>${esc(t.benefits)}</div>
      ${t.note ? `<p class="muted">⚠️ ${esc(t.note)}</p>` : ''}
      <div class="row" style="margin-top:4px;flex:none">
        <button class="btn ghost sm" data-action="tea-fav" data-id="${t.id}">${S.isTeaFav(t.id) ? '★ 已收藏' : '☆ 收藏'}</button>
      </div>
    </div>`;
  }

  function renderTea() {
    if (!ui.teaWeekStart) ui.teaWeekStart = Tea.mondayOf(S.todayStr());
    const term = Tea.getTerm(S.todayStr());
    const q = (ui.teaQuery || '').trim();
    const res = q ? Tea.analyze(q) : null;
    const recList = res ? res.list : Tea.weekRecommend(S.todayStr());
    const bannedNote = res && res.banned
      ? `<div class="tip-box" style="margin-bottom:12px"><b>已按你的偏好过滤</b>：红茶、绿茶及普洱/乌龙类均不推荐，下面都是适合湿热体质的草本茶。</div>`
      : '';
    const season = Tea.seasonOf(S.todayStr());
    const recTitle = res ? res.label : `本周推荐 · 当前「${term.name}」· ${Tea.SEASON_LABEL[season]}`;
    const cards = recList.length ? recList.map((t) => teaCardHTML(t)).join('') : emptyHint('没有匹配的茶饮，换个说法试试～');

    const week = Tea.weekDates(ui.teaWeekStart);
    const plan = S.getTeaPlan();
    const dayCards = week.map((w) => {
      const t = plan[w.date] ? Tea.get(plan[w.date]) : null;
      return `<div class="cal-cell ${w.date === S.todayStr() ? 'today' : ''}" data-action="tea-day" data-date="${w.date}" style="min-height:104px">
        <div class="dnum">${w.dow}</div>
        <div class="muted" style="font-size:11px">${w.date.slice(5)}</div>
        ${t ? `<div class="recipe-title" style="font-size:13px;margin-top:4px">${t.emoji} ${esc(t.name)}</div>` : '<div class="muted" style="font-size:12px;margin-top:8px">＋ 安排</div>'}
      </div>`;
    }).join('');

    const favs = S.DB.tea.favorites.map((id) => Tea.get(id)).filter(Boolean);
    const favHTML = favs.length ? favs.map((t) => teaCardHTML(t)).join('') : emptyHint('还没有收藏，搜索后点 ☆ 收藏喜欢的茶方');

    const html = `
      <div class="view-head"><div><div class="view-title">🍵 私人茶饮管家</div><div class="view-desc">湿热体质 · 顺节气而饮 · 以周为单位安排</div></div></div>

      <div class="card" style="margin-bottom:18px">
        <div class="ov-hero" style="padding:18px">
          <h2>当前节气：${term.name}</h2>
          <p>${term.tip}</p>
          <p style="margin-top:6px;opacity:.9">🚫 你的偏好：不推荐红茶 / 绿茶，以下均为草本代茶饮。</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="sec-title">🔍 搜一搜今天喝什么</div>
        <div class="row" style="flex:none;align-items:center">
          <input class="input" id="teaSearch" placeholder="如：湿热体质喝什么茶 / 三伏天喝什么茶 / 姨妈期湿热体质喝什么茶" value="${esc(q)}">
          <button class="btn" data-action="tea-search">搜索</button>
          ${q ? `<button class="btn ghost" data-action="tea-clear-search">清空</button>` : ''}
        </div>
        <div class="tabs" style="margin-top:10px">
          <span class="tab" data-action="tea-quick" data-q="湿热体质喝什么茶">湿热体质</span>
          <span class="tab" data-action="tea-quick" data-q="三伏天喝什么茶">三伏天</span>
          <span class="tab" data-action="tea-quick" data-q="姨妈期湿热体质喝什么茶">姨妈期</span>
        </div>
      </div>

      <div class="view-head" style="margin-bottom:12px"><div class="view-title" style="font-size:18px">${recTitle}</div></div>
      ${bannedNote}
      <div class="grid grid-auto">${cards}</div>

      <div class="card" style="margin-top:18px">
        <div class="cal-head">
          <div class="sec-title" style="margin:0">🗓 本周茶饮安排 · 从收藏中挑选（已收藏 ${S.DB.tea.favorites.length} 款）</div>
          <div class="row" style="flex:none">
            <button class="icon-btn" data-action="tea-prev-week">‹</button>
            <button class="icon-btn" data-action="tea-next-week">›</button>
            <button class="btn ghost sm" data-action="tea-autofill">⚡ 自动安排本周</button>
          </div>
        </div>
        <div class="cal-grid">${dayCards}</div>
        <p class="makeup-note">点任意一天，从你收藏的茶里挑一款安排；或一键「自动安排本周」按收藏轮排（收藏为空时用当季推荐兜底）。先在上方推荐页 ☆ 收藏喜欢的茶吧～</p>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="sec-title">⭐ 我的收藏</div>
        <div class="grid grid-auto">${favHTML}</div>
      </div>`;
    mount(html);
  }

  function doTeaSearch() { const v = $('#teaSearch'); if (!v) return; ui.teaQuery = v.value; renderTea(); }
  function teaAutofill() {
    const week = Tea.weekDates(ui.teaWeekStart);
    let pool = S.DB.tea.favorites.map((id) => Tea.get(id)).filter(Boolean);
    if (!pool.length) {
      pool = Tea.weekRecommend(S.todayStr());
      toast('还没有收藏，已用当季推荐先排好，去上方☆收藏喜欢的吧～');
    } else {
      toast('已按收藏安排本周');
    }
    if (!pool.length) return;
    week.forEach((w, i) => S.setTeaDay(w.date, pool[i % pool.length].id));
  }
  function teaPickModal(date) {
    const favs = S.DB.tea.favorites.map((id) => Tea.get(id)).filter(Boolean);
    let pool = favs, note = '';
    if (!pool.length) {
      pool = Tea.weekRecommend(date);
      note = '<p class="muted" style="margin-bottom:10px">你还没有收藏的茶，先显示当季推荐；去上方推荐页点 ☆ 收藏喜欢的，之后就能从这里挑选。</p>';
    }
    const opts = pool.map((t) => `<button class="btn ghost" style="text-align:left;margin-bottom:8px" data-action="tea-assign" data-date="${date}" data-id="${t.id}">${t.emoji} ${esc(t.name)} <span class="muted">· ${esc(t.tags.join('/'))}</span></button>`).join('');
    openModal('安排 ' + date + ' 的茶饮', note + (opts || '<p>暂无推荐</p>') + `
      <div class="divider"></div>
      <button class="btn danger sm" data-action="tea-clear-day" data-date="${date}">🗑 清空当天</button>`);
  }

  /* ============================================================
     晚间任务优先级调度助手
     ============================================================ */
  function renderEvening() {
    const ev = S.DB.evening;
    const energy = ev.energy || 'normal';
    const tasks = ev.tasks || [];
    const top = Evening.computeTop(tasks, energy);
    const pendingCount = tasks.filter((t) => t.status !== 'done').length;

    const scoreOf = (t) => (t._score != null ? t._score
      : +((Evening.WEIGHTS[t.cat] || 4) / Math.max(1, Number(t.mins) || 1) * Evening.ENERGY[energy]).toFixed(2));
    const hero = top
      ? `<div class="eve-hero">
           <div class="eve-hero-label">🌙 现在最该做</div>
           <div class="eve-top-name">${esc(top.name)}</div>
           <div class="eve-top-meta">
             <span class="eve-badge ${top.cat.toLowerCase()}">${Evening.CAT_NAME[top.cat]}</span>
             <span class="eve-muted">权重 ${Evening.WEIGHTS[top.cat]} · 约 ${top.mins} 分钟 · 得分 ${scoreOf(top)}</span>
           </div>
           <div class="eve-hint">💡 ${esc(Evening.hintFor(top, energy))}</div>
           <button class="btn eve-done-btn" data-action="eve-done" data-id="${esc(top.id)}">✓ 这件做完了</button>
         </div>`
      : `<div class="eve-hero empty-hero">
           <div class="eve-hero-label">🌙 晚间调度</div>
           <div class="eve-top-name" style="font-size:20px">今晚没有待办啦</div>
           <div class="eve-hint">🛋️ 全部清空或本来就没安排，安心休息 ✿</div>
         </div>`;

    const energyPills = ['high', 'normal', 'low'].map((lv) =>
      `<span class="tab ${energy === lv ? 'active' : ''}" data-action="eve-energy" data-level="${lv}">${Evening.ENERGY_LABEL[lv]}</span>`).join('');

    const taskRows = tasks.length ? tasks.map((t) => `
      <div class="eve-task ${t.status === 'done' ? 'done' : ''}">
        <button class="eve-badge ${t.cat.toLowerCase()} eve-cat-btn" data-action="eve-cat" data-id="${esc(t.id)}" title="点按切换 S/A/B">${t.cat}</button>
        <span class="eve-task-name">${esc(t.name)}</span>
        <span class="eve-task-mins">${t.mins}分</span>
        <button class="check sm ${t.status === 'done' ? 'on' : ''}" data-action="eve-toggle" data-id="${esc(t.id)}" title="标记完成">${t.status === 'done' ? '✓' : ''}</button>
        <button class="eve-del" data-action="eve-del" data-id="${esc(t.id)}" title="删除">✕</button>
      </div>`).join('')
      : '<div class="muted" style="padding:6px 0">还没有任务，下面粘贴或添加 👇</div>';

    const html = `
      <div class="view-head">
        <div><div class="view-title">🌙 晚间调度</div><div class="view-desc">下班后的事，按长期优先级排好队</div></div>
      </div>
      ${hero}
      <div class="card">
        <div class="sec-title">⚡ 当前状态</div>
        <div class="fr-level" style="margin-bottom:4px">${energyPills}</div>
        <p class="muted">系数：精力充沛 ×1 ｜ 普通疲惫 ×0.8 ｜ 极度疲累 ×0.5。得分 = 权重 ÷ 耗时 × 系数，越高越先做。</p>
      </div>
      <div class="card">
        <div class="sec-title">📥 批量导入</div>
        <p class="muted">粘贴多行，格式：<b>任务名 + 耗时 + 状态</b>。例：<br><code>读书 30 未完成</code> ／ <code>洗碗 15 已完成</code></p>
        <textarea class="textarea" id="eveImport" rows="4" placeholder="读书 30 未完成&#10;副业切片剪辑 60 未完成&#10;洗碗 15 已完成"></textarea>
        <button class="btn sm" data-action="eve-import">⬆ 解析并导入</button>
      </div>
      <div class="card">
        <div class="sec-title">➕ 手动添加</div>
        <div class="eve-add">
          <input class="input" id="eveName" placeholder="任务名，如：晚间体态训练" />
          <input class="input eve-mins" id="eveMins" type="number" min="1" placeholder="分钟" />
          <button class="btn sm" data-action="eve-add">添加</button>
        </div>
      </div>
      <div class="card">
        <div class="sec-title">📋 待办清单 <span class="eve-muted">（${pendingCount} 项待做）</span></div>
        <div class="eve-list">${taskRows}</div>
        ${tasks.length ? `<button class="btn ghost sm" data-action="eve-clear" style="margin-top:8px">🧹 清空今晚</button>` : ''}
      </div>`;
    mount(html);
  }

  /* ============================================================
     日历
     ============================================================ */
  function renderCalendar() {
    const d = ui.calMonth;
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // 周一为始
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) {
      const dd = prevDays - startDow + 1 + i;
      const ds = fmt(y, m - 1, dd);
      cells.push(cell(ds, dd, true));
    }
    for (let dd = 1; dd <= daysInMonth; dd++) cells.push(cell(fmt(y, m, dd), dd, false));
    const total = startDow + daysInMonth;
    const tail = (7 - (total % 7)) % 7;
    for (let i = 1; i <= tail; i++) cells.push(cell(fmt(y, m + 1, i), i, true));

    const html = `
      <div class="view-head">
        <div><div class="view-title">日历</div><div class="view-desc">计划 · 自动标记打卡 · 补卡</div></div>
        <button class="btn" data-action="add-plan">＋ 添加计划</button>
      </div>
      <div class="card">
        <div class="cal-head">
          <button class="icon-btn" data-action="cal-prev">‹</button>
          <div style="font-weight:800;font-size:17px">${y} 年 ${m + 1} 月</div>
          <button class="icon-btn" data-action="cal-next">›</button>
        </div>
        <div class="cal-grid">
          ${['一', '二', '三', '四', '五', '六', '日'].map((w) => `<div class="cal-dow">${w}</div>`).join('')}
          ${cells.join('')}
        </div>
        <div class="makeup-note">图例：<span class="cal-dot health"></span>养生 <span class="cal-dot posture"></span>体态 <span class="cal-dot french"></span>法语 <span class="cal-dot plan"></span>计划。点击任意日期可补卡 / 加计划。</div>
      </div>`;
    mount(html);
  }
  function fmt(y, m, d) {
    const dt = new Date(y, m, d);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  function cell(ds, dd, other) {
    const t = ds;
    const hd = S.DB.habits.filter((h) => h.done && h.done[t]).length;
    const pd = S.DB.postureExercises.filter((e) => e.done && e.done[t]).length;
    const fd = S.frenchDone(t);
    const plans = S.plansOn(t);
    const dots = [];
    if (hd) dots.push('<span class="cal-dot health"></span>');
    if (pd) dots.push('<span class="cal-dot posture"></span>');
    if (fd) dots.push('<span class="cal-dot french"></span>');
    if (plans.length) dots.push('<span class="cal-dot plan"></span>');
    const isToday = ds === S.todayStr();
    return `<div class="cal-cell ${other ? 'other' : ''} ${isToday ? 'today' : ''}" data-action="cal-day" data-date="${ds}">
      <div class="dnum">${dd}</div>
      <div class="cal-dots">${dots.join('')}</div>
      ${plans.length ? `<div class="muted" style="font-size:11px">${esc(plans[0].title)}${plans.length > 1 ? ' +' + (plans.length - 1) : ''}</div>` : ''}
    </div>`;
  }

  // 日期详情（补卡 + 计划）
  function dayDetail(ds) {
    const t = ds;
    const habits = S.DB.habits.map((h) => {
      const done = !!(h.done && h.done[t]);
      return `<div class="dd-row"><div class="dd-label">🌿 ${esc(h.name)}</div>
        <div class="check ${done ? 'on' : ''}" data-action="mk-habit" data-id="${h.id}" data-date="${t}">${done ? '✓' : ''}</div></div>`;
    }).join('');
    const ex = S.DB.postureExercises.map((e) => {
      const done = !!(e.done && e.done[t]);
      return `<div class="dd-row"><div class="dd-label">💪 ${esc(e.name)}</div>
        <div class="check ${done ? 'on' : ''}" data-action="mk-ex" data-id="${e.id}" data-date="${t}">${done ? '✓' : ''}</div></div>`;
    }).join('');
    const fd = S.frenchDone(t);
    const plans = S.plansOn(t).map((p) => `<div class="dd-row">
      <div class="dd-label">📌 ${esc(p.title)} ${p.time ? '(' + esc(p.time) + ')' : ''}</div>
      <div class="check ${p.done ? 'on' : ''}" data-action="mk-plan" data-id="${p.id}">${p.done ? '✓' : ''}</div>
      <button class="btn danger sm" data-action="del-plan" data-id="${p.id}">🗑</button>
    </div>`).join('');
    const body = `
      <div class="day-detail">
        <h3 style="margin-bottom:12px">${t} ${t === S.todayStr() ? '· 今天' : '· 补卡'}</h3>
        <div class="sec-title">🌿 养生习惯补卡</div>${habits || '<p class="muted">无</p>'}
        <div class="sec-title">💪 体态锻炼补卡</div>${ex || '<p class="muted">无动作</p>'}
        <div class="sec-title">🥐 法语（仅标今日有学）</div>
        <div class="dd-row"><div class="dd-label">今日有学</div>
          <div class="check ${fd ? 'on' : ''}" data-action="mk-french" data-date="${t}">${fd ? '✓' : ''}</div></div>
        <div class="sec-title">📌 当日计划</div>${plans || '<p class="muted">暂无</p>'}
        <button class="btn sm" data-action="add-plan-date" data-date="${t}">＋ 添加计划</button>
        <p class="makeup-note">补卡说明：可勾选此前漏打卡的日期；法语不分细项，勾选即标记“今日有学”。</p>
      </div>`;
    openModal('日历 · ' + t, body);
  }

  /* ============================================================
     设置
     ============================================================ */
  function renderSettings() {
    const themes = [
      { k: 'purple', n: '紫韵', g: 'linear-gradient(135deg,#a78bfa,#e9d5ff)' },
      { k: 'green', n: '抹茶绿', g: 'linear-gradient(135deg,#6ee7b7,#d9f99d)' },
      { k: 'yellow', n: '暖阳黄', g: 'linear-gradient(135deg,#fcd34d,#fef3c7)' },
      { k: 'blue', n: '黛蓝', g: 'linear-gradient(135deg,#60a5fa,#cffafe)' },
      { k: 'pink', n: '樱粉', g: 'linear-gradient(135deg,#f9a8d4,#fecdd3)' },
    ];
    const html = `
      <div class="view-head"><div><div class="view-title">设置</div><div class="view-desc">皮肤主题 · 资料 · 数据备份</div></div></div>
      <div class="card">
        <div class="sec-title">🎨 高级皮肤（5 套 · 可随时切换）</div>
        <div class="theme-grid">
          ${themes.map((th) => `<div class="theme-card ${S.DB.settings.theme === th.k ? 'active' : ''}" data-action="set-theme" data-k="${th.k}">
            <div class="theme-swatch" style="background:${th.g}"></div><div class="theme-name">${th.n}</div></div>`).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="sec-title">👤 我的资料</div>
        <div class="field"><label>昵称</label><input class="input" id="setName" value="${esc(S.DB.settings.name)}"></div>
        <button class="btn" data-action="save-name">保存昵称</button>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="sec-title">💾 数据备份</div>
        <p class="muted">所有数据保存在本机浏览器。可导出备份，或导入恢复。</p>
        <div class="row" style="flex:none;margin-top:8px">
          <button class="btn ghost" data-action="export-data">⬇ 导出备份</button>
          <button class="btn ghost" data-action="import-data">⬆ 导入备份</button>
          <button class="btn danger" data-action="reset-data">🗑 清空数据</button>
        </div>
      </div>`;
    mount(html);
  }

  /* ---------------- 挂载 ---------------- */
  function mount(html) { $('#content').innerHTML = html; }

  /* ============================================================
     事件委托
     ============================================================ */
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('.nav-item');
    if (nav) { e.preventDefault(); switchView(nav.dataset.view); return; }
    const ql = e.target.closest('.quick-link');
    if (ql) { switchView(ql.dataset.view); return; }
    // 跳转链接不拦截
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    const id = t.dataset.id;
    switch (a) {
      // 养生
      case 'toggle-habit': { const on = S.toggleDone('habits', id); toast(on ? '已打卡 ✓' : '已取消'); refreshTop(); renderHealth(); break; }
      case 'add-habit': addHabitModal(); break;
      case 'edit-habit': editHabitModal(id); break;
      case 'del-habit': { if (confirm('删除该习惯？')) { S.removeHabit(id); renderHealth(); } break; }
      // 体态
      case 'posture-cat': ui.postureCat = id; renderPosture(); break;
      case 'add-cat': addCatModal(); break;
      case 'del-cat': { if (confirm('删除该分类及下属动作？')) { S.removePostureCat(id); if (ui.postureCat === id) ui.postureCat = null; renderPosture(); } break; }
      case 'add-ex': addExModal(); break;
      case 'edit-ex': editExModal(id); break;
      case 'del-ex': { if (confirm('删除该动作？')) { S.removePostureExercise(id); renderPosture(); } break; }
      case 'toggle-ex': { const on = S.toggleDone('postureExercises', id); toast(on ? '已打卡 ✓' : '已取消'); refreshTop(); renderPosture(); break; }
      // 食谱
      case 'add-recipe': recipeModal(null); break;
      case 'add-recipe-link': recipeLinkModal(); break;
      case 'edit-recipe': recipeModal(id); break;
      case 'del-recipe': { if (confirm('删除该方子？')) { S.removeRecipe(id); renderRecipe(); } break; }
      // 日记
      case 'edit-diary': diaryModal(t.dataset.date); break;
      case 'del-diary': { if (confirm('删除该日记？')) { S.removeDiary(id); renderDiary(); } break; }
      case 'toggle-plan': { const p = S.DB.plans.find((x) => x.id === id); if (p) { S.updatePlan(id, { done: !p.done }); } refreshTop(); renderOverview(); break; }
      // 爆款
      case 'viral-refresh': { ui.viralFavOnly = false; ui.viralItems = Viral.generate(true); toast('已换一批灵感'); renderViral(); break; }
      case 'viral-detail': viralDetail(parseInt(t.dataset.i, 10)); break;
      case 'viral-video': {
        const url = t.dataset.url;
        if (url) {
          e.preventDefault();
          const a = document.createElement('a');
          a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          document.body.appendChild(a); a.click(); a.remove();
        }
        break;
      }
      case 'viral-favonly': ui.viralFavOnly = !ui.viralFavOnly; renderViral(); break;
      case 'viral-fav': {
        const on = S.toggleViralFav(id);
        toast(on ? '已收藏 ★' : '已取消收藏');
        if (ui.view === 'viral') renderViral();
        if (t.dataset.fromModal) { t.textContent = on ? '★ 已收藏' : '☆ 加入收藏'; t.classList.toggle('on', on); }
        break;
      }
      // 茶饮管家
      case 'tea-search': doTeaSearch(); break;
      case 'tea-clear-search': ui.teaQuery = ''; renderTea(); break;
      case 'tea-quick': { $('#teaSearch').value = t.dataset.q; ui.teaQuery = t.dataset.q; renderTea(); break; }
      case 'tea-fav': { const on = S.toggleTeaFav(id); toast(on ? '已收藏 ★' : '已取消收藏'); renderTea(); break; }
      case 'tea-prev-week': ui.teaWeekStart = Tea.addDaysStr(ui.teaWeekStart, -7); renderTea(); break;
      case 'tea-next-week': ui.teaWeekStart = Tea.addDaysStr(ui.teaWeekStart, 7); renderTea(); break;
      case 'tea-autofill': teaAutofill(); renderTea(); break;
      case 'tea-day': teaPickModal(t.dataset.date); break;
      case 'tea-assign': { S.setTeaDay(t.dataset.date, t.dataset.id); closeModal(); renderTea(); toast('已安排'); break; }
      case 'tea-clear-day': { S.clearTeaDay(t.dataset.date); closeModal(); renderTea(); break; }

      /* ---- 晚间任务优先级调度 ---- */
      case 'eve-energy': { S.setEveningEnergy(t.dataset.level); renderEvening(); break; }
      case 'eve-import': {
        const txt = ($('#eveImport') || {}).value || '';
        const list = Evening.parseImport(txt);
        let added = 0, skipped = 0;
        list.forEach((it) => {
          if (Evening.isOutOfScope(it.name)) { skipped++; return; }
          S.addEveningTask(it.name, it.mins, it.status); added++;
        });
        if (skipped) toast('晨练/工作类不纳入，已忽略 ' + skipped + ' 条');
        else if (added) toast('已导入 ' + added + ' 条');
        else toast('没解析到任务，检查格式');
        renderEvening();
        break;
      }
      case 'eve-add': {
        const name = ($('#eveName') || {}).value || '';
        const mins = ($('#eveMins') || {}).value || '';
        if (!name.trim()) { toast('先填任务名'); break; }
        if (Evening.isOutOfScope(name)) { toast('晨练/工作类不纳入晚间排序'); break; }
        S.addEveningTask(name.trim(), mins, 'todo');
        toast('已添加');
        renderEvening();
        break;
      }
      case 'eve-toggle': { S.toggleEveningTask(id); renderEvening(); break; }
      case 'eve-done': { S.toggleEveningTask(id); toast('这件搞定 ✓'); renderEvening(); break; }
      case 'eve-cat': {
        const order = ['S', 'A', 'B'];
        const cur = S.DB.evening.tasks.find((x) => x.id === id);
        if (cur) { const nx = order[(order.indexOf(cur.cat) + 1) % order.length]; S.setEveningCat(id, nx); renderEvening(); }
        break;
      }
      case 'eve-del': { S.removeEveningTask(id); renderEvening(); break; }
      case 'eve-clear': { if (confirm('清空今晚所有任务？')) { S.clearEvening(); renderEvening(); } break; }
      // 法语
      case 'fr-level': S.setFrenchLevel(t.dataset.key); ui.frenchDate = S.todayStr(); renderFrench(); toast('已切到 ' + t.dataset.key); break;
      case 'fr-skill-item': {
        const sk = t.dataset.skill, id = t.dataset.id;
        const cur = S.getFrenchSkillItem(ui.frenchDate, sk, id);
        S.setFrenchSkillItem(ui.frenchDate, sk, id, !(cur && cur.done));
        refreshTop(); renderFrench(); break;
      }
      case 'fr-complete': { S.completeFrenchToday(ui.frenchDate); toast('今日全部完成 🎉'); refreshTop(); renderFrench(); break; }
      case 'fr-tts': speakFr(t.dataset.text); break;
      case 'fr-newquiz': { const r = S.getFrench(ui.frenchDate) || {}; r.quiz = French.genQuiz(S.DB.french.level, 4); S.recordFrench(ui.frenchDate, r); renderFrench(); break; }
      case 'fr-quiz': frQuizAnswer(t.dataset.q, t.dataset.o, t); break;
      case 'fr-add-video': frAddVideoModal(t.dataset.topic); break;
      // 日历
      case 'cal-prev': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); renderCalendar(); break;
      case 'cal-next': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); renderCalendar(); break;
      case 'cal-day': dayDetail(t.dataset.date); break;
      case 'mk-habit': { S.toggleDone('habits', id, t.dataset.date); dayDetail(t.dataset.date); refreshTop(); break; }
      case 'mk-ex': { S.toggleDone('postureExercises', id, t.dataset.date); dayDetail(t.dataset.date); refreshTop(); break; }
      case 'mk-french': { S.toggleFrench(t.dataset.date); dayDetail(t.dataset.date); refreshTop(); break; }
      case 'mk-plan': { S.updatePlan(id, { done: !S.DB.plans.find((p) => p.id === id).done }); dayDetail(t.dataset.date); break; }
      case 'del-plan': { S.removePlan(id); dayDetail(t.dataset.date); break; }
      case 'add-plan': planModal(S.todayStr()); break;
      case 'add-plan-date': planModal(t.dataset.date); break;
      // 设置
      case 'set-theme': S.setTheme(t.dataset.k); renderSettings(); toast('已切换皮肤'); break;
      case 'theme-quick': {
        const order = ['purple', 'green', 'yellow', 'blue', 'pink'];
        const cur = S.DB.settings.theme || 'purple';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        S.setTheme(next); toast('皮肤：' + ({ purple: '紫韵', green: '抹茶绿', yellow: '暖阳黄', blue: '黛蓝', pink: '樱粉' }[next]));
        break;
      }
      case 'save-name': { S.DB.settings.name = $('#setName').value; S.save(); toast('已保存'); break; }
      case 'export-data': exportData(); break;
      case 'import-data': importModal(); break;
      case 'reset-data': { if (confirm('确定清空所有数据？此操作不可恢复！')) { localStorage.removeItem('yueji_workbench_v1'); location.reload(); } break; }
      // 首次引导：把单文件变成手机/桌面 App
      case 'apphint-ok': { try { localStorage.setItem('gw_apphint_v1', '1'); } catch (e) {} closeModal(); break; }
    }
  });

  // 茶饮搜索：回车即搜
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && e.target.id === 'teaSearch') {
      e.preventDefault();
      doTeaSearch();
    }
  });

  // 法语写作文本框：输入即自动保存（不重渲染，避免丢失焦点）
  document.addEventListener('input', (e) => {
    const ta = e.target.closest && e.target.closest('[data-write]');
    if (!ta) return;
    S.setFrenchWriteText(ui.frenchDate, ta.dataset.id, ta.value);
  });

  // 弹层内事件（保存按钮等）
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-modal-action]');
    if (!b) return;
    const a = b.dataset.modalAction;
    if (a === 'close') closeModal();
    if (a === 'save-habit') {
      const id = b.dataset.id; const obj = readHabitForm();
      if (id) S.updateHabit(id, obj); else S.addHabit(obj); closeModal(); renderHealth(); toast('已保存');
    }
    if (a === 'save-cat') { const n = $('#catName').value.trim(); if (n) { S.addPostureCat(n); closeModal(); renderPosture(); } }
    if (a === 'save-ex') {
      const id = b.dataset.id; const obj = readExForm();
      if (id) S.updatePostureExercise(id, obj); else S.addPostureExercise(ui.postureCat, obj); closeModal(); renderPosture(); toast('已保存');
    }
    if (a === 'save-recipe') { const id = b.dataset.id; const obj = readRecipeForm(); if (id) S.updateRecipe(id, obj); else S.addRecipe(obj); closeModal(); renderRecipe(); toast('已保存'); }
    if (a === 'save-recipe-link') {
      const title = ($('#rTitle') && $('#rTitle').value.trim()) || '未命名方子';
      const videoUrl = extractUrl(($('#rVideo') && $('#rVideo').value.trim()) || '');
      S.addRecipe({ title, videoUrl });
      closeModal(); renderRecipe(); toast('已建骨架方子，点“编辑”补全用料与步骤');
    }
    if (a === 'save-diary') { const d = $('#diaryDate').value; S.upsertDiary(d, $('#diaryText').value); closeModal(); renderDiary(); toast('已保存'); }
    if (a === 'save-plan') { const id = b.dataset.id; const obj = readPlanForm(); if (id) S.updatePlan(id, obj); else S.addPlan(obj); closeModal(); renderCalendar(); refreshTop(); toast('已添加'); }
    if (a === 'save-fr-video') { const topic = b.dataset.topic; const url = extractUrl($('#frVideoUrl').value.trim()); frVideosPush(topic, url); closeModal(); renderFrench(); toast('已添加教学视频'); }
    if (a === 'do-import') doImport();
  });

  /* ---------------- 表单读取 ---------------- */
  function readHabitForm() {
    return { name: $('#hName').value.trim() || '新习惯', icon: $('#hIcon').value.trim() || '🌿', note: $('#hNote').value.trim(), videoUrl: extractUrl($('#hVideo').value.trim()) };
  }
  function readExForm() {
    return { name: $('#exName').value.trim() || '新动作', videoUrl: extractUrl($('#exVideo').value.trim()) };
  }
  function readRecipeForm() {
    const ing = $('#rIng').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const stp = $('#rStep').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const tags = $('#rTags').value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    return { title: $('#rTitle').value.trim() || '未命名方子', videoUrl: extractUrl($('#rVideo').value.trim()), tags, ingredients: ing, steps: stp, tips: $('#rTips').value.trim() };
  }
  function readPlanForm() {
    return { date: $('#pDate').value, title: $('#pTitle').value.trim() || '计划', time: $('#pTime').value.trim() };
  }

  /* ---------------- 弹层内容 ---------------- */
  function addHabitModal() {
    openModal('新增养生习惯', `
      <div class="field"><label>名称</label><input class="input" id="hName" placeholder="如：拍八虚"></div>
      <div class="field"><label>图标 emoji</label><input class="input" id="hIcon" value="🌿" maxlength="2"></div>
      <div class="field"><label>备注</label><input class="input" id="hNote" placeholder="如：每天早晚各一次"></div>
      <div class="field"><label>跟练视频链接（抖音/小红书）</label><input class="input" id="hVideo" placeholder="粘贴视频链接，保存后可一键跳转"></div>
      <div class="row" style="flex:none"><button class="btn" data-modal-action="save-habit">保存</button><button class="btn ghost" data-modal-action="close">取消</button></div>`);
  }
  function editHabitModal(id) {
    const h = S.DB.habits.find((x) => x.id === id); if (!h) return;
    openModal('编辑 · ' + h.name, `
      <div class="field"><label>名称</label><input class="input" id="hName" value="${esc(h.name)}"></div>
      <div class="field"><label>图标 emoji</label><input class="input" id="hIcon" value="${esc(h.icon)}" maxlength="2"></div>
      <div class="field"><label>备注</label><input class="input" id="hNote" value="${esc(h.note)}"></div>
      <div class="field"><label>跟练视频链接</label><input class="input" id="hVideo" value="${esc(h.videoUrl)}" placeholder="抖音/小红书链接"></div>
      <button class="btn" data-modal-action="save-habit" data-id="${id}">保存</button>
      <button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function addCatModal() {
    openModal('新增体态分类', `<div class="field"><label>分类名称（如：肩 / 背 / 臀）</label><input class="input" id="catName" placeholder="分类名"></div>
      <button class="btn" data-modal-action="save-cat">添加</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function addExModal() {
    if (!ui.postureCat) { toast('请先选择或新增一个分类'); return; }
    exFormHTML(null);
  }
  function editExModal(id) {
    const e = S.DB.postureExercises.find((x) => x.id === id); if (!e) return;
    openModal('编辑动作 · ' + e.name, `
      <div class="field"><label>动作名称</label><input class="input" id="exName" value="${esc(e.name)}"></div>
      <div class="field"><label>跟练视频链接</label><input class="input" id="exVideo" value="${esc(e.videoUrl)}" placeholder="抖音/小红书链接"></div>
      <button class="btn" data-modal-action="save-ex" data-id="${id}">保存</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function exFormHTML() {
    openModal('新增动作 / 跟练视频', `
      <div class="field"><label>动作名称</label><input class="input" id="exName" placeholder="如：靠墙天使"></div>
      <div class="field"><label>跟练视频链接</label><input class="input" id="exVideo" placeholder="抖音/小红书链接"></div>
      <button class="btn" data-modal-action="save-ex">保存</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function recipeModal(id) {
    const r = id ? S.DB.recipes.find((x) => x.id === id) : null;
    openModal(id ? '编辑方子' : '新建方子', `
      <div class="field"><label>名称</label><input class="input" id="rTitle" value="${r ? esc(r.title) : ''}" placeholder="如：银耳百合羹"></div>
      <div class="field"><label>视频链接（可选）</label><input class="input" id="rVideo" value="${r ? esc(r.videoUrl) : ''}" placeholder="抖音/小红书链接，可一键跳转"></div>
      <div class="field"><label>标签（空格/逗号分隔）</label><input class="input" id="rTags" value="${r ? esc((r.tags || []).join(' ')) : ''}" placeholder="如：滋阴 安神"></div>
      <div class="field"><label>用料（每行一条）</label><textarea class="textarea" id="rIng" placeholder="银耳 半朵&#10;百合 10g">${r ? esc((r.ingredients || []).join('\n')) : ''}</textarea></div>
      <div class="field"><label>做法步骤（每行一步）</label><textarea class="textarea" id="rStep" placeholder="泡发银耳&#10;小火炖40分钟">${r ? esc((r.steps || []).join('\n')) : ''}</textarea></div>
      <div class="field"><label>💡 饮食小贴士</label><textarea class="textarea" id="rTips" placeholder="如：经期也能喝，去湿不寒凉">${r ? esc(r.tips) : ''}</textarea></div>
      <button class="btn" data-modal-action="save-recipe" data-id="${id || ''}">保存</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function recipeLinkModal() {
    openModal('发视频链接建方子', `
      <p class="muted" style="margin-bottom:12px">粘贴抖音/小红书视频链接，系统为你建立方子骨架，请你照视频补充用料与步骤（平台暂不支持自动抓取，手动录入更准确）。</p>
      <div class="field"><label>视频链接</label><input class="input" id="rVideo" placeholder="https://..."></div>
      <div class="field"><label>方子名称（可留空稍后改）</label><input class="input" id="rTitle" placeholder="如：XX养生汤"></div>
      <button class="btn" data-modal-action="save-recipe-link">从链接创建</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function diaryModal(date) {
    const d = S.getDiary(date);
    openModal('日记 · ' + date, `
      ${dayBadge(date) ? `<p class="muted" style="margin-bottom:8px">今日打卡：${dayBadge(date).replace(/<[^>]+>/g, ' ').trim()}</p>` : ''}
      <div class="field"><label>日期</label><input class="input" id="diaryDate" type="date" value="${date}"></div>
      <div class="field"><label>今天的心得 / 碎碎念</label><textarea class="textarea" id="diaryText" style="min-height:160px" placeholder="写下今天发生的事、感受、卡点…">${d ? esc(d.content) : ''}</textarea></div>
      <button class="btn" data-modal-action="save-diary">保存</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function planModal(date) {
    openModal('添加计划', `
      <div class="field"><label>日期</label><input class="input" id="pDate" type="date" value="${date}"></div>
      <div class="field"><label>计划内容</label><input class="input" id="pTitle" placeholder="如：瑜伽课 / 复诊"></div>
      <div class="field"><label>时间（可选）</label><input class="input" id="pTime" placeholder="如：19:30"></div>
      <button class="btn" data-modal-action="save-plan">添加</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function frAddVideoModal(topic) {
    openModal('添加教学视频 · ' + topic, `
      <p class="muted" style="margin-bottom:10px">粘贴法语教学视频链接（B站/抖音/小红书/Youtube 等），保存后即可在课程表中一键跳转。</p>
      <div class="field"><label>视频链接</label><input class="input" id="frVideoUrl" placeholder="https://..."></div>
      <button class="btn" data-modal-action="save-fr-video" data-topic="${esc(topic)}">保存</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  // 法语教学视频记录在 recipes 之外，用习惯 done 之类不合适，这里存到 french.videos
  function frVideosPush(topic, url) {
    S.DB.french.videos = S.DB.french.videos || [];
    S.DB.french.videos.push({ topic, url });
    S.save();
  }
  function frQuizAnswer(qi, oi, t) {
    const quiz = S.getFrench(ui.frenchDate).quiz;
    const q = quiz[parseInt(qi, 10)];
    // 仅定位当前题的 .quiz 块（点击元素向上查找，避免误伤其它题）
    const block = (t && t.closest) ? t.closest('.quiz') : $$('.quiz', $('#content'))[parseInt(qi, 10)];
    const bOpts = $$('.quiz-opt', block);
    bOpts.forEach((b) => (b.disabled = true));
    const correct = q.a === parseInt(oi, 10);
    bOpts[parseInt(oi, 10)].classList.add(correct ? 'correct' : 'wrong');
    if (!correct) bOpts[q.a].classList.add('correct');
    const fb = $('.quiz-fb', block);
    fb.textContent = (correct ? '✓ 答对！' : '✗ 答错。') + ' ' + q.e;
    // 记录正确数
    const r = S.getFrench(ui.frenchDate); r.quizScore = r.quizScore || {}; r.quizScore[qi] = correct; S.recordFrench(ui.frenchDate, r);
  }

  function exportData() {
    const blob = new Blob([S.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '嘎的工作台备份_' + S.todayStr() + '.json';
    a.click();
    toast('已导出备份');
  }
  function importModal() {
    openModal('导入备份', `<p class="muted" style="margin-bottom:10px">粘贴此前导出的 JSON 内容，将覆盖当前数据。</p>
      <textarea class="textarea" id="importText" style="min-height:160px"></textarea>
      <button class="btn" data-modal-action="do-import">导入并覆盖</button><button class="btn ghost" data-modal-action="close">取消</button>`);
  }
  function doImport() {
    const ok = S.importData($('#importText').value);
    if (ok) { closeModal(); toast('导入成功'); switchView('overview'); } else toast('JSON 格式错误');
  }

  /* ---------------- 弹层关闭 ---------------- */
  $('#modalClose').addEventListener('click', closeModal);
  $('#modalMask').addEventListener('click', (e) => { if (e.target.id === 'modalMask') closeModal(); });

  /* ---------------- 首次引导：把单文件变成 App ---------------- */
  function maybeShowAppHint() {
    try { if (localStorage.getItem('gw_apphint_v1') === '1') return; } catch (e) {}
    const html = `
      <div class="apphint">
        <p>把它变成手机 / 电脑上「直接点开」的 App：</p>
        <ul class="ah-list">
          <li><b>安卓手机</b>：用浏览器打开本文件 → 右上角 ⋮ → <b>添加到主屏幕</b>（断网也能开）</li>
          <li><b>iPhone</b>：在电脑该文件夹运行 <code>python3 -m http.server 8000</code>，手机连同一 WiFi，Safari 打开 <code>http://电脑内网IP:8000/本文件</code> → 分享 → <b>添加到主屏幕</b></li>
          <li><b>电脑</b>：双击打开 → 浏览器地址栏右侧 <b>📥 安装</b>，即成独立窗口 App</li>
        </ul>
        <p class="muted">说明：IDE 预览链接是内部代理，手机默认浏览器连不进来；用这个文件最稳，且可离线。</p>
        <div class="row-end"><button class="btn primary" data-action="apphint-ok">知道了，开始用</button></div>
      </div>`;
    openModal('📲 把它变成你的 App', html);
  }

  /* ---------------- 启动 ---------------- */
  S.applyTheme();
  refreshTop();
  let savedView = 'overview';
  try { const sv = localStorage.getItem('gw_lastview'); if (sv && VALID_VIEWS.includes(sv)) savedView = sv; } catch (e) {}
  switchView(savedView);
  maybeShowAppHint();
  // 每天 9:00 自动推送更新爆款（若页面常开，跨过 9 点会自动刷新并提示）
  autoRefreshViral();
  setInterval(autoRefreshViral, 60 * 1000);
})();

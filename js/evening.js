/* ============================================================
   evening.js · 晚间任务优先级调度助手
   规则：
   1) 仅收纳下班后的晚间任务；晨练/工作类不纳入排序范围
   2) 长期权重：S级(核心长期)=10 / A级(健康基建)=7 / B级(日常运维)=4
   3) 标记「已完成」的任务自动剔除，不参与排序
   4) 优先级得分 = 权重 ÷ 预估耗时(分) × 精力适配系数
      (精力充沛=1 / 普通疲惫=0.8 / 极度疲累=0.5)，越高越靠前
   5) 每次只输出当下最该做的 1 件事 + 1 句极简执行提示
   6) 输入约定：任务名 + 耗时 + 状态（未完成/已完成）
   ============================================================ */
(function (global) {
  'use strict';

  const WEIGHTS = { S: 10, A: 7, B: 4 };
  const ENERGY = { high: 1, normal: 0.8, low: 0.5 };
  const ENERGY_LABEL = { high: '精力充沛', normal: '普通疲惫', low: '极度疲累' };
  const CAT_NAME = { S: 'S级·核心长期', A: 'A级·健康基建', B: 'B级·日常运维' };

  // 关键词 → 分类（S→A→B 顺序匹配，命中即定）
  const CAT_KEYWORDS = {
    S: ['创业', '读书', '系统读书', '知识', '储备', '切片', '剪辑', '副业', '阅读', '学习', '写作', '复盘'],
    A: ['体态', '训练', '拉伸', '瑜伽', '健身', '运动', '普拉提', '卷腹', '深蹲', '臀桥', 'keep', 'KEEP'],
    B: ['做饭', '洗碗', '洗衣', '收拾', '家务', '打扫', '买菜', '倒垃圾', '整理', '清洁', '拖地', '收纳', '遛狗'],
  };
  // 超出范围（rule 1）：晨练 / 工作类一律不纳入
  const OUT_OF_SCOPE = ['八段锦', '晨练', '晨跑', '晨间', '早上', '工作', '上班', '开会', '会议', '周报', '日报', '摸鱼', '通勤', '加班'];

  function isOutOfScope(name) {
    return OUT_OF_SCOPE.some((k) => name.indexOf(k) >= 0);
  }
  function detectCategory(name) {
    for (const cat of ['S', 'A', 'B']) {
      if (CAT_KEYWORDS[cat].some((k) => name.indexOf(k) >= 0)) return cat;
    }
    return 'B'; // 兜底：未命中归为日常运维
  }

  // 解析「任务名 + 耗时 + 状态」多行输入（rule 6）
  function parseImport(text) {
    const out = [];
    (text || '').split('\n').forEach((raw) => {
      const line = (raw || '').trim();
      if (!line) return;
      // 先判否定词（未完成/没做等），再判肯定词，避免「未完成」被误判为已完成
      const neg = /(未完成|undo|没完成|没做|未做)/i.test(line);
      const pos = /(已完成|完成|完成啦|done|✓|✔)/i.test(line);
      const done = pos && !neg;
      let work = line.replace(/(已完成|完成|完成啦|done|✓|✔|未完成|undo|没完成|没做|未做)/gi, '').trim();
      // 去掉「第X章/第X节」等序数，避免误把序号当耗时
      work = work.replace(/第[一二三四五六七八九十\d]+[章节节]/g, '');
      // 耗时：优先「数字 + 分钟/分/min」，否则取独立数字
      let mins = 0, m = work.match(/(\d+)\s*(?:分钟|分|min|m)/i);
      if (m) mins = parseInt(m[1], 10);
      else { m = work.match(/(\d+)/); if (m) mins = parseInt(m[1], 10); }
      if (m) work = work.replace(m[0], '');
      const name = work.replace(/[、，,\s]+$/g, '').trim();
      if (!name) return;
      out.push({ name: name, mins: mins || 15, status: done ? 'done' : 'todo' });
    });
    return out;
  }

  // 计算当下最该做的 1 件（rule 3/4）
  function computeTop(tasks, energy) {
    const coef = ENERGY[energy] != null ? ENERGY[energy] : 0.8;
    const pending = (tasks || []).filter((t) => t.status !== 'done' && t.cat !== 'X');
    if (!pending.length) return null;
    let best = null, bestScore = -1;
    pending.forEach((t) => {
      const w = WEIGHTS[t.cat] || 4;
      const mins = Math.max(1, Number(t.mins) || 1);
      const score = (w / mins) * coef;
      t._score = +score.toFixed(3);
      const bw = WEIGHTS[best ? best.cat : 'B'] || 4;
      const better =
        score > bestScore + 1e-9 ||
        (Math.abs(score - bestScore) < 1e-9 && best &&
          (w > bw || (w === bw && mins < (best.mins || 0))));
      if (better) { bestScore = score; best = t; }
    });
    return best;
  }

  // 1 句极简执行提示（rule 5：允许拆长任务、允许非核心顺延）
  function hintFor(task, energy) {
    const mins = Number(task.mins) || 0;
    if (mins >= 45) return '耗时长，拆成 2 段，先开个头就赢。';
    if (energy === 'low' && task.cat === 'B') return '非核心杂事，做不动就顺延明天，别硬扛。';
    if (task.cat === 'S') return '核心长期目标，哪怕只做 15 分钟也值。';
    if (task.cat === 'A') return '健康基建，做完拉伸再躺平。';
    return '快速清掉，给核心任务腾脑子。';
  }

  global.Evening = { WEIGHTS, ENERGY, ENERGY_LABEL, CAT_NAME, isOutOfScope, detectCategory, parseImport, computeTop, hintFor };
})(window);

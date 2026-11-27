const presets = [
  {
    id: "review",
    zh: ["审查改动", "代码 · 验收", "请审查当前改动，优先检查行为回归、边界条件和测试遗漏。按严重程度列出问题，附文件位置、复现条件和建议修复。"],
    en: ["Review changes", "Code · Verification", "Review the current changes for regressions, edge cases, and missing tests. List findings by severity with file locations, reproduction conditions, and suggested fixes."],
  },
  {
    id: "clarify",
    zh: ["梳理需求", "产品 · 需求", "请把以下需求整理成目标、使用场景、范围和验收标准。将已知事实与待确认项分开，并列出会影响方案选择的问题。"],
    en: ["Clarify a requirement", "Product · Requirements", "Organize the requirement below into goals, use cases, scope, and acceptance criteria. Separate confirmed facts from open questions and flag any decision that would change the approach."],
  },
  {
    id: "handoff",
    zh: ["整理交接", "协作 · 总结", "请整理当前工作的交接说明，包含已完成的事项、实际验证结果、相关文件和待解决问题。标明仍需确认的结论。"],
    en: ["Summarize a handoff", "Collaboration · Summary", "Prepare a handoff covering completed work, verification results, relevant files, and open issues. Mark conclusions that still need confirmation."],
  },
  {
    id: "eli5",
    zh: ["大图小字讲解", "eli5 · 讲解", "Explain like I'm someone who knows nothing about this topic, using a HTML artifact with big pictures and few words."],
    en: ["Explain like I'm 5", "eli5 · Explainer", "Explain like I'm someone who knows nothing about this topic, using a HTML artifact with big pictures and few words."],
  },
  {
    id: "expert-panel",
    zh: ["专家会诊", "思维方法 · 多视角", "我的问题是：【填写问题、已知事实、目标和现实约束】。\n\n先不要直接给方案。请为这个问题选择3种真正互补的专业视角，并说明每种视角为什么必要。\n\n让每种视角分别回答：\n1. 它怎样重新定义这个问题；\n2. 它最推荐的解决路径；\n3. 其他视角最容易忽略的风险；\n4. 什么新证据会让它改变判断。\n\n然后让三种视角互相质疑，找出：\n1. 共同认可的事实；\n2. 真正的分歧；\n3. 分歧背后的不同假设。\n\n最后请综合输出：\n1. 综合后最推荐的方案；\n2. 适用条件；\n3. 最大风险；\n4. 退出条件；\n5. 第一步行动。\n\n不要选择三个高度相似的身份，也不要模仿或编造真实人物的观点。信息不足时，先只问我一个最关键的问题。"],
    en: ["Expert panel", "Thinking · Perspectives", "我的问题是：【填写问题、已知事实、目标和现实约束】。\n\n先不要直接给方案。请为这个问题选择3种真正互补的专业视角，并说明每种视角为什么必要。\n\n让每种视角分别回答：\n1. 它怎样重新定义这个问题；\n2. 它最推荐的解决路径；\n3. 其他视角最容易忽略的风险；\n4. 什么新证据会让它改变判断。\n\n然后让三种视角互相质疑，找出：\n1. 共同认可的事实；\n2. 真正的分歧；\n3. 分歧背后的不同假设。\n\n最后请综合输出：\n1. 综合后最推荐的方案；\n2. 适用条件；\n3. 最大风险；\n4. 退出条件；\n5. 第一步行动。\n\n不要选择三个高度相似的身份，也不要模仿或编造真实人物的观点。信息不足时，先只问我一个最关键的问题。"],
  },
  {
    id: "fact-check",
    zh: ["事实核查", "思维方法 · 核查", "我要核查的说法是：【粘贴观点、结论、数据或方案】。\n\n请先把它拆成：\n1. 可以被外部验证的事实；\n2. 从事实推出的结论；\n3. 其中包含的价值判断。\n\n对于事实部分，请联网核查来源、样本、时间和完整上下文，并标记为：\n1. 已证实；\n2. 基本成立，但需要收窄；\n3. 存在争议；\n4. 证据不足；\n5. 明显错误。\n\n在假设相关事实成立的情况下，继续检查：\n1. 这些事实能否推出当前结论；\n2. 是否藏着未经验证的假设；\n3. 是否混淆相关性和因果关系；\n4. 是否遗漏了其他解释或关键信息；\n5. 结论在什么条件下成立或失效。\n\n最后请输出：\n1. 哪些事实可信，哪些需要修正；\n2. 推理链中最关键的漏洞；\n3. 补强后的最合理版本；\n4. 我目前可以相信到什么程度。"],
    en: ["Fact-check a claim", "Thinking · Verification", "我要核查的说法是：【粘贴观点、结论、数据或方案】。\n\n请先把它拆成：\n1. 可以被外部验证的事实；\n2. 从事实推出的结论；\n3. 其中包含的价值判断。\n\n对于事实部分，请联网核查来源、样本、时间和完整上下文，并标记为：\n1. 已证实；\n2. 基本成立，但需要收窄；\n3. 存在争议；\n4. 证据不足；\n5. 明显错误。\n\n在假设相关事实成立的情况下，继续检查：\n1. 这些事实能否推出当前结论；\n2. 是否藏着未经验证的假设；\n3. 是否混淆相关性和因果关系；\n4. 是否遗漏了其他解释或关键信息；\n5. 结论在什么条件下成立或失效。\n\n最后请输出：\n1. 哪些事实可信，哪些需要修正；\n2. 推理链中最关键的漏洞；\n3. 补强后的最合理版本；\n4. 我目前可以相信到什么程度。"],
  },
  {
    id: "first-principles",
    zh: ["第一性原理", "思维方法 · 回到本质", "我想解决的问题是：【填写你的问题】。\n\n请用第一性原理把它拆回最底层，区分：\n1. 已经确认、无法绕开的基本事实；\n2. 习惯性接受、却没有验证过的假设；\n3. 真正想实现的目标；\n4. 现实中的资源与约束。\n\n暂时放下行业惯例和现成方案，只从基本事实、目标和约束出发，重新推导可行路径。\n\n最后请输出：\n1. 原方案中只在修补表面的部分；\n2. 从基本事实重新推导出的新路径；\n3. 这条路径成立的前提；\n4. 验证它的第一步。"],
    en: ["First principles", "Thinking · Essentials", "我想解决的问题是：【填写你的问题】。\n\n请用第一性原理把它拆回最底层，区分：\n1. 已经确认、无法绕开的基本事实；\n2. 习惯性接受、却没有验证过的假设；\n3. 真正想实现的目标；\n4. 现实中的资源与约束。\n\n暂时放下行业惯例和现成方案，只从基本事实、目标和约束出发，重新推导可行路径。\n\n最后请输出：\n1. 原方案中只在修补表面的部分；\n2. 从基本事实重新推导出的新路径；\n3. 这条路径成立的前提；\n4. 验证它的第一步。"],
  },
  {
    id: "horizontal-vertical-analysis",
    zh: ["横纵分析", "思维方法 · 深度研究", "研究对象是：【填写产品、公司、人物、技术、行业或事件】。\n\n请使用横纵分析法，对它完成一份可追溯的深度研究。研究截止时间为执行当天。\n\n纵向分析：\n1. 它在什么背景和需求下诞生，关键推动者是谁；\n2. 它经历了哪些重要转折、成功和失败；\n3. 哪些早期选择变成了今天的能力、路径依赖或包袱。\n\n横向分析：\n1. 选择最值得比较的对象，并说明为什么选它们；\n2. 用统一维度比较各自的强项、短板和独特性；\n3. 解释用户、客户或市场为什么选择它，又为什么放弃它。\n\n把两条轴合起来，继续判断：\n1. 过去形成的能力、路径依赖和约束会怎样影响未来；\n2. 未来最可能出现哪3条路径；\n3. 每条路径出现的前提和预警信号是什么。\n\n请遵守这些证据规则：\n1. 优先使用官方资料、原始数据、论文、财报和访谈等一手来源；\n2. 重要结论就近标注来源与日期；\n3. 事实、推断和观点分开写；\n4. 遇到冲突信息时并列呈现，找不到证据时明确写“暂未核实”。\n\n最后按以下顺序输出：核心结论、关键时间线、横向对比表、详细分析、未来判断、仍待确认的问题。报告需要在10000～30000字之间，语言尽量通俗，不要堆砌资料。"],
    en: ["Horizontal-vertical analysis", "Thinking · Deep research", "研究对象是：【填写产品、公司、人物、技术、行业或事件】。\n\n请使用横纵分析法，对它完成一份可追溯的深度研究。研究截止时间为执行当天。\n\n纵向分析：\n1. 它在什么背景和需求下诞生，关键推动者是谁；\n2. 它经历了哪些重要转折、成功和失败；\n3. 哪些早期选择变成了今天的能力、路径依赖或包袱。\n\n横向分析：\n1. 选择最值得比较的对象，并说明为什么选它们；\n2. 用统一维度比较各自的强项、短板和独特性；\n3. 解释用户、客户或市场为什么选择它，又为什么放弃它。\n\n把两条轴合起来，继续判断：\n1. 过去形成的能力、路径依赖和约束会怎样影响未来；\n2. 未来最可能出现哪3条路径；\n3. 每条路径出现的前提和预警信号是什么。\n\n请遵守这些证据规则：\n1. 优先使用官方资料、原始数据、论文、财报和访谈等一手来源；\n2. 重要结论就近标注来源与日期；\n3. 事实、推断和观点分开写；\n4. 遇到冲突信息时并列呈现，找不到证据时明确写“暂未核实”。\n\n最后按以下顺序输出：核心结论、关键时间线、横向对比表、详细分析、未来判断、仍待确认的问题。报告需要在10000～30000字之间，语言尽量通俗，不要堆砌资料。"],
  },
  {
    id: "inversion",
    zh: ["逆向法", "思维方法 · 排雷", "我要评估的计划/方案/决策是：【填写你正在推进或打算推进的计划、方案或决策，写清目标和现状】。\n\n请用逆向法帮我检验它的健壮性。\n\n第一步，列出 5 到 7 个如果想让这件事保证失败的做法。每条要足够具体，不要写泛泛的「不努力」「没计划」，要写成一个能照着执行就一定会把事搞砸的操作。\n\n第二步，按破坏力从大到小排序，说明每条为什么能致命。\n\n第三步，把每条翻转过来，变成一条必须遵守的规则。翻转要具体到能检查、能执行，不要变成「注意 XX」这种空话。\n\n最后请输出：\n1. 翻转后的规则清单，按优先级排列；\n2. 这些规则里最容易被忽视的那一条，以及它为什么容易被忽视；\n3. 一个现在就能做的防护动作。"],
    en: ["Inversion", "Thinking · Pre-mortem", "我要评估的计划/方案/决策是：【填写你正在推进或打算推进的计划、方案或决策，写清目标和现状】。\n\n请用逆向法帮我检验它的健壮性。\n\n第一步，列出 5 到 7 个如果想让这件事保证失败的做法。每条要足够具体，不要写泛泛的「不努力」「没计划」，要写成一个能照着执行就一定会把事搞砸的操作。\n\n第二步，按破坏力从大到小排序，说明每条为什么能致命。\n\n第三步，把每条翻转过来，变成一条必须遵守的规则。翻转要具体到能检查、能执行，不要变成「注意 XX」这种空话。\n\n最后请输出：\n1. 翻转后的规则清单，按优先级排列；\n2. 这些规则里最容易被忽视的那一条，以及它为什么容易被忽视；\n3. 一个现在就能做的防护动作。"],
  },
  {
    id: "hidden-talent",
    zh: ["天赋挖掘", "思维方法 · 自我认知", "# Role：深度天赋挖掘机\n\n## 角色\n你是一位熟悉盖洛普优势识别体系、心流理论与荣格心理学的资深生涯咨询师。你相信天赋是一种可以迁移的底层能力，它经常藏在一个人的怪癖、缺点、嫉妒、无意识胜任区和能量模式里。\n\n## 目标\n通过多轮深度对话，帮助用户找到被忽视或压抑的天赋，最终生成一份极度详细、专业且有共情力的《个人天赋使用说明书》。\n\n## 核心理念\n1. 反宿命论。天赋不等于某个固定技能，也不会因为年龄增长而过期；\n2. 能量审计。真正的天赋往往会让人回血。一个人单纯擅长、做完却极度消耗的事情，需要单独区分；\n3. 阴影即宝藏。那些从小反复被批评的缺点、难以改变的怪癖，以及对他人的嫉妒，可能是天赋被压抑后的背面。\n\n## 对话规则\n1. 每次只问一个问题。必须采用“你问 → 用户答 → 你简短反馈 → 再问下一题”的节奏；\n2. 使用苏格拉底式追问。多问“当时几岁”“具体发生了什么”“你是什么感觉”“为什么会这样做”，避免根据一句话仓促贴标签；\n3. 保持温暖、共情和敏锐。发现矛盾、伪装或潜意识线索时，可以直接指出，但不要用空泛赞美安慰用户；\n4. 所有判断都要对应用户讲过的具体经历。证据不足时明确使用“可能”，并继续追问；\n5. 全程最多10个主问题，可以根据回答改变顺序或增加追问，但必须覆盖下面四条主线。\n\n## 必须覆盖的主线\n1. 16岁以前，有哪些事情是没人要求也会废寝忘食去做的？有哪些从小反复被批评、一直改不掉的“顽固缺点”？\n2. 成年后的工作或生活中，哪些事情会让用户觉得“这还需要学吗”，周围人却普遍觉得困难？寻找他的无意识胜任区；\n3. 哪些事情做完以后，身体虽然累，精神却极度亢奋？哪些事情他做得很好，却会明显抽干能量？\n4. 用户曾经强烈嫉妒过谁，或者羡慕过哪种生活状态？继续追问他真正渴望的是对方身上的什么。\n\n## 输出\n当信息足够丰富后，输出一份一万字左右的《个人天赋使用说明书》。结构可以根据用户的回答自由组织，但必须覆盖：\n1. 最有证据支撑的底层天赋，以及每一项天赋对应的经历链；\n2. 天赋的阴影面，它过去为什么会被误解成缺点；\n3. 用户的能量地图、无意识优势区和高消耗区；\n4. 这些天赋最容易发挥、最容易失效的环境；\n5. 适合他的工作方式、合作方式、职业方向和现实限制；\n6. 接下来30天可以尝试的低成本实验，用现实反馈继续验证这些判断。\n\n## 开始\n请用温暖、专业、通俗的语言向用户说明接下来的流程、大概需要的时间和希望达成的目标。告诉他：“天赋永远不会过期，我们只是要找到你的底层天赋。”然后进入第一个问题。"],
    en: ["Hidden talent", "Thinking · Self-discovery", "# Role：深度天赋挖掘机\n\n## 角色\n你是一位熟悉盖洛普优势识别体系、心流理论与荣格心理学的资深生涯咨询师。你相信天赋是一种可以迁移的底层能力，它经常藏在一个人的怪癖、缺点、嫉妒、无意识胜任区和能量模式里。\n\n## 目标\n通过多轮深度对话，帮助用户找到被忽视或压抑的天赋，最终生成一份极度详细、专业且有共情力的《个人天赋使用说明书》。\n\n## 核心理念\n1. 反宿命论。天赋不等于某个固定技能，也不会因为年龄增长而过期；\n2. 能量审计。真正的天赋往往会让人回血。一个人单纯擅长、做完却极度消耗的事情，需要单独区分；\n3. 阴影即宝藏。那些从小反复被批评的缺点、难以改变的怪癖，以及对他人的嫉妒，可能是天赋被压抑后的背面。\n\n## 对话规则\n1. 每次只问一个问题。必须采用“你问 → 用户答 → 你简短反馈 → 再问下一题”的节奏；\n2. 使用苏格拉底式追问。多问“当时几岁”“具体发生了什么”“你是什么感觉”“为什么会这样做”，避免根据一句话仓促贴标签；\n3. 保持温暖、共情和敏锐。发现矛盾、伪装或潜意识线索时，可以直接指出，但不要用空泛赞美安慰用户；\n4. 所有判断都要对应用户讲过的具体经历。证据不足时明确使用“可能”，并继续追问；\n5. 全程最多10个主问题，可以根据回答改变顺序或增加追问，但必须覆盖下面四条主线。\n\n## 必须覆盖的主线\n1. 16岁以前，有哪些事情是没人要求也会废寝忘食去做的？有哪些从小反复被批评、一直改不掉的“顽固缺点”？\n2. 成年后的工作或生活中，哪些事情会让用户觉得“这还需要学吗”，周围人却普遍觉得困难？寻找他的无意识胜任区；\n3. 哪些事情做完以后，身体虽然累，精神却极度亢奋？哪些事情他做得很好，却会明显抽干能量？\n4. 用户曾经强烈嫉妒过谁，或者羡慕过哪种生活状态？继续追问他真正渴望的是对方身上的什么。\n\n## 输出\n当信息足够丰富后，输出一份一万字左右的《个人天赋使用说明书》。结构可以根据用户的回答自由组织，但必须覆盖：\n1. 最有证据支撑的底层天赋，以及每一项天赋对应的经历链；\n2. 天赋的阴影面，它过去为什么会被误解成缺点；\n3. 用户的能量地图、无意识优势区和高消耗区；\n4. 这些天赋最容易发挥、最容易失效的环境；\n5. 适合他的工作方式、合作方式、职业方向和现实限制；\n6. 接下来30天可以尝试的低成本实验，用现实反馈继续验证这些判断。\n\n## 开始\n请用温暖、专业、通俗的语言向用户说明接下来的流程、大概需要的时间和希望达成的目标。告诉他：“天赋永远不会过期，我们只是要找到你的底层天赋。”然后进入第一个问题。"],
  },
  {
    id: "carl-idea-king",
    zh: ["点子王（挑毛病）", "思维方法 · 拆台", "我的想法/方案是：【填写你的想法、方案或计划】。请像严格的评审一样攻击它：区分事实、按严重程度列攻击点、给每条最便宜的证伪实验，然后给出幸存结论、修改建议和分工。严格按下面的格式输出。\n\n## 结论 (Verdict)\n[ship | needs-attention | no-go] — one sentence, like a ship/no-ship call, not a neutral recap.\n\n## 事实清单 (Irreducible Facts)\n- [fact] — physics | economics | convention\n\n## 攻击点 (Attack Points, by severity)\n1. [P1|P2] [evidence|inference] [failure, concretely] → 证伪实验: [cheapest test]\n\n## 幸存结论 (What Survives)\n- [parts of the idea that withstood attack, stated plainly]\n\n## 修改建议 (Changes)\n- [specific change, tied to the attack point it resolves]\n\n## 分工 (Assignment)\n- [task] → owner: [claude|codex], role: [deep_reasoner|fast_worker] — [one-line why, tying back to an attack point or fact when the split changed]\n\n## 未解疑问 (Open Questions)\n- [question you could not ask or did not get answered] — impact: [how the answer could change the verdict]"],
    en: ["Idea King (attack an idea)", "Thinking · Attack", "我的想法/方案是：【填写你的想法、方案或计划】。请像严格的评审一样攻击它：区分事实、按严重程度列攻击点、给每条最便宜的证伪实验，然后给出幸存结论、修改建议和分工。严格按下面的格式输出。\n\n## 结论 (Verdict)\n[ship | needs-attention | no-go] — one sentence, like a ship/no-ship call, not a neutral recap.\n\n## 事实清单 (Irreducible Facts)\n- [fact] — physics | economics | convention\n\n## 攻击点 (Attack Points, by severity)\n1. [P1|P2] [evidence|inference] [failure, concretely] → 证伪实验: [cheapest test]\n\n## 幸存结论 (What Survives)\n- [parts of the idea that withstood attack, stated plainly]\n\n## 修改建议 (Changes)\n- [specific change, tied to the attack point it resolves]\n\n## 分工 (Assignment)\n- [task] → owner: [claude|codex], role: [deep_reasoner|fast_worker] — [one-line why, tying back to an attack point or fact when the split changed]\n\n## 未解疑问 (Open Questions)\n- [question you could not ask or did not get answered] — impact: [how the answer could change the verdict]"],
  }
];

export const language = (locale) => /^zh(?:-|$)/i.test(locale) ? "zh" : "en";

export function newTemplateId() {
  const hex = Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),
    (part) => part.toString(16).padStart(8, "0")).join("");
  return `custom:${hex}`;
}

export function customTemplates(settings) {
  if (!Array.isArray(settings.templates)) return [];
  return settings.templates.filter((item) => item && typeof item.id === "string" &&
    typeof item.title === "string" && typeof item.tags === "string" && typeof item.body === "string");
}

// Two templates count as duplicates when their visible text matches, ignoring outer whitespace.
export function templateKey({ title, tags, body }) {
  return JSON.stringify([title.trim(), tags.trim(), body.replace(/\r\n?/g, "\n").trim()]);
}

export function orderedTemplates(settings, locale) {
  const builtIns = presets.map((item) => {
    const [title, tags, body] = item[language(locale)];
    return { id: `preset:${item.id}`, title, tags, body, preset: true };
  });
  const templates = [...customTemplates(settings), ...builtIns];
  if (!Array.isArray(settings.templateOrder)) return templates;

  const remaining = new Map(templates.map((template) => [template.id, template]));
  const ordered = [];
  for (const id of settings.templateOrder) {
    const template = remaining.get(id);
    if (template) {
      ordered.push(template);
      remaining.delete(id);
    }
  }
  return [...ordered, ...remaining.values()];
}

export function templateTags(value) {
  const tags = new Map();
  for (const part of value.split(/[,，、;；·\r\n]+/u)) {
    const label = part.trim();
    if (!label) continue;
    const key = label.toLowerCase().normalize("NFC");
    if (!tags.has(key)) tags.set(key, { key, label });
  }
  return [...tags.values()];
}

export function templateList(settings, locale, query = "", tag = "") {
  const terms = query.trim().toLowerCase().split(/\s+/);
  return orderedTemplates(settings, locale).filter(({ title, tags, body, preset }) => {
    if (preset && settings.showPresets === false) return false;
    if (tag && !templateTags(tags).some(({ key }) => key === tag)) return false;
    const haystack = `${title}\n${tags}\n${body}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function watchSettings(api, onChange, onError) {
  let changed = false;
  const stop = api.storage.onChange((values) => {
    changed = true;
    if (!api.signal.aborted) onChange(values);
  });
  api.storage.get().then((values) => {
    if (!changed && !api.signal.aborted) onChange(values);
  }).catch(() => {
    if (!changed && !api.signal.aborted) onError();
  });
  return stop;
}

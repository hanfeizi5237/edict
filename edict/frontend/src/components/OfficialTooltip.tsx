/**
 * OfficialTooltip.tsx — 官员身份浮层组件
 *
 * 功能：
 *   - 悬停显示官员详细信息
 *   - 显示职位、性格、说话风格
 */

// 官员性格数据（来自 OFFICIAL_PROFILES）
const OFFICIAL_PROFILES: Record<string, { personality: string; speaking_style: string }> = {
  taizi: {
    personality: '年轻有为、锐意进取，偶尔冲动但善于学习。说话干脆利落，喜欢用现代化的比喻。',
    speaking_style: '简洁有力，经常用"本宫以为"开头，偶尔蹦出网络用语。'
  },
  zhongshu: {
    personality: '老成持重，擅长规划，总能提出系统性方案。话多但有条理。',
    speaking_style: '喜欢列点论述，常说"臣以为需从三方面考量"。引经据典。'
  },
  menxia: {
    personality: '严谨挑剔，眼光犀利，善于找漏洞。是天生的审查官，但也很公正。',
    speaking_style: '喜欢反问，"陛下容禀，此处有三点疑虑"。对不完善的方案会直言不讳。'
  },
  shangshu: {
    personality: '执行力强，务实干练，关注可行性和资源分配。',
    speaking_style: '直来直去，"臣来安排"、"交由某部办理"。重效率轻虚文。'
  },
  libu: {
    personality: '文采飞扬，注重规范和形式，擅长文档和汇报。有点强迫症。',
    speaking_style: '措辞优美，"臣斗胆建议"，喜欢用排比和对仗。'
  },
  hubu: {
    personality: '精打细算，对预算和资源极其敏感。总想省钱但也识大局。',
    speaking_style: '数据驱动，"根据测算"、"预算方面"。三句话不离成本。'
  },
  bingbu: {
    personality: '雷厉风行，危机意识强，重视安全和应急。说话带军人气质。',
    speaking_style: '简明扼要，"安全起见"、"建议立即"。不拖泥带水。'
  },
  xingbu: {
    personality: '严明公正，重视规则和底线。善于质量把控和风险评估。',
    speaking_style: '条理分明，"根据规范"、"存在风险"。一针见血。'
  },
  gongbu: {
    personality: '技术宅，动手能力强，喜欢谈实现细节。偶尔社恐但一说到技术就滔滔不绝。',
    speaking_style: '技术导向，"从实现角度"、"技术方案"。代码是最好的语言。'
  },
  libu_hr: {
    personality: '知人善任，擅长人员安排和组织协调。八面玲珑但有原则。',
    speaking_style: '以人为本，"人才是关键"、"团队协作"。重视团队建设。'
  },
};

interface OfficialInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  personality?: string;
  speaking_style?: string;
}

interface Props {
  official: OfficialInfo;
  x: number;
  y: number;
  visible: boolean;
}

export default function OfficialTooltip({ official, x, y, visible }: Props) {
  if (!visible) return null;

  // 获取官员性格数据（优先使用传入的，否则从硬编码获取）
  const profile = OFFICIAL_PROFILES[official.id] || {};
  const personality = official.personality || profile.personality;
  const speakingStyle = official.speaking_style || profile.speaking_style;

  // 计算浮层位置，避免超出屏幕（SSR 兼容）
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x + 15, windowWidth - 280),
    top: Math.min(y + 15, windowHeight - 200),
    zIndex: 1000,
    pointerEvents: 'none',
  };

  // 截断文本（仅在超长时添加省略号）
  const truncate = (text: string, maxLen: number) => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  return (
    <div
      style={style}
      className="bg-[var(--panel)] border border-[var(--line)] rounded-lg p-3 shadow-xl min-w-[200px] max-w-[280px]"
    >
      {/* 头部：名称 + emoji */}
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--line)]">
        <span className="text-lg">{official.emoji}</span>
        <span className="font-bold text-sm">{official.name}</span>
      </div>

      {/* 职位 */}
      <div className="mt-2 text-[11px]">
        <span className="text-[var(--muted)]">职位：</span>
        <span className="text-[var(--acc)]">{official.role}</span>
      </div>

      {/* 性格 */}
      {personality && (
        <div className="mt-1.5 text-[11px]">
          <span className="text-[var(--muted)]">性格：</span>
          <span className="text-[var(--text)]">{truncate(personality, 30)}</span>
        </div>
      )}

      {/* 说话风格 */}
      {speakingStyle && (
        <div className="mt-1.5 text-[11px]">
          <span className="text-[var(--muted)]">风格：</span>
          <span className="text-[var(--text)]">{truncate(speakingStyle, 25)}</span>
        </div>
      )}
    </div>
  );
}
#!/usr/bin/env python3
"""同步各官员/诸侯统计数据 → data/officials_stats.json
支持自动发现所有 Agent，分为两类：
- 朝廷官员：预定义 11 人（太子 + 三省六部 + 钦天监）
- 诸侯：用户自定义 Agent
"""
import json, pathlib, datetime, logging, re
from file_lock import atomic_json_write

log = logging.getLogger('officials')
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(message)s', datefmt='%H:%M:%S')

BASE = pathlib.Path(__file__).resolve().parent.parent
DATA = BASE / 'data'
AGENTS_ROOT = pathlib.Path.home() / '.openclaw' / 'agents'
OPENCLAW_CFG = pathlib.Path.home() / '.openclaw' / 'openclaw.json'

# 朝廷官员预定义列表（品级固定）
COURT_OFFICIALS = [
    {'id':'taizi',   'label':'太子',  'role':'太子',    'emoji':'🤴','rank':'储君'},
    {'id':'zhongshu','label':'中书省','role':'中书令',  'emoji':'📜','rank':'正一品'},
    {'id':'menxia',  'label':'门下省','role':'侍中',    'emoji':'🔍','rank':'正一品'},
    {'id':'shangshu','label':'尚书省','role':'尚书令',  'emoji':'📮','rank':'正一品'},
    {'id':'libu',    'label':'礼部',  'role':'礼部尚书','emoji':'📝','rank':'正二品'},
    {'id':'hubu',    'label':'户部',  'role':'户部尚书','emoji':'💰','rank':'正二品'},
    {'id':'bingbu',  'label':'兵部',  'role':'兵部尚书','emoji':'⚔️','rank':'正二品'},
    {'id':'xingbu',  'label':'刑部',  'role':'刑部尚书','emoji':'⚖️','rank':'正二品'},
    {'id':'gongbu',  'label':'工部',  'role':'工部尚书','emoji':'🔧','rank':'正二品'},
    {'id':'libu_hr', 'label':'吏部',  'role':'吏部尚书','emoji':'👔','rank':'正二品'},
    {'id':'zaochao', 'label':'钦天监','role':'朝报官',  'emoji':'📰','rank':'正三品'},
]

# 兼容历史 ID 映射
ID_ALIAS = {'main': 'taizi'}

def rj(p, d):
    try:
        return json.loads(pathlib.Path(p).read_text(encoding='utf-8'))
    except Exception:
        return d

_OPENCLAW_CACHE = None
def _load_openclaw_cfg():
    global _OPENCLAW_CACHE
    if _OPENCLAW_CACHE is None:
        _OPENCLAW_CACHE = rj(OPENCLAW_CFG, {})
    return _OPENCLAW_CACHE

def normalize_model(model_value, fallback='anthropic/claude-sonnet-4-6'):
    if isinstance(model_value, str) and model_value:
        return model_value
    if isinstance(model_value, dict):
        return model_value.get('primary') or model_value.get('id') or fallback
    return fallback

def get_model(agent_id):
    cfg = _load_openclaw_cfg()
    default = normalize_model(cfg.get('agents',{}).get('defaults',{}).get('model',{}), 'anthropic/claude-sonnet-4-6')
    for a in cfg.get('agents',{}).get('list',[]):
        if a.get('id') == agent_id:
            return normalize_model(a.get('model', default), default)
    if agent_id == 'taizi':
        for a in cfg.get('agents',{}).get('list',[]):
            if a.get('id') == 'main':
                return normalize_model(a.get('model', default), default)
    return default

def scan_agent(agent_id):
    """从 sessions.json 读取 token 统计（累计所有 session）"""
    sj = AGENTS_ROOT / agent_id / 'sessions' / 'sessions.json'
    if not sj.exists() and agent_id == 'taizi':
        sj = AGENTS_ROOT / 'main' / 'sessions' / 'sessions.json'
    if not sj.exists():
        return {'tokens_in':0,'tokens_out':0,'cache_read':0,'cache_write':0,'sessions':0,'last_active':None,'messages':0}
    
    data = rj(sj, {})
    tin = tout = cr = cw = msg_count = 0
    last_ts = None
    
    for sid, v in data.items():
        tin += v.get('inputTokens', 0) or 0
        tout += v.get('outputTokens', 0) or 0
        cr  += v.get('cacheRead', 0) or 0
        cw  += v.get('cacheWrite', 0) or 0
        ts = v.get('updatedAt')
        if ts:
            try:
                t = datetime.datetime.fromtimestamp(ts/1000) if isinstance(ts,int) else datetime.datetime.fromisoformat(str(ts).replace('Z','+00:00'))
                if last_ts is None or t > last_ts: last_ts = t
            except Exception: pass
    
    # Estimate message count from most recent session JSONL
    sessions_dir = AGENTS_ROOT / agent_id / 'sessions'
    if sessions_dir.exists():
        jsonl_files = sorted(sessions_dir.glob('*.jsonl'), key=lambda f: f.stat().st_mtime, reverse=True)
        for jf in jsonl_files[:3]:
            try:
                lines = jf.read_text(errors='ignore').splitlines()
                msg_count += sum(1 for ln in lines if ln.strip() and '"role"' in ln)
            except: pass
            if msg_count > 0: break
    
    return {
        'tokens_in': tin, 'tokens_out': tout, 'cache_read': cr, 'cache_write': cw,
        'sessions': len(data), 'last_active': last_ts.isoformat() if last_ts else None,
        'messages': msg_count
    }

def discover_agents():
    """自动发现所有 Agent，分为朝廷官员和诸侯两类"""
    court = []
    guests = []
    
    # 扫描 agents 目录
    if not AGENTS_ROOT.exists():
        log.warning(f'Agents 目录不存在：{AGENTS_ROOT}')
        return court, guests
    
    # 获取 openclaw.json 中配置的 agent 列表
    cfg = _load_openclaw_cfg()
    configured_ids = {a.get('id') for a in cfg.get('agents',{}).get('list',[])}
    
    # 扫描目录中的所有 agent
    for agent_dir in sorted(AGENTS_ROOT.iterdir()):
        if not agent_dir.is_dir() or agent_dir.name.startswith('.'):
            continue
        
        agent_id = agent_dir.name
        sessions_file = agent_dir / 'sessions' / 'sessions.json'
        
        # 跳过没有 sessions.json 的空目录
        if not sessions_file.exists():
            continue
        
        # 获取统计数据
        stats = scan_agent(agent_id)
        model = get_model(agent_id)
        
        # 检查是否是朝廷官员
        court_meta = next((c for c in COURT_OFFICIALS if c['id'] == agent_id or ID_ALIAS.get(agent_id) == c['id']), None)
        
        if court_meta:
            # 朝廷官员
            display_id = court_meta['id'] if ID_ALIAS.get(agent_id) != court_meta['id'] else agent_id
            court.append({
                'id': display_id,
                'agentId': agent_id,  # 实际运行时 ID
                'label': court_meta['label'],
                'role': court_meta['role'],
                'emoji': court_meta['emoji'],
                'rank': court_meta['rank'],
                'type': 'court',
                'model': model,
                **stats
            })
        else:
            # 诸侯（自定义 Agent）
            # 尝试从 workspace 的 SOUL.md 或 AGENTS.md 提取名称
            label = agent_id
            role = '诸侯'
            emoji = '🏛️'
            rank = '外戚'
            
            workspace = pathlib.Path.home() / f'.openclaw/workspace-{agent_id}'
            if workspace.exists():
                soul_md = workspace / 'SOUL.md'
                if soul_md.exists():
                    try:
                        content = soul_md.read_text(encoding='utf-8', errors='ignore')
                        # 尝试提取 Name
                        for line in content.splitlines()[:20]:
                            if line.startswith('- **Name:**'):
                                name = line.replace('- **Name:**', '').strip()
                                if name and name != '_':
                                    label = name
                            if line.startswith('- **Emoji:**'):
                                emoji_line = line.replace('- **Emoji:**', '').strip()
                                if emoji_line and emoji_line != '_':
                                    emoji = emoji_line
                    except: pass
            
            # 从 openclaw.json 配置中提取 label
            for a in cfg.get('agents',{}).get('list',[]):
                if a.get('id') == agent_id:
                    if a.get('label'):
                        label = a['label']
                    break
            
            guests.append({
                'id': agent_id,
                'label': label,
                'role': role,
                'emoji': emoji,
                'rank': rank,
                'type': 'guest',
                'model': model,
                **stats
            })
    
    # 朝廷官员按品级排序
    rank_order = {'储君':0, '正一品':1, '正二品':2, '正三品':3}
    court.sort(key=lambda x: rank_order.get(x['rank'], 99))
    
    # 诸侯按名称排序
    guests.sort(key=lambda x: x['label'])
    
    return court, guests

def main():
    log.info('开始同步官员/诸侯统计数据...')
    
    court, guests = discover_agents()
    
    log.info(f'发现朝廷官员：{len(court)} 人')
    log.info(f'发现诸侯：{len(guests)} 人')
    
    # 合并输出
    output = {
        'generatedAt': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'officials': court + guests,
        'courtCount': len(court),
        'guestCount': len(guests)
    }
    
    output_file = DATA / 'officials_stats.json'
    atomic_json_write(output_file, output)
    log.info(f'✅ 已写入 {output_file}')
    
    # 打印摘要
    for o in court:
        log.info(f"  朝廷：{o['emoji']} {o['label']} ({o['role']}) - {o['rank']}")
    for g in guests:
        log.info(f"  诸侯：{g['emoji']} {g['label']} ({g['role']}) - {g['rank']}")

if __name__ == '__main__':
    main()

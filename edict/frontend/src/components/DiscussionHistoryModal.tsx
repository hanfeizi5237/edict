/**
 * DiscussionHistoryModal.tsx — 朝堂议政讨论记录弹窗
 *
 * 功能：
 *   - 显示历史讨论记录列表
 *   - 点击列表项展开详情
 *   - 支持搜索/筛选
 */

import { useState, useEffect } from 'react';
import { api, CourtDiscussHistoryItem, CourtDiscussDetailResult, CourtDiscussMessage } from '../api';

// 官员颜色映射
const OFFICIAL_COLORS: Record<string, string> = {
  taizi: '#e8a040', zhongshu: '#a07aff', menxia: '#6a9eff', shangshu: '#2ecc8a',
  libu: '#f5c842', hubu: '#ff9a6a', bingbu: '#ff5270', xingbu: '#cc4444',
  gongbu: '#44aaff', libu_hr: '#9b59b6',
};

const EMOTION_EMOJI: Record<string, string> = {
  neutral: '', confident: '😏', worried: '😟', angry: '😤',
  thinking: '🤔', amused: '😄', happy: '😊',
};

interface Props {
  onClose: () => void;
}

export default function DiscussionHistoryModal({ onClose }: Props) {
  const [records, setRecords] = useState<CourtDiscussHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CourtDiscussDetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载历史列表
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.courtDiscussHistory();
      if (!res.ok) throw new Error(res.error || '加载失败');
      setRecords(res.records || []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 加载详情
  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.courtDiscussDetail(id);
      if (!res.ok) throw new Error(res.error || '加载详情失败');
      setDetail(res);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  // 点击列表项
  const handleSelect = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
    } else {
      setSelectedId(id);
      loadDetail(id);
    }
  };

  // 筛选记录
  const filteredRecords = records.filter((r) =>
    r.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.officials.some((o) => o.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 格式化时间
  const formatTime = (ts: string) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  // 状态标签颜色
  const statusColor: Record<string, string> = {
    concluded: 'text-green-400 bg-green-900/30 border-green-800',
    active: 'text-blue-400 bg-blue-900/30 border-blue-800',
    abandoned: 'text-red-400 bg-red-900/30 border-red-800',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ animation: 'fadeIn .2s' }}
    >
      <div
        className="bg-[var(--panel)] rounded-2xl border border-[var(--line)] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        style={{ animation: 'slideUp .3s' }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <span className="text-sm font-semibold">朝堂议政讨论记录</span>
            <span className="text-xs text-[var(--muted)]">({records.length} 条)</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--muted)] hover:text-[var(--warn)] transition px-2 py-1 rounded"
          >
            ✕ 关闭
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 py-2 border-b border-[var(--line)]">
          <input
            type="text"
            placeholder="搜索议题或官员..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--panel2)] rounded-lg px-3 py-1.5 text-sm border border-[var(--line)] focus:border-[var(--acc)] outline-none"
          />
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* 加载状态 */}
          {loading && (
            <div className="text-center text-sm text-[var(--muted)] py-8">
              <span className="inline-block animate-spin mr-2">⏳</span>
              正在加载历史记录...
            </div>
          )}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="text-center text-sm text-red-400 py-8">
              ❌ {error}
              <button
                onClick={loadHistory}
                className="ml-2 px-2 py-1 rounded border border-red-800 hover:bg-red-900/20 text-xs"
              >
                重试
              </button>
            </div>
          )}

          {/* 空状态 */}
          {!loading && !error && records.length === 0 && (
            <div className="text-center text-sm text-[var(--muted)] py-8">
              📜 暂无讨论记录
            </div>
          )}

          {/* 记录列表 */}
          {!loading && !error && filteredRecords.length > 0 && (
            <div className="space-y-2">
              {filteredRecords.map((record) => (
                <div key={record.id}>
                  {/* 列表项 */}
                  <button
                    onClick={() => handleSelect(record.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedId === record.id
                        ? 'border-[var(--acc)] bg-[var(--acc)]10'
                        : 'border-[var(--line)] hover:border-[var(--acc)]40 hover:bg-[var(--panel2)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{record.topic}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {record.officials.slice(0, 6).map((o) => (
                            <span
                              key={o}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: (OFFICIAL_COLORS[o] || '#6a9eff') + '20',
                                color: OFFICIAL_COLORS[o] || '#6a9eff',
                              }}
                            >
                              {o}
                            </span>
                          ))}
                          {record.officials.length > 6 && (
                            <span className="text-[10px] text-[var(--muted)]">
                              +{record.officials.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            statusColor[record.status] || 'text-[var(--muted)]'
                          }`}
                        >
                          {record.status === 'concluded' ? '已结束' : record.status === 'active' ? '进行中' : '已废弃'}
                        </span>
                        <div className="text-[10px] text-[var(--muted)] mt-1">
                          {formatTime(record.started_at)}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {record.message_count} 条 · {record.round_count} 轮
                        </div>
                      </div>
                    </div>
                    {/* 展开指示 */}
                    <div className="text-center mt-1">
                      <span className="text-[10px] text-[var(--muted)]">
                        {selectedId === record.id ? '▼ 点击收起详情' : '▶ 点击展开详情'}
                      </span>
                    </div>
                  </button>

                  {/* 详情面板 */}
                  {selectedId === record.id && (
                    <div
                      className="mt-2 ml-2 p-3 rounded-lg bg-[var(--panel2)] border border-[var(--line)]"
                      style={{ animation: 'fadeIn .2s' }}
                    >
                      {detailLoading && (
                        <div className="text-center text-xs text-[var(--muted)] py-4">
                          <span className="inline-block animate-spin mr-1">⏳</span>
                          加载详情...
                        </div>
                      )}

                      {detail && !detailLoading && (
                        <div className="space-y-3">
                          {/* 参与官员 */}
                          {detail.officials && detail.officials.length > 0 && (
                            <div>
                              <div className="text-xs text-[var(--muted)] mb-1.5">参朝官员</div>
                              <div className="flex flex-wrap gap-1.5">
                                {detail.officials.map((o) => (
                                  <div
                                    key={o.id}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border"
                                    style={{
                                      borderColor: (OFFICIAL_COLORS[o.id] || '#6a9eff') + '40',
                                      background: (OFFICIAL_COLORS[o.id] || '#6a9eff') + '10',
                                    }}
                                  >
                                    <span className="text-sm">{o.emoji}</span>
                                    <span className="text-xs" style={{ color: OFFICIAL_COLORS[o.id] || '#6a9eff' }}>
                                      {o.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 摘要 */}
                          {detail.summary && (
                            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-800/30">
                              <div className="text-xs text-amber-400 mb-1">📋 议政摘要</div>
                              <div className="text-sm">{detail.summary}</div>
                            </div>
                          )}

                          {/* 消息列表 */}
                          {detail.messages && detail.messages.length > 0 && (
                            <div>
                              <div className="text-xs text-[var(--muted)] mb-1.5">
                                讨论记录 ({detail.messages.length} 条)
                              </div>
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                {detail.messages.map((msg, i) => (
                                  <MessageRow key={i} msg={msg} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 元信息 */}
                          <div className="flex justify-between text-[10px] text-[var(--muted)] pt-2 border-t border-[var(--line)]">
                            <span>开始: {formatTime(detail.started_at || '')}</span>
                            <span>结束: {formatTime(detail.concluded_at || '')}</span>
                            <span>轮次: {detail.round_count || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 消息行组件 ──

function MessageRow({ msg }: { msg: CourtDiscussMessage }) {
  const color = OFFICIAL_COLORS[msg.official_id || ''] || '#6a9eff';

  if (msg.type === 'system') {
    return (
      <div className="text-center text-[10px] text-[var(--muted)] py-0.5 border-b border-dashed border-[var(--line)]">
        {msg.content}
      </div>
    );
  }

  if (msg.type === 'scene_note') {
    return (
      <div className="text-center text-[10px] text-purple-400/70 italic">
        ✦ {msg.content}
      </div>
    );
  }

  if (msg.type === 'emperor') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-gradient-to-br from-amber-900/30 to-amber-800/20 rounded-lg px-2 py-1 border border-amber-700/30">
          <div className="text-[10px] text-amber-400">👑 皇帝</div>
          <div className="text-xs">{msg.content}</div>
        </div>
      </div>
    );
  }

  if (msg.type === 'decree') {
    return (
      <div className="text-center py-1">
        <div className="inline-block bg-gradient-to-r from-amber-900/20 via-purple-900/20 to-amber-900/20 rounded px-2 py-1 border border-amber-600/30">
          <div className="text-[10px] text-amber-400">⚡ 天命降临</div>
          <div className="text-xs">{msg.content}</div>
        </div>
      </div>
    );
  }

  // 官员消息
  return (
    <div className="flex gap-1.5 items-start">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 border"
        style={{ borderColor: color + '50', background: color + '15' }}
      >
        {msg.official_emoji || '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium" style={{ color }}>
            {msg.official_name || '官员'}
          </span>
          {msg.emotion && EMOTION_EMOJI[msg.emotion] && (
            <span className="text-xs">{EMOTION_EMOJI[msg.emotion]}</span>
          )}
        </div>
        <div className="text-xs leading-relaxed">
          {msg.content?.split(/(\*[^*]+\*)/).map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <span key={i} className="text-[var(--muted)] italic">
                  {part.slice(1, -1)}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      </div>
    </div>
  );
}
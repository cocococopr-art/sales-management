import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const PROGRESS_OPTIONS = ["未接触","初回訪問済","継続フォロー中","提案書送付済","契約検討中","契約済","見送り"];
const PROGRESS_COLORS = {
  "未接触":"#e2e8f0","初回訪問済":"#bfdbfe","継続フォロー中":"#fde68a",
  "提案書送付済":"#c7d2fe","契約検討中":"#bbf7d0","契約済":"#86efac","見送り":"#fecaca"
};
const PROGRESS_TEXT = {
  "未接触":"#64748b","初回訪問済":"#1d4ed8","継続フォロー中":"#92400e",
  "提案書送付済":"#4338ca","契約検討中":"#065f46","契約済":"#15803d","見送り":"#991b1b"
};
const CHILD_TYPES = ["医療的ケア児","重症心身障がい児","発達障がい（自閉症等）","知的障がい","肢体不自由","その他"];
const TYPE_TABS = ["全て","児童発達支援","放課後等デイサービス"];
const TYPE_COLORS = {
  "児童発達支援":{ bg:"#eef2ff", text:"#4338ca", border:"#6366f1", dot:"#6366f1" },
  "放課後等デイサービス":{ bg:"#fdf4ff", text:"#7e22ce", border:"#a855f7", dot:"#a855f7" },
  "全て":{ bg:"#f8fafc", text:"#374151", border:"#e2e8f0", dot:"#94a3b8" },
};

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
  .app { min-height: 100vh; }
  .header { background: #fff; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; z-index: 100; padding: 0 24px; }
  .header-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 60px; gap: 12px; }
  .header-title { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .header-icon { width: 32px; height: 32px; border-radius: 8px; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .header-title h1 { font-size: 15px; font-weight: 800; color: #0f172a; white-space: nowrap; }
  .header-title p { font-size: 11px; color: #94a3b8; }
  .header-actions { display: flex; gap: 6px; align-items: center; flex-wrap: nowrap; overflow-x: auto; }
  .btn { padding: 6px 12px; border-radius: 7px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-size: 13px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
  .btn-primary { background: #6366f1; color: #fff; border: none; font-weight: 700; }
  .btn-green { background: #f0fdf4; color: #059669; }
  .btn-view { border: 1px solid #e2e8f0; }
  .btn-view.active { background: #eef2ff; color: #4338ca; border-color: #6366f1; font-weight: 600; }
  .msg-badge { font-size: 12px; color: #059669; font-weight: 600; padding: 4px 10px; background: #f0fdf4; border-radius: 6px; white-space: nowrap; }
  .main { max-width: 1400px; margin: 0 auto; padding: 20px 24px; }
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
  .tab-btn { padding: 10px 20px; border-radius: 10px; border: 2px solid #e2e8f0; background: #fff; color: #64748b; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0; }
  .tab-btn.active { font-weight: 800; }
  .tab-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; display: inline-block; flex-shrink: 0; }
  .tab-count { font-size: 12px; background: #f1f5f9; color: #94a3b8; border-radius: 20px; padding: 1px 8px; font-weight: 700; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: #fff; border-radius: 12px; padding: 16px 20px; border: 1px solid #f1f5f9; }
  .stat-icon { font-size: 22px; margin-bottom: 4px; }
  .stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
  .stat-label { font-size: 12px; color: #94a3b8; margin-top: 4px; font-weight: 600; }
  .filter-bar { background: #fff; border-radius: 12px; padding: 14px 16px; border: 1px solid #f1f5f9; margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .search-row { display: flex; gap: 6px; flex: 1 1 200px; min-width: 200px; }
  .search-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; }
  .search-btn { padding: 8px 16px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .clear-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; font-size: 13px; cursor: pointer; }
  .filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; background: #fff; }
  .result-count { font-size: 13px; color: #94a3b8; margin-left: auto; }
  .facility-list { display: flex; flex-direction: column; gap: 6px; }
  .facility-card { background: #fff; border-radius: 12px; padding: 14px 18px; border: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: box-shadow 0.15s; }
  .facility-card:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.12); }
  .facility-bar { width: 8px; height: 40px; border-radius: 4px; flex-shrink: 0; }
  .facility-info { flex: 1; min-width: 0; }
  .facility-name { font-size: 14px; font-weight: 700; color: #0f172a; }
  .facility-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .facility-badges { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .badge { font-size: 11px; border-radius: 4px; padding: 2px 8px; font-weight: 600; }
  .badge-nursing { background: #fef3c7; color: #92400e; }
  .badge-care { background: #fef3c7; color: #92400e; }
  .badge-child { background: #f0fdf4; color: #166534; }
  .badge-progress { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
  .btn-delete { padding: 3px 8px; border-radius: 5px; border: 1px solid #fecaca; background: #fff5f5; color: #ef4444; font-size: 11px; cursor: pointer; }
  .empty-state { text-align: center; padding: 60px; color: #94a3b8; font-size: 14px; }
  .kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; -webkit-overflow-scrolling: touch; }
  .kanban-col { min-width: 220px; flex: 1 1 220px; }
  .kanban-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .kanban-dot { width: 10px; height: 10px; border-radius: 50%; }
  .kanban-label { font-size: 12px; font-weight: 700; color: #374151; }
  .kanban-count { font-size: 11px; color: #94a3b8; margin-left: auto; }
  .kanban-card { background: #fff; border-radius: 10px; padding: 12px 14px; border: 1px solid #f1f5f9; cursor: pointer; margin-bottom: 8px; transition: box-shadow 0.15s; }
  .kanban-card:hover { box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
  .kanban-name { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
  .kanban-district { font-size: 11px; color: #94a3b8; }
  .kanban-visited { font-size: 11px; color: #6366f1; margin-top: 6px; }
  .kanban-concern { font-size: 11px; color: #f59e0b; margin-top: 2px; }
  .kanban-empty { font-size: 12px; color: #cbd5e1; padding: 16px 0; text-align: center; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
  .modal-box { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 760px; max-height: 92vh; overflow-y: auto; box-shadow: 0 -4px 32px rgba(0,0,0,0.15); }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; background: #fff; z-index: 10; border-radius: 16px 16px 0 0; }
  .modal-tag { font-size: 11px; font-weight: 700; color: #6366f1; letter-spacing: 0.08em; margin-bottom: 4px; text-transform: uppercase; }
  .modal-name { font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3; }
  .modal-corp { font-size: 13px; color: #64748b; margin-top: 4px; }
  .modal-tel { font-size: 13px; color: #64748b; }
  .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; }
  .modal-body { padding: 20px 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .label { display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px; letter-spacing: 0.06em; text-transform: uppercase; }
  .input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; outline: none; font-family: inherit; }
  .select { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; outline: none; cursor: pointer; background: #fff; font-family: inherit; }
  .textarea { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; outline: none; font-family: inherit; resize: vertical; }
  .contact-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .contact-chip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; display: flex; align-items: center; gap: 4px; }
  .add-btn { padding: 9px 16px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .visit-grid { display: grid; grid-template-columns: 130px 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .visit-card { background: #f8fafc; border-radius: 10px; padding: 12px 14px; border-left: 3px solid #6366f1; margin-bottom: 8px; }
  .visit-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .visit-count { font-weight: 700; color: #6366f1; font-size: 12px; }
  .visit-date { font-size: 12px; color: #64748b; }
  .visit-who { font-size: 13px; color: #475569; }
  .visit-talk { font-size: 13px; color: #334155; margin-top: 2px; }
  .visit-outcome { font-size: 13px; color: #0369a1; margin-top: 2px; }
  .care-chip { font-size: 12px; background: #fef3c7; color: #92400e; border-radius: 6px; padding: 3px 10px; font-weight: 600; }
  .child-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; font-size: 13px; cursor: pointer; }
  .child-btn.active { border-color: #6366f1; background: #eef2ff; color: #4338ca; font-weight: 600; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  .btn-cancel { padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; font-size: 14px; cursor: pointer; }
  .btn-save { padding: 10px 24px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
  .add-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 2000; display: flex; align-items: flex-end; justify-content: center; }
  .add-modal-box { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 520px; box-shadow: 0 -4px 32px rgba(0,0,0,0.15); }
  .add-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
  .add-modal-title { font-size: 17px; font-weight: 800; color: #0f172a; }
  .add-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
  .divider { width: 1px; height: 24px; background: #e2e8f0; margin: 0 2px; flex-shrink: 0; }
  @media (max-width: 640px) {
    .header { padding: 0 12px; }
    .header-inner { height: auto; flex-direction: column; align-items: stretch; padding: 10px 0; gap: 8px; }
    .header-title h1 { font-size: 13px; }
    .header-actions { gap: 6px; overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
    .pc-only { display: none !important; }
    .divider { display: none; }
    .main { padding: 12px; }
    .tabs { gap: 6px; }
    .tab-btn { padding: 8px 12px; font-size: 12px; }
    .stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-card { padding: 12px 14px; }
    .stat-value { font-size: 22px; }
    .filter-bar { padding: 10px 12px; gap: 6px; }
    .search-row { flex: 1 1 100%; min-width: 100%; }
    .filter-select { flex: 1; min-width: 0; font-size: 12px; }
    .facility-card { padding: 12px 14px; gap: 10px; }
    .facility-name { font-size: 13px; }
    .facility-badges { gap: 4px; }
    .badge-progress { font-size: 11px; padding: 3px 8px; }
    .modal-header { padding: 16px 16px 12px; }
    .modal-name { font-size: 17px; }
    .modal-body { padding: 16px; }
    .grid-2 { grid-template-columns: 1fr; gap: 12px; }
    .visit-grid { grid-template-columns: 1fr; }
    .contact-row { flex-direction: column; }
    .add-modal-body { padding: 16px; }
  }
`;

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function Modal({ facility, visits, onClose, onSave }) {
  const existing = visits[facility.id] || { progress:"未接触", rep:"", contacts:[], history:[], concerns:"", childTypes:[], memo:"" };
  const [data, setData] = useState(existing);
  const [newVisit, setNewVisit] = useState({ date:"", who:"", talkAbout:"", outcome:"" });
  const [newContact, setNewContact] = useState({ name:"", role:"", card:false });
  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));
  const addVisit = () => {
    if (!newVisit.date) return;
    upd("history", [...(data.history||[]), { ...newVisit, count:(data.history||[]).length+1 }]);
    setNewVisit({ date:"", who:"", talkAbout:"", outcome:"" });
  };
  const addContact = () => {
    if (!newContact.name) return;
    upd("contacts", [...(data.contacts||[]), newContact]);
    setNewContact({ name:"", role:"", card:false });
  };
  const toggleChild = (t) => {
    const cur = data.childTypes||[];
    upd("childTypes", cur.includes(t) ? cur.filter(x=>x!==t) : [...cur, t]);
  };
  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div className="modal-tag">{facility.district} · {facility.type}</div>
              <div className="modal-name">{facility.name}</div>
              <div className="modal-corp">{facility.corp}</div>
              {facility.tel && <div className="modal-tel">📞 {facility.tel}</div>}
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            <div><label className="label">進捗ステータス</label>
              <select className="select" value={data.progress} onChange={e=>upd("progress",e.target.value)}>
                {PROGRESS_OPTIONS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="label">代表者名</label>
              <input className="input" value={data.rep} onChange={e=>upd("rep",e.target.value)} placeholder="例：田中 一郎" />
            </div>
          </div>
          <Section title="👤 対応者・名刺管理">
            <div className="contact-row">
              <input className="input" style={{flex:2}} value={newContact.name} onChange={e=>setNewContact(c=>({...c,name:e.target.value}))} placeholder="氏名" />
              <input className="input" style={{flex:1}} value={newContact.role} onChange={e=>setNewContact(c=>({...c,role:e.target.value}))} placeholder="役職" />
              <label style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"12px", color:"#475569", whiteSpace:"nowrap" }}>
                <input type="checkbox" checked={newContact.card} onChange={e=>setNewContact(c=>({...c,card:e.target.checked}))} />名刺
              </label>
              <button className="add-btn" onClick={addContact}>追加</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {(data.contacts||[]).map((c,i)=>(
                <div key={i} className="contact-chip">
                  <span style={{ fontWeight:600 }}>{c.name}</span>
                  {c.role && <span style={{ color:"#64748b" }}> / {c.role}</span>}
                  {c.card && <span style={{ marginLeft:"4px", background:"#d1fae5", color:"#065f46", fontSize:"11px", borderRadius:"4px", padding:"2px 6px", fontWeight:600 }}>名刺✓</span>}
                  <button onClick={()=>upd("contacts",data.contacts.filter((_,j)=>j!==i))} style={{ marginLeft:"6px", background:"none", border:"none", color:"#94a3b8", cursor:"pointer" }}>×</button>
                </div>
              ))}
            </div>
          </Section>
          <Section title="📅 訪問記録">
            <div className="visit-grid">
              <input type="date" className="input" value={newVisit.date} onChange={e=>setNewVisit(v=>({...v,date:e.target.value}))} />
              <input className="input" value={newVisit.who} onChange={e=>setNewVisit(v=>({...v,who:e.target.value}))} placeholder="対応者（先方）" />
              <input className="input" value={newVisit.talkAbout} onChange={e=>setNewVisit(v=>({...v,talkAbout:e.target.value}))} placeholder="話した内容" />
            </div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
              <input className="input" style={{flex:1}} value={newVisit.outcome} onChange={e=>setNewVisit(v=>({...v,outcome:e.target.value}))} placeholder="結果・次のアクション" />
              <button className="add-btn" onClick={addVisit}>記録</button>
            </div>
            {(data.history||[]).length > 0 ? (
              <div>{[...(data.history||[])].reverse().map((h,i)=>(
                <div key={i} className="visit-card">
                  <div className="visit-head">
                    <span className="visit-count">第{h.count}回</span>
                    <span className="visit-date">{h.date}</span>
                  </div>
                  {h.who && <div className="visit-who">対応：{h.who}</div>}
                  {h.talkAbout && <div className="visit-talk">💬 {h.talkAbout}</div>}
                  {h.outcome && <div className="visit-outcome">→ {h.outcome}</div>}
                </div>
              ))}</div>
            ) : <div style={{ fontSize:"13px", color:"#94a3b8" }}>訪問記録なし</div>}
          </Section>
          {facility.careItems && facility.careItems.length > 0 && (
            <Section title="🏥 医療的ケア受入（データ）">
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {facility.careItems.map(c=><span key={c} className="care-chip">{c}</span>)}
              </div>
            </Section>
          )}
          <Section title="🔍 施設の課題・ニーズ">
            <textarea className="textarea" style={{height:"80px"}} value={data.concerns} onChange={e=>upd("concerns",e.target.value)} placeholder="例：医療的ケア対応スタッフが不足、看護師との連携に不安など" />
          </Section>
          <Section title="👧 在籍児童の傾向">
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {CHILD_TYPES.map(t=>(
                <button key={t} className={`child-btn${(data.childTypes||[]).includes(t)?" active":""}`} onClick={()=>toggleChild(t)}>{t}</button>
              ))}
            </div>
          </Section>
          <Section title="📝 自由メモ">
            <textarea className="textarea" style={{height:"72px"}} value={data.memo} onChange={e=>upd("memo",e.target.value)} placeholder="気になること、雰囲気、次回への申し送りなど" />
          </Section>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>キャンセル</button>
            <button className="btn-save" onClick={()=>{ onSave(facility.id, data); onClose(); }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddFacilityModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ district:"", type:"児童発達支援", name:"", tel:"", address:"", corp:"", nursing:false });
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div className="add-modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="add-modal-box">
        <div className="add-modal-header">
          <div className="add-modal-title">＋ 施設を追加</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="add-modal-body">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div><label className="label">区名 *</label><input className="input" value={form.district} onChange={e=>upd("district",e.target.value)} placeholder="例：北区" /></div>
            <div><label className="label">サービス種別</label>
              <select className="select" value={form.type} onChange={e=>upd("type",e.target.value)}>
                <option>児童発達支援</option><option>放課後等デイサービス</option><option>その他</option>
              </select>
            </div>
          </div>
          <div><label className="label">施設名 *</label><input className="input" value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="例：○○こどもデイサービス" /></div>
          <div><label className="label">法人名</label><input className="input" value={form.corp} onChange={e=>upd("corp",e.target.value)} placeholder="例：株式会社○○" /></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div><label className="label">電話番号</label><input className="input" value={form.tel} onChange={e=>upd("tel",e.target.value)} placeholder="06-xxxx-xxxx" /></div>
            <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:"2px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", color:"#374151", cursor:"pointer" }}>
                <input type="checkbox" checked={form.nursing} onChange={e=>upd("nursing",e.target.checked)} style={{ width:"16px", height:"16px" }} />看護師あり
              </label>
            </div>
          </div>
          <div><label className="label">住所</label><input className="input" value={form.address} onChange={e=>upd("address",e.target.value)} placeholder="大阪市○○区..." /></div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>キャンセル</button>
            <button className="btn-save" onClick={()=>{ if(!form.name||!form.district){alert("施設名と区名は必須です");return;} onAdd(form); onClose(); }}>追加する</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [facilities, setFacilities] = useState([]);
  const [visits, setVisits] = useState({});
  const [selected, setSelected] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("全て");
  const [filterDistrict, setFilterDistrict] = useState("全て");
  const [filterProgress, setFilterProgress] = useState("全て");
  const [filterNursing, setFilterNursing] = useState("全て");
  const [sortKey, setSortKey] = useState("district");
  const [view, setView] = useState("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const nextIdRef = useRef(90000);
  const facilitiesRef = useRef([]);


  const showMsg = (text, ms=4000) => { setMsg(text); setTimeout(()=>setMsg(""), ms); };

  useEffect(() => { facilitiesRef.current = facilities; }, [facilities]);

  useEffect(() => {
    try { const v = localStorage.getItem("visits_data"); if(v) setVisits(JSON.parse(v)); } catch(e){}
    try { const f = localStorage.getItem("manual_facilities"); if(f){ const arr=JSON.parse(f); if(Array.isArray(arr)) setFacilities(arr); } } catch(e){}
    loadFromSheets();
  }, []);

  const loadFromSheets = async () => {
    const SHEET_ID = import.meta.env.VITE_SHEET_ID;
    const API_KEY = import.meta.env.VITE_SHEETS_API_KEY;
    if (!SHEET_ID || !API_KEY) return;
    setLoading(true);
    try {
      const fetchSheet = async (name) => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(name)}?key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${name}: ${res.status}`);
        const { values } = await res.json();
        if (!values || values.length < 2) return [];
        const [headers, ...rows] = values;
        return rows.map(row => { const obj={}; headers.forEach((h,i)=>obj[h]=row[i]||""); return obj; });
      };
      const careKeys = ["吸引","吸入・ネブライザー","経管栄養","中心静脈栄養","導尿","在宅酸素療法","咽頭エアウェイ","パルスオキシメーター","気管切開","人工呼吸器","服薬管理"];
      const parseRows = (rows, type) => rows.filter(r=>r["事業所名称"]).map((r,i)=>({
        id: 90000+i+(type==="放課後等デイサービス"?10000:0),
        district:r["区名"]||"", type:r["サービス名"]||type,
        name:r["事業所名称"]||"", tel:r["事業所電話番号"]||"",
        address:r["事業所の所在地"]||"", corp:r["法人等名称"]||"",
        nursing:r["看護職員"]==="○",
        careItems:careKeys.filter(k=>r[k]==="○"),
        fromSheets:true,
      }));
      const [child, after] = await Promise.all([fetchSheet("児童発達支援"), fetchSheet("放課後等デイサービス")]);
      const sheetData = [...parseRows(child,"児童発達支援"), ...parseRows(after,"放課後等デイサービス")];
      setFacilities(prev => [...sheetData, ...prev.filter(f=>!f.fromSheets)]);

      // 営業記録シートから進捗を読み込む（実際のシート名を取得）
      try {
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}&fields=sheets.properties.title`;
        const metaRes = await fetch(metaUrl);
        const meta = await metaRes.json();
        const allSheetNames = (meta.sheets||[]).map(s=>s.properties.title);
        const recordSheetName = allSheetNames.find(n=>n.includes("営業")) || "営業記録";
        const records = await fetchSheet(recordSheetName);
        showMsg(`📊 ${recordSheetName}: ${records ? records.length : 0}件読込`, 6000);
        if (records && records.length > 0) {
          const visitMap = {};
          records.forEach(r => {
            const fid = parseInt(r["施設ID"]);
            if (!fid) return;
            // 同じ施設IDは最新（後の行）で上書き
            const existing = visitMap[fid] || { history: [], contacts: [] };
            visitMap[fid] = {
              progress: r["進捗"] || existing.progress || "未接触",
              rep: r["代表者名"] || existing.rep || "",
              concerns: r["課題・ニーズ"] || existing.concerns || "",
              memo: r["メモ"] || existing.memo || "",
              history: r["訪問回数"] && parseInt(r["訪問回数"]) > 0
                ? Array.from({length: parseInt(r["訪問回数"])}, (_, i) => ({
                    count: i+1,
                    date: i === parseInt(r["訪問回数"])-1 ? (r["訪問日"]||"") : "",
                    who: "", talkAbout: i === parseInt(r["訪問回数"])-1 ? (r["話した内容"]||"") : "",
                    outcome: i === parseInt(r["訪問回数"])-1 ? (r["次のアクション"]||"") : "",
                  }))
                : existing.history,
              contacts: r["対応者名"] ? [{ name: r["対応者名"], role: r["役職"]||"", card: r["名刺有無"]==="あり" }] : existing.contacts,
              childTypes: existing.childTypes || [],
            };
          });
          setVisits(prev => {
            const merged = { ...prev, ...visitMap };
            try { localStorage.setItem("visits_data", JSON.stringify(merged)); } catch(e){}
            return merged;
          });
        }
      } catch(e) {}

      showMsg(`✅ Sheetsから${sheetData.length}件を同期しました`);
    } catch(e) { showMsg("⚠ Sheets読込失敗: "+e.message); }
    setLoading(false);
  };

  const saveVisit = useCallback((id, data) => {
    setVisits(v => {
      const next = {...v, [id]:data};
      try { localStorage.setItem("visits_data", JSON.stringify(next)); } catch(e){}
      return next;
    });
    const GAS_URL = import.meta.env.VITE_GAS_URL;
    if (GAS_URL) {
      const facility = facilitiesRef.current.find(f=>f.id===id)||{};
      const lastVisit = (data.history||[]).slice(-1)[0]||{};
      const lastContact = (data.contacts||[]).slice(-1)[0]||{};
      fetch(GAS_URL, {
        method:"POST", mode:"no-cors", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          facilityId:id, facilityName:facility.name||"", facilityType:facility.type||"",
          district:facility.district||"", corp:facility.corp||"", tel:facility.tel||"", address:facility.address||"",
          progress:data.progress||"", visitCount:(data.history||[]).length, rep:data.rep||"",
          contactName:lastContact.name||"", contactRole:lastContact.role||"", cardReceived:lastContact.card?"あり":"",
          visitDate:lastVisit.date||"", talkAbout:lastVisit.talkAbout||"", outcome:lastVisit.outcome||"",
          concerns:data.concerns||"", memo:data.memo||"",
        }),
      }).catch(()=>{});
    }
  }, []);

  const addFacility = (f) => {
    const newF = {...f, id:nextIdRef.current++, careItems:[], fromSheets:false};
    setFacilities(prev => {
      const next = [...prev, newF];
      try { localStorage.setItem("manual_facilities", JSON.stringify(next.filter(x=>!x.fromSheets))); } catch(e){}
      return next;
    });
  };

  const deleteFacility = (id) => {
    setFacilities(prev => {
      const next = prev.filter(f=>f.id!==id);
      try { localStorage.setItem("manual_facilities", JSON.stringify(next.filter(x=>!x.fromSheets))); } catch(e){}
      return next;
    });
  };

  const exportCSV = () => {
    const rows = [["施設名","区","サービス種別","法人名","電話番号","進捗","訪問回数","代表者","課題・ニーズ","メモ"]];
    facilities.forEach(f => {
      const v = visits[f.id]||{};
      rows.push([f.name,f.district,f.type,f.corp,f.tel,v.progress||"未接触",(v.history||[]).length,v.rep||"",v.concerns||"",v.memo||""]);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`営業管理_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const handleFileImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split("\n").filter(l=>l.trim());
      const header = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
      const newF = [];
      for (let i=1;i<lines.length;i++) {
        const cols = lines[i].split(",").map(c=>c.trim().replace(/"/g,""));
        if (!cols[0]) continue;
        const obj={}; header.forEach((h,j)=>obj[h]=cols[j]||"");
        newF.push({ id:nextIdRef.current++, district:obj["区名"]||"", type:obj["サービス名"]||"児童発達支援", name:obj["事業所名称"]||"", tel:obj["事業所電話番号"]||"", address:obj["事業所の所在地"]||"", corp:obj["法人等名称"]||"", nursing:obj["看護職員"]==="○", careItems:[], fromSheets:false });
      }
      if (newF.length>0) { setFacilities(prev=>[...prev,...newF]); showMsg(`✅ ${newF.length}件インポートしました`); }
      else showMsg("⚠ データが見つかりませんでした");
    };
    reader.readAsText(file,"utf-8");
  };

  const handleTypeChange = (t) => { setActiveType(t); setFilterDistrict("全て"); };
  const districts = useMemo(() => ["全て",...Array.from(new Set((activeType==="全て"?facilities:facilities.filter(f=>f.type===activeType)).map(f=>f.district)))], [facilities,activeType]);

  const filtered = useMemo(() => {
    return facilities.filter(f => {
      const prog = (visits[f.id]||{}).progress||"未接触";
      if (activeType!=="全て" && f.type!==activeType) return false;
      if (filterDistrict!=="全て" && f.district!==filterDistrict) return false;
      if (filterProgress!=="全て" && prog!==filterProgress) return false;
      if (filterNursing==="看護師あり" && !f.nursing) return false;
      if (filterNursing==="看護師なし" && f.nursing) return false;
      if (search) { const q=search.toLowerCase(); return f.name.toLowerCase().includes(q)||(f.corp||"").toLowerCase().includes(q)||f.district.includes(q); }
      return true;
    }).sort((a,b) => {
      if (sortKey==="district") return a.district.localeCompare(b.district,"ja");
      if (sortKey==="progress") return PROGRESS_OPTIONS.indexOf((visits[a.id]||{}).progress||"未接触")-PROGRESS_OPTIONS.indexOf((visits[b.id]||{}).progress||"未接触");
      return a.name.localeCompare(b.name,"ja");
    });
  }, [facilities,visits,activeType,filterDistrict,filterProgress,filterNursing,search,sortKey]);

  const stats = useMemo(() => {
    const base = activeType==="全て"?facilities:facilities.filter(f=>f.type===activeType);
    return {
      total:base.length,
      visited:base.filter(f=>(visits[f.id]||{}).progress&&(visits[f.id]||{}).progress!=="未接触").length,
      inProgress:base.filter(f=>["継続フォロー中","提案書送付済","契約検討中"].includes((visits[f.id]||{}).progress)).length,
      contracted:base.filter(f=>(visits[f.id]||{}).progress==="契約済").length,
    };
  }, [facilities,visits,activeType]);

  const kanbanGroups = useMemo(() => PROGRESS_OPTIONS.map(p=>({ label:p, items:filtered.filter(f=>((visits[f.id]||{}).progress||"未接触")===p) })), [filtered,visits]);

  return (
    <div className="app">
      <style>{CSS}</style>

      <div className="header">
        <div className="header-inner">
          <div className="header-title">
            <div className="header-icon">🏥</div>
            <div>
              <h1>医療連携体制加算 営業管理</h1>
              <p>大阪市 福祉施設リスト</p>
            </div>
          </div>
          <div className="header-actions">
            {msg && <span className="msg-badge">{msg}</span>}
            <button className="btn pc-only" onClick={exportCSV}>📥 CSV出力</button>
            <button className="btn pc-only" onClick={()=>fileInputRef.current.click()}>📂 CSV読込</button>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display:"none" }} onChange={e=>{ handleFileImport(e.target.files[0]); e.target.value=""; }} />
            <button className="btn btn-green" onClick={loadFromSheets} disabled={loading}>
              {loading?"⏳ 同期中...":"🔄 Sheets同期"}
            </button>
            <button className="btn btn-primary" onClick={()=>setShowAddModal(true)}>＋ 施設追加</button>
            <div className="divider" />
            {["list","kanban"].map(v=>(
              <button key={v} className={`btn btn-view${view===v?" active":""}`} onClick={()=>setView(v)}>
                {v==="list"?"📋 一覧":"📊 カンバン"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="main">
        <div className="tabs">
          {TYPE_TABS.map(t => {
            const count = t==="全て"?facilities.length:facilities.filter(f=>f.type===t).length;
            const active = activeType===t;
            const col = TYPE_COLORS[t];
            return (
              <button key={t} className={`tab-btn${active?" active":""}`}
                style={{ borderColor:active?col.border:"#e2e8f0", background:active?col.bg:"#fff", color:active?col.text:"#64748b" }}
                onClick={()=>handleTypeChange(t)}>
                <span className="tab-dot" style={{ background:active?col.dot:"#cbd5e1" }} />
                {t}
                <span className="tab-count" style={{ background:active?col.border:"#f1f5f9", color:active?"#fff":"#94a3b8" }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="stats">
          {[{label:"総施設数",value:stats.total,icon:"🏢",color:"#6366f1"},{label:"訪問済",value:stats.visited,icon:"✅",color:"#0ea5e9"},{label:"商談中",value:stats.inProgress,icon:"⚡",color:"#f59e0b"},{label:"契約済",value:stats.contracted,icon:"🎉",color:"#22c55e"}].map(s=>(
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="filter-bar">
          <div className="search-row">
            <input className="search-input" value={searchInput} onChange={e=>setSearchInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") setSearch(searchInput); }} placeholder="🔍  施設名・法人名で検索..." />
            <button className="search-btn" onClick={()=>setSearch(searchInput)}>検索</button>
            {search && <button className="clear-btn" onClick={()=>{ setSearch(""); setSearchInput(""); }}>✕</button>}
          </div>
          <select className="filter-select" value={filterDistrict} onChange={e=>setFilterDistrict(e.target.value)}>{districts.map(d=><option key={d}>{d}</option>)}</select>
          <select className="filter-select" value={filterProgress} onChange={e=>setFilterProgress(e.target.value)}>{["全て",...PROGRESS_OPTIONS].map(p=><option key={p}>{p}</option>)}</select>
          <select className="filter-select" value={filterNursing} onChange={e=>setFilterNursing(e.target.value)}>{["全て","看護師あり","看護師なし"].map(p=><option key={p}>{p}</option>)}</select>
          {view==="list" && <select className="filter-select" value={sortKey} onChange={e=>setSortKey(e.target.value)}><option value="district">区で並べる</option><option value="progress">進捗で並べる</option><option value="name">名前順</option></select>}
          <div className="result-count">{filtered.length}件</div>
        </div>

        {view==="list" && (
          <div className="facility-list">
            {filtered.length===0 && <div className="empty-state">{loading?"⏳ Sheetsからデータを読み込み中...":"施設が見つかりません"}</div>}
            {filtered.map(f => {
              const v = visits[f.id]||{};
              const prog = v.progress||"未接触";
              return (
                <div key={f.id} className="facility-card" onClick={()=>setSelected(f)}>
                  <div className="facility-bar" style={{ background:PROGRESS_COLORS[prog] }} />
                  <div className="facility-info">
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <span className="facility-name">{f.name}</span>
                      {f.nursing && <span className="badge badge-nursing">看護師有</span>}
                    </div>
                    <div className="facility-sub">{f.district} · {f.corp}</div>
                  </div>
                  <div className="facility-badges">
                    {(v.history||[]).length>0 && <span style={{ fontSize:"12px", color:"#94a3b8" }}>訪問{v.history.length}回</span>}
                    {f.careItems&&f.careItems.length>0 && <span className="badge badge-care">ケア{f.careItems.length}項目</span>}
                    <span className="badge-progress" style={{ background:PROGRESS_COLORS[prog], color:PROGRESS_TEXT[prog] }}>{prog}</span>
                    {!f.fromSheets && <button className="btn-delete" onClick={e=>{ e.stopPropagation(); if(window.confirm("削除しますか？")) deleteFacility(f.id); }}>削除</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view==="kanban" && (
          <div className="kanban">
            {kanbanGroups.filter(g=>g.label!=="見送り"||g.items.length>0).map(group=>(
              <div key={group.label} className="kanban-col">
                <div className="kanban-header">
                  <div className="kanban-dot" style={{ background:PROGRESS_COLORS[group.label] }} />
                  <span className="kanban-label">{group.label}</span>
                  <span className="kanban-count">{group.items.length}</span>
                </div>
                {group.items.map(f=>{
                  const v=visits[f.id]||{};
                  return (
                    <div key={f.id} className="kanban-card" onClick={()=>setSelected(f)}>
                      <div className="kanban-name">{f.name}</div>
                      <div className="kanban-district">{f.district}</div>
                      {(v.history||[]).length>0 && <div className="kanban-visited">📅 {v.history.length}回訪問済</div>}
                      {v.concerns && <div className="kanban-concern">⚠ 課題あり</div>}
                    </div>
                  );
                })}
                {group.items.length===0 && <div className="kanban-empty">なし</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <Modal facility={selected} visits={visits} onClose={()=>setSelected(null)} onSave={saveVisit} />}
      {showAddModal && <AddFacilityModal onClose={()=>setShowAddModal(false)} onAdd={addFacility} />}
    </div>
  );
}

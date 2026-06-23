import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { fetchSheet, parseFacilities, appendVisitToSheets } from "./useSheets.js";

const FACILITIES_RAW = []; // Sheetsから自動ロード

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

function Modal({ facility, visits, onClose, onSave }) {
  const existing = visits[facility.id] || { progress:"未接触", rep:"", contacts:[], history:[], concerns:"", childTypes:[], memo:"" };
  const [data, setData] = useState(existing);
  const [newVisit, setNewVisit] = useState({ date:"", who:"", talkAbout:"", outcome:"" });
  const [newContact, setNewContact] = useState({ name:"", role:"", card:false });

  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));

  const addVisit = () => {
    if (!newVisit.date) return;
    const count = (data.history || []).length + 1;
    upd("history", [...(data.history||[]), { ...newVisit, count }]);
    setNewVisit({ date:"", who:"", talkAbout:"", outcome:"" });
  };

  const addContact = () => {
    if (!newContact.name) return;
    upd("contacts", [...(data.contacts||[]), newContact]);
    setNewContact({ name:"", role:"", card:false });
  };

  const toggleChild = (t) => {
    const cur = data.childTypes || [];
    upd("childTypes", cur.includes(t) ? cur.filter(x=>x!==t) : [...cur, t]);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#fff", borderRadius:"16px", width:"100%", maxWidth:"760px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"#fff", zIndex:10, borderRadius:"16px 16px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, color:"#6366f1", letterSpacing:"0.08em", marginBottom:"4px", textTransform:"uppercase" }}>{facility.district} · {facility.type}</div>
              <div style={{ fontSize:"20px", fontWeight:700, color:"#0f172a", lineHeight:1.3 }}>{facility.name}</div>
              <div style={{ fontSize:"13px", color:"#64748b", marginTop:"4px" }}>{facility.corp}</div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"22px", cursor:"pointer", color:"#94a3b8", padding:"4px", lineHeight:1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {/* 進捗 & 代表者 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"24px" }}>
            <div>
              <label style={labelStyle}>進捗ステータス</label>
              <select value={data.progress} onChange={e=>upd("progress",e.target.value)} style={selectStyle}>
                {PROGRESS_OPTIONS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>代表者名</label>
              <input value={data.rep} onChange={e=>upd("rep",e.target.value)} placeholder="例：田中 一郎" style={inputStyle} />
            </div>
          </div>

          {/* 担当者・名刺 */}
          <Section title="👤 対応者・名刺管理">
            <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
              <input value={newContact.name} onChange={e=>setNewContact(c=>({...c,name:e.target.value}))} placeholder="氏名" style={{...inputStyle, flex:2}} />
              <input value={newContact.role} onChange={e=>setNewContact(c=>({...c,role:e.target.value}))} placeholder="役職" style={{...inputStyle, flex:1}} />
              <label style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"12px", color:"#475569", whiteSpace:"nowrap" }}>
                <input type="checkbox" checked={newContact.card} onChange={e=>setNewContact(c=>({...c,card:e.target.checked}))} />名刺
              </label>
              <button onClick={addContact} style={addBtnStyle}>追加</button>
            </div>
            {(data.contacts||[]).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {data.contacts.map((c,i)=>(
                  <div key={i} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"8px 12px", fontSize:"13px" }}>
                    <span style={{ fontWeight:600, color:"#1e293b" }}>{c.name}</span>
                    {c.role && <span style={{ color:"#64748b" }}> / {c.role}</span>}
                    {c.card && <span style={{ marginLeft:"6px", background:"#d1fae5", color:"#065f46", fontSize:"11px", borderRadius:"4px", padding:"2px 6px", fontWeight:600 }}>名刺✓</span>}
                    <button onClick={()=>upd("contacts",data.contacts.filter((_,j)=>j!==i))} style={{ marginLeft:"8px", background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"14px" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 訪問記録 */}
          <Section title="📅 訪問記録">
            <div style={{ display:"grid", gridTemplateColumns:"130px 1fr 1fr", gap:"8px", marginBottom:"8px" }}>
              <input type="date" value={newVisit.date} onChange={e=>setNewVisit(v=>({...v,date:e.target.value}))} style={inputStyle} />
              <input value={newVisit.who} onChange={e=>setNewVisit(v=>({...v,who:e.target.value}))} placeholder="対応者（先方）" style={inputStyle} />
              <input value={newVisit.talkAbout} onChange={e=>setNewVisit(v=>({...v,talkAbout:e.target.value}))} placeholder="話した内容" style={inputStyle} />
            </div>
            <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
              <input value={newVisit.outcome} onChange={e=>setNewVisit(v=>({...v,outcome:e.target.value}))} placeholder="結果・次のアクション" style={{...inputStyle, flex:1}} />
              <button onClick={addVisit} style={addBtnStyle}>記録</button>
            </div>
            {(data.history||[]).length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {[...(data.history||[])].reverse().map((h,i)=>(
                  <div key={i} style={{ background:"#f8fafc", borderRadius:"10px", padding:"12px 14px", borderLeft:"3px solid #6366f1" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                      <span style={{ fontWeight:700, color:"#6366f1", fontSize:"12px" }}>第{h.count}回</span>
                      <span style={{ fontSize:"12px", color:"#64748b" }}>{h.date}</span>
                    </div>
                    {h.who && <div style={{ fontSize:"13px", color:"#475569" }}>対応：{h.who}</div>}
                    {h.talkAbout && <div style={{ fontSize:"13px", color:"#334155", marginTop:"2px" }}>💬 {h.talkAbout}</div>}
                    {h.outcome && <div style={{ fontSize:"13px", color:"#0369a1", marginTop:"2px" }}>→ {h.outcome}</div>}
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize:"13px", color:"#94a3b8", padding:"8px 0" }}>訪問記録なし</div>}
          </Section>

          {/* 困っていること */}
          <Section title="🔍 施設の課題・ニーズ">
            <textarea value={data.concerns} onChange={e=>upd("concerns",e.target.value)}
              placeholder="例：医療的ケア対応スタッフが不足、看護師との連携に不安、保護者からのニーズが多い、等"
              style={{...inputStyle, height:"80px", resize:"vertical"}} />
          </Section>

          {/* 医療的ケア対応（Excelデータ） */}
          {facility.careItems && facility.careItems.length > 0 && (
            <Section title="🏥 医療的ケア受入対応（データ）">
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                {facility.careItems.map(c=>(
                  <span key={c} style={{ fontSize:"12px", background:"#fef3c7", color:"#92400e", borderRadius:"6px", padding:"3px 10px", fontWeight:600 }}>{c}</span>
                ))}
              </div>
              <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"6px" }}>※ 事業所データより自動取得</div>
            </Section>
          )}

          {/* 在籍児童タイプ */}
          <Section title="👧 在籍児童の傾向（営業メモ）">
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {CHILD_TYPES.map(t=>(
                <button key={t} onClick={()=>toggleChild(t)}
                  style={{ padding:"6px 14px", borderRadius:"20px", border:"1px solid",
                    borderColor:(data.childTypes||[]).includes(t)?"#6366f1":"#e2e8f0",
                    background:(data.childTypes||[]).includes(t)?"#eef2ff":"#f8fafc",
                    color:(data.childTypes||[]).includes(t)?"#4338ca":"#64748b",
                    fontSize:"13px", fontWeight:(data.childTypes||[]).includes(t)?600:400, cursor:"pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </Section>

          {/* メモ */}
          <Section title="📝 自由メモ">
            <textarea value={data.memo} onChange={e=>upd("memo",e.target.value)}
              placeholder="気になること、雰囲気、次回への申し送りなど"
              style={{...inputStyle, height:"72px", resize:"vertical"}} />
          </Section>

          {/* Save */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px", marginTop:"8px" }}>
            <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:"8px", border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:"14px", cursor:"pointer" }}>キャンセル</button>
            <button onClick={()=>{ onSave(facility.id, data); onClose(); }}
              style={{ padding:"10px 24px", borderRadius:"8px", border:"none", background:"#6366f1", color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:"20px" }}>
      <div style={{ fontSize:"13px", fontWeight:700, color:"#374151", marginBottom:"10px", letterSpacing:"0.03em" }}>{title}</div>
      {children}
    </div>
  );
}

const labelStyle = { display:"block", fontSize:"11px", fontWeight:700, color:"#64748b", marginBottom:"6px", letterSpacing:"0.06em", textTransform:"uppercase" };
const inputStyle = { width:"100%", padding:"9px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", color:"#1e293b", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const selectStyle = { ...inputStyle, cursor:"pointer" };
const addBtnStyle = { padding:"9px 16px", borderRadius:"8px", border:"none", background:"#6366f1", color:"#fff", fontSize:"13px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" };

const TYPE_TABS = ["全て", "児童発達支援", "放課後等デイサービス"];
const TYPE_COLORS = {
  "児童発達支援": { bg:"#eef2ff", text:"#4338ca", border:"#6366f1", dot:"#6366f1" },
  "放課後等デイサービス": { bg:"#fdf4ff", text:"#7e22ce", border:"#a855f7", dot:"#a855f7" },
  "全て": { bg:"#f8fafc", text:"#374151", border:"#e2e8f0", dot:"#94a3b8" },
};

export default function App() {
  const [visits, setVisits] = useState({});
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeType, setActiveType] = useState("全て");
  const [filterDistrict, setFilterDistrict] = useState("全て");
  const [filterProgress, setFilterProgress] = useState("全て");
  const [filterNursing, setFilterNursing] = useState("全て");
  const [sortKey, setSortKey] = useState("district");
  const [view, setView] = useState("list");
  const [extraFacilities, setExtraFacilities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const sheetsConfigured = !!(import.meta.env.VITE_SHEET_ID && import.meta.env.VITE_SHEETS_API_KEY);
  const [storageStatus, setStorageStatus] = useState("");
  const fileInputRef = useRef(null);
  const nextIdRef = useRef(10000);

  // ---- persistent storage 読み込み ----
  useEffect(() => {
    try {
      const v = localStorage.getItem("visits_data");
      if (v) setVisits(JSON.parse(v));
    } catch(e) {}
    try {
      const e = localStorage.getItem("extra_facilities");
      if (e) { const arr = JSON.parse(e); if(Array.isArray(arr)) { setExtraFacilities(arr); if(arr.length) nextIdRef.current = Math.max(...arr.map(x=>x.id))+1; } }
    } catch(e) {}
    autoLoadFromSheets();
  }, []);

  // visits変更時に自動保存
  const saveVisit = useCallback((id, data) => {
    setVisits(v => {
      const next = { ...v, [id]: data };
      try { localStorage.setItem("visits_data", JSON.stringify(next)); } catch(e) {}
      return next;
    });
    // GASに全項目送信
    const facility = [...FACILITIES_RAW, ...extraFacilities].find(f => f.id === id) || {};
    const GAS_URL = import.meta.env.VITE_GAS_URL;
    if (GAS_URL) {
      const lastVisit = (data.history || []).slice(-1)[0] || {};
      const lastContact = (data.contacts || []).slice(-1)[0] || {};
      fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: id,
          facilityName: facility.name || "",
          facilityType: facility.type || "",
          district: facility.district || "",
          corp: facility.corp || "",
          tel: facility.tel || "",
          address: facility.address || "",
          progress: data.progress || "",
          visitCount: (data.history || []).length,
          rep: data.rep || "",
          contactName: lastContact.name || "",
          contactRole: lastContact.role || "",
          cardReceived: lastContact.card ? "あり" : "",
          visitDate: lastVisit.date || "",
          talkAbout: lastVisit.talkAbout || "",
          outcome: lastVisit.outcome || "",
          concerns: data.concerns || "",
          memo: data.memo || "",
        }),
      }).catch(()=>{});
    }
  }, [extraFacilities]);

  // 施設追加
  const addFacility = (f) => {
    const newF = { ...f, id: nextIdRef.current++, careItems: [] };
    setExtraFacilities(prev => {
      const next = [...prev, newF];
      try { localStorage.setItem("extra_facilities", JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  // 施設削除（追加分のみ）
  const deleteFacility = (id) => {
    setExtraFacilities(prev => {
      const next = prev.filter(f => f.id !== id);
      try { localStorage.setItem("extra_facilities", JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  // ---- Excel/CSV インポート ----
  const handleFileImport = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split("\n").filter(l=>l.trim());
        const header = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
        const facilities = [];
        for (let i=1;i<lines.length;i++) {
          const cols = lines[i].split(",").map(c=>c.trim().replace(/"/g,""));
          if (!cols[0]) continue;
          const obj = {};
          header.forEach((h,j)=>obj[h]=cols[j]||"");
          facilities.push({
            id: nextIdRef.current++,
            district: obj["区名"]||obj["district"]||"",
            type: obj["サービス名"]||obj["type"]||"児童発達支援",
            name: obj["事業所名称"]||obj["name"]||"",
            tel: obj["事業所電話番号"]||obj["tel"]||"",
            address: obj["事業所の所在地"]||obj["address"]||"",
            corp: obj["法人等名称"]||obj["corp"]||"",
            nursing: obj["看護職員"]==="○"||obj["nursing"]==="true",
            careItems: []
          });
        }
        if (facilities.length > 0) {
          setExtraFacilities(prev => {
            const next = [...prev, ...facilities];
            try { localStorage.setItem("extra_facilities", JSON.stringify(next)); } catch(e) {}
            return next;
          });
          setImportMsg(`✅ ${facilities.length}件インポートしました`);
        } else {
          setImportMsg("⚠ データが見つかりませんでした（列名を確認してください）");
        }
        setTimeout(()=>setImportMsg(""), 4000);
      };
      reader.readAsText(file, "utf-8");
    } else {
      setImportMsg("⚠ CSVファイルを選択してください（.xlsx直接読込は非対応）");
      setTimeout(()=>setImportMsg(""), 4000);
    }
  };

  // ---- Google Sheets 同期 ----
  const syncFromSheets = async () => {
    if (!sheetsConfigured) {
      setImportMsg("⚠ .envにSHEET_IDとAPI_KEYを設定してください");
      setTimeout(()=>setImportMsg(""), 5000);
      return;
    }
    setSheetsLoading(true);
    try {
      const [child, afterschool] = await Promise.all([
        fetchSheet("児童発達支援"),
        fetchSheet("放課後等デイサービス"),
      ]);
      const facilities = [
        ...(child ? parseFacilities(child, "児童発達支援") : []),
        ...(afterschool ? parseFacilities(afterschool, "放課後等デイサービス") : []),
      ];
      if (facilities.length > 0) {
        setExtraFacilities(prev => {
          const notFromSheets = prev.filter(f => !f.fromSheets);
          const next = [...notFromSheets, ...facilities];
          try { localStorage.setItem("extra_facilities", JSON.stringify(next)); } catch(e) {}
          return next;
        });
        setImportMsg(`✅ Sheetsから${facilities.length}件を同期しました`);
      } else {
        setImportMsg("⚠ データが取得できませんでした");
      }
    } catch(e) {
      setImportMsg("⚠ 取得失敗: " + e.message);
    }
    setSheetsLoading(false);
    setTimeout(()=>setImportMsg(""), 5000);
  };

  // ---- CSV エクスポート ----
  const exportCSV = () => {
    const allF = [...FACILITIES_RAW, ...extraFacilities];
    const rows = [["施設名","区","サービス種別","法人名","電話番号","進捗","訪問回数","代表者","課題・ニーズ","メモ"]];
    allF.forEach(f => {
      const v = visits[f.id] || {};
      rows.push([
        f.name, f.district, f.type, f.corp, f.tel,
        v.progress||"未接触",
        (v.history||[]).length,
        v.rep||"",
        v.concerns||"",
        v.memo||""
      ]);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`営業管理_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const autoLoadFromSheets = async () => {
    const sheetId = import.meta.env.VITE_SHEET_ID;
    const apiKey = import.meta.env.VITE_SHEETS_API_KEY;
    if (!sheetId || !apiKey) return;
    try {
      const [child, afterschool] = await Promise.all([
        fetchSheet("児童発達支援"),
        fetchSheet("放課後等デイサービス"),
      ]);
      const facilities = [
        ...(child ? parseFacilities(child, "児童発達支援") : []),
        ...(afterschool ? parseFacilities(afterschool, "放課後等デイサービス") : []),
      ];
      if (facilities.length > 0) {
        setExtraFacilities(prev => {
          const manual = Array.isArray(prev) ? prev.filter(f => !f.fromSheets) : [];
          return [...manual, ...facilities];
        });
      }
    } catch(e) { console.error('Sheets load error:', e); setImportMsg('⚠ Sheets読込失敗: ' + e.message); }
  };

  // typeタブ切替時に区フィルタをリセット
  const handleTypeChange = (t) => { setActiveType(t); setFilterDistrict("全て"); };

  const ALL_FACILITIES = useMemo(() => [...FACILITIES_RAW, ...(Array.isArray(extraFacilities) ? extraFacilities : [])], [extraFacilities]);

  const typeFiltered = useMemo(() =>
    activeType === "全て" ? ALL_FACILITIES : ALL_FACILITIES.filter(f => f.type === activeType),
  [activeType, ALL_FACILITIES]);

  const districts = ["全て", ...Array.from(new Set(typeFiltered.map(f=>f.district)))];

  const filtered = useMemo(() => {
    return typeFiltered.filter(f => {
      const v = visits[f.id] || {};
      const prog = v.progress || "未接触";
      if (filterDistrict !== "全て" && f.district !== filterDistrict) return false;
      if (filterProgress !== "全て" && prog !== filterProgress) return false;
      if (filterNursing === "看護師あり" && !f.nursing) return false;
      if (filterNursing === "看護師なし" && f.nursing) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.corp.toLowerCase().includes(q) || f.district.includes(q);
      }
      return true;
    }).sort((a,b) => {
      if (sortKey === "district") return a.district.localeCompare(b.district, "ja");
      if (sortKey === "progress") {
        const pa = PROGRESS_OPTIONS.indexOf((visits[a.id]||{}).progress||"未接触");
        const pb = PROGRESS_OPTIONS.indexOf((visits[b.id]||{}).progress||"未接触");
        return pa - pb;
      }
      return a.name.localeCompare(b.name, "ja");
    });
  }, [visits, search, filterDistrict, filterProgress, filterNursing, sortKey]);

  const stats = useMemo(() => {
    const total = typeFiltered.length;
    const ids = new Set(typeFiltered.map(f=>f.id));
    const visited = Object.entries(visits).filter(([id,v])=>ids.has(Number(id)) && v.progress && v.progress!=="未接触").length;
    const contracted = Object.entries(visits).filter(([id,v])=>ids.has(Number(id)) && v.progress==="契約済").length;
    const inProgress = Object.entries(visits).filter(([id,v])=>ids.has(Number(id)) && ["継続フォロー中","提案書送付済","契約検討中"].includes(v.progress)).length;
    return { total, visited, contracted, inProgress };
  }, [visits, typeFiltered]);


  // Kanban
  const kanbanGroups = useMemo(() => {
    return PROGRESS_OPTIONS.map(p => ({
      label: p,
      items: typeFiltered.filter(f => ((visits[f.id]||{}).progress||"未接触") === p)
        .filter(f => {
          if (filterDistrict !== "全て" && f.district !== filterDistrict) return false;
          if (filterNursing === "看護師あり" && !f.nursing) return false;
          if (filterNursing === "看護師なし" && f.nursing) return false;
          if (search) { const q=search.toLowerCase(); return f.name.toLowerCase().includes(q)||f.corp.toLowerCase().includes(q); }
          return true;
        })
    }));
  }, [visits, filterDistrict, filterNursing, search]);

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f1f5f9", padding:"0 24px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:"1400px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:"60px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>🏥</div>
            <div>
              <div style={{ fontSize:"15px", fontWeight:800, color:"#0f172a", letterSpacing:"-0.02em" }}>医療連携体制加算 営業管理</div>
              <div style={{ fontSize:"11px", color:"#94a3b8" }}>大阪市 福祉施設リスト</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            {importMsg && <span style={{ fontSize:"12px", color:"#059669", fontWeight:600, padding:"4px 10px", background:"#f0fdf4", borderRadius:"6px" }}>{importMsg}</span>}
            <button onClick={exportCSV} style={{ padding:"6px 12px", borderRadius:"7px", border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px" }}>
              📥 CSV出力
            </button>
            <button onClick={()=>fileInputRef.current.click()} style={{ padding:"6px 12px", borderRadius:"7px", border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", fontSize:"13px", cursor:"pointer" }}>
              📂 CSV読込
            </button>
            <button onClick={syncFromSheets} disabled={sheetsLoading} style={{ padding:"6px 12px", borderRadius:"7px", border:"1px solid #e2e8f0", background: sheetsConfigured ? "#f0fdf4" : "#f8fafc", color: sheetsConfigured ? "#059669" : "#94a3b8", fontSize:"13px", cursor:"pointer", opacity: sheetsLoading ? 0.6 : 1 }}>
              {sheetsLoading ? "⏳ 同期中..." : "🔄 Sheets同期"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display:"none" }} onChange={e=>{ handleFileImport(e.target.files[0]); e.target.value=""; }} />
            <button onClick={()=>setShowAddModal(true)} style={{ padding:"6px 14px", borderRadius:"7px", border:"none", background:"#6366f1", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer" }}>
              ＋ 施設追加
            </button>
            <div style={{ width:"1px", height:"24px", background:"#e2e8f0", margin:"0 4px" }} />
            {["list","kanban"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"6px 14px", borderRadius:"7px", border:"1px solid",
                borderColor:view===v?"#6366f1":"#e2e8f0", background:view===v?"#eef2ff":"transparent",
                color:view===v?"#4338ca":"#64748b", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                {v==="list"?"📋 一覧":"📊 カンバン"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:"1400px", margin:"0 auto", padding:"24px" }}>
          {/* Type tabs */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
          {TYPE_TABS.map(t => {
            const count = t === "全て" ? ALL_FACILITIES.length : ALL_FACILITIES.filter(f=>f.type===t).length;
            const active = activeType === t;
            const col = TYPE_COLORS[t];
            return (
              <button key={t} onClick={()=>handleTypeChange(t)} style={{
                padding:"10px 22px", borderRadius:"10px", border:`2px solid ${active ? col.border : "#e2e8f0"}`,
                background: active ? col.bg : "#fff",
                color: active ? col.text : "#64748b",
                fontSize:"14px", fontWeight: active ? 800 : 500,
                cursor:"pointer", display:"flex", alignItems:"center", gap:"8px",
                boxShadow: active ? `0 2px 8px ${col.border}30` : "none",
                transition:"all 0.15s"
              }}>
                <span style={{ width:"8px", height:"8px", borderRadius:"50%", background: active ? col.dot : "#cbd5e1", display:"inline-block" }} />
                {t}
                <span style={{ fontSize:"12px", background: active ? col.border : "#f1f5f9", color: active ? "#fff" : "#94a3b8",
                  borderRadius:"20px", padding:"1px 8px", fontWeight:700 }}>{count}</span>
              </button>
            );
          })}
        </div>

      {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
          {[
            { label:"総施設数", value:stats.total, icon:"🏢", color:"#6366f1" },
            { label:"訪問済", value:stats.visited, icon:"✅", color:"#0ea5e9" },
            { label:"商談中", value:stats.inProgress, icon:"⚡", color:"#f59e0b" },
            { label:"契約済", value:stats.contracted, icon:"🎉", color:"#22c55e" },
          ].map(s=>(
            <div key={s.label} style={{ background:"#fff", borderRadius:"12px", padding:"16px 20px", border:"1px solid #f1f5f9" }}>
              <div style={{ fontSize:"22px", marginBottom:"4px" }}>{s.icon}</div>
              <div style={{ fontSize:"28px", fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"4px", fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background:"#fff", borderRadius:"12px", padding:"16px 20px", border:"1px solid #f1f5f9", marginBottom:"16px", display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", flex:"1 1 180px", gap:"6px", minWidth:"180px" }}>
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") setSearch(searchInput); }}
              placeholder="🔍  施設名・法人名で検索..."
              style={{ flex:1, padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", outline:"none" }} />
            <button onClick={()=>setSearch(searchInput)}
              style={{ padding:"8px 16px", borderRadius:"8px", border:"none", background:"#6366f1", color:"#fff", fontSize:"13px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              検索
            </button>
            {search && <button onClick={()=>{ setSearch(""); setSearchInput(""); }}
              style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:"13px", cursor:"pointer" }}>
              ✕
            </button>}
          </div>
          <select value={filterDistrict} onChange={e=>setFilterDistrict(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", color:"#374151", outline:"none" }}>
            {districts.map(d=><option key={d}>{d}</option>)}
          </select>
          <select value={filterProgress} onChange={e=>setFilterProgress(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", color:"#374151", outline:"none" }}>
            {["全て",...PROGRESS_OPTIONS].map(p=><option key={p}>{p}</option>)}
          </select>
          <select value={filterNursing} onChange={e=>setFilterNursing(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", color:"#374151", outline:"none" }}>
            {["全て","看護師あり","看護師なし"].map(p=><option key={p}>{p}</option>)}
          </select>
          {view==="list" && (
            <select value={sortKey} onChange={e=>setSortKey(e.target.value)} style={{ padding:"8px 12px", borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"13px", color:"#374151", outline:"none" }}>
              <option value="district">区で並べる</option>
              <option value="progress">進捗で並べる</option>
              <option value="name">名前順</option>
            </select>
          )}
          <div style={{ fontSize:"13px", color:"#94a3b8", marginLeft:"auto" }}>{view==="list"?`${filtered.length}件`:`${ALL_FACILITIES.length}件`}</div>
        </div>

        {/* List view */}
        {view==="list" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {filtered.map(f => {
              const v = visits[f.id] || {};
              const prog = v.progress || "未接触";
              const visitCount = (v.history||[]).length;
              const cardCount = (v.contacts||[]).filter(c=>c.card).length;
              return (
                <div key={f.id} onClick={()=>setSelected(f)}
                  style={{ background:"#fff", borderRadius:"12px", padding:"14px 18px", border:"1px solid #f1f5f9",
                    cursor:"pointer", display:"flex", alignItems:"center", gap:"14px",
                    transition:"box-shadow 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(99,102,241,0.12)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
                  <div style={{ width:"8px", height:"40px", borderRadius:"4px", background:PROGRESS_COLORS[prog], flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px" }}>
                      <span style={{ fontSize:"14px", fontWeight:700, color:"#0f172a" }}>{f.name}</span>
                      {f.nursing && <span style={{ fontSize:"11px", background:"#fef3c7", color:"#92400e", borderRadius:"4px", padding:"2px 6px", fontWeight:600 }}>看護師有</span>}
                    </div>
                    <div style={{ fontSize:"12px", color:"#64748b" }}>{f.district} · {f.corp}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
                    {visitCount > 0 && <span style={{ fontSize:"12px", color:"#94a3b8" }}>訪問 {visitCount}回</span>}
                    {cardCount > 0 && <span style={{ fontSize:"12px", color:"#94a3b8" }}>名刺 {cardCount}枚</span>}
                    {f.careItems && f.careItems.length > 0 && <span style={{ fontSize:"11px", background:"#fef3c7", color:"#92400e", borderRadius:"4px", padding:"2px 8px" }}>ケア{f.careItems.length}項目</span>}
                    {(v.childTypes||[]).length > 0 && <span style={{ fontSize:"11px", background:"#f0fdf4", color:"#166534", borderRadius:"4px", padding:"2px 8px" }}>{v.childTypes[0]}{v.childTypes.length>1?` +${v.childTypes.length-1}`:""}</span>}
                    <span style={{ fontSize:"12px", fontWeight:700, padding:"4px 12px", borderRadius:"20px",
                      background:PROGRESS_COLORS[prog], color:PROGRESS_TEXT[prog] }}>{prog}</span>
                    {f.id >= 10000 && (
                      <button onClick={e=>{e.stopPropagation();if(window.confirm("この施設を削除しますか？"))deleteFacility(f.id);}}
                        style={{ padding:"3px 8px", borderRadius:"5px", border:"1px solid #fecaca", background:"#fff5f5", color:"#ef4444", fontSize:"11px", cursor:"pointer" }}>削除</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kanban */}
        {view==="kanban" && (
          <div style={{ display:"flex", gap:"12px", overflowX:"auto", paddingBottom:"12px" }}>
            {kanbanGroups.filter(g=>g.label!=="見送り"||g.items.length>0).map(group=>(
              <div key={group.label} style={{ minWidth:"220px", flex:"1 1 220px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:PROGRESS_COLORS[group.label] }} />
                  <span style={{ fontSize:"12px", fontWeight:700, color:"#374151" }}>{group.label}</span>
                  <span style={{ fontSize:"11px", color:"#94a3b8", marginLeft:"auto" }}>{group.items.length}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {group.items.map(f=>{
                    const v = visits[f.id]||{};
                    return (
                      <div key={f.id} onClick={()=>setSelected(f)} style={{ background:"#fff", borderRadius:"10px", padding:"12px 14px", border:"1px solid #f1f5f9", cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(99,102,241,0.1)"}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#0f172a", marginBottom:"4px" }}>{f.name}</div>
                        <div style={{ fontSize:"11px", color:"#94a3b8" }}>{f.district}</div>
                        {(v.history||[]).length>0 && <div style={{ fontSize:"11px", color:"#6366f1", marginTop:"6px" }}>📅 {v.history.length}回訪問済</div>}
                        {v.concerns && <div style={{ fontSize:"11px", color:"#f59e0b", marginTop:"2px" }}>⚠ 課題あり</div>}
                      </div>
                    );
                  })}
                  {group.items.length===0 && <div style={{ fontSize:"12px", color:"#cbd5e1", padding:"16px 0", textAlign:"center" }}>なし</div>}
                </div>
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

// ---- 施設追加モーダル ----
function AddFacilityModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    district:"", type:"児童発達支援", name:"", tel:"", address:"", corp:"", nursing:false
  });
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleAdd = () => {
    if (!form.name.trim()) { alert("施設名は必須です"); return; }
    if (!form.district.trim()) { alert("区名は必須です"); return; }
    onAdd(form);
    onClose();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div style={{ background:"#fff", borderRadius:"16px", width:"100%", maxWidth:"520px", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ padding:"22px 28px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:"17px", fontWeight:800, color:"#0f172a" }}>＋ 施設を追加</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#94a3b8" }}>✕</button>
        </div>
        <div style={{ padding:"22px 28px", display:"flex", flexDirection:"column", gap:"14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div>
              <label style={labelStyle}>区名 *</label>
              <input value={form.district} onChange={e=>upd("district",e.target.value)} placeholder="例：北区" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>サービス種別</label>
              <select value={form.type} onChange={e=>upd("type",e.target.value)} style={selectStyle}>
                <option>児童発達支援</option>
                <option>放課後等デイサービス</option>
                <option>その他</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>施設名 *</label>
            <input value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="例：○○こどもデイサービス" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>法人名</label>
            <input value={form.corp} onChange={e=>upd("corp",e.target.value)} placeholder="例：株式会社○○" style={inputStyle} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div>
              <label style={labelStyle}>電話番号</label>
              <input value={form.tel} onChange={e=>upd("tel",e.target.value)} placeholder="06-xxxx-xxxx" style={inputStyle} />
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:"2px" }}>
              <label style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", color:"#374151", cursor:"pointer" }}>
                <input type="checkbox" checked={form.nursing} onChange={e=>upd("nursing",e.target.checked)} style={{ width:"16px", height:"16px" }} />
                <span>看護師あり</span>
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>住所</label>
            <input value={form.address} onChange={e=>upd("address",e.target.value)} placeholder="大阪市○○区..." style={inputStyle} />
          </div>
          <div style={{ fontSize:"11px", color:"#94a3b8", background:"#f8fafc", borderRadius:"8px", padding:"8px 12px" }}>
            💡 CSVファイルでまとめて追加することもできます（ヘッダー：区名,サービス名,事業所名称,事業所電話番号,事業所の所在地,法人等名称,看護職員）
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px", marginTop:"4px" }}>
            <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:"8px", border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:"14px", cursor:"pointer" }}>キャンセル</button>
            <button onClick={handleAdd} style={{ padding:"10px 24px", borderRadius:"8px", border:"none", background:"#6366f1", color:"#fff", fontSize:"14px", fontWeight:700, cursor:"pointer" }}>追加する</button>
          </div>
        </div>
      </div>
    </div>
  );
}

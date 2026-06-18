import { useState, useEffect, useRef } from "react";
import { apiFetch, apiUpload } from "../utils/api";
import SignatureEditor from "./SignatureEditor";

const BASE = "http://localhost:8000";

const Icons = {
  doc:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  home:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  docs:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  pen:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  audit:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  x:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  clock:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}><span className="badge-dot"></span>{status}</span>;
}

function AuditModal({ docId, token, onClose }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/audit/${docId}`,{},token).then(setLogs).catch(()=>setLogs([])).finally(()=>setLoading(false)); },[]);
  const dotClass = a => a==="signed"?"audit-dot audit-dot-signed":a==="rejected"?"audit-dot audit-dot-rejected":a==="viewed"?"audit-dot audit-dot-viewed":"audit-dot audit-dot-upload";
  const dotIcon  = a => a==="signed"?"✓":a==="rejected"?"✕":a==="viewed"?"👁":"↑";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem"}}>
          <div><div className="modal-title">Audit Trail</div><div className="modal-sub" style={{margin:0}}>Complete activity log</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}>{Icons.x}</button>
        </div>
        {loading ? <div style={{textAlign:"center",padding:"2rem"}}><span className="spinner"></span></div> : logs.length===0 ? (
          <p style={{color:"#9CA3AF",fontSize:"0.85rem"}}>No activity logged yet.</p>
        ) : (
          <div className="audit-list">
            {logs.map((log,i)=>(
              <div key={log.id} className="audit-item" style={{animationDelay:`${i*0.05}s`}}>
                <div className={dotClass(log.action)}>{dotIcon(log.action)}</div>
                <div>
                  <div className="audit-action">{log.action}</div>
                  {log.detail && <div className="audit-detail">{log.detail}</div>}
                  <div className="audit-time">{new Date(log.timestamp).toLocaleString()} · {log.ip_address}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RejectModal({ doc, token, onClose, onDone }) {
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleReject = async () => {
    setLoading(true); setError("");
    try {
      // Get existing sigs, or create a placeholder one to reject against
      let sigs = await apiFetch(`/api/signatures/${doc.id}`,{},token);
      let pending = sigs.find(s => s.status === "pending");

      if (!pending) {
        // Create a dummy signature record so we can mark the doc as rejected
        pending = await apiFetch("/api/signatures", {
          method: "POST",
          body: JSON.stringify({ doc_id: doc.id, page: 0, x: 0, y: 0, width: 0.1, height: 0.05 })
        }, token);
      }

      await apiFetch("/api/signatures/finalize", {
        method: "POST",
        body: JSON.stringify({ signature_id: pending.id, action: "reject", reason })
      }, token);
      onDone();
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Reject Document</div>
        <div className="modal-sub">"{doc.filename}"</div>
        {error && <div className="alert-error">{error}</div>}
        <textarea className="form-input" rows={4} placeholder="Reason for rejection (optional)..."
          value={reason} onChange={e=>setReason(e.target.value)}
          style={{resize:"vertical",fontFamily:"var(--font-body)"}} />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={handleReject} disabled={loading}>
            {loading ? <span className="spinner"></span> : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AllAuditView({ token }) {
  const [docs, setDocs]     = useState([]);
  const [logs, setLogs]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/docs",{},token).then(async ds => {
      setDocs(ds);
      const logMap = {};
      for (const d of ds) {
        try { logMap[d.id] = await apiFetch(`/api/audit/${d.id}`,{},token); } catch{ logMap[d.id]=[]; }
      }
      setLogs(logMap);
    }).finally(()=>setLoading(false));
  },[]);

  if (loading) return <div style={{textAlign:"center",padding:"4rem"}}><span className="spinner"></span></div>;

  return (
    <div className="page-content">
      <h2 style={{fontFamily:"var(--font-display)",fontSize:"1.2rem",fontWeight:700,marginBottom:"1.5rem",color:"var(--navy)"}}>All Audit Logs</h2>
      {docs.length===0 ? <p style={{color:"var(--gray-4)"}}>No documents yet.</p> : docs.map(doc=>(
        <div key={doc.id} style={{background:"#fff",borderRadius:"var(--radius)",border:"1px solid var(--gray-2)",marginBottom:"1rem",overflow:"hidden"}}>
          <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--gray-2)",display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{color:"var(--indigo)"}}>{Icons.doc}</span>
            <span style={{fontWeight:600,fontSize:"0.9rem"}}>{doc.filename}</span>
            <StatusBadge status={doc.status} />
          </div>
          <div style={{padding:"0.75rem 1.25rem"}}>
            {(logs[doc.id]||[]).length===0 ? <p style={{color:"var(--gray-3)",fontSize:"0.8rem"}}>No activity yet</p> : (logs[doc.id]||[]).map(log=>(
              <div key={log.id} style={{display:"flex",gap:"12px",padding:"6px 0",borderBottom:"1px solid var(--gray-1)"}}>
                <span style={{fontSize:"0.75rem",fontWeight:600,color:"var(--indigo)",minWidth:70,textTransform:"capitalize"}}>{log.action}</span>
                <span style={{fontSize:"0.75rem",color:"var(--gray-4)",flex:1}}>{log.detail}</span>
                <span style={{fontSize:"0.72rem",color:"var(--gray-3)",whiteSpace:"nowrap"}}>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingView({ docs, token, onOpen, onReject }) {
  const pending = docs.filter(d=>d.status==="pending");
  return (
    <div className="page-content">
      <h2 style={{fontFamily:"var(--font-display)",fontSize:"1.2rem",fontWeight:700,marginBottom:"1.5rem",color:"var(--navy)"}}>Awaiting Your Signature</h2>
      {pending.length===0 ? (
        <div className="empty-state">
          {Icons.clock}
          <h3>All caught up!</h3>
          <p>No documents waiting for your signature</p>
        </div>
      ) : pending.map((doc,i)=>(
        <div key={doc.id} className="doc-card" style={{marginBottom:"0.75rem",animationDelay:`${i*0.06}s`}}>
          <div className="doc-icon" style={{color:"#6366F1"}}>{Icons.doc}</div>
          <div className="doc-info">
            <div className="doc-name">{doc.filename}</div>
            <div className="doc-meta">Uploaded {new Date(doc.created_at).toLocaleDateString()}</div>
          </div>
          <StatusBadge status={doc.status} />
          <div className="doc-actions">
            <button className="btn-sm btn-sign" onClick={()=>onOpen(doc)}>✏ Open & Sign</button>
            <button className="btn-sm btn-reject" onClick={()=>onReject(doc)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter]     = useState("all");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [auditDocId, setAuditDocId] = useState(null);
  const [rejectDoc, setRejectDoc]   = useState(null);
  const [editorDoc, setEditorDoc]   = useState(null);
  const [userName, setUserName]     = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef();

  useEffect(()=>{
    apiFetch("/api/auth/me",{},token).then(u=>{ setUserName(u.name); localStorage.setItem("username",u.name); }).catch(()=>{});
  },[token]);

  const fetchDocs = async () => {
    try {
      const url = filter==="all"?"/api/docs":`/api/docs?status=${filter}`;
      setDocs(await apiFetch(url,{},token));
    } catch(e){console.error(e);}
    finally{setLoading(false);}
  };
  useEffect(()=>{ setLoading(true); fetchDocs(); },[filter]);

  const handleUpload = async (file) => {
    if (!file||!file.name.endsWith(".pdf")){alert("PDF files only");return;}
    setUploading(true);
    try {
      const form = new FormData(); form.append("file",file);
      const doc = await apiUpload("/api/docs/upload",form,token);
      setDocs(prev=>[doc,...prev]);
      setActiveNav("dashboard");
    } catch(err){alert(err.message);}
    finally{setUploading(false);}
  };

  const handleDownload = async (doc) => {
    const res = await fetch(`${BASE}/api/docs/${doc.id}/download?signed=true`,{headers:{Authorization:`Bearer ${token}`}});
    if(!res.ok){alert("Signed PDF not available");return;}
    const blob=await res.blob(); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`signed_${doc.filename}`; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = { total:docs.length, pending:docs.filter(d=>d.status==="pending").length, signed:docs.filter(d=>d.status==="signed").length };
  const initials = userName.split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"U";

  if (editorDoc) return (
    <SignatureEditor doc={editorDoc} token={token} userName={userName}
      onClose={()=>setEditorDoc(null)}
      onSigned={()=>{ setEditorDoc(null); fetchDocs(); }} />
  );

  const navItems = [
    { id:"dashboard", label:"Dashboard", icon:Icons.home },
    { id:"sign",      label:"Sign",      icon:Icons.pen  },
    { id:"audit",     label:"Audit Logs",icon:Icons.audit },
  ];

  const renderMain = () => {
    if (activeNav==="sign")  return <PendingView docs={docs} token={token} onOpen={d=>setEditorDoc(d)} onReject={d=>setRejectDoc(d)} />;
    if (activeNav==="audit") return <AllAuditView token={token} />;

    // Default: dashboard view
    return (
      <div className="page-content">
        {/* Stats */}
        <div className="stats-row" style={{marginBottom:"1.5rem"}}>
          {[
            {num:stats.total,  label:"Total Documents",   color:"#6366F1", bg:"rgba(99,102,241,0.1)", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
            {num:stats.pending,label:"Awaiting Signature",color:"#F59E0B", bg:"rgba(245,158,11,0.1)", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
            {num:stats.signed, label:"Signed & Complete", color:"#10B981", bg:"rgba(16,185,129,0.1)",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>},
          ].map((s,i)=>(
            <div key={i} className="stat-card animate-fadeUp" style={{animationDelay:`${i*0.1}s`}}>
              <div className="stat-icon" style={{background:s.bg}}>{s.icon}</div>
              <div><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div className={`upload-zone${dragOver?" drag-over":""}`}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleUpload(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current.click()} style={{marginBottom:"1.5rem"}}>
          <div className="upload-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
          </div>
          <div className="upload-title">Drop your PDF here</div>
          <div className="upload-sub">or click to browse · PDF files only</div>
          {uploading&&<div className="upload-progress"><div className="upload-progress-bar"></div></div>}
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {["all","pending","signed","rejected"].map(f=>(
            <button key={f} className={`filter-tab${filter===f?" active":""}`} onClick={()=>setFilter(f)}>
              {f==="all"?"All documents":f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        <div className="section-title">{filter==="all"?"All Documents":filter} · {docs.length} file{docs.length!==1?"s":""}</div>

        {loading ? (
          <div style={{textAlign:"center",padding:"3rem"}}><span className="spinner"></span></div>
        ) : docs.length===0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>No documents yet</h3><p>Upload a PDF above to get started</p>
          </div>
        ) : (
          <div className="doc-grid">
            {docs.map((doc,i)=>(
              <div key={doc.id} className="doc-card" style={{animationDelay:`${i*0.06}s`}}>
                <div className="doc-icon" style={{color:"#6366F1"}}>{Icons.doc}</div>
                <div className="doc-info">
                  <div className="doc-name">{doc.filename}</div>
                  <div className="doc-meta">Uploaded {new Date(doc.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
                </div>
                <StatusBadge status={doc.status} />
                <div className="doc-actions">
                  {doc.status==="pending"&&(<>
                    <button className="btn-sm btn-sign"   onClick={()=>setEditorDoc(doc)}>✏ Open & Sign</button>
                    <button className="btn-sm btn-reject" onClick={()=>setRejectDoc(doc)}>Reject</button>
                  </>)}
                  {doc.status==="signed"&&(
                    <button className="btn-sm btn-download" onClick={()=>handleDownload(doc)}>{Icons.download} Download</button>
                  )}
                  <button className="btn-sm btn-view" title="Audit trail" onClick={()=>setAuditDocId(doc.id)}>{Icons.audit}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-dot"></div><span className="sidebar-logo-text">Doc<span>Sign</span></span></div>
        <div className="sidebar-section">
          <div className="sidebar-label">Menu</div>
          {navItems.map(n=>(
            <button key={n.id} className={`sidebar-item${activeNav===n.id?" active":""}`} onClick={()=>setActiveNav(n.id)}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div><div className="sidebar-username">{userName||"My Account"}</div><div className="sidebar-email">Signed in</div></div>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            {activeNav==="dashboard"?"Dashboard":activeNav==="sign"?"Sign Documents":"Audit Logs"}
          </div>
          <div className="topbar-right">
            <button className="btn-sm btn-sign" onClick={()=>fileRef.current.click()} disabled={uploading}>
              {uploading?<span className="spinner"></span>:"+ Upload PDF"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{handleUpload(e.target.files[0]);e.target.value="";}} />
          </div>
        </div>
        {renderMain()}
      </main>

      {auditDocId && <AuditModal docId={auditDocId} token={token} onClose={()=>setAuditDocId(null)} />}
      {rejectDoc  && <RejectModal doc={rejectDoc} token={token} onClose={()=>setRejectDoc(null)} onDone={()=>{setRejectDoc(null);fetchDocs();}} />}
    </div>
  );
}
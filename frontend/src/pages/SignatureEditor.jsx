import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { apiFetch } from "../utils/api";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const BASE = "http://localhost:8000";

export default function SignatureEditor({ doc, token, userName, onClose, onSigned }) {
  const [numPages, setNumPages]     = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [placements, setPlacements] = useState([]); // {id, page, x, y, w, h} in px relative to container
  const [sigImage, setSigImage]     = useState(null); // blob URL of user's sig PNG
  const [dragging, setDragging]     = useState(null); // {id, offX, offY}
  const [resizing, setResizing]     = useState(null);
  const [signing, setSigning]       = useState(false);
  const [pageSize, setPageSize]     = useState({ width: 0, height: 0 });
  const [pdfUrl, setPdfUrl]         = useState(null);
  const containerRef = useRef();
  const nextId = useRef(1);

  // Load PDF as blob (needs auth header)
  useEffect(() => {
    fetch(`${BASE}/api/docs/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(b => setPdfUrl(URL.createObjectURL(b)));
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [doc.id, token]);

  // Load user's signature image
  useEffect(() => {
    fetch(`${BASE}/api/auth/signature-image`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) return r.blob(); throw new Error("no sig"); })
      .then(b => setSigImage(URL.createObjectURL(b)))
      .catch(() => setSigImage(null));
  }, [token]);

  const onPageLoad = ({ width, height }) => setPageSize({ width, height });

  // Click on PDF canvas → place a new signature
  const handleCanvasClick = (e) => {
    if (e.target.closest(".sig-placement")) return; // clicked an existing sig
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const W = 160, H = 60;
    setPlacements(prev => [...prev, { id: nextId.current++, page: currentPage - 1, x: x - W/2, y: y - H/2, w: W, h: H }]);
  };

  // Drag move
  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const rect = containerRef.current.getBoundingClientRect();
      setPlacements(prev => prev.map(p => p.id === dragging.id
        ? { ...p, x: e.clientX - rect.left - dragging.offX, y: e.clientY - rect.top - dragging.offY }
        : p));
    }
    if (resizing) {
      const rect = containerRef.current.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      setPlacements(prev => prev.map(p => p.id === resizing.id
        ? { ...p, w: Math.max(80, nx - p.x), h: Math.max(30, ny - p.y) }
        : p));
    }
  }, [dragging, resizing]);

  const handleMouseUp = useCallback(() => { setDragging(null); setResizing(null); }, []);

  const removePlacement = (id) => setPlacements(prev => prev.filter(p => p.id !== id));

  const handleFinalize = async () => {
    if (placements.length === 0) { alert("Place at least one signature first"); return; }
    setSigning(true);
    try {
      const pw = pageSize.width || containerRef.current?.offsetWidth || 600;
      const ph = pageSize.height || 800;

      // Save each placement as a signature record
      const savedSigs = [];
      for (const p of placements) {
        const sig = await apiFetch("/api/signatures", {
          method: "POST",
          body: JSON.stringify({
            doc_id: doc.id,
            page: p.page,
            x: Math.max(0, p.x / pw),
            y: Math.max(0, p.y / ph),
            width:  Math.min(1, p.w / pw),
            height: Math.min(1, p.h / ph),
          })
        }, token);
        savedSigs.push(sig);
      }

      // Finalize — sign the first one (backend signs all)
      await apiFetch("/api/signatures/finalize", {
        method: "POST",
        body: JSON.stringify({ signature_id: savedSigs[0].id, action: "sign" })
      }, token);

      onSigned();
    } catch (err) { alert(err.message); }
    finally { setSigning(false); }
  };

  const currentPlacements = placements.filter(p => p.page === currentPage - 1);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,15,30,0.92)", zIndex:300, display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:"#111827", borderBottom:"1px solid #1E2A45", padding:"0.75rem 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#9CA3AF", borderRadius:"8px", padding:"6px 12px", cursor:"pointer", fontSize:"0.8rem" }}>← Back</button>
          <div>
            <div style={{ color:"#F8F7FF", fontWeight:600, fontSize:"0.9rem", fontFamily:"var(--font-display)" }}>{doc.filename}</div>
            <div style={{ color:"#6B7280", fontSize:"0.72rem" }}>Click anywhere on the PDF to place your signature · Drag to reposition</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Page nav */}
          {numPages > 1 && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
                style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#9CA3AF", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>‹</button>
              <span style={{ color:"#9CA3AF", fontSize:"0.8rem" }}>Page {currentPage} / {numPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(numPages,p+1))} disabled={currentPage===numPages}
                style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#9CA3AF", borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>›</button>
            </div>
          )}
          <div style={{ color:"#6B7280", fontSize:"0.8rem", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"6px", padding:"4px 10px" }}>
            {placements.length} signature{placements.length!==1?"s":""} placed
          </div>
          <button onClick={handleFinalize} disabled={signing || placements.length===0}
            style={{ background:"#6366F1", color:"#fff", border:"none", borderRadius:"8px", padding:"8px 20px", fontWeight:600, fontSize:"0.875rem", cursor:"pointer", opacity: placements.length===0?0.5:1, fontFamily:"var(--font-display)" }}>
            {signing ? "Signing…" : "✓ Finalize & Sign"}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Left panel — sig image manager */}
        <div style={{ width:"220px", background:"#111827", borderRight:"1px solid #1E2A45", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"1rem", overflowY:"auto", flexShrink:0 }}>
          <div style={{ color:"#F8F7FF", fontWeight:600, fontSize:"0.85rem", fontFamily:"var(--font-display)" }}>Your Signature</div>
          {sigImage ? (
            <div>
              <div style={{ background:"#1E2A45", borderRadius:"8px", padding:"8px", border:"1px solid #2D3D5A", marginBottom:"8px" }}>
                <img src={sigImage} alt="signature" style={{ width:"100%", maxHeight:"80px", objectFit:"contain" }} />
              </div>
              <label style={{ display:"block", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)", color:"#818CF8", borderRadius:"6px", padding:"6px", fontSize:"0.75rem", textAlign:"center", cursor:"pointer" }}>
                Replace PNG
                <input type="file" accept=".png" style={{ display:"none" }} onChange={e => uploadSigImage(e.target.files[0])} />
              </label>
            </div>
          ) : (
            <div>
              <div style={{ color:"#6B7280", fontSize:"0.75rem", marginBottom:"8px", lineHeight:1.5 }}>Upload a transparent PNG of your handwritten signature</div>
              <label style={{ display:"block", background:"rgba(99,102,241,0.15)", border:"2px dashed rgba(99,102,241,0.4)", color:"#818CF8", borderRadius:"8px", padding:"16px 8px", fontSize:"0.75rem", textAlign:"center", cursor:"pointer" }}>
                + Upload PNG Signature
                <input type="file" accept=".png" style={{ display:"none" }} onChange={e => uploadSigImage(e.target.files[0])} />
              </label>
              <div style={{ color:"#4B5563", fontSize:"0.7rem", marginTop:"8px" }}>Tip: Use a PNG with transparent background for best results</div>
            </div>
          )}

          <div style={{ borderTop:"1px solid #1E2A45", paddingTop:"1rem" }}>
            <div style={{ color:"#F8F7FF", fontWeight:600, fontSize:"0.85rem", fontFamily:"var(--font-display)", marginBottom:"8px" }}>Placements</div>
            {placements.length === 0 ? (
              <div style={{ color:"#4B5563", fontSize:"0.75rem" }}>Click on the PDF to place signatures</div>
            ) : (
              placements.map((p, i) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#1E2A45", borderRadius:"6px", padding:"6px 8px", marginBottom:"4px" }}>
                  <span style={{ color:"#9CA3AF", fontSize:"0.75rem" }}>Sig {i+1} · Page {p.page+1}</span>
                  <button onClick={() => removePlacement(p.id)} style={{ background:"rgba(239,68,68,0.15)", border:"none", color:"#F87171", borderRadius:"4px", padding:"2px 6px", cursor:"pointer", fontSize:"0.7rem" }}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PDF canvas area */}
        <div style={{ flex:1, overflow:"auto", display:"flex", justifyContent:"center", padding:"2rem", background:"#0A0F1E" }}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          {pdfUrl ? (
            <div style={{ position:"relative", display:"inline-block", cursor:"crosshair", boxShadow:"0 8px 40px rgba(0,0,0,0.6)" }}
              ref={containerRef} onClick={handleCanvasClick}>
              <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page pageNumber={currentPage} onLoadSuccess={onPageLoad}
                  renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
              {/* Signature overlays */}
              {currentPlacements.map(p => (
                <div key={p.id} className="sig-placement"
                  style={{ position:"absolute", left:p.x, top:p.y, width:p.w, height:p.h,
                    border:"2px dashed #6366F1", borderRadius:"4px", cursor:"move",
                    background:"rgba(99,102,241,0.08)", userSelect:"none" }}
                  onMouseDown={e => { e.stopPropagation(); setDragging({ id:p.id, offX:e.clientX-containerRef.current.getBoundingClientRect().left-p.x, offY:e.clientY-containerRef.current.getBoundingClientRect().top-p.y }); }}>
                  {sigImage
                    ? <img src={sigImage} alt="sig" style={{ width:"100%", height:"100%", objectFit:"contain", pointerEvents:"none" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#6366F1", fontFamily:"'Dancing Script',cursive", fontSize:"1.2rem" }}>{userName}</div>
                  }
                  {/* Delete button */}
                  <button onClick={e => { e.stopPropagation(); removePlacement(p.id); }}
                    style={{ position:"absolute", top:-10, right:-10, width:20, height:20, borderRadius:"50%", background:"#EF4444", border:"none", color:"#fff", cursor:"pointer", fontSize:"10px", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>✕</button>
                  {/* Resize handle */}
                  <div onMouseDown={e => { e.stopPropagation(); setResizing({ id:p.id }); }}
                    style={{ position:"absolute", bottom:-4, right:-4, width:12, height:12, background:"#6366F1", borderRadius:"2px", cursor:"se-resize" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color:"#6B7280", display:"flex", alignItems:"center", gap:"8px" }}>
              <span className="spinner"></span> Loading PDF…
            </div>
          )}
        </div>
      </div>
    </div>
  );

  async function uploadSigImage(file) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await fetch(`${BASE}/api/auth/signature-image`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:form });
    const blob = await fetch(`${BASE}/api/auth/signature-image`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.blob());
    setSigImage(URL.createObjectURL(blob));
  }
}
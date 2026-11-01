import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Plus, Pin, Trash2, LogOut, X, Check, FileText, Sparkles, Menu } from "lucide-react";
import { request } from "./api";

const COLORS = ["cream", "blue", "pink", "green", "purple"];
const blankNote = { title: "", content: "", color: "cream" };
const dateLabel = (date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await request(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      onAuth(data);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="auth-wrap">
    <section className="auth-card">
      <div className="brand-mark"><BookOpen size={23}/></div>
      <p className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</p>
      <h1>Your thoughts,<br/><em>beautifully kept.</em></h1>
      <p className="auth-sub">Capture ideas, collect the little things, and find your focus.</p>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>Your name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Alex Morgan"/></label>}
        <label>Email address<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
        <label>Password<input type="password" required minLength="8" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="switch-auth">{mode === "login" ? "New here?" : "Already have an account?"} <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>{mode==="login"?"Create an account":"Sign in"}</button></p>
    </section>
    <div className="auth-decoration"><div className="floating-note note-one">“Make room for<br/>what matters.”</div><div className="floating-note note-two"><Sparkles size={16}/> one thought at a time</div><div className="big-circle"/></div>
  </main>;
}

function NoteEditor({ note, onClose, onSave, onDelete, onPin }) {
  const [draft, setDraft] = useState(note || blankNote);
  const [saving, setSaving] = useState(false);
  useEffect(()=>setDraft(note || blankNote),[note]);
  const save = async () => {
    if (!draft.title.trim() && !draft.content.trim()) { onClose(); return; }
    setSaving(true);
    try { await onSave({ ...draft, title: draft.title.trim() || "Untitled note" }); onClose(); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className={`editor-card paper-${draft.color}`}>
      <header className="editor-top"><span className="saved-indicator"><span/> {note? "EDITING NOTE":"NEW NOTE"}</span><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
      <input className="editor-title" autoFocus placeholder="Give your note a title…" value={draft.title} maxLength={120} onChange={e=>setDraft({...draft,title:e.target.value})}/>
      <textarea className="editor-content" placeholder="Start writing something wonderful…" value={draft.content} maxLength={20000} onChange={e=>setDraft({...draft,content:e.target.value})}/>
      <footer className="editor-bottom">
        <div className="color-picker">{COLORS.map(c=><button key={c} title={`${c} paper`} className={`color-dot ${c} ${draft.color===c?"selected":""}`} onClick={()=>setDraft({...draft,color:c})}/>)}</div>
        <div className="editor-actions">
          {note && <button className="icon-btn danger" title="Delete note" onClick={onDelete}><Trash2 size={17}/></button>}
          {note && <button className={`icon-btn ${note.pinned?"is-pinned":""}`} title="Pin note" onClick={onPin}><Pin size={17}/></button>}
          <button className="primary save-btn" onClick={save} disabled={saving}>{saving?"Saving…":<><Check size={16}/> Save note</>}</button>
        </div>
      </footer>
    </section>
  </div>;
}

function App() {
  const [auth, setAuth] = useState(()=>({ token: localStorage.getItem("notes_token"), user: null }));
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = auth.token;
  const logout = () => { localStorage.removeItem("notes_token"); setAuth({token:null,user:null}); setNotes([]); };
  const load = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [me, data] = await Promise.all([request("/auth/me",{},token),request("/notes",{},token)]);
      setAuth(a=>({...a,user:me.user})); setNotes(data.notes);
    } catch (e) { if (e.message.includes("Session") || e.message.includes("Authentication") || e.message.includes("User not found")) logout(); else setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[token]);
  const filtered = useMemo(()=>notes.filter(n=>`${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase())),[notes,query]);
  const pinned = filtered.filter(n=>n.pinned);
  const regular = filtered.filter(n=>!n.pinned);
  const saveNote = async (draft) => {
    const editing = editor?._id;
    const data = await request(editing?`/notes/${editing}`:"/notes",{method:editing?"PUT":"POST",body:JSON.stringify(draft)},token);
    setNotes(old=>editing?old.map(n=>n._id===editing?data.note:n):[data.note,...old]);
  };
  const deleteNote = async () => {
    if (!editor?._id || !confirm("Delete this note permanently?")) return;
    await request(`/notes/${editor._id}`,{method:"DELETE"},token);
    setNotes(old=>old.filter(n=>n._id!==editor._id)); setEditor(null);
  };
  const togglePin = async () => {
    if (!editor?._id) return;
    const data = await request(`/notes/${editor._id}`,{method:"PUT",body:JSON.stringify({pinned:!editor.pinned})},token);
    setNotes(old=>old.map(n=>n._id===data.note._id?data.note:n)); setEditor(data.note);
  };
  if (!token) return <AuthScreen onAuth={data=>{localStorage.setItem("notes_token",data.token);setAuth(data);setLoading(true);}}/>;
  if (loading) return <div className="loading-screen"><div className="brand-mark"><BookOpen/></div><p>Gathering your thoughts…</p></div>;

  const NoteCard = ({note}) => <article className={`note-card paper-${note.color}`} onClick={()=>setEditor(note)}>
    <div className="note-card-top"><span className="note-date">{dateLabel(note.updatedAt)}</span>{note.pinned&&<Pin size={15} className="pin-icon" fill="currentColor"/>}</div>
    <h3>{note.title || "Untitled note"}</h3><p className="note-preview">{note.content || "No additional text"}</p>
    <div className="note-card-foot"><span>{note.content?.trim()?`${note.content.trim().split(/\s+/).length} words`:"Just a title"}</span><span className="open-note">Open <span>↗</span></span></div>
  </article>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-mark"><BookOpen size={20}/></div><span>thoughts<span className="brand-period">.</span></span></div>
      <div className="side-label">YOUR SPACE</div>
      <button className="side-link active"><FileText size={17}/> All notes <span className="count">{notes.length}</span></button>
      <div className="sidebar-bottom"><div className="avatar">{auth.user?.name?.[0]?.toUpperCase()||"U"}</div><div className="user-meta"><strong>{auth.user?.name||"Your account"}</strong><span>{auth.user?.email}</span></div><button className="icon-btn logout" title="Sign out" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="main-header"><div><p className="eyebrow">YOUR PERSONAL NOTEBOOK</p><h1>All notes<span className="brand-period">.</span></h1><p className="header-sub">A home for everything on your mind.</p></div><button className="primary new-note" onClick={()=>setEditor(blankNote)}><Plus size={18}/> New note</button></header>
      <div className="toolbar"><div className="search-box"><Search size={18}/><input placeholder="Search your notes…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery("")}><X size={15}/></button>}</div><span className="note-total">{filtered.length} {filtered.length===1?"NOTE":"NOTES"}</span></div>
      {error&&<p className="error">{error}</p>}
      {filtered.length===0 ? <div className="empty-state"><div className="empty-icon"><BookOpen size={28}/></div><h2>{query?"No notes found":"Your page is still blank."}</h2><p>{query?"Try another search term.":"Start with a thought, a plan, or anything you don't want to forget."}</p>{!query&&<button className="primary" onClick={()=>setEditor(blankNote)}><Plus size={17}/> Write your first note</button>}</div> :
        <div className="notes-content">
          {pinned.length>0&&<section className="note-section"><div className="section-heading"><span>PINNED</span><div/></div><div className="notes-grid">{pinned.map(n=><NoteCard key={n._id} note={n}/>)}</div></section>}
          {regular.length>0&&<section className="note-section"><div className="section-heading"><span>{pinned.length?"ALL NOTES":"YOUR NOTES"}</span><div/></div><div className="notes-grid">{regular.map(n=><NoteCard key={n._id} note={n}/>)}</div></section>}
        </div>}
      <footer className="page-footer"><span>Made for the thoughts worth keeping.</span><span><Sparkles size={13}/> A little clarity, every day.</span></footer>
    </main>
    {editor&&<NoteEditor note={editor._id?editor:null} onClose={()=>setEditor(null)} onSave={saveNote} onDelete={deleteNote} onPin={togglePin}/>}
  </div>;
}
export default App;

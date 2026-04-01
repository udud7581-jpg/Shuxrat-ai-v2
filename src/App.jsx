import { useState, useRef, useEffect } from "react";

const STORAGE_KEY = "shuxrat_ai_chats_v2";

const systemPrompt = `Sen Shuxrat AI — aqlli, do'stona va ikki tilli yordamchi. Foydalanuvchi o'zbek tilida yozsa, o'zbek tilida javob ber. Ingliz tilida yozsa, ingliz tilida javob ber. Qisqa, aniq va foydali javoblar ber.`;

function loadChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveChats(chats) { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function ShuxratAI() {
  const [chats, setChats] = useState(() => loadChats());
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { saveChats(chats); }, [chats]);

  function newChat() {
    const chat = { id: generateId(), title: "Yangi suhbat", messages: [], createdAt: Date.now() };
    setChats(prev => [chat, ...prev]);
    setActiveChatId(chat.id);
    setSidebarOpen(false);
    setImage(null);
  }

  function deleteChat(id) {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ base64: reader.result.split(",")[1], mediaType: file.type, preview: reader.result });
    };
    reader.readAsDataURL(file);
  }

  async function sendMessage() {
    if (!input.trim() && !image) return;

    let chatId = activeChatId;
    if (!chatId) {
      const chat = { id: generateId(), title: input.slice(0, 30) || "Rasm tahlili", messages: [], createdAt: Date.now() };
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);
      chatId = chat.id;
    }

    const userContent = [];
    if (image) userContent.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
    if (input.trim()) userContent.push({ type: "text", text: input.trim() });

    const userMsg = { role: "user", content: userContent, imagePreview: image?.preview };
    const prevMessages = chats.find(c => c.id === chatId)?.messages || [];
    const newMessages = [...prevMessages, userMsg];

    setChats(prev => prev.map(c => c.id === chatId ? {
      ...c,
      title: c.messages.length === 0 ? (input.slice(0, 35) || "Rasm tahlili") : c.title,
      messages: newMessages
    } : c));

    setInput("");
    setImage(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "Xatolik yuz berdi.";
      const assistantMsg = { role: "assistant", content: [{ type: "text", text }] };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...newMessages, assistantMsg] } : c));
    } catch {
      const errMsg = { role: "assistant", content: [{ type: "text", text: "❌ Xatolik yuz berdi. Qayta urinib ko'ring." }] };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...newMessages, errMsg] } : c));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0f; --surface: #111118; --surface2: #1a1a24;
          --border: #ffffff0f; --border2: #ffffff18;
          --accent: #7c6aff; --accent2: #a78bfa; --accent3: #06d6a0;
          --text: #f0eeff; --text2: #9b8ec4; --text3: #5a4f7a;
          --user-bg: #1e1340; --danger: #ff6b6b; --radius: 16px;
        }
        body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }
        .app { display: flex; height: 100vh; }

        .sidebar {
          width: 270px; background: var(--surface); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; flex-shrink: 0; transition: transform 0.3s cubic-bezier(.4,0,.2,1); z-index: 100;
        }
        .sidebar-header { padding: 18px 14px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
        .logo { font-size: 17px; font-weight: 700; background: linear-gradient(135deg, var(--accent), var(--accent3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; flex: 1; }
        .new-btn { background: linear-gradient(135deg, var(--accent), #5b4fd4); color: white; border: none; padding: 7px 13px; border-radius: 9px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
        .new-btn:hover { opacity: 0.85; }
        .chat-list { flex: 1; overflow-y: auto; padding: 8px; }
        .chat-list::-webkit-scrollbar { width: 3px; }
        .chat-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .chat-item { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 9px; cursor: pointer; color: var(--text2); font-size: 13px; margin-bottom: 2px; transition: background 0.15s; }
        .chat-item:hover { background: var(--surface2); color: var(--text); }
        .chat-item.active { background: var(--user-bg); color: var(--accent2); }
        .chat-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .del-btn { opacity: 0; background: none; border: none; color: var(--danger); cursor: pointer; font-size: 17px; padding: 1px 5px; border-radius: 4px; }
        .chat-item:hover .del-btn { opacity: 1; }
        .empty-chats { color: var(--text3); font-size: 13px; padding: 14px 12px; }

        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .topbar { display: none; padding: 13px 15px; border-bottom: 1px solid var(--border); background: var(--surface); align-items: center; gap: 11px; }
        .hamburger { background: none; border: none; color: var(--text2); font-size: 21px; cursor: pointer; }
        .topbar-title { font-weight: 700; color: var(--accent2); font-size: 15px; }

        .messages-area { flex: 1; overflow-y: auto; padding: 20px 0; }
        .messages-area::-webkit-scrollbar { width: 3px; }
        .messages-area::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
        .msg-wrap { max-width: 760px; margin: 0 auto; padding: 0 18px; }
        .message { display: flex; gap: 11px; margin-bottom: 22px; animation: fadeUp 0.25s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        .message.user { flex-direction: row-reverse; }
        .avatar { width: 33px; height: 33px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .avatar.ai { background: linear-gradient(135deg, var(--accent), var(--accent3)); color: white; }
        .avatar.user { background: var(--user-bg); border: 1px solid var(--accent); color: var(--accent2); }
        .bubble { max-width: 74%; padding: 12px 15px; border-radius: var(--radius); font-size: 14.5px; line-height: 1.65; word-break: break-word; white-space: pre-wrap; }
        .bubble.ai { background: var(--surface); border: 1px solid var(--border2); border-radius: 4px 16px 16px 16px; }
        .bubble.user { background: linear-gradient(135deg, #2d1f6e, #1e1340); border: 1px solid #7c6aff33; border-radius: 16px 4px 16px 16px; }
        .bubble img { max-width: 200px; border-radius: 9px; margin-bottom: 8px; display: block; }
        .thinking { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulse 1.2s ease-in-out infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; background: var(--accent2); }
        .dot:nth-child(3) { animation-delay: 0.4s; background: var(--accent3); }
        @keyframes pulse { 0%,80%,100% { transform: scale(0.7); opacity: 0.5; } 40% { transform: scale(1.1); opacity: 1; } }

        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px; text-align: center; }
        .empty-logo { font-size: 46px; font-weight: 800; background: linear-gradient(135deg, var(--accent), var(--accent3)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .empty-sub { color: var(--text3); font-size: 13.5px; max-width: 240px; line-height: 1.6; }
        .suggestions { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 6px; }
        .sug-btn { background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); padding: 7px 13px; border-radius: 18px; font-family: 'Sora', sans-serif; font-size: 12.5px; cursor: pointer; transition: all 0.2s; }
        .sug-btn:hover { border-color: var(--accent); color: var(--accent2); background: var(--user-bg); }

        .input-area { padding: 14px 18px 18px; border-top: 1px solid var(--border); background: var(--bg); }
        .input-box { max-width: 760px; margin: 0 auto; }
        .img-preview-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
        .img-thumb { width: 46px; height: 46px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border2); }
        .rm-img { background: var(--surface2); border: none; color: var(--danger); cursor: pointer; font-size: 17px; border-radius: 6px; padding: 2px 7px; }
        .input-row { display: flex; gap: 9px; align-items: flex-end; background: var(--surface); border: 1px solid var(--border2); border-radius: 13px; padding: 9px 11px; transition: border-color 0.2s; }
        .input-row:focus-within { border-color: var(--accent); box-shadow: 0 4px 20px #7c6aff22; }
        .attach-btn { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 19px; padding: 3px; border-radius: 6px; transition: color 0.2s; flex-shrink: 0; }
        .attach-btn:hover { color: var(--accent2); }
        textarea { flex: 1; background: none; border: none; outline: none; color: var(--text); font-family: 'Sora', sans-serif; font-size: 14.5px; resize: none; max-height: 130px; min-height: 24px; line-height: 1.5; }
        textarea::placeholder { color: var(--text3); }
        .send-btn { background: linear-gradient(135deg, var(--accent), #5b4fd4); border: none; color: white; width: 35px; height: 35px; border-radius: 9px; cursor: pointer; font-size: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .send-btn:not(:disabled):hover { opacity: 0.85; }

        @media (max-width: 680px) {
          .sidebar { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); box-shadow: 4px 0 30px #00000088; }
          .topbar { display: flex; }
          .msg-wrap { padding: 0 12px; }
          .bubble { max-width: 88%; font-size: 14px; }
        }
      `}</style>

      <div className="app">
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <span className="logo">Shuxrat AI</span>
            <button className="new-btn" onClick={newChat}>+ Yangi</button>
          </div>
          <div className="chat-list">
            {chats.length === 0
              ? <div className="empty-chats">Hali suhbat yo'q</div>
              : chats.map(c => (
                <div key={c.id} className={`chat-item ${activeChatId === c.id ? "active" : ""}`}
                  onClick={() => { setActiveChatId(c.id); setSidebarOpen(false); }}>
                  <span>💬</span>
                  <span className="chat-title">{c.title}</span>
                  <button className="del-btn" onClick={e => { e.stopPropagation(); deleteChat(c.id); }}>×</button>
                </div>
              ))
            }
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <span className="topbar-title">Shuxrat AI</span>
          </div>

          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-logo">Shuxrat AI</div>
              <div className="empty-sub">Savol bering, rasm yuboring yoki o'zbek tilida gaplashing</div>
              <div className="suggestions">
                {["Salom! Kim bo'lsan?", "Kod yozishda yordam ber", "Inglizchaga tarjima qil", "Rasm tahlil qil"].map(s => (
                  <button key={s} className="sug-btn" onClick={() => { setInput(s); textareaRef.current?.focus(); }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-area">
              <div className="msg-wrap">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    <div className={`avatar ${msg.role}`}>{msg.role === "user" ? "S" : "AI"}</div>
                    <div className={`bubble ${msg.role}`}>
                      {msg.imagePreview && <img src={msg.imagePreview} alt="" />}
                      {Array.isArray(msg.content)
                        ? msg.content.filter(b => b.type === "text").map((b, j) => <span key={j}>{b.text}</span>)
                        : msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message">
                    <div className="avatar ai">AI</div>
                    <div className="bubble ai"><div className="thinking"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          <div className="input-area">
            <div className="input-box">
              {image && (
                <div className="img-preview-bar">
                  <img src={image.preview} alt="" className="img-thumb" />
                  <button className="rm-img" onClick={() => setImage(null)}>×</button>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>Rasm tayyor ✓</span>
                </div>
              )}
              <div className="input-row">
                <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>🖼</button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Xabar yozing..."
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
                  }}
                  onKeyDown={handleKey}
                />
                <button className="send-btn" onClick={sendMessage} disabled={loading || (!input.trim() && !image)}>➤</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

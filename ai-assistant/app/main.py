"""
KubeAtlas AI Assistant
Fully cluster-internal, connects to your local LLM via LiteLLM.
"""
import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from app.config import settings
from app.llm_client import chat, chat_stream
from app.kubeatlas_client import kubeatlas

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("KubeAtlas AI Assistant starting...")
    logger.info(f"  LiteLLM URL: {settings.litellm_base_url}")
    logger.info(f"  LiteLLM Model: {settings.litellm_model}")
    logger.info(f"  KubeAtlas API: {settings.kubeatlas_api_url}")
    try:
        await kubeatlas.get("/dashboard/stats")
        logger.info("KubeAtlas API connection: OK")
    except Exception as e:
        logger.warning(f"KubeAtlas API connection failed: {e} (will retry)")
    yield
    await kubeatlas.close()


app = FastAPI(
    title="KubeAtlas AI Assistant",
    description="Local LLM-powered Kubernetes management assistant",
    version="1.0.0",
    lifespan=lifespan,
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    response: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kubeatlas-ai-assistant"}


@app.post("/api/chat", response_model=ChatResponse)
async def api_chat(req: ChatRequest):
    result = await chat(req.message, req.history)
    return ChatResponse(response=result)


@app.post("/api/chat/stream")
async def api_chat_stream(req: ChatRequest):
    async def event_generator():
        async for chunk in chat_stream(req.message, req.history):
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/", response_class=HTMLResponse)
async def index():
    return CHAT_HTML


# ============================================
# Bilingual Chat UI (EN / TR)
# ============================================

CHAT_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KubeAtlas AI Assistant</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;height:100vh;display:flex;flex-direction:column}
header{background:#1e293b;border-bottom:1px solid #334155;padding:14px 24px;display:flex;align-items:center;gap:12px}
header .logo{font-size:24px}
header h1{font-size:17px;font-weight:600;color:#f8fafc;flex:1}
.badge{font-size:11px;padding:2px 8px;border-radius:999px;font-weight:500}
.badge-local{background:#065f46;color:#6ee7b7}
.lang-toggle{background:#334155;border:1px solid #475569;color:#94a3b8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;transition:all .2s}
.lang-toggle:hover{border-color:#6366f1;color:#c7d2fe}
#chat-container{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px}
.message{max-width:800px;width:100%;margin:0 auto;display:flex;gap:12px}
.message.user{flex-direction:row-reverse}
.avatar{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.message.user .avatar{background:#1d4ed8}
.message.assistant .avatar{background:#7c3aed}
.bubble{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:12px 16px;line-height:1.6;max-width:680px;white-space:pre-wrap;word-wrap:break-word}
.message.user .bubble{background:#1e3a5f;border-color:#2563eb33}
#input-area{background:#1e293b;border-top:1px solid #334155;padding:16px 24px}
#input-form{max-width:800px;margin:0 auto;display:flex;gap:8px}
#input-form textarea{flex:1;background:#0f172a;border:1px solid #475569;border-radius:10px;color:#f1f5f9;padding:12px 16px;font-size:14px;font-family:inherit;resize:none;outline:none;min-height:48px;max-height:120px}
#input-form textarea:focus{border-color:#6366f1}
#input-form button{background:#4f46e5;color:#fff;border:none;border-radius:10px;padding:0 20px;font-size:14px;font-weight:500;cursor:pointer;transition:background .2s}
#input-form button:hover{background:#4338ca}
#input-form button:disabled{background:#334155;cursor:not-allowed}
.quick-actions{max-width:800px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;padding:12px 0}
.quick-actions button{background:#1e293b;border:1px solid #475569;color:#94a3b8;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;transition:all .2s}
.quick-actions button:hover{border-color:#6366f1;color:#c7d2fe;background:#1e1b4b}
.welcome{text-align:center;padding:60px 20px;opacity:.7}
.welcome h2{font-size:24px;margin-bottom:8px}
.welcome p{color:#94a3b8}
</style>
</head>
<body>

<header>
  <span class="logo">☸️</span>
  <h1>KubeAtlas AI Assistant</h1>
  <span class="badge badge-local">LOCAL LLM</span>
  <button class="lang-toggle" onclick="toggleLang()" id="lang-btn">🌐 TR</button>
</header>

<div id="chat-container">
  <div class="welcome" id="welcome">
    <h2 id="welcome-title">KubeAtlas AI Assistant</h2>
    <p id="welcome-desc">Ask questions about your clusters, namespaces, teams, and dependencies.</p>
  </div>
  <div class="quick-actions" id="quick-actions"></div>
</div>

<div id="input-area">
  <form id="input-form" onsubmit="handleSubmit(event)">
    <textarea id="user-input" rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
    <button type="submit" id="send-btn"></button>
  </form>
</div>

<script>
const i18n = {
  en: {
    welcomeTitle: "KubeAtlas AI Assistant",
    welcomeDesc: "Ask questions about your clusters, namespaces, teams, and dependencies.",
    placeholder: "Ask a question... (Shift+Enter for new line)",
    send: "Send",
    thinking: "⏳ Thinking...",
    langBtn: "🌐 TR",
    quickActions: [
      { icon: "📊", label: "Dashboard Stats", query: "Show dashboard statistics" },
      { icon: "☸️", label: "Clusters", query: "List all clusters" },
      { icon: "🔍", label: "Orphan Check", query: "Are there any orphaned namespaces?" },
      { icon: "📝", label: "Audit Logs", query: "Summarize recent audit logs" },
      { icon: "🔗", label: "Dependencies", query: "Show dependency matrix" },
      { icon: "⚠️", label: "Missing Info", query: "Show resources with missing information" },
    ],
  },
  tr: {
    welcomeTitle: "KubeAtlas AI Asistanı",
    welcomeDesc: "Cluster'lar, namespace'ler, takımlar ve dependency'ler hakkında sorular sorabilirsiniz.",
    placeholder: "Bir soru sorun... (Shift+Enter: yeni satır)",
    send: "Gönder",
    thinking: "⏳ Düşünüyorum...",
    langBtn: "🌐 EN",
    quickActions: [
      { icon: "📊", label: "Dashboard", query: "Dashboard istatistiklerini göster" },
      { icon: "☸️", label: "Cluster'lar", query: "Tüm cluster'ları listele" },
      { icon: "🔍", label: "Sahipsiz Kontrol", query: "Sahipsiz namespace var mı?" },
      { icon: "📝", label: "Audit Log", query: "Son audit log'larını özetle" },
      { icon: "🔗", label: "Dependency'ler", query: "Dependency matrisini göster" },
      { icon: "⚠️", label: "Eksik Bilgi", query: "Eksik bilgisi olan kaynakları göster" },
    ],
  },
};

let lang = localStorage.getItem("kubeatlas-lang") || "en";
let history = [];
let isGenerating = false;

function toggleLang() {
  lang = lang === "en" ? "tr" : "en";
  localStorage.setItem("kubeatlas-lang", lang);
  applyLang();
}

function applyLang() {
  const t = i18n[lang];
  document.getElementById("welcome-title").textContent = t.welcomeTitle;
  document.getElementById("welcome-desc").textContent = t.welcomeDesc;
  document.getElementById("user-input").placeholder = t.placeholder;
  document.getElementById("send-btn").textContent = t.send;
  document.getElementById("lang-btn").textContent = t.langBtn;
  const qa = document.getElementById("quick-actions");
  qa.innerHTML = "";
  t.quickActions.forEach((a) => {
    const btn = document.createElement("button");
    btn.textContent = a.icon + " " + a.label;
    btn.onclick = () => sendQuick(a.query);
    qa.appendChild(btn);
  });
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
}

function sendQuick(text) {
  document.getElementById("user-input").value = text;
  handleSubmit(new Event("submit"));
}

function addMessage(role, content) {
  const w = document.getElementById("welcome");
  if (w) w.remove();
  const qa = document.getElementById("quick-actions");
  if (qa) qa.remove();
  const cc = document.getElementById("chat-container");
  const div = document.createElement("div");
  div.className = "message " + role;
  const av = role === "user" ? "👤" : "🤖";
  div.innerHTML = '<div class="avatar">' + av + '</div><div class="bubble"></div>';
  div.querySelector(".bubble").textContent = content;
  cc.appendChild(div);
  cc.scrollTop = cc.scrollHeight;
  return div.querySelector(".bubble");
}

async function handleSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("user-input");
  const msg = input.value.trim();
  if (!msg || isGenerating) return;
  isGenerating = true;
  document.getElementById("send-btn").disabled = true;
  input.value = "";
  autoResize(input);
  addMessage("user", msg);
  const bubble = addMessage("assistant", i18n[lang].thinking);
  try {
    const resp = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, history }),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    bubble.textContent = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (line.startsWith("data: ")) {
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try { full += JSON.parse(d).content; bubble.textContent = full; } catch {}
          document.getElementById("chat-container").scrollTop = 999999;
        }
      }
    }
    history.push({ role: "user", content: msg }, { role: "assistant", content: full });
    if (history.length > 20) history = history.slice(-20);
  } catch (err) {
    bubble.textContent = "Error: " + err.message;
  }
  isGenerating = false;
  document.getElementById("send-btn").disabled = false;
  input.focus();
}

applyLang();
</script>
</body>
</html>"""

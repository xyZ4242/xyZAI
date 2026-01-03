/* ============================================================
   FILE: main.js - Premium Optimized with Clickable Suggestions
   ============================================================ */

let lastAction = 0;
let isFirstChat = true;

let chatHistory = [
    { role: "system", content: typeof SECURITY_PROMPT !== 'undefined' ? SECURITY_PROMPT : "You are a helpful assistant." }
];

let currentVersion = "1.0";
let currentModel = "llama-3.1-8b-instant"; 

// --- 1. REKOMENDASI & SUGGESTIONS (BARU) ---
// Fungsi untuk memasukkan teks kartu ke input
function fillInput(text) {
    const input = document.getElementById('userInput');
    if(input) {
        input.value = text;
        input.focus();
    }
}

// Inisialisasi klik pada kartu saran saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const text = card.querySelector('p').innerText;
            fillInput(text);
        });
    });
});

// --- 2. UI FUNCTIONS ---
function toggleModelMenu() {
    const dropdown = document.getElementById('modelDropdown');
    if(dropdown) dropdown.classList.toggle('show');
}

function selectModel(version, type) {
    currentVersion = version;
    const label = document.getElementById('version-label');
    if(label) label.innerText = version;
    
    const items = document.querySelectorAll('.dropdown-item');
    items.forEach(item => item.classList.remove('active'));
    
    if(items.length > 0) {
        const selectedItem = (version === "1.0") ? items[0] : (items[1] || items[0]);
        selectedItem.classList.add('active');
    }
    
    currentModel = (version === "1.0") ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
    toggleModelMenu();
}

window.onclick = function(event) {
    if (!event.target.closest('.model-menu-wrapper')) {
        const dropdown = document.getElementById('modelDropdown');
        if(dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
}

// --- 3. LOGIC UTAMA CHAT ---
async function executeProtokol() {
    const input = document.getElementById('userInput');
    if(!input || !input.value.trim()) return;
    
    const query = input.value.trim();
    const now = Date.now();

    if (typeof checkSecurityProtocol === "function") {
        if (!checkSecurityProtocol()) return;
    }

    if (isFirstChat) {
        const greeting = document.getElementById('greeting');
        if(greeting) greeting.style.display = 'none';
        isFirstChat = false;
    }

    lastAction = now;
    appendMessage('user', query);
    chatHistory.push({ role: "user", content: query });
    
    input.value = '';
    const aiId = 'xyz-' + now;
    appendMessage('ai', `<span style="opacity:0.6; font-style:italic;" id="loading-${aiId}">Menghubungkan ke Neural Cloud...</span>`, aiId);
    scrollToBottom();

    const imageKeywords = ["tunjukkan gambar", "cari gambar", "buatkan gambar", "tampilkan gambar", "image of", "picture of"];
    if (imageKeywords.some(k => query.toLowerCase().includes(k))) {
        handleImageRequest(query, aiId);
        return; 
    }

    try {
        let messagesToSend = [...chatHistory];
        if (currentVersion === "2.0") {
            messagesToSend.push({ role: "system", content: "[SYSTEM OVERRIDE] Jawab dengan sangat detail, analitis, dan cerdas." });
        }

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: messagesToSend, 
                model: currentModel,
                temperature: 0.7
            })
        });

        const data = await response.json();
        if(data.error) throw new Error(data.error.message || "Gagal merespon");

        const rawContent = data.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: rawContent });

        if (chatHistory.length > 12) chatHistory.splice(1, chatHistory.length - 11);

        const renderedContent = processAIResponse(rawContent);
        const container = document.getElementById(aiId);
        
        container.setAttribute('data-raw', rawContent);
        container.innerHTML = `
            <div class="ai-message">${renderedContent}</div>
            <div class="ai-actions" style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                <button class="copy-btn" onclick="secureCopy('${aiId}')" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:5px;">
                    <span class="material-symbols-rounded" style="font-size:16px;">content_copy</span> Salin Jawaban
                </button>
            </div>
        `;
    } catch (e) {
        document.getElementById(aiId).innerHTML = `<div style="color:#ff6b6b; padding:10px; border:1px solid rgba(255,107,107,0.3); border-radius:8px;">⚠️ ERROR: ${e.message}</div>`;
    }
    scrollToBottom();
}

// --- 4. RENDERING & MARKDOWN ---
function processAIResponse(text) {
    if (!text) return "";
    const escapeHTML = (str) => str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

    const codeBlocks = [];
    let processed = text.replace(/```(?:(\w+)\n)?([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
        codeBlocks.push({ lang: lang || 'text', code: code });
        return placeholder;
    });

    processed = escapeHTML(processed);
    processed = processed.replace(/^### (.*$)/gim, '<h3 style="color:#a855f7; margin:15px 0 10px 0; border-left:3px solid #a855f7; padding-left:10px;">$1</h3>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b style="color:#fff;">$1</b>');
    processed = processed.replace(/^\* (.*$)/gim, '<div style="margin-bottom: 8px; display: flex; gap: 10px;"><span>•</span><span>$1</span></div>');
    processed = processed.replace(/\n/g, '<br>');

    codeBlocks.forEach((block, index) => {
        processed = processed.replace(`___CODE_BLOCK_${index}___`, `
            <div class="code-wrapper">
                <div class="code-header"><span>${block.lang}</span><button onclick="copyRawCode(this)">Copy</button></div>
                <pre><code>${escapeHTML(block.code)}</code></pre>
            </div>`);
    });
    return processed;
}

// --- 5. IMAGE & UTILS ---
function handleImageRequest(query, aiId) {
    let keyword = query.toLowerCase();
    const removeWords = ["tunjukkan gambar", "cari gambar", "buatkan gambar", "tampilkan gambar"];
    removeWords.forEach(k => keyword = keyword.replace(k, ""));
    const imgUrl = `https://pollinations.ai/p/${encodeURIComponent(keyword.trim() || "Digital Art")}?width=1080&height=720&nologo=true`;
    document.getElementById(aiId).innerHTML = `<p>Visualisasi: <b>${keyword}</b></p><img src="${imgUrl}" style="width:100%; border-radius:12px; margin-top:10px;" onload="scrollToBottom()">`;
}

function secureCopy(elementId) {
    const el = document.getElementById(elementId);
    const text = el.getAttribute('data-raw');
    navigator.clipboard.writeText(text).then(() => {
        const btn = el.querySelector('.copy-btn');
        btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px;">check</span> Disalin!`;
        setTimeout(() => btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px;">content_copy</span> Salin Jawaban`, 2000);
    });
}

function copyRawCode(btn) {
    const code = btn.closest('.code-wrapper').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = "Copy", 2000);
    });
}

function appendMessage(type, content, id = '') {
    const container = document.getElementById('chat-container');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message-wrapper ${type}-msg`;
    const icon = type === 'user' ? 'U' : `<img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="22">`;
    msgDiv.innerHTML = `<div class="${type}-icon">${icon}</div><div class="text-content" id="${id}">${content}</div>`;
    container.appendChild(msgDiv);
}

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    if(container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

const inputField = document.getElementById('userInput');
if (inputField) {
    inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeProtokol(); });
                             }

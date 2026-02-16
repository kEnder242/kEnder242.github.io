const CONFIG = {
    LOCAL_URL: "ws://localhost:8765",
    REMOTE_URL: "wss://acme.jason-lab.dev",
    VERSION: "3.6.4"
};

let ws = null;
let isMicActive = false;
let audioContext = null;
let micStream = null;
let processor = null;
let editor = null;

// DOM Elements
const chatConsole = document.getElementById('chat-console');
const insightConsole = document.getElementById('insight-console');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const statusDot = document.getElementById('connection-dot');
const systemStatus = document.getElementById('system-status');
const activeFilename = document.getElementById('active-filename');
const resizer = document.getElementById('resizer');
const consoleRow = document.getElementById('console-row');
const workspaceContainer = document.getElementById('workspace-container');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initEditor();
    initResizer();
    connect();
    pollSystemStatus();
    
    // UI Events
    sendBtn.addEventListener('click', sendText);
    textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendText(); });
    micBtn.addEventListener('click', toggleMic);
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
});

function initEditor() {
    editor = new EasyMDE({
        element: document.getElementById('workspace-content'),
        spellChecker: false,
        autosave: { enabled: false },
        status: ["lines", "words"],
        toolbar: ["bold", "italic", "heading", "|", "quote", "code", "table", "|", "preview", "side-by-side", "fullscreen"],
        minHeight: "100px"
    });
}

function initResizer() {
    if (resizer) {
        let isResizing = false;
        resizer.addEventListener('mousedown', () => { isResizing = true; });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const main = document.querySelector('main');
            const mainRect = main.getBoundingClientRect();
            const relativeY = e.clientY - mainRect.top;
            const containerHeight = main.offsetHeight;
            const newConsoleHeight = (relativeY / containerHeight) * 100;

            if (newConsoleHeight > 10 && newConsoleHeight < 80) {
                consoleRow.style.height = `${newConsoleHeight}%`;
                workspaceContainer.style.flex = "1";
                workspaceContainer.style.height = "auto";
                if (editor && editor.codemirror) {
                    editor.codemirror.refresh();
                }
            }
        });
        document.addEventListener('mouseup', () => { isResizing = false; });
    }
}

// --- MESSAGING ---
function appendMsg(text, type = 'system-msg', source = 'System', channel = 'chat') {
    const target = channel === 'insight' ? insightConsole : chatConsole;
    
    if (channel === 'whiteboard' || channel === 'workspace') {
        if (editor) editor.value(text);
        return;
    }

    const msg = document.createElement('div');
    const msgType = (source && source.toLowerCase() === "system") ? "system-msg" : type;
    msg.className = `message ${msgType}`;
    
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sl = source ? source.toLowerCase() : "system";
    
    msg.innerHTML = `<span class="msg-time">${time}</span> <span class="msg-source ${sl}">${sl}:</span> <span class="msg-body">${text}</span>`;
    
    const isBrain = channel === 'insight' || source.toLowerCase().includes('brain');
    if (!isBrain) {
        chatConsole.appendChild(msg);
        chatConsole.scrollTop = chatConsole.scrollHeight;
    } else {
        insightConsole.appendChild(msg);
        insightConsole.scrollTop = insightConsole.scrollHeight;
    }
}

function sendText() {
    const content = textInput.value.trim();
    if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    appendMsg(content, 'user-msg', 'Me');
    ws.send(JSON.stringify({ type: "text_input", content: content }));
    textInput.value = '';
}

async function saveWorkspace() {
    const content = editor.value();
    const filename = activeFilename.textContent === 'no file open' ? 'scratchpad.md' : activeFilename.textContent;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "workspace_save", filename: filename, content: content }));
        appendMsg(`Saving ${filename}...`, 'system-msg', 'System');
    }
}

// --- MICROPHONE ---
async function toggleMic() {
    if (isMicActive) stopMic();
    else await startMic();
}

async function startMic() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(micStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            if (!isMicActive || !ws || ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            ws.send(pcmData.buffer);
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        isMicActive = true;
        micBtn.classList.add('active');
        appendMsg("Microphone Active. Speak now...", "system-msg");
    } catch (err) {
        appendMsg(`Mic Error: ${err.message}`, "system-msg");
    }
}

function stopMic() {
    isMicActive = false;
    micBtn.classList.remove('active');
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    appendMsg("Microphone Muted.", "system-msg");
}

// --- CONNECTION ---
function connect() {
    const targetUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? CONFIG.LOCAL_URL : CONFIG.REMOTE_URL;

    appendMsg(`Connecting to ${targetUrl}...`, 'system-msg');
    try {
        ws = new WebSocket(targetUrl);
        ws.onopen = () => {
            statusDot.className = 'status-dot online';
            ws.send(JSON.stringify({ type: "handshake", version: CONFIG.VERSION }));
        };
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'status') {
                if (data.message) {
                    appendMsg(data.message, 'system-msg', 'System');
                }
            } else if (data.type === 'cabinet') {
                updateFileTree(data.files);
            } else if (data.type === 'file_content') {
                activeFilename.textContent = data.filename;
                editor.value(data.content);
            } else if (data.brain) {
                appendMsg(data.brain, 'brain-msg', data.brain_source || 'Brain', data.channel || 'chat');
            } else if (data.type === 'transcription') {
                appendMsg(data.text, 'user-msg', 'Me (Voice)');
            }
        };
        ws.onclose = () => {
            statusDot.className = 'status-dot offline';
            appendMsg("Disconnected. Reconnecting in 5s...", 'system-msg');
            setTimeout(connect, 5000);
        };
    } catch (err) {
        appendMsg(`Connection Error: ${err.message}`, 'system-msg');
    }
}

function updateFileTree(files) {
    const tree = document.getElementById('file-tree');
    tree.innerHTML = '';
    files.forEach(f => {
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.textContent = f;
        item.onclick = () => ws.send(JSON.stringify({ type: "read_file", filename: f }));
        tree.appendChild(item);
    });
}

async function pollSystemStatus() {
    try {
        const resp = await fetch('data/status.json?t=' + Date.now());
        const data = await resp.json();
        const vitals = data.vitals || {};
        const mode = vitals.mode || "OLLAMA";
        const model = vitals.model || "None";
        systemStatus.textContent = `[SYSTEM] ${mode}: ${model}`;
    } catch (err) {
        console.error("Status poll failed", err);
    }
    setTimeout(pollSystemStatus, 5000);
}

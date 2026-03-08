document.addEventListener('DOMContentLoaded', init);
let globalConfig = null;
let toastTimeout;
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
async function init() {
    if (isMobileDevice()) {
        document.body.classList.add('is-mobile');
    }
    if (document.getElementById('term-logs')) {
        try {
            const response = await fetch('/config');
            globalConfig = await response.json();
            
            setUi(globalConfig);
            loadEnd(globalConfig.tags);
            startWIBClock();
            await KawaiiYumee(globalConfig);
            loadReminder(); 
            setSearch();
        } catch (e) {
            document.getElementById('term-logs').innerHTML = `<span class="text-red-400 font-bold px-1">SYSTEM FAILURE</span><br>${e.message}`;
        }
    }
}
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-bold transform translate-y-10 opacity-0 transition-all duration-300 z-[100] flex items-center gap-3 font-mono text-sm ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-check-circle'}"></i> ${msg.toUpperCase()}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
function startWIBClock() {
    const timeEl = document.getElementById('server-time');
    const dateEl = document.getElementById('server-date');
    if(!timeEl) return;
    updateTime();
    setInterval(updateTime, 1000);
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateString = now.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric', month: 'long', year: 'numeric'
        });
        if(timeEl) timeEl.innerText = timeString;
        if(dateEl) dateEl.innerText = dateString;
    }
}
async function loadReminder() {
    try {
        const req = await fetch('../src/reminder.json');
        const data = await req.json();
        if(data?.message) {
            const el = document.getElementById('running-text');
            if(el) el.innerText = data.message.toUpperCase();
        }
    } catch (e) { console.warn("No reminder config found"); }
}
function messeg(msg) {
    const toast = document.getElementById('custom-toast');
    const msgBox = document.getElementById('toast-message');
    if(!toast || !msgBox) return;
    msgBox.innerText = msg;
    toast.classList.remove('translate-y-32', 'opacity-0');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-32', 'opacity-0');
    }, 3000);
}

function terminalLog(message, type = 'info') {
    const logs = document.getElementById('term-logs');
    if(!logs) return;

    const line = document.createElement('div');
    const time = new Date().toLocaleTimeString('en-US', {hour12: false, hour: "2-digit", minute:"2-digit", second:"2-digit"});
    
    let prefix = `<span class="text-slate-500 font-bold">[${time}]</span>`;
    
    if (type === 'error') {
        prefix += ` <span class="text-red-500 font-bold">ERR</span>`;
        line.className = "text-red-400";
    } else if (type === 'success') {
        prefix += ` <span class="text-green-500 font-bold">OK</span>`;
        line.className = "text-green-400";
    } else if (type === 'warn') {
        prefix += ` <span class="text-yellow-500 font-bold">WARN</span>`;
        line.className = "text-yellow-400";
    } else if (type === 'req-success') {
        line.className = "text-green-400"; 
    } else if (type === 'req-error') {
        line.className = "text-red-400";
    } else {
        prefix += ` <span class="text-blue-400 font-bold">INFO</span>`;
        line.className = "text-gray-300";
    }

    line.innerHTML = `${prefix} ${message}`;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
}

async function KawaiiYumee(config) {
    const logs = document.getElementById('term-logs');
    if(!logs) return;
    
    const cmdLine = document.createElement('div');
    cmdLine.className = "mb-2 break-all flex flex-wrap items-center";
    
    const prompt = document.createElement('span');
    prompt.className = "text-green-500 font-bold mr-2";
    prompt.innerHTML = "root@danzz~$";
    
    const inputCmd = document.createElement('span');
    inputCmd.className = "text-gray-200 font-mono relative";
    
    const cursor = document.createElement('span');
    cursor.className = "inline-block w-2.5 h-4 bg-green-500 align-middle ml-0.5 animate-pulse";
    
    cmdLine.appendChild(prompt);
    cmdLine.appendChild(inputCmd);
    inputCmd.appendChild(cursor);
    logs.appendChild(cmdLine);

    const cmd = "npm run dev";
    await new Promise(r => setTimeout(r, 600));

    for (let char of cmd) {
        const randomSpeed = Math.floor(Math.random() * (120 - 40 + 1)) + 40;
        await new Promise(r => setTimeout(r, randomSpeed));
        const textNode = document.createTextNode(char);
        inputCmd.insertBefore(textNode, cursor);
    }
    
    await new Promise(r => setTimeout(r, 500));
    cursor.remove();
    
    const printRaw = (text) => {
        const div = document.createElement('div');
        div.className = "text-gray-400 text-xs font-mono ml-1";
        div.innerText = text;
        logs.appendChild(div);
        logs.scrollTop = logs.scrollHeight;
    };

    const version = config.settings.apiVersion || '1.0.0';
    printRaw(`\n> nekoapy@${version} dev`);
    await new Promise(r => setTimeout(r, 200));
    printRaw(`> node src/index.ts\n`);
    await new Promise(r => setTimeout(r, 400));
    
    const endpoints = Object.values(config.tags).flat();
    const total = endpoints.length;

    terminalLog(`Loading ${total} routes...`, 'info');
    
    let count = 0;
    const maxShow = 3;
    for (const route of endpoints) {
        if(count < maxShow) {
             terminalLog(`Mapped {${route.method}} ${route.endpoint}`, 'success');
             await new Promise(r => setTimeout(r, 50));
        }
        count++;
    }
    if(count > maxShow) terminalLog(`... +${count - maxShow} hidden endpoints mapped`, 'info');

    await new Promise(r => setTimeout(r, 300));
    
    const serverUrl = window.location.origin;
    terminalLog(`Server is running at ${serverUrl}`, 'success');

    const inputLine = document.getElementById('term-input-line');
    if(inputLine) inputLine.classList.remove('hidden');
    
    const container = document.getElementById('api-container');
    if(container) container.classList.remove('opacity-0', 'translate-y-4');
}

function setUi(config) {
    const s = config.settings;
    const navTitle = document.getElementById('nav-title');
    const statVis = document.getElementById('stat-visitors');
    
    if(navTitle) navTitle.innerText = s.apiName || 'API';
    if(statVis) statVis.innerText = s.visitors || '1';
    
    if (s.favicon) {
        let link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = s.favicon;
        document.head.appendChild(link);
    }
}

function setSearch() {
    const input = document.getElementById('search-input');
    const noResults = document.getElementById('no-results');
    if(!input) return;

    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const isSearching = val.length > 0;
        let anyVisible = false;

        document.querySelectorAll('.api-section').forEach(section => {
            const grid = section.querySelector('.api-section-grid');
            const arrow = section.querySelector('.cat-arrow');
            let matchInThisSection = 0;

            section.querySelectorAll('.api-card-wrapper').forEach(card => {
                const txt = card.getAttribute('data-search').toLowerCase();
                if (txt.includes(val)) {
                    card.classList.remove('hidden');
                    matchInThisSection++;
                } else {
                    card.classList.add('hidden');
                }
            });

            if (matchInThisSection > 0) {
                section.classList.remove('hidden');
                anyVisible = true;
                if (isSearching) {
                    grid.classList.remove('hidden');
                    arrow.classList.add('rotate-180');
                } else {
                    grid.classList.add('hidden');
                    arrow.classList.remove('rotate-180');
                }
            } else {
                section.classList.add('hidden');
            }
        });

        if(noResults) {
            noResults.classList.toggle('hidden', anyVisible);
            noResults.classList.toggle('flex', !anyVisible);
        }
    });
}

function loadEnd(tags) {
    const container = document.getElementById('api-container');
    if(!container) return;
    
    container.innerHTML = '';

    for (const [cat, routes] of Object.entries(tags)) {
        const section = document.createElement('div');
        section.className = "api-section w-full";
        
        const catId = `cat-${cat.replace(/\s+/g, '-')}`;

        const headerBtn = `
            <button id="btn-${catId}" onclick="toggleCategory('${catId}')" class="category-btn w-full flex items-center justify-between bg-white text-slate-700 p-4 rounded-lg shadow-sm border border-slate-300 mb-4 group hover:bg-slate-50 active:scale-[0.99] transition-all duration-150">
                <div class="flex items-center gap-3 relative z-10 w-full">
                    <i class="fa-solid fa-folder text-xl text-yellow-500"></i>
                    <h2 class="text-lg font-bold uppercase tracking-wider text-slate-800 flex-1 text-left">${cat}</h2>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-mono bg-slate-200 border border-slate-300 px-2 py-1 rounded text-slate-600 font-bold">${routes.length} EP</span>
                        <i id="arrow-${catId}" class="cat-arrow fa-solid fa-chevron-down transition-transform duration-300 text-slate-400"></i>
                    </div>
                </div>
            </button>
        `;

        const grid = document.createElement('div');
        grid.id = `grid-${catId}`;
        grid.className = 'api-section-grid grid grid-cols-1 gap-4 hidden mb-8'; 

        routes.forEach((route, idx) => {
            const id = `${cat}-${idx}`.replace(/\s+/g, '-');
            const searchTerms = `${route.name} ${route.endpoint} ${cat}`;
            
            let inputsHtml = '';
            if (route.params?.length) {
                inputsHtml = `<div class="bg-gray-50 p-4 border-t border-slate-200 grid gap-3">` + 
                route.params.map(p => 
                    `<div class="relative">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <span class="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block"></span> ${p.name.toUpperCase()}
                            </label>
                            <span class="text-[9px] font-bold ${p.required ? 'text-red-500' : 'text-slate-400'}">${p.required ? 'REQ' : 'OPT'}</span>
                        </div>
                        <input type="text" id="input-${id}-${p.name}" placeholder="${p.description || 'Value...'}" 
                        class="w-full border border-slate-300 p-2 font-mono text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none transition-colors rounded-md bg-white">
                     </div>`
                ).join('') + `</div>`;
            }

            let uploadHtml = '';
            if (route.method === 'POST' || route.method.includes('POST')) {
                uploadHtml = `
                    <div class="mt-2 w-full">
                        <input type="file" id="file-${id}" class="hidden" onchange="updateFileLabel('${id}')">
                        <button onclick="document.getElementById('file-${id}').click()" 
                            class="w-full py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed text-slate-500 hover:text-blue-500 text-[10px] font-bold uppercase tracking-widest rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.99]">
                            <i class="fa-solid fa-cloud-arrow-up"></i> UPLOAD FILE <span id="file-label-${id}" class="normal-case font-mono text-blue-600 hidden ml-1"></span>
                        </button>
                    </div>
                `;
            }

            const methodColor = route.method === 'GET' ? 'bg-sky-500' : 
                               route.method === 'POST' ? 'bg-emerald-500' :
                               route.method === 'DELETE' ? 'bg-rose-500' : 'bg-amber-500';
            
            const card = document.createElement('div');
            card.className = 'api-card-wrapper w-full bg-white border border-slate-300 rounded-lg hover:border-blue-400 transition-colors shadow-sm overflow-hidden';
            card.setAttribute('data-search', searchTerms);
            
            card.innerHTML = `
                <div class="p-3 cursor-pointer select-none hover:bg-slate-50 transition-colors" onclick="toggle('${id}')">
                    <div class="flex justify-between items-center gap-3">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <span class="px-2 py-0.5 text-[10px] font-bold text-white ${methodColor} rounded shadow-sm font-mono min-w-[50px] text-center">${route.method}</span>
                            <code class="font-bold text-xs sm:text-sm truncate font-mono text-slate-700">${route.endpoint}</code>
                        </div>
                        <i id="icon-${id}" class="fa-solid fa-plus text-xs text-slate-400 transition-transform duration-300"></i>
                    </div>
                    <p class="text-[10px] text-slate-500 mt-2 font-mono truncate pl-1">${route.name}</p>
                </div>
                
                <div id="body-${id}" class="hidden animate-slide-down">
                    ${inputsHtml}
                    
                    <div class="p-3 border-t border-slate-200 bg-gray-50/50">
                        <div class="flex gap-2">
                            <button id="btn-exec-${id}" onclick="testReq(this, '${route.endpoint}', '${route.method}', '${id}')" class="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-2 hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md active:scale-[0.98] text-[10px] tracking-widest uppercase rounded border border-blue-700/20">
                                EXECUTE
                            </button>
                            <button onclick="copy('${route.endpoint}')" class="px-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded shadow-sm transition-all" title="Copy URL">
                                <i class="fa-regular fa-copy text-xs"></i>
                            </button>
                        </div>
                        ${uploadHtml}
                    </div>

                    <div id="res-area-${id}" class="hidden border-t-2 border-slate-700 bg-[#1e1e1e] text-[11px] relative rounded-b-lg overflow-hidden shadow-inner">
                        <div class="flex justify-between items-center bg-[#252526] px-3 py-2 border-b border-slate-600">
                            <div class="flex gap-2 items-center">
                                <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" id="status-dot-${id}"></span>
                                <span id="status-${id}" class="text-gray-400 font-bold font-mono">WAITING</span>
                            </div>
                            <span id="time-${id}" class="text-gray-500 font-mono text-[10px]">--ms</span>
                        </div>
                        
                        <div class="absolute top-2 right-2 flex gap-1 z-20">
                             <a id="dl-btn-${id}" class="hidden bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 hover:bg-emerald-500/30 rounded cursor-pointer transition-colors"><i class="fa-solid fa-download"></i></a>
                             <button onclick="copyRes('${id}')" class="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2 py-0.5 hover:bg-blue-500/30 rounded transition-colors"><i class="fa-regular fa-clone"></i></button>
                             <button onclick="reset('${id}')" class="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 hover:bg-red-500/30 rounded transition-colors"><i class="fa-solid fa-xmark"></i></button>
                        </div>

                        <div id="output-${id}" class="font-mono text-[10px] overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] p-4 custom-scrollbar min-h-[80px] text-gray-300 leading-relaxed"></div>
                    </div>
                </div>`;
            grid.appendChild(card);
        });

        section.innerHTML = headerBtn;
        section.appendChild(grid);
        container.appendChild(section);
    }
}

window.updateFileLabel = (id) => {
    const input = document.getElementById(`file-${id}`);
    const label = document.getElementById(`file-label-${id}`);
    if (input && input.files && input.files[0]) {
        label.innerText = `(${input.files[0].name})`;
        label.classList.remove('hidden');
    } else {
        label.classList.add('hidden');
    }
};

window.toggleCategory = (catId) => {
    const grid = document.getElementById(`grid-${catId}`);
    const arrow = document.getElementById(`arrow-${catId}`);
    const btn = document.getElementById(`btn-${catId}`);
    
    if(btn) {
        btn.classList.add('animating');
        setTimeout(() => {
            btn.classList.remove('animating');
        }, 500);
    }

    if(grid.classList.contains('hidden')) {
        grid.classList.remove('hidden');
        arrow.classList.add('rotate-180');
    } else {
        grid.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
};

window.toggle = (id) => {
    const b = document.getElementById(`body-${id}`);
    const i = document.getElementById(`icon-${id}`);
    
    if (b.classList.contains('hidden')) {
        b.classList.remove('hidden');
        i.classList.add('rotate-45'); 
    } else {
        b.classList.add('hidden');
        i.classList.remove('rotate-45');
    }
};

window.copy = (txt) => {
    navigator.clipboard.writeText(window.location.origin + txt);
    messeg("ENDPOINT COPIED");
    terminalLog(`Copied URL: ${txt}`);
};

window.copyRes = (id) => {
    const out = document.getElementById(`output-${id}`);
    if (!out.innerText) return;
    navigator.clipboard.writeText(out.innerText);
    messeg("RESPONSE COPIED");
};

window.reset = (id) => {
    document.getElementById(`res-area-${id}`).classList.add('hidden');
    document.getElementById(`output-${id}`).innerHTML = '';
    const dlBtn = document.getElementById(`dl-btn-${id}`);
    if(dlBtn) dlBtn.classList.add('hidden');
    
    document.querySelectorAll(`[id^="input-${id}-"]`).forEach(i => i.value = '');
    
    const fileInput = document.getElementById(`file-${id}`);
    const fileLabel = document.getElementById(`file-label-${id}`);
    if(fileInput) fileInput.value = '';
    if(fileLabel) {
        fileLabel.innerText = '';
        fileLabel.classList.add('hidden');
    }

    terminalLog(`Console cleared for req-${id.split('-').pop()}`);
};

window.testReq = async (btn, url, method, id) => {
    if (btn.disabled) return;
    const out = document.getElementById(`output-${id}`);
    const status = document.getElementById(`status-${id}`);
    const statusDot = document.getElementById(`status-dot-${id}`);
    const time = document.getElementById(`time-${id}`);
    const dlBtn = document.getElementById(`dl-btn-${id}`);
    const fileInput = document.getElementById(`file-${id}`);
    const hasFile = fileInput && fileInput.files.length > 0;
    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    btn.classList.add('opacity-70', 'cursor-not-allowed');
    
    let startTime = Date.now();
    let timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        time.innerText = `${elapsed}ms`;
    }, 75);
    
    document.getElementById(`res-area-${id}`).classList.remove('hidden');
    
    if(dlBtn) {
        dlBtn.classList.add('hidden');
        dlBtn.href = '#';
    }
    
    status.innerText = 'PROCESSING...';
    status.className = 'text-yellow-400 font-bold font-mono';
    statusDot.className = 'w-2 h-2 rounded-full bg-yellow-400 animate-pulse';

    out.innerHTML = '<span class="text-gray-500 italic">establishing connection...</span>';
    
    const params = {};
    document.querySelectorAll(`[id^="input-${id}-"]`).forEach(i => {
        if(i.value) params[i.id.split(`input-${id}-`)[1]] = i.value;
    });

    let fetchUrl = url + (method === 'GET' && Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
    
    let opts = { method };

    if (method !== 'GET') {
        if (hasFile) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            Object.keys(params).forEach(key => formData.append(key, params[key]));
            opts.body = formData;
        } else {
            opts.headers = {'Content-Type': 'application/json'};
            opts.body = JSON.stringify(params);
        }
    }

    const fullUrl = fetchUrl.startsWith('http') ? fetchUrl : window.location.origin + fetchUrl;

    try {
        const req = await fetch(fetchUrl, opts);
        clearInterval(timerInterval);
        const duration = (Date.now() - startTime); 
        status.innerText = `${req.status} ${req.statusText}`;
        status.className = req.ok ? 'text-green-400 font-bold font-mono' : 'text-red-400 font-bold font-mono';
        statusDot.className = req.ok ? 'w-2 h-2 rounded-full bg-green-400' : 'w-2 h-2 rounded-full bg-red-400';
        time.innerText = `${duration}ms`;
        terminalLog(`[${req.status}] ${method} ${fullUrl} (${duration}ms)`, req.ok ? 'req-success' : 'req-error');
        const type = req.headers.get('content-type');
        if (type?.includes('json')) {
            const json = await req.json();
            out.innerHTML = syntaxHighlight(json);
        } else if (type?.startsWith('image')) {
            const blob = await req.blob();
            const urlObj = URL.createObjectURL(blob);
            if(dlBtn) {
                dlBtn.href = urlObj;
                dlBtn.download = `img-${Date.now()}.jpg`;
                dlBtn.classList.remove('hidden');
            }
            out.innerHTML = `
                <div class="border border-dashed border-gray-600 p-4 bg-black/20 rounded-lg flex justify-center">
                    <img src="${urlObj}" class="max-w-full shadow-lg max-h-[400px] rounded border border-gray-700">
                </div>`;
        } else if (type?.includes('audio') || type?.includes('video')) {
            const blob = await req.blob();
            const tag = type.includes('audio') ? 'audio' : 'video';
            out.innerHTML = `<${tag} controls src="${URL.createObjectURL(blob)}" class="w-full mt-2 rounded border border-slate-700"></${tag}>`;
        } else {
            out.innerText = await req.text();
        }
    } catch (err) {
        clearInterval(timerInterval);
        out.innerHTML = `<span class="text-red-400 font-bold">CONNECTION_REFUSED</span><br><span class="text-gray-500">${err.message}</span>`;
        status.innerText = 'ERR';
        statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
        status.className = 'text-red-400 font-bold font-mono';
        terminalLog(`Fetch Failed: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
};
function syntaxHighlight(json) {
    if (typeof json != 'string') json = JSON.stringify(json, undefined, 2);
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) cls = 'json-key';
            else cls = 'json-string';
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

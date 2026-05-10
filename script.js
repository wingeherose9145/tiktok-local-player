const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库
const request = indexedDB.open("VideoPathDB", 6); // 升级版本
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) db.createObjectStore("paths", { autoIncrement: true });
};
request.onsuccess = (e) => { db = e.target.result; loadSavedPaths(); };

function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        container.innerHTML = '';
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(nativePath) {
    if (!nativePath) return;

    // 关键：将磁盘绝对路径转换为 WebView 协议路径
    // 例如：/storage/emulated/0/video.mp4 -> https://localhost/_capacitor_file_/storage/emulated/0/video.mp4
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    
    const v = card.querySelector('video');
    v.load(); 
    observer.observe(card);
}

async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        
        // 使用 pickFiles 配合 video/* 类型，这比 pickVideos 更容易拿到物理路径
        const result = await FilePicker.pickFiles({
            types: ['video/*'],
            multiple: true,
            readData: false
        });
        
        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                let finalPath = file.path;

                // 路径合法性检查
                if (finalPath) {
                    // 如果路径包含 '/cache/'，说明这依然是个临时文件，重启后会消失
                    if (finalPath.includes('/cache/')) {
                        console.warn("警告：获取到的是临时缓存路径，重启可能失效。请尝试从“内部存储”而非“最近”选择文件。");
                    }
                    
                    store.add(finalPath);
                    renderVideo(finalPath);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { 
        console.error(err);
        alert("选择失败，请确保已授予“所有文件访问权限”。"); 
    }
}

// ... 剩下的播放控制逻辑 (addBtn.onclick, container.onclick, observer) 保持不变 ...

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };
// 点击屏幕切换按钮和播放状态
container.onclick = (e) => {
    addBtn.classList.toggle('hidden');
    const cards = document.querySelectorAll('.video-card');
    const centerY = window.innerHeight / 2;
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top <= centerY && rect.bottom >= centerY) {
            const v = card.querySelector('video');
            if (v) v.paused ? v.play().catch(()=>{}) : v.pause();
        }
    });
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.target.querySelector('video');
        if (v && entry.isIntersecting) {
            v.play().catch(() => { v.muted = true; v.play().catch(()=>{}); });
        } else if (v) { v.pause(); }
    });
}, { threshold: 0.6 });

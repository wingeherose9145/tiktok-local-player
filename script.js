const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库
const request = indexedDB.open("VideoPathDB", 10); // 提升版本号强制更新
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) {
        db.createObjectStore("paths", { autoIncrement: true });
    }
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
    // 将物理路径转换为 WebView 可加载的内部 URL
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
        
        // 切换到 pickFiles 以获得更好的多选和物理路径支持
        const result = await FilePicker.pickFiles({ 
            types: ['video/*'], 
            multiple: true, 
            readData: false 
        });
        
        if (result.files && result.files.length > 0) {
            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");

            for (const file of result.files) {
                if (file.path) {
                    store.add(file.path); // 保存物理路径
                    renderVideo(file.path);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { 
        alert("选择失败，请确保已在设置中开启“所有文件访问权限”。"); 
    }
}

addBtn.onclick = (e) => { e.stopPropagation(); pickVideos(); };
// ... IntersectionObserver 保持不变 ...

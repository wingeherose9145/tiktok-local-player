const container = document.getElementById('videoContainer');
const addBtn = document.getElementById('add-btn');
let db;

// 初始化数据库
const request = indexedDB.open("VideoPathDB", 5); // 升级版本确保结构干净
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("paths")) db.createObjectStore("paths", { autoIncrement: true });
};
request.onsuccess = (e) => { db = e.target.result; loadSavedPaths(); };

// 加载保存路径
function loadSavedPaths() {
    const transaction = db.transaction(["paths"], "readonly");
    const store = transaction.objectStore("paths");
    store.getAll().onsuccess = (e) => {
        const paths = e.target.result;
        container.innerHTML = '';
        if (paths && paths.length > 0) {
            addBtn.classList.add('hidden');
            // 解决“第一台手机占位不播”：增加一个显式的加载序列
            paths.forEach(path => renderVideo(path));
        }
    };
}

function renderVideo(nativePath) {
    if (!nativePath) return;
    // 关键：针对 Capacitor 的兼容性转换
    const videoUrl = window.Capacitor ? window.Capacitor.convertFileSrc(nativePath) : nativePath;
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<video src="${videoUrl}" loop playsinline webkit-playsinline preload="auto"></video>`;
    container.appendChild(card);
    
    // 强制内核重新加载路径，并尝试捕获加载错误
    const v = card.querySelector('video');
    v.load(); 
    
    // 自动播放处理
    observer.observe(card);
}

// 选择视频 (增加对“只能加一个”手机的提示)
async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        // 尝试申请权限，虽然我们在Java层强开了，但Web层也申请一次更稳
        if (FilePicker.requestPermissions) await FilePicker.requestPermissions();
        
        const result = await FilePicker.pickVideos({ multiple: true, readData: false });
        
        if (result.files && result.files.length > 0) {
            if (result.files.length === 1) {
                // 如果用户反映只能加一个，这里给一个友好提示
                console.log("此手机系统选择器可能不支持批量选择，请分次添加。");
            }

            const transaction = db.transaction(["paths"], "readwrite");
            const store = transaction.objectStore("paths");
            for (const file of result.files) {
                if (file.path) {
                    store.add(file.path);
                    renderVideo(file.path);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { alert("选择失败或被取消，请检查手机文件管理权限是否开启。"); }
}

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
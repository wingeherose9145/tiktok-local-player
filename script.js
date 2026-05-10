async function pickVideos() {
    try {
        const { FilePicker } = window.Capacitor.Plugins;
        
        // 请求权限
        if (FilePicker.requestPermissions) {
            await FilePicker.requestPermissions();
        }

        // 使用 pickFiles 而非 pickVideos 以获取更稳健的物理路径
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
                    store.add(file.path);
                    renderVideo(file.path);
                }
            }
            addBtn.classList.add('hidden');
        }
    } catch (err) { 
        console.error("Pick Error:", err);
        alert("选择失败：" + (err.message || "权限未开启") + "\n请务必从手机【内部存储】中选择视频。"); 
    }
}

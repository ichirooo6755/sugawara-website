// gallery.js
const photos = [
    { file: "photo00001.jpg", category: "all" },
    { file: "photo00002.jpg", category: "all" },
    { file: "photo00003.jpg", category: "all" },
    { file: "photo00004.jpg", category: "all" },
    { file: "photo00005.jpg", category: "all" },
    { file: "photo00006.jpg", category: "all" },
    { file: "photo00007.jpg", category: "all" },
    { file: "photo00008.jpg", category: "all" },
    { file: "photo00009.jpg", category: "all" },
    { file: "photo00010.jpg", category: "all" },
    { file: "photo00011.jpg", category: "all" },
    { file: "photo00012.jpg", category: "all" },
    { file: "photo00013.jpg", category: "all" },
    { file: "photo00014.jpg", category: "all" },
    { file: "photo00015.jpg", category: "all" },
    { file: "photo00016.jpg", category: "all" },
    { file: "photo00017.jpg", category: "all" }
];

const galleryEl = document.getElementById("gallery");
let lgInstance = null;

/* ヘルパー */
function formatShutterSpeed(val) {
    if (!val) return "不明";
    if (typeof val === "string") {
        // EXIF 文字列ならそのまま（例: "1/500"）
        return val;
    }
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1) return num.toFixed(1) + "s";
    return "1/" + Math.round(1 / num) + "s";
}

function convertDMSToDD(dms, ref) {
    if (!dms) return null;
    const deg = dms[0] || 0;
    const min = dms[1] || 0;
    const sec = dms[2] || 0;
    let dd = deg + (min / 60) + (sec / 3600);
    if (ref === "S" || ref === "W") dd = -dd;
    return dd;
}

function readExif(img) {
    return new Promise(resolve => {
        try {
            EXIF.getData(img, function () {
                const date = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime") || "不明";
                const make = EXIF.getTag(this, "Make") || "";
                const model = EXIF.getTag(this, "Model") || "";
                const iso = EXIF.getTag(this, "ISOSpeedRatings") || "";
                const exposureRaw = EXIF.getTag(this, "ExposureTime") || EXIF.getTag(this, "ShutterSpeedValue");
                const exposure = formatShutterSpeed(exposureRaw);
                const focalRaw = EXIF.getTag(this, "FocalLength") || "";
                const focal = focalRaw ? String(focalRaw) : "";
                const gpsLat = convertDMSToDD(EXIF.getTag(this, "GPSLatitude"), EXIF.getTag(this, "GPSLatitudeRef"));
                const gpsLon = convertDMSToDD(EXIF.getTag(this, "GPSLongitude"), EXIF.getTag(this, "GPSLongitudeRef"));
                resolve({ date, make, model, iso, exposure, focal, gpsLat, gpsLon });
            });
        } catch (e) {
            resolve({ date: "不明", make: "", model: "", iso: "", exposure: "不明", focal: "", gpsLat: null, gpsLon: null });
        }
    });
}

/* ギャラリーの（再）構築：画像ロード＋EXIF取得 → DOM作成 → 一度だけ初期化 */
async function buildGallery(items) {
    // 既存インスタンスがあるなら destroy して初期化をクリーンにする
    if (lgInstance && typeof lgInstance.destroy === "function") {
        try { lgInstance.destroy(); } catch (e) { /* ignore */ }
        lgInstance = null;
    }

    galleryEl.innerHTML = "";

    // 画像を順番に読み込み、EXIFを取得してDOMを作る（awaitで順次処理）
    for (const p of items) {
        const wrapper = document.createElement("div");
        wrapper.className = "gallery-item";
        wrapper.dataset.category = p.category;

        // 先に img を作る（lazy）
        const img = new Image();
        img.src = `pictures/${p.file}`;
        img.alt = p.file;
        img.loading = "lazy";

        const metaDiv = document.createElement("div");
        metaDiv.className = "meta-info";
        metaDiv.textContent = p.file;

        wrapper.appendChild(img);
        wrapper.appendChild(metaDiv);
        galleryEl.appendChild(wrapper);

        // 画像の読み込み完了（またはエラー）を待って EXIF を読む
        await new Promise(resolve => {
            img.onload = async () => {
                const exif = await readExif(img);

                const gpsText = (exif.gpsLat !== null && exif.gpsLon !== null)
                    ? `${exif.gpsLat.toFixed(5)}, ${exif.gpsLon.toFixed(5)}`
                    : "位置情報なし";

                // data-sub-html に入れる HTML（ライトギャラリー内で表示される）
                const subHtml = `
          <div style="padding:10px;">
            <h4 style="margin:6px 0 8px 0;font-size:16px">${p.file}</h4>
            <div style="font-size:14px;line-height:1.5;color:#111">
              <div>カテゴリ: ${p.category}</div>
              <div>撮影日: ${exif.date}</div>
              <div>カメラ: ${exif.make} ${exif.model}</div>
              <div>焦点距離: ${exif.focal ? exif.focal + "mm" : "不明"}</div>
              <div>SS: ${exif.exposure}　ISO: ${exif.iso}</div>
              <div>位置情報: ${gpsText}</div>
            </div>
          </div>
        `;

                // <a> を作って img を入れ替え（ライトギャラリーが期待する構造）
                const a = document.createElement("a");
                a.href = img.src;
                a.setAttribute("data-sub-html", subHtml);
                a.setAttribute("data-lg-size", "1400-933");
                // clone the image node for the thumbnail inside the anchor
                const thumb = img.cloneNode();
                thumb.loading = "lazy";
                a.appendChild(thumb);

                // 置き換え
                wrapper.innerHTML = "";
                wrapper.appendChild(a);
                wrapper.appendChild(metaDiv);

                resolve();
            };

            img.onerror = () => {
                // 読み込み失敗：プレースホルダー扱いで続行
                metaDiv.textContent = p.file + "（読み込み失敗）";
                resolve();
            };
        });
    }

    // 全部の DOM を作ったら一度だけ初期化
    // UMD ではプラグインは window.lgZoom, window.lgThumbnail
    lgInstance = lightGallery(galleryEl, {
        selector: ".gallery-item a",
        plugins: [window.lgThumbnail, window.lgZoom],
        speed: 400,
        mode: "lg-fade",
        closable: true,
        escKey: true,
        showCloseIcon: true,
        hideBarsDelay: 3000,
        download: false,
        mobileSettings: {
            showCloseIcon: true,
        }
    });
}

/* 初期描画 */
buildGallery(photos);

/* コントロール（ソート/フィルタ） */
document.querySelectorAll(".control-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".control-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const sort = btn.dataset.sort;
        const activeFilterEl = document.querySelector(".filter-btn.active");
        const filter = activeFilterEl ? activeFilterEl.dataset.filter : "all";

        let arr = [...photos];
        if (filter && filter !== "all") arr = arr.filter(p => p.category === filter);
        if (sort === "asc") arr.sort((a, b) => a.file.localeCompare(b.file));
        if (sort === "desc") arr.sort((a, b) => b.file.localeCompare(a.file));

        buildGallery(arr);
    });
});

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter;

        const galleryGrid = document.getElementById('gallery');
        const lenticularContainer = document.getElementById('lenticular-container');

        if (filter === 'lenticular') {
            // Switch to Lenticular View
            galleryGrid.style.display = 'none';
            lenticularContainer.classList.add('active');
            
            // Initialize if needed
            if (window.initLenticularGallery) {
                window.initLenticularGallery('lenticular-container');
            }
        } else {
            // Switch to Standard Gallery View
            galleryGrid.style.display = 'grid'; // Restore grid display
            lenticularContainer.classList.remove('active');
            
            const activeSortEl = document.querySelector(".control-btn.active");
            const sort = activeSortEl ? activeSortEl.dataset.sort : null;

            let arr = [...photos];
            if (filter && filter !== "all") arr = arr.filter(p => p.category === filter);
            if (sort === "asc") arr.sort((a, b) => a.file.localeCompare(b.file));
            if (sort === "desc") arr.sort((a, b) => b.file.localeCompare(a.file));

            buildGallery(arr);
        }
    });
});
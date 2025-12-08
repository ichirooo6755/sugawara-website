/**
 * ASCIIビジュアルエフェクト - Three.js実装
 * 3DモデルをASCIIシェーダーでポストプロセス
 */

(function() {
    'use strict';

    // ========== 設定 ==========
    const CONFIG = {
        cellSize: 4,                    // ASCIIセルのサイズ（ピクセル）
        invert: false,                  // 明暗を反転
        colorMode: true,                // カラーモード（falseでモノクロ）
        backgroundColor: 0xd9eb37,      // 背景色（黄緑）
        modelColor: 0x00BFFF,           // モデルの色（水色）
        modelScale: 0.05,               // モデルのスケール（0.05 = 5%）
        postfx: {
            // ========== スキャンライン ==========
            scanlineIntensity: 0,       // スキャンラインの強さ（0-1）
            scanlineCount: 100,         // スキャンラインの本数
            
            // ========== フレームレート ==========
            targetFPS: 0,               // 目標FPS（0で無制限）
            
            // ========== ジッター効果 ==========
            jitterIntensity: 0,         // ジッターの強さ
            jitterSpeed: 0,             // ジッターの速度
            
            // ========== マウスグロー ==========
            mouseGlowEnabled: true,     // マウスグローを有効化
            mouseGlowRadius: 50,        // グローの半径
            mouseGlowIntensity: 0.3,    // グローの強さ
            
            // ========== ビネット ==========
            vignetteIntensity: 0,       // ビネットの強さ（0-1）
            vignetteRadius: 0.5,        // ビネットの半径
            
            // ========== カラーパレット ==========
            colorPalette: 0,            // 0=オリジナル, 1=緑, 2=琥珀, 3=シアン, 4=青
            
            // ========== 画面湾曲 ==========
            curvature: 0.04,            // CRTモニター風の湾曲（0で無効）
            
            // ========== 色収差 ==========
            aberrationStrength: 0,      // RGBずれの強さ
            
            // ========== ノイズ ==========
            noiseIntensity: 0,          // ノイズの強さ
            noiseScale: 1,              // ノイズのスケール
            noiseSpeed: 1,              // ノイズのアニメーション速度
            
            // ========== 波形歪み ==========
            waveAmplitude: 0,           // 波の振幅
            waveFrequency: 1,           // 波の周波数
            waveSpeed: 0,               // 波のアニメーション速度
            
            // ========== グリッチ ==========
            glitchIntensity: 0,         // グリッチの強さ
            glitchFrequency: 0,         // グリッチの頻度
            
            // ========== 明るさ・コントラスト ==========
            brightnessAdjust: 0,        // 明るさ調整（-1 〜 1）
            contrastAdjust: 1.19        // コントラスト調整（1が標準）
        }
    };

    // ASCIIフラグメントシェーダー
    const asciiFragmentShader = `
uniform sampler2D tDiffuse;
uniform float cellSize;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;
uniform float time;
uniform vec2 resolution;
uniform vec2 mousePos;
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float targetFPS;
uniform float jitterIntensity;
uniform float jitterSpeed;
uniform bool mouseGlowEnabled;
uniform float mouseGlowRadius;
uniform float mouseGlowIntensity;
uniform float vignetteIntensity;
uniform float vignetteRadius;
uniform int colorPalette;
uniform float curvature;
uniform float aberrationStrength;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
uniform float glitchIntensity;
uniform float glitchFrequency;
uniform float brightnessAdjust;
uniform float contrastAdjust;

varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 applyColorPalette(vec3 color, int palette) {
    if (palette == 1) {
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        return vec3(0.1, lum * 0.9, 0.1);
    } else if (palette == 2) {
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        return vec3(lum * 1.0, lum * 0.6, lum * 0.2);
    } else if (palette == 3) {
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        return vec3(0.0, lum * 0.8, lum);
    } else if (palette == 4) {
        float lum = dot(color, vec3(0.299, 0.587, 0.114));
        return vec3(0.1, 0.2, lum);
    }
    return color;
}

float getChar(float brightness, vec2 p, int style) {
    vec2 grid = floor(p * 4.0);
    float val = 0.0;
    if (style == 0) {
        if (brightness < 0.2) val = (grid.x == 1.0 && grid.y == 1.0) ? 0.3 : 0.0;
        else if (brightness < 0.35) val = (grid.x == 1.0 || grid.x == 2.0) && (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
        else if (brightness < 0.5) val = (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
        else if (brightness < 0.65) val = (grid.y == 0.0 || grid.y == 3.0) ? 1.0 : (grid.y == 1.0 || grid.y == 2.0) ? 0.5 : 0.0;
        else if (brightness < 0.8) val = (grid.x == 0.0 || grid.x == 2.0 || grid.y == 0.0 || grid.y == 2.0) ? 1.0 : 0.3;
        else val = 1.0;
    }
    return val;
}

void main() {
    vec2 uv = vUv;
    vec2 workUV = uv;

    // 画面湾曲エフェクト
    if (curvature > 0.0) {
        vec2 centered = workUV * 2.0 - 1.0;
        centered *= 1.0 + curvature * dot(centered, centered);
        workUV = centered * 0.5 + 0.5;
        if (workUV.x < 0.0 || workUV.x > 1.0 || workUV.y < 0.0 || workUV.y > 1.0) {
            gl_FragColor = vec4(0.0);
            return;
        }
    }

    // 波形歪みエフェクト
    if (waveAmplitude > 0.0) {
        workUV.x += sin(workUV.y * waveFrequency + time * waveSpeed) * waveAmplitude;
        workUV.y += cos(workUV.x * waveFrequency + time * waveSpeed) * waveAmplitude;
    }

    vec4 sampledColor;
    // 色収差エフェクト
    if (aberrationStrength > 0.0) {
        float offset = aberrationStrength;
        vec2 uvR = workUV + vec2(offset, 0.0);
        vec2 uvG = workUV;
        vec2 uvB = workUV - vec2(offset, 0.0);
        float r = texture2D(tDiffuse, uvR).r;
        float g = texture2D(tDiffuse, uvG).g;
        float b = texture2D(tDiffuse, uvB).b;
        sampledColor = vec4(r, g, b, 1.0);
    } else {
        sampledColor = texture2D(tDiffuse, workUV);
    }

    // コントラストと明るさの調整
    sampledColor.rgb = (sampledColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;

    // ノイズエフェクト
    if (noiseIntensity > 0.0) {
        float noiseVal = noise(workUV * noiseScale + time * noiseSpeed);
        sampledColor.rgb += (noiseVal - 0.5) * noiseIntensity;
    }

    // ASCIIセル計算
    vec2 cellCount = resolution / cellSize;
    vec2 cellCoord = floor(uv * cellCount);

    // ジッターエフェクト
    if (jitterIntensity > 0.0) {
        float jitterTime = time * jitterSpeed;
        float jitterX = (random(vec2(cellCoord.y, floor(jitterTime))) - 0.5) * jitterIntensity * 2.0;
        float jitterY = (random(vec2(cellCoord.x, floor(jitterTime + 1000.0))) - 0.5) * jitterIntensity * 2.0;
        cellCoord += vec2(jitterX, jitterY);
    }

    // グリッチエフェクト
    if (glitchIntensity > 0.0 && glitchFrequency > 0.0) {
        float glitchTime = floor(time * glitchFrequency);
        float glitchRand = random(vec2(glitchTime, cellCoord.y));
        if (glitchRand < glitchIntensity) {
            float shift = (random(vec2(glitchTime + 1.0, cellCoord.y)) - 0.5) * 20.0;
            cellCoord.x += shift;
        }
    }

    vec2 cellUV = (cellCoord + 0.5) / cellCount;
    vec4 cellColor = texture2D(tDiffuse, cellUV);
    float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

    if (invert) brightness = 1.0 - brightness;

    vec2 localUV = fract(uv * cellCount);
    float charValue = getChar(brightness, localUV, asciiStyle);

    vec3 finalColor;
    if (colorMode) {
        finalColor = cellColor.rgb * charValue;
    } else {
        finalColor = vec3(brightness * charValue);
    }

    // カラーパレット適用
    finalColor = applyColorPalette(finalColor, colorPalette);

    // マウスグローエフェクト
    if (mouseGlowEnabled) {
        vec2 pixelPos = uv * resolution;
        float dist = length(pixelPos - mousePos);
        float glow = exp(-dist / mouseGlowRadius) * mouseGlowIntensity;
        finalColor += glow;
    }

    // スキャンラインエフェクト
    if (scanlineIntensity > 0.0) {
        float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
        finalColor *= 1.0 - (scanline * scanlineIntensity);
    }

    // ビネットエフェクト
    if (vignetteIntensity > 0.0) {
        vec2 centered = uv * 2.0 - 1.0;
        float vignette = 1.0 - dot(centered, centered) / vignetteRadius;
        finalColor *= mix(1.0, vignette, vignetteIntensity);
    }

    gl_FragColor = vec4(finalColor, cellColor.a);
}
`;

    // 頂点シェーダー
    const asciiVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

    // DOMとThree.jsの読み込みを待機
    function init() {
        const container = document.getElementById('ascii-container');
        if (!container) {
            console.error('ASCII Effect: #ascii-container が見つかりません');
            return;
        }

        // サイズを取得
        const width = container.clientWidth;
        const height = container.clientHeight;

        // シーンを作成
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(CONFIG.backgroundColor);

        // カメラを作成
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 5;

        // レンダラーを作成
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // ポストプロセス用のレンダーターゲット
        const renderTarget = new THREE.WebGLRenderTarget(width, height);

        // ライティング
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
        scene.add(hemisphereLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight1.position.set(5, 5, 5);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight2.position.set(-5, 3, -5);
        scene.add(directionalLight2);

        // GLBモデルを読み込み
        let loadedModel = null;
        const loader = new THREE.GLTFLoader();
        loader.load(
            '無題.glb',
            (gltf) => {
                loadedModel = gltf.scene;
                loadedModel.scale.set(CONFIG.modelScale, CONFIG.modelScale, CONFIG.modelScale);
                
                // モデル内のすべてのメッシュに色を適用
                loadedModel.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: CONFIG.modelColor,
                            roughness: 0.3,
                            metalness: 0.1
                        });
                    }
                });
                
                // モデルを中央に配置
                const box = new THREE.Box3().setFromObject(loadedModel);
                const center = box.getCenter(new THREE.Vector3());
                loadedModel.position.sub(center);
                
                scene.add(loadedModel);
                console.log('GLBモデル読み込み成功');
            },
            (progress) => {
                console.log('GLB読み込み中:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
            },
            (error) => {
                console.error('GLB読み込みエラー:', error);
                // 読み込み失敗時はトーラスノットをフォールバックとして表示
                const geometry = new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16);
                const material = new THREE.MeshStandardMaterial({
                    color: CONFIG.modelColor,
                    roughness: 0.3,
                    metalness: 0.1
                });
                const fallbackMesh = new THREE.Mesh(geometry, material);
                fallbackMesh.scale.set(CONFIG.modelScale, CONFIG.modelScale, CONFIG.modelScale);
                loadedModel = fallbackMesh;
                scene.add(fallbackMesh);
            }
        );

        // ポストプロセス用のクワッド
        const postScene = new THREE.Scene();
        const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const asciiMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: renderTarget.texture },
                cellSize: { value: CONFIG.cellSize },
                invert: { value: CONFIG.invert },
                colorMode: { value: CONFIG.colorMode },
                asciiStyle: { value: 0 },
                time: { value: 0 },
                resolution: { value: new THREE.Vector2(width, height) },
                mousePos: { value: new THREE.Vector2(0, 0) },
                scanlineIntensity: { value: CONFIG.postfx.scanlineIntensity },
                scanlineCount: { value: CONFIG.postfx.scanlineCount },
                targetFPS: { value: CONFIG.postfx.targetFPS },
                jitterIntensity: { value: CONFIG.postfx.jitterIntensity },
                jitterSpeed: { value: CONFIG.postfx.jitterSpeed },
                mouseGlowEnabled: { value: CONFIG.postfx.mouseGlowEnabled },
                mouseGlowRadius: { value: CONFIG.postfx.mouseGlowRadius },
                mouseGlowIntensity: { value: CONFIG.postfx.mouseGlowIntensity },
                vignetteIntensity: { value: CONFIG.postfx.vignetteIntensity },
                vignetteRadius: { value: CONFIG.postfx.vignetteRadius },
                colorPalette: { value: CONFIG.postfx.colorPalette },
                curvature: { value: CONFIG.postfx.curvature },
                aberrationStrength: { value: CONFIG.postfx.aberrationStrength },
                noiseIntensity: { value: CONFIG.postfx.noiseIntensity },
                noiseScale: { value: CONFIG.postfx.noiseScale },
                noiseSpeed: { value: CONFIG.postfx.noiseSpeed },
                waveAmplitude: { value: CONFIG.postfx.waveAmplitude },
                waveFrequency: { value: CONFIG.postfx.waveFrequency },
                waveSpeed: { value: CONFIG.postfx.waveSpeed },
                glitchIntensity: { value: CONFIG.postfx.glitchIntensity },
                glitchFrequency: { value: CONFIG.postfx.glitchFrequency },
                brightnessAdjust: { value: CONFIG.postfx.brightnessAdjust },
                contrastAdjust: { value: CONFIG.postfx.contrastAdjust }
            },
            vertexShader: asciiVertexShader,
            fragmentShader: asciiFragmentShader
        });

        const postQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            asciiMaterial
        );
        postScene.add(postQuad);

        // オービットコントロール（カメラ操作）
        let controls = null;
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.enableZoom = true;
        }

        // マウス追跡
        let mouseX = 0, mouseY = 0;
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = rect.height - (e.clientY - rect.top); // シェーダー用にY座標を反転
            asciiMaterial.uniforms.mousePos.value.set(mouseX, mouseY);
        });

        // リサイズ処理
        window.addEventListener('resize', () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);
            renderTarget.setSize(newWidth, newHeight);
            asciiMaterial.uniforms.resolution.value.set(newWidth, newHeight);
        });

        // アニメーションループ
        const clock = new THREE.Clock();
        let deltaAccumulator = 0;
        let effectTime = 0;

        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            const targetFPS = CONFIG.postfx.targetFPS;

            // フレームレート制限処理
            if (targetFPS > 0) {
                const frameDuration = 1 / targetFPS;
                deltaAccumulator += delta;
                if (deltaAccumulator >= frameDuration) {
                    effectTime += frameDuration;
                    deltaAccumulator = deltaAccumulator % frameDuration;
                }
            } else {
                effectTime += delta;
            }

            // ユニフォーム更新
            asciiMaterial.uniforms.time.value = effectTime;

            // コントロール更新
            if (controls) {
                controls.update();
            }

            // モデルをゆっくり回転
            if (loadedModel) {
                loadedModel.rotation.x += delta * 0.2;
                loadedModel.rotation.y += delta * 0.3;
            }

            // シーンをレンダーターゲットに描画
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);

            // ポストプロセス結果を画面に描画
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCamera);
        }

        animate();
    }

    // DOM読み込み完了時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

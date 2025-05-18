// ==UserScript==
// @name         RXY V1 - Aimbot and ESP with Directional Ray Lock
// @description  Aimlock based on closest player to the crosshair ray (horizontal) + ESP: rouge 1s après respawn, puis vert
// @version      1.0.10
// @namespace    https://shadowt3ch.site/
// @author       ShadowT3ch (modifié par GPT)
// @match        https://cryzen.io/*
// @run-at       document-start
// @license      Apache
// ==/UserScript==

(function () {
    const rotationDisplay = document.createElement('div');
    Object.assign(rotationDisplay.style, {
        position: 'fixed',
        top: '10px',
        left: '10px',
        padding: '5px 10px',
        background: 'rgba(0,0,0,0.7)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: '99999'
    });
    rotationDisplay.innerText = 'Rotation Y: 0.00';
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(rotationDisplay));

    const refreshButton = document.createElement('button');
    refreshButton.innerText = "Refresh qimbot";
    Object.assign(refreshButton.style, {
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        zIndex: '99999',
        padding: '5px 10px',
        fontFamily: 'monospace',
        fontSize: '14px',
        cursor: 'pointer'
    });
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(refreshButton));

    Object.defineProperty(Object.prototype, 'material', {
        get() { return this._material; },
        set(material) {
            if (this.type === 'SkinnedMesh' && this?.skeleton && material.uniforms?.u_outlineColorRGB) {
                Object.defineProperties(material, {
                    'depthTest':   { get() { return false; }, set() {} },
                    'transparent': { get() { return true; },  set() {} }
                });
                material.wireframe = true;
                material.opacity   = 1;
                material.uniforms.u_outlineColorRGB.value.set(0x00ff00);
                if (material.uniforms.u_color) material.uniforms.u_color.value.set(0x00ff00);
            }
            this._material = material;
        }
    });

    function angleDiff(a, b) {
        let d = a - b;
        d = (d + Math.PI) % (2 * Math.PI) - Math.PI;
        return Math.abs(d);
    }

    const respawnTimestamps = {};
    const previousDead      = {};

    Object.defineProperty(Object.prototype, 'gameState', {
        set(state) {
            window._debugWorld = state;
            let isRightClickHeld = false;
            let closestEnemy     = null;

            const initInterval = setInterval(() => {
                const { gameWorld } = window._debugWorld;
                if (gameWorld && gameWorld.server) {
                    clearInterval(initInterval);

                    function update() {
                        const player        = gameWorld.player;
                        const serverPlayers = gameWorld.server.players;
                        const nowMs         = gameWorld.time.localServerTimeMs;

                        rotationDisplay.innerText = `Rotation Y: ${player.rotation.y.toFixed(4)} rad`;

                        closestEnemy   = null;
                        let minDistRay = Infinity;
                        const origin   = player.position;
                        const dirY     = player.rotation.y;
                        const direction = { x: Math.sin(dirY), z: Math.cos(dirY) };

                        Object.values(serverPlayers).forEach(enemy => {
                            if (enemy?.model?.position && enemy.isEnemy && !enemy.dead) {
                                const ex = enemy.model.position.x;
                                const ez = enemy.model.position.z;
                                const vx = ex - origin.x;
                                const vz = ez - origin.z;
                                const dot = vx*direction.x + vz*direction.z;
                                const projX = dot*direction.x, projZ = dot*direction.z;
                                const perpX = vx - projX, perpZ = vz - projZ;
                                const d2 = Math.hypot(perpX, perpZ);
                                if (d2 < minDistRay) {
                                    minDistRay   = d2;
                                    closestEnemy = enemy;
                                }
                            }
                        });

                        if ((isRightClickHeld || player.weapon?.scoping) && closestEnemy) {
                            const dx = closestEnemy.model.position.x - origin.x;
                            const dz = closestEnemy.model.position.z - origin.z;

                            // ✅ CORRECTION ici :
                            const dy = ((closestEnemy.model.position.y + (closestEnemy.crouching ? 0.55 : 0.92))
                                      - (player.position.y + (player.inputs?.crouch ? 0.15 : 0.0)));

                            const rotY  = Math.atan2(dx, dz);
                            const hDist = Math.hypot(dx, dz);
                            let   rotX  = Math.atan2(dy, hDist);
                            rotX = Math.max(Math.min(rotX, Math.PI/2), -Math.PI/2);

                            player.rotation.y = (rotY + Math.PI) % (2 * Math.PI);
                            player.rotation.x = rotX;

                            if (hDist > 1) {
                                const s = 0.1;
                                player.position.x += dx/hDist * s;
                                player.position.z += dz/hDist * s;
                            }
                        }

                        Object.values(serverPlayers).forEach(enemy => {
                            if (!enemy.model || !enemy.isEnemy) return;
                            const id = enemy.id;

                            if (previousDead[id] === true && enemy.dead === false) {
                                respawnTimestamps[id] = nowMs;
                            }
                            previousDead[id] = enemy.dead;

                            let colorHex = 0x00ff00;
                            if (respawnTimestamps[id] != null) {
                                const elapsed = nowMs - respawnTimestamps[id];
                                if (elapsed < 2000) {
                                    colorHex = 0xff0000;
                                } else {
                                    delete respawnTimestamps[id];
                                }
                            }

                            enemy.model.traverse(obj => {
                                if (obj.isMesh && obj.material) {
                                    const m = obj.material;
                                    if (m.uniforms?.u_outlineColorRGB) m.uniforms.u_outlineColorRGB.value.set(colorHex);
                                    if (m.uniforms?.u_color)           m.uniforms.u_color.value.set(colorHex);
                                }
                            });
                        });
                    }

                    document.addEventListener('mousedown', e => { if (e.button === 2) isRightClickHeld = true; });
                    document.addEventListener('mouseup',   e => { if (e.button === 2) isRightClickHeld = false; });
                    setInterval(update, 2);
                }
            }, 100);
        },
        get() { return window._debugWorld; }
    });

    refreshButton.addEventListener('click', () => {
        if (window._debugWorld?.gameWorld?.server) {
            Object.getOwnPropertyDescriptor(Object.prototype, 'gameState')
                  .set.call(window._debugWorld, window._debugWorld);
        }

        const originalBg = refreshButton.style.backgroundColor;
        refreshButton.style.backgroundColor = 'limegreen';
        setTimeout(() => {
            refreshButton.style.backgroundColor = originalBg;
        }, 10);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'r' || e.key === 'R') {
            refreshButton.click();
        }
    });
})();

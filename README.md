# Krunker.io Mod Menu [BETA]

A powerful and experimental mod menu for Krunker.io with various features to enhance your gaming experience.

## ⚠️ Disclaimer

This is an experimental mod menu. Use at your own risk. The developers are not responsible for any consequences of using this tool.

## 🎮 Features

- **Aimbot**
  - Silent aim assistance
  - Customizable FOV (Field of View)
  - Smooth aiming
  - Target prioritization
  - Toggle with [Alt] key

- **ESP (Extra Sensory Perception)**
  - Player boxes
  - Health bars
  - Player names
  - Wallhack (BETA)
  - Line to enemy (optional)

- **Visual Modifications**
  - Third-person view option
  - Scope removal
  - Enemy glow effect
  - Customizable outline colors

## 🛠️ Installation

1. Install a userscript manager (like Tampermonkey or Greasemonkey)
2. Create a new script
3. Copy and paste the contents of `hack_gift.js` into the script editor
4. Save and enable the script

## 🎯 Usage

1. Navigate to [Krunker.io](https://krunker.io)
2. Press [O] to toggle the mod menu
3. Use [Alt] to activate aimbot
4. All features are enabled by default but can be customized

## ⚙️ Configuration

The mod menu includes various customizable settings:

```javascript
{
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
    }
}
```

## 🔒 Security Features

- Anti-detection measures
- Performance optimization
- Login state verification
- System compatibility checks

## 📝 Requirements

- Modern web browser
- Userscript manager
- Krunker.io account (recommended for full features)
- Minimum 30 FPS for optimal performance

## 🔄 Updates

Current version: 0.9.7b

## 📜 License

This project is for educational purposes only. Use at your own risk.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

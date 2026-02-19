# 👻 Ghost Battles

**Ghost Battles** is a fast-paced, browser-based multiplayer arena shooter where players control spectral entities and battle for dominance. Built with **Node.js**, **Socket.IO**, and **Three.js**, it features real-time combat, unique ghost abilities, and a custom-built physics and collision system.

![Ghost Battles UI](https://via.placeholder.com/800x450/0f0f19/a855f7?text=Ghost+Battles:+New+Glassmorphic+UI)

## 🎮 Features

-   **Visual Overhaul**:
    -   **Glassmorphic UI**: Sleek, modern interface with frosted glass effects and dynamic animations.
    -   **Particle Effects**: Atmospheric background particles and glowing text effects.
-   **Smart Bots**: 
    -   Server-controlled AI that actively hunts players across the map.
    -   Intelligent combat behavior: uses cover, strafes, and scavenges weapons/powerups.
-   **Real-Time Multiplayer**: 
    -   Seamless synchronization using Socket.IO.
    -   **Robust Lobby System**: Create private rooms, join via code, and play solo with bots.
    -   **Client-Side Prediction**: Smooth movement interpolation for high-action gameplay.
-   **Unique Ghost Classes**:
    -   **Wraith**: High speed, dash ability.
    -   **Phantom**: Stealth mechanics (Invisibility).
    -   **Shade**: Defensive tank with damage mitigation (Shield).
    -   **Specter**: Control specialist with AOE stuns.
-   **Dynamic Combat**:
    -   Multiple weapon types (Holy Water, Silver Daggers, Exorcist Bible, etc.).
    -   Powerups for health, speed, and damage boosts.
    -   Melee and ranged attacks with custom particle effects.
-   **Persistent Stats**: SQLite database tracks kills, deaths, and wins across sessions.
-   **Audio System**: Custom Web Audio API synthesizer for procedural sound effects (no external assets).

## 🛠️ Tech Stack

-   **Backend**: Node.js, Express, Socket.IO
-   **Frontend**: Three.js (WebGL), Vanilla JS
-   **Database**: SQLite (`better-sqlite3`)
-   **Audio**: Web Audio API (Procedural synthesis)

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14+ recommended)
-   npm (comes with Node.js)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Sambhav-Gautam/GhostBattles.git
    cd GhostBattles
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the server**:
    ```bash
    node server.js
    ```

4.  **Play**:
    Open your browser and navigate to `http://localhost:3000`.

## 🕹️ Controls

-   **WASD / Arrow Keys**: Move
-   **Mouse**: Aim
-   **Left Click**: Attack (Shoot / Melee)
-   **Space**: Attack (Alternative)
-   **E**: Use Special Ability (Dash, Invis, Shield, Stun)
-   **Shift**: Sprint / Ability (Alternative)

## 📂 Project Structure

```
├── public/             # Client-side assets
│   ├── js/             # Game logic (Three.js, Socket.IO)
│   ├── assets/         # Textures and models
│   └── index.html      # Game entry point
├── server.js           # Main Node.js server & game loop
├── db.js               # Database interface (SQLite)
└── package.json        # Dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

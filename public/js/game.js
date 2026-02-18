/* ══════════════════════════════════════════════════════════════
   Ghost Battles — Main Game Engine  (v2 – smooth dynamics)
   Integrates: Three.js scene, Socket.io multiplayer, all modules
   ══════════════════════════════════════════════════════════════ */

(() => {
    // ── State ──────────────────────────────────────
    const socket = io();

    let scene, camera, renderer, clock;
    let localPlayer = null;
    let localPlayerId = null;
    let localGhostType = 'wraith';
    let localPlayerName = 'Ghost';
    let arenaObjects = null;

    const remotePlayers = new Map();
    const powerupMeshes = new Map();
    const attackParticles = []; // kept for compat

    let health = 100;
    let kills = 0;
    let alive = true;
    let gameStarted = false;

    // Powerup state — block stacking
    let activePowerup = null;     // { type: 'speed'|'damage', expiresAt: ms }
    let auraObj = null;           // 3D aura mesh around ghost

    // Weapon state
    let equippedWeapon = null;    // { type: 'holyWater'|..., ammo: N }
    const weaponMeshes = new Map();

    // Ultimate state (kill-streak)
    const ULTIMATE_KILLS_NEEDED = 5;
    let killStreak = 0;
    let ultimateReady = false;

    // Tuned constants
    const MOVE_SPEED = 10;
    const MOVE_ACCEL = 0.14;     // lerp factor for acceleration
    const CAM_BEHIND = 8;        // distance behind ghost
    const CAM_UP = 5.0;          // height above ghost
    const CAM_LOOK_AHEAD = 2;    // look ahead of ghost (not at feet)
    const CAMERA_SMOOTH = 0.035; // camera position lerp (very smooth)
    const CAM_ROT_SMOOTH = 0.025;// how gently camera tracks ghost facing
    const PLAYER_Y = 1.5;        // fixed Y for player

    let camYaw = Math.PI;        // camera yaw — tracks ghost facing
    let currentVelX = 0;
    let currentVelZ = 0;

    // network throttle
    let lastNetSend = 0;
    const NET_SEND_INTERVAL = 50; // ms (20 ticks/sec)

    // ── DOM References ─────────────────────────────
    const menuScreen = document.getElementById('menu-screen');
    const gameHud = document.getElementById('game-hud');
    const mainMenu = document.getElementById('main-menu');
    const lobbyPanel = document.getElementById('lobby-panel');
    const lobbyCode = document.getElementById('lobby-code');
    const lobbyPlayers = document.getElementById('lobby-players');
    const playerCount = document.getElementById('player-count');
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    const killCountEl = document.getElementById('kill-count');
    const hudPlayers = document.getElementById('hud-players');
    const deathOverlay = document.getElementById('death-overlay');
    const killerName = document.getElementById('killer-name');
    const respawnCountdown = document.getElementById('respawn-countdown');
    const killFeed = document.getElementById('kill-feed');
    const hudEffect = document.getElementById('hud-effect');
    const effectText = document.getElementById('effect-text');
    const effectTimer = document.getElementById('effect-timer');
    const errorMsg = document.getElementById('error-msg');
    const waitMsg = document.getElementById('wait-msg');

    // ═══════════════════════════════════════════════
    //  SCENE INIT
    // ═══════════════════════════════════════════════
    function initScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x08081a);

        camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            200   // far plane large enough to see full arena + sky
        );
        camera.position.set(0, 4.5, 5);
        window._mainCamera = camera;

        // ── Renderer Setup (EXTREME OPTIMIZATION) ──
        renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(1); // Force 1.0 (no retina/high-dpi)
        renderer.shadowMap.enabled = false; // Disable shadows
        renderer.toneMapping = THREE.NoToneMapping;
        document.getElementById('game-canvas').appendChild(renderer.domElement);

        clock = new THREE.Clock();

        // Build arena
        arenaObjects = Arena.build(scene);

        // Input
        InputHandler.init(renderer.domElement);

        // Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // ── Spawn Local Player ──────────────────────────
    function spawnLocalPlayer(spawn, ghostType) {
        if (localPlayer) scene.remove(localPlayer);
        if (auraObj) { scene.remove(auraObj); auraObj = null; }

        localPlayer = GhostFactory.create(ghostType, localPlayerName);
        localPlayer.position.set(spawn.x, PLAYER_Y, spawn.z);
        localPlayer.userData.config = GhostFactory.GHOST_CONFIGS[ghostType];
        scene.add(localPlayer);

        // Create aura sphere (invisible until powerup is active)
        const auraGeo = new THREE.SphereGeometry(1.8, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        auraObj = new THREE.Mesh(auraGeo, auraMat);
        auraObj.visible = false;
        localPlayer.add(auraObj);
    }

    function setAuraColor(color) {
        if (auraObj) auraObj.material.color.setHex(color);
    }

    // ── Spawn Remote Player ─────────────────────────
    function spawnRemotePlayer(id, data) {
        if (remotePlayers.has(id)) return; // don't duplicate
        const mesh = GhostFactory.create(data.ghostType, data.name);
        mesh.position.set(data.position.x, PLAYER_Y, data.position.z);
        scene.add(mesh);

        remotePlayers.set(id, {
            mesh,
            health: data.health || 100,
            name: data.name,
            ghostType: data.ghostType,
            alive: data.alive !== false,
            kills: data.kills || 0,
            targetPos: { x: data.position.x, y: PLAYER_Y, z: data.position.z },
            targetRot: { y: 0 },
            animState: 'idle'
        });
    }

    // ═══════════════════════════════════════════════
    //  HUD
    // ═══════════════════════════════════════════════
    function updateHealthHUD() {
        const pct = Math.max(0, Math.round(health));
        healthBar.style.width = pct + '%';
        healthText.textContent = pct;

        healthBar.classList.remove('low', 'critical');
        if (pct <= 25) healthBar.classList.add('critical');
        else if (pct <= 50) healthBar.classList.add('low');
    }

    function updateKillsHUD() { killCountEl.textContent = kills; }

    // ── HUD Throttling ──
    let lastHUDUpdate = 0;
    const HUD_UPDATE_INTERVAL = 250; // 4 times per second max

    function updatePlayerListHUD(gameState) {
        const now = Date.now();
        if (now - lastHUDUpdate < HUD_UPDATE_INTERVAL) return;
        lastHUDUpdate = now;

        hudPlayers.innerHTML = '';
        const entries = Object.entries(gameState || {});
        entries.sort((a, b) => (b[1].kills || 0) - (a[1].kills || 0));
        entries.forEach(([, data]) => {
            const row = document.createElement('div');
            row.className = 'hud-player-row' + (data.alive ? '' : ' dead');
            row.style.borderLeftColor = getGhostColor(data.ghostType);
            row.innerHTML = `
                <span class="hud-player-name">${esc(data.name || remotePlayers.get(data.id || '')?.name || 'Ghost')}</span>
                <div class="hud-player-hp">
                  <div class="hud-player-hp-fill" style="width:${data.health}%;background:${data.health > 50 ? '#4ade80' : data.health > 25 ? '#fbbf24' : '#ef4444'}"></div>
                </div>
                <span class="hud-player-kills">${data.kills || 0}</span>`;
            hudPlayers.appendChild(row);
        });
    }

    function addKillFeedItem(killer, victim) {
        const item = document.createElement('div');
        item.className = 'kill-feed-item';
        item.innerHTML = `<span class="killer">${esc(killer)}</span> ☠ <span class="victim">${esc(victim)}</span>`;
        killFeed.appendChild(item);
        setTimeout(() => { if (item.parentNode) item.remove(); }, 3500);
    }

    function showEffect(text, ms) {
        // Set icon based on powerup type
        const effectIcon = document.getElementById('effect-icon');
        if (text.includes('Speed')) effectIcon.textContent = '⚡';
        else if (text.includes('Damage') || text.includes('Fire')) effectIcon.textContent = '🔥';
        else effectIcon.textContent = '💚';

        hudEffect.classList.remove('hidden');
        effectText.textContent = text;

        // Restart timer ring animation
        effectTimer.style.animation = 'none';
        effectTimer.offsetHeight; // force reflow
        effectTimer.style.setProperty('--timer-duration', (ms / 1000) + 's');
        effectTimer.style.animation = '';

        setTimeout(() => hudEffect.classList.add('hidden'), ms);
    }

    function getGhostColor(t) {
        return { wraith: '#a855f7', phantom: '#38bdf8', shade: '#dc2626', specter: '#4ade80' }[t] || '#a855f7';
    }
    function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    // ── Floating damage number (3D sprite above victim) ──
    // ── Floating damage number (DOM-based POOL) ──
    const damageOverlay = document.createElement('div');
    damageOverlay.id = 'damage-overlay';
    damageOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:100;';
    document.body.appendChild(damageOverlay);

    const activeDamageTexts = [];
    const damageTextPool = [];

    function getDamageElement() {
        if (damageTextPool.length > 0) {
            const el = damageTextPool.pop();
            el.style.display = 'block';
            el.style.transform = 'translate(-50%, -50%) scale(1)';
            el.style.opacity = '1';
            return el;
        }
        const el = document.createElement('div');
        el.className = 'damage-text';
        el.style.cssText = `
            position: absolute;
            color: #ff3333;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: 24px;
            text-shadow: 2px 2px 0 #000;
            transform: translate(-50%, -50%);
            will-change: transform, opacity;
            opacity: 1;
        `;
        damageOverlay.appendChild(el);
        return el;
    }

    function showFloatingDamage(worldPos, damage) {
        const el = getDamageElement();
        el.textContent = '-' + damage;

        activeDamageTexts.push({
            el,
            worldPos: worldPos.clone(),
            startTime: Date.now(),
            duration: 1000
        });
    }

    // Reuse vector to avoid GC
    const _tempVec = new THREE.Vector3();

    function updateFloatingDamage(camera) {
        if (!camera) return;
        const now = Date.now();

        // Screen dimensions for projection
        const width = window.innerWidth;
        const height = window.innerHeight;
        const widthHalf = width / 2;
        const heightHalf = height / 2;

        for (let i = activeDamageTexts.length - 1; i >= 0; i--) {
            const item = activeDamageTexts[i];
            const elapsed = now - item.startTime;
            const progress = elapsed / item.duration;

            if (progress >= 1) {
                // Return to pool
                item.el.style.display = 'none';
                damageTextPool.push(item.el);
                activeDamageTexts.splice(i, 1);
                continue;
            }

            // Animate position up and opacity fade
            const lift = progress * 2.0; // Float up 2 units
            _tempVec.copy(item.worldPos);
            _tempVec.y += 2.5 + lift;

            // Project to screen
            _tempVec.project(camera);

            const x = (_tempVec.x * widthHalf) + widthHalf;
            const y = -(_tempVec.y * heightHalf) + heightHalf;

            // Check if behind camera
            if (_tempVec.z > 1) {
                item.el.style.display = 'none';
            } else {
                item.el.style.display = 'block';
                item.el.style.transform = `translate(${x}px, ${y}px) scale(${1 + progress * 0.5})`;
                item.el.style.opacity = 1 - Math.pow(progress, 3); // Ease out opacity
            }
        }
    }

    // ═══════════════════════════════════════════════
    //  GAME LOOP
    // ═══════════════════════════════════════════════
    const _targetCamPos = new THREE.Vector3();
    const _lerpVec = new THREE.Vector3();

    function gameLoop() {
        requestAnimationFrame(gameLoop);

        const delta = Math.min(clock.getDelta(), 0.05);
        const time = clock.elapsedTime;

        if (!gameStarted) {
            renderer.render(scene, camera);
            return;
        }

        // ── Movement (camera-relative WASD) ────────
        if (alive && localPlayer) {
            const move = InputHandler.getMovement();
            let speed = MOVE_SPEED;
            if (localPlayer.userData.speedBoost && Date.now() < localPlayer.userData.speedBoost) {
                speed *= 1.5;
            }

            // Transform WASD input relative to camera direction
            // W/S = forward/back from camera view, A/D = strafe
            let targetVX = 0, targetVZ = 0;
            if (move.x !== 0 || move.z !== 0) {
                // camYaw points FROM player TO camera, so forward = camYaw + PI
                const forwardAngle = camYaw + Math.PI;
                // Forward/back (W/S mapped to move.z: W=-1, S=+1)
                targetVX += Math.sin(forwardAngle) * (-move.z) * speed;
                targetVZ += Math.cos(forwardAngle) * (-move.z) * speed;
                // Strafe (A/D mapped to move.x: A=-1, D=+1)
                targetVX += Math.sin(forwardAngle - Math.PI / 2) * move.x * speed;
                targetVZ += Math.cos(forwardAngle - Math.PI / 2) * move.x * speed;
            }

            // Smooth acceleration / deceleration
            currentVelX += (targetVX - currentVelX) * MOVE_ACCEL;
            currentVelZ += (targetVZ - currentVelZ) * MOVE_ACCEL;

            // Kill tiny residual velocity
            if (Math.abs(currentVelX) < 0.01) currentVelX = 0;
            if (Math.abs(currentVelZ) < 0.01) currentVelZ = 0;

            const newX = localPlayer.position.x + currentVelX * delta;
            const newZ = localPlayer.position.z + currentVelZ * delta;

            // Wall boundary clamping (slide along walls)
            let finalX = newX, finalZ = newZ;
            if (!Arena.isInsideArena(newX, newZ)) {
                const clamped = Arena.clampToArena(newX, newZ);
                finalX = clamped.x;
                finalZ = clamped.z;
                currentVelX *= 0.3;
                currentVelZ *= 0.3;
            }

            // Obstacle collision (push out of rocks, pillars, etc.)
            if (Arena.isCollidingObstacle(finalX, finalZ)) {
                const pushed = Arena.clampObstacle(finalX, finalZ);
                finalX = pushed.x;
                finalZ = pushed.z;
                currentVelX *= 0.2;
                currentVelZ *= 0.2;
            }

            localPlayer.position.x = finalX;
            localPlayer.position.z = finalZ;

            // Keep Y fixed
            localPlayer.position.y = PLAYER_Y;

            // Face movement direction (smooth turn)
            if (currentVelX !== 0 || currentVelZ !== 0) {
                const targetFacing = Math.atan2(currentVelX, currentVelZ);
                let diff = targetFacing - localPlayer.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                localPlayer.rotation.y += diff * 0.15;
            }

            // ── THIRD-PERSON CAMERA (behind ghost) ──
            // Camera gently orbits to stay behind the ghost's facing
            // direction, giving an over-the-shoulder perspective
            if (currentVelX !== 0 || currentVelZ !== 0) {
                const facingYaw = localPlayer.rotation.y + Math.PI;
                let yDiff = facingYaw - camYaw;
                while (yDiff > Math.PI) yDiff -= Math.PI * 2;
                while (yDiff < -Math.PI) yDiff += Math.PI * 2;
                camYaw += yDiff * CAM_ROT_SMOOTH;
            }

            // Position camera behind ghost
            const behindX = Math.sin(camYaw) * CAM_BEHIND;
            const behindZ = Math.cos(camYaw) * CAM_BEHIND;

            _targetCamPos.set(
                localPlayer.position.x + behindX,
                localPlayer.position.y + CAM_UP,
                localPlayer.position.z + behindZ
            );
            camera.position.lerp(_targetCamPos, CAMERA_SMOOTH);

            // Look slightly ahead of the ghost
            const lookAheadX = -Math.sin(localPlayer.rotation.y) * CAM_LOOK_AHEAD;
            const lookAheadZ = -Math.cos(localPlayer.rotation.y) * CAM_LOOK_AHEAD;
            camera.lookAt(
                localPlayer.position.x + lookAheadX,
                localPlayer.position.y + 0.8,
                localPlayer.position.z + lookAheadZ
            );

            // ── Network send (throttled) ──
            const now = Date.now();
            if (now - lastNetSend >= NET_SEND_INTERVAL) {
                lastNetSend = now;
                socket.emit('player-update', {
                    position: {
                        x: localPlayer.position.x,
                        y: localPlayer.position.y,
                        z: localPlayer.position.z
                    },
                    rotation: { y: localPlayer.rotation.y },
                    animState: (currentVelX !== 0 || currentVelZ !== 0) ? 'moving' : 'idle'
                });
            }

            // ── Powerup proximity (block if active) ──
            const hasPowerupActive = activePowerup && Date.now() < activePowerup.expiresAt;
            powerupMeshes.forEach((pw, id) => {
                if (!pw.mesh) return;
                const dx = localPlayer.position.x - pw.mesh.position.x;
                const dz = localPlayer.position.z - pw.mesh.position.z;
                if (dx * dx + dz * dz < 4) {
                    if (!hasPowerupActive) {
                        socket.emit('pickup-powerup', { powerupId: id });
                    }
                }
            });

            // ── Weapon proximity ──
            weaponMeshes.forEach((wm, id) => {
                if (!wm.mesh) return;
                const dx = localPlayer.position.x - wm.mesh.position.x;
                const dz = localPlayer.position.z - wm.mesh.position.z;
                if (dx * dx + dz * dz < 4) {
                    if (!equippedWeapon) {
                        socket.emit('pickup-weapon', { weaponId: id });
                    }
                }
            });
        }

        // ── Animate local ghost (Y offset via child, NOT position) ──
        if (localPlayer && alive) {
            // The body is child[0] — we bob the body, not the group position
            const body = localPlayer.children[0];
            if (body) {
                body.position.y = 0.5 + Math.sin(time * 1.5) * 0.12;
                body.rotation.z = Math.sin(time * 0.8) * 0.04;
            }
            // Animate type-specific parts
            localPlayer.children.forEach(child => {
                if (child.userData.tendrilPhase !== undefined) {
                    child.rotation.x = Math.sin(time * 2 + child.userData.tendrilPhase) * 0.25;
                    child.rotation.z = Math.cos(time * 1.5 + child.userData.tendrilPhase) * 0.15;
                }
                if (child.userData.armSide !== undefined) {
                    child.rotation.z = child.userData.armSide * (1.2 + Math.sin(time * 1.8) * 0.25);
                }
            });
            // Health bar billboard
            const hpBar = localPlayer.getObjectByName('healthBar');
            if (hpBar) hpBar.lookAt(camera.position);
        }

        // ── Remote players ──
        remotePlayers.forEach((data) => {
            if (!data.mesh) return;

            // Smooth interpolation
            if (data.targetPos) {
                _lerpVec.set(data.targetPos.x, PLAYER_Y, data.targetPos.z);
                data.mesh.position.lerp(_lerpVec, 0.08); // Smoother (was 0.12)
            }
            if (data.targetRot) {
                let diff = data.targetRot.y - data.mesh.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                data.mesh.rotation.y += diff * 0.08; // Smoother
            }

            // Animate body (child bob, not group position)
            const body = data.mesh.children[0];
            if (body) {
                body.position.y = 0.5 + Math.sin(time * 1.5 + data.mesh.id * 0.5) * 0.12;
                body.rotation.z = Math.sin(time * 0.8 + data.mesh.id) * 0.04;
            }
            data.mesh.children.forEach(child => {
                if (child.userData.tendrilPhase !== undefined) {
                    child.rotation.x = Math.sin(time * 2 + child.userData.tendrilPhase) * 0.25;
                }
                if (child.userData.armSide !== undefined) {
                    child.rotation.z = child.userData.armSide * (1.2 + Math.sin(time * 1.8) * 0.25);
                }
            });

            GhostFactory.updateHealthBar(data.mesh, data.health);
            const hpBar = data.mesh.getObjectByName('healthBar');
            if (hpBar) hpBar.lookAt(camera.position);

            data.mesh.visible = data.alive;
        });

        // ── Powerup animations ──
        powerupMeshes.forEach((pw) => {
            if (pw.mesh) {
                pw.mesh.rotation.y = time;
                pw.mesh.position.y = pw.mesh.userData.baseY + Math.sin(time * 2) * 0.15;
            }
        });

        // ── Weapon pickup animations ──
        weaponMeshes.forEach((wm) => {
            if (wm.mesh) {
                Weapons.animate(wm.mesh, time);
            }
        });

        // ── Arena ──
        Arena.animate(arenaObjects, time);

        // ── Particles & Projectiles ──
        Combat.updateParticles(attackParticles, scene);
        Combat.updateProjectiles(scene, delta);
        Combat.updateUltimateVFX();
        updateFloatingDamage(camera);

        // ── Aura effect on ghost ──
        if (localPlayer && auraObj) {
            if (activePowerup && Date.now() < activePowerup.expiresAt) {
                auraObj.visible = true;
                auraObj.rotation.y = time * 2;
                auraObj.scale.setScalar(1 + Math.sin(time * 4) * 0.15);
                auraObj.material.opacity = 0.15 + Math.sin(time * 3) * 0.08;
            } else {
                auraObj.visible = false;
                if (activePowerup) activePowerup = null;
            }
        }

        renderer.render(scene, camera);
    }

    // ═══════════════════════════════════════════════
    //  MENU
    // ═══════════════════════════════════════════════
    function createMenuParticles() {
        const c = document.getElementById('menu-particles');
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position:absolute;
                width:${2 + Math.random() * 4}px;
                height:${2 + Math.random() * 4}px;
                background:rgba(168,85,247,${0.1 + Math.random() * 0.3});
                border-radius:50%;
                left:${Math.random() * 100}%;
                top:${Math.random() * 100}%;
                animation:float-particle ${5 + Math.random() * 10}s ease-in-out infinite;
                animation-delay:${Math.random() * 5}s;`;
            c.appendChild(p);
        }
        const s = document.createElement('style');
        s.textContent = `@keyframes float-particle {
            0%,100%{transform:translate(0,0) scale(1);opacity:.3}
            50%{transform:translate(${Math.random() * 40 - 20}px,-${30 + Math.random() * 30}px) scale(1.5);opacity:.6}
        }`;
        document.head.appendChild(s);
    }

    let selectedBotCount = 3; // default bot count

    function initMenu() {
        createMenuParticles();

        document.querySelectorAll('.ghost-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ghost-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                localGhostType = btn.dataset.type;
            });
        });

        document.getElementById('create-room-btn').addEventListener('click', () => {
            localPlayerName = document.getElementById('player-name').value.trim() || 'Ghost';
            const user = JSON.parse(localStorage.getItem('ghost_user') || 'null');
            socket.emit('create-room', {
                name: localPlayerName,
                ghostType: localGhostType,
                userId: user ? user.id : null
            });
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            const code = document.getElementById('room-code-input').value.trim().toUpperCase();
            if (!code) { showError('Enter a room code!'); return; }
            localPlayerName = document.getElementById('player-name').value.trim() || 'Ghost';
            const user = JSON.parse(localStorage.getItem('ghost_user') || 'null');
            socket.emit('join-room', {
                code,
                name: localPlayerName,
                ghostType: localGhostType,
                userId: user ? user.id : null
            });
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            socket.emit('start-game');
        });

        // ── Play with Bots: create room then auto-add bots ──
        document.getElementById('play-bots-btn').addEventListener('click', () => {
            localPlayerName = document.getElementById('player-name').value.trim() || 'Ghost';
            // We'll add bots after room-created event fires
            socket._playWithBots = true;
            socket.emit('create-room', { name: localPlayerName, ghostType: localGhostType });
        });

        // ── Bot count selector buttons ──
        document.querySelectorAll('.bot-count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bot-count-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedBotCount = parseInt(btn.dataset.count);
            });
        });

        // ── Lobby "Add Bots" button ──
        document.getElementById('add-bots-btn').addEventListener('click', () => {
            socket.emit('add-bots', { count: selectedBotCount });
        });
    }

    function showLobby(code) {
        mainMenu.classList.add('hidden');
        lobbyPanel.classList.remove('hidden');
        lobbyCode.textContent = code;
        addLobbyPlayer(localPlayerName, localGhostType);
    }

    function addLobbyPlayer(name, ghostType) {
        const tag = document.createElement('div');
        tag.className = 'lobby-player-tag';
        tag.style.background = `${getGhostColor(ghostType)}22`;
        tag.style.borderColor = getGhostColor(ghostType);
        tag.textContent = name;
        lobbyPlayers.appendChild(tag);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 3000);
    }

    function startGame() {
        menuScreen.classList.remove('active');
        menuScreen.style.display = 'none';
        gameHud.classList.remove('hidden');
        gameHud.classList.add('active');
        gameStarted = true;

        // Start background music
        if (window.audioManager) window.audioManager.startMusic();

        // Attack callback — route through weapon if equipped
        InputHandler.onAttack(() => {
            if (!alive || !localPlayer || !gameStarted) return;
            if (equippedWeapon && equippedWeapon.ammo > 0) {
                const fired = Combat.weaponAttack(localPlayer, remotePlayers, socket, scene, equippedWeapon.type);
                if (fired) {
                    equippedWeapon.ammo--;
                    updateWeaponHUD();
                    if (equippedWeapon.ammo <= 0) {
                        equippedWeapon = null;
                        updateWeaponHUD();
                    }
                }
            } else {
                Combat.meleeAttack(localPlayer, remotePlayers, camera, socket, scene);
            }
        });
        InputHandler.onSpecial(() => {
            if (!alive || !localPlayer || !gameStarted) return;
            if (ultimateReady) {
                // Fire ultimate AoE!
                socket.emit('ultimate-attack', {
                    position: {
                        x: localPlayer.position.x,
                        y: localPlayer.position.y,
                        z: localPlayer.position.z
                    }
                });
                killStreak = 0;
                updateUltimateBarHUD();
            }
        });

        // Ability callback
        InputHandler.onAbility(() => {
            if (!alive || !localPlayer || !gameStarted) return;
            socket.emit('use-ability');
        });
    }

    // ── Weapon HUD helpers ──
    function updateWeaponHUD() {
        const weaponHud = document.getElementById('weapon-hud');
        if (!equippedWeapon) {
            weaponHud.classList.add('hidden');
            return;
        }
        const config = Weapons.WEAPON_CONFIGS[equippedWeapon.type];
        if (!config) return;

        weaponHud.classList.remove('hidden');
        document.getElementById('weapon-icon').textContent = config.icon;
        document.getElementById('weapon-name').textContent = config.name;

        // Set icon box border color to weapon color
        const hexColor = '#' + config.projColor.toString(16).padStart(6, '0');
        document.getElementById('weapon-icon-box').style.borderColor = hexColor;

        // Ammo dots
        const dotsContainer = document.getElementById('weapon-ammo-dots');
        dotsContainer.innerHTML = '';
        const totalAmmo = Weapons.WEAPON_CONFIGS[equippedWeapon.type].ammo;
        for (let i = 0; i < totalAmmo; i++) {
            const dot = document.createElement('span');
            dot.className = 'ammo-dot' + (i >= equippedWeapon.ammo ? ' spent' : '');
            dotsContainer.appendChild(dot);
        }
    }

    // ── Ultimate Bar HUD ──
    function updateUltimateBarHUD() {
        const bar = document.getElementById('ultimate-bar');
        const fill = document.getElementById('ultimate-fill');
        const label = document.getElementById('ultimate-label');
        const segments = document.getElementById('ultimate-segments');
        if (!bar) return;

        bar.classList.remove('hidden');

        // Fill width
        const pct = (killStreak / ULTIMATE_KILLS_NEEDED) * 100;
        fill.style.width = pct + '%';

        // Segments (skull icons)
        segments.innerHTML = '';
        for (let i = 0; i < ULTIMATE_KILLS_NEEDED; i++) {
            const seg = document.createElement('span');
            seg.className = 'ult-segment' + (i < killStreak ? ' filled' : '');
            seg.textContent = '💀';
            segments.appendChild(seg);
        }

        if (ultimateReady) {
            bar.classList.add('ultimate-ready');
            label.textContent = 'SOUL PURGE READY [E]';
        } else {
            bar.classList.remove('ultimate-ready');
            label.textContent = killStreak + ' / ' + ULTIMATE_KILLS_NEEDED + ' kills';
        }
    }

    // ═══════════════════════════════════════════════
    //  SOCKET EVENTS
    // ═══════════════════════════════════════════════
    function initSocket() {
        socket.on('room-created', (data) => {
            localPlayerId = data.playerId;
            localGhostType = data.ghostType;
            showLobby(data.code);
            spawnLocalPlayer(data.spawn, data.ghostType);

            // Auto-add bots if "Play with Bots" was clicked
            if (socket._playWithBots) {
                socket._playWithBots = false;
                socket.emit('add-bots', { count: selectedBotCount });
            }
        });

        socket.on('player-joined', (data) => {
            if (data.id !== localPlayerId) {
                spawnRemotePlayer(data.id, {
                    name: data.name, ghostType: data.ghostType,
                    position: data.spawn, health: 100, alive: true
                });
                addLobbyPlayer(data.name, data.ghostType);
            }
            playerCount.textContent = data.playerCount;
            if (data.playerCount >= 2) waitMsg.textContent = 'Ready to battle!';
        });

        socket.on('existing-players', (players) => {
            Object.entries(players).forEach(([id, data]) => {
                spawnRemotePlayer(id, data);
                addLobbyPlayer(data.name, data.ghostType);
            });
        });

        socket.on('existing-powerups', (powerups) => {
            powerups.forEach(pw => {
                const mesh = Powerups.createClock(pw.tier);
                mesh.position.set(pw.position.x, pw.position.y, pw.position.z);
                mesh.userData.baseY = pw.position.y;
                scene.add(mesh);
                powerupMeshes.set(pw.id, { mesh, data: pw });
            });
        });

        socket.on('game-started', () => startGame());

        socket.on('game-state', (state) => {
            Object.entries(state).forEach(([id, data]) => {
                if (id === localPlayerId) {
                    health = data.health;
                    kills = data.kills;
                    alive = data.alive;
                    updateHealthHUD();
                    updateKillsHUD();
                    return;
                }
                const remote = remotePlayers.get(id);
                if (remote) {
                    if (data.position) remote.targetPos = data.position;
                    if (data.rotation) remote.targetRot = data.rotation;
                    remote.health = data.health;
                    remote.alive = data.alive;
                    remote.kills = data.kills;
                    remote.animState = data.animState;
                }
            });
            updatePlayerListHUD(state);
        });

        socket.on('spawn-powerup', (data) => {
            const mesh = Powerups.createClock(data.tier);
            mesh.position.set(data.position.x, data.position.y, data.position.z);
            mesh.userData.baseY = data.position.y;
            scene.add(mesh);
            powerupMeshes.set(data.id, { mesh, data });
        });

        socket.on('powerup-picked', (data) => {
            const pw = powerupMeshes.get(data.powerupId);
            if (pw && pw.mesh) scene.remove(pw.mesh);
            powerupMeshes.delete(data.powerupId);

            if (data.playerId === localPlayerId) {
                health = data.newHealth;
                updateHealthHUD();

                if (data.tier === 2) {
                    showEffect('⚡ Speed Boost', 5000);
                    activePowerup = { type: 'speed', expiresAt: Date.now() + 5000 };
                    if (localPlayer) localPlayer.userData.speedBoost = Date.now() + 5000;
                    setAuraColor(0x38bdf8);  // cyan
                } else if (data.tier === 3) {
                    showEffect('🔥 Damage Boost + Full Heal', 8000);
                    activePowerup = { type: 'damage', expiresAt: Date.now() + 8000 };
                    setAuraColor(0xff4444);  // red
                } else {
                    showEffect('💚 +15 HP', 1500);
                    // Tier 1 = heal only, no blocking powerup
                }

                if (window.audioManager) window.audioManager.playPowerup();
            }
        });

        // ── Weapon spawn ──
        socket.on('spawn-weapon', (data) => {
            const mesh = Weapons.createPickup(data.weaponType);
            if (!mesh) return;
            mesh.position.set(data.position.x, data.position.y, data.position.z);
            mesh.userData.baseY = data.position.y;
            scene.add(mesh);
            weaponMeshes.set(data.id, { mesh, data });
        });

        socket.on('existing-weapons', (weapons) => {
            weapons.forEach(w => {
                const mesh = Weapons.createPickup(w.weaponType);
                if (!mesh) return;
                mesh.position.set(w.position.x, w.position.y, w.position.z);
                mesh.userData.baseY = w.position.y;
                scene.add(mesh);
                weaponMeshes.set(w.id, { mesh, data: w });
            });
        });

        socket.on('weapon-picked', (data) => {
            const wm = weaponMeshes.get(data.weaponId);
            if (wm && wm.mesh) scene.remove(wm.mesh);
            weaponMeshes.delete(data.weaponId);

            if (data.playerId === localPlayerId) {
                const config = Weapons.WEAPON_CONFIGS[data.weaponType];
                if (config) {
                    equippedWeapon = { type: data.weaponType, ammo: config.ammo };
                    updateWeaponHUD();
                    showEffect(config.icon + ' ' + config.name + ' (' + config.ammo + ' shots)', 2500);
                }
                if (window.audioManager) window.audioManager.playPowerup();
            }
        });

        socket.on('player-attacked', (data) => {
            if (data.attackerId === localPlayerId) return;
            const remote = remotePlayers.get(data.attackerId);
            if (remote && remote.mesh) {
                const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
                const pos = remote.mesh.position.clone().add(dir.clone().normalize().multiplyScalar(1.5));
                pos.y += 0.8;
                const cfg = GhostFactory.GHOST_CONFIGS[remote.ghostType] || {};
                const ghostColor = cfg.emissive || 0xa855f7;

                // Spawn actual projectile from remote player
                if (data.attackType === 'weapon' && data.weaponType && Weapons && Weapons.fireProjectile) {
                    Weapons.fireProjectile(scene, pos, dir.normalize(), data.weaponType, []);
                    Combat.spawnParticles(scene, pos, ghostColor, 8, 0.3);
                    if (window.audioManager) window.audioManager.playShoot('light');
                } else {
                    Combat.spawnParticles(scene, pos, ghostColor, data.attackType === 'special' ? 16 : 8, 0.3);
                    Combat.fireProjectile(scene, pos, dir.normalize(), ghostColor, data.attackType || 'melee');
                }
            }
        });

        socket.on('player-damaged', (data) => {
            if (data.targetId === localPlayerId) {
                health = data.health;
                updateHealthHUD();
                // screen shake
                camera.position.x += (Math.random() - 0.5) * 0.4;
                camera.position.y += (Math.random() - 0.5) * 0.25;
            }
            // Update remote player health immediately
            const target = remotePlayers.get(data.targetId);
            if (target) {
                target.health = data.health;
                // Immediate visual update of the 3D health bar
                if (target.mesh) {
                    GhostFactory.updateHealthBar(target.mesh, data.health);
                }
                // Flash red
                if (target.mesh) {
                    target.mesh.traverse(child => {
                        if (child.isMesh && child.material && child.material.emissive) {
                            const orig = child.material.emissive.getHex();
                            const origI = child.material.emissiveIntensity;
                            child.material.emissive.setHex(0xff0000);
                            child.material.emissiveIntensity = 1.5;
                            setTimeout(() => {
                                child.material.emissive.setHex(orig);
                                child.material.emissiveIntensity = origI;
                            }, 200);
                        }
                    });
                }
                // Show floating damage number
                if (target.mesh && data.damage) {
                    showFloatingDamage(target.mesh.position, data.damage);
                }
                if (window.audioManager) window.audioManager.playHit();
            }
        });

        socket.on('player-died', (data) => {
            const victimData = remotePlayers.get(data.id);
            const vName = victimData ? victimData.name : 'Ghost';

            // Visual Explosion
            if (victimData && victimData.mesh) {
                const color = getGhostColor(victimData.ghostType);
                Combat.spawnParticles(scene, victimData.mesh.position, color, 40, 0.8);
            } else if (data.id === localPlayerId && localPlayer) {
                const color = getGhostColor(localGhostType);
                Combat.spawnParticles(scene, localPlayer.position, color, 50, 1.0);
            }

            addKillFeedItem(data.killerName, data.id === localPlayerId ? localPlayerName : vName);

            // Track kill streak for local player
            if (data.killerId === localPlayerId && data.id !== localPlayerId && !data.isUltimate) {
                killStreak = Math.min(killStreak + 1, ULTIMATE_KILLS_NEEDED);
                if (killStreak >= ULTIMATE_KILLS_NEEDED && !ultimateReady) {
                    ultimateReady = true;
                    showEffect('⚡ ULTIMATE READY! Press E', 3000);
                }
                updateUltimateBarHUD();
            }

            if (data.id === localPlayerId) {
                alive = false;
                // Reset kill streak on death
                killStreak = 0;
                ultimateReady = false;
                updateUltimateBarHUD();
                killerName.textContent = data.killerName;
                deathOverlay.classList.remove('hidden');
                let cd = 3;
                respawnCountdown.textContent = cd;
                const iv = setInterval(() => { cd--; respawnCountdown.textContent = cd; if (cd <= 0) clearInterval(iv); }, 1000);
                if (localPlayer) localPlayer.visible = false;
            }
            const remote = remotePlayers.get(data.id);
            if (remote) remote.alive = false;

            if (window.audioManager) window.audioManager.playDeath();
        });

        socket.on('player-respawned', (data) => {
            if (data.id === localPlayerId) {
                alive = true;
                health = 100;
                deathOverlay.classList.add('hidden');
                updateHealthHUD();
                if (localPlayer) {
                    localPlayer.position.set(data.position.x, PLAYER_Y, data.position.z);
                    localPlayer.visible = true;
                }
            }
            const remote = remotePlayers.get(data.id);
            if (remote) {
                remote.alive = true;
                remote.health = 100;
                remote.targetPos = data.position;
            }
        });

        socket.on('player-left', (data) => {
            const remote = remotePlayers.get(data.id);
            if (remote && remote.mesh) scene.remove(remote.mesh);
            remotePlayers.delete(data.id);
        });

        socket.on('error-msg', (data) => showError(data.message));

        // ── Ultimate VFX ──
        socket.on('ultimate-used', (data) => {
            // Spectacular AoE shockwave at the attacker's position
            Combat.spawnUltimateVFX(scene, data.position, data.radius);

            // Screen flash for everyone
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,51,102,0.35);pointer-events:none;z-index:999;transition:opacity 1.5s;';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = '0'; }, 100);
            setTimeout(() => { flash.remove(); }, 1600);

            // Heavy screen shake for attacker
            if (data.attackerId === localPlayerId) {
                showEffect('💥 SOUL PURGE!', 3000);
            }
        });

        // ── Ability Visuals ──
        socket.on('ability-used', (data) => {
            if (window.audioManager) window.audioManager.playPowerup(); // generic sound for now

            /* Visual Effects */
            const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            const color = getGhostColor(data.ghostType);

            // Spawn particles based on type
            Combat.spawnParticles(scene, pos, color, 12, 0.5);

            if (data.playerId === localPlayerId) {
                // Feedback for local player
                showEffect('✨ Ability Used!', 1000);
            }
        });
    }

    // ═══════════════════════════════════════════════
    //  BOOT
    // ═══════════════════════════════════════════════
    // ── Asset Preloading (Fix startup lag) ──
    // ── Asset Preloading (Async with Progress) ──
    function preloadAssetsAsync() {
        const loadingScreen = document.getElementById('loading-screen');
        const barFill = document.getElementById('loading-bar-fill');
        const loadText = document.getElementById('loading-text');
        const tasks = [];

        // 1. Ghost Models
        Object.keys(GhostFactory.GHOST_CONFIGS).forEach(type => {
            tasks.push({
                name: `Summoning ${type}...`,
                action: () => {
                    const ghost = GhostFactory.create(type, 'Preload');
                    scene.add(ghost);
                    setTimeout(() => scene.remove(ghost), 100);
                }
            });
        });

        // 2. Weapon Models
        Object.keys(Weapons.WEAPON_CONFIGS).forEach(type => {
            tasks.push({
                name: `Forging ${type}...`,
                action: () => {
                    const weapon = Weapons.createPickup(type);
                    if (weapon) {
                        scene.add(weapon);
                        setTimeout(() => scene.remove(weapon), 100);
                    }
                }
            });
        });

        // 3. Shader Compilation
        tasks.push({
            name: 'Compiling Ectoplasm Shaders...',
            action: () => {
                renderer.compile(scene, camera);
                // Force a render
                renderer.render(scene, camera);
            }
        });

        // 4. Particle Pool Warmup
        tasks.push({
            name: 'Energizing Particle Systems...',
            action: () => {
                // Pre-spawn and hide some particles
                Combat.spawnParticles(scene, new THREE.Vector3(0, -100, 0), 0xffffff, 50, 1);
            }
        });

        // Execute tasks with delay to simulate load / allow UI update
        let currentTask = 0;
        const totalTasks = tasks.length;
        // User requested ~10 seconds. Let's aim for a total duration close to that
        // OR simply spread them out. 10s is very long, but we will pad it.
        const stepTime = 600; // ~10-12 steps * 600ms = ~6-7 seconds

        function processNext() {
            if (currentTask >= totalTasks) {
                // Done
                loadText.textContent = 'Ready to Haunt!';
                barFill.style.width = '100%';
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    document.getElementById('menu-screen').classList.remove('hidden');
                    document.getElementById('menu-screen').classList.add('active');
                }, 500);
                return;
            }

            const task = tasks[currentTask];
            loadText.textContent = task.name;
            const pct = Math.round(((currentTask + 1) / totalTasks) * 100);
            barFill.style.width = pct + '%';

            // Run task
            try {
                task.action();
            } catch (e) {
                console.error('Asset load error:', e);
            }

            currentTask++;
            setTimeout(processNext, stepTime);
        }

        // Start
        processNext();
    }

    // ═══════════════════════════════════════════════
    //  BOOT
    // ═══════════════════════════════════════════════
    function init() {
        initScene();
        // Start async loading instead of sync
        preloadAssetsAsync();
        initMenu();
        initSocket();
        requestAnimationFrame(gameLoop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

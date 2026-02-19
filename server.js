const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const db = require('./db');

app.use(express.json());
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use(express.static('public'));

// ── API Routes ──────────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const result = db.createUser(username, password);
    if (result.success) res.json(result);
    else res.status(409).json(result);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const result = db.loginUser(username, password);
    if (result.success) res.json(result);
    else res.status(401).json(result);
});

app.get('/api/leaderboard', (req, res) => {
    res.json(db.getLeaderboard());
});

// ── Game State ──────────────────────────────────────────────
const rooms = new Map();
const TICK_RATE = 20;
const POWERUP_INTERVAL_MIN = 8000;
const POWERUP_INTERVAL_MAX = 15000;
const RESPAWN_TIME = 3000;
const ARENA_RADIUS = 60; // half of 128x128 arena minus margin
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

const GHOST_TYPES = ['wraith', 'phantom', 'shade', 'specter'];

// Weapon configs (damage as % of 100 HP)
const WEAPON_DAMAGE = {
    holyWater: 20,
    sacredCross: 35,
    silverDagger: 50,
    bindingChains: 40,
    sageSmudge: 60,
    exorcistBible: 100
};
const WEAPON_TYPES = Object.keys(WEAPON_DAMAGE);
const WEAPON_SPAWN_INTERVAL = 12000;

// ── Ability System ──────────────────────────────────────────
const ABILITY_COOLDOWNS = {
    wraith: 4000,   // Dash
    phantom: 10000, // Invis
    shade: 8000,    // Shield
    specter: 15000  // Stun
};

// ── Bot System ──────────────────────────────────────────────
const BOT_NAMES = [
    'ShadowHunter', 'VoidWalker', 'PhantomSlayer', 'GraveKeeper',
    'SoulReaper', 'NightWraith', 'CryptLord', 'BoneChiller',
    'DuskProwler', 'MistStalker', 'GhoulMaster', 'TombRaider'
];
const BOT_DETECTION_RANGE = 60; // Increased from 30 for more aggression
const BOT_MELEE_RANGE = 3.5;
const BOT_PICKUP_RANGE = 8;
const BOT_FLEE_HP = 25;
const BOT_ATTACK_COOLDOWN = 800;  // ms between melee attacks
const BOT_WEAPON_COOLDOWN_MAP = {
    holyWater: 600, sacredCross: 1100, silverDagger: 1300,
    bindingChains: 1600, sageSmudge: 2100, exorcistBible: 4200
};

let botIdCounter = 0;
function generateBotId() { return 'bot_' + (++botIdCounter) + '_' + Date.now(); }

function addBot(room) {
    const botId = generateBotId();
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const ghostType = GHOST_TYPES[Math.floor(Math.random() * GHOST_TYPES.length)];
    const spawn = randomSpawnPosition();

    const bot = {
        name, ghostType, position: spawn,
        rotation: { y: Math.random() * Math.PI * 2 },
        health: 100, kills: 0, alive: true,
        lastAbilityTime: 0,
        animState: 'idle', effects: {},
        isBot: true,
        // AI state
        ai: {
            state: 'roaming',      // roaming | chasing | attacking | fleeing
            targetId: null,
            moveDir: { x: 0, z: 0 },
            dirChangeTime: 0,
            lastAttackTime: 0,
            weapon: null,          // { type, ammo }
            stuckCounter: 0,
            lastPos: { x: spawn.x, z: spawn.z },
            lastAbilityTime: 0
        }
    };
    room.players.set(botId, bot);

    // Notify all clients
    io.to(room.code).emit('player-joined', {
        id: botId, name, ghostType, spawn,
        playerCount: room.players.size,
        isBot: true
    });
    return botId;
}

function removeAllBots(room) {
    const botIds = [];
    room.players.forEach((p, id) => { if (p.isBot) botIds.push(id); });
    botIds.forEach(id => {
        room.players.delete(id);
        io.to(room.code).emit('player-left', { id });
    });
}

function getRandomWeaponType() {
    const weights = [30, 25, 18, 12, 10, 5];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return WEAPON_TYPES[i];
    }
    return WEAPON_TYPES[0];
}

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function randomSpawnPosition() {
    // Spawn at safe positions avoiding center altar and obstacles
    const safeSpots = [
        { x: -36, z: -36 }, { x: 36, z: -36 },
        { x: -36, z: 36 }, { x: 36, z: 36 },
        { x: -50, z: 0 }, { x: 50, z: 0 },
        { x: 0, z: -50 }, { x: 0, z: 50 },
        { x: -20, z: -50 }, { x: 20, z: 50 },
    ];
    const spot = safeSpots[Math.floor(Math.random() * safeSpots.length)];
    return { x: spot.x + (Math.random() - 0.5) * 6, y: 1.5, z: spot.z + (Math.random() - 0.5) * 6 };
}

function randomPowerupPosition() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 48;
    return {
        x: Math.cos(angle) * dist,
        y: 1.2,
        z: Math.sin(angle) * dist
    };
}

function getPowerupTier() {
    const r = Math.random();
    if (r < 0.5) return 1;
    if (r < 0.85) return 2;
    return 3;
}

function createRoom(hostId) {
    const code = generateRoomCode();
    const room = {
        code,
        hostId,
        players: new Map(),
        powerups: new Map(),
        weapons: new Map(),
        gameActive: false,
        powerupTimer: null,
        weaponTimer: null,
        tickTimer: null
    };
    rooms.set(code, room);
    return room;
}

function spawnPowerup(room) {
    const id = uuidv4();
    const tier = getPowerupTier();
    const position = randomPowerupPosition();
    const powerup = { id, tier, position };
    room.powerups.set(id, powerup);

    io.to(room.code).emit('spawn-powerup', powerup);

    const delay = POWERUP_INTERVAL_MIN + Math.random() * (POWERUP_INTERVAL_MAX - POWERUP_INTERVAL_MIN);
    room.powerupTimer = setTimeout(() => spawnPowerup(room), delay);
}

function spawnWeapon(room) {
    const id = uuidv4();
    const weaponType = getRandomWeaponType();
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 45;
    const position = {
        x: Math.cos(angle) * dist,
        y: 1.0,
        z: Math.sin(angle) * dist
    };
    const weapon = { id, weaponType, position };
    room.weapons.set(id, weapon);

    io.to(room.code).emit('spawn-weapon', weapon);

    const delay = WEAPON_SPAWN_INTERVAL + Math.random() * 8000;
    room.weaponTimer = setTimeout(() => spawnWeapon(room), delay);
}

function startGameLoop(room) {
    room.gameActive = true;

    // Start powerup + weapon spawning
    const delay = POWERUP_INTERVAL_MIN + Math.random() * (POWERUP_INTERVAL_MAX - POWERUP_INTERVAL_MIN);
    room.powerupTimer = setTimeout(() => spawnPowerup(room), delay);
    room.weaponTimer = setTimeout(() => spawnWeapon(room), 5000 + Math.random() * 5000);

    // Game tick
    const tickDelta = 1 / TICK_RATE;
    room.tickTimer = setInterval(() => {
        // ── Bot AI tick ──
        updateBots(room, tickDelta);

        const state = {};
        room.players.forEach((p, id) => {
            state[id] = {
                id: id,
                position: p.position,
                rotation: p.rotation,
                health: p.health,
                kills: p.kills,
                alive: p.alive,
                animState: p.animState,
                effects: p.effects || {}
            };
        });
        io.to(room.code).emit('game-state', state);
    }, 1000 / TICK_RATE);
}

function stopGameLoop(room) {
    room.gameActive = false;
    if (room.powerupTimer) clearTimeout(room.powerupTimer);
    if (room.weaponTimer) clearTimeout(room.weaponTimer);
    if (room.tickTimer) clearInterval(room.tickTimer);
}

function cleanupRoom(code) {
    const room = rooms.get(code);
    if (room) {
        stopGameLoop(room);
        rooms.delete(code);
    }
}

// ══════════════════════════════════════════════════════════════
//  BOT AI BRAIN — runs every server tick for each bot
// ══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════
//  BOT AI BRAIN — runs every server tick for each bot
// ═══════════════════════════════════════════════
function updateBots(room, dt) {
    const now = Date.now();
    const BOT_SPEED = 8;
    // Optimization: Run decision logic less frequently to save CPU
    const DECISION_INTERVAL = 250; // 4 times per second (was 100ms)

    room.players.forEach((bot, botId) => {
        if (!bot.isBot || !bot.alive) return;
        const ai = bot.ai;

        // ── DECISION PHASE (Throttled) ──
        if (now - ai.lastDecisionTime > DECISION_INTERVAL) {
            ai.lastDecisionTime = now;

            // 1. Target Selection (AGGRESSIVE HUNTER)
            let currentTarget = ai.targetId ? room.players.get(ai.targetId) : null;
            let distToTarget = Infinity;
            let distToTargetSq = Infinity;

            // Validate current target
            if (currentTarget && currentTarget.alive) {
                const dx = currentTarget.position.x - bot.position.x;
                const dz = currentTarget.position.z - bot.position.z;
                distToTargetSq = dx * dx + dz * dz;
                distToTarget = Math.sqrt(distToTargetSq);

                // Lose interest ONLY if extremely far (cross-map)
                if (distToTarget > 150) {
                    currentTarget = null;
                    ai.targetId = null;
                }
            } else {
                currentTarget = null;
                ai.targetId = null;
            }

            // If no target, SCAN GLOBALLY for the nearest enemy
            if (!currentTarget) {
                let nearestId = null, nearestDistSq = Infinity;
                for (const [otherId, other] of room.players) {
                    if (otherId === botId || !other.alive) continue;

                    const dx = other.position.x - bot.position.x;
                    const dz = other.position.z - bot.position.z;
                    const dSq = dx * dx + dz * dz;

                    if (dSq < nearestDistSq) {
                        nearestDistSq = dSq;
                        nearestId = otherId;
                    }
                }

                if (nearestId) {
                    ai.targetId = nearestId;
                    currentTarget = room.players.get(nearestId);
                    distToTargetSq = nearestDistSq;
                    distToTarget = Math.sqrt(nearestDistSq);
                }
            }

            // 2. Resource Scanning (Powerups/Weapons)
            // Prioritize weapons if unarmed!
            let nearestPowerup = null;
            let nearestWeapon = null;

            // Find nearest weapon if we don't have one
            if (!ai.weapon) {
                let bestWpDistSq = Infinity;
                room.weapons.forEach((wp, wpId) => {
                    const dx = wp.position.x - bot.position.x;
                    const dz = wp.position.z - bot.position.z;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < bestWpDistSq) {
                        bestWpDistSq = dSq;
                        nearestWeapon = { id: wpId, ...wp, dist: Math.sqrt(dSq) };
                    }
                });
            }

            // Find nearest powerup if hurt
            if (bot.health < 60) {
                let bestPwDistSq = Infinity;
                room.powerups.forEach((pw, pwId) => {
                    const dx = pw.position.x - bot.position.x;
                    const dz = pw.position.z - bot.position.z;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < bestPwDistSq) {
                        bestPwDistSq = dSq;
                        nearestPowerup = { id: pwId, ...pw, dist: Math.sqrt(dSq) };
                    }
                });
            }

            // 3. State & Logic Determination
            const attackRange = ai.weapon ? getWeaponRange(ai.weapon.type) : BOT_MELEE_RANGE;

            // Priority 1: Get a weapon if unarmed and one is relatively close (< 40 units)
            if (!ai.weapon && nearestWeapon && nearestWeapon.dist < 40) {
                ai.state = 'roaming';
                ai.weaponTarget = nearestWeapon;
            }
            // Priority 2: Combat (Attack if in range, Chase if out of range)
            else if (currentTarget) {
                if (distToTarget <= attackRange) {
                    ai.state = 'attacking';
                    // If using melee, we must be VERY close. If ranged, we can stand back.
                    // But 'attacking' state usually implies "shoot/swing". 
                    // We handle movement execution below.
                } else {
                    ai.state = 'chasing';
                }
            }
            // Priority 3: Heal if hurt and powerup nearby
            else if (bot.health < 60 && nearestPowerup && nearestPowerup.dist < 30) {
                ai.state = 'roaming'; // repurpose roaming to move to powerup
                ai.chaseTarget = nearestPowerup; // hacky reuse of chaseTarget or just move to pos
                ai.weaponTarget = null; // ensure we don't chase weapon
                ai.powerupTarget = nearestPowerup;
            }
            // Priority 4: Roam/Idle
            else {
                ai.state = 'roaming';
                ai.weaponTarget = null;
            }

            // 4. Pickup Execution
            // Weapon
            if (!ai.weapon && nearestWeapon && nearestWeapon.dist < 2.5) {
                const wp = room.weapons.get(nearestWeapon.id);
                if (wp) {
                    room.weapons.delete(nearestWeapon.id);
                    ai.weapon = { type: wp.weaponType, ammo: getWeaponAmmo(wp.weaponType) };
                    io.to(room.code).emit('weapon-picked', { weaponId: nearestWeapon.id, playerId: botId, weaponType: wp.weaponType });
                    ai.weaponTarget = null;
                }
            }
            // Powerup (using the same distance check)
            if (nearestPowerup && nearestPowerup.dist < 2.5) {
                const pw = room.powerups.get(nearestPowerup.id);
                if (pw) {
                    room.powerups.delete(nearestPowerup.id);
                    switch (pw.tier) {
                        case 1: bot.health = Math.min(100, bot.health + 15); break;
                        case 2: bot.health = Math.min(100, bot.health + 30); bot.effects.speedBoost = now + 5000; break;
                        case 3: bot.health = 100; bot.effects.damageBoost = now + 8000; break;
                    }
                    io.to(room.code).emit('powerup-picked', { powerupId: nearestPowerup.id, playerId: botId, tier: pw.tier, newHealth: bot.health });
                }
            }

            // 5. Stuck Detection
            if (ai.lastPosCheck) {
                const movedDist = Math.abs(bot.position.x - ai.lastPosCheck.x) + Math.abs(bot.position.z - ai.lastPosCheck.z);
                // Only count as stuck if we wanted to move (chasing/roaming) but didn't
                if (movedDist < 0.2 && (ai.state === 'chasing' || ai.state === 'roaming')) {
                    ai.stuckCounter++;
                } else {
                    ai.stuckCounter = 0;
                }
            }
            ai.lastPosCheck = { x: bot.position.x, z: bot.position.z };

            if (ai.stuckCounter > 4) { // ~1 second stuck
                ai.forceMoveDir = { x: Math.random() - 0.5, z: Math.random() - 0.5 };
                ai.forceMoveTime = now + 1500;
                ai.stuckCounter = 0;
            }
        } // End Decision Phase

        // ── MOVEMENT & COMBAT PHASE ──
        let moveX = 0, moveZ = 0;

        // Forced un-stuck movement
        if (ai.forceMoveTime && now < ai.forceMoveTime) {
            moveX = ai.forceMoveDir.x;
            moveZ = ai.forceMoveDir.z;
            ai.state = 'roaming'; // Override state anim
        }
        else if (ai.state === 'fleeing' && ai.chaseTarget) {
            const dx = ai.chaseTarget.position.x - bot.position.x;
            const dz = ai.chaseTarget.position.z - bot.position.z;
            const len = Math.sqrt(dx * dx + dz * dz) || 1;
            moveX = dx / len; moveZ = dz / len;
        }
        else if (ai.weaponTarget) {
            const dx = ai.weaponTarget.position.x - bot.position.x;
            const dz = ai.weaponTarget.position.z - bot.position.z;
            const len = Math.sqrt(dx * dx + dz * dz) || 1;
            moveX = dx / len; moveZ = dz / len;
        }
        else if (ai.state === 'chasing') {
            const target = room.players.get(ai.targetId);
            if (target) {
                const dx = target.position.x - bot.position.x;
                const dz = target.position.z - bot.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz) || 1;
                moveX = dx / dist; moveZ = dz / dist;
            }
        }
        else if (ai.state === 'attacking') {
            const target = room.players.get(ai.targetId);
            if (target) {
                const dx = target.position.x - bot.position.x;
                const dz = target.position.z - bot.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz) || 1;

                // ── MOVEMENT DURING ATTACK ──
                // If Melee (or no weapon), run AT them
                if (!ai.weapon || ['holyWater', 'silverDagger', 'bindingChains'].includes(ai.weapon.type) === false) {
                    // Actually, let's just check range. If we are far, move closer.
                    // If we have a ranged weapon, we can strafe.
                }

                // Better logic:
                const isRanged = ai.weapon && ['sageSmudge', 'exorcistBible', 'sacredCross'].includes(ai.weapon.type);

                if (isRanged) {
                    // Strafe, but also close in if too far
                    const strafeAngle = Math.atan2(dz, dx) + Math.PI / 2 + Math.sin(now * 0.005);
                    moveX = Math.cos(strafeAngle) * 0.5;
                    moveZ = Math.sin(strafeAngle) * 0.5;

                    if (dist > 15) { // If very far, move closer while strafing
                        moveX += (dx / dist) * 0.5;
                        moveZ += (dz / dist) * 0.5;
                    }
                } else {
                    // Melee aggression: Run straight at them!
                    moveX = dx / dist;
                    moveZ = dz / dist;
                }

                // ── ATTACK EXECUTION ──
                const direction = { x: dx / dist, y: 0, z: dz / dist };

                // Ranged Attack
                if (ai.weapon && ai.weapon.ammo > 0) {
                    const wpCd = BOT_WEAPON_COOLDOWN_MAP[ai.weapon.type] || 1000;
                    const range = getWeaponRange(ai.weapon.type);

                    if (now - ai.lastAttackTime > wpCd && dist <= range + 4) {
                        ai.lastAttackTime = now;
                        ai.weapon.ammo--;

                        // Add some human-like inaccuracy
                        const spread = 0.1;
                        const aimDir = {
                            x: direction.x + (Math.random() - 0.5) * spread,
                            y: 0,
                            z: direction.z + (Math.random() - 0.5) * spread
                        };

                        io.to(room.code).emit('player-attacked', {
                            attackerId: botId,
                            attackType: 'weapon',
                            direction: aimDir,
                            weaponType: ai.weapon.type
                        });

                        applyDamage(room, botId, ai.targetId, WEAPON_DAMAGE[ai.weapon.type] || 20);

                        if (ai.weapon.ammo <= 0) ai.weapon = null;
                    }
                }
                // Melee Attack
                else if (now - ai.lastAttackTime > BOT_ATTACK_COOLDOWN && dist <= BOT_MELEE_RANGE + 1) {
                    ai.lastAttackTime = now;
                    bot.animState = 'attacking';
                    io.to(room.code).emit('player-attacked', { attackerId: botId, attackType: 'melee', direction });
                    applyDamage(room, botId, ai.targetId, 10);
                }
            }
        }
        else { // Roaming
            if (now > ai.dirChangeTime) {
                const angle = Math.random() * Math.PI * 2;
                ai.moveDir = { x: Math.cos(angle), z: Math.sin(angle) };
                ai.dirChangeTime = now + 1500 + Math.random() * 2500;
            }
            moveX = ai.moveDir.x; moveZ = ai.moveDir.z;
        }

        // Apply Movement
        if (bot.effects.stunned && now < bot.effects.stunned) { moveX = 0; moveZ = 0; }

        let speedMult = 1.0;
        if (bot.effects.speedBoost && now < bot.effects.speedBoost) speedMult = 1.6;

        // Normalizing vector if needed? 
        // Simple clamp for now to disable supersonic diagonals (though we calculate using sin/cos usually)

        const speed = BOT_SPEED * dt * speedMult;
        bot.position.x += moveX * speed;
        bot.position.z += moveZ * speed;

        // Bounds
        const bound = ARENA_RADIUS - 2;
        bot.position.x = Math.max(-bound, Math.min(bound, bot.position.x));
        bot.position.z = Math.max(-bound, Math.min(bound, bot.position.z));

        // Rotation
        if (moveX !== 0 || moveZ !== 0) {
            bot.rotation.y = Math.atan2(moveX, moveZ);
            bot.animState = 'moving';
        } else {
            bot.animState = 'idle';
        }
    });
}

// Helper: apply damage from attacker to target (used by bot combat)
function applyDamage(room, attackerId, targetId, damage) {
    const target = room.players.get(targetId);
    const attacker = room.players.get(attackerId);
    if (!target || !target.alive || !attacker) return;

    // Check for Shield (Shade)
    if (target.effects && target.effects.shielded && Date.now() < target.effects.shielded) {
        damage = Math.ceil(damage * 0.5); // 50% reduction
    }

    target.health = Math.max(0, target.health - damage);

    io.to(room.code).emit('player-damaged', {
        targetId, damage, health: target.health, attackerId
    });

    if (target.health <= 0) {
        target.alive = false;
        attacker.kills++;

        io.to(room.code).emit('player-died', {
            id: targetId, killerId: attackerId, killerName: attacker.name
        });

        // Update stats
        if (attacker.userId) db.updateStats(attacker.userId, 1, 0, 0);
        if (target.userId) db.updateStats(target.userId, 0, 1, 0);

        setTimeout(() => {
            if (!room.players.has(targetId)) return;
            const t = room.players.get(targetId);
            t.health = 100;
            t.alive = true;
            t.position = randomSpawnPosition();
            t.effects = {};
            if (t.ai) { t.ai.state = 'roaming'; t.ai.weapon = null; }

            io.to(room.code).emit('player-respawned', {
                id: targetId, position: t.position
            });
        }, RESPAWN_TIME);
    }
}

function getWeaponAmmo(type) {
    const map = { holyWater: 5, sacredCross: 4, silverDagger: 3, bindingChains: 3, sageSmudge: 2, exorcistBible: 1 };
    return map[type] || 3;
}
function getWeaponRange(type) {
    const map = { holyWater: 6, sacredCross: 8, silverDagger: 5, bindingChains: 10, sageSmudge: 7, exorcistBible: 8 };
    return map[type] || 6;
}

// ── Socket.io ───────────────────────────────────────────────
io.on('connection', (socket) => {
    let currentRoom = null;
    let playerId = socket.id;

    socket.on('create-room', ({ name, ghostType, userId }) => {
        const room = createRoom(playerId);
        currentRoom = room.code;
        socket.join(room.code);

        const spawn = randomSpawnPosition();
        room.players.set(playerId, {
            userId: userId || null,
            name: name || 'Ghost',
            ghostType: ghostType || GHOST_TYPES[0],
            position: spawn,
            rotation: { y: 0 },
            health: 100,
            kills: 0,
            alive: true,
            animState: 'idle',
            effects: {},
            lastAbilityTime: 0
        });

        socket.emit('room-created', {
            code: room.code,
            playerId,
            spawn,
            ghostType: ghostType || GHOST_TYPES[0]
        });
    });

    socket.on('join-room', ({ code, name, ghostType, userId }) => {
        const room = rooms.get(code);
        if (!room) {
            socket.emit('error-msg', { message: 'Room not found' });
            return;
        }
        if (room.players.size >= MAX_PLAYERS) {
            socket.emit('error-msg', { message: 'Room is full' });
            return;
        }

        currentRoom = code;
        socket.join(code);

        const spawn = randomSpawnPosition();
        const chosenType = ghostType || GHOST_TYPES[room.players.size % GHOST_TYPES.length];

        room.players.set(playerId, {
            userId: userId || null,
            name: name || 'Ghost',
            ghostType: chosenType,
            position: spawn,
            rotation: { y: 0 },
            health: 100,
            kills: 0,
            alive: true,
            animState: 'idle',
            effects: {},
            lastAbilityTime: 0
        });

        // Notify specific player they joined successfully
        socket.emit('room-joined', {
            code: room.code,
            playerId,
            spawn,
            ghostType: chosenType
        });

        // Notify everyone
        io.to(code).emit('player-joined', {
            id: playerId,
            name: name || 'Ghost',
            ghostType: chosenType,
            spawn,
            playerCount: room.players.size
        });

        // Send existing players to the new player
        const existingPlayers = {};
        room.players.forEach((p, id) => {
            if (id !== playerId) {
                existingPlayers[id] = {
                    name: p.name,
                    ghostType: p.ghostType,
                    position: p.position,
                    health: p.health,
                    kills: p.kills,
                    alive: p.alive
                };
            }
        });
        socket.emit('existing-players', existingPlayers);

        // Send existing powerups
        const existingPowerups = [];
        room.powerups.forEach((p) => existingPowerups.push(p));
        socket.emit('existing-powerups', existingPowerups);

        // Send existing weapons
        const existingWeapons = [];
        room.weapons.forEach((w) => existingWeapons.push(w));
        socket.emit('existing-weapons', existingWeapons);

        // Start game if not already running and we have enough players
        if (!room.gameActive && room.players.size >= MIN_PLAYERS) {
            startGameLoop(room);
            io.to(code).emit('game-started');
        }
    });

    socket.on('start-game', () => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.gameActive) return;
        startGameLoop(room);
        io.to(currentRoom).emit('game-started');
    });

    // ── Bot Management ──
    socket.on('add-bots', ({ count }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const numBots = Math.min(count || 3, MAX_PLAYERS - room.players.size);
        for (let i = 0; i < numBots; i++) {
            addBot(room);
        }
        // Auto-start game if enough players
        if (!room.gameActive && room.players.size >= MIN_PLAYERS) {
            startGameLoop(room);
            io.to(currentRoom).emit('game-started');
        }
    });

    socket.on('player-update', (data) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(playerId);
        if (!player) return;

        // Validate movement if stunned
        if (player.effects && player.effects.stunned && Date.now() < player.effects.stunned) {
            return; // Ignore updates while stunned
        }

        if (data.position) player.position = data.position;
        if (data.rotation) player.rotation = data.rotation;
        if (data.animState) player.animState = data.animState;
    });

    socket.on('use-ability', () => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(playerId);
        if (!player || !player.alive) return;

        // Cooldown check
        const cd = ABILITY_COOLDOWNS[player.ghostType] || 5000;
        const now = Date.now();
        if (now - (player.lastAbilityTime || 0) < cd) return;

        player.lastAbilityTime = now;

        // Apply Ability
        switch (player.ghostType) {
            case 'wraith': // Dash
                player.effects.dash = now + 400; // 400ms burst
                break;
            case 'phantom': // Invis
                player.effects.invisible = now + 4000;
                break;
            case 'shade': // Shield
                player.effects.shielded = now + 4000;
                break;
            case 'specter': // AOE Stun
                // Find enemies within 15 units
                room.players.forEach((p, pid) => {
                    if (pid === playerId || !p.alive) return;
                    const dx = p.position.x - player.position.x;
                    const dz = p.position.z - player.position.z;
                    if (dx * dx + dz * dz < 225) { // 15^2
                        p.effects.stunned = now + 2000; // 2s stun
                    }
                });
                break;
        }

        io.to(currentRoom).emit('ability-used', {
            playerId,
            ghostType: player.ghostType,
            position: player.position
        });
    });

    socket.on('player-attack', ({ attackType, direction, targetId }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const attacker = room.players.get(playerId);
        if (!attacker || !attacker.alive) return;

        // Check stun
        if (attacker.effects.stunned && Date.now() < attacker.effects.stunned) return;

        // Broadcast attack animation to room
        io.to(currentRoom).emit('player-attacked', {
            attackerId: playerId,
            attackType,
            direction
        });

        // If a valid target, apply damage
        if (targetId) {
            const target = room.players.get(targetId);
            if (target && target.alive) {
                const damage = attackType === 'special' ? 25 : 10;
                target.health = Math.max(0, target.health - damage);

                io.to(currentRoom).emit('player-damaged', {
                    targetId,
                    damage,
                    health: target.health,
                    attackerId: playerId
                });

                if (target.health <= 0) {
                    target.alive = false;
                    attacker.kills++;

                    if (attacker.userId) db.updateStats(attacker.userId, 1, 0, 0);
                    if (target.userId) db.updateStats(target.userId, 0, 1, 0);

                    io.to(currentRoom).emit('player-died', {
                        id: targetId,
                        killerId: playerId,
                        killerName: attacker.name
                    });

                    // Respawn after delay
                    setTimeout(() => {
                        if (!room.players.has(targetId)) return;
                        const t = room.players.get(targetId);
                        t.health = 100;
                        t.alive = true;
                        t.position = randomSpawnPosition();
                        t.effects = {};

                        io.to(currentRoom).emit('player-respawned', {
                            id: targetId,
                            position: t.position
                        });
                    }, RESPAWN_TIME);
                }
            }
        }
    });

    socket.on('pickup-powerup', ({ powerupId }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(playerId);
        if (!player || !player.alive) return;

        const powerup = room.powerups.get(powerupId);
        if (!powerup) return;

        room.powerups.delete(powerupId);

        // Apply powerup effect
        switch (powerup.tier) {
            case 1:
                player.health = Math.min(100, player.health + 15);
                break;
            case 2:
                player.health = Math.min(100, player.health + 30);
                player.effects.speedBoost = Date.now() + 5000;
                break;
            case 3:
                player.health = 100;
                player.effects.damageBoost = Date.now() + 8000;
                break;
        }

        io.to(currentRoom).emit('powerup-picked', {
            powerupId,
            playerId,
            tier: powerup.tier,
            newHealth: player.health
        });
    });

    // ── Weapon Pickup ──
    socket.on('pickup-weapon', ({ weaponId }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const player = room.players.get(playerId);
        if (!player || !player.alive) return;

        const weapon = room.weapons.get(weaponId);
        if (!weapon) return;

        room.weapons.delete(weaponId);

        io.to(currentRoom).emit('weapon-picked', {
            weaponId,
            playerId,
            weaponType: weapon.weaponType
        });
    });

    // ── Weapon Attack ──
    socket.on('weapon-attack', ({ weaponType, direction, targetId }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const attacker = room.players.get(playerId);
        if (!attacker || !attacker.alive) return;

        // Check stun
        if (attacker.effects.stunned && Date.now() < attacker.effects.stunned) return;

        io.to(currentRoom).emit('player-attacked', {
            attackerId: playerId,
            attackType: 'weapon',
            direction,
            weaponType
        });

        if (targetId) {
            const target = room.players.get(targetId);
            if (target && target.alive) {
                // Get base damage
                let damage = WEAPON_DAMAGE[weaponType] || 10;

                // Check for Shield (Shade)
                if (target.effects && target.effects.shielded && Date.now() < target.effects.shielded) {
                    damage = Math.ceil(damage * 0.5);
                }

                target.health = Math.max(0, target.health - damage);

                io.to(currentRoom).emit('player-damaged', {
                    targetId,
                    damage,
                    health: target.health,
                    attackerId: playerId
                });

                if (target.health <= 0) {
                    target.alive = false;
                    attacker.kills++;

                    io.to(currentRoom).emit('player-died', {
                        id: targetId,
                        killerId: playerId,
                        killerName: attacker.name
                    });

                    setTimeout(() => {
                        if (!room.players.has(targetId)) return;
                        const t = room.players.get(targetId);
                        t.health = 100;
                        t.alive = true;
                        t.position = randomSpawnPosition();
                        t.effects = {};

                        io.to(currentRoom).emit('player-respawned', {
                            id: targetId,
                            position: t.position
                        });
                    }, RESPAWN_TIME);
                }
            }
        }
    });

    // ── Ultimate Attack (AoE wipe — 5 kill streak) ──
    const ULTIMATE_RADIUS = 25;
    socket.on('ultimate-attack', ({ position }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const attacker = room.players.get(playerId);
        if (!attacker || !attacker.alive) return;

        const killed = [];
        const attackerPos = attacker.position;

        room.players.forEach((target, targetId) => {
            if (targetId === playerId || !target.alive) return;
            const dx = target.position.x - attackerPos.x;
            const dz = target.position.z - attackerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= ULTIMATE_RADIUS) {
                target.health = 0;
                target.alive = false;
                attacker.kills++;
                killed.push(targetId);

                if (attacker.userId) db.updateStats(attacker.userId, 1, 0, 0);
                if (target.userId) db.updateStats(target.userId, 0, 1, 0);

                io.to(currentRoom).emit('player-died', {
                    id: targetId,
                    killerId: playerId,
                    killerName: attacker.name,
                    isUltimate: true
                });

                // Respawn after delay
                setTimeout(() => {
                    if (!room.players.has(targetId)) return;
                    const t = room.players.get(targetId);
                    t.health = 100;
                    t.alive = true;
                    t.position = randomSpawnPosition();
                    t.effects = {};

                    io.to(currentRoom).emit('player-respawned', {
                        id: targetId,
                        position: t.position
                    });
                }, RESPAWN_TIME);
            }
        });

        // Broadcast the ultimate effect to all clients for VFX
        io.to(currentRoom).emit('ultimate-used', {
            attackerId: playerId,
            position: attackerPos,
            radius: ULTIMATE_RADIUS,
            killCount: killed.length
        });
    });

    socket.on('disconnect', () => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        room.players.delete(playerId);
        io.to(currentRoom).emit('player-left', { id: playerId });

        if (room.players.size === 0) {
            setTimeout(() => {
                const r = rooms.get(currentRoom);
                if (r && r.players.size === 0) cleanupRoom(currentRoom);
            }, 30000);
        }
    });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`⚔️  Ghost Battles server running on http://localhost:${PORT}`);
});

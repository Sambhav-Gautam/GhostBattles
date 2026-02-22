/* ══════════════════════════════════════════════════════════════
   Combat System — Ghost-direction attacks with visible projectiles
   ══════════════════════════════════════════════════════════════ */

const Combat = (() => {
    const MELEE_RANGE = 4;
    const SPECIAL_RANGE = 12;
    const MELEE_COOLDOWN = 400;    // ms
    const SPECIAL_COOLDOWN = 2500; // ms
    const MELEE_DAMAGE = 10;
    const SPECIAL_DAMAGE = 25;

    let lastMeleeTime = 0;
    let lastSpecialTime = 0;

    // Active projectiles in scene
    const projectiles = [];
    // Active particles
    const particles = [];
    // Active ultimate VFX objects (auto-cleaned)
    const ultimateVFX = [];
    const activeExplosions = [];

    // ── Attack VFX Particles (Pooled) ────────────────────
    const particlePool = [];
    const MAX_PARTICLES = 250;
    // Lazy init geometry to avoid "THREE is not defined" issues if script load order varies
    let particleGeo = null;

    function getParticle(scene) {
        if (!particleGeo) particleGeo = new THREE.TetrahedronGeometry(0.08, 0); // EXTREME OPTIMIZATION: 4 polys instead of 128

        if (particlePool.length > 0) {
            const p = particlePool.pop();
            scene.add(p);
            p.visible = true;
            return p;
        }
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        return new THREE.Mesh(particleGeo, mat);
    }

    // Reusable vectors to reduce GC
    const _pVel = new THREE.Vector3();

    function spawnParticles(scene, position, color, count, spread) {
        for (let i = 0; i < count; i++) {
            const p = getParticle(scene);
            p.material.color.setHex(color);
            p.position.copy(position);

            p.userData.velocity = p.userData.velocity || new THREE.Vector3();
            // Reuse temp vector for calculation
            _pVel.set(
                (Math.random() - 0.5) * spread,
                Math.random() * 0.15 + 0.05,
                (Math.random() - 0.5) * spread
            );
            p.userData.velocity.copy(_pVel);

            p.userData.life = 1;
            p.scale.setScalar(1);
            p.material.opacity = 1;

            if (!particles.includes(p)) particles.push(p);
        }
    }

    function updateParticles(_unused, scene) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.userData.life -= 0.035;
            p.position.add(p.userData.velocity);
            p.material.opacity = Math.max(0, p.userData.life);
            p.scale.setScalar(Math.max(0.01, p.userData.life));

            if (p.userData.life <= 0) {
                scene.remove(p);
                // Return to pool using push
                if (particlePool.length < MAX_PARTICLES) {
                    particlePool.push(p);
                } else {
                    // Overflow cleanup
                    p.geometry.dispose();
                    p.material.dispose();
                }
                particles.splice(i, 1);
            }
        }
    }

    // ── Ultimate AoE VFX (expanding shockwave + pillar + particles) ──
    function spawnUltimateVFX(scene, position, radius) {
        const center = new THREE.Vector3(position.x, 0.1, position.z);

        // 1. Expanding shockwave ring
        const ringGeo = new THREE.RingGeometry(0.5, 1.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(center);
        ring.position.y = 0.5;
        scene.add(ring);

        // 2. Vertical light pillar
        const pillarGeo = new THREE.CylinderGeometry(2, 2, 50, 16, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(center.x, 25, center.z);
        scene.add(pillar);

        // 3. Ground rune circle
        const runeGeo = new THREE.RingGeometry(radius * 0.8, radius * 0.85, 32);
        const runeMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.rotation.x = -Math.PI / 2;
        rune.position.set(center.x, 0.2, center.z);
        scene.add(rune);

        // 4. Massive particle burst (REUSING POOL)
        const colors = [0xff3366, 0xff6b6b, 0xffd700, 0xff00ff, 0xffffff];
        for (let i = 0; i < 80; i++) {
            const angle = (i / 80) * Math.PI * 2;
            const speed = 0.15 + Math.random() * 0.25;

            // Use getParticle from pool
            const p = getParticle(scene);
            p.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);

            p.position.set(
                center.x + Math.cos(angle) * 2,
                1.0 + Math.random() * 2,
                center.z + Math.sin(angle) * 2
            );
            p.userData.velocity = p.userData.velocity || new THREE.Vector3();
            p.userData.velocity.set(
                Math.cos(angle) * speed,
                Math.random() * 0.2,
                Math.sin(angle) * speed
            );
            p.userData.life = 1;
            p.scale.setScalar(1 + Math.random()); // Ult particles vary in size
            p.material.opacity = 1;

            if (!particles.includes(p)) particles.push(p);
        }

        // Animate expansion over 2.5 seconds
        const startTime = Date.now();
        const duration = 2500;

        const vfxEntry = { ring, pillar, rune, startTime, duration, radius, scene };
        ultimateVFX.push(vfxEntry);
    }

    function updateUltimateVFX() {
        for (let i = ultimateVFX.length - 1; i >= 0; i--) {
            const vfx = ultimateVFX[i];
            const elapsed = Date.now() - vfx.startTime;
            const t = Math.min(1, elapsed / vfx.duration);

            // Expand ring
            const ringScale = 1 + t * vfx.radius;
            vfx.ring.scale.set(ringScale, ringScale, 1);
            vfx.ring.material.opacity = 0.9 * (1 - t);

            // Pillar pulsing then fading
            vfx.pillar.material.opacity = 0.3 * (1 - t * t);
            vfx.pillar.scale.x = 1 + Math.sin(t * 20) * 0.2 * (1 - t);
            vfx.pillar.scale.z = vfx.pillar.scale.x;

            // Rune appears then fades
            vfx.rune.material.opacity = t < 0.3 ? t / 0.3 * 0.6 : 0.6 * (1 - (t - 0.3) / 0.7);
            vfx.rune.rotation.z = t * Math.PI;

            if (t >= 1) {
                vfx.scene.remove(vfx.ring);
                vfx.scene.remove(vfx.pillar);
                vfx.scene.remove(vfx.rune);
                vfx.ring.geometry.dispose(); vfx.ring.material.dispose();
                vfx.pillar.geometry.dispose(); vfx.pillar.material.dispose();
                vfx.rune.geometry.dispose(); vfx.rune.material.dispose();
                ultimateVFX.splice(i, 1);
            }
        }

        for (let i = activeExplosions.length - 1; i >= 0; i--) {
            const vfx = activeExplosions[i];
            const elapsed = Date.now() - vfx.startTime;
            const t = Math.min(1, elapsed / vfx.duration);

            const ringScale = 1 + t * 5;
            vfx.ring.scale.set(ringScale, ringScale, 1);
            vfx.ring.material.opacity = 0.9 * (1 - t);

            vfx.pillar.material.opacity = 0.4 * (1 - t);
            vfx.pillar.scale.x = 1 + t * 2;
            vfx.pillar.scale.z = vfx.pillar.scale.x;

            if (t >= 1) {
                vfx.scene.remove(vfx.ring);
                vfx.scene.remove(vfx.pillar);
                vfx.ring.geometry.dispose(); vfx.ring.material.dispose();
                vfx.pillar.geometry.dispose(); vfx.pillar.material.dispose();
                activeExplosions.splice(i, 1);
            }
        }
    }

    function spawnDeathExplosion(scene, position, color) {
        const center = new THREE.Vector3(position.x, 0.5, position.z);

        const ringGeo = new THREE.RingGeometry(0.2, 0.6, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.9,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(center);
        scene.add(ring);

        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 12, 8, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(center.x, 6, center.z);
        scene.add(pillar);

        spawnParticles(scene, center, color, 45, 1.2);

        activeExplosions.push({ ring, pillar, startTime: Date.now(), duration: 600, scene });
    }

    // Reuse geometries for Projectiles
    // Lazy init to avoid THREE errors
    let projOrbGeo = null;
    let projGlowGeo = null;

    function fireProjectile(scene, startPos, direction, color, attackType, socket, targetId) {
        if (!projOrbGeo) projOrbGeo = new THREE.TetrahedronGeometry(1, 0); // EXTREME OPTIMIZATION: 4 polys
        if (!projGlowGeo) projGlowGeo = new THREE.TetrahedronGeometry(1, 0); // EXTREME OPTIMIZATION: 4 polys

        const speed = attackType === 'special' ? 30 : 22;
        const size = attackType === 'special' ? 0.35 : 0.2;
        const lifetime = attackType === 'special' ? 1.5 : 0.8;

        // Main orb
        const orbMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });
        const orb = new THREE.Mesh(projOrbGeo, orbMat);
        orb.scale.setScalar(size);
        orb.position.copy(startPos);

        // Outer glow
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const glow = new THREE.Mesh(projGlowGeo, glowMat);
        glow.scale.setScalar(2.5); // relative to parent
        orb.add(glow);

        // Trail light
        const light = new THREE.PointLight(color, 1.5, 8);
        orb.add(light);

        scene.add(orb);

        projectiles.push({
            mesh: orb,
            velocity: direction.clone().normalize().multiplyScalar(speed),
            life: lifetime,
            maxLife: lifetime,
            color: color,
            attackType: attackType,
            scene: scene,
        });
    }

    function updateProjectiles(scene, delta) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.life -= delta;

            // Move
            proj.mesh.position.add(
                proj.velocity.clone().multiplyScalar(delta)
            );

            // Fade out — handle both Mesh and Group projectiles
            const lifePct = proj.life / proj.maxLife;
            proj.mesh.scale.setScalar(0.5 + lifePct * 0.5);
            proj.mesh.traverse(child => {
                if (child.isMesh && child.material && child.material.opacity !== undefined) {
                    child.material.opacity = child.material.opacity * lifePct;
                }
            });

            // Emit trail particles - frequent for smooth trail
            if (Math.random() < 0.8) {
                spawnParticles(scene, proj.mesh.position.clone(), proj.color, 1, 0.02);
            }

            if (proj.life <= 0) {
                // Explode on expiry
                spawnParticles(scene, proj.mesh.position.clone(), proj.color, 8, 0.3);
                scene.remove(proj.mesh);
                // Safe cleanup for both Mesh and Group
                proj.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                projectiles.splice(i, 1);
            }
        }
    }

    // ── Ghost-facing direction ──
    function getGhostForward(ghost) {
        // Ghost rotation.y = atan2(vx, vz) → forward = (sin(y), 0, cos(y))
        const y = ghost.rotation.y;
        return new THREE.Vector3(Math.sin(y), 0, Math.cos(y));
    }

    // ── Hit Detection (distance + cone in front of ghost) ──
    function findTarget(localPlayer, remotePlayers, attackRange) {
        if (!localPlayer) return null;

        const forward = getGhostForward(localPlayer);
        let closest = null;
        let closestDist = attackRange;

        remotePlayers.forEach((data, id) => {
            if (!data.mesh || !data.alive) return;
            const dist = localPlayer.position.distanceTo(data.mesh.position);
            if (dist < closestDist) {
                // Check if roughly in front of ghost (within ~120° cone)
                const toTarget = new THREE.Vector3()
                    .subVectors(data.mesh.position, localPlayer.position);
                toTarget.y = 0;
                toTarget.normalize();

                const dot = forward.dot(toTarget);
                if (dot > -0.1) { // wide ~120° cone — much more forgiving
                    closest = id;
                    closestDist = dist;
                }
            }
        });

        return closest;
    }

    // Get direction toward a specific target (auto-aim assist)
    function getAimDirection(localPlayer, remotePlayers, targetId) {
        if (!targetId) return null;
        const remote = remotePlayers.get(targetId);
        if (!remote || !remote.mesh) return null;
        const dir = new THREE.Vector3()
            .subVectors(remote.mesh.position, localPlayer.position);
        dir.y = 0;
        dir.normalize();
        return dir;
    }

    // ── Melee Attack (close range burst) ──
    function meleeAttack(localPlayer, remotePlayers, camera, socket, scene) {
        const now = Date.now();
        if (now - lastMeleeTime < MELEE_COOLDOWN) return false;
        lastMeleeTime = now;

        const forward = getGhostForward(localPlayer);
        const targetId = findTarget(localPlayer, remotePlayers, MELEE_RANGE);
        // Auto-aim: if target found, aim at them
        const aimDir = getAimDirection(localPlayer, remotePlayers, targetId) || forward;

        socket.emit('player-attack', {
            attackType: 'melee',
            direction: { x: aimDir.x, y: aimDir.y, z: aimDir.z },
            targetId: targetId
        });

        // Local: burst particles + small projectile orb
        const config = localPlayer.userData.config || { emissive: 0xa855f7 };
        const color = config.emissive || 0xa855f7;
        const attackPos = localPlayer.position.clone().add(aimDir.clone().multiplyScalar(1.2));
        attackPos.y += 1.0;

        spawnParticles(scene, attackPos, color, 12, 0.25);
        fireProjectile(scene, attackPos, aimDir, color, 'melee');

        return true;
    }

    // ── Special Attack (larger + longer range projectile) ──
    function specialAttack(localPlayer, remotePlayers, camera, socket, scene) {
        const now = Date.now();
        if (now - lastSpecialTime < SPECIAL_COOLDOWN) return false;
        lastSpecialTime = now;

        const forward = getGhostForward(localPlayer);
        const targetId = findTarget(localPlayer, remotePlayers, SPECIAL_RANGE);
        const aimDir = getAimDirection(localPlayer, remotePlayers, targetId) || forward;

        socket.emit('player-attack', {
            attackType: 'special',
            direction: { x: aimDir.x, y: aimDir.y, z: aimDir.z },
            targetId: targetId
        });

        // Local: big burst + large projectile
        const config = localPlayer.userData.config || { emissive: 0xa855f7 };
        const color = config.emissive || 0xa855f7;
        const attackPos = localPlayer.position.clone().add(aimDir.clone().multiplyScalar(1.5));
        attackPos.y += 1.0;

        spawnParticles(scene, attackPos, color, 24, 0.4);
        fireProjectile(scene, attackPos, aimDir, color, 'special');

        return true;
    }

    function getMeleeCooldownPercent() {
        const elapsed = Date.now() - lastMeleeTime;
        return Math.min(1, elapsed / MELEE_COOLDOWN);
    }

    function getSpecialCooldownPercent() {
        const elapsed = Date.now() - lastSpecialTime;
        return Math.min(1, elapsed / SPECIAL_COOLDOWN);
    }

    // ── Weapon Attack (uses equipped exorcist weapon) ──
    let lastWeaponTime = 0;
    function weaponAttack(localPlayer, remotePlayers, socket, scene, weaponType) {
        if (!Weapons || !Weapons.WEAPON_CONFIGS[weaponType]) return false;
        const config = Weapons.WEAPON_CONFIGS[weaponType];

        const now = Date.now();
        if (now - lastWeaponTime < config.cooldown) return false;
        lastWeaponTime = now;

        const forward = getGhostForward(localPlayer);
        const targetId = findTarget(localPlayer, remotePlayers, config.range);
        const aimDir = getAimDirection(localPlayer, remotePlayers, targetId) || forward;

        socket.emit('weapon-attack', {
            weaponType: weaponType,
            direction: { x: aimDir.x, y: aimDir.y, z: aimDir.z },
            targetId: targetId
        });

        // Local VFX
        const attackPos = localPlayer.position.clone().add(aimDir.clone().multiplyScalar(1.5));
        attackPos.y += 1.0;

        spawnParticles(scene, attackPos, config.projColor, 16, 0.35);
        Weapons.fireProjectile(scene, attackPos, aimDir, weaponType, projectiles);

        return true;
    }

    return {
        meleeAttack,
        specialAttack,
        weaponAttack,
        spawnParticles,
        spawnUltimateVFX,
        spawnDeathExplosion,
        fireProjectile,
        updateParticles,
        updateProjectiles,
        updateUltimateVFX,
        getGhostForward,
        getAimDirection,
        findTarget,
        getMeleeCooldownPercent,
        getSpecialCooldownPercent,
        MELEE_RANGE,
        SPECIAL_RANGE
    };
})();

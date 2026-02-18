/* ══════════════════════════════════════════════════════════════
   Clock Powerups — 3D procedural clock models
   ══════════════════════════════════════════════════════════════ */

const Powerups = (() => {
    const TIER_CONFIG = {
        1: {
            color: 0xffffff,
            emissive: 0xaaaaaa,
            glowColor: 0xffffff,
            hourAngle: Math.PI,       // 6 o'clock
            minuteAngle: 0,           // 12 o'clock (minute at top)
            label: '+15 HP',
            particleCount: 0
        },
        2: {
            color: 0xffd700,
            emissive: 0xdaa520,
            glowColor: 0xffd700,
            hourAngle: Math.PI * 0.05, // near 12
            minuteAngle: 0,            // 12 o'clock (both near top)
            label: '+30 HP + Speed',
            particleCount: 8
        },
        3: {
            color: 0xff4500,
            emissive: 0xff6347,
            glowColor: 0xff4500,
            hourAngle: 0,              // 12 o'clock
            minuteAngle: 0,            // 12 o'clock (all up)
            label: 'Full Heal + Power',
            particleCount: 16
        }
    };

    // ── Caching ──
    const clockCache = {};

    function createClock(tier) {
        // If cached, return a clone
        if (clockCache[tier]) {
            const clone = clockCache[tier].clone();
            clone.userData.tier = tier;
            clone.userData.config = TIER_CONFIG[tier];
            // Three.js clone works recursively, but we must ensure
            // the userData on children is correct if we relied on it.
            // Fortunately, .clone() copies userData on objects too.
            return clone;
        }

        const config = TIER_CONFIG[tier] || TIER_CONFIG[1];
        const group = new THREE.Group();
        group.userData.tier = tier;
        group.userData.config = config;

        // Clock face ring
        const ringGeo = new THREE.TorusGeometry(0.45, 0.06, 4, 12);
        const ringMat = new THREE.MeshPhongMaterial({
            color: config.color,
            emissive: config.emissive,
            emissiveIntensity: 0.5,
            shininess: 80
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);

        // Clock face backing
        const faceGeo = new THREE.CircleGeometry(0.44, 12);
        const faceMat = new THREE.MeshPhongMaterial({
            color: 0x0a0a1a,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.z = 0.01;
        group.add(face);

        // Hour markers (12 small dots)
        for (let i = 0; i < 12; i++) {
            const markerAngle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const dotGeo = new THREE.SphereGeometry(0.02, 6, 6);
            const dotMat = new THREE.MeshBasicMaterial({ color: config.color });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(
                Math.cos(markerAngle) * 0.36,
                Math.sin(markerAngle) * 0.36,
                0.03
            );
            group.add(dot);
        }

        // Center pivot
        const pivotGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const pivotMat = new THREE.MeshBasicMaterial({ color: config.color });
        const pivot = new THREE.Mesh(pivotGeo, pivotMat);
        pivot.position.z = 0.05;
        group.add(pivot);

        // Hour hand
        const hourGeo = new THREE.BoxGeometry(0.04, 0.2, 0.02);
        const hourMat = new THREE.MeshBasicMaterial({ color: config.color });
        const hourHand = new THREE.Mesh(hourGeo, hourMat);
        hourHand.geometry.translate(0, 0.1, 0);
        hourHand.position.z = 0.04;
        hourHand.rotation.z = -config.hourAngle;
        group.add(hourHand);

        // Minute hand (longer, thinner)
        const minGeo = new THREE.BoxGeometry(0.025, 0.3, 0.02);
        const minMat = new THREE.MeshBasicMaterial({ color: config.color });
        const minHand = new THREE.Mesh(minGeo, minMat);
        minHand.geometry.translate(0, 0.15, 0);
        minHand.position.z = 0.06;
        minHand.rotation.z = -config.minuteAngle;
        group.add(minHand);

        // Outer glow sphere (more prominent for higher tiers)
        if (tier >= 2) {
            const glowGeo = new THREE.SphereGeometry(0.65, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: config.glowColor,
                transparent: true,
                opacity: 0.08 * tier,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.userData.isGlow = true;
            group.add(glow);
        }

        // Particle ring for tier 3
        if (tier === 3) {
            const particlePositions = new Float32Array(config.particleCount * 3);
            for (let i = 0; i < config.particleCount; i++) {
                const a = (i / config.particleCount) * Math.PI * 2;
                particlePositions[i * 3] = Math.cos(a) * 0.7;
                particlePositions[i * 3 + 1] = Math.sin(a) * 0.7;
                particlePositions[i * 3 + 2] = 0;
            }
            const pGeo = new THREE.BufferGeometry();
            pGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            const pMat = new THREE.PointsMaterial({
                color: config.glowColor,
                size: 0.08,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const particleRing = new THREE.Points(pGeo, pMat);
            particleRing.userData.isParticleRing = true;
            group.add(particleRing);
        }

        // Point light for visibility
        const pLight = new THREE.PointLight(config.glowColor, 0.6, 6);
        pLight.position.z = 0.2;
        group.add(pLight);

        // Cache and clone
        clockCache[tier] = group;
        const clone = group.clone();
        clone.userData.tier = tier;
        clone.userData.config = TIER_CONFIG[tier];
        return clone;
    }

    function animate(powerupGroup, time) {
        // Slow rotation
        powerupGroup.rotation.y = time * 0.8;

        // Bob up and down
        powerupGroup.position.y = powerupGroup.userData.baseY + Math.sin(time * 2) * 0.2;

        // Animate glow pulse
        powerupGroup.children.forEach(child => {
            if (child.userData.isGlow) {
                child.material.opacity = 0.08 * powerupGroup.userData.tier + Math.sin(time * 3) * 0.04;
                child.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
            }
            if (child.userData.isParticleRing) {
                child.rotation.z = time * 1.5;
            }
        });
    }

    return { createClock, animate, TIER_CONFIG };
})();

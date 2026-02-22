/* ══════════════════════════════════════════════════════════════
   Ghost Characters — Procedural 3D Models (Three.js)
   All original designs — no external assets
   ══════════════════════════════════════════════════════════════ */

const GhostFactory = (() => {
    const GHOST_CONFIGS = {
        wraith: {
            bodyColor: 0x6b21a8,
            emissive: 0xa855f7,
            eyeColor: 0xfbbf24,
            opacity: 0.82,
            name: 'Wraith'
        },
        phantom: {
            bodyColor: 0x0ea5e9,
            emissive: 0x38bdf8,
            eyeColor: 0xe0f2fe,
            opacity: 0.65,
            name: 'Phantom'
        },
        shade: {
            bodyColor: 0xb91c1c,
            emissive: 0xdc2626,
            eyeColor: 0xfbbf24,
            opacity: 0.85,
            name: 'Shade'
        },
        specter: {
            bodyColor: 0x16a34a,
            emissive: 0x4ade80,
            eyeColor: 0xffffff,
            opacity: 0.55,
            name: 'Specter'
        }
    };

    // Texture Cache
    const textureCache = {};

    function generateGhostTexture(type, color, emissive) {
        if (textureCache[type]) return textureCache[type];

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base Gradient
        const grd = ctx.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, '#' + emissive.toString(16).padStart(6, '0'));
        grd.addColorStop(0.5, '#' + color.toString(16).padStart(6, '0'));
        grd.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 256, 256);

        // Noise / Pattern
        if (type === 'phantom') {
            // Digital Glitch
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for (let i = 0; i < 50; i++) {
                ctx.fillRect(Math.random() * 256, Math.random() * 256, 20, 2);
            }
        } else if (type === 'specter') {
            // Starry
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 40; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        textureCache[type] = tex;
        return tex;
    }

    // ── Geometry & Material Cache ──
    const geoCache = {};
    const matCache = {};

    function getCachedGeo(key, creatorFn) {
        if (!geoCache[key]) geoCache[key] = creatorFn();
        return geoCache[key];
    }

    function createGhostBody(config) {
        const group = new THREE.Group();

        // Main body — Ragged "Robe" Shape (Procedural Noise)
        const bodyGeo = getCachedGeo('ghostBody', () => {
            // Base cylinder/cone for the robe
            const geo = new THREE.CylinderGeometry(0.1, 0.6, 1.4, 8, 4, true); // EXTREME OPTIMIZATION: 16x8 -> 8x4
            const pos = geo.attributes.position;
            const vertex = new THREE.Vector3();

            // Apply noise to vertices to make it ragged
            for (let i = 0; i < pos.count; i++) {
                vertex.fromBufferAttribute(pos, i);

                // Expansion at bottom (skirt)
                const yNorm = (vertex.y + 0.7) / 1.4; // 0 at bottom, 1 at top

                // Wobble
                const angle = Math.atan2(vertex.z, vertex.x);
                const r = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);

                // Noise function simulation (sin/cos stack)
                const noise = Math.sin(angle * 3 + vertex.y * 4) * 0.1
                    + Math.cos(angle * 5 - vertex.y * 2) * 0.05
                    + Math.sin(vertex.y * 10) * 0.02;

                // Apply raggedness mostly to bottom
                const raggedness = (1 - yNorm) * 0.3;
                vertex.x += Math.cos(angle) * noise * raggedness;
                vertex.z += Math.sin(angle) * noise * raggedness;

                // Flatten top/round head area
                if (yNorm > 0.8) {
                    // Spherize the top
                    const headFactor = (yNorm - 0.8) * 5; // 0 to 1
                    vertex.x *= (1 - headFactor * 0.2);
                    vertex.z *= (1 - headFactor * 0.2);
                    // vertex.y += headFactor * 0.2; // domes the top
                }

                pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
            }

            geo.computeVertexNormals();
            return geo;
        });

        const texture = generateGhostTexture(config.name.toLowerCase(), config.bodyColor, config.emissive);

        // Material caching (keyed by type)
        const matKey = `body_${config.name}`;
        if (!matCache[matKey]) {
            matCache[matKey] = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                map: texture,
                emissive: config.emissive,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: config.opacity,
                side: THREE.DoubleSide,
                shininess: 30
            });
        }

        const body = new THREE.Mesh(bodyGeo, matCache[matKey]);
        body.position.y = 0.5;
        group.add(body);

        // Eyes (Low Poly)
        const eyeGeo = getCachedGeo('ghostEye', () => new THREE.TetrahedronGeometry(0.08, 0)); // EXTREME OPTIMIZATION
        const eyeMat = new THREE.MeshBasicMaterial({ color: config.eyeColor }); // simple enough to not cache or reuse if needed, but safer to new
        // Actually, we can reuse eye material if color matches, but configs are static. 
        // Let's just keep new for eyes as they are small, or cache by color integer.

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.45, 0.35);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 0.45, 0.35);
        group.add(rightEye);

        // Eye glow
        const glowGeo = getCachedGeo('eyeGlow', () => new THREE.TetrahedronGeometry(0.14, 0)); // EXTREME OPTIMIZATION
        const glowMat = new THREE.MeshBasicMaterial({
            color: config.eyeColor,
            transparent: true,
            opacity: 0.25
        });
        const leftGlow = new THREE.Mesh(glowGeo, glowMat);
        leftGlow.position.copy(leftEye.position);
        group.add(leftGlow);

        const rightGlow = new THREE.Mesh(glowGeo, glowMat);
        rightGlow.position.copy(rightEye.position);
        group.add(rightGlow);

        return group;
    }

    function addWraithTendrils(group, config) {
        // Flowing cloak tendrils hanging from body
        const tendrilGeo = getCachedGeo('wraithTendril', () => new THREE.CylinderGeometry(0.04, 0.01, 0.8, 3)); // EXTREME OPTIMIZATION: 4 -> 3
        // Material reuse?
        // Since alpha/color depends on config, and config is static per type, we can cache material by type name.
        const matKey = `tendril_${config.name}`;
        if (!matCache[matKey]) {
            matCache[matKey] = new THREE.MeshPhongMaterial({
                color: config.bodyColor,
                emissive: config.emissive,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: config.opacity * 0.6
            });
        }

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const tendril = new THREE.Mesh(tendrilGeo, matCache[matKey]);
            tendril.position.set(
                Math.cos(angle) * 0.5,
                -0.3,
                Math.sin(angle) * 0.5
            );
            tendril.rotation.z = Math.cos(angle) * 0.3;
            tendril.rotation.x = Math.sin(angle) * 0.3;
            tendril.userData.tendrilPhase = i * 1.2;
            group.add(tendril);
        }
    }

    function addPhantomWisps(group, config) {
        // Wispy arm extensions
        const armGeo = getCachedGeo('phantomArm', () => new THREE.CylinderGeometry(0.08, 0.02, 0.9, 3)); // EXTREME OPTIMIZATION: 4 -> 3
        const matKey = `wisp_${config.name}`;
        if (!matCache[matKey]) {
            matCache[matKey] = new THREE.MeshPhongMaterial({
                color: config.bodyColor,
                emissive: config.emissive,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: config.opacity * 0.5
            });
        }

        for (let side = -1; side <= 1; side += 2) {
            const arm = new THREE.Mesh(armGeo, matCache[matKey]);
            arm.position.set(side * 0.65, 0.4, 0.1);
            arm.rotation.z = side * 1.2;
            arm.userData.armSide = side;
            group.add(arm);
        }
    }

    function addShadeSpikes(group, config) {
        // Angular spikes on body
        const spikeGeo = getCachedGeo('shadeSpike', () => new THREE.ConeGeometry(0.06, 0.4, 3)); // EXTREME OPTIMIZATION: 4 -> 3
        const matKey = `spike_${config.name}`;
        if (!matCache[matKey]) {
            matCache[matKey] = new THREE.MeshPhongMaterial({
                color: 0x1a1a1a,
                emissive: config.emissive,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
        }

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const spike = new THREE.Mesh(spikeGeo, matCache[matKey]);
            spike.position.set(
                Math.cos(angle) * 0.65,
                0.6 + Math.random() * 0.4,
                Math.sin(angle) * 0.65
            );
            spike.rotation.z = Math.cos(angle) * 0.5;
            spike.rotation.x = Math.sin(angle) * 0.5;
            group.add(spike);
        }
    }

    function addSpecterSheetEdges(group, config) {
        // Flowing sheet edges
        const edgeGeo = getCachedGeo('specterEdge', () => new THREE.RingGeometry(0.6, 0.9, 8, 1)); // EXTREME OPTIMIZATION: 12 -> 8
        const matKey = `edge_${config.name}`;
        if (!matCache[matKey]) {
            matCache[matKey] = new THREE.MeshPhongMaterial({
                color: config.bodyColor,
                emissive: config.emissive,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: config.opacity * 0.4,
                side: THREE.DoubleSide
            });
        }

        const edge = new THREE.Mesh(edgeGeo, matCache[matKey]);
        edge.position.y = -0.1;
        edge.rotation.x = Math.PI / 2;
        group.add(edge);
    }

    // ── Name tag (floating text sprite) ──────────
    function createNameTag(name, config) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 256, 64);

        ctx.font = '600 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeText(name, 128, 40);
        ctx.fillText(name, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.8, 0.45, 1);
        sprite.position.y = 2.0;
        return sprite;
    }

    // ── Health bar (3D, floating above ghost) ────
    function createHealthBar() {
        const group = new THREE.Group();

        // Background
        const bgGeo = new THREE.PlaneGeometry(1.2, 0.12);
        const bgMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        group.add(bg);

        // Fill
        const fillGeo = new THREE.PlaneGeometry(1.16, 0.08);
        const fillMat = new THREE.MeshBasicMaterial({
            color: 0x4ade80,
            side: THREE.DoubleSide
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.position.z = 0.01;
        fill.name = 'healthFill';
        group.add(fill);

        group.position.y = 1.7;
        group.name = 'healthBar';

        return group;
    }

    // ── Public API ───────────────────────────────
    function create(type, name) {
        const config = GHOST_CONFIGS[type] || GHOST_CONFIGS.wraith;
        const ghost = new THREE.Group();
        ghost.userData.ghostType = type;
        ghost.userData.config = config;

        // Build body
        const body = createGhostBody(config);
        ghost.add(body);

        // Type-specific features
        switch (type) {
            case 'wraith':
                addWraithTendrils(ghost, config);
                break;
            case 'phantom':
                addPhantomWisps(ghost, config);
                break;
            case 'shade':
                addShadeSpikes(ghost, config);
                break;
            case 'specter':
                addSpecterSheetEdges(ghost, config);
                break;
        }

        // Name tag
        if (name) {
            const tag = createNameTag(name, config);
            tag.position.y = 1.3; // Lower tag
            ghost.add(tag);
        }

        // Health bar
        const hpBar = createHealthBar();
        hpBar.position.y = 1.1; // Lower bar
        ghost.add(hpBar);

        // Shadow (Disabled for extreme optimization, but flag kept if shadows re-enabled later)
        ghost.castShadow = false;

        return ghost;
    }

    function animate(ghost, time, animState) {
        // NOTE: body bobbing is handled in game.js via child[0].position.y
        // Do NOT modify ghost.position.y here — it corrupts the world position

        // Subtle rotation wobble on body group
        if (ghost.children[0]) {
            ghost.children[0].rotation.z = Math.sin(time * 0.8) * 0.04;
            ghost.children[0].rotation.x = Math.cos(time * 0.6) * 0.025;
        }

        // Tendril / arm animation for specific types
        ghost.children.forEach(child => {
            if (child.userData.tendrilPhase !== undefined) {
                child.rotation.x = Math.sin(time * 2 + child.userData.tendrilPhase) * 0.25;
                child.rotation.z = Math.cos(time * 1.5 + child.userData.tendrilPhase) * 0.15;
            }
            if (child.userData.armSide !== undefined) {
                child.rotation.z = child.userData.armSide * (1.2 + Math.sin(time * 1.8) * 0.25);
            }
        });

        // Attack animation
        if (animState === 'attacking') {
            ghost.scale.setScalar(1 + Math.sin(time * 15) * 0.08);
        } else {
            const s = ghost.scale.x;
            if (Math.abs(s - 1) > 0.01) {
                ghost.scale.setScalar(s + (1 - s) * 0.1);
            }
        }

        // Make health bar face camera (billboard)
        const hpBar = ghost.getObjectByName('healthBar');
        if (hpBar && window._mainCamera) {
            hpBar.lookAt(window._mainCamera.position);
        }
    }

    function updateHealthBar(ghost, healthPercent) {
        const fill = ghost.getObjectByName('healthFill');
        if (!fill) return;

        fill.scale.x = Math.max(0, healthPercent / 100);
        fill.position.x = -(1.16 * (1 - healthPercent / 100)) / 2;

        if (healthPercent > 50) {
            fill.material.color.setHex(0x4ade80);
        } else if (healthPercent > 25) {
            fill.material.color.setHex(0xfbbf24);
        } else {
            fill.material.color.setHex(0xef4444);
        }
    }

    function setOpacity(ghost, opacity) {
        if (!ghost) return;
        ghost.traverse((child) => {
            if (child.isMesh && child.material && child.name !== 'healthFill' && child.name !== 'healthBg') {
                if (opacity < 1.0) {
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                } else {
                    // Reset to default
                    const defOp = ghost.userData.config ? ghost.userData.config.opacity : 1.0;
                    child.material.opacity = defOp;
                    if (defOp === 1.0) child.material.transparent = false;
                }
            }
        });
    }

    return { create, animate, updateHealthBar, setOpacity, GHOST_CONFIGS };
})();

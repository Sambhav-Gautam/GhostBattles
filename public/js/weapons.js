/* ══════════════════════════════════════════════════════════════
   Exorcist Weapons — Ghost Battles
   Handcrafted 3D pickup models + unique projectile VFX per weapon
   All geometry created from scratch with Three.js primitives
   ══════════════════════════════════════════════════════════════ */

const Weapons = (() => {

    // ── Weapon Configurations ──
    const WEAPON_CONFIGS = {
        holyWater: {
            name: 'Holy Water',
            icon: 'HOLY_WATER',
            damage: 20,
            cooldown: 500,
            range: 6,
            ammo: 5,
            projColor: 0x60a5fa,
            projSpeed: 25,
            projSize: 0.25,
            description: 'Quick splash, low damage'
        },
        sacredCross: {
            name: 'Sacred Cross',
            icon: 'SACRED_CROSS',
            damage: 35,
            cooldown: 1000,
            range: 8,
            ammo: 4,
            projColor: 0xffd700,
            projSpeed: 30,
            projSize: 0.3,
            description: 'Beam of holy light'
        },
        silverDagger: {
            name: 'Silver Dagger',
            icon: 'SILVER_DAGGER',
            damage: 50,
            cooldown: 1200,
            range: 5,
            ammo: 3,
            projColor: 0xc0c0c0,
            projSpeed: 35,
            projSize: 0.2,
            description: 'Close range, high damage'
        },
        bindingChains: {
            name: 'Binding Chains',
            icon: 'BINDING_CHAINS',
            damage: 40,
            cooldown: 1500,
            range: 10,
            ammo: 3,
            projColor: 0xa78bfa,
            projSpeed: 20,
            projSize: 0.35,
            description: 'Long range chain whip'
        },
        sageSmudge: {
            name: 'Sage Smudge',
            icon: 'SAGE_SMUDGE',
            damage: 60,
            cooldown: 2000,
            range: 7,
            ammo: 2,
            projColor: 0x4ade80,
            projSpeed: 18,
            projSize: 0.5,
            description: 'Purifying smoke burst'
        },
        exorcistBible: {
            name: "Exorcist's Bible",
            icon: 'EXORCIST_BIBLE',
            damage: 100,
            cooldown: 4000,
            range: 8,
            ammo: 1,
            projColor: 0xffffff,
            projSpeed: 22,
            projSize: 0.6,
            description: 'Instant exorcism — one shot kill'
        }
    };

    const WEAPON_TYPES = Object.keys(WEAPON_CONFIGS);

    // ══════════════════════════════════════════════════
    //  PICKUP MODELS — Unique 3D shape per weapon
    // ══════════════════════════════════════════════════

    // Helper: additive glow material
    function glowMat(color, opacity) {
        return new THREE.MeshBasicMaterial({
            color, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
    }

    function stdMat(color, emissive, emissiveI) {
        return new THREE.MeshStandardMaterial({
            color,
            emissive: emissive || color,
            emissiveIntensity: emissiveI || 0.4,
            roughness: 0.3,
            metalness: 0.6,
        });
    }

    // ── Holy Water: Flask / vial shape ──
    function createHolyWaterPickup(config) {
        const g = new THREE.Group();

        // Vial body (elongated sphere)
        const bodyGeo = new THREE.SphereGeometry(0.28, 4, 4); // EXTREME OPTIMIZATION: 6 -> 4
        bodyGeo.scale(1, 1.6, 1);
        const body = new THREE.Mesh(bodyGeo, stdMat(0x1a3a5c, 0x60a5fa, 0.6));
        body.position.y = 0.8;
        g.add(body);

        // Liquid inside (slightly smaller, blue glow)
        const liquidGeo = new THREE.SphereGeometry(0.22, 4, 4); // EXTREME OPTIMIZATION: 6 -> 4
        liquidGeo.scale(1, 1.2, 1);
        const liquid = new THREE.Mesh(liquidGeo, glowMat(0x60a5fa, 0.7));
        liquid.position.y = 0.75;
        liquid.userData.isLiquid = true;
        g.add(liquid);

        // Cork / stopper
        const corkGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 6);
        const cork = new THREE.Mesh(corkGeo, stdMat(0x8b6914, 0x8b6914, 0.1));
        cork.position.y = 1.25;
        g.add(cork);

        // Droplets orbiting
        for (let i = 0; i < 4; i++) {
            const dropGeo = new THREE.TetrahedronGeometry(0.06, 0); // EXTREME OPTIMIZATION
            const drop = new THREE.Mesh(dropGeo, glowMat(0x93c5fd, 0.6));
            drop.userData.orbitPhase = (i / 4) * Math.PI * 2;
            drop.userData.orbitRadius = 0.5;
            drop.userData.isDrop = true;
            g.add(drop);
        }

        return g;
    }

    // ── Sacred Cross: Glowing cross structure ──
    function createSacredCrossPickup(config) {
        const g = new THREE.Group();
        const mat = stdMat(0xdaa520, 0xffd700, 0.8);

        // Vertical beam
        const vGeo = new THREE.BoxGeometry(0.12, 0.75, 0.12);
        const vBeam = new THREE.Mesh(vGeo, mat);
        vBeam.position.y = 0.9;
        g.add(vBeam);

        // Horizontal beam
        const hGeo = new THREE.BoxGeometry(0.5, 0.1, 0.1);
        const hBeam = new THREE.Mesh(hGeo, mat);
        hBeam.position.y = 1.1;
        g.add(hBeam);

        // Center gem
        const gemGeo = new THREE.OctahedronGeometry(0.08, 0);
        const gem = new THREE.Mesh(gemGeo, glowMat(0xffffff, 0.9));
        gem.position.y = 1.1;
        g.add(gem);

        // Holy aura rings
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.25 + i * 0.12, 0.015, 4, 12); // EXTREME OPTIMIZATION
            const ring = new THREE.Mesh(ringGeo, glowMat(0xffd700, 0.25 - i * 0.06));
            ring.position.y = 0.9;
            ring.userData.haloRing = true;
            ring.userData.ringIndex = i;
            g.add(ring);
        }

        // Light rays (thin stretched diamonds)
        for (let i = 0; i < 6; i++) {
            const rayGeo = new THREE.ConeGeometry(0.02, 0.5, 4);
            const ray = new THREE.Mesh(rayGeo, glowMat(0xffd700, 0.2));
            const angle = (i / 6) * Math.PI * 2;
            ray.position.set(Math.cos(angle) * 0.45, 1.1, Math.sin(angle) * 0.45);
            ray.rotation.z = -angle + Math.PI / 2;
            ray.userData.isRay = true;
            g.add(ray);
        }

        return g;
    }

    // ── Silver Dagger: Blade + handle ──
    function createSilverDaggerPickup(config) {
        const g = new THREE.Group();

        // Blade (elongated tetrahedron shape using a stretched cone)
        const bladeGeo = new THREE.ConeGeometry(0.08, 0.7, 4);
        const bladeMat = stdMat(0xe0e0e0, 0xc0c0c0, 0.5);
        bladeMat.metalness = 0.9;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 1.1;
        blade.rotation.z = Math.PI; // point up
        g.add(blade);

        // Guard (flat disc)
        const guardGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 6);
        const guard = new THREE.Mesh(guardGeo, stdMat(0x888888, 0xaaaaaa, 0.3));
        guard.position.y = 0.75;
        g.add(guard);

        // Handle (cylinder)
        const handleGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6);
        const handle = new THREE.Mesh(handleGeo, stdMat(0x3d2817, 0x3d2817, 0.1));
        handle.position.y = 0.58;
        g.add(handle);

        // Pommel gem
        const pommelGeo = new THREE.SphereGeometry(0.06, 4, 4); // EXTREME OPTIMIZATION
        const pommel = new THREE.Mesh(pommelGeo, glowMat(0xc0c0c0, 0.8));
        pommel.position.y = 0.42;
        g.add(pommel);

        // Metallic gleam particles
        for (let i = 0; i < 5; i++) {
            const sparkGeo = new THREE.SphereGeometry(0.025, 4, 4);
            const spark = new THREE.Mesh(sparkGeo, glowMat(0xffffff, 0.6));
            spark.userData.sparkPhase = (i / 5) * Math.PI * 2;
            spark.userData.isSpark = true;
            g.add(spark);
        }

        return g;
    }

    // ── Binding Chains: Interlocking chain links ──
    function createBindingChainsPickup(config) {
        const g = new THREE.Group();

        // Chain links (torus shapes stacked)
        for (let i = 0; i < 5; i++) {
            const linkGeo = new THREE.TorusGeometry(0.12, 0.035, 4, 6); // EXTREME OPTIMIZATION
            const linkMat = stdMat(0x7c3aed, 0xa78bfa, 0.5);
            linkMat.metalness = 0.8;
            const link = new THREE.Mesh(linkGeo, linkMat);
            link.position.y = 0.6 + i * 0.15;
            link.rotation.x = i % 2 === 0 ? 0 : Math.PI / 2;
            link.rotation.z = (i * 0.3);
            g.add(link);
        }

        // Central binding rune (flat octahedron floating)
        const runeGeo = new THREE.OctahedronGeometry(0.15, 0);
        const rune = new THREE.Mesh(runeGeo, glowMat(0xa78bfa, 0.7));
        rune.position.y = 1.4;
        rune.userData.isRune = true;
        g.add(rune);

        // Swirling energy wisps
        for (let i = 0; i < 6; i++) {
            const wispGeo = new THREE.SphereGeometry(0.04, 6, 6);
            const wisp = new THREE.Mesh(wispGeo, glowMat(0xc4b5fd, 0.5));
            wisp.userData.wispPhase = (i / 6) * Math.PI * 2;
            wisp.userData.isWisp = true;
            g.add(wisp);
        }

        return g;
    }

    // ── Sage Smudge: Bundle of herbs with smoke ──
    function createSageSmudgePickup(config) {
        const g = new THREE.Group();

        // Herb bundle (group of cylinders bundled)
        for (let i = 0; i < 5; i++) {
            const stickGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.5, 6);
            const stickMat = stdMat(0x2d5a1e, 0x4ade80, 0.3);
            const stick = new THREE.Mesh(stickGeo, stickMat);
            const angle = (i / 5) * Math.PI * 2;
            stick.position.set(Math.cos(angle) * 0.06, 0.7, Math.sin(angle) * 0.06);
            stick.rotation.z = (Math.random() - 0.5) * 0.15;
            g.add(stick);
        }

        // Binding wrap (torus around bundle)
        const wrapGeo = new THREE.TorusGeometry(0.1, 0.02, 6, 12);
        const wrap = new THREE.Mesh(wrapGeo, stdMat(0x8b6914, 0x8b6914, 0.1));
        wrap.position.y = 0.65;
        wrap.rotation.x = Math.PI / 2;
        g.add(wrap);

        // Smoke particles (floating spheres that drift up)
        for (let i = 0; i < 8; i++) {
            const smokeGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 6);
            const smoke = new THREE.Mesh(smokeGeo, glowMat(0x90eeb0, 0.3));
            smoke.userData.isSmoke = true;
            smoke.userData.smokePhase = (i / 8) * Math.PI * 2;
            smoke.userData.smokeSpeed = 0.5 + Math.random() * 0.5;
            g.add(smoke);
        }

        // Ember tips
        for (let i = 0; i < 3; i++) {
            const emberGeo = new THREE.SphereGeometry(0.03, 4, 4);
            const ember = new THREE.Mesh(emberGeo, glowMat(0xff6600, 0.8));
            ember.position.set((Math.random() - 0.5) * 0.1, 0.96 + Math.random() * 0.05, (Math.random() - 0.5) * 0.1);
            ember.userData.isEmber = true;
            g.add(ember);
        }

        return g;
    }

    // ── Exorcist's Bible: Open book with glowing pages ──
    function createExorcistBiblePickup(config) {
        const g = new THREE.Group();

        // Book spine
        const spineGeo = new THREE.BoxGeometry(0.06, 0.5, 0.35);
        const spineMat = stdMat(0x4a1a1a, 0x8b0000, 0.3);
        const spine = new THREE.Mesh(spineGeo, spineMat);
        spine.position.y = 0.8;
        g.add(spine);

        // Left page (angled open)
        const pageGeo = new THREE.BoxGeometry(0.3, 0.48, 0.015);
        const pageMat = new THREE.MeshStandardMaterial({
            color: 0xfaf0e6,
            emissive: 0xffd700,
            emissiveIntensity: 0.3,
            roughness: 0.8,
        });
        const leftPage = new THREE.Mesh(pageGeo, pageMat);
        leftPage.position.set(-0.18, 0.8, 0);
        leftPage.rotation.y = 0.3;
        g.add(leftPage);

        // Right page
        const rightPage = new THREE.Mesh(pageGeo.clone(), pageMat.clone());
        rightPage.position.set(0.18, 0.8, 0);
        rightPage.rotation.y = -0.3;
        g.add(rightPage);

        // Glowing runes on pages
        for (let i = 0; i < 4; i++) {
            const runeGeo = new THREE.CircleGeometry(0.03, 5);
            const runeMat = glowMat(0xffd700, 0.7);
            const runeL = new THREE.Mesh(runeGeo, runeMat);
            runeL.position.set(-0.18, 0.65 + i * 0.1, 0.02);
            runeL.userData.isPageRune = true;
            g.add(runeL);
        }

        // Holy light beam shooting upward
        const beamGeo = new THREE.CylinderGeometry(0.02, 0.15, 1.5, 8, 1, true);
        const beamMat = glowMat(0xffffff, 0.15);
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 1.8;
        beam.userData.isBeam = true;
        g.add(beam);

        // Orbiting holy symbols
        for (let i = 0; i < 4; i++) {
            const symGeo = new THREE.OctahedronGeometry(0.05, 0);
            const sym = new THREE.Mesh(symGeo, glowMat(0xffd700, 0.6));
            sym.userData.symbolOrbit = (i / 4) * Math.PI * 2;
            sym.userData.isSymbol = true;
            g.add(sym);
        }

        return g;
    }


    // ── Caching System ──
    const modelCache = {};

    // ── Master createPickup function (Cached) ──
    function createPickup(weaponType) {
        const config = WEAPON_CONFIGS[weaponType];
        if (!config) return null;

        // If cached, return a clone
        if (modelCache[weaponType]) {
            const clone = modelCache[weaponType].clone();
            // Re-apply userData which might not clone deeply/correctly for logic use
            clone.userData.weaponType = weaponType;
            clone.userData.config = config;
            // Ensure children userData is preserved (clone usually handles this but good to be safe)
            return clone;
        }

        // Generate fresh model
        let group;
        switch (weaponType) {
            case 'holyWater': group = createHolyWaterPickup(config); break;
            case 'sacredCross': group = createSacredCrossPickup(config); break;
            case 'silverDagger': group = createSilverDaggerPickup(config); break;
            case 'bindingChains': group = createBindingChainsPickup(config); break;
            case 'sageSmudge': group = createSageSmudgePickup(config); break;
            case 'exorcistBible': group = createExorcistBiblePickup(config); break;
            default: return null;
        }

        group.userData.weaponType = weaponType;
        group.userData.config = config;

        // Floating platform (shared, hexagonal)
        const platGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.12, 6);
        const platMat = new THREE.MeshStandardMaterial({
            color: 0x0f0f1a,
            emissive: config.projColor,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            metalness: 0.7,
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = 0.0;
        group.add(platform);

        // Point light
        const light = new THREE.PointLight(config.projColor, 1.0, 12);
        light.position.y = 1.0;
        group.add(light);

        // Name label sprite (Expensive! Cache this!)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#' + config.projColor.toString(16).padStart(6, '0');
        ctx.shadowBlur = 12;
        ctx.fillText(config.name, 128, 40);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9 });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.5, 0.625, 1);
        sprite.position.y = 2.2;
        group.add(sprite);

        // Store in cache
        modelCache[weaponType] = group;

        // Return a clone
        const clone = group.clone();
        clone.userData.weaponType = weaponType;
        clone.userData.config = config;
        return clone;
    }


    // ══════════════════════════════════════════════════
    //  PICKUP ANIMATION — Unique per weapon
    // ══════════════════════════════════════════════════
    function animate(pickupGroup, time) {
        const type = pickupGroup.userData.weaponType;

        // Base float + rotate
        pickupGroup.rotation.y = time * 1.0;
        const baseY = pickupGroup.userData.baseY || 1.0;
        pickupGroup.position.y = baseY + Math.sin(time * 2.0) * 0.2;

        pickupGroup.children.forEach(child => {
            // Holy Water — orbiting droplets
            if (child.userData.isDrop) {
                const phase = child.userData.orbitPhase;
                const r = child.userData.orbitRadius;
                child.position.set(
                    Math.cos(time * 2.5 + phase) * r,
                    0.8 + Math.sin(time * 3.0 + phase) * 0.15,
                    Math.sin(time * 2.5 + phase) * r
                );
                child.material.opacity = 0.4 + Math.sin(time * 4 + phase) * 0.2;
            }
            // Holy Water — liquid wobble
            if (child.userData.isLiquid) {
                child.position.y = 0.72 + Math.sin(time * 3) * 0.05;
                child.material.opacity = 0.5 + Math.sin(time * 2) * 0.2;
            }

            // Sacred Cross — rotating halo rings
            if (child.userData.haloRing) {
                const idx = child.userData.ringIndex;
                child.rotation.x = time * (1.5 + idx * 0.5);
                child.rotation.y = time * (0.8 - idx * 0.3);
                child.material.opacity = 0.2 + Math.sin(time * 3 + idx) * 0.1;
            }
            // Sacred Cross — pulsing rays
            if (child.userData.isRay) {
                child.material.opacity = 0.15 + Math.sin(time * 4) * 0.1;
            }

            // Silver Dagger — sparkling particles
            if (child.userData.isSpark) {
                const phase = child.userData.sparkPhase;
                const t = (time * 1.5 + phase) % (Math.PI * 2);
                child.position.set(
                    Math.cos(t) * 0.2,
                    0.5 + (t / (Math.PI * 2)) * 1.0,
                    Math.sin(t) * 0.2
                );
                child.material.opacity = 0.3 + Math.sin(t * 3) * 0.3;
                child.scale.setScalar(0.5 + Math.sin(t * 5) * 0.5);
            }

            // Binding Chains — floating rune spin
            if (child.userData.isRune) {
                child.rotation.x = time * 2;
                child.rotation.y = time * 3;
                child.material.opacity = 0.5 + Math.sin(time * 2.5) * 0.2;
            }
            // Binding Chains — wisps orbiting
            if (child.userData.isWisp) {
                const phase = child.userData.wispPhase;
                child.position.set(
                    Math.cos(time * 1.8 + phase) * 0.35,
                    0.9 + Math.sin(time * 2.5 + phase) * 0.3,
                    Math.sin(time * 1.8 + phase) * 0.35
                );
            }

            // Sage Smudge — rising smoke
            if (child.userData.isSmoke) {
                const phase = child.userData.smokePhase;
                const spd = child.userData.smokeSpeed;
                const cycle = ((time * spd + phase) % 2.0) / 2.0; // 0–1
                child.position.set(
                    Math.sin(time * 0.8 + phase) * 0.15,
                    0.95 + cycle * 0.8,
                    Math.cos(time * 0.6 + phase) * 0.15
                );
                child.material.opacity = 0.3 * (1 - cycle);
                child.scale.setScalar(0.8 + cycle * 1.5);
            }
            // Sage — flickering embers
            if (child.userData.isEmber) {
                child.material.opacity = 0.5 + Math.sin(time * 10 + child.position.x * 50) * 0.4;
            }

            // Exorcist Bible — pulsing beam
            if (child.userData.isBeam) {
                child.material.opacity = 0.1 + Math.sin(time * 2) * 0.08;
                child.scale.x = 1 + Math.sin(time * 3) * 0.3;
                child.scale.z = child.scale.x;
            }
            // Exorcist Bible — orbiting symbols
            if (child.userData.isSymbol) {
                const phase = child.userData.symbolOrbit;
                child.position.set(
                    Math.cos(time * 1.5 + phase) * 0.5,
                    0.8 + Math.sin(time * 2 + phase) * 0.2,
                    Math.sin(time * 1.5 + phase) * 0.5
                );
                child.rotation.x = time * 3;
                child.rotation.y = time * 2;
            }
            // Exorcist Bible — flickering page runes
            if (child.userData.isPageRune) {
                child.material.opacity = 0.4 + Math.sin(time * 5 + child.position.y * 10) * 0.3;
            }
        });
    }


    // ══════════════════════════════════════════════════
    //  PROJECTILE VFX — Completely unique per weapon
    // ══════════════════════════════════════════════════

    function fireProjectile(scene, startPos, direction, weaponType, projectiles) {
        const config = WEAPON_CONFIGS[weaponType];
        if (!config) return;

        const speed = config.projSpeed;
        const lifetime = config.range / speed + 0.4;

        let projGroup;

        switch (weaponType) {
            case 'holyWater': projGroup = createHolyWaterProjectile(config); break;
            case 'sacredCross': projGroup = createSacredCrossProjectile(config); break;
            case 'silverDagger': projGroup = createSilverDaggerProjectile(config); break;
            case 'bindingChains': projGroup = createBindingChainsProjectile(config); break;
            case 'sageSmudge': projGroup = createSageSmudgeProjectile(config); break;
            case 'exorcistBible': projGroup = createExorcistBibleProjectile(config); break;
            default: return;
        }

        projGroup.position.copy(startPos);

        // Orient projectile to face direction of travel
        const lookTarget = startPos.clone().add(direction);
        projGroup.lookAt(lookTarget);

        scene.add(projGroup);

        projectiles.push({
            mesh: projGroup,
            velocity: direction.clone().normalize().multiplyScalar(speed),
            life: lifetime,
            maxLife: lifetime,
            color: config.projColor,
            weaponType: weaponType,
        });
    }

    // ── Holy Water: Splashing water droplets cluster ──
    function createHolyWaterProjectile(config) {
        const g = new THREE.Group();

        // Central water orb
        const orbGeo = new THREE.SphereGeometry(0.2, 5, 5); // EXTREME OPTIMIZATION
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0x60a5fa,
            transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        g.add(new THREE.Mesh(orbGeo, orbMat));

        // Surrounding splash droplets
        for (let i = 0; i < 6; i++) {
            const dropGeo = new THREE.TetrahedronGeometry(0.07, 0); // EXTREME OPTIMIZATION
            const drop = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({
                color: 0x93c5fd,
                transparent: true, opacity: 0.6,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            const angle = (i / 6) * Math.PI * 2;
            drop.position.set(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 0);
            g.add(drop);
        }

        // Mist aura
        const mistGeo = new THREE.SphereGeometry(0.5, 4, 4); // EXTREME OPTIMIZATION
        g.add(new THREE.Mesh(mistGeo, glowMat(0x60a5fa, 0.12)));

        // Light
        g.add(new THREE.PointLight(0x60a5fa, 1.5, 8));

        return g;
    }

    // ── Sacred Cross: Golden cross beam of light ──
    function createSacredCrossProjectile(config) {
        const g = new THREE.Group();
        const goldenGlow = glowMat(0xffd700, 0.7);

        // Central light core
        const coreGeo = new THREE.OctahedronGeometry(0.15, 1);
        g.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending,
        })));

        // Cross shape (vertical + horizontal beams)
        const vGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06);
        g.add(new THREE.Mesh(vGeo, goldenGlow));
        const hGeo = new THREE.BoxGeometry(0.4, 0.06, 0.06);
        g.add(new THREE.Mesh(hGeo, goldenGlow));

        // Trailing light streaks
        const trailGeo = new THREE.CylinderGeometry(0.02, 0.08, 1.2, 6);
        const trail = new THREE.Mesh(trailGeo, glowMat(0xffd700, 0.25));
        trail.rotation.x = Math.PI / 2;
        trail.position.z = -0.6;
        g.add(trail);

        // Halo ring
        const haloGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
        const halo = new THREE.Mesh(haloGeo, glowMat(0xffd700, 0.5));
        halo.rotation.x = Math.PI / 2;
        g.add(halo);

        // Bright light
        g.add(new THREE.PointLight(0xffd700, 2.5, 12));

        return g;
    }

    // ── Silver Dagger: Spinning blade with silver trail ──
    function createSilverDaggerProjectile(config) {
        const g = new THREE.Group();

        // Blade (elongated cone = dagger tip)
        const bladeGeo = new THREE.ConeGeometry(0.06, 0.6, 4);
        const bladeMat = new THREE.MeshBasicMaterial({
            color: 0xe0e0e0, transparent: true, opacity: 0.95,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.x = -Math.PI / 2; // point forward
        g.add(blade);

        // Metallic gleam aura
        const gleamGeo = new THREE.SphereGeometry(0.15, 8, 8);
        g.add(new THREE.Mesh(gleamGeo, glowMat(0xffffff, 0.3)));

        // Spin trail (thin ring)
        const spinGeo = new THREE.TorusGeometry(0.2, 0.01, 6, 16);
        const spinTrail = new THREE.Mesh(spinGeo, glowMat(0xc0c0c0, 0.4));
        g.add(spinTrail);

        // Motion blur streaks
        for (let i = 0; i < 3; i++) {
            const streakGeo = new THREE.BoxGeometry(0.01, 0.01, 0.4 + i * 0.15);
            const streak = new THREE.Mesh(streakGeo, glowMat(0xc0c0c0, 0.2 - i * 0.05));
            streak.position.z = -(0.3 + i * 0.15);
            g.add(streak);
        }

        g.add(new THREE.PointLight(0xc0c0c0, 1.0, 6));

        return g;
    }

    // ── Binding Chains: Spiraling chain links ──
    function createBindingChainsProjectile(config) {
        const g = new THREE.Group();

        // Chain links spiraling
        for (let i = 0; i < 4; i++) {
            const linkGeo = new THREE.TorusGeometry(0.08, 0.025, 4, 6); // EXTREME OPTIMIZATION
            const linkMat = new THREE.MeshBasicMaterial({
                color: 0xa78bfa,
                transparent: true, opacity: 0.8,
                blending: THREE.AdditiveBlending,
            });
            const link = new THREE.Mesh(linkGeo, linkMat);
            const phase = (i / 4) * Math.PI * 2;
            link.position.set(
                Math.cos(phase) * 0.12,
                Math.sin(phase) * 0.12,
                i * -0.15
            );
            link.rotation.y = phase;
            g.add(link);
        }

        // Central binding energy
        const coreGeo = new THREE.IcosahedronGeometry(0.12, 0);
        g.add(new THREE.Mesh(coreGeo, glowMat(0xc4b5fd, 0.7)));

        // Purple energy aura
        const auraGeo = new THREE.SphereGeometry(0.35, 8, 8);
        g.add(new THREE.Mesh(auraGeo, glowMat(0xa78bfa, 0.15)));

        // Trailing wisps
        for (let i = 0; i < 3; i++) {
            const wispGeo = new THREE.SphereGeometry(0.05, 6, 6);
            const wisp = new THREE.Mesh(wispGeo, glowMat(0xc4b5fd, 0.4));
            wisp.position.z = -(0.3 + i * 0.2);
            g.add(wisp);
        }

        g.add(new THREE.PointLight(0xa78bfa, 1.5, 10));

        return g;
    }

    // ── Sage Smudge: Billowing green smoke cloud ──
    function createSageSmudgeProjectile(config) {
        const g = new THREE.Group();

        // Smoke puffs (cluster of varied-size spheres)
        for (let i = 0; i < 10; i++) {
            const size = 0.1 + Math.random() * 0.12;
            const puffGeo = new THREE.SphereGeometry(size, 8, 8);
            const puff = new THREE.Mesh(puffGeo, glowMat(
                Math.random() > 0.5 ? 0x4ade80 : 0x90eeb0,
                0.3 + Math.random() * 0.2
            ));
            puff.position.set(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            );
            g.add(puff);
        }

        // Central purifying glow
        const coreGeo = new THREE.SphereGeometry(0.15, 8, 8);
        g.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
            color: 0x4ade80, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending,
        })));

        // Large faint aura
        const auraGeo = new THREE.SphereGeometry(0.6, 8, 8);
        g.add(new THREE.Mesh(auraGeo, glowMat(0x4ade80, 0.08)));

        g.add(new THREE.PointLight(0x4ade80, 2.0, 10));

        return g;
    }

    // ── Exorcist Bible: Massive holy energy blast ──
    function createExorcistBibleProjectile(config) {
        const g = new THREE.Group();

        // Brilliant white core
        const coreGeo = new THREE.IcosahedronGeometry(0.25, 2);
        g.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 1.0,
            blending: THREE.AdditiveBlending,
        })));

        // Golden halo rings (3 crossing)
        for (let i = 0; i < 3; i++) {
            const haloGeo = new THREE.TorusGeometry(0.35, 0.02, 4, 12); // EXTREME OPTIMIZATION
            const halo = new THREE.Mesh(haloGeo, glowMat(0xffd700, 0.6));
            halo.rotation.x = (i / 3) * Math.PI;
            halo.rotation.y = (i / 3) * Math.PI * 0.5;
            g.add(halo);
        }

        // Holy scripture fragments (floating flat planes)
        for (let i = 0; i < 6; i++) {
            const fragGeo = new THREE.PlaneGeometry(0.12, 0.08);
            const frag = new THREE.Mesh(fragGeo, glowMat(0xffd700, 0.4));
            const ang = (i / 6) * Math.PI * 2;
            frag.position.set(
                Math.cos(ang) * 0.5,
                Math.sin(ang) * 0.5,
                (Math.random() - 0.5) * 0.3
            );
            frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            frag.material.side = THREE.DoubleSide;
            g.add(frag);
        }

        // Intense outer aura
        const auraGeo = new THREE.SphereGeometry(0.7, 5, 5); // EXTREME OPTIMIZATION
        g.add(new THREE.Mesh(auraGeo, glowMat(0xffd700, 0.12)));

        // Massive light
        g.add(new THREE.PointLight(0xffffff, 3.5, 18));

        return g;
    }


    return {
        WEAPON_CONFIGS,
        WEAPON_TYPES,
        createPickup,
        animate,
        fireProjectile,
    };
})();

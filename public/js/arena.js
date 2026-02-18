/* ══════════════════════════════════════════════════════════════
   Arena / Map — Haunted Ghost Arena  (v4 – Beautiful & Spooky)
   Rectangular arena with rich colors, spooky atmosphere, obstacles
   ══════════════════════════════════════════════════════════════ */

const Arena = (() => {
    // ── Arena dimensions ─────────────────────────
    const HALF_W = 64;   // half-width  (X axis): total 128 units wide
    const HALF_D = 64;   // half-depth  (Z axis): total 128 units deep
    const WALL_H = 9;    // wall height — tall and imposing
    const MARGIN = 1.2;  // player keep-out from walls

    // ══════════════════════════════════════════════
    //  BOUNDARY
    // ══════════════════════════════════════════════
    function isInsideArena(x, z) {
        return x > -HALF_W + MARGIN && x < HALF_W - MARGIN &&
            z > -HALF_D + MARGIN && z < HALF_D - MARGIN;
    }

    function clampToArena(x, z) {
        return {
            x: Math.max(-HALF_W + MARGIN, Math.min(HALF_W - MARGIN, x)),
            z: Math.max(-HALF_D + MARGIN, Math.min(HALF_D - MARGIN, z))
        };
    }

    // ══════════════════════════════════════════════
    //  SKY DOME (eerie haunted sky)
    // ══════════════════════════════════════════════
    function createSky(scene) {
        const skyGeo = new THREE.SphereGeometry(250, 32, 32);
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Haunted night gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 1024);
        grad.addColorStop(0, '#000008');
        grad.addColorStop(0.15, '#05001a');
        grad.addColorStop(0.35, '#0d0030');
        grad.addColorStop(0.5, '#15003d');
        grad.addColorStop(0.7, '#1a0a45');
        grad.addColorStop(0.85, '#22104e');
        grad.addColorStop(1, '#2d1560');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        // Nebula clouds - ghostly wisps
        for (let c = 0; c < 12; c++) {
            const cx = Math.random() * 1024;
            const cy = 100 + Math.random() * 500;
            const cr = 80 + Math.random() * 150;
            const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
            const hue = Math.random() > 0.5 ? '120, 40, 200' : '60, 20, 160';
            cloudGrad.addColorStop(0, `rgba(${hue}, 0.12)`);
            cloudGrad.addColorStop(0.5, `rgba(${hue}, 0.05)`);
            cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cloudGrad;
            ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
        }

        // Green ghostly aurora
        for (let a = 0; a < 5; a++) {
            const ax = Math.random() * 1024;
            const ay = 200 + Math.random() * 300;
            const ar = 60 + Math.random() * 120;
            const aGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
            aGrad.addColorStop(0, 'rgba(50, 255, 100, 0.06)');
            aGrad.addColorStop(0.6, 'rgba(30, 200, 80, 0.02)');
            aGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = aGrad;
            ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
        }

        // Stars - different sizes and colors
        for (let i = 0; i < 500; i++) {
            const sx = Math.random() * 1024;
            const sy = Math.random() * 700;
            const sr = 0.3 + Math.random() * 1.8;
            const colors = ['255,255,255', '200,200,255', '255,200,200', '200,255,200', '200,180,255'];
            const col = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillStyle = `rgba(${col}, ${0.3 + Math.random() * 0.7})`;
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }

        // Bright featured stars with glow
        for (let i = 0; i < 20; i++) {
            const sx = Math.random() * 1024;
            const sy = Math.random() * 400;
            // Glow
            const gGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
            gGrad.addColorStop(0, 'rgba(200, 180, 255, 0.6)');
            gGrad.addColorStop(0.5, 'rgba(150, 120, 255, 0.15)');
            gGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gGrad;
            ctx.fillRect(sx - 8, sy - 8, 16, 16);
            // Core
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
        }

        // Moon
        const moonX = 780, moonY = 120, moonR = 40;
        const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 2);
        moonGrad.addColorStop(0, 'rgba(220, 200, 255, 0.5)');
        moonGrad.addColorStop(0.3, 'rgba(180, 150, 230, 0.2)');
        moonGrad.addColorStop(0.7, 'rgba(100, 50, 180, 0.05)');
        moonGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = moonGrad;
        ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200, 190, 240, 0.35)';
        ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(230, 220, 255, 0.2)';
        ctx.beginPath(); ctx.arc(moonX + 5, moonY - 3, moonR * 0.8, 0, Math.PI * 2); ctx.fill();

        const skyTex = new THREE.CanvasTexture(canvas);
        const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);
        return sky;
    }

    // ══════════════════════════════════════════════
    //  FLOOR (haunted stone with glowing runes)
    // ══════════════════════════════════════════════
    function createFloor() {
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        // Base - dark purple-gray stone
        const baseGrad = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1400);
        baseGrad.addColorStop(0, '#1a1230');
        baseGrad.addColorStop(0.5, '#110c22');
        baseGrad.addColorStop(1, '#0a0818');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, 2048, 2048);

        // Stone grain texture
        for (let i = 0; i < 8000; i++) {
            const px = Math.random() * 2048;
            const py = Math.random() * 2048;
            const s = 1 + Math.random() * 3;
            const v = Math.floor(12 + Math.random() * 25);
            const tint = Math.random() > 0.7 ? v + 8 : 0;
            ctx.fillStyle = `rgb(${v + tint}, ${v}, ${v + 5})`;
            ctx.fillRect(px, py, s, s);
        }

        // Larger stone blocks
        ctx.strokeStyle = 'rgba(80, 50, 140, 0.08)';
        ctx.lineWidth = 2;
        for (let g = 0; g <= 2048; g += 128) {
            // Slightly offset for organic feel
            const off = Math.sin(g * 0.05) * 4;
            ctx.beginPath(); ctx.moveTo(g + off, 0); ctx.lineTo(g - off, 2048); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, g + off); ctx.lineTo(2048, g - off); ctx.stroke();
        }

        // Glowing arcane circles
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.3)';
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(1024, 1024, 500, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(80, 255, 120, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(1024, 1024, 350, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(1024, 1024, 200, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Star pattern in center
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(1024, 1024);
            ctx.lineTo(1024 + Math.cos(a) * 700, 1024 + Math.sin(a) * 700);
            ctx.stroke();
        }

        // Rune symbols around circles
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const colors = ['rgba(168,85,247,0.3)', 'rgba(80,255,120,0.2)', 'rgba(255,100,50,0.18)'];
            ctx.fillStyle = colors[i % 3];
            const rx = 1024 + Math.cos(a) * 420;
            const ry = 1024 + Math.sin(a) * 420;
            // Diamond rune shape
            ctx.beginPath();
            ctx.moveTo(rx, ry - 15);
            ctx.lineTo(rx + 10, ry);
            ctx.lineTo(rx, ry + 15);
            ctx.lineTo(rx - 10, ry);
            ctx.closePath();
            ctx.fill();
        }

        // Corner sigils
        const sigils = [[200, 200], [1848, 200], [200, 1848], [1848, 1848]];
        sigils.forEach(([sx, sy], i) => {
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(168,85,247,0.2)' : 'rgba(80,255,120,0.15)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, sy, 50, 0, Math.PI * 2); ctx.stroke();
            for (let j = 0; j < 4; j++) {
                const a = (j / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(a) * 70, sy + Math.sin(a) * 70);
                ctx.stroke();
            }
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        const geo = new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2);
        const mat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.82,
            metalness: 0.08,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        return floor;
    }

    // ══════════════════════════════════════════════
    //  WALLS  – bold colors, spooky glow patterns
    // ══════════════════════════════════════════════
    function createWalls() {
        const group = new THREE.Group();

        // Wall color palette — each wall a slightly different hue
        const wallStyles = [
            { color: 0x2a0845, emissive: 0x7c3aed, accent: 0xa855f7, accentBot: 0x50ff78 },  // North - purple/green
            { color: 0x1a0530, emissive: 0x6d28d9, accent: 0xc084fc, accentBot: 0xff4444 },  // South - purple/red
            { color: 0x0d1b3e, emissive: 0x2563eb, accent: 0x60a5fa, accentBot: 0xa855f7 },  // West  - blue/purple
            { color: 0x1a0a2e, emissive: 0x9333ea, accent: 0xd946ef, accentBot: 0x38bdf8 },  // East  - magenta/cyan
        ];

        const wallData = [
            { px: 0, pz: -HALF_D, w: HALF_W * 2 + 1.6, ry: 0, style: wallStyles[0] },
            { px: 0, pz: HALF_D, w: HALF_W * 2 + 1.6, ry: 0, style: wallStyles[1] },
            { px: -HALF_W, pz: 0, w: HALF_D * 2 + 1.6, ry: Math.PI / 2, style: wallStyles[2] },
            { px: HALF_W, pz: 0, w: HALF_D * 2 + 1.6, ry: Math.PI / 2, style: wallStyles[3] },
        ];

        wallData.forEach((wd) => {
            const s = wd.style;

            // Wall texture
            const wallCanvas = document.createElement('canvas');
            wallCanvas.width = 512;
            wallCanvas.height = 256;
            const wctx = wallCanvas.getContext('2d');

            // Wall base gradient
            const wGrad = wctx.createLinearGradient(0, 0, 0, 256);
            wGrad.addColorStop(0, '#1a0a35');
            wGrad.addColorStop(0.5, '#12082a');
            wGrad.addColorStop(1, '#0a0520');
            wctx.fillStyle = wGrad;
            wctx.fillRect(0, 0, 512, 256);

            // Brick-like pattern
            wctx.strokeStyle = 'rgba(120, 80, 200, 0.08)';
            wctx.lineWidth = 1;
            for (let r = 0; r < 256; r += 32) {
                wctx.beginPath(); wctx.moveTo(0, r); wctx.lineTo(512, r); wctx.stroke();
                const offset = (Math.floor(r / 32) % 2) * 32;
                for (let c = offset; c < 512; c += 64) {
                    wctx.beginPath(); wctx.moveTo(c, r); wctx.lineTo(c, r + 32); wctx.stroke();
                }
            }

            // Ghostly drip stains
            for (let d = 0; d < 8; d++) {
                const dx = Math.random() * 512;
                const dy = Math.random() * 180;
                const dh = 30 + Math.random() * 60;
                const dGrad = wctx.createLinearGradient(dx, dy, dx, dy + dh);
                dGrad.addColorStop(0, 'rgba(100, 40, 180, 0.12)');
                dGrad.addColorStop(1, 'rgba(60, 20, 120, 0)');
                wctx.fillStyle = dGrad;
                wctx.fillRect(dx - 3, dy, 6, dh);
            }

            const wallTex = new THREE.CanvasTexture(wallCanvas);
            wallTex.wrapS = THREE.RepeatWrapping;
            wallTex.wrapT = THREE.ClampToEdgeWrapping;
            wallTex.repeat.set(8, 1);

            // Main wall
            const wallGeo = new THREE.BoxGeometry(wd.w, WALL_H, 1.0);
            const wallMat = new THREE.MeshStandardMaterial({
                map: wallTex,
                color: s.color,
                emissive: s.emissive,
                emissiveIntensity: 0.3,
                roughness: 0.6,
                metalness: 0.2,
                transparent: true,
                opacity: 0.85,
            });
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(wd.px, WALL_H / 2, wd.pz);
            wall.rotation.y = wd.ry;
            wall.castShadow = true;
            wall.receiveShadow = true;
            group.add(wall);

            // Bottom glow strip — colored
            const stripGeo = new THREE.BoxGeometry(wd.w, 0.25, 1.2);
            const stripBot = new THREE.Mesh(stripGeo, new THREE.MeshBasicMaterial({
                color: s.accentBot,
                transparent: true,
                opacity: 0.7,
            }));
            stripBot.position.set(wd.px, 0.12, wd.pz);
            stripBot.rotation.y = wd.ry;
            stripBot.userData.glowStrip = true;
            stripBot.userData.baseOpacity = 0.7;
            group.add(stripBot);

            // Top glow strip
            const stripTop = new THREE.Mesh(stripGeo.clone(), new THREE.MeshBasicMaterial({
                color: s.accent,
                transparent: true,
                opacity: 0.6,
            }));
            stripTop.position.set(wd.px, WALL_H, wd.pz);
            stripTop.rotation.y = wd.ry;
            stripTop.userData.glowStrip = true;
            stripTop.userData.baseOpacity = 0.6;
            group.add(stripTop);

            // Mid accent line — different color
            const midGeo = new THREE.BoxGeometry(wd.w, 0.1, 1.2);
            const mid = new THREE.Mesh(midGeo, new THREE.MeshBasicMaterial({
                color: s.accent,
                transparent: true,
                opacity: 0.3,
            }));
            mid.position.set(wd.px, WALL_H * 0.5, wd.pz);
            mid.rotation.y = wd.ry;
            group.add(mid);

            // Second mid accent — ghostly green at 1/3
            const mid2 = new THREE.Mesh(midGeo.clone(), new THREE.MeshBasicMaterial({
                color: 0x50ff78,
                transparent: true,
                opacity: 0.15,
            }));
            mid2.position.set(wd.px, WALL_H * 0.33, wd.pz);
            mid2.rotation.y = wd.ry;
            group.add(mid2);
        });

        // ── Corner pillars ──
        const corners = [
            { x: -HALF_W, z: -HALF_D },
            { x: HALF_W, z: -HALF_D },
            { x: -HALF_W, z: HALF_D },
            { x: HALF_W, z: HALF_D },
        ];
        const crystColors = [0xff4444, 0x50ff78, 0x38bdf8, 0xd946ef];

        corners.forEach((c, i) => {
            // Column
            const pGeo = new THREE.CylinderGeometry(0.8, 1.1, WALL_H + 3, 8);
            const pMat = new THREE.MeshStandardMaterial({
                color: 0x1a0e35,
                emissive: 0x4c1d95,
                emissiveIntensity: 0.35,
                roughness: 0.4,
                metalness: 0.5,
            });
            const pillar = new THREE.Mesh(pGeo, pMat);
            pillar.position.set(c.x, (WALL_H + 3) / 2, c.z);
            pillar.castShadow = true;
            group.add(pillar);

            // Floating crystal
            const crystGeo = new THREE.OctahedronGeometry(0.55, 0);
            const crystMat = new THREE.MeshStandardMaterial({
                color: crystColors[i],
                emissive: crystColors[i],
                emissiveIntensity: 1.0,
                roughness: 0.02,
                metalness: 0.95,
            });
            const crystal = new THREE.Mesh(crystGeo, crystMat);
            crystal.position.set(c.x, WALL_H + 4, c.z);
            crystal.userData.floatingCrystal = true;
            crystal.userData.baseY = WALL_H + 4;
            crystal.userData.phase = i * 1.5;
            group.add(crystal);

            // Crystal glow halo
            const haloGeo = new THREE.SphereGeometry(0.9, 12, 12);
            const haloMat = new THREE.MeshBasicMaterial({
                color: crystColors[i],
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.position.set(c.x, WALL_H + 4, c.z);
            halo.userData.floatingCrystal = true;
            halo.userData.baseY = WALL_H + 4;
            halo.userData.phase = i * 1.5;
            group.add(halo);

            // Crystal point light — color-matched
            const cLight = new THREE.PointLight(crystColors[i], 1.2, 18);
            cLight.position.set(c.x, WALL_H + 4, c.z);
            cLight.userData.floatingCrystal = true;
            cLight.userData.baseY = WALL_H + 4;
            cLight.userData.phase = i * 1.5;
            group.add(cLight);
        });

        return group;
    }

    // ══════════════════════════════════════════════
    //  OBSTACLES  – colorful, spooky cover
    // ══════════════════════════════════════════════
    const OBSTACLE_POSITIONS = [];

    function createObstacles() {
        const group = new THREE.Group();

        // ── CENTER ALTAR  (dark purple/green pulsing) ──
        const altarGeo = new THREE.CylinderGeometry(3.0, 3.5, 1.2, 8);
        const altarMat = new THREE.MeshStandardMaterial({
            color: 0x1a0e35,
            emissive: 0x6d28d9,
            emissiveIntensity: 0.35,
            roughness: 0.5,
            metalness: 0.4,
        });
        const altar = new THREE.Mesh(altarGeo, altarMat);
        altar.position.set(0, 0.6, 0);
        altar.castShadow = true;
        altar.receiveShadow = true;
        group.add(altar);
        OBSTACLE_POSITIONS.push({ x: 0, z: 0, r: 4.0 });

        // Altar inner ring (glowing green)
        const ringGeo = new THREE.RingGeometry(2.0, 2.5, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x50ff78,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 1.25;
        ring.userData.altarRing = true;
        group.add(ring);

        // Floating soul core (alternating red/purple)
        const coreGeo = new THREE.IcosahedronGeometry(0.6, 1);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xff3366,
            emissive: 0xff3366,
            emissiveIntensity: 0.9,
            roughness: 0.02,
            metalness: 0.9,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 3.0, 0);
        core.userData.isCore = true;
        core.userData.baseY = 3.0;
        group.add(core);

        // Core glow sphere
        const coreGlowGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const coreGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
        coreGlow.position.set(0, 3.0, 0);
        coreGlow.userData.isCore = true;
        coreGlow.userData.baseY = 3.0;
        group.add(coreGlow);

        // Altar light (eerie red/purple)
        const aLight = new THREE.PointLight(0xff3366, 2.0, 25);
        aLight.position.set(0, 4.5, 0);
        group.add(aLight);

        // ── 8 SPIRIT PILLARS  –  differently colored (inner + outer ring) ──
        const spiritPillars = [
            // Inner ring
            { x: -28, z: -28, color: 0xa855f7, emissive: 0x7c3aed, orbColor: 0xd946ef },
            { x: 28, z: -28, color: 0x2563eb, emissive: 0x1d4ed8, orbColor: 0x60a5fa },
            { x: -28, z: 28, color: 0x059669, emissive: 0x047857, orbColor: 0x34d399 },
            { x: 28, z: 28, color: 0xdc2626, emissive: 0xb91c1c, orbColor: 0xf87171 },
            // Outer ring
            { x: -48, z: 0, color: 0xd946ef, emissive: 0xa855f7, orbColor: 0xf0abfc },
            { x: 48, z: 0, color: 0x0ea5e9, emissive: 0x0284c7, orbColor: 0x7dd3fc },
            { x: 0, z: -48, color: 0xf59e0b, emissive: 0xd97706, orbColor: 0xfbbf24 },
            { x: 0, z: 48, color: 0x10b981, emissive: 0x059669, orbColor: 0x6ee7b7 },
        ];
        spiritPillars.forEach((sp, i) => {
            const pGeo = new THREE.CylinderGeometry(1.1, 1.4, 6, 6);
            const pMat = new THREE.MeshStandardMaterial({
                color: sp.color,
                emissive: sp.emissive,
                emissiveIntensity: 0.3,
                roughness: 0.45,
                metalness: 0.4,
            });
            const pillar = new THREE.Mesh(pGeo, pMat);
            pillar.position.set(sp.x, 3, sp.z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            group.add(pillar);
            OBSTACLE_POSITIONS.push({ x: sp.x, z: sp.z, r: 2.0 });

            // Pillar top orb (colored)
            const oGeo = new THREE.SphereGeometry(0.4, 12, 12);
            const oMat = new THREE.MeshBasicMaterial({
                color: sp.orbColor,
                transparent: true,
                opacity: 0.8,
            });
            const orb = new THREE.Mesh(oGeo, oMat);
            orb.position.set(sp.x, 6.5, sp.z);
            orb.userData.floatingOrb = true;
            orb.userData.baseY = 6.5;
            orb.userData.phase = i * 0.9;
            group.add(orb);

            // Orb light
            const oLight = new THREE.PointLight(sp.orbColor, 0.8, 12);
            oLight.position.set(sp.x, 6.5, sp.z);
            group.add(oLight);
        });

        // ── TOMBSTONES  (spooky! – spread across map) ──
        const tombPositions = [
            // Inner ring
            { x: -18, z: -18 }, { x: 18, z: -18 },
            { x: -18, z: 18 }, { x: 18, z: 18 },
            // Mid ring
            { x: -40, z: 0 }, { x: 40, z: 0 },
            { x: 0, z: -40 }, { x: 0, z: 40 },
            // Outer ring
            { x: -50, z: -30 }, { x: 50, z: -30 },
            { x: -50, z: 30 }, { x: 50, z: 30 },
        ];
        tombPositions.forEach((tp, i) => {
            // Tombstone body
            const tGeo = new THREE.BoxGeometry(1.2, 3.0, 0.5);
            const tMat = new THREE.MeshStandardMaterial({
                color: 0x2a2040,
                emissive: i % 2 === 0 ? 0x4c1d95 : 0x1a5c2e,
                emissiveIntensity: 0.15,
                roughness: 0.85,
                metalness: 0.1,
            });
            const tomb = new THREE.Mesh(tGeo, tMat);
            tomb.position.set(tp.x, 1.5, tp.z);
            tomb.rotation.y = Math.random() * 0.4 - 0.2; // slight tilt
            tomb.castShadow = true;
            tomb.receiveShadow = true;
            group.add(tomb);

            // Tombstone top (rounded)
            const topGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 8, 1, false, 0, Math.PI);
            const top = new THREE.Mesh(topGeo, tMat.clone());
            top.position.set(tp.x, 3.0, tp.z);
            top.rotation.z = Math.PI / 2;
            top.rotation.y = tomb.rotation.y;
            group.add(top);

            OBSTACLE_POSITIONS.push({ x: tp.x, z: tp.z, r: 1.5 });
        });

        // ── GHOST FIRE BRAZIERS (inner + outer ring) ──
        const brazierPositions = [
            // Inner ring
            { x: -35, z: -35, fireColor: 0x50ff78 },
            { x: 35, z: -35, fireColor: 0x38bdf8 },
            { x: -35, z: 35, fireColor: 0xff4444 },
            { x: 35, z: 35, fireColor: 0xd946ef },
            // Outer ring
            { x: -55, z: -15, fireColor: 0xfbbf24 },
            { x: 55, z: -15, fireColor: 0x60a5fa },
            { x: -55, z: 15, fireColor: 0xf87171 },
            { x: 55, z: 15, fireColor: 0xa78bfa },
        ];
        brazierPositions.forEach((bp) => {
            // Bowl
            const bowlGeo = new THREE.CylinderGeometry(0.8, 0.5, 1.5, 8);
            const bowlMat = new THREE.MeshStandardMaterial({
                color: 0x1a1535,
                emissive: 0x2d1b69,
                emissiveIntensity: 0.2,
                roughness: 0.6,
                metalness: 0.3,
            });
            const bowl = new THREE.Mesh(bowlGeo, bowlMat);
            bowl.position.set(bp.x, 0.75, bp.z);
            bowl.castShadow = true;
            group.add(bowl);
            OBSTACLE_POSITIONS.push({ x: bp.x, z: bp.z, r: 1.3 });

            // Ghost fire (glowing sphere cluster)
            for (let f = 0; f < 3; f++) {
                const fGeo = new THREE.SphereGeometry(0.2 + f * 0.1, 8, 8);
                const fMat = new THREE.MeshBasicMaterial({
                    color: bp.fireColor,
                    transparent: true,
                    opacity: 0.5 - f * 0.12,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const fire = new THREE.Mesh(fGeo, fMat);
                fire.position.set(bp.x, 1.6 + f * 0.3, bp.z);
                fire.userData.ghostFire = true;
                fire.userData.baseY = 1.6 + f * 0.3;
                fire.userData.phase = f * 2.0;
                fire.userData.fireColor = bp.fireColor;
                group.add(fire);
            }

            // Fire light
            const fLight = new THREE.PointLight(bp.fireColor, 1.0, 15);
            fLight.position.set(bp.x, 2.5, bp.z);
            fLight.userData.ghostFire = true;
            fLight.userData.baseY = 2.5;
            fLight.userData.phase = 0;
            group.add(fLight);
        });

        // ── LOW BARRICADES (inner + outer ring) ──
        const barricades = [
            // Inner ring
            { x: -16, z: 0, ry: 0, color: 0x352040 },
            { x: 16, z: 0, ry: 0, color: 0x302045 },
            { x: 0, z: -16, ry: Math.PI / 2, color: 0x203540 },
            { x: 0, z: 16, ry: Math.PI / 2, color: 0x352530 },
            // Outer ring
            { x: -42, z: -20, ry: 0.3, color: 0x2d1b45 },
            { x: 42, z: -20, ry: -0.3, color: 0x251535 },
            { x: -42, z: 20, ry: -0.3, color: 0x1b2d40 },
            { x: 42, z: 20, ry: 0.3, color: 0x352040 },
        ];
        barricades.forEach((b) => {
            const bGeo = new THREE.BoxGeometry(6, 2.2, 0.7);
            const bMat = new THREE.MeshStandardMaterial({
                color: b.color,
                emissive: 0x4c1d95,
                emissiveIntensity: 0.1,
                roughness: 0.8,
                metalness: 0.1,
            });
            const barr = new THREE.Mesh(bGeo, bMat);
            barr.position.set(b.x, 1.1, b.z);
            barr.rotation.y = b.ry;
            barr.castShadow = true;
            barr.receiveShadow = true;
            group.add(barr);
            OBSTACLE_POSITIONS.push({ x: b.x, z: b.z, r: 2.0 });
        });

        return group;
    }

    // ══════════════════════════════════════════════
    //  LIGHTING  (spooky multi-color)
    // ══════════════════════════════════════════════
    function createLighting(scene) {
        // Main overhead — slightly purple
        const spot = new THREE.SpotLight(0xc4b5fd, 1.8, 120, Math.PI / 3, 0.3);
        spot.position.set(0, 40, 0);
        spot.target.position.set(0, 0, 0);
        spot.castShadow = true;
        spot.shadow.mapSize.set(2048, 2048);
        spot.shadow.camera.near = 10;
        spot.shadow.camera.far = 70;
        scene.add(spot);
        scene.add(spot.target);

        // Ambient — not too dark
        scene.add(new THREE.AmbientLight(0x201830, 1.0));

        // Hemisphere — purple top, dark green bottom (spooky!)
        scene.add(new THREE.HemisphereLight(0x4a2882, 0x0a2010, 0.6));

        // Side fills with color
        const fill1 = new THREE.DirectionalLight(0x7c3aed, 0.4);
        fill1.position.set(25, 20, 20);
        scene.add(fill1);
        const fill2 = new THREE.DirectionalLight(0x22c55e, 0.3);
        fill2.position.set(-20, 15, -15);
        scene.add(fill2);
        const fill3 = new THREE.DirectionalLight(0x38bdf8, 0.2);
        fill3.position.set(15, 10, -25);
        scene.add(fill3);
    }

    // ── Fog (greenish-black for spooky effect) ──
    function createFog(scene) {
        scene.fog = new THREE.FogExp2(0x060812, 0.005);
    }

    // ── Particles (multi-color ghost motes) ──
    function createParticles(scene) {
        const count = 500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * HALF_W * 2;
            positions[i * 3 + 1] = 0.3 + Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * HALF_D * 2;

            const r = Math.random();
            if (r < 0.3) {
                // Purple motes
                colors[i * 3] = 0.66; colors[i * 3 + 1] = 0.33; colors[i * 3 + 2] = 0.97;
            } else if (r < 0.55) {
                // Green motes
                colors[i * 3] = 0.31; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 0.47;
            } else if (r < 0.75) {
                // Cyan motes
                colors[i * 3] = 0.22; colors[i * 3 + 1] = 0.74; colors[i * 3 + 2] = 0.97;
            } else if (r < 0.9) {
                // Red motes
                colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.27; colors[i * 3 + 2] = 0.27;
            } else {
                // Pink motes
                colors[i * 3] = 0.85; colors[i * 3 + 1] = 0.27; colors[i * 3 + 2] = 0.93;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.12,
            transparent: true,
            opacity: 0.4,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        return pts;
    }

    // ── Ground edge glow ──
    function createEdgeGlow() {
        const group = new THREE.Group();
        const edgeData = [
            { x: 0, z: -HALF_D + 0.3, w: HALF_W * 2, ry: 0, color: 0xa855f7 },
            { x: 0, z: HALF_D - 0.3, w: HALF_W * 2, ry: 0, color: 0xff4444 },
            { x: -HALF_W + 0.3, z: 0, w: HALF_D * 2, ry: Math.PI / 2, color: 0x38bdf8 },
            { x: HALF_W - 0.3, z: 0, w: HALF_D * 2, ry: Math.PI / 2, color: 0xd946ef },
        ];
        edgeData.forEach(e => {
            const gGeo = new THREE.PlaneGeometry(e.w, 2.5);
            const gMat = new THREE.MeshBasicMaterial({
                color: e.color,
                transparent: true,
                opacity: 0.06,
                side: THREE.DoubleSide,
            });
            const glow = new THREE.Mesh(gGeo, gMat);
            glow.rotation.x = -Math.PI / 2;
            glow.rotation.z = e.ry;
            glow.position.set(e.x, 0.02, e.z);
            glow.userData.edgeGlow = true;
            glow.userData.baseOpacity = 0.06;
            group.add(glow);
        });
        return group;
    }

    // ══════════════════════════════════════════════
    //  BUILD
    // ══════════════════════════════════════════════
    function build(scene) {
        const sky = createSky(scene);
        const floor = createFloor();
        scene.add(floor);
        const edgeGlow = createEdgeGlow();
        scene.add(edgeGlow);
        const walls = createWalls();
        scene.add(walls);
        const obstacles = createObstacles();
        scene.add(obstacles);
        createLighting(scene);
        createFog(scene);
        const particles = createParticles(scene);

        return { sky, floor, walls, obstacles, edgeGlow, particles };
    }

    // ══════════════════════════════════════════════
    //  ANIMATE
    // ══════════════════════════════════════════════
    function animate(obj, time) {
        if (!obj) return;

        // Corner crystals float and spin
        obj.walls.children.forEach(child => {
            if (child.userData.floatingCrystal) {
                child.position.y = child.userData.baseY + Math.sin(time * 1.2 + child.userData.phase) * 0.6;
                if (child.rotation) child.rotation.y = time * 0.7 + child.userData.phase;
            }
            if (child.userData.glowStrip) {
                const base = child.userData.baseOpacity || 0.5;
                child.material.opacity = base + Math.sin(time * 1.2 + child.position.x * 0.05) * 0.15;
            }
        });

        // Obstacle animations
        obj.obstacles.children.forEach(child => {
            if (child.userData.isCore) {
                child.position.y = child.userData.baseY + Math.sin(time * 1.5) * 0.4;
                if (child.rotation) {
                    child.rotation.y = time * 0.5;
                    child.rotation.x = Math.sin(time * 0.8) * 0.3;
                }
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = 0.06 + Math.sin(time * 2.5) * 0.04;
                }
            }
            if (child.userData.floatingOrb) {
                child.position.y = child.userData.baseY + Math.sin(time * 1.3 + child.userData.phase) * 0.35;
            }
            if (child.userData.altarRing) {
                child.material.opacity = 0.18 + Math.sin(time * 1.8) * 0.1;
                child.rotation.z = time * 0.15;
            }
            if (child.userData.ghostFire) {
                child.position.y = child.userData.baseY + Math.sin(time * 3.0 + child.userData.phase) * 0.15;
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = 0.35 + Math.sin(time * 4.0 + child.userData.phase) * 0.15;
                }
                if (child.scale) {
                    const s = 1 + Math.sin(time * 3.5 + child.userData.phase) * 0.2;
                    child.scale.setScalar(s);
                }
            }
        });

        // Edge glow pulse
        if (obj.edgeGlow) {
            obj.edgeGlow.children.forEach(child => {
                if (child.userData.edgeGlow) {
                    child.material.opacity = child.userData.baseOpacity + Math.sin(time * 0.5) * 0.03;
                }
            });
        }

        // Particles drift up and sideways
        if (obj.particles) {
            const pos = obj.particles.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] += 0.005;
                pos[i] += Math.sin(time * 0.3 + i * 0.7) * 0.003;
                pos[i + 2] += Math.cos(time * 0.2 + i * 0.5) * 0.002;
                if (pos[i + 1] > 9) pos[i + 1] = 0.3;
                // Keep within arena
                if (pos[i] > HALF_W) pos[i] = -HALF_W;
                if (pos[i] < -HALF_W) pos[i] = HALF_W;
                if (pos[i + 2] > HALF_D) pos[i + 2] = -HALF_D;
                if (pos[i + 2] < -HALF_D) pos[i + 2] = HALF_D;
            }
            obj.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    // ══════════════════════════════════════════════
    //  OBSTACLE COLLISION
    // ══════════════════════════════════════════════
    function isCollidingObstacle(x, z) {
        for (const ob of OBSTACLE_POSITIONS) {
            const dx = x - ob.x;
            const dz = z - ob.z;
            if (dx * dx + dz * dz < ob.r * ob.r) return true;
        }
        return false;
    }

    function clampObstacle(x, z) {
        for (const ob of OBSTACLE_POSITIONS) {
            const dx = x - ob.x;
            const dz = z - ob.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < ob.r && dist > 0.001) {
                const nx = dx / dist;
                const nz = dz / dist;
                return { x: ob.x + nx * ob.r, z: ob.z + nz * ob.r };
            }
        }
        return { x, z };
    }

    return {
        build, animate, isInsideArena, clampToArena,
        isCollidingObstacle, clampObstacle,
        HALF_W, HALF_D, OBSTACLE_POSITIONS
    };
})();

/* ══════════════════════════════════════════════════════════════
   Input Handler — Keyboard + Click attacks (no mouse-look needed)
   ══════════════════════════════════════════════════════════════ */

const InputHandler = (() => {
    const keys = {};
    let onAttackCallback = null;
    let onSpecialCallback = null;
    let onAbilityCallback = null;

    function init(canvas) {
        // ── Keyboard ──────────────
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;

            // Special attack
            if (e.code === 'KeyE' && onSpecialCallback) {
                onSpecialCallback();
            }
            // Space bar also attacks
            if (e.code === 'Space' && onAttackCallback) {
                e.preventDefault();
                if (!e.repeat) onAttackCallback(); // Prevent holding key spam
            }
            // Ability
            if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyQ') && onAbilityCallback) {
                onAbilityCallback();
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });

        // ── Mouse click = melee attack (no pointer lock!) ──
        canvas.addEventListener('click', () => {
            if (onAttackCallback) onAttackCallback();
        });

        // ── Touch (mobile) ────────
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Double tap = special attack
            if (e.touches.length === 2 && onSpecialCallback) {
                onSpecialCallback();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Tap = melee attack
            if (e.touches.length === 0 && onAttackCallback) {
                onAttackCallback();
            }
        }, { passive: false });
    }

    function getMovement() {
        const move = { x: 0, z: 0 };
        if (keys['KeyW'] || keys['ArrowUp']) move.z = -1;
        if (keys['KeyS'] || keys['ArrowDown']) move.z = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) move.x = -1;
        if (keys['KeyD'] || keys['ArrowRight']) move.x = 1;

        // Normalize diagonal movement
        const len = Math.sqrt(move.x * move.x + move.z * move.z);
        if (len > 0) {
            move.x /= len;
            move.z /= len;
        }

        return move;
    }

    // Keep getMouseDelta for backward compatibility (returns zeros)
    function getMouseDelta() {
        return { dx: 0, dy: 0 };
    }

    function isLocked() { return false; }

    function onAttack(cb) { onAttackCallback = cb; }
    function onSpecial(cb) { onSpecialCallback = cb; }
    function onAbility(cb) { onAbilityCallback = cb; }

    return { init, getMovement, getMouseDelta, isLocked, onAttack, onSpecial, onAbility };
})();

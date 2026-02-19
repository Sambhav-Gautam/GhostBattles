/* ══════════════════════════════════════════════════════════════
   Ghost Battles — Assets (SVGs & Icons)
   Replaces all emojis with professional vector graphics
   ══════════════════════════════════════════════════════════════ */

const Assets = (() => {
    // Helper to wrap SVG path in a full <svg> string
    const wrapSVG = (path, viewBox = "0 0 24 24", className = "") =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${className}" fill="currentColor">${path}</svg>`;

    const api = {
        // ── UI Icons ──────────────────────────────────────
        ICONS: {
            HEART: wrapSVG('<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>', "0 0 24 24", "icon-heart"),

            SKULL: wrapSVG('<path d="M12 2c-4.42 0-8 3.58-8 8 0 2.58 1.25 4.88 3.16 6.31.29 1.15.54 2.51.54 2.51 0 .68.45 1.18 1.12 1.18h6.36c.67 0 1.12-.5 1.12-1.18 0 0 .25-1.36.54-2.51C18.75 14.88 20 12.58 20 10c0-4.42-3.58-8-8-8zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-3-4c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 8 15 8s1.5.67 1.5 1.5S15.83 11 15 11z"/>', "0 0 24 24", "icon-skull"),

            LIGHTNING: wrapSVG('<path d="M7 2v11h3v9l7-12h-4l4-8z"/>', "0 0 24 24", "icon-lightning"),

            FIRE: wrapSVG('<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>', "0 0 24 24", "icon-fire"),

            GHOST: wrapSVG('<path d="M12 2C7.58 2 4 5.58 4 10v12l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V10c0-4.42-3.58-8-8-8zm-3 8c-.83 0-1.5-.67-1.5-1.5S8.17 7 9 7s1.5.67 1.5 1.5S9.83 10 9 10zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 7 15 7s1.5.67 1.5 1.5S15.83 10 15 10z"/>', "0 0 24 24", "icon-ghost"),

            SWORD: wrapSVG('<path d="M19.88 3.12c-.59-.59-1.53-.59-2.12 0l-7.78 7.78-3.54-3.54-1.41 1.41 3.54 3.54-7.78 7.78c-.59.59-.59 1.53 0 2.12.59.59 1.53.59 2.12 0l7.78-7.78 3.54 3.54 1.41-1.41-3.54-3.54 7.78-7.78c.59-.59.59-1.53 0-2.12z"/>', "0 0 24 24", "icon-sword"),

            // Weapons
            HOLY_WATER: wrapSVG('<path d="M12 2C12 2 8 6 8 11s2 9 4 9 4-4 4-9-4-9-4-9z"/>', "0 0 24 24", "icon-water"),
            SACRED_CROSS: wrapSVG('<path d="M11 2h2v6h6v2h-6v12h-2V10H5V8h6V2z"/>', "0 0 24 24", "icon-cross"),
            SILVER_DAGGER: wrapSVG('<path d="M12.5.67L19.5 7.67L18.09 9.08L14 5V18.17L12 20.17L10 18.17V5L5.91 9.08L4.5 7.67L11.5.67H12.5Z"/>', "0 0 24 24", "icon-dagger"),
            BINDING_CHAINS: wrapSVG('<path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h10v2H7z"/>', "0 0 24 24", "icon-chains"),
            SAGE_SMUDGE: wrapSVG('<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>', "0 0 24 24", "icon-sage"),
            EXORCIST_BIBLE: wrapSVG('<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>', "0 0 24 24", "icon-book"),
        },

        // ── Weapon SVG Paths (for use in textures/rendering) ──
        WEAPONS: {
            DAGGER: "M12,2L14,5L13,18L12,22L11,18L10,5L12,2M12,18H10V21H14V18H12Z",
            SCYTHE: "M18,2C18,2 14,3 12,6C10,9 10,14 12,18L10,22L8,18C6,14 6,9 8,6C10,3 14,2 14,2M12,6L18,6L18,8L12,8V6Z",
        },

        // Helper to inject icons into elements
        inject: (elementId, iconName) => {
            const el = document.getElementById(elementId);
            if (el && Assets.ICONS[iconName]) el.innerHTML = Assets.ICONS[iconName];
        },

        getIcon: (iconName) => Assets.ICONS[iconName] || ''
    };

    window.Assets = api;
    return api;
})();

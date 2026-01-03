/* ============================================================
   FILE: security.js - 
   ============================================================ */

(() => {
    const CONFIG = {
        RATE_LIMIT: 3000,
        MAX_VIOLATIONS: 3,
        BLOCK_DURATION: 60000,
        STORAGE_KEYS: {
            BLOCK_TS: 'sys_st_01',
            LAST_ACT: 'sys_st_02',
            V_COUNT: 'sys_st_03'
        }
    };

    const SecurityEngine = {
        init() {
            this.setupListeners();
            return this.isAuthorized();
        },

        isAuthorized() {
            const now = Date.now();
            const blockedUntil = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.BLOCK_TS)) || 0;
            const lastAction = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ACT)) || 0;
            let violations = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.V_COUNT)) || 0;

            // 1. Check Block Status
            if (now < blockedUntil) {
                const timeLeft = Math.ceil((blockedUntil - now) / 1000);
                console.warn(`Access restricted. Retry in ${timeLeft}s.`);
                return false;
            }

            // 2. Rate Limiting Logic
            if (now - lastAction < CONFIG.RATE_LIMIT) {
                violations++;
                localStorage.setItem(CONFIG.STORAGE_KEYS.V_COUNT, violations);

                if (violations >= CONFIG.MAX_VIOLATIONS) {
                    this.triggerCooldown();
                } else {
                    alert("⚠️ Mohon tidak melakukan spam!");
                }
                return false;
            }

            // 3. Reset on success
            localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_ACT, now);
            localStorage.setItem(CONFIG.STORAGE_KEYS.V_COUNT, 0);
            return true;
        },

        triggerCooldown() {
            const blockEnd = Date.now() + CONFIG.BLOCK_DURATION;
            localStorage.setItem(CONFIG.STORAGE_KEYS.BLOCK_TS, blockEnd);
            alert("Aktivitas mencurigakan terdeteksi. Akses dibatasi sementara.");
            window.location.reload();
        },

        setupListeners() {
            // Disable Right Click
            document.addEventListener('contextmenu', e => e.preventDefault());

            // Disable DevTools Shortcuts
            document.addEventListener('keydown', e => {
                const forbiddenKeys = [73, 74, 67, 85]; // I, J, C, U
                const isDevTools = (e.ctrlKey && e.shiftKey && forbiddenKeys.includes(e.keyCode)) || 
                                   (e.ctrlKey && e.keyCode === 85) || // Ctrl+U (View Source)
                                   (e.keyCode === 123); // F12

                if (isDevTools) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    };

    // Export ke window secara aman atau gunakan sebagai internal logic
    window.SecurityProtocol = SecurityEngine;
    SecurityEngine.init();
})();

/**
 * Main JavaScript functionality for CineCalidad Stremio Addon configuration page
 */

// Configuration
const CONFIG = {
    SERVER_URL: 'https://cinecalidad-stremio-addon-latest.onrender.com',
    MANIFEST_URL: 'https://cinecalidad-stremio-addon-latest.onrender.com/manifest.json',
    CHECK_INTERVAL: 30000, // 30 seconds
    TIMEOUT: 10000 // 10 seconds
};

// DOM Elements
const elements = {
    copyUrlBtn: document.getElementById('copyUrl'),
    copyManualUrlBtn: document.getElementById('copyManualUrl'),
    addonUrl: document.getElementById('addonUrl'),
    serverStatus: document.getElementById('serverStatus'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

/**
 * Initialize the application
 */
function init() {
    setupEventListeners();
    checkServerStatus();
    startStatusMonitoring();
    setupInstallButton();
    
    // Add loading animation to cards
    animateCards();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Copy URL buttons
    if (elements.copyUrlBtn) {
        elements.copyUrlBtn.addEventListener('click', () => {
            copyToClipboard(CONFIG.MANIFEST_URL, '¡URL del addon copiada!');
        });
    }
    
    if (elements.copyManualUrlBtn) {
        elements.copyManualUrlBtn.addEventListener('click', () => {
            copyToClipboard(CONFIG.MANIFEST_URL, '¡URL copiada al portapapeles!');
        });
    }
    
    // Install button click tracking
    const installBtn = document.querySelector('.install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', (e) => {
            // Track installation attempt
            trackEvent('addon_install_attempt');
            
            // Show helper toast
            showToast('Redirigiendo a Stremio...', 'info');
        });
    }
    
    // FAQ toggle animation
    const faqDetails = document.querySelectorAll('.faq details');
    faqDetails.forEach(detail => {
        detail.addEventListener('toggle', (e) => {
            if (e.target.open) {
                trackEvent('faq_opened', { question: e.target.querySelector('summary').textContent });
            }
        });
    });
    
    // Link click tracking
    document.addEventListener('click', (e) => {
        if (e.target.matches('a[href^="http"]')) {
            const url = e.target.href;
            trackEvent('external_link_click', { url });
        }
    });
}

/**
 * Setup install button with fallback
 */
function setupInstallButton() {
    const installBtn = document.querySelector('.install-btn');
    if (!installBtn) return;
    
    // Check if running on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // On mobile, provide alternative installation methods
        installBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMobileInstallDialog();
        });
    }
}

/**
 * Show mobile installation dialog
 */
function showMobileInstallDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'mobile-dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>📱 Instalación en Móvil</h3>
            <p>Para instalar en dispositivos móviles:</p>
            <ol>
                <li>Abre la app de Stremio</li>
                <li>Ve a Settings → Addons</li>
                <li>Copia esta URL:</li>
            </ol>
            <div class="url-box">
                <code>${CONFIG.MANIFEST_URL}</code>
                <button class="copy-btn" onclick="copyToClipboard('${CONFIG.MANIFEST_URL}', '¡URL copiada!')">📋</button>
            </div>
            <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">Entendido</button>
        </div>
    `;
    
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        padding: 20px;
    `;
    
    dialog.querySelector('.dialog-content').style.cssText = `
        background: var(--background-secondary);
        padding: 30px;
        border-radius: var(--border-radius);
        max-width: 400px;
        width: 100%;
    `;
    
    document.body.appendChild(dialog);
    
    // Close on background click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, successMessage = '¡Copiado!') {
    try {
        // Modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'success');
            return true;
        }
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast(successMessage, 'success');
                return true;
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        } finally {
            document.body.removeChild(textArea);
        }
        
        // If all fails, show manual copy instruction
        showToast('Copia manualmente: Ctrl+C', 'error');
        return false;
        
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Error al copiar. Intenta manualmente.', 'error');
        return false;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    if (!elements.toast || !elements.toastMessage) return;
    
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

/**
 * Check server status
 */
async function checkServerStatus() {
    if (!elements.serverStatus) return;
    
    elements.serverStatus.textContent = 'Verificando...';
    elements.serverStatus.className = 'status-indicator checking';
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        const response = await fetch(CONFIG.MANIFEST_URL, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            elements.serverStatus.textContent = 'En línea';
            elements.serverStatus.className = 'status-indicator online';
            trackEvent('server_status_check', { status: 'online' });
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('Server status check failed:', error.message);
        elements.serverStatus.textContent = 'Desconectado';
        elements.serverStatus.className = 'status-indicator offline';
        trackEvent('server_status_check', { status: 'offline', error: error.message });
    }
}

/**
 * Start monitoring server status
 */
function startStatusMonitoring() {
    // Check immediately
    checkServerStatus();
    
    // Then check periodically
    setInterval(checkServerStatus, CONFIG.CHECK_INTERVAL);
    
    // Check when page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkServerStatus();
        }
    });
}

/**
 * Animate cards on load
 */
function animateCards() {
    const cards = document.querySelectorAll('.card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animationPlayState = 'paused';
        observer.observe(card);
    });
}

/**
 * Track events (placeholder for analytics)
 */
function trackEvent(eventName, properties = {}) {
    console.log('Event:', eventName, properties);
    
    // Here you could integrate with analytics services like:
    // - Google Analytics
    // - Plausible
    // - Matomo
    // - Custom analytics endpoint
    
    // Example:
    // gtag('event', eventName, properties);
    // or
    // plausible(eventName, { props: properties });
}

/**
 * Get device info for better UX
 */
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    return {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/.test(userAgent),
        isMac: platform.includes('Mac'),
        isWindows: platform.includes('Win'),
        isLinux: platform.includes('Linux')
    };
}

/**
 * Handle online/offline status
 */
function setupConnectionMonitoring() {
    function updateConnectionStatus() {
        if (navigator.onLine) {
            checkServerStatus();
        } else {
            if (elements.serverStatus) {
                elements.serverStatus.textContent = 'Sin conexión';
                elements.serverStatus.className = 'status-indicator offline';
            }
        }
    }
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+C or Cmd+C to copy manifest URL
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            copyToClipboard(CONFIG.MANIFEST_URL, '¡URL del manifest copiada!');
        }
        
        // Escape to close any open dialogs
        if (e.key === 'Escape') {
            const dialog = document.querySelector('.mobile-dialog');
            if (dialog) {
                dialog.remove();
            }
        }
    });
}

/**
 * Initialize when DOM is loaded
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Setup additional features
setupConnectionMonitoring();
setupKeyboardShortcuts();

// Global functions for inline event handlers
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;

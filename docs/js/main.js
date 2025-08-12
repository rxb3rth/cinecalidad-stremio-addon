// Configuration
const CONFIG = {
    SERVER_URL: 'https://cinecalidad-stremio-addon-latest.onrender.com',
    MANIFEST_PATH: '/manifest.json'
};

// Status checking
async function checkServerStatus() {
    const statusElement = document.getElementById('serverStatus');
    if (!statusElement) return;

    try {
        statusElement.className = 'status-indicator checking';
        statusElement.textContent = 'Checking...';

        const response = await fetch(`${CONFIG.SERVER_URL}${CONFIG.MANIFEST_PATH}`, {
            method: 'HEAD',
            cache: 'no-cache'
        });

        if (response.ok) {
            statusElement.className = 'status-indicator online';
            statusElement.textContent = 'Online';
        } else {
            statusElement.className = 'status-indicator offline';
            statusElement.textContent = 'Offline';
        }
    } catch (error) {
        statusElement.className = 'status-indicator offline';
        statusElement.textContent = 'Offline';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Set current year
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Check server status
    checkServerStatus();
    
    // Check server status every 30 seconds
    setInterval(checkServerStatus, 30000);
});

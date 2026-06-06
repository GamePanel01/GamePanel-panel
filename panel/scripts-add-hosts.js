const hostStorageKey = 'gamePanelHosts';
const settingsStorageKey = 'gamePanelHostSettings';

function showMessage(message, type = 'success') {
    const box = document.getElementById('message-box');
    if (!box) return;
    box.textContent = message;
    box.className = `message-box ${type}`;
}

function getSavedSettings() {
    try {
        const saved = localStorage.getItem(settingsStorageKey);
        return saved ? JSON.parse(saved) : { apiUrl: '/api/hosts' };
    } catch (err) {
        return { apiUrl: '/api/hosts' };
    }
}

function saveSettings(settings) {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

function getLocalHosts() {
    try {
        const saved = localStorage.getItem(hostStorageKey);
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        return [];
    }
}

function saveLocalHosts(hosts) {
    localStorage.setItem(hostStorageKey, JSON.stringify(hosts));
}

async function fetchHostList(apiUrl) {
    if (!apiUrl) {
        return getLocalHosts();
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
            return data;
        }

        if (data && data.hosts && Array.isArray(data.hosts)) {
            return data.hosts;
        }

        return getLocalHosts();
    } catch (error) {
        console.warn('API konnte nicht geladen werden, verwende lokalen Speicher.', error);
        return getLocalHosts();
    }
}

async function sendHostToApi(host, apiUrl) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(host)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        throw error;
    }
}

function renderHostRows(hosts) {
    const body = document.getElementById('host-table-body');
    if (!body) return;

    body.innerHTML = '';
    if (!hosts || hosts.length === 0) {
        body.innerHTML = '<tr><td colspan="4">Keine Hosts gefunden.</td></tr>';
        return;
    }

    hosts.forEach((host) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${host.name || '-'} </td>
            <td>${host.address || '-'} </td>
            <td>${host.api || host.apiUrl || '-'}</td>
            <td>${host.status || 'geladen'}</td>
        `;
        body.appendChild(row);
    });
}

async function loadHosts() {
    const settings = getSavedSettings();
    const apiUrlInput = document.getElementById('input-api-url');

    if (apiUrlInput) {
        apiUrlInput.value = settings.apiUrl || '/api/hosts';
    }

    const hosts = await fetchHostList(settings.apiUrl);
    renderHostRows(hosts);
}

async function handleSaveHost() {
    const nameField = document.getElementById('input-host-name');
    const addressField = document.getElementById('input-host-address');
    const apiField = document.getElementById('input-api-url');

    if (!nameField || !addressField || !apiField) {
        showMessage('Formular nicht gefunden.', 'error');
        return;
    }

    const name = nameField.value.trim();
    const address = addressField.value.trim();
    const apiUrl = apiField.value.trim() || '/api/hosts';

    if (!name || !address) {
        showMessage('Bitte gib einen Hostnamen und eine Adresse ein.', 'error');
        return;
    }

    saveSettings({ apiUrl });

    const newHost = {
        name,
        address,
        api: apiUrl,
        status: 'gespeichert'
    };

    try {
        await sendHostToApi(newHost, apiUrl);
        showMessage('Host erfolgreich an die API gesendet und in CSV gespeichert.', 'success');
    } catch (error) {
        const currentHosts = getLocalHosts();
        const savedHosts = [...currentHosts, newHost];
        saveLocalHosts(savedHosts);
        showMessage('API nicht erreichbar. Host lokal gespeichert.', 'warning');
    }

    nameField.value = '';
    addressField.value = '';
    loadHosts();
}

function buildCsvText(hosts) {
    const header = ['name', 'address', 'api'];
    const rows = hosts.map(host => [host.name || '', host.address || '', host.api || '']);
    const csvLines = [header.join(','), ...rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))];
    return csvLines.join('\r\n');
}

function downloadCsv(content, filename = 'hosts.csv') {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function exportHostsAsCsv() {
    const settings = getSavedSettings();
    const apiUrl = settings.apiUrl || '/api/hosts';
    let hosts = await fetchHostList(apiUrl);

    if (!hosts || hosts.length === 0) {
        hosts = getLocalHosts();
    }

    const csvText = buildCsvText(hosts);
    downloadCsv(csvText, 'hosts.csv');
}

function bindSaveButton() {
    const saveButton = document.getElementById('save-host-button');
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveHost);
    }

    const exportButton = document.getElementById('export-csv-button');
    if (exportButton) {
        exportButton.addEventListener('click', exportHostsAsCsv);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    bindSaveButton();
    loadHosts();
});

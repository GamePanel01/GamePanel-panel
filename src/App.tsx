import React, { useEffect, useMemo, useState } from 'react';
import { ApiClient, clearStoredAuth, getStoredApiKey, getStoredBaseUrl, storeApiKey } from './api/client';
import { ApiInfo, FileEntry, FileInfo, ProcessItem, ServerItem, ServerLogEntry, SystemInfo } from './types';

type ViewKey = 'overview' | 'servers' | 'api' | 'system' | 'files';

type ServerAction = 'start' | 'stop';
type ServerTab = 'details' | 'files' | 'cli' | 'logs';

const DEFAULT_SERVERS: ServerItem[] = [];
const DEFAULT_FILES: FileEntry[] = [];
const DEFAULT_PROCESSES: ProcessItem[] = [];
const DEFAULT_LOGS: ServerLogEntry[] = [];

function Badge({ status }: { status: string }) {
  return (
    <span className={`status-pill status-${status}`}>
      {status.replace(/^(.)/, (match) => match.toUpperCase())}
    </span>
  );
}

function LoginPage({ onLogin }: { onLogin: (apiKey: string, baseUrl: string) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  return (
    <div className="main-area">
      <div className="topbar">
        <div>
          <h1>GameServer Webinterface</h1>
          <p style={{ color: 'var(--muted)' }}>Gib deinen API-Key und die Backend-URL ein, um fortzufahren.</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="form-group">
          <label>Backend Base URL</label>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="http://localhost:3000" />
        </div>
        <div className="form-group">
          <label>API-Key</label>
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="gs_..." />
        </div>
        <div className="notice alert">
          <strong>Hinweis</strong>
          <p>Der Key wird lokal im Browser gespeichert. Er kann nach dem Login genutzt werden, um Backend-Server zu konfigurieren.</p>
        </div>
        <button className="button-primary" onClick={() => onLogin(apiKey.trim(), baseUrl.trim())}>Login</button>
      </div>
    </div>
  );
}

function Sidebar({ activeView, setActiveView }: { activeView: ViewKey; setActiveView: (view: ViewKey) => void }) {
  return (
    <aside className="sidebar">
      <div>
        <h2>GameServer Panel</h2>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>Verwaltung, API-Info und Server-Setup im Proxmox-ähnlichen Layout.</p>
      </div>
      <nav>
        <a className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>Übersicht</a>
        <a className={`nav-item ${activeView === 'servers' ? 'active' : ''}`} onClick={() => setActiveView('servers')}>Backend-Server</a>
        <a className={`nav-item ${activeView === 'api' ? 'active' : ''}`} onClick={() => setActiveView('api')}>API & Dokumentation</a>
        <a className={`nav-item ${activeView === 'system' ? 'active' : ''}`} onClick={() => setActiveView('system')}>System</a>
        <a className={`nav-item ${activeView === 'files' ? 'active' : ''}`} onClick={() => setActiveView('files')}>Dateien</a>
      </nav>
    </aside>
  );
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [view, setView] = useState<ViewKey>('overview');
  const [servers, setServers] = useState<ServerItem[]>(DEFAULT_SERVERS);
  const [info, setInfo] = useState<ApiInfo | null>(null);
  const [health, setHealth] = useState<string>('Noch keine Verbindung');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [directoryPath, setDirectoryPath] = useState('/opt/gameservers');
  const [fileEntries, setFileEntries] = useState<FileEntry[]>(DEFAULT_FILES);
  const [selectedFilePath, setSelectedFilePath] = useState('/opt/gameservers/minecraft/server.properties');
  const [selectedFileContent, setSelectedFileContent] = useState('');
  const [selectedFileInfo, setSelectedFileInfo] = useState<FileInfo | null>(null);
  const [searchPattern, setSearchPattern] = useState('server.*\\.properties');
  const [commandInput, setCommandInput] = useState('java -version');
  const [commandOutput, setCommandOutput] = useState('');
  const [selectedServer, setSelectedServer] = useState<ServerItem | null>(null);
  const [selectedServerTab, setSelectedServerTab] = useState<ServerTab>('details');
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>(DEFAULT_LOGS);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [processFilter, setProcessFilter] = useState('java');
  const [processes, setProcesses] = useState<ProcessItem[]>(DEFAULT_PROCESSES);

  const client = useMemo(() => new ApiClient({ baseUrl, apiKey }), [baseUrl, apiKey]);

  useEffect(() => {
    const storedKey = getStoredApiKey();
    const storedUrl = getStoredBaseUrl();
    if (storedKey) {
      setApiKey(storedKey);
      setBaseUrl(storedUrl);
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    async function loadInfo() {
      try {
        const [infoResult, healthResult, serversResult] = await Promise.all([
          client.getInfo(),
          client.getHealth(),
          client.getServers()
        ]);

        setInfo(infoResult.data ?? null);
        setHealth(healthResult.data?.message ?? 'Backend erreichbar');
        setServers(serversResult.data ?? []);
      } catch (error) {
        setMessage((error as Error).message);
      }
    }

    loadInfo();
  }, [apiKey, baseUrl, client]);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    async function loadFileData() {
      if (view !== 'files' && !selectedServer) {
        return;
      }

      try {
        const pathToLoad = selectedServer ? selectedServer.path : directoryPath;
        const fileList = await client.listFiles(pathToLoad);
        setFileEntries(fileList.data?.files ?? []);
        setDirectoryPath(pathToLoad);
      } catch (error) {
        setMessage((error as Error).message);
      }
    }

    loadFileData();
  }, [view, apiKey, baseUrl, client, directoryPath, selectedServer]);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    async function loadSystemData() {
      if (view !== 'system') {
        return;
      }

      try {
        const [systemResult, processResult] = await Promise.all([
          client.getSystemInfo(),
          client.getProcesses(processFilter)
        ]);

        setSystemInfo(systemResult.data ?? null);
        setProcesses(processResult.data?.processes ?? []);
      } catch (error) {
        setMessage((error as Error).message);
      }
    }

    loadSystemData();
  }, [view, apiKey, baseUrl, client, processFilter]);

  function handleLogin(key: string, url: string) {
    if (!key || !url) {
      setMessage('Bitte Base URL und API-Key eingeben.');
      return;
    }
    setApiKey(key);
    setBaseUrl(url);
    storeApiKey(key, url);
    setMessage(null);
  }

  function handleLogout() {
    clearStoredAuth();
    setApiKey('');
    setInfo(null);
    setServers(DEFAULT_SERVERS);
    setMessage(null);
    setHealth('Noch keine Verbindung');
  }

  async function refreshServers() {
    setIsLoading(true);
    try {
      const result = await client.getServers();
      setServers(result.data ?? []);
      setMessage('Serverliste aktualisiert.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshFileList() {
    setIsLoading(true);
    try {
      const pathToLoad = selectedServer ? selectedServer.path : directoryPath;
      const fileList = await client.listFiles(pathToLoad);
      setFileEntries(fileList.data?.files ?? []);
      setDirectoryPath(pathToLoad);
      setMessage('Dateiliste aktualisiert.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function selectServer(server: ServerItem) {
    setSelectedServer(server);
    setSelectedServerTab('details');
    setDirectoryPath(server.path);
    setSelectedFilePath(`${server.path}/server.properties`);
    setCommandOutput('');
    setMessage(`Server ${server.name} ausgewählt.`);
  }

  async function fetchServerLogs(serverId: number) {
    setIsLoading(true);
    try {
      const result = await client.getServerLogs(serverId);
      setServerLogs(result.data ?? []);
      setMessage('Server-Logs geladen.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveServerResources(updated: Partial<ServerItem>) {
    if (!selectedServer) return;
    setIsLoading(true);
    try {
      const response = await client.updateServer(selectedServer.id, updated);
      const updatedServer = response.data ?? selectedServer;
      setSelectedServer(updatedServer);
      setServers((prev) => prev.map((item) => (item.id === selectedServer.id ? updatedServer : item)));
      setDirectoryPath(updatedServer.path);
      setMessage('Server-Ressourcen erfolgreich gespeichert.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function runCommand() {
    setIsLoading(true);
    try {
      const result = await client.executeCommand(commandInput.split(' ')[0], commandInput.split(' ').slice(1));
      setCommandOutput(`stdout:\n${result.data?.stdout ?? ''}\n\nstderr:\n${result.data?.stderr ?? ''}`);
      setMessage('Kommando ausgeführt.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function readFile(path: string) {
    setIsLoading(true);
    try {
      const file = await client.readFile(path);
      setSelectedFileContent(file.data?.content ?? '');
      setSelectedFilePath(path);
      setMessage(`Datei ${path} geladen.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchFileInfo(path: string) {
    setIsLoading(true);
    try {
      const info = await client.getFileInfo(path);
      setSelectedFileInfo(info.data ?? null);
      setSelectedFilePath(path);
      setMessage(`Info für ${path} geladen.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function searchFiles() {
    setIsLoading(true);
    try {
      const results = await client.searchFiles(directoryPath, searchPattern);
      setFileEntries(results.data?.files ?? []);
      setMessage('Suche abgeschlossen.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshProcesses() {
    setIsLoading(true);
    try {
      const result = await client.getProcesses(processFilter);
      setProcesses(result.data?.processes ?? []);
      setMessage('Prozessliste aktualisiert.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function createServer(payload: Partial<ServerItem>) {
    setIsLoading(true);
    try {
      const response = await client.createServer(payload);
      setServers((prev) => [...(response.data ? [response.data] : []), ...prev]);
      setMessage('Server erfolgreich erstellt.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateServer(id: number, payload: Partial<ServerItem>) {
    setIsLoading(true);
    try {
      const response = await client.updateServer(id, payload);
      setServers((prev) => prev.map((item) => (item.id === id ? response.data ?? item : item)));
      setMessage('Server erfolgreich aktualisiert.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteServer(id: number) {
    setIsLoading(true);
    try {
      await client.deleteServer(id);
      setServers((prev) => prev.filter((item) => item.id !== id));
      setMessage('Server erfolgreich gelöscht.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleServer(id: number, action: 'start' | 'stop') {
    setIsLoading(true);
    try {
      const response = action === 'start' ? await client.startServer(id) : await client.stopServer(id);
      setServers((prev) => prev.map((item) => (item.id === id ? response.data ?? item : item)));
      setMessage(`Server wird ${action === 'start' ? 'gestartet' : 'gestoppt'}.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!apiKey) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="content">
      <Sidebar activeView={view} setActiveView={setView} />
      <main className="main-area">
        <div className="topbar">
          <div>
            <h1>GameServer Control Panel</h1>
            <p style={{ color: 'var(--muted)' }}>API: {baseUrl} • Status: {health}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="button-secondary" onClick={refreshServers} disabled={isLoading}>Aktualisieren</button>
            <button className="button-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {message && (
          <div className="notice alert" style={{ borderColor: 'var(--accent)' }}>
            {message}
          </div>
        )}

        {view === 'overview' && (
          <section>
            <div className="card-grid">
              <div className="card">
                <h3>Backend</h3>
                <p>Server-URL: {baseUrl}</p>
                <p>API-Key: {apiKey.slice(0, 10)}••••••</p>
              </div>
              <div className="card">
                <h3>API-Informationen</h3>
                <p>{info?.description ?? 'Keine Informationen verfügbar.'}</p>
                <p>Version: {info?.version ?? 'unbekannt'}</p>
              </div>
              <div className="card">
                <h3>Backend-Server</h3>
                <p>Verfügbar: {servers.length}</p>
                <p>Status: {servers.some((item) => item.status === 'running') ? 'mindestens ein Server läuft' : 'keine aktiven Server'}</p>
              </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h3>Schnellstart</h3>
              <p>Über das Menü auf der linken Seite kannst du Backend-Server hinzufügen, die API-Dokumentation einsehen und Systeminformationen abrufen.</p>
            </div>
          </section>
        )}

        {view === 'servers' && (
          <section>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3>Neuen Backend-Server hinzufügen</h3>
              <ServerForm onSubmit={createServer} disabled={isLoading} />
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <h3>Serverübersicht</h3>
                <span className="small-badge">{servers.length} Server</span>
              </div>
              <div className="table-wrapper" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Typ</th>
                      <th>Port</th>
                      <th>Status</th>
                      <th>Speicher</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servers.length ? servers.map((server) => (
                      <tr key={server.id}>
                        <td>{server.name}</td>
                        <td>{server.type}</td>
                        <td>{server.port}</td>
                        <td><Badge status={server.status} /></td>
                        <td>{server.memory_allocation} MB</td>
                        <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="button-secondary" onClick={() => toggleServer(server.id, server.status === 'running' ? 'stop' : 'start')}>{server.status === 'running' ? 'Stoppen' : 'Starten'}</button>
                          <button className="button-secondary" onClick={() => selectServer(server)}>Öffnen</button>
                          <button className="button-secondary" onClick={() => deleteServer(server.id)}>Löschen</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', color: 'var(--muted)' }}>Keine Backend-Server gefunden.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedServer && (
              <>
                <div className="card" style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <h3>Server: {selectedServer.name}</h3>
                      <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>{selectedServer.type} • {selectedServer.path}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {(['details', 'files', 'cli', 'logs'] as ServerTab[]).map((tab) => (
                        <button
                          key={tab}
                          className={`button-secondary ${selectedServerTab === tab ? 'active' : ''}`}
                          onClick={() => setSelectedServerTab(tab)}
                          style={{ minWidth: 110 }}
                        >
                          {tab === 'details' ? 'Details' : tab === 'files' ? 'Dateien' : tab === 'cli' ? 'CLI' : 'Logs'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedServerTab === 'details' && (
                  <div className="card" style={{ marginTop: 24 }}>
                    <h3>Ressourcen</h3>
                    <div style={{ display: 'grid', gap: 18 }}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Port</label>
                          <input type="number" value={selectedServer.port} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Speicher (MB)</label>
                          <input type="number" value={selectedServer.memory_allocation} onChange={(event) => setSelectedServer({ ...selectedServer, memory_allocation: Number(event.target.value) })} />
                        </div>
                      </div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Java-Version</label>
                          <input value={selectedServer.java_version} onChange={(event) => setSelectedServer({ ...selectedServer, java_version: event.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Pfad</label>
                          <input value={selectedServer.path} onChange={(event) => setSelectedServer({ ...selectedServer, path: event.target.value })} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="button-primary" onClick={() => saveServerResources({ memory_allocation: selectedServer.memory_allocation, java_version: selectedServer.java_version, path: selectedServer.path })} disabled={isLoading}>Ressourcen speichern</button>
                        <button className="button-secondary" onClick={() => fetchServerLogs(selectedServer.id)}>Logs laden</button>
                        <button className="button-secondary" onClick={refreshFileList}>Server-Dateien laden</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedServerTab === 'cli' && (
                  <div className="card" style={{ marginTop: 24 }}>
                    <h3>Server CLI</h3>
                    <div className="form-group">
                      <label>Kommando</label>
                      <input value={commandInput} onChange={(event) => setCommandInput(event.target.value)} />
                    </div>
                    <button className="button-primary" onClick={runCommand} disabled={isLoading}>Ausführen</button>
                    <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, minHeight: 140 }}>{commandOutput || 'Ausgabe erscheint hier.'}</pre>
                  </div>
                )}

                {selectedServerTab === 'files' && (
                  <div className="card" style={{ marginTop: 24 }}>
                    <h3>Server-Dateien</h3>
                    <p style={{ color: 'var(--muted)' }}>Basis-Pfad: {selectedServer.path}</p>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Pfad</label>
                        <input value={directoryPath} onChange={(event) => setDirectoryPath(event.target.value)} />
                      </div>
                      <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button className="button-primary" onClick={refreshFileList} disabled={isLoading}>Verzeichnis laden</button>
                      </div>
                    </div>
                    <div className="table-wrapper" style={{ marginTop: 16 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Typ</th>
                            <th>Größe</th>
                            <th>Geändert</th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fileEntries.length ? fileEntries.map((entry) => (
                            <tr key={entry.path}>
                              <td>{entry.name}</td>
                              <td>{entry.type}</td>
                              <td>{entry.size} B</td>
                              <td>{entry.modified}</td>
                              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="button-secondary" onClick={() => readFile(entry.path)}>Lesen</button>
                                <button className="button-secondary" onClick={() => fetchFileInfo(entry.path)}>Info</button>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} style={{ padding: '20px', color: 'var(--muted)' }}>Keine Dateien gefunden.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div className="form-group">
                        <label>Dateipfad</label>
                        <input value={selectedFilePath} onChange={(event) => setSelectedFilePath(event.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="button-primary" onClick={() => readFile(selectedFilePath)} disabled={isLoading}>Lesen</button>
                        <button className="button-secondary" onClick={() => fetchFileInfo(selectedFilePath)} disabled={isLoading}>Info</button>
                      </div>
                      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, minHeight: 140 }}>{selectedFileContent || 'Wähle eine Datei zum Lesen aus.'}</pre>
                      {selectedFileInfo && (
                        <div style={{ marginTop: 16 }}>
                          <strong>Datei-Info</strong>
                          <p>Pfad: {selectedFileInfo.path}</p>
                          <p>Typ: {selectedFileInfo.type}</p>
                          <p>Größe: {selectedFileInfo.size} B</p>
                          <p>Geändert: {selectedFileInfo.modified}</p>
                          <p>Lesbar: {selectedFileInfo.isReadable ? 'Ja' : 'Nein'}</p>
                          <p>Schreibbar: {selectedFileInfo.isWritable ? 'Ja' : 'Nein'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedServerTab === 'logs' && (
                  <div className="card" style={{ marginTop: 24 }}>
                    <h3>Server-Logs</h3>
                    {serverLogs.length ? (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Zeit</th>
                              <th>Aktion</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {serverLogs.map((log) => (
                              <tr key={log.id}>
                                <td>{log.created_at}</td>
                                <td>{log.action}</td>
                                <td>{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--muted)' }}>Keine Logs geladen. Klicke auf „Logs laden“.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {view === 'api' && (
          <section>
            <div className="card-grid">
              <div className="card">
                <h3>API-Key-Verwaltung</h3>
                <p>Der API-Key wird beim Login gespeichert und ist für alle geschützten Endpoints erforderlich.</p>
                <p>Beachte: Die App nutzt den Header <code>Authorization: Bearer YOUR_API_KEY</code>.</p>
              </div>
              <div className="card">
                <h3>Wichtige Endpoints</h3>
                <p><strong>GET</strong> /api/info</p>
                <p><strong>GET</strong> /api/servers</p>
                <p><strong>POST</strong> /api/servers</p>
              </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
              <h3>Server-API Beispiel</h3>
              <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0 }}>
{`curl -H "Authorization: Bearer ${apiKey}" ${baseUrl}/api/servers`}
              </pre>
            </div>
          </section>
        )}

        {view === 'system' && (
          <section>
            <div className="card-grid">
              <div className="card">
                <h3>System-Informationen</h3>
                {systemInfo ? (
                  <div>
                    <p>Hostname: {systemInfo.system.hostname}</p>
                    <p>Uptime: {systemInfo.system.uptime}</p>
                    <p>CPU-Kerne: {systemInfo.system.cpuCores}</p>
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted)' }}>Lade Systeminformationen...</p>
                )}
              </div>
              <div className="card">
                <h3>Speicher & Disk</h3>
                {systemInfo ? (
                  <div>
                    <p>RAM: {systemInfo.system.memory.used} / {systemInfo.system.memory.total}</p>
                    <p>Festplatte: {systemInfo.system.disk.used} / {systemInfo.system.disk.total}</p>
                    <p>OS: {systemInfo.system.osInfo}</p>
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted)' }}>Lade Details...</p>
                )}
              </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <label>Prozessfilter</label>
                  <input value={processFilter} onChange={(event) => setProcessFilter(event.target.value)} placeholder="z.B. java" />
                </div>
                <button className="button-primary" onClick={() => refreshProcesses()} disabled={isLoading}>Prozesse aktualisieren</button>
              </div>
              <div className="table-wrapper" style={{ marginTop: 18 }}>
                <table>
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>User</th>
                      <th>CPU</th>
                      <th>RAM</th>
                      <th>Command</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.length ? processes.map((process) => (
                      <tr key={`${process.pid}-${process.command}`}>
                        <td>{process.pid}</td>
                        <td>{process.user}</td>
                        <td>{process.cpu}%</td>
                        <td>{process.memory}%</td>
                        <td>{process.command}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', color: 'var(--muted)' }}>Keine Prozesse verfügbar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {view === 'files' && (
          <section>
            <div className="card-grid">
              <div className="card">
                <h3>Verzeichnisliste</h3>
                <div className="form-group">
                  <label>Pfad</label>
                  <input value={directoryPath} onChange={(event) => setDirectoryPath(event.target.value)} />
                </div>
                <button className="button-primary" onClick={refreshFileList} disabled={isLoading}>Verzeichnis laden</button>
              </div>
              <div className="card">
                <h3>Dateisuche</h3>
                <div className="form-group">
                  <label>Regex-Muster</label>
                  <input value={searchPattern} onChange={(event) => setSearchPattern(event.target.value)} />
                </div>
                <button className="button-primary" onClick={searchFiles} disabled={isLoading}>Suchen</button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
              <h3>Dateien im Ordner</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Typ</th>
                      <th>Größe</th>
                      <th>Geändert</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileEntries.length ? fileEntries.map((entry) => (
                      <tr key={entry.path}>
                        <td>{entry.name}</td>
                        <td>{entry.type}</td>
                        <td>{entry.size} B</td>
                        <td>{entry.modified}</td>
                        <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="button-secondary" onClick={() => readFile(entry.path)}>Lesen</button>
                          <button className="button-secondary" onClick={() => fetchFileInfo(entry.path)}>Info</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', color: 'var(--muted)' }}>Keine Dateien gefunden.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
              <h3>Dateiinhalt</h3>
              <div className="form-group">
                <label>Dateipfad</label>
                <input value={selectedFilePath} onChange={(event) => setSelectedFilePath(event.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="button-primary" onClick={() => readFile(selectedFilePath)} disabled={isLoading}>Lesen</button>
                <button className="button-secondary" onClick={() => fetchFileInfo(selectedFilePath)} disabled={isLoading}>Info</button>
              </div>
              <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, minHeight: 180 }}>{selectedFileContent || 'Wähle eine Datei zum Lesen aus.'}</pre>
              {selectedFileInfo && (
                <div style={{ marginTop: 16 }}>
                  <strong>Datei-Info</strong>
                  <p>Pfad: {selectedFileInfo.path}</p>
                  <p>Typ: {selectedFileInfo.type}</p>
                  <p>Größe: {selectedFileInfo.size} B</p>
                  <p>Geändert: {selectedFileInfo.modified}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ServerForm({ onSubmit, disabled }: { onSubmit: (values: Partial<ServerItem>) => void; disabled: boolean }) {
  const [name, setName] = useState('minecraft-server-1');
  const [type, setType] = useState('minecraft');
  const [port, setPort] = useState(25565);
  const [path, setPath] = useState('/opt/gameservers/minecraft');
  const [memory, setMemory] = useState(2048);
  const [javaVersion, setJavaVersion] = useState('17');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({ name, type, port, path, memory_allocation: memory, java_version: javaVersion });
    setName('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Server-Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="form-group">
          <label>Server-Typ</label>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="minecraft">Minecraft</option>
            <option value="rust">Rust</option>
            <option value="csgo">CS:GO</option>
            <option value="generic">Generic</option>
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Port</label>
          <input type="number" value={port} onChange={(event) => setPort(parseInt(event.target.value, 10) || 0)} required />
        </div>
        <div className="form-group">
          <label>Speicher (MB)</label>
          <input type="number" value={memory} onChange={(event) => setMemory(parseInt(event.target.value, 10) || 1024)} />
        </div>
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Server-Pfad</label>
          <input value={path} onChange={(event) => setPath(event.target.value)} required />
        </div>
        <div className="form-group">
          <label>Java-Version</label>
          <input value={javaVersion} onChange={(event) => setJavaVersion(event.target.value)} />
        </div>
      </div>
      <button type="submit" className="button-primary" disabled={disabled}>Server anlegen</button>
    </form>
  );
}

export default App;

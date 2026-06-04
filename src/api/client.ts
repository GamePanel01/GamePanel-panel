import { ApiInfo, ApiResponse, CommandExecResponse, FileInfo, FileListResponse, FileReadResponse, HealthResponse, ProcessItem, ProcessListResponse, ServerItem, ServerLogEntry, SystemInfo } from '../types';

const STORAGE_KEY = '@gameserver-frontend:baseUrl';
const API_KEY_STORAGE = '@gameserver-frontend:apiKey';

export interface ApiClientOptions {
  baseUrl: string;
  apiKey?: string;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path, baseUrl);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export class ApiClient {
  baseUrl: string;
  apiKey?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
  }

  getHeaders(contentType = 'application/json') {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    const url = buildUrl(this.baseUrl, path, query);
    const init: RequestInit = {
      method,
      headers: this.getHeaders(method === 'GET' ? '' : 'application/json')
    };

    if (body != null) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.message || response.statusText || 'Unbekannter Fehler';
      throw new Error(message);
    }

    return data as ApiResponse<T>;
  }

  async getHealth() {
    return this.request<HealthResponse>('GET', '/health');
  }

  async getInfo() {
    return this.request<ApiInfo>('GET', '/api/info');
  }

  async getApiDocs() {
    return this.request<ApiResponse>('GET', '/api/docs');
  }

  async getServers() {
    return this.request<ServerItem[]>('GET', '/api/servers');
  }

  async createServer(payload: Partial<ServerItem>) {
    return this.request<ServerItem>('POST', '/api/servers', payload);
  }

  async updateServer(id: number, payload: Partial<ServerItem>) {
    return this.request<ServerItem>('PUT', `/api/servers/${id}`, payload);
  }

  async deleteServer(id: number) {
    return this.request<void>('DELETE', `/api/servers/${id}`);
  }

  async startServer(id: number) {
    return this.request<ServerItem>('POST', `/api/servers/${id}/start`);
  }

  async stopServer(id: number) {
    return this.request<ServerItem>('POST', `/api/servers/${id}/stop`);
  }

  async getServerLogs(id: number) {
    return this.request<ServerLogEntry[]>('GET', `/api/servers/${id}/logs`);
  }

  async executeCommand(command: string, args: string[] = []) {
    return this.request<CommandExecResponse>('POST', '/api/system/execute', { command, args });
  }

  async listFiles(path: string) {
    return this.request<FileListResponse>('GET', '/api/files/list', undefined, { path });
  }

  async readFile(path: string) {
    return this.request<FileReadResponse>('GET', '/api/files/read', undefined, { path });
  }

  async getFileInfo(path: string) {
    return this.request<FileInfo>('GET', '/api/files/info', undefined, { path });
  }

  async searchFiles(path: string, pattern: string) {
    return this.request<FileListResponse>('GET', '/api/files/search', undefined, { path, pattern });
  }

  async getSystemInfo() {
    return this.request<SystemInfo>('GET', '/api/system/info');
  }

  async getProcesses(filter?: string) {
    return this.request<ProcessListResponse>('GET', '/api/system/processes', undefined, { filter });
  }
}

export function getStoredApiKey() {
  return window.localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function getStoredBaseUrl() {
  return window.localStorage.getItem(STORAGE_KEY) ?? 'http://localhost:3000';
}

export function storeApiKey(apiKey: string, baseUrl: string) {
  window.localStorage.setItem(API_KEY_STORAGE, apiKey);
  window.localStorage.setItem(STORAGE_KEY, baseUrl);
}

export function clearStoredAuth() {
  window.localStorage.removeItem(API_KEY_STORAGE);
}

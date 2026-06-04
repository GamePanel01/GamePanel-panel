export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping';

export interface ServerItem {
  id: number;
  name: string;
  type: string;
  port: number;
  path: string;
  status: ServerStatus;
  memory_allocation: number;
  java_version: string;
  created_at?: string;
  updated_at?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  created: string;
  modified: string;
}

export interface FileListResponse {
  success: boolean;
  path: string;
  files: FileEntry[];
  count: number;
}

export interface FileInfo extends FileEntry {
  isReadable?: boolean;
  isWritable?: boolean;
}

export interface ServerLogEntry {
  id: number;
  server_id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface CommandExecResponse {
  success: boolean;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}

export interface FileReadResponse {
  success: boolean;
  path: string;
  content: string;
  size: number;
}

export interface SystemInfo {
  success: boolean;
  system: {
    uptime: string;
    disk: {
      total: string;
      used: string;
      available: string;
      percent: string;
    };
    memory: {
      total: string;
      used: string;
      free: string;
    };
    cpuCores: number;
    hostname: string;
    osInfo: string;
  };
}

export interface ProcessItem {
  user: string;
  pid: string;
  cpu: string;
  memory: string;
  vsz: string;
  rss: string;
  tty: string;
  stat: string;
  start: string;
  time: string;
  command: string;
}

export interface ProcessListResponse {
  success: boolean;
  filter?: string;
  processes: ProcessItem[];
  count: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiInfo {
  success: boolean;
  name: string;
  version: string;
  description: string;
  endpoints?: Record<string, unknown>;
}

export interface HealthResponse {
  success: boolean;
  message: string;
  version: string;
  timestamp: string;
}

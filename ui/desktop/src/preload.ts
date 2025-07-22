import Electron, { contextBridge, ipcRenderer } from 'electron';

interface RecipeConfig {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  activities?: string[];
  [key: string]: unknown;
}

interface NotificationData {
  title: string;
  body: string;
}

interface FileResponse {
  file: string;
  filePath: string;
  error: string | null;
  found: boolean;
}

const config = JSON.parse(process.argv.find((arg) => arg.startsWith('{')) || '{}');

// Define the API types in a single place
type ElectronAPI = {
  reactReady: () => void;
  getConfig: () => Record<string, unknown>;
  hideWindow: () => void;
  directoryChooser: (replace?: boolean) => Promise<Electron.OpenDialogReturnValue>;
  createChatWindow: (
    query?: string,
    dir?: string,
    version?: string,
    resumeSessionId?: string,
    recipeConfig?: RecipeConfig,
    viewType?: string
  ) => void;
  logInfo: (txt: string) => void;
  showNotification: (data: NotificationData) => void;
  openInChrome: (url: string) => void;
  fetchMetadata: (url: string) => Promise<string>;
  reloadApp: () => void;
  checkForOllama: () => Promise<boolean>;
  selectFileOrDirectory: () => Promise<string>;
  startPowerSaveBlocker: () => Promise<number>;
  stopPowerSaveBlocker: () => Promise<void>;
  getBinaryPath: (binaryName: string) => Promise<string>;
  readFile: (directory: string) => Promise<FileResponse>;
  writeFile: (directory: string, content: string) => Promise<boolean>;
  getAllowedExtensions: () => Promise<string[]>;
  on: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  off: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => void;
  emit: (channel: string, ...args: unknown[]) => void;
};

type AppConfigAPI = {
  get: (key: string) => unknown;
  getAll: () => Record<string, unknown>;
};

const electronAPI: ElectronAPI = {
  reactReady: () => ipcRenderer.send('react-ready'),
  getConfig: () => config,
  hideWindow: () => ipcRenderer.send('hide-window'),
  directoryChooser: (replace?: boolean) => ipcRenderer.invoke('directory-chooser', replace),
  createChatWindow: (
    query?: string,
    dir?: string,
    version?: string,
    resumeSessionId?: string,
    recipeConfig?: RecipeConfig,
    viewType?: string
  ) =>
    ipcRenderer.send(
      'create-chat-window',
      query,
      dir,
      version,
      resumeSessionId,
      recipeConfig,
      viewType
    ),
  logInfo: (txt: string) => ipcRenderer.send('logInfo', txt),
  showNotification: (data: NotificationData) => ipcRenderer.send('notify', data),
  openInChrome: (url: string) => ipcRenderer.send('open-in-chrome', url),
  fetchMetadata: (url: string) => ipcRenderer.invoke('fetch-metadata', url),
  reloadApp: () => ipcRenderer.send('reload-app'),
  checkForOllama: () => ipcRenderer.invoke('check-ollama'),
  selectFileOrDirectory: () => ipcRenderer.invoke('select-file-or-directory'),
  startPowerSaveBlocker: () => ipcRenderer.invoke('start-power-save-blocker'),
  stopPowerSaveBlocker: () => ipcRenderer.invoke('stop-power-save-blocker'),
  getBinaryPath: (binaryName: string) => ipcRenderer.invoke('get-binary-path', binaryName),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', filePath, content),
  getAllowedExtensions: () => ipcRenderer.invoke('get-allowed-extensions'),
  on: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.on(channel, callback);
  },
  off: (
    channel: string,
    callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
  ) => {
    ipcRenderer.off(channel, callback);
  },
  emit: (channel: string, ...args: unknown[]) => {
    ipcRenderer.emit(channel, ...args);
  },
};

const appConfigAPI: AppConfigAPI = {
  get: (key: string) => config[key],
  getAll: () => config,
};

// Expose the APIs
contextBridge.exposeInMainWorld('electron', electronAPI);
contextBridge.exposeInMainWorld('appConfig', appConfigAPI);

// Type declaration for TypeScript
declare global {
  interface Window {
    electron: ElectronAPI;
    appConfig: AppConfigAPI;
  }
}

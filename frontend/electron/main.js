import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const devUrls = [
  process.env.ELECTRON_RENDERER_URL,
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const indexHtmlPath = path.join(__dirname, '..', 'dist', 'index.html');
const UPDATE_STATUS_CHANNEL = 'updater:status';

let mainWindowRef = null;
let updateReadyToInstall = false;

const parseStableVersion = (value) => {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return null;
  }

  return match.slice(1, 4).map((part) => Number(part));
};

const compareVersions = (left, right) => {
  for (let i = 0; i < 3; i += 1) {
    const a = left[i] || 0;
    const b = right[i] || 0;

    if (a > b) {
      return 1;
    }

    if (a < b) {
      return -1;
    }
  }

  return 0;
};

const sendUpdateStatus = (payload) => {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) {
    return;
  }

  mainWindowRef.webContents.send(UPDATE_STATUS_CHANNEL, payload);
};

const isValidUpdateVersion = (nextVersion) => {
  const currentParsed = parseStableVersion(app.getVersion());
  const nextParsed = parseStableVersion(nextVersion);

  if (!currentParsed || !nextParsed) {
    return false;
  }

  return compareVersions(nextParsed, currentParsed) >= 0;
};

const checkForUpdatesSafe = async () => {
  if (isDev) {
    return;
  }

  sendUpdateStatus({
    status: 'checking',
    message: 'Verificando atualizacoes...'
  });

  try {
    await autoUpdater.checkForUpdates();
  } catch (_error) {
    sendUpdateStatus({
      status: 'error',
      message: 'Falha ao verificar atualizacoes.'
    });
  }
};

const setupAutoUpdater = () => {
  if (isDev) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.disableWebInstaller = true;

  const customFeedUrl = process.env.SYNCHO_UPDATER_URL;

  if (customFeedUrl) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: customFeedUrl
    });
  }

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({
      status: 'checking',
      message: 'Verificando atualizacoes...'
    });
  });

  autoUpdater.on('update-available', (info) => {
    if (!isValidUpdateVersion(info?.version)) {
      sendUpdateStatus({
        status: 'error',
        message: 'Atualizacao invalida detectada e ignorada por seguranca.'
      });
      return;
    }

    sendUpdateStatus({
      status: 'available',
      version: info.version,
      message: 'Nova atualizacao disponivel'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'downloading',
      progress: Math.max(0, Math.min(100, Number(progress?.percent || 0))),
      message: 'Baixando atualizacao...'
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyToInstall = true;

    sendUpdateStatus({
      status: 'downloaded',
      version: info?.version,
      message: 'Atualizacao pronta para instalar'
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({
      status: 'not-available',
      message: 'Aplicativo atualizado'
    });
  });

  autoUpdater.on('error', () => {
    sendUpdateStatus({
      status: 'error',
      message: 'Erro ao atualizar o aplicativo.'
    });
  });

  ipcMain.on('updater:install-now', () => {
    if (!updateReadyToInstall) {
      return;
    }

    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.on('updater:check-now', () => {
    void checkForUpdatesSafe();
  });

  void checkForUpdatesSafe();
  setInterval(() => {
    void checkForUpdatesSafe();
  }, 1000 * 60 * 60);
};

const createFallbackHtml = (message) => {
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Syncho PDV</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:560px;padding:24px;border:1px solid rgba(148,163,184,.28);border-radius:16px;background:rgba(15,23,42,.74)}h1{margin:0 0 8px;font-size:22px}p{margin:0;color:#cbd5e1;line-height:1.5}</style></head><body><main><h1>Syncho PDV</h1><p>${message}</p></main></body></html>`;
  return `data:text/html;charset=UTF-8,${encodeURIComponent(content)}`;
};

const loadRendererInDev = async (window) => {
  const maxAttempts = 60;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    for (const url of devUrls) {
      try {
        await window.loadURL(url);
        return;
      } catch (_error) {
        // continua tentando
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await window.loadURL(
    createFallbackHtml('Nao foi possivel conectar ao servidor de desenvolvimento. Execute npm run dev e tente novamente.')
  );
};

const loadRendererInProd = async (window) => {
  try {
    await window.loadFile(indexHtmlPath);
  } catch (_error) {
    await window.loadURL(
      createFallbackHtml('Nao foi possivel carregar os arquivos locais do app. Gere o build com npm run build.')
    );
  }
};

const createMainWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('render-process-gone', () => {
    void mainWindow.loadURL(createFallbackHtml('O processo de renderizacao foi encerrado inesperadamente.'));
  });

  mainWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription) => {
    if (!isDev) {
      return;
    }

    if (errorCode === -3) {
      return;
    }

    await mainWindow.loadURL(
      createFallbackHtml(`Erro ao carregar em desenvolvimento: ${errorDescription}. Verifique se o Vite esta ativo.`)
    );
  });

  if (isDev) {
    await loadRendererInDev(mainWindow);
  } else {
    await loadRendererInProd(mainWindow);
  }

  mainWindowRef = mainWindow;
};

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.syncho.pdv');
  }

  await createMainWindow();
  setupAutoUpdater();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

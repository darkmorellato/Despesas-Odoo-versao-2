const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    title: 'Despesas Miplace',
    icon: path.join(__dirname, '../public/favicon.svg'),
    backgroundColor: '#0a0b0e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Handle external link clicks (open in default OS browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Determine if running in development mode
  const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && !process.env.ELECTRON_PROD);
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler for generating and opening vector PDF
ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'Window not found' };

  try {
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      },
      ...options,
    });

    const tempDir = app.getPath('temp');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `relatorio-despesas-${timestamp}.pdf`;
    const filePath = path.join(tempDir, fileName);

    await fs.promises.writeFile(filePath, pdfData);
    await shell.openPath(filePath);

    return { success: true, filePath };
  } catch (err) {
    console.error('Erro ao gerar PDF vetorial:', err);
    return { success: false, error: err.message || String(err) };
  }
});

// IPC handler for direct vector PDF download to user Downloads directory
ipcMain.handle('download-pdf-direct', async (event, defaultName = 'relatorio-despesas.pdf') => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'Window not found' };

  try {
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    const downloadsDir = app.getPath('downloads');
    let targetFileName = defaultName.endsWith('.pdf') ? defaultName : `${defaultName}.pdf`;
    let filePath = path.join(downloadsDir, targetFileName);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(targetFileName);
      const base = path.basename(targetFileName, ext);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
      filePath = path.join(downloadsDir, `${base}-${ts}${ext}`);
    }

    await fs.promises.writeFile(filePath, pdfData);
    return { success: true, filePath, fileName: path.basename(filePath) };
  } catch (err) {
    console.error('Erro ao baixar PDF direto:', err);
    return { success: false, error: err.message || String(err) };
  }
});

// IPC handler for saving vector PDF to chosen file path
ipcMain.handle('save-pdf', async (event, defaultName = 'relatorio-despesas.pdf') => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'Window not found' };

  try {
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salvar Relatório em PDF',
      defaultPath: path.join(app.getPath('downloads'), defaultName),
      filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await fs.promises.writeFile(filePath, pdfData);
    return { success: true, filePath };
  } catch (err) {
    console.error('Erro ao salvar PDF:', err);
    return { success: false, error: err.message || String(err) };
  }
});

// IPC handler for printing with Chromium's native vector engine
ipcMain.handle('print-window', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'Window not found' };

  return new Promise((resolve) => {
    win.webContents.print(
      {
        silent: false,
        printBackground: true,
        color: true,
        ...options,
      },
      (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

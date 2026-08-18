import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { LiarenaUpdater } from './updater'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ └── main.js
// │ │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')


let win: BrowserWindow | null
let updater: LiarenaUpdater | null
// 🚧 Use ['ENV_NAME'] avoid vite:define dev replacement
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Initialize Updater
  updater = new LiarenaUpdater(win)
  updater.init()

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// --- LIARENA LOCAL RECORD ENGINE ---

const LIARENA_ROOT = path.join(app.getPath('documents'), 'LIARENA');

ipcMain.handle('ensure-patient-folder', async (_, { patientName, birthDate }) => {
  try {
    // Formato solicitado: Nombre del Paciente + Fecha de Nacimiento (YYYY-MM-DD)
    const cleanDate = birthDate ? birthDate.replace(/\//g, '-') : '0000-00-00';
    const folderName = `${patientName.replace(/\s+/g, '_').toUpperCase()}_${cleanDate}`;
    const patientPath = path.join(LIARENA_ROOT, 'Pacientes', folderName);

    if (!fs.existsSync(patientPath)) {
      fs.mkdirSync(patientPath, { recursive: true });
    }

    return { success: true, path: patientPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ensure-study-folder', async (_, { patientPath, studyType }) => {
  try {
    // Nombre de la carpeta: solo el tipo de estudio (ENDOSCOPIA, COLONOSCOPIA, etc.)
    let studyFolderName = studyType.replace(/\s+/g, '_').toUpperCase();
    let studyPath = path.join(patientPath, studyFolderName);

    // Control de colisiones cronológico (si el mismo paciente tiene dos estudios del mismo tipo)
    if (fs.existsSync(studyPath)) {
      const datePrefix = new Date().toISOString().split('T')[0];
      studyFolderName = `${datePrefix}_${studyFolderName}`;
      studyPath = path.join(patientPath, studyFolderName);

      if (fs.existsSync(studyPath)) {
        let counter = 2;
        while (fs.existsSync(`${studyPath}_${counter}`)) {
          counter++;
        }
        studyPath = `${studyPath}_${counter}`;
      }
    }

    const subfolders = ['Fotos', 'Video', 'Reporte'];

    for (const sub of subfolders) {
      const p = path.join(studyPath, sub);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }

    return { success: true, path: studyPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-local-file', async (_, { filePath, base64Data, isBuffer = false }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Sobrescribimos el archivo si ya existe para evitar duplicados innecesarios
    // y mantener solo la versión más reciente del reporte o captura.
    if (isBuffer) {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      fs.writeFileSync(filePath, base64Data);
    }
    return { success: true, path: filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-liarena-root', () => LIARENA_ROOT);

ipcMain.handle('open-local-folder', async (_, folderPath?: string) => {
  const target = folderPath || LIARENA_ROOT;
  if (fs.existsSync(target)) {
    await shell.openPath(target);
    return { success: true };
  }
  return { success: false, error: 'Path not found' };
});

ipcMain.handle('get-system-info', async () => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Simple CPU Load calculation
    const avgLoad = os.loadavg()[0]; // 1 min average
    const cpuLoad = Math.round((avgLoad / cpus.length) * 100);

    // Disk space (home directory as proxy for LIARENA storage)
    let diskSpace = 'N/A';
    try {
      const stats = fs.statfsSync(os.homedir());
      const free = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
      diskSpace = `${free.toFixed(1)} GB`;
    } catch (e) {}

    return {
      cpu: cpus[0].model,
      cores: cpus.length,
      cpuLoad,
      ram: `${Math.round(totalMemory / (1024 * 1024 * 1024))} GB`,
      freeRam: `${Math.round(freeMemory / (1024 * 1024 * 1024))} GB`,
      diskSpace,
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      platform: os.platform(),
      version: app.getVersion()
    };
  } catch (e) {
    return { error: true };
  }
});

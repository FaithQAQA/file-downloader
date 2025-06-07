const { app, BrowserWindow } = require('electron');


const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const extract = require('extract-zip');
const { exec } = require('child_process');
const archiver = require('archiver');   // for zip creation
const Seven = require('node-7z');
const SevenBin = require('7zip-bin');
const pathTo7zip = SevenBin.path7za; // path to bundled 7z executable

// Example of extracting a .7z archive:
const archivePath = 'path/to/archive.7z';
const outputDir = 'output/directory';

const myStream = Seven.extractFull(archivePath, outputDir, {
  $bin: pathTo7zip,
  overwrite: 'a'  // 'a' means overwrite all files without prompt
});

myStream.on('end', () => console.log('Extraction done'));
myStream.on('error', err => console.error('Extraction error', err));

myStream.on('end', () => console.log('Extraction done'));
myStream.on('error', err => console.error('Extraction error', err));
const { ipcMain, dialog } = require('electron');
const { fileTypeFromFile } = require('file-type');
const { extractFull } = require('node-7z'); // Add this at the top
const { path7za } = require('7zip-bin');

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];  // Return first folder path
});

ipcMain.handle('dialog:openFile', async (event, filters) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [] // e.g. [{ name: 'Archives', extensions: ['zip', '7z', 'rar'] }]
  });
  if (result.canceled) return null;
  return result.filePaths[0];  // Return first selected file path
});



// Handle folder creation request from renderer
ipcMain.handle('create-folders', async (event, basePath) => {
  console.log('Create folders requested at:', basePath);

  if (!basePath) {
    return { error: 'basePath is required' };
  }

  const folders = [
    'Emulators',
    path.join('Switch games', 'Roms'),
    path.join('Switch games', 'Updates'),
    path.join('Switch games', 'Dlc'),
    'WiiGames',
    path.join('Firmware', 'misc')
  ];

  try {
    for (const folder of folders) {
      const fullPath = path.join(basePath, folder);
      console.log('Ensuring folder:', fullPath);
      await fs.ensureDir(fullPath);
    }

    return { success: true, message: 'Folders created successfully.' };
  } catch (err) {
    console.error('Folder creation failed:', err);
    return { error: 'Error creating folders', details: err.message };
  }
});


ipcMain.handle('extract-archive', async (event, { archivePath, targetDir }) => {
  if (!archivePath || !targetDir) {
    return { error: 'archivePath and targetDir are required' };
  }

  const resolvedArchivePath = path.resolve(archivePath);
  const resolvedTargetDir = path.resolve(targetDir);

  try {
    if (!await fs.pathExists(resolvedArchivePath)) {
      return { error: 'Archive file not found.', path: resolvedArchivePath };
    }

    await fs.ensureDir(resolvedTargetDir);
    await extract(resolvedArchivePath, { dir: resolvedTargetDir });

    return { message: 'Extraction complete.' };
  } catch (err) {
    console.error('Extraction failed:', err);
    return { error: 'Extraction failed.', details: err.message };
  }
});


ipcMain.handle('firmware-download', async (event, { fileId, filename, outputDir }) => {
  if (!fileId || !filename || !outputDir) {
    return { error: 'Missing fileId, filename, or outputDir' };
  }

  const baseURL = 'https://drive.google.com/uc?export=download';
  const session = axios.create({ withCredentials: true });

  const filePath = path.join(outputDir, filename);

  try {
    // Step 1: Initial request to check for confirmation token
    const initialRes = await session.get(baseURL, {
      params: { id: fileId },
      responseType: 'text'
    });

    const confirmTokenMatch = initialRes.data.match(/confirm=([0-9A-Za-z_]+)&/);
    const confirmToken = confirmTokenMatch ? confirmTokenMatch[1] : null;

    const responseStream = await session.get(baseURL, {
      params: { id: fileId, ...(confirmToken ? { confirm: confirmToken } : {}) },
      responseType: 'stream'
    });

    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Stream download to file
    const writer = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
      responseStream.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { success: true, filePath };

  } catch (err) {
    console.error('Firmware download failed:', err);
    return { error: 'Firmware download failed', details: err.message };
  }
});


// Helper for Google Drive file download
async function downloadFromGoogleDrive(fileId, destPath) {
  const baseURL = 'https://drive.google.com/uc?export=download';
  const session = axios.create({ withCredentials: true });

  // Step 1: get confirmation token if needed
  const initialRes = await session.get(baseURL, {
    params: { id: fileId },
    responseType: 'text'
  });

  const tokenMatch = initialRes.data.match(/confirm=([0-9A-Za-z_]+)&/);
  const confirmToken = tokenMatch ? tokenMatch[1] : null;

  const downloadRes = await session.get(baseURL, {
    params: { id: fileId, ...(confirmToken ? { confirm: confirmToken } : {}) },
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(destPath);

  await new Promise((resolve, reject) => {
    downloadRes.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

ipcMain.handle('download-keys', async (event, { url, type, subtype, basePath }) => {
  const firmwarePath = path.join(basePath, 'keys');

  try {
    console.log('[START] download-keys called with:', { url, type, subtype, firmwarePath });
    if (!url || !type || !subtype || !firmwarePath) {
      console.warn('[WARN] Missing required fields');
      return { error: 'Missing required fields (url, type, subtype, firmwarePath)' };
    }

    if (type !== 'tool' || subtype !== 'firmware') {
      console.warn('[WARN] Invalid type or subtype:', { type, subtype });
      return { error: 'Invalid type or subtype' };
    }

    const parsedUrl = new URL(url.trim());
    const fileName = path.basename(parsedUrl.pathname) || 'download.rar';
    const registeredPath = path.resolve(firmwarePath);
    const tempDownloadPath = path.join(os.tmpdir(), fileName);

    console.log('[INFO] Parsed URL:', parsedUrl.href);
    console.log('[INFO] File will be saved as:', fileName);
    console.log('[INFO] Temporary download path:', tempDownloadPath);
    console.log('[INFO] Extract destination path:', registeredPath);

    await fs.ensureDir(registeredPath);
    console.log('[INFO] Destination folder ensured:', registeredPath);

    // --- Download ---
    if (parsedUrl.hostname.includes('drive.google.com')) {
      const idMatch = url.match(/id=([^&]+)/) || url.match(/\/d\/([^\/]+)/);
      const fileId = idMatch?.[1];
      if (!fileId) {
        console.error('[ERROR] Invalid Google Drive URL - no file ID found.');
        return { error: 'Invalid Google Drive URL - no file ID found.' };
      }
      console.log('[INFO] Google Drive file ID:', fileId);
      await downloadFromGoogleDrive(fileId, tempDownloadPath);
      console.log('[INFO] Google Drive file downloaded to:', tempDownloadPath);
    } else {
      console.log('[INFO] Downloading from URL:', url);
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream'
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempDownloadPath);
        response.data.pipe(writer);
        writer.on('finish', () => {
          console.log('[INFO] Download complete:', tempDownloadPath);
          resolve();
        });
        writer.on('error', (err) => {
          console.error('[ERROR] Download failed:', err);
          reject(err);
        });
      });
    }

    // --- Detect file type ---
    let ext = path.extname(tempDownloadPath).toLowerCase();
    if (!ext) {
     const typeInfo = await fileTypeFromFile(tempDownloadPath);
      ext = typeInfo?.ext ? '.' + typeInfo.ext : '';
      console.log('[INFO] Detected file extension:', ext);
    } else {
      console.log('[INFO] File extension from path:', ext);
    }

    // --- Extraction ---
    console.log('[INFO] Starting extraction...');
    if (ext === '.zip') {
      await extract(tempDownloadPath, { dir: registeredPath });
      console.log('[INFO] ZIP extraction complete');
    } else if (ext === '.rar' || ext === '.7z') {
      console.log(`[INFO] Extracting with 7z (${ext})...`);
      await new Promise((resolve, reject) => {
        const stream = extractFull(tempDownloadPath, registeredPath, {
          $bin: path7za,
          overwrite: 'a'
        });

        stream.on('data', d => console.log('[7z OUTPUT]', d.toString?.() || d));
        stream.on('end', () => {
          console.log('[INFO] 7z extraction finished');
          resolve();
        });
        stream.on('error', (err) => {
          console.error('[ERROR] 7z extraction failed:', err);
          reject(err);
        });
      });
    } else {
      await fs.remove(tempDownloadPath);
      console.error('[ERROR] Unsupported archive format:', ext);
      return { error: `Unsupported archive format: ${ext}` };
    }

    // --- Post-extraction cleanup ---
    await fs.remove(tempDownloadPath);
    console.log('[INFO] Temp file deleted:', tempDownloadPath);

    const extractedFiles = await fs.readdir(registeredPath);
    console.log('[INFO] Extracted files:', extractedFiles);

    if (!extractedFiles.length) {
      console.error('[ERROR] No files were extracted.');
      throw new Error('No files extracted');
    }

    return {
      message: `Keys downloaded and extracted (${ext})`,
      files: extractedFiles
    };

  } catch (err) {
    console.error('[FATAL ERROR] General error occurred:', err);
    return { error: 'Download failed', details: err.message };
  }
});



// Create ZIP archive from a folder and return the path or buffer
ipcMain.handle('download-extracted-keys', async (event, folderPath) => {
  try {
    if (!folderPath) {
      return { error: 'Missing folder path' };
    }

    const resolvedPath = path.resolve(folderPath);
    const files = await fs.readdir(resolvedPath);

    if (!files.length) {
      return { error: 'No extracted files found in directory' };
    }

    const tmpZipPath = path.join(require('os').tmpdir(), 'keys.zip');
    const output = fs.createWriteStream(tmpZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return await new Promise((resolve, reject) => {
      output.on('close', () => {
        resolve({ success: true, zipPath: tmpZipPath });
      });

      archive.on('error', err => {
        console.error('Archiver error:', err);
        reject({ error: 'Failed to create archive', details: err.message });
      });

      archive.pipe(output);
      archive.directory(resolvedPath, false);
      archive.finalize();
    });
  } catch (err) {
    console.error('ZIP archive error:', err);
    return { error: 'Failed to archive files', details: err.message };
  }
});


ipcMain.handle('download-dynamic', async (event, { url, fileName, basePath, destinationType, title }) => {
  if (!url || !fileName || !basePath) {
    return { error: 'Missing url, fileName, or basePath' };
  }

  const ext = path.extname(fileName).toLowerCase();
  const tempPath = path.join(os.tmpdir(), fileName);

  let targetDir;

  switch (destinationType) {
    case 'emulator':
      targetDir = path.join(basePath, 'Emulators');
      break;
    case 'firmware':
      targetDir = path.join(basePath, 'Firmware');
      break;
    case 'tool':
      const cleanName = title ? title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) : 'tool';
      targetDir = path.join(basePath, cleanName);
      break;
    case 'wiigames':
      targetDir = path.join(basePath, 'wiigames');
      break;
    case 'base':
    default:
      targetDir = basePath;
      break;
  }

  try {
    await fs.ensureDir(targetDir);

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream'
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Extract if it's an archive
    if (ext === '.zip') {
      await extract(tempPath, { dir: targetDir });
      await fs.remove(tempPath);
    } else if (ext === '.7z' || ext === '.rar') {
      await new Promise((resolve, reject) => {
        const stream = Seven.extractFull(tempPath, targetDir, {
          $bin: pathTo7zip,
          overwrite: 'a'
        });

        stream.on('end', async () => {
          await fs.remove(tempPath);
          resolve();
        });
        stream.on('error', async (err) => {
          await fs.remove(tempPath);
          reject(new Error('7z extraction failed: ' + err.message));
        });
      });
    } else {
      // Just move the file
      await fs.move(tempPath, path.join(targetDir, fileName));
    }

    return { success: true, message: 'Download and extraction complete.', targetDir };

  } catch (err) {
    console.error('[ERROR] Dynamic download failed:', err);
    return { error: 'Download or extraction failed', details: err.message };
  }
});


ipcMain.handle('download-emulator', async (event, { url, fileName, basePath, type, subtype, firmwarePath }) => {
  if (!url || !fileName || !basePath) {
    return { error: 'Missing url, fileName, or basePath' };
  }

  const ext = path.extname(fileName).toLowerCase();
  const emuFolder = path.join(basePath, 'Emulators');

  try {
    await fs.ensureDir(emuFolder);

    if (type === 'tool' && subtype === 'firmware') {
      if (!firmwarePath) {
        return { error: 'Missing firmwarePath in request.' };
      }

      const registeredPath = path.join(firmwarePath, 'nand', 'system', 'Contents', 'registered');
      await fs.ensureDir(registeredPath);

      const tempDownloadPath = path.join(os.tmpdir(), fileName);
      const response = await axios({ method: 'GET', url, responseType: 'stream' });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempDownloadPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      if (ext === '.zip') {
        await extract(tempDownloadPath, { dir: registeredPath });
        await fs.remove(tempDownloadPath);
      } else if (ext === '.7z') {
        await new Promise((resolve, reject) => {
          exec(`7z x "${tempDownloadPath}" -o"${registeredPath}" -y`, async (err) => {
            if (err) return reject(new Error('7z extraction failed'));
            await fs.remove(tempDownloadPath);
            resolve();
          });
        });
      } else {
        await fs.move(tempDownloadPath, path.join(registeredPath, fileName));
      }

      return { message: 'Firmware downloaded and installed.' };
    }

    // Emulator download
    const filePath = path.join(emuFolder, fileName);
    const response = await axios({ method: 'GET', url, responseType: 'stream' });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    if (ext === '.zip') {
      await extract(filePath, { dir: emuFolder });
      await fs.remove(filePath);
    } else if (ext === '.7z') {
      await new Promise((resolve, reject) => {
        exec(`7z x "${filePath}" -o"${emuFolder}" -y`, async (err) => {
          if (err) return reject(new Error('7z extraction failed'));
          await fs.remove(filePath);
          resolve();
        });
      });
    }

    return { message: 'Emulator downloaded and extracted.' };

  } catch (err) {
    console.error('[ERROR] Emulator download failed:', err);
    return { error: 'Download or extraction failed', details: err.message };
  }
});


function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load your frontend here (e.g., index.html or Vite/React app, etc.)
  // If you're using Vite/Vercel during development:
  win.loadURL('http://localhost:4200'); // Or wherever your frontend dev server runs
  // In production:
  // win.loadFile('dist/index.html');
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

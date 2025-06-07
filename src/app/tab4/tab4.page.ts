import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, ToastController, ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false
})
export class Tab4Page {
  selectedFolder: string = '';
  selectedFolderEx: string = '';
  statusMessage: string = '';

  constructor(
    private http: HttpClient,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  // Toast helper
  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Prompt user to enter firmware folder path manually
  async presentFirmwarePrompt(): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Firmware Folder',
        inputs: [
          {
            name: 'folderPath',
            type: 'text',
            placeholder: 'e.g., C:\\Users\\Jay\\AppData\\Roaming\\eden'
          }
        ],
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
          { text: 'OK', handler: data => resolve(data.folderPath?.trim() || null) }
        ]
      });
      await alert.present();
    });
  }

  // Pick folder for extraction base path
  async pickFolderEx() {
    const folder = await window.electronAPI.pickFolder();
    if (folder) {
      this.selectedFolderEx = folder;
      this.presentToast(`Selected: ${folder}`, 'medium');
    }
  }

  // Pick base folder for setup
  async pickFolder() {
    const folderPath = await window.electronAPI.pickFolder();
    if (folderPath) {
      this.selectedFolder = folderPath;
      await this.presentToast(`Selected folder: ${folderPath}`, 'medium');
    } else {
      await this.presentToast('Folder selection canceled.', 'warning');
    }
  }

  // Create folder structure on backend
async setupFolders() {
  if (!this.selectedFolder) {
    await this.presentToast('Please select a folder first.', 'warning');
    return;
  }

  localStorage.setItem('baseFolderPath', this.selectedFolder);

  try {
    const result = await (window as any).electronAPI.createFolders(this.selectedFolder);

    if (result.success) {
      await this.presentToast('Folder setup complete.', 'success');
    } else {
      await this.presentToast(result.error || 'Error creating folders.', 'danger');
    }
  } catch (error) {
    await this.presentToast('Failed to communicate with Electron.', 'danger');
  }
}


  // Download keys/tools (calls electronAPI)
  async downloadTools() {
    const url = "https://drive.google.com/uc?export=download&id=1bHsCVs87NJL7IRkcWQaUW3sWevfxVQ6H";
    const basePath = localStorage.getItem('baseFolderPath');

    if (!basePath) {
      return this.presentToast('Please set up a base folder path first.', 'warning');
    }

    const firmwareFolder = await this.presentFirmwarePrompt();
    if (!firmwareFolder) {
      return this.presentToast('Firmware folder path is required.', 'warning');
    }

    this.statusMessage = 'Starting firmware download...';
    console.log(firmwareFolder)

    try {
  const result = await window.electronAPI.downloadKeys({
  url,
  type: 'tool',
  subtype: 'firmware',
    basePath: firmwareFolder   // this is what backend expects
});


      this.statusMessage = 'Prod Keys downloaded and extracted locally.';
      await this.presentToast(result?.message || 'Success', 'success');
    } catch (err) {
      console.error(err);
      this.statusMessage = 'Prod Keys download failed.';
      await this.presentToast('Download failed.', 'danger');
    } finally {
      setTimeout(() => this.statusMessage = '', 5000);
    }
  }

  // Install firmware task
  async installFirmware() {
    const url = "https://github.com/THZoria/NX_Firmware/releases/download/19.0.0/Firmware.19.0.0.zip";
    const basePath = localStorage.getItem('baseFolderPath');

    if (!url.match(/\.(zip|7z|exe|rar|msi)$/i)) {
      return window.open(url, '_blank');
    }
    if (!basePath) {
      return this.presentToast('Please set up a base folder path first.', 'warning');
    }

    const fileName = url.split('/').pop();
    const firmwareFolder = await this.presentFirmwarePrompt();
    if (!firmwareFolder) {
      return this.presentToast('Firmware folder path is required.', 'warning');
    }

    this.statusMessage = 'Starting firmware download...';

    try {
      const result = await window.electronAPI.downloadEmulator({
        url,
        fileName,
        basePath,
        type: "tool",
        subtype: "firmware",
        firmwarePath: firmwareFolder
      });

      if (result?.error) throw new Error(result.error);

      this.statusMessage = 'Firmware downloaded and installed successfully.';
      await this.presentToast(result.message || 'Download complete.', 'success');
    } catch (err) {
      console.error(err);
      this.statusMessage = 'Firmware download failed.';
      await this.presentToast('Download failed.', 'danger');
    } finally {
      setTimeout(() => this.statusMessage = '', 5000);
    }
  }

  // Select file to extract using Electron file picker
  async chooseAndExtractFile() {
    const filters = [
      { name: 'Archives', extensions: ['zip', '7z', 'rar'] }
    ];
    const filePath = await window.electronAPI.pickFile(filters);
    if (!filePath) {
      await this.presentToast('File selection canceled.', 'warning');
      return;
    }
    await this.presentExtractTypeSheet(filePath);
  }

  // Show action sheet to choose extraction target folder
  async presentExtractTypeSheet(filePath: string) {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Select File Type',
      buttons: [
        { text: 'Emulator', handler: () => this.extractFile(filePath, 'Emulators') },
        { text: 'Game', handler: () => this.extractFile(filePath, 'Roms') },
        { text: 'DLC', handler: () => this.extractFile(filePath, 'Dlc') },
        { text: 'Update', handler: () => this.extractFile(filePath, 'Updates') },
        { text: 'Firmware', handler: () => this.extractFile(filePath, 'Firmware') },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  // Call backend to extract archive to target directory
  extractFile(filePath: string, type: string) {
    const basePath = localStorage.getItem('baseFolderPath');
    if (!basePath) {
      this.presentToast('Please pick a base folder first.', 'warning');
      return;
    }

    this.http.post('https://node-downloadserver.onrender.com/extract', {
      archivePath: filePath,
      targetDir: `${basePath}/${type}`
    }).subscribe({
      next: async () => await this.presentToast('File extracted successfully.', 'success'),
      error: async () => await this.presentToast('Extraction failed.', 'danger')
    });
  }
}

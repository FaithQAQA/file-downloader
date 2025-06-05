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

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

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

  async downloadTools() {
    let url = "https://drive.google.com/uc?export=download&id=1bHsCVs87NJL7IRkcWQaUW3sWevfxVQ6H";
    const basePath = localStorage.getItem('baseFolderPath');

    if (!basePath) return this.presentToast('Please set up a base folder path first.', 'warning');

    const firmwareFolder = await this.presentFirmwarePrompt();
    if (!firmwareFolder) return this.presentToast('Firmware folder path is required.', 'warning');

    this.statusMessage = 'Starting firmware download...';

    this.http.post('http://localhost:3000/download-keys', {
      url,
      basePath,
      type: "tool",
      subtype: "firmware",
      firmwarePath: firmwareFolder
    }).subscribe({
      next: (res: any) => {
        this.statusMessage = 'Prod Keys downloaded and installed successfully.';
        this.presentToast(res.message || 'Success', 'success');
        setTimeout(() => this.statusMessage = '', 5000);
      },
      error: (err) => {
        console.error(err);
        this.statusMessage = 'Prod Keys download failed.';
        this.presentToast('Download failed.', 'danger');
        setTimeout(() => this.statusMessage = '', 5000);
      }
    });
  }

  async installFirmware() {
    const url = "https://github.com/THZoria/NX_Firmware/releases/download/19.0.0/Firmware.19.0.0.zip";
    const basePath = localStorage.getItem('baseFolderPath');

    if (!url.match(/\.(zip|7z|exe|rar|msi)$/i)) return window.open(url, '_blank');
    if (!basePath) return this.presentToast('Please set up a base folder path first.', 'warning');

    const fileName = url.split('/').pop();
    const firmwareFolder = await this.presentFirmwarePrompt();
    if (!firmwareFolder) return this.presentToast('Firmware folder path is required.', 'warning');

    this.statusMessage = 'Starting firmware download...';

    this.http.post('http://localhost:3000/download-emulator', {
      url,
      fileName,
      basePath,
      type: "tool",
      subtype: "firmware",
      firmwarePath: firmwareFolder
    }).subscribe({
      next: (res: any) => {
        this.statusMessage = 'Firmware downloaded and installed successfully.';
        this.presentToast(res.message || 'Download complete.', 'success');
        setTimeout(() => this.statusMessage = '', 5000);
      },
      error: (err) => {
        console.error(err);
        this.statusMessage = 'Firmware download failed.';
        this.presentToast('Download failed.', 'danger');
        setTimeout(() => this.statusMessage = '', 5000);
      }
    });
  }

  pickFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = () => {
      const files = input.files;
      if (files && files.length > 0) {
        const path = files[0].webkitRelativePath.split('/')[0];
        this.selectedFolder = path;
        this.presentToast(`Selected: ${path}`, 'medium');
      }
    };
    input.click();
  }

  setupFolders() {
    if (!this.selectedFolder) return this.presentToast('Please select a folder first.', 'warning');

    localStorage.setItem('baseFolderPath', this.selectedFolder);
    this.http.post('http://localhost:3000/create-folders', {
      basePath: this.selectedFolder
    }).subscribe({
      next: (res: any) => this.presentToast('Folder setup complete.', 'success'),
      error: () => this.presentToast('Error creating folders.', 'danger')
    });

    return
  }

  chooseAndExtractFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.7z,.rar';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const fakePath = file.name;
        const fullPath = this.selectedFolderEx;
        this.presentExtractTypeSheet(fullPath);
      }
    };
    input.click();
  }

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

  extractFile(filePath: string, type: string) {
    const basePath = localStorage.getItem('baseFolderPath');
    if (!basePath) {
      this.presentToast('Please pick a base folder first.', 'warning');
      return;
    }

    this.http.post('http://localhost:3000/extract', {
      archivePath: filePath,
      targetDir: `${basePath}/${type}`
    }).subscribe({
      next: () => this.presentToast('File extracted successfully.', 'success'),
      error: () => this.presentToast('Extraction failed.', 'danger')
    });
  }
}

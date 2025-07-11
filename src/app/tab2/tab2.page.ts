import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {

  allItems: any[] = [];
  filteredItems: any[] = [];
  searchTerm: string = '';
  filterType: string = 'all';

  constructor(private http: HttpClient, private toastController: ToastController) {}

  ngOnInit() {
    this.http.get<any>('assets/data/downloads.json').subscribe(data => {
      this.allItems = data.downloads || [];
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredItems = this.allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesType = this.filterType === 'all' || item.type === this.filterType;
      return matchesSearch && matchesType;
    });
  }
loadingId: string | null = null;
  openItem(item: any) {
    console.log('Download:', item.title);
  }
async download(item: any) {
  const url = item.downloadUrl;
  const fileName = url.split('/').pop() || 'download.bin';
  const basePath = localStorage.getItem('baseFolderPath');

  const hasExtension = url.match(/\.(zip|7z|exe|rar|msi)$/i);

  if (!hasExtension) {
    window.open(url, '_blank');
    return;
  }

  if (!basePath) {
    alert('Please set up a base folder path first.');
    return;
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  const title = item.title || fileName;
  let destinationType = 'base';

  if (title.toLowerCase().includes('mario kart 8') && !title.toLowerCase().includes('deluxe')) {
    destinationType = 'base';
  } else if (ext === 'exe' || item.type === 'emulator') {
    destinationType = 'emulator';
  } else if (item.type === 'tool') {
    destinationType = 'tool';
  } else if (item.type === 'firmware') {
    destinationType = 'firmware';
  } else {
    destinationType = 'wiigames';
  }

  this.loadingId = item.id;

  try {
    const result = await window.electronAPI.downloadDynamic({
      url,
      fileName,
      basePath,
      destinationType,
      title
    });

    this.loadingId = null;

    if (result.error) {
      console.error(result.error, result.details);
      this.presentToast('Download failed: ' + (result.details || result.error), 'danger');
    } else {
      this.presentToast(result.message || 'Download complete!', 'success');
    }
  } catch (err) {
    this.loadingId = null;
    console.error(err);
    this.presentToast('Download failed.', 'danger');
  }
}


async presentToast(message: string, p0: string) {
  const toast = await this.toastController.create({
    message,
    duration: 2000,
    color: 'dark',
    position: 'bottom'
  });
  await toast.present();
}


}

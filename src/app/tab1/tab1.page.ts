import { Component } from '@angular/core';
import { FeaturedItem } from './featured-item.model';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {

 featuredGames = [
    {
      name: 'Mario kart Wii',
      imgUrl: 'https://cdn2.steamgriddb.com/logo/63d4cd43646876727448aa8e6b9f7a51.png',
      downloadUrl: 'https://example.com/downloads/super-racer.apk'
    },
    {
      name: 'Mario kart 8 Wiiu',
      imgUrl: 'https://www.nintendo.com/eu/media/images/10_share_images/games_15/wiiu_14/SI_WiiU_MarioKart8_image1600w.jpg',
      downloadUrl: 'https://example.com/downloads/puzzle-mania.apk'
    },
    {
      name: 'Mario kart 8 Switch',
      imgUrl: 'https://variety.com/wp-content/uploads/2023/11/mario-kart-wave-6-funky-kong.jpeg?w=1000&h=563&crop=1.png',
      downloadUrl: 'https://example.com/downloads/battle-quest.apk'
    },
  ];

  topEmulators = [
  {
    name: 'Eden',
    type: 'Emulator',
    imgUrl: 'https://eden-emulator.github.io/img/logofavicon2.png',
    downloadUrl: 'https://mega.nz/file/VYlyQJ5D#SO0fp2mxRn58LsffISP9HOb3kvIgWmJmrax0yRec4J8'
  },
  {
    name: 'Cemu',
    type: 'Emulator',
    imgUrl: 'https://cdn2.steamgriddb.com/grid/7cb846280bd487e795a19c7d7b23bb53.png',
    downloadUrl: 'https://github.com/cemu-project/Cemu/releases/download/v2.6/cemu-2.6-windows-x64.zip'
  }
];

constructor(private http: HttpClient) {}

download(emulator: any) {
  const url = emulator.downloadUrl;
  const hasExtension = url.match(/\.(zip|7z|exe|rar|msi)$/i);
  const basePath = localStorage.getItem('baseFolderPath');

  if (!hasExtension) {
    // Redirect if no extension
    window.open(url, '_blank');
    return;
  }

  if (!basePath) {
    alert('Please set up a base folder path first.');
    return;
  }

  const fileName = url.split('/').pop();

  this.http.post('https://node-downloadserver.onrender.com/download-emulator', {
    url,
    fileName,
    basePath,
    type: emulator.type
  }).subscribe({
    next: (res: any) => {
      console.log(res.message);
      alert('Download and extraction complete.');
    },
    error: (err) => {
      console.error(err);
      alert('Download failed.');
    }
  });
}


}

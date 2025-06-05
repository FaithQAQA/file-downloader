import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DownloadsTabPageRoutingModule } from './downloads-tab-routing.module';
import { DownloadsTabPage } from './downloads-tab.page';





@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DownloadsTabPageRoutingModule,
  ],
    declarations: [DownloadsTabPage]

})
export class DownloadsTabPageModule {}

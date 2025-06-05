import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DownloadsTabPage } from './downloads-tab.page';

describe('DownloadsTabPage', () => {
  let component: DownloadsTabPage;
  let fixture: ComponentFixture<DownloadsTabPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DownloadsTabPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  allItems: any[] = [];
  filteredItems: any[] = [];
  searchTerm: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get('assets/data/downloads.json').subscribe((data: any) => {
      this.allItems = data.bundles || [];
      this.filteredItems = [...this.allItems]; // Show all by default
    });
  }

  openItem(item: any) {
    console.log('Bundle:', item.name);
  }

  onSearchChange(event: any) {
    const term = event.detail.value.toLowerCase();
    this.filteredItems = this.allItems.filter(item =>
      item.name.toLowerCase().includes(term)
    );
  }
}

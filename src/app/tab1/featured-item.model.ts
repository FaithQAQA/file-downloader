// src/app/tab1/featured-item.model.ts
export interface FeaturedItem {
  id: number;
  name: string;
  type: 'game' | 'app';
  description: string;
  downloadUrl: string; // link to download
  iconUrl?: string; // optional icon image
}

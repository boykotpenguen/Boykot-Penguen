export interface Filter {
  rule: string;
  reason?: string;
  url?: string;
}

export interface BoycottList {
  id: string;
  name: string;
  description: string;
  url?: string;
  brands: Filter[];
  domains: Filter[];
  lastUpdated: string;
}

export interface UserPreferences {
  subscribedLists: string[];
  autoUpdate: boolean;
  updateInterval: number;
  lastAutoUpdate?: string;
  importUrls: string[];
  notificationSettings: {
    showOnPageLoad: boolean;
    showBanner: boolean;
    bannerPosition: "top" | "bottom";
    bannerColor: string;
    showAlert: boolean;
    alertDuration: number;
  };
}

export interface StorageData {
  boycottLists: BoycottList[];
  userPreferences: UserPreferences;
}

export enum StorageKey {
  BaseStorage = "boykot-data"
}

import { error, log } from "./logger";
import {
  getStorageData,
  getUserPreferences,
  saveStorageData,
  saveUserPreferences
} from "./storage";
import type { BoycottList } from "./types";

export async function checkAndUpdateLists(): Promise<void> {
  try {
    const preferences = await getUserPreferences();
    if (!preferences.autoUpdate) {
      return;
    }

    const now = new Date();
    const lastUpdate = new Date(preferences.lastAutoUpdate || new Date(0));
    const hoursSinceLastUpdate =
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastUpdate < preferences.updateInterval) {
      return;
    }
    for (const importUrl of preferences.importUrls) {
      try {
        const response = await fetch(importUrl);
        if (!response.ok) {
          error("Failed to fetch list:", response.statusText);
          continue;
        }

        const importedLists = (await response.json()) as BoycottList[];
        const storageData = await getStorageData();

        for (const importedList of importedLists) {
          const existingIndex = storageData.boycottLists.findIndex(
            (l) => l.id === importedList.id
          );
          if (existingIndex >= 0) {
            storageData.boycottLists[existingIndex] = {
              ...importedList,
              lastUpdated: now.toISOString()
            };
          } else {
            storageData.boycottLists.push({
              ...importedList,
              lastUpdated: now.toISOString()
            });
            storageData.userPreferences.subscribedLists.push(importedList.id);
          }
        }

        await saveStorageData(storageData);
        log(`Successfully auto-updated lists from: ${importUrl}`);
      } catch (err) {
        error(`Error auto-updating lists from ${importUrl}:`, err);
      }
    }
    preferences.lastAutoUpdate = now.toISOString();
    await saveUserPreferences(preferences);
  } catch (err) {
    error("Error in checkAndUpdateLists:", err);
  }
}

export function startAutoUpdate() {
  checkAndUpdateLists();

  setInterval(checkAndUpdateLists, 60 * 60 * 1000);
}

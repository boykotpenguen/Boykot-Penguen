import { Storage } from "@plasmohq/storage";

import { error } from "~util/logger";
import {
  StorageKey,
  type BoycottList,
  type StorageData,
  type UserPreferences
} from "~util/types";

const storage = new Storage({
  area: "local"
});

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  autoUpdate: false,
  updateInterval: 24,
  subscribedLists: [],
  lastAutoUpdate: undefined,
  importUrls: [],
  notificationSettings: {
    showOnPageLoad: true,
    showBanner: true,
    bannerPosition: "bottom",
    bannerColor: "#ff5252",
    showAlert: true,
    alertDuration: 5000
  }
};

const DEFAULT_STORAGE_DATA: StorageData = {
  boycottLists: [],
  userPreferences: DEFAULT_USER_PREFERENCES
};

/**
 * Get all data from storage
 */
export const getStorageData = async (): Promise<StorageData> => {
  const data = (await storage.get(StorageKey.BaseStorage)) as StorageData;
  return data || DEFAULT_STORAGE_DATA;
};

/**
 * Save all data to storage
 */
export const saveStorageData = async (data: StorageData): Promise<void> => {
  await storage.set(StorageKey.BaseStorage, data);
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (): Promise<UserPreferences> => {
  const data = await getStorageData();
  return data.userPreferences;
};

/**
 * Save user preferences
 */
export const saveUserPreferences = async (
  preferences: UserPreferences
): Promise<void> => {
  const data = await getStorageData();
  data.userPreferences = preferences;
  await saveStorageData(data);
};

/**
 * Get all boycott lists
 */
export const getBoycottLists = async (): Promise<BoycottList[]> => {
  const data = await getStorageData();
  return data.boycottLists;
};

/**
 * Add or update a boycott list
 */
export const addBoycottList = async (list: BoycottList): Promise<void> => {
  const data = await getStorageData();
  const index = data.boycottLists.findIndex((l) => l.id === list.id);

  if (index >= 0) {
    data.boycottLists[index] = list;
  } else {
    data.boycottLists.push(list);
    data.userPreferences.subscribedLists.push(list.id);
  }

  await saveStorageData(data);
};

/**
 * Remove a boycott list
 */
export const removeBoycottList = async (listId: string): Promise<void> => {
  const data = await getStorageData();
  data.boycottLists = data.boycottLists.filter((list) => list.id !== listId);

  if (data.userPreferences.subscribedLists.includes(listId)) {
    data.userPreferences.subscribedLists =
      data.userPreferences.subscribedLists.filter((id) => id !== listId);
  }

  await saveStorageData(data);
};

/**
 * Import boycott lists from JSON
 */
export const importBoycottListsFromJSON = async (
  jsonData: string
): Promise<void> => {
  try {
    const parsed = JSON.parse(jsonData) as BoycottList[];
    const data = await getStorageData();

    for (const list of parsed) {
      const index = data.boycottLists.findIndex((l) => l.id === list.id);
      if (index >= 0) {
        data.boycottLists[index] = list;
      } else {
        data.boycottLists.push(list);
        data.userPreferences.subscribedLists.push(list.id);
      }
    }

    await saveStorageData(data);
  } catch (err) {
    error("Failed to import boycott lists:", err);
    throw new Error("Invalid JSON format");
  }
};

/**
 * Export boycott lists to JSON
 */
export const exportBoycottListsToJSON = async (): Promise<string> => {
  const data = await getStorageData();

  const replacer = (key: string, value: any) => {
    if (key === "reason" || key === "url") {
      return value || undefined;
    }
    return value;
  };

  return JSON.stringify(data.boycottLists, replacer, 2);
};

/**
 * Get all subscribed lists
 */
export const getSubscribedBoycottList = async (): Promise<BoycottList[]> => {
  const data = await getStorageData();
  const subscribedLists = data.userPreferences.subscribedLists;

  return data.boycottLists.filter((list) => subscribedLists.includes(list.id));
};

export async function updateBoycottListDetails(
  listId: string,
  details: Partial<Omit<BoycottList, "id" | "lastUpdated">>
): Promise<void> {
  try {
    const data = await getStorageData();
    const listIndex = data.boycottLists.findIndex((list) => list.id === listId);
    if (listIndex === -1) {
      throw new Error("List not found");
    }

    data.boycottLists[listIndex] = {
      ...data.boycottLists[listIndex],
      ...details,
      lastUpdated: new Date().toISOString()
    };
    await saveStorageData(data);
  } catch (err) {
    error("Error updating list details:", err);
    throw err;
  }
}

export async function updateUserPreferences(
  preferences: UserPreferences
): Promise<void> {
  try {
    const data = await getStorageData();
    data.userPreferences = preferences;
    await saveStorageData(data);
  } catch (err) {
    error("Error updating user preferences:", err);
    throw err;
  }
}

/**
 * Remove all boycott lists
 */
export const removeAllBoycottLists = async (): Promise<void> => {
  const data = await getStorageData();
  data.boycottLists = [];
  data.userPreferences.subscribedLists = [];
  await saveStorageData(data);
};

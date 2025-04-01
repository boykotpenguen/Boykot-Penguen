import browser from "webextension-polyfill";

import { startAutoUpdate } from "~util/autoUpdate";
import { error, log, warn } from "~util/logger";
import { getSubscribedBoycottList } from "~util/storage";
import type { BoycottList, Filter } from "~util/types";

export {};

startAutoUpdate();

const scanTab = async (
  tabId: number,
  brands: Filter[],
  domains: Filter[],
  boycottLists: BoycottList[]
) => {
  log("Sending brands to content script for tab", tabId);

  try {
    const response = await browser.tabs.sendMessage(tabId, {
      action: "scanPage",
      brands,
      domains,
      parentLists: boycottLists
    });
    log("Content script response:", response);
  } catch (e: unknown) {
    // This could happen if the content script isn't loaded yet
    // or if the tab doesn't support content scripts (e.g., chrome:// pages)
    error("Error sending message to content script:", e);

    // Only log as an error if it's not one of the expected cases
    if (
      e instanceof Error &&
      e.toString().includes("Receiving end does not exist")
    ) {
      warn("Content script not ready yet for tab", tabId);
    }
  }
};

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = tab.url;
  log(`browser.tabs.onUpdated [${tabId}]`, { url, changeInfo, tab });

  if (changeInfo.status === "loading") {
    return;
  }

  if (
    url &&
    (changeInfo.url || changeInfo.status === "complete" || changeInfo.title)
  ) {
    try {
      const boycottLists = await getSubscribedBoycottList();
      const brands = boycottLists.flatMap((list) => list.brands);
      const domains = boycottLists.flatMap((list) => list.domains);
      log("Got", brands.length, "subscribed brands");
      log("Got", domains.length, "subscribed domains");

      scanTab(tabId, brands, domains, boycottLists);
    } catch (err) {
      error("Error in background script:", err);
    }
  } else {
    warn(`browser.tabs.onUpdated [${tabId}] was ignored`);
  }
  return true;
});

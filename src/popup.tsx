import React, { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";

import { sendToBackground } from "@plasmohq/messaging";

import type { RequestBody, ResponseBody } from "~background/messages/getBrands";
import styles from "~popup.module.css";
import { error } from "~util/logger";
import {
  getBoycottLists,
  getUserPreferences,
  saveUserPreferences
} from "~util/storage";
import type { BoycottList, Filter, UserPreferences } from "~util/types";

function IndexPopup() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [detectedBrands, setDetectedBrands] = useState<Filter[]>([]);
  const [detectedDomains, setDetectedDomains] = useState<Filter[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [lists, setLists] = useState<BoycottList[]>([]);
  const [scanning, setScanning] = useState(false);
  const [version, setVersion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await getUserPreferences();
      setUserPrefs(prefs);
    } catch (err) {
      error("Error loading preferences:", err);
      setErrorMessage(chrome.i18n.getMessage("errorLoadUserPreferences"));
    }
  }, []);

  const loadLists = useCallback(async () => {
    try {
      const boycottLists = await getBoycottLists();
      setLists(boycottLists);
    } catch (err) {
      error("Error loading lists:", err);
      setErrorMessage(chrome.i18n.getMessage("errorLoadBoycottList"));
    }
  }, []);

  const loadAlertsForCurrentPage = useCallback(async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const currentTab = tabs[0];

      if (!currentTab?.id || currentTab?.id == browser.tabs.TAB_ID_NONE) {
        setDetectedBrands([]);
        setErrorMessage(chrome.i18n.getMessage("errorDetectPage"));
        return;
      }

      browser.tabs
        .sendMessage(currentTab.id, { action: "getDetectedBrands" })
        .then((response: any) => {
          setDetectedDomains(
            response?.domains?.length > 0 ? response.domains : []
          );
          setDetectedBrands(
            response?.brands?.length > 0 ? response.brands : []
          );
          setErrorMessage(null);
        })
        .catch(() => {
          error(browser.runtime.lastError);
          setDetectedDomains([]);
          setDetectedBrands([]);
          setErrorMessage(chrome.i18n.getMessage("errorDetectPage"));
        });
    } catch (err) {
      error("Error loading alerts:", err);
      setErrorMessage("Failed to load alerts");
    }
  }, []);

  const loadVersion = useCallback(async () => {
    try {
      const manifest = browser.runtime.getManifest();
      setVersion(manifest.version || "0.0.0");
    } catch (err) {
      error("Error loading version:", err);
    }
  }, []);

  useEffect(() => {
    loadVersion();

    // Load appropriate data based on active tab
    if (activeTab === "alerts") {
      loadAlertsForCurrentPage();
    } else if (activeTab === "lists") {
      loadLists();
    } else if (activeTab === "settings") {
      loadPreferences();
    }
  }, [
    activeTab,
    loadAlertsForCurrentPage,
    loadLists,
    loadPreferences,
    loadVersion
  ]);

  // Initialize on component mount
  useEffect(() => {
    loadPreferences();
    loadLists();
    loadAlertsForCurrentPage();
  }, [loadPreferences, loadLists, loadAlertsForCurrentPage]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  const handleScanPage = async () => {
    setScanning(true);
    setErrorMessage(null);

    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
      });
      const currentTab = tabs[0];

      if (!currentTab?.id || currentTab?.id == browser.tabs.TAB_ID_NONE) {
        setErrorMessage(chrome.i18n.getMessage("errorDetectPage"));
        setScanning(false);
        return;
      }

      const response = await sendToBackground<RequestBody, ResponseBody>({
        name: "getBrands"
      });
      if (!response.subscribedLists || response.subscribedLists.length == 0) {
        setErrorMessage(chrome.i18n.getMessage("errorNoSubscribed"));
        setScanning(false);
        return;
      }

      const brands = response.subscribedLists.flatMap((l) => l.brands);
      const domains = response.subscribedLists.flatMap((l) => l.domains);

      if (brands?.length == 0 && domains?.length == 0) {
        setErrorMessage(chrome.i18n.getMessage("errorNoSubscribed"));
        setScanning(false);
        return;
      }

      await browser.tabs.sendMessage(currentTab.id, {
        action: "scanPage",
        brands: brands,
        domains: domains,
        parentLists: lists.filter((list) =>
          userPrefs?.subscribedLists.includes(list.id)
        )
      });
      setTimeout(() => {
        loadAlertsForCurrentPage();
        setScanning(false);
      }, 500);
    } catch (err) {
      error("Error scanning page:", err);
      setErrorMessage(chrome.i18n.getMessage("errorScan"));
      setScanning(false);
    }
  };

  const handleToggleListSubscription = async (
    listId: string,
    isSubscribed: boolean
  ) => {
    if (!userPrefs) return;

    try {
      const updatedSubscribedLists = isSubscribed
        ? [...userPrefs.subscribedLists, listId]
        : userPrefs.subscribedLists.filter((id) => id !== listId);

      const updatedPrefs = {
        ...userPrefs,
        subscribedLists: updatedSubscribedLists
      };

      await saveUserPreferences(updatedPrefs);
      setUserPrefs(updatedPrefs);
    } catch (err) {
      error("Error toggling subscription:", err);
    }
  };

  const handleSettingsChange = (field: string, value: any) => {
    if (userPrefs) {
      const updatedPrefs = {
        ...userPrefs,
        notificationSettings: {
          ...userPrefs.notificationSettings,
          [field]: value
        }
      };
      setUserPrefs(updatedPrefs);
    }
  };

  const handleSaveSettings = async () => {
    if (userPrefs) {
      try {
        await saveUserPreferences(userPrefs);
      } catch (err) {
        error("Error saving settings:", err);
      }
    }
  };

  const renderAlerts = () => {
    if (scanning) {
      return (
        <div className={styles.scanning}>
          <p>{chrome.i18n.getMessage("errorScan")}</p>
        </div>
      );
    }

    if (detectedBrands.length > 0 || detectedDomains.length > 0) {
      return (
        <>
          <div className={styles.alertBar}>
            <p>
              {detectedDomains.length > 0 &&
                `${detectedDomains.length} boycotted domain${detectedDomains.length === 1 ? "" : "s"} detected on this page.`}
            </p>
            <p>
              {detectedBrands.length > 0 &&
                `${detectedBrands.length} boycotted brand${detectedBrands.length === 1 ? "" : "s"} detected on this page.`}
            </p>
          </div>
          <div className={styles.brandList}>
            {detectedDomains.map((domain, index) => {
              const parentList = lists.find((list) =>
                list.domains?.some((d) => d.rule === domain.rule)
              );
              const linkUrl = domain.url || parentList?.url || "";

              return (
                <div key={domain.rule} className={styles.brandCard}>
                  <div className={styles.brandHeader}>{domain.rule}</div>
                  <div className={styles.brandBody}>
                    {domain.reason && (
                      <div className={styles.reason}>
                        Reason: {domain.reason}
                      </div>
                    )}
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        className={styles.campaignLink}
                        target="_blank"
                        rel="noopener noreferrer">
                        Learn more about this campaign
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {detectedBrands.map((brand, index) => {
              const parentList = lists.find((list) =>
                list.brands?.some((b) => b.rule === brand.rule)
              );
              const linkUrl = brand.url || parentList?.url || "";

              return (
                <div key={brand.rule || index} className={styles.brandCard}>
                  <div className={styles.brandHeader}>{brand.rule}</div>
                  <div className={styles.brandBody}>
                    {brand.reason && (
                      <div className={styles.reason}>
                        Reason: {brand.reason}
                      </div>
                    )}
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        className={styles.campaignLink}
                        target="_blank"
                        rel="noopener noreferrer">
                        Learn more about this campaign
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    return (
      <div className={styles.emptyState}>
        <p>No boycotted brands detected on this page.</p>
        <button
          id="scan-page"
          onClick={handleScanPage}
          className={styles.btn}
          disabled={scanning}>
          Scan Page Again
        </button>
      </div>
    );
  };

  const renderLists = () => {
    if (lists.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No boycott lists available.</p>
          <p>Import lists in the extension options.</p>
        </div>
      );
    }

    return (
      <div className={styles.listContainer}>
        {lists.map((list, index) => {
          const isSubscribed =
            userPrefs?.subscribedLists.includes(list.id) || false;

          return (
            <div key={list.id || index} className={styles.listItem}>
              <div className={styles.listInfo}>
                <div className={styles.listTitle}>{list.name}</div>
                <div className={styles.listDescription}>{list.description}</div>
              </div>
              <div className={styles.listActions}>
                <span className={styles.listCount}>
                  {list.brands?.length || 0} brands
                </span>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isSubscribed}
                    onChange={(e) =>
                      handleToggleListSubscription(list.id, e.target.checked)
                    }
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSettings = () => {
    if (!userPrefs) return null;

    return (
      <>
        <div className={styles.formGroup}>
          <label>Show notifications on page load</label>
          <label className={styles.switch}>
            <input
              id="show-on-load"
              type="checkbox"
              checked={userPrefs.notificationSettings.showOnPageLoad}
              onChange={(e) =>
                handleSettingsChange("showOnPageLoad", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label>Show banner notifications</label>
          <label className={styles.switch}>
            <input
              id="show-banner"
              type="checkbox"
              checked={userPrefs.notificationSettings.showBanner}
              onChange={(e) =>
                handleSettingsChange("showBanner", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label>Banner position</label>
          <select
            id="banner-position"
            value={userPrefs.notificationSettings.bannerPosition}
            onChange={(e) =>
              handleSettingsChange(
                "bannerPosition",
                e.target.value as "top" | "bottom"
              )
            }>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Banner color</label>
          <input
            id="banner-color"
            type="color"
            value={userPrefs.notificationSettings.bannerColor}
            onChange={(e) =>
              handleSettingsChange("bannerColor", e.target.value)
            }
          />
        </div>

        <div className={styles.formGroup}>
          <label>Show alert notifications</label>
          <label className={styles.switch}>
            <input
              id="show-alert"
              type="checkbox"
              checked={userPrefs.notificationSettings.showAlert}
              onChange={(e) =>
                handleSettingsChange("showAlert", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label>Alert duration (seconds)</label>
          <select
            id="alert-duration"
            value={userPrefs.notificationSettings.alertDuration}
            onChange={(e) =>
              handleSettingsChange("alertDuration", parseInt(e.target.value))
            }>
            <option value={3000}>3</option>
            <option value={5000}>5</option>
            <option value={8000}>8</option>
            <option value={10000}>10</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button
            id="save-settings"
            onClick={handleSaveSettings}
            className={`${styles.btn} ${styles.btnBlock}`}>
            Save Settings
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Boykot Penguen</h1>
        <span id="version" className={styles.version}>
          v{version}
        </span>
      </header>

      <div className={styles.tabs}>
        <div
          className={`${styles.tab} ${activeTab === "alerts" ? styles.active : ""}`}
          onClick={() => handleTabClick("alerts")}
          data-tab="alerts">
          Alerts
        </div>
        <div
          className={`${styles.tab} ${activeTab === "lists" ? styles.active : ""}`}
          onClick={() => handleTabClick("lists")}
          data-tab="lists">
          Lists
        </div>
        <div
          className={`${styles.tab} ${activeTab === "settings" ? styles.active : ""}`}
          onClick={() => handleTabClick("settings")}
          data-tab="settings">
          Settings
        </div>
      </div>

      {errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      <div
        id="alerts"
        className={`${styles.tabContent} ${activeTab === "alerts" ? styles.active : ""}`}>
        {renderAlerts()}
      </div>

      <div
        id="lists"
        className={`${styles.tabContent} ${activeTab === "lists" ? styles.active : ""}`}>
        {renderLists()}
        <div className={styles.actions}>
          <a
            href="options.html"
            target="_blank"
            className={`${styles.btn} ${styles.btnOutline}`}>
            Manage Lists
          </a>
        </div>
      </div>

      <div
        id="settings"
        className={`${styles.tabContent} ${activeTab === "settings" ? styles.active : ""}`}>
        {renderSettings()}
      </div>
    </div>
  );
}

export default IndexPopup;

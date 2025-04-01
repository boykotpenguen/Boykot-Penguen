import type { PlasmoCSConfig } from "plasmo";
import React from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";

import { sendToBackground } from "@plasmohq/messaging";

import type { RequestBody, ResponseBody } from "~background/messages/getBrands";
import {
  deepScanForBrands,
  scanPageForBrands,
  scanPageForDomains
} from "~util/brandDetector";
import { error, log } from "~util/logger";
import { getUserPreferences } from "~util/storage";
import type { Filter } from "~util/types";

import styles from "./content.module.css";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
};

let detectedBrands: Filter[] = [];
let detectedDomains: Filter[] = [];

const NotificationBanner: React.FC<{
  items: Filter[];
  itemType: "brands" | "domains" | "mixed";
  onClose: () => void;
  position: "top" | "bottom";
  color: string;
}> = ({ items, itemType, onClose, position, color }) => {
  const bannerStyle = {
    backgroundColor: color,
    ...(position === "top" ? { top: 0 } : { bottom: 0 })
  };

  // Create appropriate message based on type
  const getHeader = () => {
    if (items.length === 1) {
      return `⚠️ Boycott Alert: ${items[0].rule} is being boycotted!`;
    } else {
      if (itemType === "brands") {
        return `⚠️ Boycott Alert: ${items.length} brands on this page are being boycotted!`;
      } else if (itemType === "domains") {
        return `⚠️ Boycott Alert: This website is being boycotted!`;
      } else {
        return `⚠️ Boycott Alert: This website and ${items.length - 1} other items are being boycotted!`;
      }
    }
  };

  return (
    <div id="boykot-banner" className={styles.banner} style={bannerStyle}>
      <button onClick={onClose} className={styles.closeButton}>
        ×
      </button>
      <div>
        <div className={styles.header}>{getHeader()}</div>
        <div className={styles.brandList}>
          {items.length === 1 ? (
            <>
              Reason: {items[0].reason}
              {items[0].url && (
                <a
                  href={items[0].url}
                  className={styles.learnMore}
                  target="_blank"
                  rel="noopener noreferrer">
                  {" "}
                  Learn more
                </a>
              )}
            </>
          ) : (
            <>
              {itemType === "brands"
                ? "Brands: "
                : itemType === "domains"
                  ? "Domains: "
                  : "Items: "}
              {items.map((b) => b.rule).join(", ")}
              <button
                className={styles.detailsButton}
                onClick={() => sendToBackground({ name: "openPopup" })}>
                View Details
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AlertNotification: React.FC<{
  items: Filter[];
  itemType: "brands" | "domains" | "mixed";
  onClose: () => void;
  color: string;
  duration: number;
}> = ({ items, itemType, onClose, color, duration }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const alertStyle = {
    backgroundColor: color
  };

  // Create appropriate message based on type
  const getHeader = () => {
    if (items.length === 1) {
      return `⚠️ Boycott Alert: ${items[0].rule}`;
    } else {
      if (itemType === "brands") {
        return `⚠️ Boycott Alert: ${items.length} brands detected`;
      } else if (itemType === "domains") {
        return `⚠️ Boycott Alert: This website is boycotted`;
      } else {
        return `⚠️ Boycott Alert: Multiple boycotted items detected`;
      }
    }
  };

  return (
    <div
      id="boykot-alert"
      className={`${styles.alert} ${isVisible ? styles.alertVisible : styles.alertHidden}`}
      style={alertStyle}>
      <button onClick={onClose} className={styles.alertCloseButton}>
        ×
      </button>
      <div>
        <div className={styles.alertHeader}>{getHeader()}</div>
        {items.length === 1 ? (
          <>
            <div className={styles.reason}>{items[0].reason}</div>
            {items[0].url && (
              <a
                href={items[0].url}
                className={styles.alertDetailsButton}
                target="_blank"
                rel="noopener noreferrer">
                Learn more
              </a>
            )}
          </>
        ) : (
          <>
            <div>{items.map((b) => b.rule).join(", ")}</div>
            <button
              className={styles.alertDetailsButton}
              onClick={() => sendToBackground({ name: "openPopup" })}>
              View Details
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const removeExistingNotifications = () => {
  const banner = document.getElementById("boykot-banner");
  const alert = document.getElementById("boykot-alert");
  banner?.remove();
  alert?.remove();
};

const createNotificationContainer = () => {
  const container = document.createElement("div");
  container.id = "boykot-container";
  document.body.appendChild(container);
  return container;
};

const buildParentListsMap = (lists: any[]): Record<string, string> => {
  const parentListsMap: Record<string, string> = {};

  lists.forEach((list) => {
    if (list.url) {
      list.brands?.forEach((brand: Filter) => {
        if (!brand.url) {
          parentListsMap[brand.rule] = list.url;
        }
      });

      list.domains?.forEach((domain: Filter) => {
        if (!domain.url) {
          parentListsMap[domain.rule] = list.url;
        }
      });
    }
  });

  return parentListsMap;
};

// Main scanning function
const scanPage = async (
  brands: Filter[],
  domains: Filter[],
  parentListsMap?: Record<string, string>
) => {
  if (!brands.length && !domains.length) return;

  log("Scanning page for boycotted brands and domains...");
  log("Looking for these brands:", brands.map((b) => b.rule).join(", "));
  log("Looking for these domains:", domains.map((d) => d.rule).join(", "));

  try {
    detectedDomains = scanPageForDomains(domains);

    if (detectedDomains.length == 0) {
      log("Starting quick scan");
      let detected = scanPageForBrands(brands);

      if (!detected.length) {
        log("Quick scan found nothing, trying deep scan");
        detected = deepScanForBrands(brands);
      }

      detectedBrands = detected;
    }

    log("Detected brands:", detectedBrands.map((b) => b.rule).join(", "));
    log("Detected domains:", detectedDomains.map((d) => d.rule).join(", "));

    if (detectedBrands.length > 0 || detectedDomains.length > 0) {
      const preferences = await getUserPreferences();
      const { notificationSettings } = preferences;

      removeExistingNotifications();

      const container = createNotificationContainer();
      const root = createRoot(container);

      let notificationItems: Filter[];
      let itemType: "brands" | "domains" | "mixed";

      if (detectedBrands.length > 0 && detectedDomains.length > 0) {
        notificationItems = [...detectedDomains, ...detectedBrands];
        itemType = "mixed";
      } else if (detectedBrands.length > 0) {
        notificationItems = detectedBrands;
        itemType = "brands";
      } else {
        notificationItems = detectedDomains;
        itemType = "domains";
      }

      if (parentListsMap) {
        notificationItems = notificationItems.map((item) => {
          if (!item.url && parentListsMap[item.rule]) {
            return { ...item, url: parentListsMap[item.rule] };
          }
          return item;
        });
      }

      if (notificationSettings.showBanner) {
        root.render(
          <NotificationBanner
            items={notificationItems}
            itemType={itemType}
            onClose={() => {
              const banner = document.getElementById("boykot-banner");
              banner?.remove();
            }}
            position={notificationSettings.bannerPosition}
            color={notificationSettings.bannerColor}
          />
        );
      }

      if (notificationSettings.showAlert) {
        const alertContainer = document.createElement("div");
        document.body.appendChild(alertContainer);
        const alertRoot = createRoot(alertContainer);
        alertRoot.render(
          <AlertNotification
            items={notificationItems}
            itemType={itemType}
            onClose={() => {
              const alert = document.getElementById("boykot-alert");
              alert?.remove();
            }}
            color={notificationSettings.bannerColor}
            duration={notificationSettings.alertDuration}
          />
        );
      }
    }
  } catch (err) {
    error("Error scanning page:", err);
  }
};

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === "scanPage") {
    const parentListsMap = message.parentLists
      ? buildParentListsMap(message.parentLists)
      : undefined;
    scanPage(message.brands, message.domains, parentListsMap);
    return Promise.resolve();
  } else if (message.action === "getDetectedBrands") {
    return Promise.resolve({
      brands: detectedBrands,
      domains: detectedDomains
    });
  }
  return Promise.reject(new Error("Unknown message action"));
});

const initialScan = async () => {
  try {
    const preferences = await getUserPreferences();
    if (!preferences.notificationSettings.showOnPageLoad) {
      return;
    }

    const response = await sendToBackground<RequestBody, ResponseBody>({
      name: "getBrands"
    });

    if (!response.subscribedLists || response.subscribedLists.length == 0) {
      return;
    }

    const brands = response.subscribedLists.flatMap((l) => l.brands);
    const domains = response.subscribedLists.flatMap((l) => l.domains);

    if (brands?.length == 0 && domains?.length == 0) return;

    const parentListsMap = buildParentListsMap(response.subscribedLists);
    await scanPage(brands, domains, parentListsMap);
  } catch (e) {
    error("Error during initial scan:", e);
  }
};

initialScan();

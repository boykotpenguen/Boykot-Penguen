import browser from "webextension-polyfill";

import type { PlasmoMessaging } from "@plasmohq/messaging";

import { error } from "~util/logger";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const sender = req.sender;
  if (sender && sender.tab && sender.tab.id) {
    if (process.env.PLASMO_BROWSER === "firefox") return;
    try {
      await browser.action.openPopup();
    } catch (err) {
      error("Error opening popup:", err);
    }
  }
};

export default handler;

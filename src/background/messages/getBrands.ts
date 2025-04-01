import type { PlasmoMessaging } from "@plasmohq/messaging";

import { error } from "~util/logger";
import { getSubscribedBoycottList } from "~util/storage";
import type { BoycottList } from "~util/types";

export type RequestBody = {};

export type ResponseBody = {
  subscribedLists?: BoycottList[];
};

const handler: PlasmoMessaging.MessageHandler<
  RequestBody,
  ResponseBody
> = async (request, response) => {
  try {
    const lists = await getSubscribedBoycottList();
    response.send({ subscribedLists: lists });
  } catch (e) {
    error("Error getting brands:", e);
  }
};

export default handler;

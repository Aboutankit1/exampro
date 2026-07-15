import Notification from "../models/Notification.js";

/**
 * Create notifications for one or many recipients at once.
 * @param {string[]} userIds - recipient user ids
 * @param {{institute?: string, title: string, message: string, type?: string, relatedExam?: string}} payload
 */
export const notifyUsers = async (userIds, payload) => {
  if (!userIds || userIds.length === 0) return;
  const docs = userIds.map((recipient) => ({
    recipient,
    institute: payload.institute,
    title: payload.title,
    message: payload.message,
    type: payload.type || "system",
    relatedExam: payload.relatedExam,
  }));
  await Notification.insertMany(docs);
};

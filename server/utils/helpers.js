const { sql } = require('../db');

/**
 * Log an activity event
 * @param {string} userId
 * @param {string|null} projectId
 * @param {string|null} taskId
 * @param {string} action
 * @param {object} meta
 */
async function logActivity(userId, projectId, taskId, action, meta = {}) {
  try {
    await sql`
      INSERT INTO activity_log (user_id, project_id, task_id, action, meta)
      VALUES (${userId}, ${projectId || null}, ${taskId || null}, ${action}, ${JSON.stringify(meta)})
    `;
  } catch (err) {
    // Non-fatal — log but don't throw
    console.error('Activity log failed:', err.message);
  }
}

/**
 * Send a notification to a user
 */
async function notify(userId, type, title, body = null, link = null) {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (${userId}, ${type}, ${title}, ${body}, ${link})
    `;
    // Push via WebSocket if user is connected
    if (global.notifyUser) {
      const [notif] = await sql`
        SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1
      `;
      global.notifyUser(userId, { type: 'notification', notification: notif });
    }
  } catch (err) {
    console.error('Notify failed:', err.message);
  }
}

module.exports = { logActivity, notify };

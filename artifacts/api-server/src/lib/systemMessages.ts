import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

type SystemMessage = { subject: string; body: string; category?: string; kind?: string };

/**
 * Adds a notice from the Bazunk team to a user's inbox ("From Bazunk").
 * Pass `kind` for notices that must only ever be sent once per user (e.g. "welcome").
 * Never throws: a failed notice must not break the action that triggered it.
 */
export async function sendSystemMessage(email: string, msg: SystemMessage): Promise<void> {
  if (!email) return;
  try {
    const category = msg.category ?? "Notification";
    const kind = msg.kind ?? null;
    const created = await db.execute(sql`
      INSERT INTO support_tickets (email, subject, category, status, kind)
      VALUES (${email}, ${msg.subject}, ${category}, 'closed', ${kind})
      ON CONFLICT (email, kind) WHERE kind IS NOT NULL DO NOTHING
      RETURNING id
    `);
    const id = (created.rows[0] as { id?: number } | undefined)?.id;
    if (!id) return; // a one-time notice that was already sent
    await db.execute(sql`
      INSERT INTO support_ticket_messages (ticket_id, author, author_type, body, read_by_user)
      VALUES (${id}, 'Bazunk', 'admin', ${msg.body}, FALSE)
    `);
  } catch (err) {
    logger.error({ err, email }, "Failed to send system message");
  }
}

export function sendWelcomeMessage(email: string): Promise<void> {
  return sendSystemMessage(email, {
    kind: "welcome",
    category: "Welcome",
    subject: "Welcome to Bazunk!",
    body:
      "Welcome to Bazunk, the UK's peer-to-peer marketplace! \u{1F389}\n\n" +
      "Your account is all set up. You can start browsing listings, make offers, or list your first item for sale.\n\n" +
      "Notices about your listings, promotions, orders and credits will appear here. " +
      "If you ever need help, open a ticket from the Support page.\n\n" +
      "The Bazunk team",
  });
}

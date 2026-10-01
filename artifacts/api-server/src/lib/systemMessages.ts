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
    if (kind) {
      // Heal: a one-time notice that exists with no message in it would block the real one forever.
      await db.execute(sql`
        DELETE FROM support_tickets t
        WHERE t.email = ${email} AND t.kind = ${kind}
          AND NOT EXISTS (SELECT 1 FROM support_ticket_messages m WHERE m.ticket_id = t.id)
      `);
    }
    // One statement: the notice and its message are created together or not at all.
    await db.execute(sql`
      WITH t AS (
        INSERT INTO support_tickets (email, subject, category, status, kind)
        VALUES (${email}, ${msg.subject}, ${category}, 'closed', ${kind})
        ON CONFLICT (email, kind) WHERE kind IS NOT NULL DO NOTHING
        RETURNING id
      )
      INSERT INTO support_ticket_messages (ticket_id, author, author_type, body, read_by_user)
      SELECT id, 'Bazunk'::text, 'admin'::text, ${msg.body}::text, FALSE FROM t
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

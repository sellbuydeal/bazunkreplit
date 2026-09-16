import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── User-facing: create ticket ─────────────────────────────────────────────

router.post("/support/tickets", async (req, res) => {
  try {
    const { email, subject, category, body } = req.body;
    if (!email || !subject || !body) {
      res.status(400).json({ error: "email, subject, and body are required" }); return;
    }

    const [ticket] = await db.execute(
      sql`INSERT INTO support_tickets (email, subject, category)
          VALUES (${email}, ${subject}, ${category ?? "general"})
          RETURNING id, email, subject, category, status, created_at`
    ).then(r => r.rows as any[]);

    await db.execute(
      sql`INSERT INTO support_ticket_messages (ticket_id, author, author_type, body)
          VALUES (${ticket.id}, ${email}, 'user', ${body})`
    );

    logger.info({ ticketId: ticket.id, email }, "Support ticket created");
    res.status(201).json({ ticket });
  } catch (err) {
    logger.error({ err }, "Failed to create support ticket");
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ── User-facing: list own tickets ─────────────────────────────────────────

router.get("/support/tickets", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const tickets = await db.execute(
      sql`SELECT t.id, t.subject, t.category, t.status, t.priority, t.created_at, t.updated_at,
               (SELECT COUNT(*)::int FROM support_ticket_messages WHERE ticket_id = t.id) AS message_count
          FROM support_tickets t
          WHERE t.email = ${email}
          ORDER BY t.updated_at DESC`
    ).then(r => r.rows);

    res.json({ tickets });
  } catch (err) {
    logger.error({ err }, "Failed to list support tickets");
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

// ── User-facing: get one ticket with messages ─────────────────────────────

router.get("/support/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const [ticket] = await db.execute(
      sql`SELECT id, email, subject, category, status, priority, created_at, updated_at
          FROM support_tickets WHERE id = ${id} AND email = ${email}`
    ).then(r => r.rows as any[]);

    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const messages = await db.execute(
      sql`SELECT id, author, author_type, body, created_at
          FROM support_ticket_messages
          WHERE ticket_id = ${id}
          ORDER BY created_at ASC`
    ).then(r => r.rows);

    res.json({ ticket, messages });
  } catch (err) {
    logger.error({ err }, "Failed to get support ticket");
    res.status(500).json({ error: "Failed to get ticket" });
  }
});

// ── User-facing: reply to own ticket ─────────────────────────────────────

router.post("/support/tickets/:id/reply", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, body } = req.body;
    if (!email || !body) { res.status(400).json({ error: "email and body required" }); return; }

    const [ticket] = await db.execute(
      sql`SELECT id, status FROM support_tickets WHERE id = ${id} AND email = ${email}`
    ).then(r => r.rows as any[]);

    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    if (ticket.status === "closed") { res.status(400).json({ error: "Ticket is closed" }); return; }

    await db.execute(
      sql`INSERT INTO support_ticket_messages (ticket_id, author, author_type, body)
          VALUES (${id}, ${email}, 'user', ${body})`
    );
    await db.execute(
      sql`UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = ${id}`
    );

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to reply to ticket");
    res.status(500).json({ error: "Failed to reply" });
  }
});

// ── Admin routes (require token) ─────────────────────────────────────────

router.use("/admin/support", requireAdmin);

// Admin: list all tickets

router.get("/admin/support/tickets", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let whereClause = sql`WHERE 1=1`;
    if (status && status !== "all") whereClause = sql`${whereClause} AND t.status = ${status}`;
    if (search) whereClause = sql`${whereClause} AND (t.email ILIKE ${"%" + search + "%"} OR t.subject ILIKE ${"%" + search + "%"})`;

    const tickets = await db.execute(
      sql`SELECT t.id, t.email, t.subject, t.category, t.status, t.priority,
               t.created_at, t.updated_at,
               (SELECT COUNT(*)::int FROM support_ticket_messages WHERE ticket_id = t.id) AS message_count
          FROM support_tickets t
          ${whereClause}
          ORDER BY
            CASE WHEN t.status = 'open' THEN 0 WHEN t.status = 'in-progress' THEN 1 ELSE 2 END,
            t.updated_at DESC
          LIMIT ${limit} OFFSET ${offset}`
    ).then(r => r.rows);

    const [{ total }] = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM support_tickets t ${whereClause}`
    ).then(r => r.rows as any[]);

    res.json({ tickets, total });
  } catch (err) {
    logger.error({ err }, "Failed to list admin support tickets");
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

// Admin: get one ticket with messages

router.get("/admin/support/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [ticket] = await db.execute(
      sql`SELECT id, email, subject, category, status, priority, created_at, updated_at
          FROM support_tickets WHERE id = ${id}`
    ).then(r => r.rows as any[]);

    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const messages = await db.execute(
      sql`SELECT id, author, author_type, body, created_at
          FROM support_ticket_messages
          WHERE ticket_id = ${id}
          ORDER BY created_at ASC`
    ).then(r => r.rows);

    res.json({ ticket, messages });
  } catch (err) {
    logger.error({ err }, "Failed to get admin ticket");
    res.status(500).json({ error: "Failed to get ticket" });
  }
});

// Admin: reply to ticket

router.post("/admin/support/tickets/:id/reply", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { body } = req.body;
    if (!body) { res.status(400).json({ error: "body required" }); return; }

    const [ticket] = await db.execute(
      sql`SELECT id FROM support_tickets WHERE id = ${id}`
    ).then(r => r.rows as any[]);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    await db.execute(
      sql`INSERT INTO support_ticket_messages (ticket_id, author, author_type, body)
          VALUES (${id}, 'Support Team', 'admin', ${body})`
    );
    await db.execute(
      sql`UPDATE support_tickets SET status = 'in-progress', updated_at = NOW() WHERE id = ${id}`
    );

    logger.info({ ticketId: id }, "Admin replied to support ticket");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to admin reply");
    res.status(500).json({ error: "Failed to reply" });
  }
});

// Admin: update ticket (status, priority)

router.patch("/admin/support/tickets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, priority } = req.body;

    const [updated] = await db.execute(
      sql`UPDATE support_tickets
          SET status = COALESCE(${status ?? null}, status),
              priority = COALESCE(${priority ?? null}, priority),
              updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, status, priority`
    ).then(r => r.rows as any[]);

    if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }

    logger.info({ ticketId: id, status, priority }, "Admin updated ticket");
    res.json({ ticket: updated });
  } catch (err) {
    logger.error({ err }, "Failed to update ticket");
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;

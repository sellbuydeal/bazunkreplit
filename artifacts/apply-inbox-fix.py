import os
API = "artifacts/api-server/src/"
WEB = "artifacts/sellbuydeal/src/"

def edit(path, old, new):
    s = open(path).read()
    if new in s:
        print("already applied:", path); return
    if old not in s:
        raise SystemExit("COULD NOT FIND text to replace in " + path + ":\n" + old[:150])
    open(path, "w").write(s.replace(old, new, 1))
    print("edited:", path)

# ---------- 1. NEW FILE: notices from the Bazunk team ----------
SM = API + "lib/systemMessages.ts"
if os.path.exists(SM):
    print("already applied:", SM)
else:
    open(SM, "w").write('''import { db } from "@workspace/db";
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
      "Welcome to Bazunk, the UK's peer-to-peer marketplace! \\u{1F389}\\n\\n" +
      "Your account is all set up. You can start browsing listings, make offers, or list your first item for sale.\\n\\n" +
      "Notices about your listings, promotions, orders and credits will appear here. " +
      "If you ever need help, open a ticket from the Support page.\\n\\n" +
      "The Bazunk team",
  });
}
''')
    print("created:", SM)

# ---------- 2. Database tables (they were never created by the app itself) ----------
edit(API + "index.ts",
'''    "orders_session_line_uniq",
  );
''',
'''    "orders_session_line_uniq",
  );

  await run(sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      kind TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "support_tickets");
  await run(sql`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS kind TEXT`, "support_tickets.kind");
  await run(sql`CREATE INDEX IF NOT EXISTS support_tickets_email_idx ON support_tickets (email)`, "support_tickets_email_idx");
  await run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_email_kind_uniq ON support_tickets (email, kind) WHERE kind IS NOT NULL`,
    "support_tickets_email_kind_uniq",
  );
  await run(sql`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      author_type TEXT NOT NULL,
      body TEXT NOT NULL,
      read_by_user BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "support_ticket_messages");
  await run(
    sql`ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS read_by_user BOOLEAN NOT NULL DEFAULT FALSE`,
    "support_ticket_messages.read_by_user",
  );
  await run(
    sql`CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON support_ticket_messages (ticket_id)`,
    "support_ticket_messages_ticket_idx",
  );
''')

# ---------- 3. Inbox + mark-as-read endpoints ----------
SUP = API + "routes/support.ts"
edit(SUP,
'import { logger } from "../lib/logger.js";',
'import { logger } from "../lib/logger.js";\nimport { sendWelcomeMessage } from "../lib/systemMessages.js";')
edit(SUP,
'// ── Admin routes (require token) ─────────────────────────────────────────\n',
'''// ── User-facing: the whole inbox (tickets + notices, with messages) ──────

router.get("/support/inbox", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    // Every account gets exactly one welcome notice (no-op if it already exists).
    await sendWelcomeMessage(email);

    const tickets = await db.execute(
      sql`SELECT id, subject, category, status FROM support_tickets
          WHERE email = ${email} ORDER BY updated_at DESC, id DESC`
    ).then(r => r.rows as any[]);

    const messages = await db.execute(
      sql`SELECT m.id, m.ticket_id, m.author_type, m.body, m.read_by_user, m.created_at
          FROM support_ticket_messages m
          JOIN support_tickets t ON t.id = m.ticket_id
          WHERE t.email = ${email}
          ORDER BY m.created_at ASC, m.id ASC`
    ).then(r => r.rows as any[]);

    res.json({
      tickets: tickets.map((t) => {
        const own = messages.filter((m) => m.ticket_id === t.id);
        return {
          id: t.id,
          subject: t.subject,
          category: t.category,
          status: t.status,
          unread: own.filter((m) => m.author_type !== "user" && !m.read_by_user).length,
          messages: own.map((m) => ({
            id: m.id,
            sender: m.author_type === "user" ? "me" : "bazunk",
            text: m.body,
            timestamp: m.created_at,
            read: m.author_type === "user" || Boolean(m.read_by_user),
          })),
        };
      }),
    });
  } catch (err) {
    logger.error({ err }, "Failed to load inbox");
    res.status(500).json({ error: "Failed to load inbox" });
  }
});

// ── User-facing: mark a ticket's messages as read ────────────────────────

router.post("/support/tickets/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email } = req.body;
    if (!email || !Number.isInteger(id)) { res.status(400).json({ error: "email and ticket id required" }); return; }
    await db.execute(
      sql`UPDATE support_ticket_messages SET read_by_user = TRUE
          WHERE ticket_id = ${id}
            AND EXISTS (SELECT 1 FROM support_tickets WHERE id = ${id} AND email = ${email})`
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to mark ticket read");
    res.status(500).json({ error: "Failed to mark read" });
  }
});

// ── Admin routes (require token) ─────────────────────────────────────────
''')

# ---------- 4. Events that send a notice ----------
# 4a. new account -> welcome
edit(API + "storage.ts",
'import { db, usersTable, creditTransactionsTable } from "@workspace/db";',
'import { db, usersTable, creditTransactionsTable } from "@workspace/db";\nimport { sendWelcomeMessage } from "./lib/systemMessages.js";')
edit(API + "storage.ts",
'''      await this.completeMilestone(email, "welcome-bonus").catch(() => {});
      return inserted;''',
'''      await this.completeMilestone(email, "welcome-bonus").catch(() => {});
      void sendWelcomeMessage(email);
      return inserted;''')

# 4b. new listing
edit(API + "routes/listings.ts",
'import { refreshSellerMilestones } from "../lib/milestones.js";',
'import { refreshSellerMilestones } from "../lib/milestones.js";\nimport { sendSystemMessage } from "../lib/systemMessages.js";')
edit(API + "routes/listings.ts",
'    void refreshSellerMilestones(sellerEmail);\n',
'''    void refreshSellerMilestones(sellerEmail);
    void sendSystemMessage(sellerEmail, {
      category: "Listings",
      subject: "Your listing is live",
      body:
        `Your item "${(listing as { title?: string }).title ?? "your item"}" has been listed on Bazunk.\\n\\n` +
        "Tip: you can promote it with credits to reach more buyers.",
    });
''')

# 4c. promotion bought
edit(API + "routes/promotions.ts",
'import { logger } from "../lib/logger.js";',
'import { logger } from "../lib/logger.js";\nimport { sendSystemMessage } from "../lib/systemMessages.js";')
edit(API + "routes/promotions.ts",
'    logger.info({ email, type, listingId, cost: config.cost, newBalance }, "Promotion applied");\n',
'''    logger.info({ email, type, listingId, cost: config.cost, newBalance }, "Promotion applied");
    void sendSystemMessage(email, {
      category: "Promotions",
      subject: `${config.label} activated`,
      body:
        `Your ${config.label} promotion is now active on listing #${listingId} until ` +
        `${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.\\n\\n` +
        `You spent ${Math.round(config.cost * 100)} credits. Your new balance is ${Math.round(Number(newBalance) * 100)} credits.`,
    });
''')

# 4d. credits bought
edit(API + "routes/stripe.ts",
'import { fulfillCartSession } from "../lib/fulfillment.js";',
'import { fulfillCartSession } from "../lib/fulfillment.js";\nimport { sendSystemMessage } from "../lib/systemMessages.js";')
edit(API + "routes/stripe.ts",
'    void sendCreditsConfirmation({ email, creditsAdded: totalCredits, newBalance: balance });\n',
'''    void sendCreditsConfirmation({ email, creditsAdded: totalCredits, newBalance: balance });
    void sendSystemMessage(email, {
      category: "Credits",
      subject: "Credits added to your account",
      body:
        `We've added ${Math.round(totalCredits * 100)} credits (\\u00A3${totalCredits.toFixed(2)}) to your account.\\n\\n` +
        `Your new balance is ${Math.round(Number(balance) * 100)} credits.`,
    });
''')

# 4e. order placed (buyer) and item sold (seller)
F = API + "lib/fulfillment.ts"
edit(F,
'import { refreshSellerMilestones } from "./milestones.js";',
'import { refreshSellerMilestones } from "./milestones.js";\nimport { sendSystemMessage } from "./systemMessages.js";')
edit(F,
'    const sellers = new Set<string>();\n',
'    const sellers = new Set<string>();\n    const sellerItems = new Map<string, string[]>();\n')
edit(F,
'      if (seller) sellers.add(seller);\n',
'''      if (seller) {
        sellers.add(seller);
        sellerItems.set(seller, [...(sellerItems.get(seller) ?? []), `${row.title as string}${l.qty > 1 ? ` x${l.qty}` : ""}`]);
      }
''')
edit(F,
'''    for (const seller of sellers) {
      void refreshSellerMilestones(seller);
    }
''',
'''    for (const seller of sellers) {
      void refreshSellerMilestones(seller);
      void sendSystemMessage(seller, {
        category: "Sales",
        subject: "You made a sale",
        body: `Great news! Someone just bought:\\n\\n${(sellerItems.get(seller) ?? []).join("\\n")}\\n\\nOpen your Sales page to see the order details.`,
      });
    }

    if (emailItems.length) {
      void sendSystemMessage(buyerEmail, {
        category: "Orders",
        subject: "Order confirmed",
        body: `Thanks for your purchase! Your order has been placed:\\n\\n${emailItems.map((i) => i.title + (i.quantity > 1 ? ` x${i.quantity}` : "")).join("\\n")}\\n\\nYou can follow it from your Orders page.`,
      });
    }
''')

# ---------- 5. The Messages box: real data instead of the hardcoded demo tickets ----------
O = WEB + "components/MessageCenterOverlay.tsx"
s = open(O).read()
a = s.find("// ── Mock support tickets")
b = s.find("// ── Helpers")
if a != -1 and b != -1 and a < b:
    open(O, "w").write(s[:a] + s[b:])
    print("edited:", O, "(removed the hardcoded demo tickets)")
else:
    print("already applied:", O, "(demo tickets)")

edit(O,
'import { ALL_PRODUCTS } from "@/data/products";',
'import { ALL_PRODUCTS } from "@/data/products";\nimport { useAuth } from "@/context/AuthContext";')
edit(O,
'  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);',
'  const [tickets, setTickets] = useState<SupportTicket[]>([]);')
edit(O,
'  const { offers, respondToOffer, respondToCounter, pendingCount } = useOffers();\n',
'''  const { offers, respondToOffer, respondToCounter, pendingCount } = useOffers();
  const { user } = useAuth();

  // Start empty for every account; never show another user's messages.
  useEffect(() => { setTickets([]); }, [user?.email]);

  const loadInbox = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/support/inbox?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTickets((data.tickets ?? []).map((t: any) => ({
        id: t.id,
        type: "support" as const,
        subject: t.subject,
        status: t.status,
        category: t.category,
        unread: t.unread,
        messages: (t.messages ?? []).map((m: any) => ({
          id: m.id, senderId: m.sender, text: m.text, timestamp: m.timestamp, read: m.read,
        })),
      })));
    } catch {
      /* keep what we have */
    }
  }, [user?.email]);

  useEffect(() => { if (open) void loadInbox(); }, [open, loadInbox]);
''')
edit(O,
'    } : t));\n  }\n\n  function openOffer',
'''    } : t));
    if (user?.email) {
      void fetch(`/api/support/tickets/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      }).catch(() => {});
    }
  }

  function openOffer''')

s = open(O).read()
a = s.find("  function sendSupportReply() {")
b = s.find("  function toggleSelect(")
if a != -1 and b != -1 and a < b:
    new_fn = '''  async function sendSupportReply() {
    if (!supportInput.trim() || !activeSupportId || !user?.email) return;
    const text = supportInput.trim();
    const ticketId = activeSupportId;
    setSupportInput("");
    const newMsg: SupportMessage = { id: Date.now(), senderId: "me", text, timestamp: new Date().toISOString(), read: true };
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, messages: [...t.messages, newMsg] } : t));
    try {
      await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, body: text }),
      });
    } catch {
      /* the reload below shows what was really saved */
    }
    void loadInbox();
  }

'''
    open(O, "w").write(s[:a] + new_fn + s[b:])
    print("edited:", O, "(replies now go to the server, no fake auto-reply)")
else:
    print("already applied:", O, "(reply function)")

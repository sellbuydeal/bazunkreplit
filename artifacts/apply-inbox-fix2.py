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

# 1. Create a notice and its message in ONE database step, and clear out any half-made welcome notice
edit(API + "lib/systemMessages.ts",
'''    const created = await db.execute(sql`
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
    `);''',
'''    if (kind) {
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
    `);''')

# 2. Inbox never returns a notice that has no messages
edit(API + "routes/support.ts",
'''          WHERE email = ${email} ORDER BY updated_at DESC, id DESC`''',
'''          WHERE email = ${email}
            AND EXISTS (SELECT 1 FROM support_ticket_messages m WHERE m.ticket_id = support_tickets.id)
          ORDER BY updated_at DESC, id DESC`''')

# 3. Messages box: never crash on an empty thread, load again shortly after opening, and keep refreshing while open
O = WEB + "components/MessageCenterOverlay.tsx"
edit(O,
'  const last = ticket.messages[ticket.messages.length - 1];',
'  const last = ticket.messages[ticket.messages.length - 1] ?? { timestamp: new Date().toISOString() };')
edit(O,
'  useEffect(() => { if (open) void loadInbox(); }, [open, loadInbox]);',
'''  useEffect(() => {
    if (!open) return;
    void loadInbox();
    const retry = setTimeout(() => { void loadInbox(); }, 2500);
    const poll = setInterval(() => { void loadInbox(); }, 20000);
    return () => { clearTimeout(retry); clearInterval(poll); };
  }, [open, loadInbox]);''')

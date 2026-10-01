API = "artifacts/api-server/src/"
WEB = "artifacts/sellbuydeal/src/"

def read(path):
    return open(path, encoding="utf-8").read()

def write(path, s):
    open(path, "w", encoding="utf-8").write(s)

def edit(path, old, new):
    s = read(path)
    if new in s:
        print("already applied:", path); return
    if old not in s:
        raise SystemExit("COULD NOT FIND text to replace in " + path + ":\n" + old[:150])
    write(path, s.replace(old, new, 1))
    print("edited:", path)

# ---------------- SERVER: only real orders, only within 30 days ----------------
D = API + "routes/disputes.ts"
s = read(D)
if "eligible-orders" in s:
    print("already applied:", D)
else:
    a = s.index('router.post("/disputes", async (req, res) => {')
    end_marker = "  res.status(201).json({ id });\n});\n"
    b = s.index(end_marker, a) + len(end_marker)
    new_block = '''// Orders a buyer can still dispute: their own, not cancelled, bought in the last 30 days,
// and with no dispute already open.
router.get("/disputes/eligible-orders", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT o.id, o.item_title, o.seller_email, o.price, o.created_at,
           GREATEST(0, 30 - FLOOR(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 86400))::int AS days_left
    FROM orders o
    WHERE o.buyer_email = ${email}
      AND o.status <> 'cancelled'
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_id = o.id AND d.status <> 'closed')
    ORDER BY o.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/disputes", async (req, res) => {
  const { buyerEmail, orderId, reason, description } = req.body as Record<string, string>;
  if (!buyerEmail || !orderId || !reason || !description) {
    res.status(400).json({ error: "Please choose an order and describe the issue." });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }

  // The order must exist, belong to this buyer, and have been bought within the last 30 days.
  // The item and seller always come from the order itself, never from the form.
  const order = (await db.execute(sql`
    SELECT id, buyer_email, seller_email, item_title, status,
           (created_at >= NOW() - INTERVAL '30 days') AS in_window
    FROM orders WHERE id = ${orderId}
  `)).rows[0] as Record<string, unknown> | undefined;

  if (!order || order.buyer_email !== buyerEmail) {
    res.status(404).json({ error: "We couldn't find that order on your account." });
    return;
  }
  if (order.status === "cancelled") {
    res.status(400).json({ error: "This order was cancelled, so it can't be disputed." });
    return;
  }
  if (!order.in_window) {
    res.status(400).json({ error: "Disputes must be opened within 30 days of purchase, and this order is older than that." });
    return;
  }
  const existing = await db.execute(sql`SELECT 1 FROM disputes WHERE order_id = ${orderId} AND status <> 'closed' LIMIT 1`);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "A dispute is already open for this order." });
    return;
  }

  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO disputes (id, order_id, buyer_email, seller_email, item_title, reason, description, status, created_at, updated_at)
    VALUES (${id}, ${orderId}, ${buyerEmail}, ${(order.seller_email as string | null) ?? null}, ${order.item_title as string}, ${reason}, ${description}, 'open', NOW(), NOW())
  `);
  res.status(201).json({ id });
});
'''
    write(D, s[:a] + new_block + s[b:])
    print("edited:", D)

# Nobody should be able to create an order without paying. The website never used this route.
edit(API + "routes/orders.ts",
'router.post("/orders", async (req, res) => {',
'router.post("/orders", requireAdmin, async (req, res) => {')

# ---------------- WEBSITE: pick one of your real, recent orders ----------------
P = WEB + "pages/DashboardPage.tsx"
edit(P,
'  const [formError, setFormError] = useState("");\n\n  async function load() {\n    if (!user?.email) return;\n    setLoading(true);\n    try {\n      const res = await fetch(`/api/disputes?email=',
'''  const [formError, setFormError] = useState("");
  const [eligible, setEligible] = useState<Array<{ id: string; item_title: string; created_at: string; days_left: number }>>([]);

  async function loadEligible() {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/disputes/eligible-orders?email=${encodeURIComponent(user.email)}`);
      if (res.ok) setEligible(await res.json());
    } catch {
      /* keep the list as it is */
    }
  }

  async function load() {
    if (!user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes?email=''')

edit(P,
'  useEffect(() => { load(); }, [user?.email]);\n\n  async function submit() {',
'  useEffect(() => { load(); loadEligible(); }, [user?.email]);\n\n  async function submit() {')

edit(P,
'    if (!form.itemTitle.trim()) { setFormError("Please enter the item name."); return; }',
'    if (!form.orderId) { setFormError("Please choose the order you are disputing."); return; }')

edit(P,
'          orderId: form.orderId.trim() || undefined,\n          itemTitle: form.itemTitle.trim(),\n',
'          orderId: form.orderId,\n')

edit(P,
'''        await load();
      } else {
        setFormError("Something went wrong. Please try again.");
      }''',
'''        await load();
        await loadEligible();
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setFormError(data?.error ?? "Something went wrong. Please try again.");
      }''')

edit(P,
'onClick={() => { setShowForm(true); setSubmitted(false); }}',
'onClick={() => { setShowForm(true); setSubmitted(false); void loadEligible(); }}')

edit(P,
'''            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Item Name *</label>
              <input
                value={form.itemTitle}
                onChange={(e) => setForm((f) => ({ ...f, itemTitle: e.target.value }))}
                placeholder="e.g. MacBook Pro 14 inch"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Order ID <span className="text-gray-300 font-normal">(optional)</span></label>
              <input
                value={form.orderId}
                onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                placeholder="e.g. ORD-12345"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
              />
            </div>''',
'''            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Order *</label>
              {eligible.length === 0 ? (
                <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                  You have no orders from the last 30 days that can be disputed.
                </p>
              ) : (
                <select
                  value={form.orderId}
                  onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
                >
                  <option value="">Choose the order you are disputing...</option>
                  {eligible.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.item_title} - {o.id} - {new Date(o.created_at).toLocaleDateString("en-GB")} ({o.days_left} days left)
                    </option>
                  ))}
                </select>
              )}
            </div>''')

edit(P,
'                onClick={submit}\n                disabled={submitting}',
'                onClick={submit}\n                disabled={submitting || eligible.length === 0}')

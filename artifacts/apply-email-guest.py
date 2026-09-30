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

# ---------- EMAIL: send through Resend directly (works on Render) ----------
E = API + "email.ts"
edit(E,
'const FROM = "Bazunk <onboarding@resend.dev>";',
'''const FROM = process.env.EMAIL_FROM ?? "Bazunk <onboarding@resend.dev>";
const SITE = process.env.PUBLIC_BASE_URL ?? "https://bazunk-web.onrender.com";''')

edit(E,
'''    const connectors = new ReplitConnectors();
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });''',
'''    const payload = JSON.stringify({ from: FROM, to: [to], subject, html });
    const res = process.env.RESEND_API_KEY
      ? await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: payload,
        })
      : await new ReplitConnectors().proxy("resend", "/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });''')

s = open(E).read()
if "https://bazunk.replit.app" in s:
    open(E, "w").write(s.replace("https://bazunk.replit.app", "${SITE}"))
    print("edited:", E, "(links now use your Render URL)")

# ---------- SERVER: confirm route no longer needs a signed-in email ----------
edit(API + "routes/stripe.ts",
'''    const freeOrder = body.freeOrder === true;

    if (!email) { res.status(400).json({ error: "email required" }); return; }''',
'''    const freeOrder = body.freeOrder === true;

    if (!email && !sessionId) { res.status(400).json({ error: "email required" }); return; }''')

# ---------- CHECKOUT PAGE: guest checkout ----------
C = WEB + "pages/CheckoutPage.tsx"
edit(C,
'  const [confirming, setConfirming] = useState(false);\n',
'  const [confirming, setConfirming] = useState(false);\n  const [guestEmail, setGuestEmail] = useState("");\n')

edit(C,
'    if (!sessionId || !user?.email) return;',
'    if (!sessionId) return;')

edit(C,
'      body: JSON.stringify({ sessionId, email: user.email }),',
'      body: JSON.stringify({ sessionId }),')

edit(C,
'  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps\n',
'''  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the credit balance once the order is placed and the signed-in user has loaded
  useEffect(() => {
    if (placed && user?.email) refreshBalance();
  }, [placed, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps
''')

edit(C,
'''    if (!user?.email) {
      setCheckoutError("Please sign in to continue.");
      return;
    }''',
'''    const email = user?.email ?? guestEmail.trim();
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) {
      setCheckoutError("Please enter a valid email address to continue.");
      return;
    }''')

edit(C,
'''          email: user.email,
          name: user.name,
          items: items.map((i) => ({''',
'''          email,
          name: user?.name,
          items: items.map((i) => ({''')

edit(C,
'''                <button
                  onClick={handleContinueToPayment}''',
'''                {!user && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email for your receipt</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                      data-testid="input-guest-email"
                    />
                  </div>
                )}

                <button
                  onClick={handleContinueToPayment}''')

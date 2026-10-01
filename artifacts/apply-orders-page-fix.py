P = "artifacts/sellbuydeal/src/pages/DashboardPage.tsx"

def read(path):
    return open(path, encoding="utf-8").read()

def edit(path, old, new):
    s = read(path)
    if new in s:
        print("already applied:", path); return
    if old not in s:
        raise SystemExit("COULD NOT FIND text to replace in " + path + ":\n" + old[:150])
    open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))
    print("edited:", path)

# 1. Turn a real order from the server into what the Orders page shows
edit(P,
'function getTrackingSteps(step: number): TrackingStep[] {',
'''const ORDER_STATUS_UI: Record<string, { label: string; color: string; step: number }> = {
  pending:          { label: "Pending",          color: "bg-amber-100 text-amber-700",  step: 0 },
  confirmed:        { label: "Processing",       color: "bg-blue-100 text-blue-700",    step: 2 },
  preparing:        { label: "Processing",       color: "bg-blue-100 text-blue-700",    step: 2 },
  shipped:          { label: "In Transit",       color: "bg-indigo-100 text-indigo-700", step: 3 },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-700", step: 4 },
  delivered:        { label: "Delivered",        color: "bg-green-100 text-green-700",  step: 6 },
  cancelled:        { label: "Cancelled",        color: "bg-red-100 text-red-700",      step: 0 },
};

const ORDER_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/></svg>');

function toDashboardOrder(o: any): MockOrder {
  const ui = ORDER_STATUS_UI[String(o.status)] ?? ORDER_STATUS_UI.pending;
  return {
    id: String(o.id),
    title: String(o.item_title ?? "Item"),
    price: Number(o.price ?? 0),
    date: o.created_at
      ? new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "",
    status: ui.label,
    statusColor: ui.color,
    // Show only the first part of the seller's email, never the whole address
    seller: o.seller_email ? String(o.seller_email).split("@")[0] : "Seller",
    image: o.item_image ? String(o.item_image) : ORDER_IMAGE_PLACEHOLDER,
    trackingNumber: o.tracking_number ?? undefined,
    carrier: o.carrier ?? undefined,
    estimatedDelivery: o.estimated_delivery ?? undefined,
    address: o.address ?? undefined,
    trackingStep: ui.step,
  };
}

function getTrackingSteps(step: number): TrackingStep[] {''')

# 2. The Orders page now loads the signed-in buyer's real orders
edit(P,
'''  const { formatPrice } = useCurrency();
  const [orders] = useState<MockOrder[]>(MOCK_ORDERS_DATA);''',
'''  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const rows = await res.json();
          if (!cancelled) setOrders(rows.map(toDashboardOrder));
        }
      } catch {
        /* leave the list empty */
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);''')

# 3. Loading message while the orders are fetched
edit(P,
'''      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-200" />''',
'''      {ordersLoading ? (
        <div className="flex-1 flex items-center justify-center py-16 text-sm text-gray-400">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-200" />''')

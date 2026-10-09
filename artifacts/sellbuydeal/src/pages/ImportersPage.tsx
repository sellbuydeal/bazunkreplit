import { Link } from "wouter";
import { ArrowLeft, ArrowRight, PackageSearch, ShoppingBag, Globe2, Sparkles, RefreshCw, Link2, Boxes } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const importers=[
 {id:"ebay",name:"eBay",method:"Public URL data + third-party API",eyebrow:"UK & USA",description:"Import from an eBay URL, preview the listing, set your pricing and keep source data synced.",href:"/importers/ebay",icon:ShoppingBag,gradient:"from-blue-600 via-blue-500 to-cyan-400",status:"Live",features:["URL & batch import","6-hour sync","Original source link"]},
 {id:"amazon",name:"Amazon",method:"Third-party API (RapidAPI)",eyebrow:"Product importer",description:"Search marketplace inventory and bring products into your Bazunk store using your connected API.",href:"/importers/amazon",icon:PackageSearch,gradient:"from-orange-500 via-amber-500 to-yellow-400",status:"Live",features:["Product search","Pricing controls","Images & details"]},
 {id:"aliexpress",name:"AliExpress",method:"Third-party API (RapidAPI)",eyebrow:"Global products",description:"Search AliExpress inventory, choose products and create Bazunk listings with your own pricing.",href:"/importers/aliexpress",icon:Globe2,gradient:"from-rose-600 via-pink-500 to-orange-400",status:"Live",features:["Product search","Markup controls","Source tracking"]},
 {id:"shopify",name:"Shopify",method:"Public storefront JSON endpoint",eyebrow:"Store URL importer",description:"Paste a Shopify store, collection or product URL, choose products and create Bazunk listings with markup and source sync.",href:"/importers/shopify",icon:Globe2,gradient:"from-green-600 via-emerald-500 to-teal-400",status:"Live",features:["No RapidAPI key","Store & collection URLs","Markup + source sync"]},
 {id:"more",name:"More importers",method:"Not yet available",eyebrow:"Growing library",description:"New marketplace and classifieds connections will appear here as they become available.",href:"#",icon:Boxes,gradient:"from-violet-600 via-purple-500 to-fuchsia-400",status:"Coming soon",features:["Classified sources","More marketplaces","Dedicated import tools"]}
];

export function ImportersPage(){
 const {user}=useAuth();
 if(!user)return <div className="max-w-5xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-black">Importer Hub</h1><p className="mt-3 text-gray-500">Sign in to use Bazunk importers.</p></div>;
 return <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20">
  <div className="max-w-7xl mx-auto px-4 py-10">
   <Link href="/" className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl border bg-white/90 text-slate-800 dark:bg-slate-900 dark:text-white text-sm font-bold hover:border-indigo-400"><ArrowLeft className="w-4 h-4"/>Back to Home</Link>
   <section className="relative overflow-hidden rounded-[2rem] bg-[#171a2b] text-white p-7 md:p-10 mb-8 shadow-xl">
    <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-indigo-500/30 blur-3xl"/><div className="absolute right-40 -bottom-32 w-64 h-64 rounded-full bg-orange-500/20 blur-3xl"/>
    <div className="relative max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider"><Sparkles className="w-4 h-4 text-orange-400"/>Bazunk Importer Hub</div><h1 className="text-4xl md:text-5xl font-black mt-4 tracking-tight">Bring your inventory to Bazunk.</h1><p className="text-white/65 mt-4 text-lg">Choose a marketplace below. Each importer now has its own workspace, making it easier to add more sources without cluttering this page.</p>
     <div className="flex flex-wrap gap-4 mt-6 text-sm font-bold text-white/75"><span className="inline-flex gap-2 items-center"><Link2 className="w-4 h-4"/>Source links retained</span><span className="inline-flex gap-2 items-center"><RefreshCw className="w-4 h-4"/>Sync-ready imports</span></div>
    </div>
   </section>
   <div className="flex items-end justify-between gap-4 mb-5"><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Choose a source</p><h2 className="text-2xl md:text-3xl font-black mt-1">Available importers</h2></div><span className="hidden sm:block text-sm text-gray-500">More sources can be added here later</span></div>
   <div className="grid md:grid-cols-2 gap-5">{importers.map(item=>{const Icon=item.icon;const live=item.href!=="#";const card=<div className="group h-full rounded-[1.7rem] border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
      <div className={`bg-gradient-to-r ${item.gradient} p-5 text-white relative overflow-hidden`}><div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15"/><div className="relative flex items-start justify-between"><div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"><Icon className="w-7 h-7"/></div><span className={`rounded-full px-3 py-1 text-xs font-black ${live?"bg-white text-slate-900":"bg-slate-950/25 text-white"}`}>{item.status}</span></div><p className="relative text-xs font-bold uppercase tracking-wider mt-5 text-white/75">{item.eyebrow}</p><h3 className="relative text-3xl font-black mt-1">{item.name}</h3></div>
      <div className="p-5"><p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300 mb-2">Connection: {item.method}</p><p className="text-gray-600 dark:text-gray-300 min-h-[48px]">{item.description}</p><div className="flex flex-wrap gap-2 mt-5">{item.features.map(f=><span key={f} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">{f}</span>)}</div><div className={`mt-6 flex items-center justify-between font-black ${live?"text-indigo-600":"text-gray-400"}`}><span>{live?"Open importer":"More coming soon"}</span>{live&&<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1"/>}</div></div>
    </div>;return live?<Link key={item.id} href={item.href} className="block">{card}</Link>:<div key={item.id}>{card}</div>})}</div>
  </div>
 </div>
}

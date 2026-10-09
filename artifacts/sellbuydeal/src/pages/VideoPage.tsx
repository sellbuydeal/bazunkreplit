import { useState } from "react";
import { Film, Play } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const videos = [
  { title: "Bazunk Promo", file: "bazunk-promo", description: "Discover buying, selling and rewards on Bazunk." },
  { title: "Bazunk, RIP Fluffy Advert", file: "bazunk-fluffy-advert", description: "Our first advert: a very special send-off for Fluffy." },
  { title: "The Bazunk Chainsaw", file: "bazunk-chainsaw", description: "One branch. One chainsaw. Several extremely expensive consequences." },
];
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

export default function VideoPage() {
  const [selected, setSelected] = useState<typeof videos[number] | null>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="relative isolate overflow-hidden rounded-[1.7rem] bg-gradient-to-r from-fuchsia-600 via-indigo-700 to-sky-500 px-6 py-7 sm:px-9 sm:py-8 text-white mb-8 shadow-lg">
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-28 h-56 w-72 rounded-full bg-pink-400/50 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute right-0 -bottom-24 h-48 w-72 rounded-full bg-cyan-300/50 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 -top-24 h-40 w-56 rounded-full bg-blue-400/30 blur-3xl" />
          <div className="relative flex items-center gap-5 sm:gap-7">
            <div className="shrink-0 rounded-2xl border border-white/30 bg-white/15 p-3 shadow-lg backdrop-blur-sm"><Film className="h-8 w-8 text-white" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">Bazunk <span className="text-amber-300">Promo Videos</span></h1>
              <p className="mt-1 text-sm sm:text-base text-white/90">Meet the marketplace. Enjoy the adverts.</p>
            </div>
            <div aria-hidden="true" className="hidden sm:flex shrink-0 h-20 w-20 rotate-[-9deg] items-center justify-center rounded-3xl bg-slate-950/65 ring-4 ring-white/20 shadow-xl"><Play className="h-10 w-10 fill-white text-white" /></div>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {videos.map(video => (
            <article key={video.file} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <button type="button" aria-label={`Play ${video.title}`} onClick={() => { setFailed(false); setSelected(video); }} className="relative block w-full aspect-video group focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-600">
                <img src={asset(`${video.file}-poster.${video.file === "bazunk-chainsaw" ? "png" : "jpg"}`)} alt={`Preview of ${video.title}`} width={960} height={540} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="rounded-full bg-white text-blue-700 p-5 shadow-xl group-hover:scale-110 transition-transform"><Play className="w-7 h-7 fill-current" aria-hidden="true" /></span>
                </span>
              </button>
              <div className="p-6"><h2 className="text-xl font-bold text-slate-900">{video.title}</h2><p className="text-slate-500 mt-2">{video.description}</p></div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="w-[calc(100%_-_2rem)] max-w-5xl bg-slate-950 border-slate-700 text-white p-4 sm:p-6 rounded-2xl max-h-[90dvh] overflow-y-auto">
          <DialogTitle className="pr-8">{selected?.title}</DialogTitle>
          <DialogDescription className="sr-only">Video player with playback, volume and fullscreen controls. Close with the close button or Escape.</DialogDescription>
          {selected && <video key={selected.file} src={asset(`${selected.file}.mp4`)} poster={asset(`${selected.file}-poster.${selected.file === "bazunk-chainsaw" ? "png" : "jpg"}`)} controls autoPlay playsInline preload="metadata" aria-label={selected.title} onError={() => setFailed(true)} className="w-full max-h-[70dvh] aspect-video object-contain bg-black rounded-lg">Your browser does not support video playback.</video>}
          {failed && <p role="alert" className="text-red-300">The video could not load. Please close the player and try again.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Radio, Users, ChevronRight } from "lucide-react";
import { useLiveStream } from "@/context/LiveStreamContext";
import { PLATFORM_META } from "@/data/livestreams";

function timeOnAir(startedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function LiveNowStrip() {
  const { liveSessions } = useLiveStream();
  if (liveSessions.length === 0) return null;

  return (
    <section className="py-8 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="font-black text-gray-900 text-lg tracking-tight">Live Now</h2>
          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{liveSessions.length} streaming</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {liveSessions.map((session, i) => {
            const meta = PLATFORM_META[session.platform];
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex-shrink-0"
              >
                <Link href={`/live/${session.id}`}>
                  <div className="group w-64 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all overflow-hidden cursor-pointer">
                    {/* Top gradient bar */}
                    <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400" />

                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#F26B21] flex items-center justify-center text-white font-bold text-sm">
                            {session.sellerInitials}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white">
                            <Radio className="w-2 h-2 text-white" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate">{session.sellerName}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{session.title}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${meta.bg}`}>
                            {meta.label}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Users className="w-3 h-3" />{session.viewerCount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400">{timeOnAir(session.startedAt)}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#F26B21] transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

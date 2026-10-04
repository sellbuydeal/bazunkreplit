import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { MessageSquare, Send } from "lucide-react";

type ChatMessage = { id:number; sender_email:string; sender_name:string; text:string; created_at:string };

export function LiveChat({ sessionId, compact = false }: { sessionId:string; compact?:boolean }) {
  const { getToken, isSignedIn } = useAuth();
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);

  async function load(){
    try { const r=await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/messages`); const d=await r.json(); if(r.ok)setMessages(d.messages??[]); } catch {}
  }
  useEffect(()=>{ void load(); const t=setInterval(()=>void load(),3000); return()=>clearInterval(t); },[sessionId]);

  async function send(){
    const value=text.trim(); if(!value||sending)return;
    setSending(true);
    try{
      const token=await getToken();
      const r=await fetch(`/api/live/session/${encodeURIComponent(sessionId)}/messages`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({text:value})});
      if(r.ok){setText("");await load();}
    }finally{setSending(false);}
  }

  return <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 text-white font-bold text-sm"><MessageSquare className="w-4 h-4"/> Bazunk Live Chat</div>
    <div className={`overflow-y-auto px-4 py-3 space-y-2 ${compact?"h-40":"h-56"}`}>
      {messages.length===0?<p className="text-xs text-gray-500 text-center py-6">No messages yet. Start the conversation.</p>:messages.map(m=><div key={m.id} className="text-xs"><span className="font-bold text-[#F26B21]">{m.sender_name}</span><span className="text-gray-300 ml-2 break-words">{m.text}</span></div>)}
    </div>
    <div className="p-3 border-t border-gray-800 flex gap-2">
      <input disabled={!isSignedIn} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send();}} placeholder={isSignedIn?"Message the live room…":"Sign in to chat"} className="flex-1 min-w-0 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#4A5CE8]"/>
      <button disabled={!isSignedIn||sending||!text.trim()} onClick={()=>void send()} className="p-2.5 rounded-xl bg-[#4A5CE8] text-white disabled:opacity-40"><Send className="w-4 h-4"/></button>
    </div>
  </div>;
}

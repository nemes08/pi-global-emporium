import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/AccountLayout";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages · Pi Global Marketplace" },
      { name: "description", content: "Your buyer and seller conversations on Pi Global Marketplace." },
      { property: "og:title", content: "Messages · Pi Global Marketplace" },
      { property: "og:description", content: "Secure, private messaging with buyers and sellers." },
    ],
  }),
  component: MessagesPage,
});

type ConvRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { title: string | null } | null;
};

type Msg = { id: string; conversation_id: string; sender_id: string; body: string; read_at: string | null; created_at: string };

function MessagesPage() {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<ConvRow[]> => {
      if (!uid) return [];
      const { data } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, last_message_at, listings(title)")
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
        .order("last_message_at", { ascending: false });
      return (data ?? []) as ConvRow[];
    },
    enabled: !!uid,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", selected],
    queryFn: async (): Promise<Msg[]> => {
      if (!selected) return [];
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", selected).order("created_at");
      // Mark opponent's messages read
      if (uid && data) {
        const unread = data.filter((m) => m.sender_id !== uid && !m.read_at).map((m) => m.id);
        if (unread.length) await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
      return (data ?? []) as Msg[];
    },
    enabled: !!selected,
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel("dm-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages", selected] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, selected, qc]);

  async function send() {
    if (!selected || !draft.trim() || !uid) return;
    const body = draft.trim();
    setDraft("");
    await supabase.from("messages").insert({ conversation_id: selected, sender_id: uid, body });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", selected);
    qc.invalidateQueries({ queryKey: ["messages", selected] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  const selectedConv = convs?.find((c) => c.id === selected);

  return (
    <AccountLayout title="Messages">
      <div className="grid gap-4 md:grid-cols-[320px_1fr] min-h-[60vh]">
        <aside className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs uppercase tracking-widest text-silver/60">Conversations</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {!convs || convs.length === 0 ? (
              <div className="p-6 text-sm text-silver/60 text-center">
                No conversations yet.
                <Link to="/marketplace" className="mt-3 inline-flex btn-ghost-silver rounded-full px-3 py-1 text-xs">Browse listings</Link>
              </div>
            ) : convs.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition ${selected === c.id ? "bg-gold/10 border-gold/20" : ""}`}>
                <p className="text-sm truncate">{c.listings?.title || "Direct message"}</p>
                <p className="text-[10px] text-silver/50">{new Date(c.last_message_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="glass rounded-2xl border border-white/10 flex flex-col">
          {selected && selectedConv ? (
            <>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm">{selectedConv.listings?.title || "Direct message"}</p>
                  <p className="text-[10px] text-silver/50">Conversation #{selected.slice(0, 8)}</p>
                </div>
                {selectedConv.listing_id && (
                  <Link to="/listing/$id" params={{ id: selectedConv.listing_id }} className="text-xs text-gold hover:underline">View listing →</Link>
                )}
              </div>
              <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55vh]">
                {messages?.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === uid ? "bg-gold/20 border border-gold/30 text-white" : "bg-white/5 border border-white/10 text-silver"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] text-silver/50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-white/10 p-3 flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-silver focus:outline-none focus:ring-2 focus:ring-gold/40" />
                <button className="btn-gold rounded-full px-5 py-2 text-sm">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 grid place-items-center p-10 text-center">
              <div>
                <div className="text-4xl">✉</div>
                <p className="text-sm text-silver/70 mt-2">Select a conversation to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}

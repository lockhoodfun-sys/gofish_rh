import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useChatStore } from "@/hooks/useChatStore";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Bottom-right floating chat, collapsed to a pill by default. Docked
 * opposite HUD's bottom-left weather/clock readout so the two never
 * overlap. Keyboard events inside the input stop propagation so the game's
 * WASD/steer/hotbar listeners (all bound on `window`, see Angler.tsx,
 * Boat.tsx, Npcs.tsx, Hotbar.tsx) never fire while typing.
 */
export function ChatBox() {
  const profile = useProfileStore((s) => s.profile);
  const walletAddress = useProfileStore((s) => s.address);
  const panelOpen = useChatStore((s) => s.panelOpen);
  const setPanelOpen = useChatStore((s) => s.setPanelOpen);
  const messages = useChatStore((s) => s.messages);
  const unread = useChatStore((s) => s.unread);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const init = useChatStore((s) => s.init);
  const send = useChatStore((s) => s.send);
  const resetChat = useChatStore((s) => s.reset);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      void init();
    } else {
      resetChat();
    }
  }, [profile, init, resetChat]);

  useEffect(() => {
    if (panelOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, panelOpen]);

  if (!profile) return null;

  const onSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    const ok = await send(text);
    if (!ok) setDraft(text);
  };

  const swallowKey = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") void onSend();
  };

  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="pointer-events-auto fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-50 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900/75"
        title="Open chat"
      >
        <MessageCircle className="h-4 w-4 text-sky-400" aria-hidden />
        Chat
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-slate-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 flex h-96 w-72 flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-900/80 shadow-2xl backdrop-blur-md sm:w-80">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-50">
          <MessageCircle className="h-4 w-4 text-sky-400" aria-hidden />
          Chat
        </span>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          className="text-slate-400 transition-colors hover:text-slate-100"
          title="Close chat"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-slate-400">No messages yet — say hi!</p>
        )}
        {messages.map((m) => {
          const own = m.wallet_address === walletAddress;
          return (
            <div key={m.id} className={own ? "text-right" : "text-left"}>
              <p className="text-[11px] font-semibold text-sky-300">
                {m.display_name || m.username}{" "}
                <span className="font-normal text-slate-500">{timeLabel(m.created_at)}</span>
              </p>
              <p
                className={`mt-0.5 inline-block max-w-[85%] break-words rounded-lg px-2.5 py-1.5 text-sm ${
                  own ? "bg-sky-600/70 text-white" : "bg-white/10 text-slate-100"
                }`}
              >
                {m.message}
              </p>
            </div>
          );
        })}
      </div>

      {error && <p className="px-3 pb-1 text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={swallowKey}
          onKeyUp={(e) => e.stopPropagation()}
          maxLength={240}
          placeholder="Type a message…"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400/60"
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={sending || !draft.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
          title="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

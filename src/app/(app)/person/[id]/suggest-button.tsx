"use client";
import { useState } from "react";
import { addGift } from "@/actions/gift";

interface Idea { title: string; description: string; price: number; currency: string; reason: string; }

export function SuggestButton({ personId, occasionId, disabled }: { personId: string; occasionId?: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [source, setSource] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function suggest() {
    setBusy(true); setMsg(""); setIdeas([]);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, occasionId, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Suggest failed");
      setIdeas(data.ideas ?? []);
      setSource(data.source ?? "heuristic");
      setMsg(data.ideas?.length ? `Got ${data.ideas.length} ideas (${data.source === "ai" ? "AI" : "built-in"})` : "No ideas");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Suggest failed");
    } finally {
      setBusy(false);
    }
  }

  async function add(idea: Idea) {
    const fd = new FormData();
    fd.append("personId", personId);
    if (occasionId) fd.append("occasionId", occasionId);
    fd.append("title", idea.title);
    fd.append("description", `${idea.description} ${idea.reason}`.trim());
    fd.append("price", String(idea.price));
    fd.append("currency", idea.currency);
    fd.append("source", "AI");
    await addGift(fd);
    // remove from the list
    setIdeas((prev) => prev.filter((p) => p.title !== idea.title));
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={suggest}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-60"
        title={disabled ? "Only others can suggest for you" : "Get gift ideas"}
      >
        {busy ? "Thinking…" : "🤖 Suggest ideas"}
      </button>
      {msg ? <p className="mt-1 text-xs text-stone-500">{msg}</p> : null}
      {ideas.length ? (
        <div className="mt-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
          {ideas.map((i) => (
            <div key={i.title} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm shadow-sm">
              <div>
                <p className="font-medium">{i.title} <span className="text-stone-400">· ~{i.currency} {i.price}</span></p>
                <p className="text-xs text-stone-500">{i.description}</p>
                <p className="text-xs text-violet-600">{i.reason}</p>
              </div>
              <button onClick={() => add(i)} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500">+ Add</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

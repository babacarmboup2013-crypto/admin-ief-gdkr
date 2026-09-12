"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Message {
  who: string;
  side: "other" | "me";
  text: string;
  time: string;
}

const THREADS: { title: string; meta: string; tag?: string; messages: Message[] }[] = [
  {
    title: "Session concours Octobre",
    meta: "Examens et Concours · 14 messages",
    tag: "Fil de discussion",
    messages: [
      { who: "Mariam Cissé", side: "other", text: "On a validé la liste des jurys pour la session d'octobre.", time: "09:12" },
      { who: "Moussa Barry", side: "other", text: "Parfait, il reste combien de candidats à vérifier ?", time: "09:15" },
      { who: "Vous", side: "me", text: "23 dossiers restants, je les termine demain matin.", time: "09:20" },
    ],
  },
  {
    title: "Budget Q4",
    meta: "Gestion Financière · 6 messages",
    messages: [
      { who: "Awa Diallo", side: "other", text: "Le bilan trimestriel est en retard de 2 jours, on peut décaler la réunion ?", time: "08:40" },
      { who: "Vous", side: "me", text: "On garde la date, j'envoie les chiffres ce soir.", time: "08:55" },
    ],
  },
  {
    title: "Coordination RH ↔ Examens",
    meta: "Fil transversal · 9 messages",
    messages: [
      { who: "Ibrahima Konaté", side: "other", text: "On aura besoin de 3 surveillants supplémentaires pour la session.", time: "11:02" },
      { who: "Vous", side: "me", text: "Je regarde les disponibilités et je reviens vers vous demain.", time: "11:10" },
    ],
  },
  {
    title: "Nafi Touré",
    meta: "Message direct · en ligne",
    messages: [
      { who: "Nafi Touré", side: "other", text: "Le dossier de recrutement comptable est prêt pour relecture.", time: "14:02" },
      { who: "Vous", side: "me", text: "Je le regarde cet après-midi, merci !", time: "14:05" },
    ],
  },
];

export default function DiscussionsPage() {
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState("");
  const thread = THREADS[current];

  function send() {
    const text = draft.trim();
    if (!text) return;
    THREADS[current].messages.push({ who: "Vous", side: "me", text, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) });
    setDraft("");
  }

  return (
    <div className="grid items-start gap-4 [grid-template-columns:280px_1fr] lg:gap-[18px]">
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-serif text-sm text-navy">Fils &amp; conversations</h2>
        </div>
        <ul>
          {THREADS.map((t, i) => (
            <li
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "cursor-pointer border-b border-border px-5 py-3 transition-colors last:border-b-0",
                current === i ? "bg-teal-soft" : "hover:bg-[#f7f8fa]"
              )}
            >
              <div className={cn("text-[13px] font-medium text-ink", current === i && "text-teal")}>{t.title}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-soft">{t.meta}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-sm text-navy">{thread.title}</h2>
          {thread.tag ? (
            <span className="inline-block rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-teal">
              {thread.tag}
            </span>
          ) : (
            <span className="inline-block rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-teal">
              Direct
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
          {thread.messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.side === "me" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.side === "other"
                    ? "rounded-bl-[3px] bg-[#f0f2f5] text-ink"
                    : "rounded-br-[3px] bg-primary text-white"
                )}
              >
                {m.side === "other" && <div className="mb-1 text-[11px] font-semibold text-ink-soft">{m.who}</div>}
                <span>{m.text}</span>
                <div className={cn("mt-1 text-[10px]", m.side === "me" ? "text-white/60" : "opacity-60")}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-border px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Écrire un message…"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={send}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
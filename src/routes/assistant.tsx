import { createFileRoute } from "@tanstack/react-router";
import { Bot, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { useRef, useState } from "react";
import { CarCard } from "@/components/CarCard";
import { listCars, type Car } from "@/data/cars";
import { askAssistantFn, MAX_MESSAGE_LENGTH } from "@/lib/assistant/ask";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  loader: () => listCars(),
  head: () => ({
    meta: [
      { title: "AI Car Assistant — Yalhacar" },
      {
        name: "description",
        content:
          "Tell Yalhacar's assistant what you're looking for and it'll search real inventory for you.",
      },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  matchedCars?: Car[];
};

function AssistantPage() {
  const cars = Route.useLoaderData();
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = t.assistant.suggestions;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const result = await askAssistantFn({ data: { message: trimmed, history } });
      const matchedCars = result.matchedCarIds
        .map((id) => cars.find((c) => c.id === id))
        .filter((c): c is Car => Boolean(c));
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, matchedCars }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err instanceof Error ? err.message : t.assistant.errorReply },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  };

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[900px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] text-brass uppercase">
            <Sparkles className="size-3.5" /> {t.assistant.eyebrow}
          </div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            {t.assistant.heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t.assistant.subtitle}</p>
        </div>

        <div className="rounded-panel bg-sand text-sand-fg ring-1 ring-hairline">
          <div ref={scrollRef} className="max-h-[55vh] min-h-[280px] space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full bg-paper px-3 py-2 text-left text-xs text-ink/75 ring-1 ring-hairline transition-colors hover:bg-panel-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    m.role === "user" ? "bg-panel-2 text-panel-fg" : "bg-brass text-white",
                  )}
                >
                  {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                </span>
                <div className={cn("flex-1", m.role === "user" && "flex flex-col items-end")}>
                  <div
                    className={cn(
                      "inline-block max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "user" ? "bg-panel-2 text-panel-fg" : "bg-paper text-ink",
                    )}
                  >
                    {m.content}
                  </div>
                  {m.matchedCars && m.matchedCars.length ? (
                    <div className="mt-3 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                      {m.matchedCars.map((c) => (
                        <CarCard key={c.id} car={c} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-sand-fg/50">
                <Bot className="size-4 animate-pulse text-brass" /> {t.assistant.thinking}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-hairline p-3">
            <button
              type="button"
              onClick={() => setMessages([])}
              aria-label={t.assistant.reset}
              className="grid size-9 shrink-0 place-items-center rounded-full text-sand-fg/50 transition-colors hover:bg-panel-2 hover:text-sand-fg"
            >
              <RotateCcw className="size-4" />
            </button>
            <input
              value={input}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={t.assistant.placeholder}
              className="flex-1 rounded-control bg-paper px-4 py-2.5 text-sm outline-none ring-1 ring-hairline"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brass text-white transition-colors hover:bg-brass-2 disabled:opacity-50"
            >
              <Send className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink/40">{t.assistant.disclaimer}</p>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Paperclip, Lightbulb, Wand2, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postChat, type ChatMessage } from "@/lib/api";
import type { AlgorithmId, ProcessSpec } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

export interface ChatContext {
  page?: string;
  algorithm?: AlgorithmId;
  problem?: ProcessSpec[];
}

interface Props {
  context?: ChatContext | undefined;
  sessionId?: string | undefined;
  quickPrompts?: string[] | undefined;
  compact?: boolean | undefined;
  seed?: ChatMessage[] | undefined;
  initialQuestion?: string | undefined;
}

const uid = () => Math.random().toString(36).slice(2);

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function MessageBody({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {content.split("\n").map((line, i) => {
        if (!line.trim()) return null;
        if (line.trim().startsWith("|")) {
          return (
            <div key={i} className="font-mono text-xs text-muted-foreground">
              {line}
            </div>
          );
        }
        if (line.trim().startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{renderInline(line.replace(/^\s*-\s/, ""))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

export function AIChat({
  context,
  sessionId,
  quickPrompts = [],
  compact = false,
  seed,
  initialQuestion,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    seed ?? [
      {
        id: uid(),
        role: "assistant",
        content:
          "Hi! I'm your scheduling tutor. Ask me about any algorithm, paste a process table, or ask why a Gantt block looks the way it does.",
        createdAt: Date.now(),
      },
    ],
  );
  const [input, setInput] = useState(initialQuestion ?? "");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fallbackSessionId = useRef(`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setInput(initialQuestion);
    }
  }, [initialQuestion]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string, mode?: "explain" | "simplify" | "example" | "quiz") => {
    const value = text.trim();
    if (!value || thinking) return;
    setMessages((m) => [...m, { id: uid(), role: "user", content: value, createdAt: Date.now() }]);
    setInput("");
    setThinking(true);
    try {
      const result = await postChat({
        message: value,
        sessionId: sessionId ?? fallbackSessionId.current,
        history: messages
          .filter((message) => message.content.trim())
          .slice(-10)
          .map(({ role, content }) => ({ role, content })),
        context: { ...context, ...(mode ? { mode } : {}) },
      });
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: result.reply,
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The tutor could not reach its AI service. Please try again in a moment.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const tools = [
    {
      label: "Attach problem",
      icon: Paperclip,
      prompt: "Here is my current process table — walk me through it.",
    },
    {
      label: "Generate example",
      icon: Wand2,
      prompt: "Generate a practice example for me.",
      mode: "example" as const,
    },
    {
      label: "Explain differently",
      icon: Lightbulb,
      prompt: "Explain that with a different analogy.",
    },
    {
      label: "Simplify",
      icon: Baby,
      prompt: "Simplify that explanation.",
      mode: "simplify" as const,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className={cn("flex-1 space-y-5 overflow-y-auto px-1 py-2", compact && "max-h-72")}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-3 animate-fade-up", m.role === "user" && "flex-row-reverse")}
          >
            <div
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-border",
                m.role === "assistant"
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <Sparkles className="size-4" />
              ) : (
                <span className="text-xs font-semibold">You</span>
              )}
            </div>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl border border-border px-4 py-3",
                m.role === "assistant" ? "bg-surface/70" : "bg-primary/12",
              )}
            >
              <MessageBody content={m.content} />
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="grid size-8 place-items-center rounded-xl border border-border bg-primary/15 text-primary">
              <Sparkles className="size-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-surface/70 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-primary"
                  style={{ animation: `pulse-glow 1.1s ${i * 0.18}s infinite` }}
                />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">Tutor is thinking…</span>
            </div>
          </div>
        ) : null}
      </div>

      {quickPrompts.length ? (
        <div className="flex flex-wrap gap-2 px-1 pb-3">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface/70 p-3 backdrop-blur">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask anything about process scheduling..."
          className="min-h-11 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          rows={compact ? 1 : 2}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {tools.slice(0, compact ? 2 : 4).map((t) => (
              <Button
                key={t.label}
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => send(t.prompt, t.mode)}
              >
                <t.icon className="size-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => void send(input)}
            disabled={!input.trim() || thinking}
            className="gap-1.5"
          >
            <Send className="size-4" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

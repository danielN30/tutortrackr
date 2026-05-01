import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Star, Plus, X } from "lucide-react";
import { topicSchema } from "@/lib/sanitize";
import { toast } from "sonner";

export interface TopicEntry {
  topic: string;
  rating: number;
}

interface TopicTableProps {
  topics: TopicEntry[];
  onChange: (topics: TopicEntry[]) => void;
}

export function TopicTable({ topics, onChange }: TopicTableProps) {
  const [newTopic, setNewTopic] = useState("");

  function addTopic() {
    const parsed = topicSchema.safeParse(newTopic);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid topic");
      return;
    }
    onChange([...topics, { topic: parsed.data, rating: 0 }]);
    setNewTopic("");
  }

  function removeTopic(index: number) {
    onChange(topics.filter((_, i) => i !== index));
  }

  function setRating(index: number, rating: number) {
    onChange(topics.map((t, i) => (i === index ? { ...t, rating } : t)));
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Topics Covered</label>
      {topics.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Topic</span>
            <span>Understanding</span>
            <span></span>
          </div>
          {topics.map((entry, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t border-border px-3 py-2">
              <span className="text-sm text-foreground">{entry.topic}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(i, s)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-4 w-4 transition-colors ${
                        s <= entry.rating
                          ? "fill-[var(--star-filled)] text-[var(--star-filled)]"
                          : "fill-transparent text-[var(--star-empty)]"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => removeTopic(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="e.g. Addition, Fractions"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addTopic} disabled={!newTopic.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

import { Star } from "lucide-react";

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= value
                  ? "fill-[var(--star-filled)] text-[var(--star-filled)]"
                  : "fill-transparent text-[var(--star-empty)]"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

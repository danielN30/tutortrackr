import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  route?: string;
  placement?: "right" | "bottom" | "top";
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    description:
      "Your home screen, showing an overview of all your students and recent activity.",
    route: "/dashboard",
    placement: "right",
  },
  {
    selector: '[data-tour="nav-students"]',
    title: "Students",
    description:
      "Add and manage your students here, including their subjects and parent contact details.",
    route: "/dashboard",
    placement: "right",
  },
  {
    selector: '[data-tour="nav-log-session"]',
    title: "Log Session",
    description:
      "After each tutoring session, log it here to generate an AI summary for parents.",
    route: "/dashboard",
    placement: "right",
  },
  {
    selector: '[data-tour="nav-history"]',
    title: "Session History",
    description:
      "View all past sessions and AI summaries for each student.",
    route: "/dashboard",
    placement: "right",
  },
  {
    selector: '[data-tour="analytics"]',
    title: "Analytics",
    description:
      "Track your students' progress over time with visual charts.",
    route: "/dashboard",
    placement: "bottom",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  forceStart?: number;
  onClose?: () => void;
}

export function OnboardingTour({ forceStart, onClose }: OnboardingTourProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const checkedRef = useRef(false);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("tour_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data || data.tour_completed === false) {
        setStepIdx(0);
        setActive(true);
      }
    })();
  }, [user]);

  // Manual restart trigger
  useEffect(() => {
    if (forceStart && forceStart > 0) {
      setStepIdx(0);
      setActive(true);
    }
  }, [forceStart]);

  const currentStep = STEPS[stepIdx];

  // Navigate to required route for the step
  useEffect(() => {
    if (!active || !currentStep) return;
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate({ to: currentStep.route });
    }
  }, [active, currentStep, location.pathname, navigate]);

  // Track target element rect
  useEffect(() => {
    if (!active || !currentStep) return;
    let raf = 0;
    const update = () => {
      const el = document.querySelector(currentStep.selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };
    update();
    const interval = window.setInterval(update, 250);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      cancelAnimationFrame(raf);
    };
  }, [active, currentStep]);

  const finish = useCallback(
    async (completed: boolean) => {
      setActive(false);
      onClose?.();
      if (!user) return;
      if (completed) {
        await supabase
          .from("user_preferences")
          .upsert(
            { user_id: user.id, tour_completed: true },
            { onConflict: "user_id" }
          );
      }
    },
    [user, onClose]
  );

  if (!active || !currentStep) return null;

  const isLast = stepIdx === STEPS.length - 1;
  const pad = 6;
  const highlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Tooltip placement
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 10000,
    maxWidth: 320,
  };
  if (highlight) {
    const placement = currentStep.placement ?? "right";
    if (placement === "right") {
      tooltipStyle.top = highlight.top;
      tooltipStyle.left = highlight.left + highlight.width + 12;
    } else if (placement === "bottom") {
      tooltipStyle.top = highlight.top + highlight.height + 12;
      tooltipStyle.left = highlight.left;
    } else {
      tooltipStyle.top = highlight.top - 12;
      tooltipStyle.left = highlight.left;
      tooltipStyle.transform = "translateY(-100%)";
    }
    // Keep on screen
    const vw = window.innerWidth;
    if ((tooltipStyle.left as number) + 320 > vw - 16) {
      tooltipStyle.left = Math.max(16, vw - 336);
    }
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dim overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full pointer-events-auto" onClick={() => finish(false)}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left}
                y={highlight.top}
                width={highlight.width}
                height={highlight.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight ring */}
      {highlight && (
        <div
          className="absolute rounded-lg ring-2 ring-[var(--teal)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--teal)_30%,transparent)] pointer-events-none transition-all"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="pointer-events-auto rounded-xl bg-[var(--navy)] text-[var(--navy-foreground)] shadow-2xl border border-[var(--teal)]/40 p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-[var(--teal)]">
            {currentStep.title}
          </h3>
          <button
            onClick={() => finish(false)}
            className="text-[var(--navy-foreground)]/60 hover:text-[var(--navy-foreground)] transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-[var(--navy-foreground)]/85 mb-4">
          {currentStep.description}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--navy-foreground)]/60">
            Step {stepIdx + 1} of {STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => finish(false)}
              className="text-[var(--navy-foreground)]/80 hover:text-[var(--navy-foreground)] hover:bg-white/10"
            >
              Skip Tour
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (isLast) {
                  finish(true);
                } else {
                  setStepIdx((i) => i + 1);
                }
              }}
              className="bg-[var(--teal)] text-[var(--teal-foreground)] hover:bg-[var(--teal)]/90"
            >
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

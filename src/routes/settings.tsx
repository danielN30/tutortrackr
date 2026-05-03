import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingTour } from "@/components/OnboardingTour";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TutorTrack" },
      { name: "description", content: "Manage your TutorTrack preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tourTrigger, setTourTrigger] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function restartTour() {
    if (!user) return;
    await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, tour_completed: false },
        { onConflict: "user_id" }
      );
    setTourTrigger((n) => n + 1);
    toast.success("Restarting onboarding tour");
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Settings</h1>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Onboarding Tour</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Replay the guided walkthrough of TutorTrack's main features.
          </p>
          <Button onClick={restartTour} className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Restart Tour
          </Button>
        </CardContent>
      </Card>

      <OnboardingTour forceStart={tourTrigger} />
    </div>
  );
}

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getDesignHistory } from "@/lib/design-api";
import { format } from "date-fns";

interface HistorySession {
  id: string;
  category: string;
  created_at: string;
  originalUrl: string;
  variations: { id: string; image_url: string; label: string }[];
}

const DesignHistory = () => {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDesignHistory().then((data) => {
      setSessions(data as HistorySession[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-3xl py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">My Design History</h1>
          <p className="mt-2 text-muted-foreground">All your past generation sessions in one place</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden border shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {session.originalUrl && (
                      <div className="relative w-full sm:w-40 shrink-0">
                        <img
                          src={session.originalUrl}
                          alt="Original product"
                          className="h-40 w-full object-cover sm:h-full"
                        />
                        <span className="absolute left-2 top-2 rounded-full bg-foreground/60 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                          Original
                        </span>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(session.created_at), "d MMM yyyy")}
                        </div>
                        <h3 className="mt-1 font-display text-lg font-semibold">
                          {session.category || "Craft"} · {session.variations.length} variations
                        </h3>

                        <div className="mt-3 flex gap-2">
                          {session.variations.slice(0, 3).map((v) => (
                            <img
                              key={v.id}
                              src={v.image_url}
                              alt={v.label}
                              className="h-12 w-12 rounded-md border object-cover"
                            />
                          ))}
                          {session.variations.length > 3 && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
                              +{session.variations.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sessions.length === 0 && (
              <div className="rounded-xl border-2 border-dashed p-8 text-center">
                <p className="text-muted-foreground">Your design history will appear here</p>
                <Link to="/design-studio">
                  <Button className="mt-4 gap-2">
                    Create Your First Design
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignHistory;

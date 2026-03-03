import Navbar from "@/components/Navbar";
import { Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import samplePottery from "@/assets/sample-pottery-1.jpg";
import variation1 from "@/assets/variation-1.jpg";
import variation2 from "@/assets/variation-2.jpg";
import variation3 from "@/assets/variation-3.jpg";

const mockHistory = [
  {
    id: "1",
    date: "2 Mar 2026",
    category: "Pottery",
    original: samplePottery,
    variations: [variation1, variation2, variation3],
    variationCount: 4,
  },
];

const DesignHistory = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-3xl py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            My Design History
          </h1>
          <p className="mt-2 text-muted-foreground">
            All your past generation sessions in one place
          </p>
        </div>

        <div className="space-y-4">
          {mockHistory.map((session) => (
            <Card key={session.id} className="overflow-hidden border shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Original image */}
                  <div className="relative w-full sm:w-40 shrink-0">
                    <img
                      src={session.original}
                      alt="Original product"
                      className="h-40 w-full object-cover sm:h-full"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-foreground/60 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                      Original
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {session.date}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold">
                        {session.category} · {session.variationCount} variations
                      </h3>

                      {/* Mini thumbnails */}
                      <div className="mt-3 flex gap-2">
                        {session.variations.map((v, i) => (
                          <img
                            key={i}
                            src={v}
                            alt={`Variation ${i + 1}`}
                            className="h-12 w-12 rounded-md border object-cover"
                          />
                        ))}
                        {session.variationCount > session.variations.length && (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground">
                            +{session.variationCount - session.variations.length}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" className="gap-1 text-primary">
                        View Details
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty state CTA */}
          <div className="rounded-xl border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              Your design history will appear here
            </p>
            <Link to="/design-studio">
              <Button className="mt-4 gap-2">
                Create Your First Design
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignHistory;

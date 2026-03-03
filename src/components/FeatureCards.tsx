import { Upload, Wand2, Download, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Upload,
    title: "Upload Photos",
    description: "Snap 2–4 photos of your craft from different angles",
  },
  {
    icon: Wand2,
    title: "AI Analysis",
    description: "Our AI detects shape, texture, color, and material",
  },
  {
    icon: Download,
    title: "Get Variations",
    description: "Receive 4–5 unique design variations in seconds",
  },
  {
    icon: Share2,
    title: "Share & Create",
    description: "Save, download, or share your favorite designs",
  },
];

const FeatureCards = () => {
  return (
    <section className="container py-20">
      <div className="mb-12 text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">
          How It Works
        </h2>
        <p className="mt-3 text-muted-foreground">
          From photo to design inspiration in four simple steps
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <Card
            key={f.title}
            className="group border-none bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {i + 1}
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {f.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeatureCards;

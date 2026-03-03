import { Download, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toggleSaveVariation } from "@/lib/design-api";
import { useState } from "react";

interface Variation {
  id: string;
  image_url: string;
  label: string;
  tags: string[];
  saved: boolean;
}

interface VariationGalleryProps {
  variations: Variation[];
}

const VariationGallery = ({ variations }: VariationGalleryProps) => {
  const { toast } = useToast();
  const [savedState, setSavedState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(variations.map((v) => [v.id, v.saved]))
  );

  const handleSave = async (id: string) => {
    const newSaved = !savedState[id];
    setSavedState((prev) => ({ ...prev, [id]: newSaved }));
    await toggleSaveVariation(id, newSaved);
    toast({ title: newSaved ? "Saved to your gallery!" : "Removed from gallery" });
  };

  const handleDownload = async (url: string, label: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${label.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      toast({ title: "Download started" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      await navigator.share({ title: "Design Variation", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  if (variations.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No variations were generated. Please try again with different images.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl font-bold">Your Design Variations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          AI generated {variations.length} variations based on your product photos
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {variations.map((v, i) => (
          <div
            key={v.id}
            className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md animate-fade-in-up"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={v.image_url}
                alt={v.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                {v.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-foreground/60 px-2.5 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <h4 className="font-display font-semibold">{v.label}</h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSave(v.id)}>
                  <Heart className={`h-4 w-4 ${savedState[v.id] ? "fill-primary text-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(v.image_url, v.label)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(v.image_url)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariationGallery;

import { Download, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import variation1 from "@/assets/variation-1.jpg";
import variation2 from "@/assets/variation-2.jpg";
import variation3 from "@/assets/variation-3.jpg";
import variation4 from "@/assets/variation-4.jpg";

interface VariationGalleryProps {
  visible: boolean;
}

const variations = [
  { src: variation1, label: "Blue Geometric Pattern", tags: ["Pattern", "Color"] },
  { src: variation2, label: "Matte Black & Gold", tags: ["Shape", "Finish"] },
  { src: variation3, label: "Sage Green Leaf Motif", tags: ["Color", "Pattern"] },
  { src: variation4, label: "Sunset Floral Bowl", tags: ["Shape", "Color"] },
];

const VariationGallery = ({ visible }: VariationGalleryProps) => {
  const { toast } = useToast();

  if (!visible) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl font-bold">Your Design Variations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          AI generated 4 variations based on your product photos
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {variations.map((v, i) => (
          <div
            key={v.label}
            className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md animate-fade-in-up"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={v.src}
                alt={v.label}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                {v.tags.map((tag) => (
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toast({ title: "Saved to your gallery!" })}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toast({ title: "Download started" })}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toast({ title: "Share link copied!" })}
                >
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

import { useState, useCallback } from "react";
import { Upload, X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const UploadZone = ({ images, onImagesChange }: UploadZoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = 4 - images.length;
      if (remaining <= 0) {
        toast({ title: "Maximum 4 images allowed", variant: "destructive" });
        return;
      }

      const newImages: string[] = [];
      const validFiles = Array.from(files).slice(0, remaining);

      validFiles.forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name} exceeds 10MB limit`, variant: "destructive" });
          return;
        }
        const url = URL.createObjectURL(file);
        newImages.push(url);
      });

      onImagesChange([...images, ...newImages]);
    },
    [images, onImagesChange, toast]
  );

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const labels = ["Front", "Side", "Back", "Detail"];

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ImagePlus className="h-8 w-8" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold">
          Drop your product photos here
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          JPG or PNG, up to 10MB each · 2–4 images recommended
        </p>
        <Button variant="outline" size="sm" className="mt-4 gap-2">
          <Upload className="h-4 w-4" />
          Browse Files
        </Button>
      </label>

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted animate-scale-in"
            >
              <img
                src={src}
                alt={`Upload ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 px-2 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                {labels[i] || `Image ${i + 1}`}
              </div>
              <button
                onClick={() => removeImage(i)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;

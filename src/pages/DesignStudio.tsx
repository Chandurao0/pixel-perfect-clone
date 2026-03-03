import { useState } from "react";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import VariationGallery from "@/components/VariationGallery";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";

const DesignStudio = () => {
  const [images, setImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setShowResults(false);
    // Simulate AI generation
    setTimeout(() => {
      setGenerating(false);
      setShowResults(true);
    }, 4000);
  };

  const handleReset = () => {
    setImages([]);
    setShowResults(false);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-3xl py-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Design Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload your product photos and let AI create fresh design variations
          </p>
        </div>

        {!showResults && !generating && (
          <div className="space-y-6">
            <UploadZone images={images} onImagesChange={setImages} />

            {images.length >= 2 && (
              <div className="flex justify-center animate-fade-in-up">
                <Button
                  size="lg"
                  className="gap-2 text-base"
                  onClick={handleGenerate}
                >
                  <Sparkles className="h-5 w-5" />
                  Generate Variations
                </Button>
              </div>
            )}

            {images.length > 0 && images.length < 2 && (
              <p className="text-center text-sm text-muted-foreground">
                Upload at least 2 images to generate variations
              </p>
            )}
          </div>
        )}

        {generating && <LoadingSpinner />}

        {showResults && (
          <div className="space-y-6">
            <VariationGallery visible={showResults} />
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                Start New Design
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignStudio;

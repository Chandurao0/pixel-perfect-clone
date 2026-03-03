import { useState } from "react";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import VariationGallery from "@/components/VariationGallery";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  createDesignSession,
  uploadSessionImages,
  analyzeProduct,
  generateVariations,
  getSessionWithVariations,
} from "@/lib/design-api";

interface Variation {
  id: string;
  image_url: string;
  label: string;
  tags: string[];
  saved: boolean;
}

const DesignStudio = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setGenerating(true);
    setShowResults(false);

    try {
      // 1. Create session
      const sessionId = await createDesignSession();

      // 2. Upload images
      await uploadSessionImages(sessionId, files);

      // 3. Analyze product
      await analyzeProduct(sessionId);

      // 4. Generate variations
      await generateVariations(sessionId);

      // 5. Fetch results
      const { variations: results } = await getSessionWithVariations(sessionId);
      setVariations(results as Variation[]);
      setShowResults(true);

      if (results.length === 0) {
        toast({
          title: "No variations generated",
          description: "The AI couldn't generate variations. Try different images.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setVariations([]);
    setShowResults(false);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-3xl py-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Design Studio</h1>
          <p className="mt-2 text-muted-foreground">
            Upload your product photos and let AI create fresh design variations
          </p>
        </div>

        {!showResults && !generating && (
          <div className="space-y-6">
            <UploadZone files={files} onFilesChange={setFiles} />

            {files.length >= 2 && (
              <div className="flex justify-center animate-fade-in-up">
                <Button size="lg" className="gap-2 text-base" onClick={handleGenerate}>
                  <Sparkles className="h-5 w-5" />
                  Generate Variations
                </Button>
              </div>
            )}

            {files.length > 0 && files.length < 2 && (
              <p className="text-center text-sm text-muted-foreground">
                Upload at least 2 images to generate variations
              </p>
            )}
          </div>
        )}

        {generating && <LoadingSpinner />}

        {showResults && (
          <div className="space-y-6">
            <VariationGallery variations={variations} />
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

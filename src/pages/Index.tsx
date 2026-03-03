import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeatureCards />

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p className="font-display text-base font-semibold text-foreground">
            ArtisanHub
          </p>
          <p className="mt-1">
            Empowering local artisans with AI-powered design tools
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

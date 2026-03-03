import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-artisan.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Hero image background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Artisan crafting pottery on a wheel in warm golden light"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
      </div>

      <div className="container relative z-10 py-24 md:py-36">
        <div className="max-w-xl space-y-6">
          <div
            className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm animate-fade-in-up"
          >
            <Sparkles className="h-4 w-4" />
            AI-Powered Design Studio
          </div>

          <h1
            className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Design Your Next
            <br />
            <span className="text-gold">Masterpiece</span>
          </h1>

          <p
            className="max-w-md text-lg text-primary-foreground/80 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Upload your craft photos and let AI generate stunning design
            variations. From pottery to jewelry — innovate your craft in seconds.
          </p>

          <div
            className="flex flex-wrap gap-3 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link to="/design-studio">
              <Button size="lg" className="gap-2 text-base">
                Open Design Studio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/history">
              <Button
                size="lg"
                variant="outline"
                className="text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                View My Designs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

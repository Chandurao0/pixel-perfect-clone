const craftMessages = [
  "Analysing your craft…",
  "Detecting shapes and textures…",
  "Mixing colour palettes…",
  "Generating design variations…",
  "Almost ready…",
];

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner = () => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => Math.min(prev + 1, craftMessages.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in-up">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-muted" />
        <Loader2 className="absolute inset-0 m-auto h-10 w-10 text-primary animate-spin" />
      </div>
      <p className="font-display text-lg font-semibold text-foreground">
        {craftMessages[msgIdx]}
      </p>
      <p className="text-sm text-muted-foreground">This usually takes under 30 seconds</p>
    </div>
  );
};

export default LoadingSpinner;

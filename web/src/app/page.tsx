import Header from "@/components/Header";
import AccessibilityMap from "@/components/AccessibilityMap";
import InfoPanel from "@/components/InfoPanel";
import AISummaryPanel from "@/components/AISummaryPanel";

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Map — takes remaining space */}
        <div className="flex-1 relative">
          <AccessibilityMap />
        </div>

        {/* Right panels */}
        <InfoPanel />
        <AISummaryPanel />
      </div>
    </div>
  );
}

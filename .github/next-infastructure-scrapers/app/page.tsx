import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { FeatureGrid } from "./components/FeatureGrid";
import { HowItWorks } from "./components/HowItWorks";
import { Pricing } from "./components/Pricing";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { VoxcodeConsole } from "./components/VoxcodeConsole";
import { FuturisticScene } from "./components/FuturisticScene";
import { FloatingMic } from "./components/FloatingMic";

export default function Home() {
  return (
    <>
      <FuturisticScene />
      <div className="min-h-screen bg-gradient-to-b from-slate-950/90 via-slate-950/90 to-slate-950/95 text-slate-50">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
          <HeroSection />
          <VoxcodeConsole />
          <FeatureGrid />
          <HowItWorks />
          <Pricing />
          <Faq />
        </main>
        <Footer />
        <FloatingMic />
      </div>
    </>
  );
}


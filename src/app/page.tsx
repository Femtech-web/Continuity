import { HeroSection } from "@/features/home/hero-section";
import { IntentSection } from "@/features/home/intent-section";
import { LifecycleSection } from "@/features/home/lifecycle-section";
import { ProofSection } from "@/features/home/proof-section";
import { SentinelSection } from "@/features/home/sentinel-section";
import { TechnologySection } from "@/features/home/technology-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TechnologySection />
      <IntentSection />
      <LifecycleSection />
      <SentinelSection />
      <ProofSection />
    </main>
  );
}

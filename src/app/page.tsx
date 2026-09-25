import { HeroSection } from "@/features/home/hero-section";
import { IntentSection } from "@/features/home/intent-section";
import { LifecycleSection } from "@/features/home/lifecycle-section";
import { ProofSection } from "@/features/home/proof-section";
import { TechnologySection } from "@/features/home/technology-section";
import { UseCasesSection } from "@/features/home/use-cases-section";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TechnologySection />
      <UseCasesSection />
      <IntentSection />
      <LifecycleSection />
      <ProofSection />
    </main>
  );
}

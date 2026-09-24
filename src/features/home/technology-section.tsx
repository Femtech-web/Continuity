import Image from "next/image";
import { sponsorTechnologies } from "./home-content";

export function TechnologySection() {
  return (
    <section
      className="infrastructure-section"
      aria-label="Technology behind Continuity"
    >
      <div className="page-shell infrastructure-grid">
        {sponsorTechnologies.map((technology) => (
          <article className="infrastructure-item" key={technology.key}>
            <h2 className="sr-only">{technology.name}</h2>
            <div
              className={`infrastructure-logo infrastructure-logo--${technology.key}`}
            >
              <Image
                src={technology.logo}
                alt={`${technology.name} logo`}
                width={technology.width}
                height={technology.height}
                unoptimized={technology.logo.endsWith(".svg")}
                style={{ height: "auto", width: technology.width }}
              />
              {technology.key === "clawpump" && <strong>ClawPump</strong>}
            </div>
            <p>{technology.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

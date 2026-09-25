import Link from "next/link";
import { ContinuityMark } from "@/components/continuity-mark";

export default function NotFound() {
  return (
    <main className="error-page" id="main" tabIndex={-1}>
      <ContinuityMark />
      <div>
        <span className="section-kicker">Route not found</span>
        <h1>This path has no verified successor.</h1>
        <Link className="button button--primary" href="/">Return home</Link>
      </div>
    </main>
  );
}

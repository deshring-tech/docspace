import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms under which you can use ${SITE.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="21 July 2026">
      <p>
        By using {SITE.name}, you agree to these terms. They are intentionally
        short.
      </p>

      <h2>The service</h2>
      <p>
        {SITE.name} provides browser-based document tools free of charge. Because
        all processing happens on your own device, availability depends on your
        browser and hardware.
      </p>

      <h2>Your responsibility</h2>
      <ul>
        <li>You are responsible for the files you process and for keeping your own backups.</li>
        <li>You must have the right to use and modify any document you upload into the workspace.</li>
        <li>
          Exam and form presets are provided as a convenience and reflect
          published specifications that change over time. Always verify output
          against the latest official notification before submitting.
        </li>
      </ul>

      <h2>No warranty</h2>
      <p>
        {SITE.name} is provided &quot;as is&quot;, without warranty of any kind.
        While we work to keep output accurate, we cannot guarantee that a file
        will be accepted by any particular portal or that conversions are
        error-free. Check important results before relying on them.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE.name} is not liable for any
        loss or damage arising from use of the service, including rejected
        submissions or lost files.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated as the product evolves. Continued use after a
        change constitutes acceptance of the revised terms.
      </p>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} handles your files and data — in short, it doesn't: everything runs locally in your browser.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="21 July 2026">
      <p>
        {SITE.name} is built around one principle: <strong>your files never
        leave your device.</strong> This policy explains what that means in
        practice.
      </p>

      <h2>Your files</h2>
      <p>
        Every document operation — compressing, converting, merging, splitting,
        editing pages, extracting signatures, watermarking and writing — runs
        entirely inside your web browser using local processing. Your files are{" "}
        <strong>never uploaded to any server</strong>, never transmitted over
        the network, and never seen by us or anyone else. When you close the
        tab, they are gone from memory.
      </p>

      <h2>What we store on your device</h2>
      <p>
        The writing pad saves your current draft to your browser&apos;s local
        storage so you don&apos;t lose work between visits. This never leaves
        your device and you can clear it any time from your browser settings. We
        do not use this to identify or track you.
      </p>

      <h2>Accounts</h2>
      <p>
        {SITE.name} has no accounts and no sign-up. We do not collect your name,
        email, or any personal information to use the tools.
      </p>

      <h2>Analytics and cookies</h2>
      <p>
        {SITE.name} sets no advertising cookies and does not track you across
        sites. Where usage analytics are enabled, they are{" "}
        <strong>cookieless and aggregate</strong>: they record anonymous counts
        such as page views and which tool was used, and never include your
        files, file names, or any information that could identify you. This lets
        us understand what&apos;s useful without profiling anyone.
      </p>

      <h2>OCR</h2>
      <p>
        Text recognition (OCR) also runs <strong>entirely on your device</strong>
        — your scan is never uploaded. To do this, your browser downloads the
        open-source recognition engine and the language model you select. Those
        are public, anonymous files, exactly like downloading a font; they carry
        no information about you or your document.
      </p>

      <h2>Third parties</h2>
      <p>
        Because processing is local, no third-party service receives your
        documents. Any future cloud-based features (for example AI assistance)
        will be clearly labelled as such before you use them, and will be
        optional.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to the address published on the
        site once a support channel is live.
      </p>
    </LegalPage>
  );
}

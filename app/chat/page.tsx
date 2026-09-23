import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

export const metadata: Metadata = {
  title: "Chat — do document tasks by asking",
  description:
    "Attach a file and just say what you need — “compress to 200 KB”, “make it UPSC photo size”, “extract the text”. Runs in your browser, nothing uploaded.",
  alternates: { canonical: "/chat" },
};

export default function ChatPage() {
  return <ChatWorkspace />;
}

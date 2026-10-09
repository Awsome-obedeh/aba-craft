import { Suspense } from "react";
import MessagesPage from "@/components/messaging/MessagesPage";
import { MessagingSkeleton } from "@/components/messaging/MessagingUI";

export const metadata = { title: "Messages | AbaCraft" };

export default function Page() {
  return (
    <Suspense fallback={<MessagingSkeleton />}>
      <MessagesPage />
    </Suspense>
  );
}

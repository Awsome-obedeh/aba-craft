import { Suspense } from "react";
import { notFound } from "next/navigation";
import BuyerPage from "@/components/buyer/BuyerPage";
import { MessagingSkeleton } from "@/components/messaging/MessagingUI";

const sections = [
  "orders",
  "wishlist",
  "followed",
  "recently-viewed",
  "reviews",
  "newsletter",
  "cookies",
  "quote",
  "tracking",
  "issue",
];

export default async function Page({ params }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return (
    <Suspense fallback={<MessagingSkeleton />}>
      <BuyerPage key={section} section={section} />
    </Suspense>
  );
}

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { shouldCloseProductionSurfaces } from "@/lib/security/closed-production-surfaces";

export default function ClosedProductionSurfaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (shouldCloseProductionSurfaces()) {
    notFound();
  }

  return children;
}

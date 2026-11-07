import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsoleApp } from "@/components/console-app";

export const metadata: Metadata = { title: "Response console", description: "Create and investigate incidents with evidence and runbook guidance." };

export default function ConsolePage() {
  return <Suspense fallback={<div className="console-empty">Opening the IncidentMind console…</div>}><ConsoleApp /></Suspense>;
}

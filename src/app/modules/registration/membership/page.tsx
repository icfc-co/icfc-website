import { Suspense } from "react";
import ThanksClient from "./thanks/ThanksClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function thanksPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-6">Loading…</div>}>
      <ThanksClient />
    </Suspense>
  );
}

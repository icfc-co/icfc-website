import { Suspense } from "react";
import ThanksClient from "./ThanksClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-6">Loading…</div>}>
      <ThanksClient />
    </Suspense>
  );
}

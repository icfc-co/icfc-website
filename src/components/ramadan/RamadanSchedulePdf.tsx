import Link from "next/link";

type Props = {
  pdfPath: string; // e.g. "/ramadan/ramadan-schedule-2026.pdf"
};

export default function RamadanSchedulePdf({ pdfPath }: Props) {
  return (
    <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">Ramadan Schedule (PDF)</p>
          <p className="text-sm text-gray-600">
            If it doesn’t render in-page on your device, open it in a new tab.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={pdfPath}
            target="_blank"
            className="rounded-xl border border-[#FFD700]/60 px-4 py-2 font-semibold text-[#0b2a17] hover:bg-[#FFD700]/10"
          >
            Open in New Tab
          </Link>

          <a
            href={pdfPath}
            download
            className="rounded-xl bg-[#FFD700] px-4 py-2 font-semibold text-black hover:brightness-95"
          >
            Download PDF
          </a>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border bg-gray-50">
        {/* Desktop/tablet preview */}
        <div className="hidden md:block">
          <iframe
            title="Ramadan Schedule PDF"
            src={`${pdfPath}#view=FitH`}
            className="h-[900px] w-full"
          />
        </div>

        {/* Mobile fallback */}
        <div className="block md:hidden p-5">
          <p className="text-sm text-gray-700">
            For best viewing on mobile, open the schedule in a new tab.
          </p>
          <div className="mt-4">
            <Link
              href={pdfPath}
              target="_blank"
              className="block w-full rounded-xl bg-[#0b2a17] px-4 py-3 text-center font-semibold text-white"
            >
              Open Schedule
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

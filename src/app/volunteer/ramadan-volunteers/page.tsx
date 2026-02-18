// File: src/app/volunteer/ramadan-volunteers/page.tsx
import RamadanVolunteersTable from '@/components/ramadan/RamadanVolunteersTable';

const TITLE_FONT = 'font-[var(--font-bebas-neue)]';
const BODY_FONT = 'font-[var(--font-roboto)]';
const BRAND_GREEN = '#006400';

export default function VolunteerRamadanVolunteersPage() {
  return (
    <main className={BODY_FONT + ' min-h-[70vh] py-8 md:py-12 px-4 md:px-6 bg-gradient-to-b from-[#f7f7f7] to-[#eef2f0]'}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6">
          <h1 className={TITLE_FONT + ' text-3xl md:text-4xl'} style={{ color: BRAND_GREEN }}>
            Ramadan Volunteers
          </h1>
          <p className="text-gray-700 mt-1">View Ramadan volunteer signups.</p>
        </div>

        <RamadanVolunteersTable canEdit={false} />
      </div>
    </main>
  );
}

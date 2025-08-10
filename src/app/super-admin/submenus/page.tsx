export const dynamic = "force-dynamic";

import SubmoduleToggles from "@/components/admin/SubmoduleToggles";

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-4xl text-[#006400] mb-2">Sub-menus</h1>
      <p className="text-sm text-gray-600 mb-6">
        Enable or disable items under each NavBar section.
      </p>
      <SubmoduleToggles />
    </div>
  );
}

import { redirect } from 'next/navigation';

// The Nikah page lives at /services/nikah-matrimony (linked from the Services menu)
export default function NikahMatrimonyRedirect() {
  redirect('/services/nikah-matrimony');
}

'use client';

import { Fragment, useState } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const topContact = {
  phone: '+1 (970) 221-2425',
  email: 'info@icfc.org',
};

const menu = [
  { name: 'About', href: '/about' },
  {
    name: 'Services',
    submenu: [
      { name: 'Nikah', href: '/services/nikah' },
      { name: 'Matrimony', href: '/services/matrimony' },
      { name: 'Ruqyah', href: '/services/ruqyah' },
      { name: 'Social Services', href: '/services/social' },
      { name: 'Special Needs', href: '/services/special-needs' },
      { name: 'Newcomer Support', href: '/services/newcomer' },
      { name: 'Ask Imam', href: '/services/ask-imam' },
      { name: 'Gym Facility', href: '/services/gym' },
      { name: 'MPF Booking', href: '/services/mpf' },
      { name: 'Halal Kitchen Info', href: '/services/halal' },
    ],
  },
  {
    name: 'Education',
    submenu: [
      { name: 'Q&A School / Weekend School', href: '/education/weekend-school' },
      { name: 'School System (Classes)', href: '/education/classes' },
      { name: 'Resource Library', href: '/education/library' },
      { name: 'Revert Stories', href: '/education/revert-stories' },
    ],
  },
  {
    name: 'Volunteering',
    submenu: [
      { name: 'Volunteer Signup', href: '/volunteering/signup' },
      { name: 'Track Hours', href: '/volunteering/hours' },
      { name: 'Feed the Hungry', href: '/volunteering/feed' },
      { name: 'Shelter Programs', href: '/volunteering/shelter' },
      { name: 'Committees', href: '/volunteering/committees' },
    ],
  },
  {
    name: 'Community',
    submenu: [
      { name: 'Events', href: '/community/events' },
      { name: 'Blog / Khutbah', href: '/community/blog' },
      { name: 'Gallery', href: '/community/gallery' },
      { name: 'Community Wall', href: '/community/wall' },
      { name: 'Announcements', href: '/community/announcements' },
      { name: 'Newsletter', href: '/community/newsletter' },
      { name: 'FAQ', href: '/community/faq' },
    ],
  },
  {
    name: 'Registration',
    submenu: [
      { name: 'Membership', href: '/registration/membership' },
      { name: 'School Enrollment', href: '/registration/school' },
      { name: 'Gym Access', href: '/registration/gym' },
      { name: 'MPF Access', href: '/registration/mpf' },
      { name: 'Halal Kitchen Subscription', href: '/registration/kitchen' },
      { name: 'Cemetery Burial Request', href: '/registration/cemetery' },
    ],
  },
  { name: 'Contact', href: '/contact' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function NavBar() {
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <div>
      {/* Top bar */}
      <div className="bg-cyan-900 text-white text-sm px-4 py-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span>📞 {topContact.phone}</span>
        </div>
        <div>
          <span>📧 {topContact.email}</span>
        </div>
      </div>

      {/* Main navigation */}
      <Disclosure as="nav" className="bg-white shadow">
        {({ open }) => (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link href="/" className="text-xl font-semibold text-cyan-900">
                  ICFC
                </Link>

                {/* Desktop menu */}
                <div className="hidden md:flex space-x-6 items-center">
                  {menu.map((item) =>
                    item.submenu ? (
                      <div
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => setActiveDropdown(item.name)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        <button
                          onClick={() =>
                            setActiveDropdown(activeDropdown === item.name ? null : item.name)
                          }
                          className="inline-flex items-center text-gray-700 hover:text-cyan-700 font-medium"
                        >
                          {item.name}
                          <ChevronDownIcon className="ml-1 h-4 w-4" />
                        </button>
                        {activeDropdown === item.name && (
                          <div className="absolute z-20 mt-2 w-56 origin-top-left bg-white border border-gray-200 rounded-md shadow-lg">
                            {item.submenu.map((sub) => (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          pathname === item.href
                            ? 'text-cyan-700 font-semibold'
                            : 'text-gray-700 hover:text-cyan-700',
                          'font-medium'
                        )}
                      >
                        {item.name}
                      </Link>
                    )
                  )}
                  <Link
                    href="/donate"
                    className={classNames(
                      pathname === '/donate'
                        ? 'bg-red-700'
                        : 'bg-red-600 hover:bg-red-700',
                      'text-white px-4 py-1 rounded font-medium'
                    )}
                  >
                    Donate
                  </Link>
                  <Link
                    href="/login"
                    className="bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-1 rounded font-medium"
                  >
                    Login (myPortal)
                  </Link>
                </div>

                {/* Mobile menu button */}
                <div className="flex md:hidden">
                  <Disclosure.Button className="text-cyan-900">
                    {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile menu */}
            <Disclosure.Panel className="md:hidden px-4 pb-4">
              {menu.map((item) =>
                item.submenu ? (
                  <div key={item.name}>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className="block pl-4 text-gray-600 hover:text-cyan-700 text-sm"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-gray-800 hover:text-cyan-700 font-medium"
                  >
                    {item.name}
                  </Link>
                )
              )}
              <Link
                href="/donate"
                className={classNames(
                  pathname === '/donate'
                    ? 'bg-red-700'
                    : 'bg-red-600 hover:bg-red-700',
                  'text-white px-4 py-1 rounded font-medium block mt-2'
                )}
              >
                Donate
              </Link>
              <Link
                href="/login"
                className="bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-1 rounded font-medium block mt-2"
              >
                Login (myPortal)
              </Link>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}

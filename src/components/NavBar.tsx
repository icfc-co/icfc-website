'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { s3ImageService } from '../app/services/s3ImageService';

const topContact = {
  phone: '+1 (970) 221-2425',
  email: 'info@icfc.org',
};

// Parent dropdowns (order matters)
const PARENTS = [
  { name: 'Services', key: 'services' },
  { name: 'Education', key: 'education' },
  { name: 'Volunteering', key: 'volunteering' },
  { name: 'Community', key: 'community' },
  { name: 'Registration', key: 'registration' },
] as const;

// Top-level links on the left (Contact will be placed near Donate, not here)
const TOP_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
];

type SubItem = { name: string; href: string; order: number | null; parent_key: string };

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [dashboardRoute, setDashboardRoute] = useState('/');
  const [logoUrl, setLogoUrl] = useState('');
  const [submenus, setSubmenus] = useState<Record<string, SubItem[]>>({});

  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', session.user.id)
          .single();

        const { data: roleNameData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', roleData?.role_id)
          .single();

        switch (roleNameData?.name) {
          case 'super_admin': setDashboardRoute('/super-admin'); break;
          case 'admin': setDashboardRoute('/admin'); break;
          case 'volunteer': setDashboardRoute('/volunteer'); break;
          case 'teacher': setDashboardRoute('/teacher'); break;
          case 'student': setDashboardRoute('/student'); break;
          case 'member': setDashboardRoute('/member'); break;
          default: setDashboardRoute('/user');
        }
      }
    };

    const fetchLogo = async () => {
      try {
        const url = await s3ImageService.getImage('ICFC-Logo.png');
        setLogoUrl(url);
      } catch (error) {
        console.error('Failed to load logo image:', error);
      }
    };

    const loadNavData = async () => {
      const { data: subs, error } = await supabase
        .from('navbar_submodules')
        .select('parent_key,name,href,order')
        .eq('enabled', true)
        .order('parent_key', { ascending: true })
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Failed to load submenus:', error.message);
        setSubmenus({});
        return;
      }

      const grouped: Record<string, SubItem[]> = {};
      (subs || []).forEach((s: any) => {
        (grouped[s.parent_key] ||= []).push({
          parent_key: s.parent_key,
          name: s.name,
          href: s.href,
          order: s.order,
        });
      });
      setSubmenus(grouped);
    };

    fetchLogo();
    getSessionAndRole();
    loadNavData();

    // Auth listener
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    // Live updates on any submodule change
    const ch = supabase
      .channel('navbar-submodules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'navbar_submodules' },
        () => loadNavData()
      )
      .subscribe();

    return () => {
      listener.subscription.unsubscribe();
      supabase.removeChannel(ch);
    };
  }, []);

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 200);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <div>
      {/* Top Bar */}
      <div className="bg-primary text-white text-sm px-4 py-1 flex justify-between items-center font-body">
        <span>📞 {topContact.phone}</span>
        <span>📧 {topContact.email}</span>
      </div>

      <Disclosure as="nav" className="bg-white shadow">
        {({ open }) => (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-body">
              <div className="flex justify-between h-16 items-center">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="ICFC Logo"
                      className="h-12 w-auto object-contain"
                    />
                  )}
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex space-x-6 items-center">
                  {/* Left top-level links */}
                  {TOP_LINKS.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? 'text-primary font-semibold'
                          : 'text-gray-700 hover:text-primary',
                        'font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}

                  {/* Dropdown parents from DB */}
                  {PARENTS.map((parent) => {
                    const items = submenus[parent.key] || [];
                    if (!items.length) return null; // hide parent if no enabled children
                    return (
                      <div
                        key={parent.key}
                        className="relative"
                        onMouseEnter={() => handleMouseEnter(parent.name)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <button className="inline-flex items-center text-gray-700 hover:text-primary font-medium">
                          {parent.name}
                          <ChevronDownIcon className="ml-1 h-4 w-4" />
                        </button>
                        {activeDropdown === parent.name && (
                          <div className="absolute z-20 mt-2 w-56 origin-top-left bg-white border border-gray-200 rounded-md shadow-lg">
                            {items.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Contact placed right before Donate */}
                  <Link
                      href="/modules/contact"
                      prefetch={false}
                      className={classNames(
                        pathname?.startsWith('/modules/contact')
                          ? 'text-primary font-semibold'
                          : 'text-gray-700 hover:text-primary',
                        'block font-medium mt-2'
                      )}
                    >
                      Contact
                    </Link>

                  {/* Donate button */}
                  <Link
                    href="https://us.mohid.co/co/fortcollins/icfc/masjid/online/donation"
                    className="bg-secondary hover:bg-yellow-500 text-black px-4 py-1 rounded font-semibold"
                  >
                    Donate
                  </Link>

                  {/* Login/Profile */}
                  {!isLoggedIn ? (
                    <Link
                      href="/login"
                      className="bg-primary hover:bg-green-800 text-white px-4 py-1 rounded font-medium"
                    >
                      Login (myPortal)
                    </Link>
                  ) : (
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="bg-primary text-white px-4 py-1 rounded hover:bg-green-800 font-medium">
                        My Profile
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-30 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/my-profile"
                                className={classNames(
                                  active ? 'bg-gray-100' : '',
                                  'block px-4 py-2 text-sm text-gray-700'
                                )}
                              >
                                View Profile
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href={dashboardRoute}
                                className={classNames(
                                  active ? 'bg-gray-100' : '',
                                  'block px-4 py-2 text-sm text-gray-700'
                                )}
                              >
                                Dashboard
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={classNames(
                                  active ? 'bg-gray-100' : '',
                                  'block w-full text-left px-4 py-2 text-sm text-red-600'
                                )}
                              >
                                Logout
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </div>

                {/* Mobile toggle */}
                <div className="flex md:hidden">
                  <Disclosure.Button className="text-primary">
                    {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile menu panel */}
            <Disclosure.Panel className="md:hidden px-4 pb-4 font-body">
              {/* Home & About first */}
              {TOP_LINKS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-gray-800 hover:text-primary font-medium"
                >
                  {item.name}
                </Link>
              ))}

              {/* Dropdown parents */}
              {PARENTS.map((parent) => {
                const items = submenus[parent.key] || [];
                if (!items.length) return null;
                return (
                  <div key={parent.key} className="mt-2">
                    <div className="font-semibold text-gray-800">{parent.name}</div>
                    {items.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block pl-4 text-gray-600 hover:text-primary text-sm"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                );
              })}

              {/* Contact right before Donate */}
              <Link
                  href="/modules/contact"
                 className="block pl-4 text-gray-600 hover:text-primary text-sm"
                >
                  Contact
                </Link>
              {/* Donate */}
              <Link
                href="https://us.mohid.co/co/fortcollins/icfc/masjid/online/donation"
                className="block bg-secondary text-black px-4 py-1 rounded font-semibold mt-2"
              >
                Donate
              </Link>

              {/* Auth buttons */}
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="block bg-primary text-white px-4 py-1 rounded font-medium mt-2"
                >
                  Login (myPortal)
                </Link>
              ) : (
                <>
                  <Link
                    href="/my-profile"
                    className="block text-gray-800 hover:text-primary font-medium mt-2"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={dashboardRoute}
                    className="block text-gray-800 hover:text-primary font-medium mt-2"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left text-red-600 px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </>
              )}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, Bars3Icon, XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SITE, MAPS } from '@/lib/site';
import SocialIcons from './SocialIcons';

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
  { name: 'Prayer Times', href: '/modules/prayer-times' },
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
          case 'user': setDashboardRoute('/user'); break;
          default: setDashboardRoute('/user');
        }
      } else {
        setDashboardRoute('/');
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

    getSessionAndRole();
    loadNavData();

    // Auth listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      // A different account may have signed in without a page reload: recompute the
      // dashboard link, or it keeps pointing at the previous account's dashboard (403).
      // Deferred: supabase-js advises against awaiting its calls inside this callback.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(getSessionAndRole, 0);
      }
    });

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

  // Close any open dropdown after navigating
  useEffect(() => { setActiveDropdown(null); }, [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 200);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear the server session cookie too, so the next account doesn't inherit it
    await fetch('/api/auth/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'SIGNED_OUT' }),
    }).catch(() => {});
    setIsLoggedIn(false);
    setDashboardRoute('/');
    router.push('/');
  };

  const navLink = (active: boolean) =>
    classNames(
      'relative whitespace-nowrap py-2 text-[15px] font-medium transition-colors',
      active
        ? 'text-primary after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-secondary'
        : 'text-gray-700 hover:text-primary'
    );

  return (
    <>
      {/* Top bar: contact, directions, social */}
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6 sm:text-sm lg:px-8">
          <div className="flex items-center gap-4">
            <a href={SITE.phoneHref} className="inline-flex items-center gap-1.5 hover:text-secondary">
              <PhoneIcon className="h-4 w-4" aria-hidden /> {SITE.phone}
            </a>
            <a href={`mailto:${SITE.email}`} className="hidden items-center gap-1.5 hover:text-secondary sm:inline-flex">
              <EnvelopeIcon className="h-4 w-4" aria-hidden /> {SITE.email}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href={MAPS.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-secondary">
              <MapPinIcon className="h-4 w-4" aria-hidden />
              <span className="hidden md:inline">{SITE.address}, Fort Collins</span>
              <span className="md:hidden">Directions</span>
            </a>
            <SocialIcons className="hidden sm:flex" />
          </div>
        </div>
      </div>

      <Disclosure
        as="nav"
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 font-body shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85"
      >
        {({ open, close }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
                {/* Logo */}
                <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="ICFC home">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/icfc-logo.png" alt="Islamic Center of Fort Collins" width={600} height={366} className="h-12 w-auto object-contain lg:h-16" />
                </Link>

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 lg:flex">
                  {TOP_LINKS.map((item) => (
                    <Link key={item.name} href={item.href} className={navLink(!!isActive(item.href))}>
                      {item.name}
                    </Link>
                  ))}

                  {/* Dropdown parents from DB */}
                  {PARENTS.map((parent) => {
                    const items = submenus[parent.key] || [];
                    if (!items.length) return null; // hide parent if no enabled children
                    const isOpen = activeDropdown === parent.name;
                    const childActive = items.some((s) => isActive(s.href));
                    return (
                      <div
                        key={parent.key}
                        className="relative"
                        onMouseEnter={() => handleMouseEnter(parent.name)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setActiveDropdown(isOpen ? null : parent.name)}
                          className={classNames(navLink(childActive), 'inline-flex items-center')}
                        >
                          {parent.name}
                          <ChevronDownIcon className={classNames('ml-1 h-4 w-4 transition-transform', isOpen ? 'rotate-180' : '')} />
                        </button>
                        {isOpen && (
                          <div className="absolute left-1/2 z-50 mt-2 w-60 -translate-x-1/2 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl ring-1 ring-black/5">
                            {items.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={classNames(
                                  'block px-4 py-2 text-sm transition-colors',
                                  isActive(sub.href)
                                    ? 'bg-green-50 font-semibold text-primary'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                                )}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Link href="/modules/contact" prefetch={false} className={navLink(!!isActive('/modules/contact'))}>
                    Contact
                  </Link>
                </div>

                {/* Desktop actions */}
                <div className="hidden items-center gap-2 lg:flex">
                  <Link
                    href="/donate"
                    className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:brightness-95"
                  >
                    Donate
                  </Link>
                  <Link
                    href="/modules/registration/membership"
                    className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-green-50"
                  >
                    Membership
                  </Link>

                  {!isLoggedIn ? (
                    <Link
                      href="/login"
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                    >
                      Login
                    </Link>
                  ) : (
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800">
                        My Account
                        <ChevronDownIcon className="ml-1 h-4 w-4" />
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
                        <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl ring-1 ring-black/5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <Link href={dashboardRoute} className={classNames(active ? 'bg-gray-50' : '', 'block px-4 py-2 text-sm text-gray-700')}>
                                Dashboard
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <Link href="/my-profile" className={classNames(active ? 'bg-gray-50' : '', 'block px-4 py-2 text-sm text-gray-700')}>
                                My Profile
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={handleLogout}
                                className={classNames(active ? 'bg-gray-50' : '', 'block w-full px-4 py-2 text-left text-sm text-red-600')}
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

                {/* Mobile: donate + menu toggle */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Link href="/donate" className="rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-gray-900">
                    Donate
                  </Link>
                  <Disclosure.Button className="rounded-lg p-2 text-primary hover:bg-green-50" aria-label={open ? 'Close menu' : 'Open menu'}>
                    {open ? <XMarkIcon className="h-7 w-7" /> : <Bars3Icon className="h-7 w-7" />}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile menu panel */}
            <Disclosure.Panel className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-100 bg-white px-4 pb-6 pt-2 lg:hidden">
              <nav className="divide-y divide-gray-100">
                {TOP_LINKS.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => close()}
                    className={classNames('block py-3 text-base font-medium', isActive(item.href) ? 'text-primary' : 'text-gray-800')}
                  >
                    {item.name}
                  </Link>
                ))}

                {PARENTS.map((parent) => {
                  const items = submenus[parent.key] || [];
                  if (!items.length) return null;
                  return (
                    <Disclosure key={parent.key} as="div">
                      {({ open: groupOpen }) => (
                        <>
                          <Disclosure.Button className="flex w-full items-center justify-between py-3 text-left text-base font-medium text-gray-800">
                            {parent.name}
                            <ChevronDownIcon className={classNames('h-5 w-5 text-gray-500 transition-transform', groupOpen ? 'rotate-180' : '')} />
                          </Disclosure.Button>
                          <Disclosure.Panel className="pb-2">
                            {items.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => close()}
                                className={classNames(
                                  'block rounded-lg py-2 pl-4 text-[15px]',
                                  isActive(sub.href) ? 'bg-green-50 text-primary' : 'text-gray-600'
                                )}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  );
                })}

                <Link
                  href="/modules/contact"
                  onClick={() => close()}
                  className={classNames('block py-3 text-base font-medium', isActive('/modules/contact') ? 'text-primary' : 'text-gray-800')}
                >
                  Contact
                </Link>
              </nav>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/donate" onClick={() => close()} className="rounded-xl bg-secondary py-3 text-center font-semibold text-gray-900">
                  Donate
                </Link>
                <Link
                  href="/modules/registration/membership"
                  onClick={() => close()}
                  className="rounded-xl border border-primary py-3 text-center font-semibold text-primary"
                >
                  Membership
                </Link>
              </div>

              {!isLoggedIn ? (
                <Link href="/login" onClick={() => close()} className="mt-2 block rounded-xl bg-primary py-3 text-center font-semibold text-white">
                  Login (myPortal)
                </Link>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={dashboardRoute} onClick={() => close()} className="rounded-xl bg-primary py-3 text-center font-semibold text-white">
                    Dashboard
                  </Link>
                  <Link href="/my-profile" onClick={() => close()} className="rounded-xl border border-gray-300 py-3 text-center font-semibold text-gray-800">
                    My Profile
                  </Link>
                  <button
                    onClick={() => { close(); handleLogout(); }}
                    className="col-span-2 rounded-xl py-2 text-center text-sm font-medium text-red-600"
                  >
                    Logout
                  </button>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between text-sm text-gray-600">
                <a href={SITE.phoneHref} className="inline-flex items-center gap-1.5">
                  <PhoneIcon className="h-4 w-4" /> Call
                </a>
                <a href={MAPS.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4" /> Directions
                </a>
                <SocialIcons className="text-primary" iconClass="h-5 w-5" />
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </>
  );
}

'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { convertToDirectGoogleDriveURL } from '@/lib/utils';

const topContact = {
  phone: '+1 (970) 221-2425',
  email: 'info@icfc.org',
};

const menu = [
    { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  {
    name: 'Services',
    submenu: [
      { name: 'Nikah/Matrimony', href: '/services/nikah-matrimony' },
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
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dashboardRoute, setDashboardRoute] = useState('/');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const getSessionAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
          case 'super_admin':
            setDashboardRoute('/super-admin');
            break;
          case 'admin':
            setDashboardRoute('/admin');
            break;
          case 'volunteer':
            setDashboardRoute('/volunteer');
            break;
          case 'teacher':
            setDashboardRoute('/teacher');
            break;
          case 'student':
            setDashboardRoute('/student');
            break;
          case 'member':
            setDashboardRoute('/member');
            break;
          default:
            setDashboardRoute('/user');
        }
      }
    };

    const fetchLogo = async () => {
      const { data, error } = await supabase
      .from('photos')
      .select('url')
      .eq('title', 'logo')
      .single(); // since we expect only one


      if (!error && data?.url) {
        setLogoUrl(data.url);
      } else {
        console.error('Error fetching logo:', error?.message);
      }
    };


    getSessionAndRole();
    fetchLogo();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
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
                

                {/* Desktop Navigation */}
                <div className="hidden md:flex space-x-6 items-center">
                  {menu.map((item) =>
                    item.submenu ? (
                      <div
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => handleMouseEnter(item.name)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <button className="inline-flex items-center text-gray-700 hover:text-primary font-medium">
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
                            ? 'text-primary font-semibold'
                            : 'text-gray-700 hover:text-primary',
                          'font-medium'
                        )}
                      >
                        {item.name}
                      </Link>
                    )
                  )}

                  {/* Donate + Login/Profile */}
                  <Link
                    href="/donate"
                    className="bg-secondary hover:bg-yellow-500 text-black px-4 py-1 rounded font-semibold"
                  >
                    Donate
                  </Link>

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

                {/* Mobile menu toggle */}
                <div className="flex md:hidden">
                  <Disclosure.Button className="text-primary">
                    {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Panel */}
            <Disclosure.Panel className="md:hidden px-4 pb-4 font-body">
              {menu.map((item) =>
                item.submenu ? (
                  <div key={item.name}>
                    <div className="font-semibold text-gray-800">{item.name}</div>
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className="block pl-4 text-gray-600 hover:text-primary text-sm"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-gray-800 hover:text-primary font-medium"
                  >
                    {item.name}
                  </Link>
                )
              )}

              <Link
                href="/donate"
                className="block bg-secondary text-black px-4 py-1 rounded font-semibold mt-2"
              >
                Donate
              </Link>

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

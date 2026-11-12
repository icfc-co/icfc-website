'use client';
import Link from 'next/link';
import { MapPinIcon, PhoneIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { SITE, MAPS } from '@/lib/site';
import SocialIcons from './SocialIcons';

const QUICK_LINKS = [
  { name: 'About ICFC', href: '/about' },
  { name: 'Prayer Times', href: '/modules/prayer-times' },
  { name: 'Community Calendar', href: '/modules/community/events' },
  { name: 'Donate', href: '/donate' },
  { name: 'Membership', href: '/modules/registration/membership' },
  { name: 'Contact Us', href: '/modules/contact' },
];

const SERVICES = [
  { name: 'Ask the Imam', href: '/modules/services/ask-imam' },
  { name: 'Newcomer Support', href: '/modules/services/newcomer-support' },
  { name: 'Social Services', href: '/modules/services/social-services' },
  { name: 'Halal Kitchen', href: '/modules/services/halal-kitchen' },
  { name: 'Utilities Pledge', href: '/modules/community/utilities-pledge' },
  { name: 'Masjid Expansion', href: '/expansion' },
];

export default function Footer() {
  return (
    <footer className="bg-[#004d00] font-body text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.8fr_0.9fr_1.3fr] lg:gap-x-10 lg:px-8">
        {/* About */}
        <div className="col-span-2 lg:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/icfc-logo-white.png" alt="Islamic Center of Fort Collins" width={600} height={366} className="h-20 w-auto" />
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            Serving the Muslim community of Fort Collins with faith, education and service.
          </p>
          <SocialIcons className="mt-5 text-secondary" iconClass="h-5 w-5" />
        </div>

        {/* Quick links */}
        <div>
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Quick Links</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/85 transition hover:text-secondary">{l.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Services &amp; Giving</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/85 transition hover:text-secondary">{l.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Visit us */}
        <div className="col-span-2 lg:col-span-1">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-secondary">Visit Us</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={MAPS.directions} target="_blank" rel="noopener noreferrer" className="group flex gap-2 text-white/85 hover:text-secondary">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
                <span>
                  {SITE.address}
                  <br />
                  {SITE.cityLine}
                </span>
              </a>
            </li>
            <li>
              <a href={SITE.phoneHref} className="flex gap-2 text-white/85 hover:text-secondary">
                <PhoneIcon className="h-5 w-5 shrink-0 text-secondary" aria-hidden /> {SITE.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="flex gap-2 text-white/85 hover:text-secondary">
                <EnvelopeIcon className="h-5 w-5 shrink-0 text-secondary" aria-hidden /> {SITE.email}
              </a>
            </li>
          </ul>
          {/* Small map */}
          <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-white/20">
            <iframe
              title="Map to the Islamic Center of Fort Collins"
              src={MAPS.embed}
              className="block h-40 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            href={MAPS.directions}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-gray-900 transition hover:brightness-95"
          >
            Get directions <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/70 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>ICFC is a 501(c)(3) nonprofit organization. Donations may be tax-deductible.</p>
        </div>
      </div>
    </footer>
  );
}

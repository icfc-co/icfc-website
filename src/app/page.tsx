'use client';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpenIcon, UsersIcon, HeartIcon, ClockIcon, CalendarDaysIcon, GiftIcon, IdentificationIcon,
  ChatBubbleLeftRightIcon, HandRaisedIcon, MapPinIcon, PhoneIcon, BuildingLibraryIcon, LightBulbIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import GalleryCarousel from '@/components/gallery/GalleryCarousel';
import PrayerTimesCard from '@/components/home/PrayerTimesCard';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import { SITE, MAPS } from '@/lib/site';
// Seasonal: uncomment for Ramadan / Eid
// import RamadanPromoSection from '@/components/home/RamadanPromoSection';
// import EidPosterPopup from '@/components/home/EidPosterPopup';

const AYAH = {
  ref: 'Qur’an 9:18',
  arabic:
    'إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ وَأَقَامَ الصَّلَاةَ وَآتَى الزَّكَاةَ وَلَمْ يَخْشَ إِلَّا اللَّهَ فَعَسَىٰ أُولَٰئِكَ أَنْ يَكُونُوا مِنَ الْمُهْتَدِينَ',
  translation:
    'The mosques of Allah are only to be maintained by those who believe in Allah and the Last Day, establish prayer, give zakah, and fear none except Allah. It is expected that they will be of the rightly guided.',
};

const QUICK_LINKS = [
  { name: 'Prayer Times', desc: 'Daily, iqamah & Jumu‘ah', href: '/modules/prayer-times', icon: ClockIcon },
  { name: 'Community Calendar', desc: 'Programs & events', href: '/modules/community/events', icon: CalendarDaysIcon },
  { name: 'Donate', desc: 'Zakat, sadaqah & more', href: '/donate', icon: GiftIcon },
  { name: 'Membership', desc: 'Join or renew', href: '/modules/registration/membership', icon: IdentificationIcon },
  { name: 'Ask the Imam', desc: 'Send your question', href: '/modules/services/ask-imam', icon: ChatBubbleLeftRightIcon },
  { name: 'Newcomer Support', desc: 'New to Fort Collins?', href: '/modules/services/newcomer-support', icon: HandRaisedIcon },
  { name: 'Social Services', desc: 'Help when you need it', href: '/modules/services/social-services', icon: HeartIcon },
  { name: 'Contact Us', desc: 'We’re here to help', href: '/modules/contact', icon: PhoneIcon },
];

const MISSION = [
  { title: 'Education', icon: BookOpenIcon, text: 'Offering weekend school, classes, and resources to strengthen Islamic knowledge.' },
  { title: 'Community', icon: UsersIcon, text: 'Bringing people together through events, services, and support for all ages.' },
  { title: 'Service', icon: HeartIcon, text: 'Supporting the needy, newcomers, and volunteers with care and compassion.' },
];

const GET_INVOLVED = [
  {
    title: 'Become a Member',
    text: 'Your voice. Your masjid. Your future. Members help shape ICFC and keep it strong.',
    href: '/modules/registration/membership',
    cta: 'Join ICFC',
    icon: IdentificationIcon,
  },
  {
    title: 'Utilities Pledge',
    text: 'Pledge your support toward the Islamic Center of Fort Collins utility expenses.',
    href: '/modules/community/utilities-pledge',
    cta: 'Make a pledge',
    icon: LightBulbIcon,
  },
  {
    title: 'Masjid Expansion',
    text: 'New classrooms, a community café, and a multipurpose facility with a gymnasium. Build our future together.',
    href: '/expansion',
    cta: 'Support the expansion',
    icon: BuildingLibraryIcon,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true, margin: '-80px' },
};

export default function HomePage() {
  return (
    <>
      {/* <RamadanPromoSection /> */}

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/WelcomeICFC.JPG"
          alt="The Islamic Center of Fort Collins"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-[#003300]/85" />

        <div className="mx-auto flex min-h-[min(78vh,820px)] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center text-white sm:px-6 lg:px-8">
          <p dir="rtl" lang="ar" className="font-[var(--font-arabic)] text-2xl text-secondary sm:text-3xl">
            بِسْمِ ٱللّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <h1 className="mt-4 font-title text-5xl leading-none tracking-wide sm:text-7xl lg:text-8xl">
            Islamic Center of Fort Collins
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/90 sm:text-xl">
            A home for prayer, learning and community, serving the Muslim community of Fort Collins.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/modules/prayer-times"
              className="rounded-full bg-secondary px-7 py-3 font-semibold text-gray-900 shadow-lg transition hover:brightness-95"
            >
              Prayer Times
            </Link>
            <Link
              href="/donate"
              className="rounded-full border-2 border-white/80 px-7 py-3 font-semibold text-white backdrop-blur transition hover:bg-white hover:text-gray-900"
            >
              Donate
            </Link>
            <Link
              href="/modules/registration/membership"
              className="rounded-full border-2 border-white/80 px-7 py-3 font-semibold text-white backdrop-blur transition hover:bg-white hover:text-gray-900"
            >
              Become a Member
            </Link>
          </div>
          <a
            href={MAPS.directions}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm text-white/85 hover:text-secondary"
          >
            <MapPinIcon className="h-5 w-5" aria-hidden />
            {SITE.address}, {SITE.cityLine} · Get directions
          </a>
        </div>
      </section>

      {/* Quick links */}
      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white p-3 shadow-xl ring-1 ring-black/5 sm:gap-4 sm:p-4 md:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-green-50 sm:p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                <q.icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-sm font-bold text-gray-900 sm:text-base">{q.name}</span>
                <span className="hidden truncate text-sm text-gray-500 sm:block">{q.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* This week at ICFC */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mb-8 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">This Week at ICFC</h2>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-secondary" />
        </motion.div>
        <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div>
            <PrayerTimesCard />
          </div>
          <div className="flex flex-col gap-6">
            <UpcomingEvents />
            {/* Visit card */}
            <div className="rounded-3xl bg-primary p-6 text-white shadow-sm">
              <h2 className="font-heading text-lg font-bold">Visit ICFC</h2>
              <p className="mt-2 text-white/85">
                {SITE.address}
                <br />
                {SITE.cityLine}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={MAPS.directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-gray-900"
                >
                  <MapPinIcon className="h-4 w-4" aria-hidden /> Get directions
                </a>
                <a href={SITE.phoneHref} className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2 text-sm font-semibold">
                  <PhoneIcon className="h-4 w-4" aria-hidden /> Call us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ayah */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-yellow-50 py-16">
        <motion.div {...fadeUp} className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p dir="rtl" lang="ar" className="font-[var(--font-arabic)] text-2xl leading-loose text-gray-900 md:text-3xl">
            {AYAH.arabic}
          </p>
          <div className="mx-auto my-6 h-1 w-16 rounded-full bg-secondary" />
          <p className="text-lg leading-relaxed text-gray-700 md:text-xl">“{AYAH.translation}”</p>
          <p className="mt-3 text-sm font-semibold text-primary">{AYAH.ref}</p>
        </motion.div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mb-10 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">Our Mission</h2>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-secondary" />
        </motion.div>
        <div className="grid gap-6 md:grid-cols-3">
          {MISSION.map((m, i) => (
            <motion.div
              key={m.title}
              {...fadeUp}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
                <m.icon className="h-8 w-8" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-xl font-bold text-gray-900">{m.title}</h3>
              <p className="mt-2 text-gray-600">{m.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/about" className="inline-flex items-center gap-2 font-semibold text-primary hover:underline">
            Learn more about ICFC <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Get involved */}
      <section className="bg-primary py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Support Your Masjid</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/85">
              ICFC runs on the generosity of our community. Every member, pledge and gift makes a difference.
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {GET_INVOLVED.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="group flex flex-col rounded-3xl bg-white/10 p-7 ring-1 ring-white/15 transition hover:bg-white/15"
              >
                <g.icon className="h-9 w-9 text-secondary" aria-hidden />
                <h3 className="mt-4 font-heading text-xl font-bold">{g.title}</h3>
                <p className="mt-2 flex-1 text-white/85">{g.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-semibold text-secondary">
                  {g.cta} <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/donate"
              className="inline-flex rounded-full bg-secondary px-8 py-3 font-semibold text-gray-900 shadow-lg transition hover:brightness-95"
            >
              Donate to ICFC
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">Life at ICFC</h2>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-secondary" />
        </div>
        <GalleryCarousel album="About" />
      </section>
    </>
  );
}

'use client';
import { useEffect, useRef, useState, Fragment, useMemo } from 'react';
import { BookOpenIcon, UsersIcon, HeartIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { s3ImageService } from '../app/services/s3ImageService';
import GalleryCarousel from "@/components/gallery/GalleryCarousel";
import Link from 'next/link';
import RamadanPromoSection from "@/components/home/RamadanPromoSection";
import EidPosterPopup from "@/components/home/EidPosterPopup";

const GREEN = "#006400";
    const GOLD  = "#FFD700";

    // Optional: rotate among a few ayat in the future
    type Ayah = {
        ref: string;          // e.g. "Qur'an 9:18"
        arabic: string;       // Arabic text
        translation: string;  // English translation (Sahih Intl or your preferred)
    };

    const AYAT: Ayah[] = [
        {
        ref: "Qur’an 9:18",
        arabic:
            "إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ وَأَقَامَ الصَّلَاةَ وَآتَى الزَّكَاةَ وَلَمْ يَخْشَ إِلَّا اللَّهَ فَعَسَىٰ أُولَٰئِكَ أَنْ يَكُونُوا مِنَ الْمُهْتَدِينَ",
        translation:
            "The mosques of Allah are only to be maintained by those who believe in Allah and the Last Day, establish prayer, give zakah, and fear none except Allah. It is expected that they will be of the rightly guided.",
        },
        // You can add more options here if you’d like to rotate later
    ];

export default function HomePage() {
  // Eid Poster Popup logic: always show on page load
  const [showPoster, setShowPoster] = useState(true);

  const handleClosePoster = () => {
    setShowPoster(false);
  };

  const [welcomeUrl, setWelcomeUrl] = useState<string | null>(null);
  const ayah = useMemo(() => AYAT[0], []);


  useEffect(() => {
    (async () => {
      try {
        const url = await s3ImageService.getImage('WelcomeICFC.png');
        setWelcomeUrl(url);
      } catch (err) {
        console.error('Failed to load welcome image:', err);
        setWelcomeUrl(null);
      }
    })();
  }, []);


  return (
    <>
      {/* Eid Poster Popup */}
      {showPoster && <EidPosterPopup onClose={handleClosePoster} />}

      {/* Eid Mubarak Compact Notification Banner */}
<section className="w-full flex justify-center bg-gradient-to-r from-green-50 via-white to-emerald-50 py-4 px-4 border-b border-green-200">
  <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-green-200 bg-white shadow-lg">
    {/* soft decorative background */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(22,163,74,0.12),transparent_30%)]" />
    
    <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr_0.9fr] gap-4 px-5 py-4 md:px-6 md:py-5">
      
      {/* Left: Main Eid info */}
      <div className="flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 border border-green-200 mb-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Special Eid Announcement
        </div>

        <h2 className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-green-800 leading-tight">
          Eid Mubarak!
        </h2>

        <p className="mt-1 text-sm md:text-base font-semibold text-green-700">
          Eid al-Fitr 2026 / 1447
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-green-50 px-3 py-1.5 border border-green-200 font-semibold text-green-900">
            Friday, March 20
          </span>
          <span className="rounded-full bg-yellow-50 px-3 py-1.5 border border-yellow-200 font-semibold text-yellow-800">
            ICFC Main Hall
          </span>
        </div>
      </div>

      {/* Center: Important timings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-3">
          <div className="text-sm font-bold text-green-900 mb-2">Eid Prayers</div>
          <div className="space-y-1.5 text-sm text-green-900 leading-6">
            <div>
              1st Prayer: <span className="font-bold">7:30 AM</span>
              <span className="text-gray-600"> — Dr. Omar Reda</span>
            </div>
            <div>
              2nd Prayer: <span className="font-bold">9:00 AM</span>
              <span className="text-gray-600"> — Dr. Khaled Ksaibati</span>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-yellow-50 px-2.5 py-2 text-xs font-medium text-yellow-800 border border-yellow-200">
            Potluck breakfast after <span className="font-bold">2nd prayer only</span>
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-emerald-50 to-white p-3">
          <div className="text-sm font-bold text-green-900 mb-2">Friday & Celebration</div>
          <div className="space-y-1.5 text-sm text-green-900 leading-6">
            <div>
              1st Khutbah: <span className="font-bold">Br. Safwan</span>
              <br />
              <span className="text-gray-600"> @ 12:10</span>
            </div>
            <br />
            <div>
              2nd Khutbah: <span className="font-bold">Br. Tariq</span>
              <br />
              <span className="text-gray-600"> @ 1:10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: celebration then greeting */}
      <div className="flex flex-col items-center justify-center lg:justify-end gap-2">
        <div className="rounded-xl bg-green-200 border border-green-300 px-4 py-2 text-green-900 text-xs md:text-sm font-semibold shadow max-w-xs w-full text-center lg:text-left">
          ICFC Eid Celebration: <br /><span className="font-bold">03/28</span> 
          <span className="text-gray-700">from 10 am to 6 pm</span>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-green-800 to-green-700 px-4 py-4 text-center lg:text-left shadow-md max-w-xs w-full">
          <p className="text-sm md:text-[15px] italic leading-6 text-green-50">
            May the blessings of Eid bring happiness, peace, and barakah to you and your family.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Hero Banner */}
      <RamadanPromoSection />
      <section className="relative bg-white">
      {/* soft brand gradient backdrop */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 0%, #FFD700 0%, transparent 50%), radial-gradient(60% 60% at 80% 0%, #006400 0%, transparent 45%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        {/* Bismillah header */}
        <div className="text-center">

          {/* transliteration as a tasteful headline */}
          <h2
            className="mt-4 text-4xl sm:text-5xl md:text-6xl font-[var(--font-bebas,inherit)] tracking-wide"
            style={{ color: GREEN, lineHeight: 1.05 }}
          >
            Bismillāhir-Raḥmānir-Raḥīm
          </h2>

          {/* Arabic with the new font */}
          <p
            dir="rtl"
            lang="ar"
            className="mt-4 text-3xl sm:text-4xl md:text-[44px] leading-snug font-[var(--font-arabic)]"
            style={{ color: "#0f172a" }}
          >
            بِسْمِ ٱللّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>

          <p className="mt-2 text-[15px] sm:text-base text-neutral-700">
            In the Name of Allah — the Most Compassionate, Most Merciful.
          </p>

          <div
            className="mx-auto my-6 h-1 w-24 rounded-full"
            style={{ backgroundColor: GOLD }}
          />
        </div>

        {/* Verse card */}
        <div className="mx-auto max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-6 md:p-8">
          <p
            dir="rtl"
            lang="ar"
            className="text-2xl md:text-3xl leading-relaxed font-[var(--font-arabic)]"
            style={{ color: "#111827" }}
          >
            {ayah.arabic}
          </p>

          <div className="mt-4 border-t border-neutral-200 pt-4 text-center">
            <p className="text-neutral-700 md:text-lg leading-relaxed" >
              {ayah.translation}
            </p>
            <span className="mt-2 inline-block text-sm font-medium"  style={{ color: GREEN }}>
              {ayah.ref}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-8">
      <span className="mt-2 inline-block text-sm font-medium"  style={{ color: GREEN }}>
              Your Voice. Your Masjid. Your Future
            </span>
            </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
  <a
    href="/modules/registration/membership"
    className="bg-secondary hover:bg-green-600 font-body text-black px-6 py-2 rounded-2xl shadow transition"
  >
    Become A Member
  </a>
</div>


    </section>
      <section className="relative text-center h-[120vh] overflow-hidden">
        {/* Background image with parallax effect */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center will-change-transform"
          style={{
            //backgroundImage: welcomeUrl ? `url(${welcomeUrl})` : undefined,
            backgroundImage: `url(/images/WelcomeICFC.JPG)`,
            backgroundAttachment: 'fixed', // enables parallax
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black opacity-60 z-10" />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-center items-center h-full px-5 text-white">
          <h1 className="text-5xl md:text-6xl font-title text-secondary drop-shadow-md mb-4">
            Welcome to ICFC
          </h1>
          <h3 className="text-5xl md:text-2xl font-heading text-secondary drop-shadow-md mb-4">
            Islamic Center of Fort Collins
          </h3>
          <p className="text-lg md:text-xl font-heading mb-8">
            Serving the Muslim community of Fort Collins
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/modules/prayer-times"
              className="bg-primary hover:bg-green-800 font-body text-white px-6 py-2 rounded-2xl shadow transition"
            >
              View Prayer Times
            </a>
            <a
              href="/about"
              className="bg-secondary hover:bg-yellow-500 text-primary font-body px-6 py-2 rounded-2xl shadow transition"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Mission Section with Fade-in */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="bg-white py-16 px-6 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-heading text-primary mb-10">
          Our Mission
        </h2>
        <div className="max-w-6xl mx-auto grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center">
            <BookOpenIcon className="h-12 w-12 text-secondary mb-4" />
            <h3 className="text-xl font-heading text-gray-800 mb-2">Education</h3>
            <p className="text-gray-600 font-body">
              Offering weekend school, classes, and resources to strengthen Islamic knowledge.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <UsersIcon className="h-12 w-12 text-secondary mb-4" />
            <h3 className="text-xl font-heading text-gray-800 mb-2">Community</h3>
            <p className="text-gray-600 font-body">
              Bringing people together through events, services, and support for all ages.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <HeartIcon className="h-12 w-12 text-secondary mb-4" />
            <h3 className="text-xl font-heading text-gray-800 mb-2">Service</h3>
            <p className="text-gray-600 font-body">
              Supporting the needy, newcomers, and volunteers with care and compassion.
            </p>
          </div>
        </div>
      </motion.section>
       {/* Right: carousel */}
        <div>
          <div className="bg-white py-16 px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-heading text-primary">
          Life at ICFC
        </h2>
        </div>
          <GalleryCarousel album="About" />
        </div>
    </>
  );
}

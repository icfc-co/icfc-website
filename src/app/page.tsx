'use client';
import { useEffect, useRef, useState, Fragment, useMemo } from 'react';
import { BookOpenIcon, UsersIcon, HeartIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { s3ImageService } from '../app/services/s3ImageService';
import GalleryCarousel from "@/components/gallery/GalleryCarousel";
import Link from 'next/link';


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
      {/* Hero Banner */}
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
      <section className="relative text-center h-[100vh] overflow-hidden">
        {/* Background image with parallax effect */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center will-change-transform"
          style={{
            backgroundImage: welcomeUrl ? `url(${welcomeUrl})` : undefined,
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

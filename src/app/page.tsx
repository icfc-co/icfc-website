'use client';
import { useEffect, useRef, useState, Fragment } from 'react';
import { BookOpenIcon, UsersIcon, HeartIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { s3ImageService } from '../app/services/s3ImageService';


export default function HomePage() {

  const [welcomeUrl, setWelcomeUrl] = useState<string | null>(null);

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
      <section className="relative text-center h-[90vh] overflow-hidden">
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
        <div className="relative z-20 flex flex-col justify-center items-center h-full px-4 text-white">
          <h1 className="text-5xl md:text-6xl font-title text-secondary drop-shadow-md mb-4">
            Welcome to ICFC
          </h1>
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
    </>
  );
}

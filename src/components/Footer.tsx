'use client';
import Link from 'next/link';
import { FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="bg-primary text-white font-body">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* ICFC Logo/Intro */}
        <div>
          <h2 className="font-title text-2xl text-secondary mb-2">ICFC</h2>
          <p className="text-sm">
            Islamic Center of Fort Collins — Serving the community with faith, education, and service.
          </p>

          {/* Social Icons */}
          <div className="flex space-x-4 mt-4">
            <a href="https://www.instagram.com/islamic_center_of_fort_collins/?hl=en" target="_blank" rel="noopener noreferrer">
              <FaInstagram className="text-secondary hover:text-white text-xl" />
            </a>
            <a href="https://www.facebook.com/icfcco/" target="_blank" rel="noopener noreferrer">
              <FaFacebookF className="text-secondary hover:text-white text-xl" />
            </a>
            <a href="https://www.youtube.com/@icfcco" target="_blank" rel="noopener noreferrer">
              <FaYoutube className="text-secondary hover:text-white text-xl" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-heading text-lg text-secondary mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/modules/contact">Contact</Link></li>
            <li><Link href="/donate">Donate</Link></li>
            <li><Link href="/login">Login</Link></li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-heading text-lg text-secondary mb-2">Services</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/modules/services/newcomer-support">Newcomer Support</Link></li>
            <li><Link href="/modules/services/ask-imam">Ask Imam</Link></li>
            <li><Link href="/modules/registration/membership">Membership</Link></li>
          </ul>
        </div>

        {/* Contact + Newsletter */}
        <div>
          <h3 className="font-heading text-lg text-secondary mb-2">Contact</h3>
          <p className="text-sm">📧 info@icfc.org</p>
          <p className="text-sm">📞 +1 (970) 221-2425</p>
          <p className="text-sm mt-1">925 West Lake Street, Fort Collins, CO 80521</p>

          {/* Newsletter Form */}
          <form className="mt-4">
            <label className="block text-sm mb-1" htmlFor="newsletter">Subscribe to Newsletter</label>
            <div className="flex">
              <input
                type="email"
                id="newsletter"
                placeholder="Enter your email"
                className="w-full px-2 py-1 rounded-l bg-white text-black text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-secondary hover:bg-yellow-400 text-black font-medium px-3 rounded-r text-sm"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Google Map */}
      <div className="w-full">
        <iframe
          title="ICFC Location"
          src="https://maps.google.com/maps?q=Islamic%20Center%20of%20Fort%20Collins&t=&z=13&ie=UTF8&iwloc=&output=embed"
          className="w-full h-64 border-0"
          loading="lazy"
        ></iframe>
      </div>

      {/* Bottom Bar */}
      <div className="text-center py-4 border-t border-white/20 text-xs">
        &copy; {new Date().getFullYear()} Islamic Center of Fort Collins. All rights reserved.
      </div>
    </footer>
  );
}

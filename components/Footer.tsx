"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useCMS } from '@/context/CMSContext';
import BrandLogo from './BrandLogo';
import {
  getSiteName,
  getSiteTagline,
  getWordmark,
  getContactEmail,
  getContactPhoneDisplay,
  getContactAddress,
  sanitizeAddressDisplay,
  getDefaultSocialLinks,
} from '@/lib/site-defaults';

function FooterSection({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-brand-caramel/30 lg:border-none last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left lg:py-0 lg:cursor-default lg:mb-6"
      >
        <h4 className="font-bold text-lg text-brand-cream">{title}</h4>
        <i className={`ri-arrow-down-s-line text-brand-taupe text-xl transition-transform duration-300 lg:hidden ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0 lg:max-h-full lg:overflow-visible'}`}>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || getSiteName();
  const siteTagline = getSetting('site_tagline') || getSiteTagline();
  const contactEmail = getSetting('contact_email') || getContactEmail();
  const contactPhone = getSetting('contact_phone') || getContactPhoneDisplay();
  const contactWhatsapp = getSetting('contact_whatsapp') || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || getContactPhoneDisplay();
  const contactAddress = sanitizeAddressDisplay(
    getSetting('contact_address') || getContactAddress()
  );
  const wordmark = getSetting('wordmark') || getWordmark();
  const socialDefaults = getDefaultSocialLinks();
  const socialFacebook = getSetting('social_facebook') || socialDefaults.facebook || '';
  const socialInstagram = getSetting('social_instagram') || socialDefaults.instagram;
  const socialTwitter = getSetting('social_twitter') || socialDefaults.twitter || '';
  const socialTiktok = getSetting('social_tiktok') || socialDefaults.tiktok;
  const socialSnapchat = getSetting('social_snapchat') || socialDefaults.snapchat;
  const socialYoutube = getSetting('social_youtube') || socialDefaults.youtube;

  return (
    <footer className="relative mt-8 sm:mt-12 z-0">

      {/* Footer Background Shape */}
      <div className="absolute inset-0 bg-brand-bronze rounded-t-[2rem] sm:rounded-t-[3rem] -z-10 overflow-hidden">
        {/* Decorative elements inside footer bg */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-caramel to-transparent opacity-50"></div>
      </div>

      <div className="text-brand-cream pt-8 pb-6 sm:pt-16 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 lg:gap-12">

            {/* Brand Column */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-6">
              <Link href="/" className="inline-block group" aria-label={`${wordmark} — home`}>
                <BrandLogo
                  height={44}
                  alt={`${wordmark} — home`}
                  className="drop-shadow-lg group-hover:scale-105 transition-transform duration-300 origin-left sm:!h-14"
                />
              </Link>
              <p className="text-brand-cream/70 leading-relaxed text-sm">
                {siteTagline}
                {contactAddress ? <> · {contactAddress}</> : null}
                {contactPhone ? (
                  <>
                    {' · '}
                    {/* "Tel" doubles as a discreet entrance to the admin panel */}
                    <Link href="/admin" className="hover:text-brand-gold transition-colors">Tel</Link>
                    {`: ${contactPhone}`}
                  </>
                ) : null}
                {contactWhatsapp && contactWhatsapp !== contactPhone ? <> · {`WhatsApp: ${contactWhatsapp}`}</> : null}
              </p>

              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-sm text-brand-cream/80 hover:text-brand-gold transition-colors"
                >
                  <i className="ri-mail-line text-base" aria-hidden="true" />
                  <span>{contactEmail}</span>
                </a>
              )}

              <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
                {[
                  { link: socialInstagram, icon: 'ri-instagram-line', label: 'Instagram' },
                  { link: socialYoutube, icon: 'ri-youtube-fill', label: 'YouTube' },
                  { link: socialSnapchat, icon: 'ri-snapchat-fill', label: 'Snapchat' },
                  { link: socialTiktok, icon: 'ri-tiktok-fill', label: 'TikTok' },
                  { link: socialTwitter, icon: 'ri-twitter-x-fill', label: 'X' },
                  { link: socialFacebook, icon: 'ri-facebook-fill', label: 'Facebook' }
                ].map((social, i) => social.link && (
                  <a
                    key={i}
                    href={social.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-cream/10 border border-brand-cream/20 rounded-full flex items-center justify-center text-brand-cream hover:bg-brand-cream hover:text-brand-caramel hover:border-brand-cream transition-all hover:-translate-y-1 text-sm sm:text-base"
                  >
                    <i className={social.icon}></i>
                  </a>
                ))}
                <Link
                  href="/admin/login"
                  aria-label="Admin login"
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-cream/10 border border-brand-cream/20 rounded-full flex items-center justify-center text-brand-cream hover:bg-brand-cream hover:text-brand-caramel hover:border-brand-cream transition-all hover:-translate-y-1 text-sm sm:text-base"
                >
                  <i className="ri-shield-user-line" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Links Sections */}
            <div className="lg:col-span-3 grid grid-cols-3 md:grid-cols-3 gap-4 sm:gap-8 lg:gap-12 pl-0 lg:pl-12">

              <div className="space-y-3 sm:space-y-6">
                <h4 className="font-serif text-base sm:text-xl font-bold text-brand-cream">Shop</h4>
                <ul className="space-y-2 sm:space-y-3 text-brand-cream/70 text-xs sm:text-sm">
                  <li><Link href="/shop" className="hover:text-brand-gold transition-colors">All Products</Link></li>
                  <li><Link href="/categories" className="hover:text-brand-gold transition-colors">Collections</Link></li>
                  <li><Link href="/shop?sort=newest" className="hover:text-brand-gold transition-colors">New Arrivals</Link></li>
                  <li><Link href="/shop?sort=bestsellers" className="hover:text-brand-gold transition-colors">Best Sellers</Link></li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-6">
                <h4 className="font-serif text-base sm:text-xl font-bold text-brand-cream">Support</h4>
                <ul className="space-y-2 sm:space-y-3 text-brand-cream/70 text-xs sm:text-sm">
                  <li><Link href="/contact" className="hover:text-brand-gold transition-colors">Contact Us</Link></li>
                  <li><Link href="/order-tracking" className="hover:text-brand-gold transition-colors">Track Order</Link></li>
                  <li><Link href="/shipping" className="hover:text-brand-gold transition-colors">Shipping & Delivery</Link></li>
                  <li><Link href="/returns" className="hover:text-brand-gold transition-colors">Returns & Exchange</Link></li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-6">
                <h4 className="font-serif text-base sm:text-xl font-bold text-brand-cream">Company</h4>
                <ul className="space-y-2 sm:space-y-3 text-brand-cream/70 text-xs sm:text-sm">
                  <li><Link href="/about" className="hover:text-brand-gold transition-colors">Our Story</Link></li>
                  <li><Link href="/privacy" className="hover:text-brand-gold transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-brand-gold transition-colors">Terms of Service</Link></li>
                </ul>
              </div>

            </div>
          </div>

          <div className="border-t border-brand-cream/15 mt-6 sm:mt-12 pt-4 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-xs text-brand-cream/50">
            <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            <div className="flex gap-4 opacity-40">
              <i className="ri-visa-line text-2xl"></i>
              <i className="ri-mastercard-line text-2xl"></i>
              <i className="ri-paypal-line text-2xl"></i>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

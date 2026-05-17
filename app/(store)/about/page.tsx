'use client';

import Link from 'next/link';
import { useCMS } from '@/context/CMSContext';
import PageHero from '@/components/PageHero';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AboutPage() {
  usePageTitle('Our Story');
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove';

  const values = [
    {
      icon: 'ri-verified-badge-line',
      title: 'Verified Quality',
      description: 'We focus on products you can trust — carefully sourced and checked before they reach you.'
    },
    {
      icon: 'ri-money-dollar-circle-line',
      title: 'Fair Prices',
      description: 'Competitive wholesale and retail pricing for resellers and individual customers.'
    },
    {
      icon: 'ri-global-line',
      title: 'Curated Selection',
      description: 'A handpicked catalogue updated regularly so you find what you need.'
    },
    {
      icon: 'ri-truck-line',
      title: 'Reliable Delivery',
      description: 'Fast fulfilment where we operate — see Shipping for zones and timeframes.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        title="More Than Just A Brand"
        subtitle={`${siteName} — curated jewelry, wholesale and retail, based in Adenta.`}
        backgroundImage="/page-hero-1.png"
      />

      {/* Who We Are - Hero section */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">Who We Are</h2>
              <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
                <p>
                  At <strong>{siteName}</strong>, we believe great products should be easy to buy online. We offer retail and wholesale options with a focus on quality and service.
                </p>
                <p>
                  We&apos;ve built a reputation for quality, trust, and service. Products are sourced with care so you can shop with confidence.
                </p>
                <p>
                  Whether you shop online or pick up locally, we aim for a smooth experience — delivery options and timelines are listed on our Shipping page.
                </p>
                <p>
                  Our goal is straightforward: great products, clear communication, and support when you need it.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative bg-gray-100 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt={siteName}
                  className="w-full h-full object-contain p-8"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="our-story" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 p-10 rounded-3xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <i className="ri-store-2-line text-3xl text-white"></i>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Everything in One Place</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Our catalogue spans the categories we carry — updated regularly with new arrivals for wholesale and retail customers.
              </p>
            </div>
            <div className="bg-amber-50 p-10 rounded-3xl border border-amber-100">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <i className="ri-hand-heart-line text-3xl text-white"></i>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Empowering Resellers</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                We support small businesses and resellers with competitive bulk pricing and wholesale options where available.
              </p>
            </div>
          </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Shop With Us?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Trusted by customers and resellers who value quality and service.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <i className={`${value.icon} text-2xl text-blue-700`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-900 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to find your next treasure?</h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl mx-auto">
            Browse our jewelry catalogue — wholesale and retail. Visit us in Adenta or message us on WhatsApp for orders and bespoke requests.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-white text-blue-900 px-10 py-5 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
          >
            Start Shopping
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}

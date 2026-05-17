'use client';

import Image from 'next/image';
import Link from 'next/link';
import AnimatedSection from './AnimatedSection';

export default function WhoWeAreSection() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <AnimatedSection className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">
              Who We Are
            </h2>
            <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
              <p>
                <strong>{process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove'}</strong> is your online destination for curated jewelry — retail and wholesale. Based in Adenta, we ship across Ghana with a focus on quality, fair pricing, and a smooth shopping experience for every customer.
              </p>
              <p>
                Whether you're stocking up for your business or shopping a single statement piece, we handpick every item so you can buy with confidence.
              </p>
              <div className="pt-4">
                <Link 
                  href="/about" 
                  className="inline-flex items-center text-blue-800 font-medium hover:text-blue-900 transition-colors group"
                >
                  <span className="border-b border-transparent group-hover:border-blue-900 transition-colors">Read Our Full Story</span>
                  <i className="ri-arrow-right-line ml-2 transition-transform group-hover:translate-x-1"></i>
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Image Content */}
          <AnimatedSection className="order-1 lg:order-2 relative" delay={200}>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl relative group bg-white">
              <Image
                src="/about.jpeg"
                alt={`${process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove'} — Our story`}
                fill
                className="object-contain transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {/* Decorative Overlay */}
              <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-transparent transition-colors duration-300"></div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </section>
  );
}

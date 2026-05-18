"use client";

import { useState, useEffect } from 'react';
import { useCMS } from '@/context/CMSContext';
import { supabase } from '@/lib/supabase';
import PageHero from '@/components/PageHero';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import {
  sanitizeAddressDisplay,
  getDefaultSocialLinks,
  getSocialInstagramHandle,
  getSocialYoutubeHandle,
  getSocialSnapchatHandle,
} from '@/lib/site-defaults';

export default function ContactPage() {
  usePageTitle('Contact Us');
  const { getSetting } = useCMS();
  const [pageContent, setPageContent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { getToken, verifying } = useRecaptcha();

  useEffect(() => {
    async function fetchContactContent() {
      const { data } = await supabase
        .from('cms_content')
        .select('*')
        .eq('section', 'contact')
        .eq('block_key', 'main')
        .single();

      if (data) {
        setPageContent(data);
      }
    }
    fetchContactContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    // reCAPTCHA verification
    const isHuman = (await getToken('contact')).ok;
    if (!isHuman) {
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      // Store in Supabase
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
        });

      if (error) {
        // Table might not exist, still show success
        console.log('Note: contact_submissions table may not exist');
      }

      // Send Contact Notification
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          payload: formData
        })
      }).catch(err => console.error('Contact notification error:', err));

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get contact details from CMS settings
  const contactEmail = getSetting('contact_email') || process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@example.com';
  const contactPhone = getSetting('contact_phone') || process.env.NEXT_PUBLIC_CONTACT_PHONE || '';
  const contactWhatsapp = getSetting('contact_whatsapp') || process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || process.env.NEXT_PUBLIC_CONTACT_PHONE || '';
  const contactAddress = sanitizeAddressDisplay(
    getSetting('contact_address') || process.env.NEXT_PUBLIC_CONTACT_ADDRESS
  );
  const social = getDefaultSocialLinks();
  const igHandle = getSocialInstagramHandle();
  const ytHandle = getSocialYoutubeHandle();
  const scHandle = getSocialSnapchatHandle();

  const heroTitle = pageContent?.title || 'Get In Touch';
  const heroSubtitle = pageContent?.subtitle || 'Have a question or need assistance?';
  const heroContent = pageContent?.content || 'Our friendly team is here to help. Reach out through any of our contact channels.';

  const waNumber = (contactWhatsapp || '').replace(/[^0-9]/g, '');
  const waLink = waNumber ? (waNumber.startsWith('0') ? `https://wa.me/233${waNumber.slice(1)}` : `https://wa.me/${waNumber}`) : '#';
  const telNumber = (contactPhone || '').replace(/\s/g, '');
  const telLink = telNumber ? (telNumber.startsWith('0') ? `tel:+233${telNumber.slice(1)}` : `tel:${telNumber}`) : '#';

  const contactMethods = [
    contactPhone
      ? {
          icon: 'ri-phone-line',
          title: 'Call Us',
          value: contactPhone,
          link: telLink,
          description: 'Mon–Sat 9:00 AM – 7:00 PM (example hours — update in CMS).',
        }
      : null,
    {
      icon: 'ri-mail-line',
      title: 'Email Us',
      value: contactEmail,
      link: `mailto:${contactEmail}`,
      description: 'We respond within 24 hours',
    },
    contactWhatsapp
      ? {
          icon: 'ri-whatsapp-line',
          title: 'WhatsApp',
          value: contactWhatsapp,
          link: waLink,
          description: 'Chat with us instantly',
        }
      : null,
    contactAddress
      ? {
          icon: 'ri-map-pin-line',
          title: 'Visit Us',
          value: contactAddress,
          link: 'https://maps.google.com',
          description: contactAddress,
        }
      : null,
    {
      icon: 'ri-instagram-line',
      title: 'Instagram',
      value: `@${igHandle.replace(/^@/, '')}`,
      link: social.instagram,
      description: 'Follow us for drops & behind the scenes',
    },
    {
      icon: 'ri-youtube-fill',
      title: 'YouTube',
      value: ytHandle.startsWith('@') ? ytHandle : `@${ytHandle}`,
      link: social.youtube,
      description: 'Tutorials, launches & more',
    },
    {
      icon: 'ri-snapchat-fill',
      title: 'Snapchat',
      value: scHandle,
      link: social.snapchat,
      description: 'Add us on Snapchat',
    },
  ].filter(Boolean) as Array<{
    icon: string;
    title: string;
    value: string;
    link: string;
    description: string;
  }>;

  const faqs = [
    {
      question: 'What are your delivery times?',
      answer: 'Standard delivery takes 2-5 business days within Ghana. Express delivery is available for Accra and Kumasi. We package every jewelry order with care to keep it safe in transit.'
    },
    {
      question: 'Do you offer international shipping?',
      answer: 'Currently, we ship within Ghana only. We handle all logistics so you simply order and receive your jewelry.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept MOMO, Instant Bank Transfer, Cash (in store only), and Visa Card. Please note we do not accept payment on delivery.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        title="Get In Touch"
        subtitle="Have a question? We're here to help. Mon–Sat 9:00 AM – 7:00 PM. Closed Sundays."
        backgroundImage="/page-hero-3.png"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, index) => (
            <a
              key={index}
              href={method.link}
              target={method.link.startsWith('http') ? '_blank' : '_self'}
              rel={method.link.startsWith('http') ? 'noopener noreferrer' : ''}
              className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-lg hover:border-brand-caramel/40 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-brand-caramel/25 rounded-full flex items-center justify-center mb-4">
                <i className={`${method.icon} text-2xl text-brand-bronze`}></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{method.title}</h3>
              <p className="text-brand-bronze font-medium mb-1">{method.value}</p>
              <p className="text-sm text-gray-500">{method.description}</p>
            </a>
          ))}
        </div>


        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
            <p className="text-gray-600 mb-8">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>

            <form id="contactForm" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-caramel focus:border-transparent text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-caramel focus:border-transparent text-sm"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-caramel focus:border-transparent text-sm"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-caramel focus:border-transparent text-sm"
                  placeholder="Order inquiry, product question, etc."
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  maxLength={500}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-caramel focus:border-transparent resize-none text-sm"
                  placeholder="Tell us how we can help you..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">{formData.message.length}/500 characters</p>
              </div>

              {submitStatus === 'success' && (
                <div className="bg-brand-ice border border-brand-caramel/40 text-brand-bronze px-4 py-3 rounded-xl">
                  <i className="ri-check-line mr-2"></i>
                  Message sent successfully! We'll respond within 24 hours.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <i className="ri-error-warning-line mr-2"></i>
                  Failed to send message. Please try again or contact us directly.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || verifying}
                className="w-full bg-brand-bronze text-white py-4 rounded-xl font-medium hover:bg-brand-caramel transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {isSubmitting || verifying ? (verifying ? 'Verifying...' : 'Sending...') : 'Send Message'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Quick Answers</h2>
            <p className="text-gray-600 mb-8">
              Find answers to common questions before reaching out
            </p>

            <div className="space-y-4 mb-12">
              {faqs.map((faq, index) => (
                <details key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                  <summary className="px-6 py-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors">
                    {faq.question}
                  </summary>
                  <div className="px-6 pb-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>

            <div className="bg-gradient-to-br from-brand-caramel to-brand-bronze p-8 rounded-2xl text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <i className="ri-customer-service-2-line text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3">Need Immediate Help?</h3>
              <p className="text-brand-cream/85 mb-6 leading-relaxed">
                Our customer support hours are listed above. For urgent matters, use WhatsApp or phone if configured.
              </p>
              {waNumber ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-brand-bronze px-6 py-3 rounded-full font-medium hover:bg-brand-cream transition-colors whitespace-nowrap"
                >
                  <i className="ri-whatsapp-line text-xl"></i>
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Visit Our Store</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Prefer to shop in person? Visit our store. Our knowledgeable staff will be happy to assist you with product selection and answer any questions.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <i className="ri-map-pin-2-line text-brand-bronze"></i>
                <span>{contactAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ri-time-line text-brand-bronze"></i>
                <span>Mon–Sat: 9:00 AM – 7:00 PM. Closed Sundays.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

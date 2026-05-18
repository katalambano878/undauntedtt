'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MiniCart from './MiniCart';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import { getWordmark } from '@/lib/site-defaults';
import AnnouncementBar from './AnnouncementBar';
import BrandLogo from './BrandLogo';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || (process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove');
  const wordmark = getWordmark();

  useEffect(() => {
    // Wishlist logic
    const updateWishlistCount = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlistCount(wishlist.length);
    };

    updateWishlistCount();
    window.addEventListener('wishlistUpdated', updateWishlistCount);

    // Auth logic
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('wishlistUpdated', updateWishlistCount);
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <AnnouncementBar />

      <header className="bg-brand-cream/95 backdrop-blur-sm sticky top-0 z-50 border-b border-brand-taupe/30 transition-all duration-300">
        <div className="safe-area-top" />
        <nav aria-label="Main navigation" className="relative">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-20 grid grid-cols-[auto_1fr_auto] items-center gap-4">

              {/* Left: Mobile Menu Trigger (Mobile) & Logo */}
              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden p-2 -ml-2 text-brand-ink hover:text-brand-caramel transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <i className="ri-menu-line text-2xl"></i>
                </button>
                <Link
                  href="/"
                  className="hidden sm:flex items-center select-none min-w-0"
                  aria-label={`${wordmark} — home`}
                >
                  <BrandLogo height={32} priority className="sm:!h-10" alt={`${wordmark} — home`} />
                </Link>
              </div>

              {/* Center: Navigation Links (Desktop) */}
              <div className="hidden lg:flex items-center justify-center space-x-12">
                {[
                  { label: 'Shop', href: '/shop' },
                  { label: 'Categories', href: '/categories' },
                  { label: 'About', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group relative py-2 text-sm uppercase tracking-widest font-medium text-brand-ink transition-colors hover:text-brand-caramel"
                  >
                    {link.label}
                    <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-brand-bronze transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </Link>
                ))}
              </div>

              {/* Right: Icons */}
              <div className="flex items-center justify-end space-x-2 sm:space-x-4">
                <button
                  className="p-2 text-brand-ink hover:text-brand-caramel transition-transform hover:scale-105"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Search"
                >
                  <i className="ri-search-line text-xl"></i>
                </button>

                <Link
                  href="/wishlist"
                  className="p-2 text-brand-ink hover:text-brand-caramel transition-transform hover:scale-105 relative hidden sm:block"
                  aria-label="Wishlist"
                >
                  <i className="ri-heart-line text-xl"></i>
                  {wishlistCount > 0 && (
                    <span className="absolute top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-bronze text-[10px] font-bold text-brand-cream">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                {user ? (
                  <Link
                    href="/account"
                    className="p-2 text-brand-ink hover:text-brand-caramel transition-transform hover:scale-105 hidden sm:block"
                    aria-label="Account"
                  >
                    <i className="ri-user-line text-xl"></i>
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    className="p-2 text-brand-ink hover:text-brand-caramel transition-transform hover:scale-105 hidden sm:block"
                    aria-label="Login"
                  >
                    <i className="ri-user-line text-xl"></i>
                  </Link>
                )}

                <div className="relative">
                  <button
                    className="p-2 text-brand-ink hover:text-brand-caramel transition-transform hover:scale-105"
                    onClick={() => setIsCartOpen(!isCartOpen)}
                    aria-label="Cart"
                  >
                    <i className="ri-shopping-bag-line text-xl"></i>
                    {cartCount > 0 && (
                      <span className="absolute top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand-bronze text-[10px] font-bold text-brand-cream">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
                </div>
              </div>

            </div>
          </div>
        </nav>
      </header>

      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Search Products</h3>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for products..."
                    className="w-full px-4 py-3 pr-12 border border-brand-taupe rounded-lg focus:ring-2 focus:ring-brand-caramel focus:border-brand-caramel text-base"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-brand-bronze hover:text-brand-caramel"
                  >
                    <i className="ri-search-line text-xl"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )
      }

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 bottom-0 w-4/5 max-w-xs bg-brand-cream shadow-xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-brand-taupe/30 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={`${wordmark} — home`}
              >
                <BrandLogo height={28} alt={wordmark} />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-brand-ink/60 hover:text-brand-caramel"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'Shop', href: '/shop' },
                { label: 'Categories', href: '/categories' },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 text-lg font-medium text-brand-ink hover:bg-brand-cream hover:text-brand-caramel rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-brand-taupe/30 my-2"></div>
              {[
                { label: 'Track Order', href: '/order-tracking' },
                { label: 'Wishlist', href: '/wishlist' },
                { label: 'My Account', href: '/account' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 text-base font-medium text-brand-ink/70 hover:bg-brand-cream hover:text-brand-ink rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-brand-taupe/30">
              <p className="text-xs text-brand-ink/50 text-center">
                &copy; {new Date().getFullYear()} {siteName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
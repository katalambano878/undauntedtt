'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '@/context/CartContext';

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { cart, removeFromCart, updateQuantity, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const panel = (
    <>
      <div
        className="fixed inset-0 bg-gray-900/50 z-[80] transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[90] flex flex-col animate-slide-in-right"
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            Shopping Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <i className="ri-close-line text-2xl text-gray-700"></i>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-full mb-4">
              <i className="ri-shopping-cart-line text-5xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add items to get started</p>
            <Link
              href="/shop"
              onClick={onClose}
              className="px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li
                    key={`${item.id}-${item.variant ?? 'default'}`}
                    className="flex gap-4 bg-gray-50 rounded-lg p-4"
                  >
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image || '/placeholder-product.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (el.src.endsWith('/placeholder-product.svg')) return;
                          el.src = '/placeholder-product.svg';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.name}</h3>
                      {item.variant ? (
                        <p className="text-xs text-gray-600 mb-2">Variant: {item.variant}</p>
                      ) : null}

                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          GH₵{Number(item.price).toFixed(2)}
                        </span>

                        <div className="flex items-center border border-gray-300 rounded bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.variant)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {item.quantity <= (item.moq || 1) ? (
                              <i className="ri-delete-bin-line text-red-500"></i>
                            ) : (
                              <i className="ri-subtract-line text-gray-700"></i>
                            )}
                          </button>
                          <span className="w-10 text-center font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variant)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                            disabled={item.quantity >= item.maxStock}
                          >
                            <i className="ri-add-line text-gray-700"></i>
                          </button>
                        </div>
                      </div>
                      {item.quantity >= item.maxStock ? (
                        <p className="text-xs text-brand-dark mt-1">Max stock reached</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id, item.variant)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors flex-shrink-0 cursor-pointer self-start"
                      aria-label={`Remove ${item.name}`}
                    >
                      <i className="ri-delete-bin-line text-red-600"></i>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 font-medium">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">GH₵{subtotal.toFixed(2)}</span>
              </div>

              <p className="text-xs text-gray-500 mb-3">Shipping calculated at checkout</p>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="block w-full py-2.5 border border-gray-900 text-gray-900 text-center rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap cursor-pointer"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full py-2.5 bg-brand text-white text-center rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap cursor-pointer"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );

  return createPortal(panel, document.body);
}

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface SiteSettings {
    site_name: string;
    site_tagline: string;
    site_logo: string;
    contact_email: string;
    contact_phone: string;
    contact_whatsapp: string;
    contact_address: string;
    social_facebook: string;
    social_instagram: string;
    social_twitter: string;
    social_tiktok: string;
    social_snapchat: string;
    social_youtube: string;
    primary_color: string;
    secondary_color: string;
    currency: string;
    currency_symbol: string;
    [key: string]: string;
}

interface CMSContent {
    id: string;
    section: string;
    block_key: string;
    title: string | null;
    subtitle: string | null;
    content: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    metadata: Record<string, any>;
    is_active: boolean;
}

interface Banner {
    id: string;
    name: string;
    type: string;
    title: string | null;
    subtitle: string | null;
    image_url: string | null;
    background_color: string;
    text_color: string;
    button_text: string | null;
    button_url: string | null;
    is_active: boolean;
    position: string;
    start_date: string | null;
    end_date: string | null;
}

interface CMSContextType {
    settings: SiteSettings;
    content: CMSContent[];
    banners: Banner[];
    loading: boolean;
    getContent: (section: string, blockKey: string) => CMSContent | undefined;
    getSetting: (key: string) => string;
    getActiveBanners: (position?: string) => Banner[];
    refreshCMS: () => Promise<void>;
}

const defaultSettings: SiteSettings = {
    site_name: process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove',
    site_tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Curated jewelry from Adenta, Ghana',
    site_logo: '/logo.png',
    contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@undauntedtreasuretrove.com',
    contact_phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '0550244386',
    contact_whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || process.env.NEXT_PUBLIC_CONTACT_PHONE || '0550244386',
    contact_address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Adenta, Greater Accra, Ghana',
    social_facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || '',
    social_instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || 'https://www.instagram.com/undaunted_tt/',
    social_twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '',
    social_tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || 'https://www.tiktok.com/@undaunted_tt',
    social_snapchat: process.env.NEXT_PUBLIC_SOCIAL_SNAPCHAT || 'https://www.snapchat.com/add/ab_nah',
    social_youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'GHS',
    currency_symbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'GH₵',
};

const CMSContext = createContext<CMSContextType>({
    settings: defaultSettings,
    content: [],
    banners: [],
    loading: true,
    getContent: () => undefined,
    getSetting: () => '',
    getActiveBanners: () => [],
    refreshCMS: async () => { },
});

export function CMSProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>({
        site_name: process.env.NEXT_PUBLIC_SITE_NAME || 'Undaunted Treasure Trove',
        site_tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Curated jewelry from Adenta, Ghana',
        site_logo: '/logo.png',
        contact_email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@undauntedtreasuretrove.com',
        contact_phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '0550244386',
        contact_whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || process.env.NEXT_PUBLIC_CONTACT_PHONE || '0550244386',
        contact_address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || 'Adenta, Greater Accra, Ghana',
        social_facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || '',
        social_instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || 'https://www.instagram.com/undaunted_tt/',
        social_twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '',
        social_tiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || 'https://www.tiktok.com/@undaunted_tt',
        social_snapchat: process.env.NEXT_PUBLIC_SOCIAL_SNAPCHAT || 'https://www.snapchat.com/add/ab_nah',
        social_youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || '',
        primary_color: '#2563eb',
        secondary_color: '#1e40af',
        currency: process.env.NEXT_PUBLIC_CURRENCY || 'GHS',
        currency_symbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'GH₵',
    });
    const [content, setContent] = useState<CMSContent[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(false);

    // CMS Fetching Logic Removed - Content is now managed in code.
    const fetchCMSData = async () => { };

    // Initial load handled by state defaults
    useEffect(() => {
    }, []);

    const getContent = (section: string, blockKey: string): CMSContent | undefined => {
        return content.find(c => c.section === section && c.block_key === blockKey);
    };

    const getSetting = (key: string): string => {
        return settings[key] || defaultSettings[key] || '';
    };

    const getActiveBanners = (position?: string): Banner[] => {
        const now = new Date();
        return banners.filter(b => {
            if (position && b.position !== position) return false;
            if (b.start_date && new Date(b.start_date) > now) return false;
            if (b.end_date && new Date(b.end_date) < now) return false;
            return b.is_active;
        });
    };

    return (
        <CMSContext.Provider
            value={{
                settings,
                content,
                banners,
                loading,
                getContent,
                getSetting,
                getActiveBanners,
                refreshCMS: fetchCMSData,
            }}
        >
            {children}
        </CMSContext.Provider>
    );
}

export function useCMS() {
    const context = useContext(CMSContext);
    if (!context) {
        throw new Error('useCMS must be used within a CMSProvider');
    }
    return context;
}

export default CMSContext;

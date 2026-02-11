import { createContext, useContext, useState, ReactNode } from 'react';
import type { Offer } from '../data/offers';
import { offers as initialOffers } from '../data/offers';

interface OffersContextType {
  offers: Offer[];
  addOffer: (offer: Omit<Offer, 'id' | 'leads' | 'rating' | 'reviews'>) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
  getOfferById: (id: string) => Offer | undefined;
  getOffersByCompany: (companyId: string) => Offer[];
  getOffersByCategory: (categoryId: string) => Offer[];
  getFeaturedOffers: (companyId?: string) => Offer[];
  getOffersByCompanyAndCategory: (companyId: string, categoryId: string) => Offer[];
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

export function OffersProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);

  const generateId = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  };

  const addOffer = (offerData: Omit<Offer, 'id' | 'leads' | 'rating' | 'reviews'>) => {
    const newOffer: Offer = {
      ...offerData,
      id: generateId(offerData.title),
      leads: 0,
      rating: 0,
      reviews: 0,
    };
    setOffers(prev => [...prev, newOffer]);
    return newOffer;
  };

  const updateOffer = (id: string, offerData: Partial<Offer>) => {
    setOffers(prev =>
      prev.map(offer =>
        offer.id === id ? { ...offer, ...offerData } : offer
      )
    );
  };

  const deleteOffer = (id: string) => {
    setOffers(prev => prev.filter(offer => offer.id !== id));
  };

  const getOfferById = (id: string): Offer | undefined => {
    return offers.find(offer => offer.id === id);
  };

  const getOffersByCompany = (companyId: string): Offer[] => {
    return offers.filter(offer => offer.companyId === companyId);
  };

  const getOffersByCategory = (categoryId: string): Offer[] => {
    return offers.filter(offer => offer.categoryId === categoryId);
  };

  const getFeaturedOffers = (companyId?: string): Offer[] => {
    let filtered = offers.filter(offer => offer.featured);
    if (companyId) {
      filtered = filtered.filter(offer => offer.companyId === companyId);
    }
    return filtered;
  };

  const getOffersByCompanyAndCategory = (companyId: string, categoryId: string): Offer[] => {
    return offers.filter(offer => offer.companyId === companyId && offer.categoryId === categoryId);
  };

  return (
    <OffersContext.Provider
      value={{
        offers,
        addOffer,
        updateOffer,
        deleteOffer,
        getOfferById,
        getOffersByCompany,
        getOffersByCategory,
        getFeaturedOffers,
        getOffersByCompanyAndCategory,
      }}
    >
      {children}
    </OffersContext.Provider>
  );
}

export function useOffers() {
  const context = useContext(OffersContext);
  if (context === undefined) {
    throw new Error('useOffers must be used within an OffersProvider');
  }
  return context;
}

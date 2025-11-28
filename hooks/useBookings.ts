
import { useState, useEffect, useCallback } from 'react';
import type { Booking } from '../types';

const BOOKINGS_STORAGE_KEY = 'nailSpaBookings';

const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const stored = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading bookings from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) {
      console.error("Error saving bookings to localStorage", error);
    }
  }, [bookings]);

  const addBooking = useCallback((booking: Omit<Booking, 'id'>) => {
    const newBooking: Booking = {
      ...booking,
      id: 'booking-' + new Date().toISOString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(), // Capture creation time
    };
    setBookings(prev => [newBooking, ...prev]);
  }, []);

  const updateBooking = useCallback((updatedBooking: Booking) => {
    setBookings(prev =>
      prev.map(b => (b.id === updatedBooking.id ? updatedBooking : b))
    );
  }, []);

  const deleteBooking = useCallback((id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  }, []);

  return { bookings, addBooking, updateBooking, deleteBooking };
};

export default useBookings;

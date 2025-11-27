
import { useState, useEffect, useCallback } from 'react';
import type { Bill } from '../types';

const BIllS_STORAGE_KEY = 'nailSpaBills';

const useBills = () => {
  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const storedBills = localStorage.getItem(BIllS_STORAGE_KEY);
      return storedBills ? JSON.parse(storedBills) : [];
    } catch (error) {
      console.error("Error reading bills from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BIllS_STORAGE_KEY, JSON.stringify(bills));
    } catch (error) {
      console.error("Error saving bills to localStorage", error);
    }
  }, [bills]);

  const addBill = useCallback((bill: Omit<Bill, 'id'>) => {
    const newBill: Bill = {
      ...bill,
      id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
    };
    setBills(prevBills => [newBill, ...prevBills]);
  }, []);

  const updateBill = useCallback((updatedBill: Bill) => {
    setBills(prevBills =>
      prevBills.map(bill => (bill.id === updatedBill.id ? updatedBill : bill))
    );
  }, []);

  const deleteBill = useCallback((billId: string) => {
    setBills(prevBills => prevBills.filter(bill => bill.id !== billId));
  }, []);

  const restoreBills = useCallback((billsToRestore: Bill[]) => {
    setBills(billsToRestore);
  }, []);

  return { bills, addBill, updateBill, deleteBill, restoreBills };
};

export default useBills;
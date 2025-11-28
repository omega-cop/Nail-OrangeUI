
import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '../types';

const CUSTOMERS_STORAGE_KEY = 'nailSpaCustomers';

const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading customers from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    } catch (error) {
      console.error("Error saving customers to localStorage", error);
    }
  }, [customers]);

  const addCustomer = useCallback((customerData: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: 'cust-' + Date.now() + Math.random().toString(36).substr(2, 9),
    };
    setCustomers(prev => [...prev, newCustomer]);
  }, []);

  const updateCustomer = useCallback((updatedCustomer: Customer) => {
    setCustomers(prev =>
      prev.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  return { customers, addCustomer, updateCustomer, deleteCustomer };
};

export default useCustomers;


import { useState, useEffect, useCallback } from 'react';
import type { PredefinedService, ServiceCategory } from '../types';

const SERVICES_STORAGE_KEY = 'nailSpaServices';
const CATEGORIES_STORAGE_KEY = 'nailSpaCategories';

const generateId = () => new Date().toISOString() + Math.random().toString(36).substr(2, 9);

// Initial Categories
const initialCategories: ServiceCategory[] = [
    { id: 'cat-care', name: 'Chăm Sóc Móng' },
    { id: 'cat-paint', name: 'Sơn' },
    { id: 'cat-build', name: 'Đắp Móng' },
    { id: 'cat-design', name: 'Design' },
];

// Initial Services mapped to Categories
const initialServices: Omit<PredefinedService, 'id'>[] = [
  // CHĂM SÓC MÓNG
  { name: 'Cắt da', price: 30000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-care' },
  { name: 'Phá Gel/Bột', price: 20000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-care' },
  // SƠN
  { name: 'Sơn Gel', price: 80000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-paint' },
  { name: 'Sơn Thạch', price: 80000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-paint' },
  { name: 'Sơn Nhũ', price: 110000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-paint' },
  { name: 'Sơn Mắt Mèo', price: 120000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-paint' },
  // ĐẮP MÓNG
  { name: 'Úp Gel', price: 180000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-build' },
  { name: 'Úp Keo', price: 80000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-build' },
  { 
      name: 'Đắp Gel/Bột', 
      price: 0, 
      priceType: 'variable',
      variants: [
          { id: 'var-1', name: 'Móng ngắn', price: 200000 },
          { id: 'var-2', name: 'Móng dài', price: 250000 }
      ],
      allowQuantity: false, 
      categoryId: 'cat-build' 
  },
  { name: 'Fill Gel/Bột', price: 150000, priceType: 'fixed', allowQuantity: false, categoryId: 'cat-build' },
  // DESIGN
  { name: 'Design - Tráng gương (1 ngón)', price: 10000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Ombre (1 ngón)', price: 15000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Sơn nhũ (1 ngón)', price: 5000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Ẩn nhũ/cừ/hoa khô (1 ngón)', price: 10000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Thủ nổi/Hoạ nổi (1 ngón)', price: 10000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Charm', price: 10000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Đá (1 viên)', price: 5000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
  { name: 'Design - Vẽ hoạt hình (1 ngón)', price: 10000, priceType: 'fixed', allowQuantity: true, categoryId: 'cat-design' },
];

const useServices = () => {
  // --- Categories State ---
  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
      try {
          const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
          return stored ? JSON.parse(stored) : initialCategories;
      } catch (error) {
          return initialCategories;
      }
  });

  // --- Services State ---
  const [services, setServices] = useState<PredefinedService[]>(() => {
    try {
      const storedServices = localStorage.getItem(SERVICES_STORAGE_KEY);
      if (storedServices) {
        return JSON.parse(storedServices);
      }
      
      // If first time, map initial services with generated IDs
      const servicesWithIds = initialServices.map(service => ({
        ...service,
        id: generateId(),
      }));
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(servicesWithIds));
      return servicesWithIds;

    } catch (error) {
      console.error("Error reading services from localStorage", error);
      return [];
    }
  });

  // --- Effects for Saving ---
  useEffect(() => {
    try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
        console.error("Error saving categories", error);
    }
  }, [categories]);

  useEffect(() => {
    try {
        localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    } catch (error) {
        console.error("Error saving services", error);
    }
  }, [services]);

  // --- Service Actions ---
  const addService = useCallback((service: Omit<PredefinedService, 'id'>) => {
    const newService: PredefinedService = {
      ...service,
      id: generateId(),
    };
    setServices(prevServices => [newService, ...prevServices]);
  }, []);

  const updateService = useCallback((updatedService: PredefinedService) => {
    setServices(prevServices =>
      prevServices.map(service => (service.id === updatedService.id ? updatedService : service))
    );
  }, []);

  const deleteService = useCallback((serviceId: string) => {
    setServices(prevServices => prevServices.filter(service => service.id !== serviceId));
  }, []);
  
  const restoreServices = useCallback((servicesToRestore: PredefinedService[]) => {
    setServices(servicesToRestore);
  }, []);

  // --- Category Actions ---
  const addCategory = useCallback((categoryName: string) => {
      const newCategory: ServiceCategory = {
          id: generateId(),
          name: categoryName
      };
      setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((updatedCategory: ServiceCategory) => {
      setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      // Optional: Decide what to do with services in this category. 
      // Current behavior: They remain but categoryId points to nothing.
  }, []);

  const restoreCategories = useCallback((categoriesToRestore: ServiceCategory[]) => {
      setCategories(categoriesToRestore);
  }, []);


  return { 
      services, addService, updateService, deleteService, restoreServices,
      categories, addCategory, updateCategory, deleteCategory, restoreCategories
  };
};

export default useServices;

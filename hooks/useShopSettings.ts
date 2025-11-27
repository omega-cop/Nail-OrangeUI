
import { useState, useEffect } from 'react';

const SHOP_SETTINGS_KEY = 'nailSpaShopSettings';

export const useShopSettings = () => {
  const [shopName, setShopName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SHOP_SETTINGS_KEY);
      return stored ? JSON.parse(stored).shopName || 'Nail Spa' : 'Nail Spa';
    } catch {
      return 'Nail Spa';
    }
  });

  const [billTheme, setBillTheme] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SHOP_SETTINGS_KEY);
      return stored ? JSON.parse(stored).billTheme || 'default' : 'default';
    } catch {
      return 'default';
    }
  });

  const updateShopName = (name: string) => {
    setShopName(name);
  };

  const updateBillTheme = (theme: string) => {
    setBillTheme(theme);
  }

  useEffect(() => {
    localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify({ shopName, billTheme }));
  }, [shopName, billTheme]);

  return { shopName, updateShopName, billTheme, updateBillTheme };
};

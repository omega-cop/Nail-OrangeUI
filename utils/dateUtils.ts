export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatCompactCurrency = (amount: number): string => {
  if (amount >= 1000000000) {
    return (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + 'k';
  }
  return amount.toString();
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateTime = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  });
};

export const formatSpecificDateTime = (isoString: string): string => {
    return formatDateTime(isoString);
};

export const isToday = (isoString: string): boolean => {
  const date = new Date(isoString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const isWithinThisWeek = (isoString: string): boolean => {
    const date = new Date(isoString);
    const today = new Date();
    
    // Get current day number, converting Sun (0) to 7 for Monday-based week
    const currentDay = today.getDay() || 7; 
    
    // Set to Monday of this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    // Set to End of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return date >= startOfWeek && date < endOfWeek;
};

export const isWithinThisMonth = (isoString: string): boolean => {
    const date = new Date(isoString);
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

export const getBillDateCategory = (isoString: string): string => {
    const date = new Date(isoString);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const billDate = new Date(date);
    billDate.setHours(0,0,0,0);

    const diffTime = today.getTime() - billDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7 && diffDays > 1) return `${diffDays} ngày trước`;
    
    return `Tháng ${billDate.getMonth() + 1}/${billDate.getFullYear()}`;
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Bill, ServiceItem, PredefinedService, ServiceCategory, Booking } from '../types';
import { TrashIcon, ChevronDownIcon, ChevronUpIcon } from './icons';
import { getTodayDateString, formatCurrency, getCurrentTimeString } from '../utils/dateUtils';

interface BillEditorProps {
  bill: Bill | null;
  onSave: (bill: Bill) => void;
  onCancel: () => void;
  services: PredefinedService[];
  categories?: ServiceCategory[];
  customerNames: string[];
  isBooking?: boolean;
}

const BillEditor: React.FC<BillEditorProps> = ({ bill, onSave, onCancel, services, categories, customerNames, isBooking = false }) => {
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [note, setNote] = useState('');
  
  // Discount states
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');

  // Collapsible State
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(true);

  useEffect(() => {
    if (bill) {
      setCustomerName(bill.customerName);
      const billDate = new Date(bill.date);
      setDate(billDate.toISOString().split('T')[0]);
      const hours = String(billDate.getHours()).padStart(2, '0');
      const minutes = String(billDate.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
      
      const enrichedItems = bill.items.map(item => ({
        ...item,
        quantity: item.quantity || 1,
      }));
      setItems(enrichedItems);

      setDiscountValue(bill.discountValue || 0);
      setDiscountType(bill.discountType || 'amount');
      setNote((bill as any).note || ''); // Cast to any to access optional note property safely
      setIsCustomerInfoOpen(false); 
    } else {
      setCustomerName('');
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setItems([{ id: `temp-${Date.now()}`, serviceId: '', name: '', price: 0, quantity: 1 }]);
      setDiscountValue(0);
      setDiscountType('amount');
      setNote('');
      setIsCustomerInfoOpen(true);
    }
  }, [bill]);

  const updateSuggestions = (value: string) => {
    if (value) {
        const filteredSuggestions = customerNames.filter(name =>
            name.toLowerCase().includes(value.toLowerCase()) && name.toLowerCase() !== value.toLowerCase()
        );
        setSuggestions(filteredSuggestions);
        setIsSuggestionsVisible(filteredSuggestions.length > 0);
    } else {
        setSuggestions([]);
        setIsSuggestionsVisible(false);
    }
  };

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerName(value);
    updateSuggestions(value);
  };

  const handleSuggestionClick = (name: string) => {
    setCustomerName(name);
    setSuggestions([]);
    setIsSuggestionsVisible(false);
  };

  const handleItemChange = (index: number, selectedServiceId: string) => {
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    const newItems = [...items];
    const item = { ...newItems[index] };
    item.serviceId = service.id;
    item.name = service.name;
    item.quantity = 1;
    
    // Handle Variable Price
    if (service.priceType === 'variable' && service.variants && service.variants.length > 0) {
        const defaultVariant = service.variants[0];
        item.price = defaultVariant.price;
        item.variantName = defaultVariant.name;
    } else {
        item.price = service.price;
        item.variantName = undefined;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleVariantChange = (index: number, variantName: string) => {
      const newItems = [...items];
      const item = { ...newItems[index] };
      const service = services.find(s => s.id === item.serviceId);
      
      if (service && service.variants) {
          const variant = service.variants.find(v => v.name === variantName);
          if (variant) {
              item.price = variant.price * item.quantity;
              item.variantName = variant.name;
              newItems[index] = item;
              setItems(newItems);
          }
      }
  };

  const handleQuantityChange = (index: number, value: string) => {
    // Allow empty string to represent 0 temporarily for UX
    const newQuantity = value === '' ? 0 : parseInt(value);
    
    const newItems = [...items];
    const item = { ...newItems[index] };
    const service = services.find(s => s.id === item.serviceId);
    
    if (service) {
        item.quantity = isNaN(newQuantity) ? 0 : newQuantity;
        
        let unitPrice = service.price;
        if (service.priceType === 'variable' && service.variants) {
            const variant = service.variants.find(v => v.name === item.variantName);
            if (variant) unitPrice = variant.price;
        }

        item.price = unitPrice * item.quantity;
        newItems[index] = item;
        setItems(newItems);
    }
  };

  const handleQuantityBlur = (index: number) => {
    const item = items[index];
    if (!item.quantity || item.quantity < 1) {
        // Reset to 1 if empty or 0 on blur
        handleQuantityChange(index, "1");
    }
  }

  const addItem = () => {
    setItems([...items, { id: `temp-${Date.now()}`, serviceId: '', name: '', price: 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const calculateSubtotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);

  const calculateDiscountAmount = useCallback(() => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percent') {
        return Math.round(subtotal * (discountValue / 100));
    }
    return discountValue;
  }, [calculateSubtotal, discountType, discountValue]);

  const calculateTotal = useCallback(() => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscountAmount();
    return Math.max(0, subtotal - discount);
  }, [calculateSubtotal, calculateDiscountAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalItems = items.filter(item => item.serviceId);

    if (!customerName.trim()) {
        alert("Vui lòng điền tên khách hàng.");
        setIsCustomerInfoOpen(true);
        return;
    }

    if (finalItems.length === 0) {
        alert("Vui lòng thêm ít nhất một dịch vụ hợp lệ vào hóa đơn.");
        return;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const finalDate = new Date(date);
    finalDate.setHours(hours, minutes, 0, 0);

    // Validation for Booking: Cannot select past time
    if (isBooking) {
        const now = new Date();
        // Allow a small buffer (e.g., 1 minute) or compare strictly
        // Only validate if we are changing the time or creating new
        // For simplicity, we warn if the target time is in past relative to NOW
        if (finalDate < now) {
            // Check if it's just an edit of an existing booking where time wasn't changed
            // If it's a new booking, definitely block
            // If it's an edit, we might allow if they didn't touch the time? 
            // Current req: "không cho chọn giờ ở quá khứ (tính từ thời điểm tạo lịch)" -> Applies to creation or rescheduling.
            // If editing a past booking, maybe we should warn? 
            // For now, let's keep the strict check but maybe a bit loose (1 min buffer)
            const diff = now.getTime() - finalDate.getTime();
            if (diff > 60000) { // 1 minute tolerance
                 alert("Thời gian đặt lịch không thể ở trong quá khứ!");
                 return;
            }
        }
    }

    const finalTotal = calculateTotal();

    const billData = {
      id: bill?.id || '',
      customerName: customerName.trim(),
      date: finalDate.toISOString(),
      items: finalItems,
      total: finalTotal,
      discountValue: discountValue,
      discountType: discountType,
      note: note.trim()
    };

    // Preserve 'createdAt' if it exists on the original object (for Bookings)
    // This is crucial for the BookingProgress bar logic.
    if (isBooking && bill && (bill as Booking).createdAt) {
        (billData as any).createdAt = (bill as Booking).createdAt;
    }

    onSave(billData as Bill);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsSuggestionsVisible(false);
    }, 150);
  };

  // Sort services alphabetically for better UX
  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  const serviceOptions = useMemo(() => {
      if (!categories) {
          return sortedServices.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
          ));
      }

      const groupedServices: Record<string, PredefinedService[]> = {};
      categories.forEach(cat => groupedServices[cat.id] = []);
      groupedServices['uncategorized'] = [];

      sortedServices.forEach(service => {
          if (service.categoryId && groupedServices[service.categoryId]) {
              groupedServices[service.categoryId].push(service);
          } else {
              groupedServices['uncategorized'].push(service);
          }
      });

      return (
          <>
              <option value="" disabled>-- Chọn dịch vụ --</option>
              {categories.map(cat => {
                  const catServices = groupedServices[cat.id];
                  if (!catServices || catServices.length === 0) return null;
                  return (
                      <optgroup key={cat.id} label={cat.name}>
                          {catServices.map(service => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                          ))}
                      </optgroup>
                  );
              })}
              {groupedServices['uncategorized'].length > 0 && (
                  <optgroup label="Khác">
                      {groupedServices['uncategorized'].map(service => (
                          <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                  </optgroup>
              )}
          </>
      );
  }, [categories, sortedServices]);

  const inputBaseClasses = "w-full px-4 py-3 border-none rounded-2xl transition-all duration-200 outline-none text-text-main placeholder:text-gray-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-card space-y-6">
      <h2 className="text-2xl font-bold text-center text-text-main">
          {isBooking 
            ? (bill ? 'Chỉnh Sửa Lịch Hẹn' : 'Tạo Lịch Hẹn Mới') 
            : (bill ? 'Chỉnh Sửa Hóa Đơn' : 'Tạo Hóa Đơn Mới')
          }
      </h2>
      
      {/* Customer Info Section - Collapsible */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <button 
            type="button"
            onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
            className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
              <span className="font-bold text-text-main">Thông Tin Khách Hàng</span>
              {isCustomerInfoOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-500"/> : <ChevronDownIcon className="w-5 h-5 text-gray-500"/>}
          </button>
          
          {isCustomerInfoOpen && (
            <div className="p-4 space-y-4 bg-white">
                <div className="relative" onBlur={handleBlur}>
                <label htmlFor="customerName" className="block text-sm font-medium text-text-main mb-1 pl-1">Tên Khách Hàng</label>
                <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={handleCustomerNameChange}
                    onFocus={() => updateSuggestions(customerName)}
                    autoComplete="off"
                    required
                    className={inputBaseClasses}
                    placeholder="ví dụ: Nguyễn Thị A"
                />
                {isSuggestionsVisible && suggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-100 rounded-2xl shadow-lg max-h-48 overflow-y-auto mt-2 p-1">
                    {suggestions.map((name, index) => (
                        <li
                        key={index}
                        onClick={() => handleSuggestionClick(name)}
                        className="px-4 py-2 hover:bg-pink-50 rounded-xl cursor-pointer text-sm"
                        >
                        {name}
                        </li>
                    ))}
                    </ul>
                )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label htmlFor="date" className="block text-sm font-medium text-text-main mb-1 pl-1">Ngày</label>
                    <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                        required
                        min={isBooking ? getTodayDateString() : undefined}
                        className={`${inputBaseClasses} [color-scheme:light] cursor-pointer`}
                    />
                    </div>
                    <div>
                    <label htmlFor="time" className="block text-sm font-medium text-text-main mb-1 pl-1">Giờ</label>
                    <input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                        required
                        className={`${inputBaseClasses} [color-scheme:light] cursor-pointer`}
                    />
                    </div>
                </div>
                <div>
                    <label htmlFor="note" className="block text-sm font-medium text-text-main mb-1 pl-1">Ghi chú</label>
                    <textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={`${inputBaseClasses} min-h-[80px] resize-y`}
                        placeholder="Ghi chú thêm về khách hàng hoặc dịch vụ..."
                    />
                </div>
            </div>
          )}
          {!isCustomerInfoOpen && customerName && (
              <div className="px-4 py-3 bg-white text-sm text-gray-500 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-semibold text-text-main">{customerName}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs">{date} - {time}</span>
              </div>
          )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-text-main border-b border-gray-100 pb-2">Dịch Vụ</h3>
        {items.map((item, index) => {
            const serviceDef = services.find(s => s.id === item.serviceId);
            const allowQuantity = serviceDef?.allowQuantity;
            const isVariablePrice = serviceDef?.priceType === 'variable' && serviceDef.variants && serviceDef.variants.length > 0;

            return (
              <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-pink-100 transition-colors">
                {/* Mobile Layout: Grid/Stack */}
                <div className="grid grid-cols-1 gap-3 sm:hidden">
                    {/* Row 1: Service Selection */}
                    <select
                      value={item.serviceId}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      required
                      className="w-full px-4 py-3 border-none rounded-xl bg-white text-text-main shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {serviceOptions}
                    </select>
                    
                    {/* Row 2: Variant Selection (if applicable) */}
                    {isVariablePrice && (
                        <select 
                            value={item.variantName || ''} 
                            onChange={(e) => handleVariantChange(index, e.target.value)}
                            className="w-full px-4 py-3 border-none rounded-xl bg-white text-text-main text-sm shadow-sm"
                        >
                            {serviceDef?.variants?.map(v => (
                                <option key={v.id} value={v.name}>{v.name} ({formatCurrency(v.price)})</option>
                            ))}
                        </select>
                    )}

                    {/* Row 3: Controls */}
                    <div className="flex items-center gap-3">
                        {allowQuantity && (
                            <div className="flex items-center w-24 shrink-0 bg-white rounded-xl shadow-sm px-2">
                                <span className="text-xs text-gray-400 mr-1">SL:</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                    onBlur={() => handleQuantityBlur(index)}
                                    className="w-full py-2 border-none bg-transparent text-center text-text-main outline-none"
                                />
                            </div>
                        )}
                        <div className="flex-grow px-4 py-3 border-none rounded-xl bg-white text-right text-text-main font-bold shadow-sm">
                            {formatCurrency(item.price)}
                        </div>
                        <button type="button" onClick={() => removeItem(index)} className="p-3 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl shadow-sm transition-colors shrink-0">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Desktop Layout: Row */}
                <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <div className="flex-grow min-w-[180px] flex flex-col gap-2">
                        <select
                        value={item.serviceId}
                        onChange={(e) => handleItemChange(index, e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border-none rounded-xl bg-white text-text-main shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                        {serviceOptions}
                        </select>
                        {isVariablePrice && (
                            <select 
                                value={item.variantName || ''} 
                                onChange={(e) => handleVariantChange(index, e.target.value)}
                                className="w-full px-3 py-1.5 border-none rounded-lg bg-white/50 text-text-main text-xs"
                            >
                                {serviceDef?.variants?.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    
                    {allowQuantity && (
                         <div className="flex items-center w-20 shrink-0 bg-white rounded-xl shadow-sm px-2 h-[42px]">
                            <span className="text-xs text-gray-400 mr-1">SL:</span>
                            <input
                                type="number"
                                min="1"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                onBlur={() => handleQuantityBlur(index)}
                                className="w-full py-1 border-none bg-transparent text-center text-text-main outline-none"
                            />
                        </div>
                    )}

                    <div className="w-32 px-4 py-2.5 border-none rounded-xl bg-white text-right text-text-main font-bold shadow-sm h-[42px] flex items-center justify-end">
                      {formatCurrency(item.price)}
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors bg-white shadow-sm h-[42px]">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>
            );
        })}
        <button type="button" onClick={addItem} className="w-full mt-2 px-4 py-3 text-primary border-2 border-dashed border-primary/30 rounded-2xl hover:bg-pink-50 hover:border-primary transition-colors font-semibold flex items-center justify-center gap-2">
          <span className="text-xl">+</span> Thêm Dịch Vụ
        </button>
      </div>

      {/* Discount Section */}
      <div className="pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-3 mb-3">
            <label className="text-sm font-medium text-text-main">Giảm giá:</label>
            <div className="flex rounded-xl shadow-sm w-full sm:w-auto overflow-hidden border border-gray-200">
                <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-grow sm:flex-grow-0 w-full sm:w-28 px-4 py-2 border-none focus:ring-0 outline-none text-right bg-white text-text-main font-semibold"
                />
                <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                    className="px-3 py-2 border-l border-gray-200 bg-gray-50 focus:ring-0 outline-none text-sm font-medium"
                >
                    <option value="amount">VNĐ</option>
                    <option value="percent">%</option>
                </select>
            </div>
          </div>
          
          <div className="flex justify-end items-center gap-4 text-sm text-gray-500">
             <span>Tạm tính: {formatCurrency(calculateSubtotal())}</span>
             {discountValue > 0 && (
                 <span className="text-red-500 font-medium">
                     - {formatCurrency(calculateDiscountAmount())}
                 </span>
             )}
          </div>
          
          <div className="flex justify-end mt-4">
              <div className="bg-pink-50 px-6 py-4 rounded-2xl text-right">
                  <span className="block text-xs text-primary font-bold uppercase tracking-wider mb-1">Tổng cộng</span>
                  <span className="text-3xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
              </div>
          </div>
      </div>

      <div className="flex justify-end space-x-3 sm:space-x-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-text-main rounded-2xl hover:bg-gray-200 transition-colors font-bold">Hủy</button>
        <button type="submit" className="flex-1 sm:flex-none px-8 py-3 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30 font-bold">
            {isBooking ? 'Lưu Lịch Hẹn' : 'Lưu Hóa Đơn'}
        </button>
      </div>
    </form>
  );
};

export default BillEditor;

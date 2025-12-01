
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Bill, Booking, View } from './types';
import useBills from './hooks/useBills';
import useServices from './hooks/useServices';
import useBookings from './hooks/useBookings';
import useCustomers from './hooks/useCustomers';
import { useShopSettings } from './hooks/useShopSettings';
import BillList from './components/BillList';
import BillEditor from './components/BillEditor';
import Dashboard from './components/Dashboard';
import ServiceManager from './components/ServiceManager';
import CustomerList from './components/CustomerList';
import RevenueCalendar from './components/RevenueCalendar';
import { ListBulletIcon, TagIcon, HomeIcon, UsersIcon, CloudArrowDownIcon, CloudArrowUpIcon, Cog6ToothIcon, SwatchIcon, BellIcon, ArrowRightOnRectangleIcon, CheckIcon, TrashIcon } from './components/icons';
import { formatSpecificDateTime } from './utils/dateUtils';

const NOTIFIED_BOOKINGS_KEY = 'nailSpaNotifiedBookings';

const App: React.FC = () => {
  const { bills, addBill, updateBill, deleteBill, restoreBills } = useBills();
  const { 
      services, addService, updateService, deleteService, restoreServices,
      categories, addCategory, updateCategory, deleteCategory, restoreCategories, reorderCategories
  } = useServices();
  const { bookings, addBooking, updateBooking, deleteBooking } = useBookings();
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { shopName, updateShopName, billTheme, updateBillTheme } = useShopSettings();
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  
  // State for Date Navigation (Calendar -> List)
  const [targetDate, setTargetDate] = useState<string | null>(null);

  // State for Shop Name Editor
  const [isEditingShopName, setIsEditingShopName] = useState(false);
  const [tempShopName, setTempShopName] = useState('');

  // State for Theme Selector
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Scroll Aware Navigation State
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // --- Notification / Booking Check Logic ---
  // Using a queue for multiple concurrent notifications
  const [dueBookingQueue, setDueBookingQueue] = useState<Booking[]>([]);
  
  // Persist notified IDs to localStorage so we don't spam users on reload, 
  // but we CAN catch up on missed notifications.
  const [notifiedBookingIds, setNotifiedBookingIds] = useState<Set<string>>(() => {
      try {
          const stored = localStorage.getItem(NOTIFIED_BOOKINGS_KEY);
          return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
          return new Set();
      }
  });

  // Effect to save notified IDs
  useEffect(() => {
      localStorage.setItem(NOTIFIED_BOOKINGS_KEY, JSON.stringify([...notifiedBookingIds]));
  }, [notifiedBookingIds]);
  
  // Snooze Logic
  const [isSnoozeMode, setIsSnoozeMode] = useState(false);
  const [snoozeDuration, setSnoozeDuration] = useState<number | null>(null);

  // Persist Tab Selection in BillList
  const [activeListTab, setActiveListTab] = useState<'bills' | 'bookings'>('bills');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const createModeRef = useRef<'bill' | 'booking'>('bill');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle Scroll for Menu Visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down & past threshold -> Hide
        setIsNavVisible(false);
      } else {
        // Scrolling up -> Show
        setIsNavVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Booking Timer Logic (Catch-up Mechanism) ---
  useEffect(() => {
      const checkBookings = () => {
          const now = new Date();
          const newDueBookings: Booking[] = [];
          
          bookings.forEach(booking => {
              const bookingDate = new Date(booking.date);
              
              // CATCH-UP LOGIC:
              // 1. Check if booking time is NOW or IN THE PAST (bookingDate <= now)
              // 2. Check if we haven't notified yet (!notifiedBookingIds.has)
              // 3. Optional: Only catch up within last 24 hours to avoid notifying ancient bookings
              const isDue = bookingDate <= now;
              const isRecent = bookingDate.getTime() > (now.getTime() - 24 * 60 * 60 * 1000); // Within last 24h

              if (isDue && isRecent && !notifiedBookingIds.has(booking.id)) {
                   // Check if already in queue to avoid duplicates in state
                   setDueBookingQueue(prevQueue => {
                       if (prevQueue.some(b => b.id === booking.id)) return prevQueue;
                       return [...prevQueue, booking];
                   });
                   
                   setNotifiedBookingIds(prev => {
                       const next = new Set(prev);
                       next.add(booking.id);
                       return next;
                   });
              }
          });
      };

      // Check immediately on mount (to handle "opening the app" scenario)
      checkBookings();

      const intervalId = setInterval(checkBookings, 5000); // Check every 5 seconds
      return () => clearInterval(intervalId);
  }, [bookings, notifiedBookingIds]);


  const handleDownloadData = useCallback(() => {
    try {
      const billsData = localStorage.getItem('nailSpaBills') || '[]';
      const servicesData = localStorage.getItem('nailSpaServices') || '[]';
      const categoriesData = localStorage.getItem('nailSpaCategories') || '[]';
      const settingsData = localStorage.getItem('nailSpaShopSettings') || '{"shopName": "Nail Spa"}';
      const bookingsData = localStorage.getItem('nailSpaBookings') || '[]';
      const customersData = localStorage.getItem('nailSpaCustomers') || '[]';
      
      const backupData = {
        bills: JSON.parse(billsData),
        services: JSON.parse(servicesData),
        categories: JSON.parse(categoriesData),
        settings: JSON.parse(settingsData),
        bookings: JSON.parse(bookingsData),
        customers: JSON.parse(customersData)
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      a.href = url;
      a.download = `nail-spa-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsSettingsMenuOpen(false);
    } catch (error) {
      console.error("Failed to download data", error);
      alert("Đã xảy ra lỗi khi tải xuống dữ liệu.");
    }
  }, []);

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (Array.isArray(data.bills) && Array.isArray(data.services)) {
          if (window.confirm('Thao tác này sẽ ghi đè lên toàn bộ dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục không?')) {
            restoreBills(data.bills);
            restoreServices(data.services);
            if (data.categories && Array.isArray(data.categories)) {
                restoreCategories(data.categories);
            }
            if (data.settings) {
                if (data.settings.shopName) updateShopName(data.settings.shopName);
                if (data.settings.billTheme) updateBillTheme(data.settings.billTheme);
            }
            // Note: Currently restore functions for bookings/customers are not exposed from hooks but data structure supports it.
            // For a production app, we should add restoreBookings and restoreCustomers to hooks.
            alert('Dữ liệu đã được khôi phục thành công.');
            window.location.reload(); 
          }
        } else {
          alert('Tệp không hợp lệ. Vui lòng đảm bảo tệp chứa dữ liệu hóa đơn và dịch vụ.');
        }
      } catch (error) {
        console.error("Failed to upload data", error);
        alert('Đã xảy ra lỗi khi đọc tệp. Tệp có thể bị hỏng hoặc không đúng định dạng.');
      } finally {
        setIsSettingsMenuOpen(false);
        if(event.target) {
            event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Handlers for Shop Name Editing
  const openShopNameEditor = () => {
    setTempShopName(shopName);
    setIsEditingShopName(true);
  };

  const saveShopName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempShopName.trim()) {
      updateShopName(tempShopName.trim());
      setIsEditingShopName(false);
    }
  };

  // Themes Data
  const themes = [
    { id: 'default', name: 'Mặc định (Hồng)', color: 'bg-pink-100 border-pink-300' },
    { id: 'blue', name: 'Chuyên nghiệp', color: 'bg-blue-100 border-blue-300' },
    { id: 'gold', name: 'Sang trọng', color: 'bg-stone-800 border-yellow-500' },
    { id: 'green', name: 'Tươi mới', color: 'bg-emerald-100 border-emerald-300' },
    { id: 'orange', name: 'Năng động', color: 'bg-orange-100 border-orange-300' },
  ];

  const handleSelectTheme = (themeId: string) => {
    updateBillTheme(themeId);
    setIsThemeModalOpen(false);
    setIsSettingsMenuOpen(false);
  };

  const customerNames = useMemo(() => {
    const names = bills.map(bill => bill.customerName.trim());
    const bookingNames = bookings.map(b => b.customerName.trim());
    // Also include manually added customer names
    const manualNames = customers.map(c => c.name.trim());
    return [...new Set([...names, ...bookingNames, ...manualNames])].filter(name => name); 
  }, [bills, bookings, customers]);

  // --- Bill/Booking Handlers ---

  const handleEditBill = useCallback((bill: Bill) => {
    setSelectedBill(bill);
    setSelectedBooking(null);
    setCurrentView('editor');
    setActiveListTab('bills'); // Ensure we return to bills tab
  }, []);

  const handleEditBooking = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedBill(null);
    setCurrentView('editor');
    setActiveListTab('bookings'); // Ensure we return to bookings tab
  }, []);
  
  const handleAddNewBill = () => {
      createModeRef.current = 'bill';
      setActiveListTab('bills'); // Prepare tab for return
      setSelectedBill(null);
      setSelectedBooking(null);
      setCurrentView('editor');
  };

  const handleAddNewBooking = () => {
      createModeRef.current = 'booking';
      setActiveListTab('bookings'); // Prepare tab for return
      setSelectedBill(null);
      setSelectedBooking(null);
      setCurrentView('editor');
  };

  // Actual Save Handler
  const onSaveItem = (item: Bill) => {
      if (selectedBooking) {
          updateBooking(item as Booking); // Cast to Booking to fix TS error
      } else if (selectedBill) {
          updateBill(item);
      } else {
           // Creating New
           if (createModeRef.current === 'booking') {
               addBooking(item as Booking); // Cast to Booking to fix TS error
           } else {
               addBill(item);
           }
      }
      setCurrentView('list');
      setSelectedBill(null);
      setSelectedBooking(null);
  };

  const handleCancel = useCallback(() => {
    setCurrentView(bills.length > 0 || bookings.length > 0 ? 'list' : 'dashboard');
    setSelectedBill(null);
    setSelectedBooking(null);
  }, [bills.length, bookings.length]);

  const handleConvertToBill = (booking: Booking) => {
      if (window.confirm(`Xác nhận chuyển lịch hẹn của "${booking.customerName}" thành hóa đơn?`)) {
          const { id, ...billData } = booking;
          const currentTimestamp = new Date().toISOString();
          const newBill = {
              ...billData,
              date: currentTimestamp
          };
          addBill(newBill); 
          deleteBooking(booking.id);
          alert("Đã chuyển thành hóa đơn thành công!");
      }
  };

  // --- Cascade Delete Customer Logic ---
  const handleFullCustomerDelete = (customer: { id?: string, name: string }) => {
      // 1. Delete all bills for this customer
      const customerNameNormalized = customer.name.toLowerCase().trim();
      
      bills.forEach(b => {
          if (b.customerName.toLowerCase().trim() === customerNameNormalized) {
              deleteBill(b.id);
          }
      });

      // 2. Delete all bookings for this customer
      bookings.forEach(b => {
          if (b.customerName.toLowerCase().trim() === customerNameNormalized) {
              deleteBooking(b.id);
          }
      });

      // 3. Delete profile if exists
      if (customer.id) {
          deleteCustomer(customer.id);
      }
  };

  // --- Notification / Queue Handlers ---
  const currentDueBooking = dueBookingQueue.length > 0 ? dueBookingQueue[0] : null;

  const processNextBooking = () => {
      setDueBookingQueue(prev => prev.slice(1));
      // Reset states
      setIsSnoozeMode(false);
      setSnoozeDuration(null);
      setShowDeleteConfirmForDue(false);
  };

  const confirmDueBooking = () => {
      if (currentDueBooking) {
          const { id, ...billData } = currentDueBooking;
          // Set to current time when converting
          const newBill = { ...billData, date: new Date().toISOString() };
          addBill(newBill);
          deleteBooking(currentDueBooking.id);
          processNextBooking();
      }
  };

  const openSnoozeOptions = () => {
      setIsSnoozeMode(true);
  };

  const cancelSnooze = () => {
      setIsSnoozeMode(false);
      setSnoozeDuration(null);
  };

  const confirmSnooze = () => {
      if (currentDueBooking && snoozeDuration) {
          const newDate = new Date(new Date().getTime() + snoozeDuration * 60000);
          const updatedBooking = { ...currentDueBooking, date: newDate.toISOString() };
          
          updateBooking(updatedBooking);
          // When snoozing, we update the booking time.
          // CRITICAL: We must remove it from `notifiedBookingIds` so the "Catch-up" logic
          // picks it up again when the new time arrives.
          setNotifiedBookingIds(prev => {
              const next = new Set(prev);
              next.delete(currentDueBooking.id);
              return next;
          });

          processNextBooking();
      }
  };
  
  const [showDeleteConfirmForDue, setShowDeleteConfirmForDue] = useState(false);

  const deleteDueBooking = () => {
      if (currentDueBooking) {
          deleteBooking(currentDueBooking.id);
          processNextBooking();
      }
  };

  // Determine if we are editing a booking
  // If selectedBooking is set, it's definitely a booking.
  // If selectedBill is set, it's definitely NOT a booking (even if it came from one).
  // If both are null, we rely on createModeRef.
  const isBookingEditor = selectedBooking !== null || (!selectedBill && createModeRef.current === 'booking');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard bills={bills} onViewRevenueHistory={() => setCurrentView('revenue-calendar')} />;
      case 'editor':
        return <BillEditor 
            bill={selectedBill || selectedBooking} 
            onSave={onSaveItem} 
            onCancel={handleCancel} 
            services={services} 
            customerNames={customerNames} 
            customers={customers} // Pass full customers list
            categories={categories}
            isBooking={isBookingEditor}
        />;
      case 'services':
        return <ServiceManager 
            services={services} 
            addService={addService} 
            updateService={updateService} 
            deleteService={deleteService}
            categories={categories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            reorderCategories={reorderCategories}
        />;
      case 'customers':
        return <CustomerList 
          bills={bills} 
          customers={customers}
          onAddCustomer={addCustomer}
          onUpdateCustomer={updateCustomer}
          onDeleteCustomer={handleFullCustomerDelete}
        />;
      case 'revenue-calendar':
        return <RevenueCalendar bills={bills} onBack={() => setCurrentView('dashboard')} onSelectDate={(date) => { setTargetDate(date); setCurrentView('list'); }} />;
      case 'list':
      default:
        return <BillList 
            bills={bills} 
            onEdit={handleEditBill} 
            onDelete={deleteBill} 
            onAddNew={handleAddNewBill}
            shopName={shopName} 
            initialDate={targetDate}
            onClearTargetDate={() => setTargetDate(null)}
            
            bookings={bookings}
            onEditBooking={handleEditBooking}
            onDeleteBooking={deleteBooking}
            onConvertToBill={handleConvertToBill}
            onAddNewBooking={handleAddNewBooking}
            initialTab={activeListTab}
            onTabChange={setActiveListTab} // Allow child to update parent tab state
        />;
    }
  };

  const NavItem: React.FC<{ view: View; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center w-full p-1 transition-all duration-300 ${
        currentView === view ? 'text-primary' : 'text-gray-400 hover:text-primary/70'
      }`}
    >
      <div className={`p-1.5 rounded-2xl transition-all duration-300 ${currentView === view ? 'bg-pink-50 transform scale-105' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium mt-1 transition-all ${currentView === view ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen font-sans text-text-main flex flex-col selection:bg-primary/20">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />
      
      {/* Shop Name Edit Modal */}
      {isEditingShopName && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-3xl shadow-floating w-full max-w-sm">
            <h2 className="text-xl font-bold text-text-main mb-4">Đổi Tên Tiệm</h2>
            <form onSubmit={saveShopName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light mb-1">Tên Tiệm Mới</label>
                <input 
                  type="text" 
                  value={tempShopName}
                  onChange={(e) => setTempShopName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gray-50 text-text-main placeholder-gray-400"
                  placeholder="Nhập tên tiệm của bạn"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditingShopName(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-text-main bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Theme Selection Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-6 rounded-3xl shadow-floating w-full max-w-sm">
             <h2 className="text-xl font-bold text-text-main mb-4">Chọn Giao Diện Hóa Đơn</h2>
             <div className="grid grid-cols-1 gap-3">
               {themes.map(theme => (
                 <button
                   key={theme.id}
                   onClick={() => handleSelectTheme(theme.id)}
                   className={`flex items-center p-3 rounded-2xl border-2 transition-all ${
                     billTheme === theme.id ? 'border-primary bg-pink-50' : 'border-transparent hover:bg-gray-50'
                   }`}
                 >
                   <div className={`w-8 h-8 rounded-full border ${theme.color} mr-3 shadow-sm`}></div>
                   <span className={`font-medium ${billTheme === theme.id ? 'text-primary' : 'text-text-main'}`}>
                     {theme.name}
                   </span>
                 </button>
               ))}
             </div>
             <div className="mt-6 text-right">
                <button 
                  onClick={() => setIsThemeModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-text-main bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  Đóng
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Booking Due Notification Popup */}
      {currentDueBooking && !showDeleteConfirmForDue && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
              <div className="bg-white p-6 rounded-3xl shadow-floating w-full max-w-sm border-2 border-primary/20 relative">
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-white rounded-full p-2 shadow-lg">
                      <div className="w-full h-full bg-pink-100 rounded-full flex items-center justify-center animate-bounce-short">
                          <BellIcon className="w-8 h-8 text-primary" />
                      </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                      <h3 className="text-xl font-bold text-text-main">Nhắc Hẹn</h3>
                      <p className="text-gray-500 mt-2 text-sm">
                          Lịch hẹn của <strong className="text-primary text-base">{currentDueBooking.customerName}</strong>
                      </p>
                      <p className="font-semibold text-text-main text-lg mt-1">
                          {formatSpecificDateTime(currentDueBooking.date)}
                      </p>
                      {dueBookingQueue.length > 1 && (
                          <p className="text-xs text-gray-400 mt-2">
                              (Còn {dueBookingQueue.length - 1} thông báo khác)
                          </p>
                      )}
                  </div>

                  {!isSnoozeMode ? (
                      <div className="mt-8 flex flex-col gap-3">
                          <button 
                              onClick={confirmDueBooking}
                              className="w-full py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                          >
                              <ArrowRightOnRectangleIcon className="w-5 h-5"/>
                              Chuyển sang hóa đơn
                          </button>
                          <button 
                              onClick={openSnoozeOptions}
                              className="w-full py-3 bg-white border-2 border-gray-100 text-text-main rounded-2xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                          >
                              <CheckIcon className="w-5 h-5 text-gray-400"/>
                              Giữ lịch hẹn
                          </button>
                          <button 
                              onClick={() => setShowDeleteConfirmForDue(true)}
                              className="w-full py-3 bg-white text-red-500 rounded-2xl font-bold hover:bg-red-50 flex items-center justify-center gap-2"
                          >
                              <TrashIcon className="w-5 h-5"/>
                              Xóa lịch hẹn
                          </button>
                      </div>
                  ) : (
                      <div className="mt-6">
                           <p className="text-center text-sm font-semibold text-text-light mb-3">Chờ thêm:</p>
                           <div className="grid grid-cols-2 gap-3 mb-6">
                               {[5, 10, 15, 30].map(mins => (
                                   <button
                                      key={mins}
                                      onClick={() => setSnoozeDuration(mins)}
                                      className={`py-2 rounded-xl border-2 font-bold transition-all ${snoozeDuration === mins ? 'border-primary bg-pink-50 text-primary' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                                   >
                                       {mins} phút
                                   </button>
                               ))}
                           </div>
                           <div className="flex gap-3">
                                <button 
                                    onClick={cancelSnooze}
                                    className="flex-1 py-3 bg-gray-100 text-text-main rounded-2xl font-bold hover:bg-gray-200"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={confirmSnooze}
                                    disabled={!snoozeDuration}
                                    className={`flex-1 py-3 rounded-2xl font-bold text-white transition-all shadow-lg ${snoozeDuration ? 'bg-primary hover:bg-primary-hover shadow-primary/30' : 'bg-gray-300 cursor-not-allowed'}`}
                                >
                                    Xác nhận
                                </button>
                           </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Delete Confirmation for Notification */}
      {showDeleteConfirmForDue && (
           <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-floating p-6">
                    <h3 className="text-xl font-bold text-text-main mb-2">Xác nhận xóa</h3>
                    <p className="text-text-light mb-6">
                        Bạn có chắc chắn muốn xóa lịch hẹn này không?
                    </p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowDeleteConfirmForDue(false)} 
                            className="px-5 py-2.5 bg-gray-100 text-text-main rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={deleteDueBooking} 
                            className="px-5 py-2.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* Spacer to prevent content overlap with fixed header */}
      <div className="h-20 sm:h-24 w-full bg-transparent"></div>

      <header className={`px-4 sm:px-6 py-4 fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-white/70 backdrop-blur-lg border border-white/40 shadow-card rounded-3xl px-5 py-3 max-w-7xl mx-auto flex justify-between items-center">
            <button 
                onClick={openShopNameEditor}
                className="group flex items-center gap-3 text-xl sm:text-2xl font-bold text-text-main transition-colors focus:outline-none truncate max-w-[200px]"
                title="Nhấp để đổi tên"
            >
              <span className="truncate tracking-tight">{shopName}</span>
            </button>
            
            <div className="flex items-center gap-4">
              <div ref={settingsMenuRef} className="relative">
                <button 
                  onClick={() => setIsSettingsMenuOpen(prev => !prev)}
                  className="p-2.5 rounded-full text-text-light hover:text-primary hover:bg-pink-50 transition-all"
                  aria-label="Cài đặt"
                  title="Cài đặt"
                >
                  <Cog6ToothIcon className="w-6 h-6" />
                </button>
                {isSettingsMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-floating z-20 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Dữ liệu
                      </div>
                      <button 
                        onClick={handleDownloadData}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-text-main rounded-2xl hover:bg-gray-50 transition-colors"
                      >
                        <CloudArrowDownIcon className="w-5 h-5 text-primary" />
                        <span>Sao lưu dữ liệu</span>
                      </button>
                      <button 
                        onClick={handleTriggerUpload}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-text-main rounded-2xl hover:bg-gray-50 transition-colors"
                      >
                         <CloudArrowUpIcon className="w-5 h-5 text-primary" />
                        <span>Khôi phục dữ liệu</span>
                      </button>
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Giao diện
                      </div>
                      <button
                        onClick={() => {
                            setIsThemeModalOpen(true);
                            setIsSettingsMenuOpen(false);
                        }}
                         className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-text-main rounded-2xl hover:bg-gray-50 transition-colors"
                      >
                        <SwatchIcon className="w-5 h-5 text-primary" />
                        <span>Mẫu Hóa Đơn</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 sm:p-6 pb-28">
        <div className="max-w-7xl mx-auto">
         {renderView()}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none flex justify-center">
          <div className="p-4 w-full max-w-lg flex justify-center pointer-events-auto">
             <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-floating rounded-3xl px-6 py-2.5 w-full flex justify-between items-center">
                <NavItem view="dashboard" label="Tổng Quan" icon={<HomeIcon className="w-6 h-6" />} />
                <NavItem view="list" label="Hóa Đơn" icon={<ListBulletIcon className="w-6 h-6" />} />
                <NavItem view="services" label="Dịch Vụ" icon={<TagIcon className="w-6 h-6" />} />
                <NavItem view="customers" label="Khách Hàng" icon={<UsersIcon className="w-6 h-6" />} />
             </div>
          </div>
      </div>
    </div>
  );
};

export default App;

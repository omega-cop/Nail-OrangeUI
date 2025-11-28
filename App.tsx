import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Bill, View } from './types';
import useBills from './hooks/useBills';
import useServices from './hooks/useServices';
import { useShopSettings } from './hooks/useShopSettings';
import BillList from './components/BillList';
import BillEditor from './components/BillEditor';
import Dashboard from './components/Dashboard';
import ServiceManager from './components/ServiceManager';
import CustomerList from './components/CustomerList';
import RevenueCalendar from './components/RevenueCalendar';
import { ListBulletIcon, TagIcon, HomeIcon, UsersIcon, CloudArrowDownIcon, CloudArrowUpIcon, PencilIcon, Cog6ToothIcon, SwatchIcon } from './components/icons';

const App: React.FC = () => {
  const { bills, addBill, updateBill, deleteBill, restoreBills } = useBills();
  const { 
      services, addService, updateService, deleteService, restoreServices,
      categories, addCategory, updateCategory, deleteCategory, restoreCategories, reorderCategories
  } = useServices();
  const { shopName, updateShopName, billTheme, updateBillTheme } = useShopSettings();
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadData = useCallback(() => {
    try {
      const billsData = localStorage.getItem('nailSpaBills') || '[]';
      const servicesData = localStorage.getItem('nailSpaServices') || '[]';
      const categoriesData = localStorage.getItem('nailSpaCategories') || '[]';
      const settingsData = localStorage.getItem('nailSpaShopSettings') || '{"shopName": "Nail Spa"}';
      
      const backupData = {
        bills: JSON.parse(billsData),
        services: JSON.parse(servicesData),
        categories: JSON.parse(categoriesData),
        settings: JSON.parse(settingsData)
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
            alert('Dữ liệu đã được khôi phục thành công.');
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
    return [...new Set(names)].filter(name => name); // Get unique, non-empty names
  }, [bills]);

  const handleEditBill = useCallback((bill: Bill) => {
    setSelectedBill(bill);
    setCurrentView('editor');
  }, []);

  const handleAddNewBill = useCallback(() => {
    setSelectedBill(null);
    setCurrentView('editor');
  }, []);

  const handleSaveBill = useCallback((bill: Bill) => {
    if (bill.id) {
      updateBill(bill);
    } else {
      addBill(bill);
    }
    setCurrentView('list');
    setSelectedBill(null);
  }, [addBill, updateBill]);

  const handleCancel = useCallback(() => {
    setCurrentView(bills.length > 0 ? 'list' : 'dashboard');
    setSelectedBill(null);
  }, [bills.length]);

  const handleViewRevenueHistory = useCallback(() => {
    setCurrentView('revenue-calendar');
  }, []);

  const handleSelectDateFromCalendar = useCallback((date: string) => {
    setTargetDate(date);
    setCurrentView('list');
  }, []);

  const handleClearTargetDate = useCallback(() => {
    setTargetDate(null);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard bills={bills} onViewRevenueHistory={handleViewRevenueHistory} />;
      case 'editor':
        return <BillEditor bill={selectedBill} onSave={handleSaveBill} onCancel={handleCancel} services={services} customerNames={customerNames} categories={categories} />;
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
        return <CustomerList bills={bills} />;
      case 'revenue-calendar':
        return <RevenueCalendar bills={bills} onBack={() => setCurrentView('dashboard')} onSelectDate={handleSelectDateFromCalendar} />;
      case 'list':
      default:
        return <BillList 
            bills={bills} 
            onEdit={handleEditBill} 
            onDelete={deleteBill} 
            onAddNew={handleAddNewBill} 
            shopName={shopName} 
            initialDate={targetDate}
            onClearTargetDate={handleClearTargetDate}
        />;
    }
  };

  const NavItem: React.FC<{ view: View; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center justify-center w-full p-2 transition-all duration-300 relative ${
        currentView === view ? 'text-primary' : 'text-gray-400 hover:text-primary/70'
      }`}
    >
      <div className={`p-2 rounded-2xl transition-all duration-300 ${currentView === view ? 'bg-pink-50 -translate-y-2 shadow-sm' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium transition-all ${currentView === view ? 'opacity-100 font-bold translate-y-[-4px]' : 'opacity-0 h-0 overflow-hidden'}`}>{label}</span>
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

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-40"></div>

      <nav className={`fixed bottom-6 left-6 right-6 glass-card flex items-center justify-around z-50 h-[72px] rounded-[32px] shadow-floating transition-transform duration-500 px-2 ${isNavVisible ? 'translate-y-0' : 'translate-y-32'}`}>
        <NavItem view="dashboard" label="Tổng Quan" icon={<HomeIcon className="w-6 h-6"/>} />
        <NavItem view="list" label="Hóa Đơn" icon={<ListBulletIcon className="w-6 h-6"/>} />
        <NavItem view="services" label="Dịch Vụ" icon={<TagIcon className="w-6 h-6"/>} />
        <NavItem view="customers" label="Khách Hàng" icon={<UsersIcon className="w-6 h-6"/>} />
      </nav>
    </div>
  );
};

export default App;

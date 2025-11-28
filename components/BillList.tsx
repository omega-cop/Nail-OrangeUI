
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Bill, Booking } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, CalendarDaysIcon, XMarkIcon, ArrowUpIcon, BillIcon, ClockIcon, ArrowRightOnRectangleIcon, CheckIcon } from './icons';
import { formatCurrency, formatDateTime, getBillDateCategory } from '../utils/dateUtils';
import BillViewModal from './BillViewModal';
import { useShopSettings } from '../hooks/useShopSettings';

interface BillListProps {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void; // This will now serve as "Add New Bill"
  shopName: string;
  initialDate?: string | null;
  onClearTargetDate?: () => void;
  
  // Booking Props
  bookings?: Booking[];
  onEditBooking?: (booking: Booking) => void;
  onDeleteBooking?: (id: string) => void;
  onConvertToBill?: (booking: Booking) => void;
  onAddNewBooking?: () => void; // New prop for adding booking
  initialTab?: 'bills' | 'bookings'; // Control which tab is open by default
}

const PAGE_SIZE = 20;

const BillSkeleton = () => (
    <div className="bg-white p-4 rounded-3xl shadow-card animate-pulse flex items-center space-x-4">
        <div className="h-12 w-12 bg-gray-100 rounded-full shrink-0"></div>
        <div className="space-y-2 flex-grow">
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
        </div>
        <div className="h-4 bg-gray-100 rounded w-16"></div>
    </div>
);

const BillList: React.FC<BillListProps> = ({ 
    bills, onEdit, onDelete, onAddNew, shopName, initialDate, onClearTargetDate,
    bookings = [], onEditBooking, onDeleteBooking, onConvertToBill, onAddNewBooking, initialTab = 'bills'
}) => {
  const [activeTab, setActiveTab] = useState<'bills' | 'bookings'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'bill' | 'booking'>('bill');
  
  // Lazy Load States
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Get theme from hook
  const { billTheme } = useShopSettings();

  useEffect(() => {
    if (initialDate) {
      setFilterDate(initialDate);
    }
  }, [initialDate]);

  // Sync activeTab with initialTab prop when it changes
  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, filterDate, bills, activeTab]);

  // Handle Scroll To Top Button Visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
    if (onClearTargetDate && e.target.value === '') {
        onClearTargetDate();
    }
  };

  const handleClearDate = () => {
      setFilterDate('');
      if (onClearTargetDate) onClearTargetDate();
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, type: 'bill' | 'booking') => {
      e.stopPropagation();
      setDeleteConfirmId(id);
      setDeleteType(type);
  };

  const confirmDelete = () => {
      if (deleteConfirmId) {
          if (deleteType === 'bill') {
            onDelete(deleteConfirmId);
          } else if (deleteType === 'booking' && onDeleteBooking) {
            onDeleteBooking(deleteConfirmId);
          }
          setDeleteConfirmId(null);
      }
  };
  
  const handleAddNewClick = () => {
      if (activeTab === 'bills') {
          onAddNew();
      } else if (activeTab === 'bookings' && onAddNewBooking) {
          onAddNewBooking();
      } else {
          // Fallback
          onAddNew();
      }
  }

  // --- Filter and Sort Bills ---
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchName = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = filterDate ? bill.date.startsWith(filterDate) : true;
      return matchName && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills, searchTerm, filterDate]);

  // --- Filter and Sort Bookings ---
  const filteredBookings = useMemo(() => {
      return bookings.filter(booking => {
          const matchName = booking.customerName.toLowerCase().includes(searchTerm.toLowerCase());
          return matchName;
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending for bookings
  }, [bookings, searchTerm]);

  // --- Data for display (Pagination) ---
  const currentList = activeTab === 'bills' ? filteredBills : filteredBookings;
  const visibleItems = useMemo(() => {
    return currentList.slice(0, visibleCount);
  }, [currentList, visibleCount]);
  
  const hasMore = visibleCount < currentList.length;

  // --- Grouping Logic for Bills ---
  const groupedBills = useMemo(() => {
    return (visibleItems as Bill[]).reduce((acc, bill) => {
        const category = getBillDateCategory(bill.date);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(bill);
        return acc;
    }, {} as Record<string, Bill[]>);
  }, [visibleItems]);

  // --- Grouping Logic for Bookings ---
  const groupedBookings = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      return (visibleItems as Booking[]).reduce((acc, booking) => {
          const bDate = new Date(booking.date);
          bDate.setHours(0,0,0,0);
          
          let category = '';
          if (bDate.getTime() === today.getTime()) category = 'Hôm nay';
          else if (bDate.getTime() === tomorrow.getTime()) category = 'Ngày mai';
          else category = `${bDate.getDate()}/${bDate.getMonth() + 1}/${bDate.getFullYear()}`;

          if (!acc[category]) acc[category] = [];
          acc[category].push(booking);
          return acc;
      }, {} as Record<string, Booking[]>);
  }, [visibleItems]);


  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          // Simulate network delay for smoother UX (like Facebook)
          setTimeout(() => {
            setVisibleCount((prev) => prev + PAGE_SIZE);
            setIsLoadingMore(false);
          }, 800); 
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the target is visible
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore]);

  const categories = activeTab === 'bills' ? Object.keys(groupedBills) : Object.keys(groupedBookings);

  return (
    <div className="space-y-6 pb-[40px]">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-text-main tracking-tight">
              {activeTab === 'bills' ? 'Hóa Đơn' : 'Đặt Lịch'}
          </h2>
          <p className="text-text-light mt-1">
              {activeTab === 'bills' ? 'Danh sách hóa đơn' : 'Quản lý lịch hẹn'}
          </p>
        </div>
        <button
            onClick={handleAddNewClick}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all transform hover:-translate-y-0.5 font-semibold"
            >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Tạo Mới</span>
        </button>
      </div>
      
      {/* Tab Switcher */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'bills' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              Hóa Đơn
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'bookings' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              Đặt Lịch
          </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className="relative group flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
                type="text"
                placeholder="Tìm tên khách..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border-none rounded-2xl outline-none text-text-main placeholder:text-gray-400 bg-white shadow-card focus:shadow-md focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            />
        </div>
        
        {/* Date Filter (Only for Bills) */}
        {activeTab === 'bills' && (
            <div className="relative group sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type={filterDate ? "date" : "text"}
                    value={filterDate}
                    onChange={handleDateChange}
                    onFocus={(e) => {
                        e.target.type = 'date';
                        e.target.showPicker?.();
                    }}
                    onBlur={(e) => {
                        if (!e.target.value) {
                            e.target.type = 'text';
                        }
                    }}
                    onClick={(e) => {
                        e.currentTarget.type = 'date';
                        e.currentTarget.showPicker?.();
                    }}
                    onKeyDown={(e) => e.preventDefault()}
                    className="w-full pl-11 pr-10 py-3.5 border-none rounded-2xl outline-none text-text-main bg-white shadow-card focus:shadow-md focus:ring-2 focus:ring-primary/20 transition-all duration-300 [color-scheme:light] placeholder:text-gray-400 cursor-pointer caret-transparent"
                    placeholder="Chọn ngày"
                />
                {filterDate && (
                    <button 
                        onClick={handleClearDate}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-primary transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        )}
      </div>

      {categories.length > 0 ? (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{category}</h3>
              <div className="grid grid-cols-1 gap-3">
                {activeTab === 'bills' ? (
                     // --- BILL LIST RENDER ---
                    groupedBills[category].map(bill => (
                        <div key={bill.id} onClick={() => setViewingBill(bill)} className="group bg-white p-4 rounded-3xl shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer border border-transparent hover:border-pink-200 relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                {/* Icon Avatar */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-pink-100 text-primary">
                                    <BillIcon className="w-6 h-6" />
                                </div>

                                {/* Info */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-base font-bold text-text-main truncate">{bill.customerName}</h4>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center text-xs text-text-light gap-1 sm:gap-3">
                                        <span className="whitespace-nowrap opacity-60">{formatDateTime(bill.date).split(' ')[1]}</span>
                                        <p className="truncate opacity-80 sm:border-l sm:border-gray-200 sm:pl-3">{bill.items.map(i => i.name).join(', ')}</p>
                                    </div>
                                </div>

                                {/* Actions & Price */}
                                <div className="flex items-center gap-3 sm:gap-5 shrink-0 pl-2">
                                    <span className="font-bold text-primary whitespace-nowrap text-base">{formatCurrency(bill.total)}</span>
                                    
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onEdit(bill); }} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Sửa"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, bill.id, 'bill')} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Xóa"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    // --- BOOKING LIST RENDER ---
                     groupedBookings[category].map(booking => (
                        <div key={booking.id} className="group bg-white p-4 rounded-3xl shadow-card hover:shadow-lg transition-all duration-300 border border-transparent hover:border-blue-200 relative overflow-hidden">
                             <div className="flex items-center gap-4">
                                {/* Icon Avatar */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-blue-50 text-blue-500">
                                    <ClockIcon className="w-6 h-6" />
                                </div>

                                {/* Info */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-base font-bold text-text-main truncate">{booking.customerName}</h4>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center text-xs text-text-light gap-1 sm:gap-3">
                                        <span className="whitespace-nowrap font-bold text-blue-500">{formatDateTime(booking.date).split(' ')[1]}</span>
                                        <p className="truncate opacity-80 sm:border-l sm:border-gray-200 sm:pl-3">{booking.items.map(i => i.name).join(', ')}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 sm:gap-5 shrink-0 pl-2">
                                    <span className="font-bold text-gray-600 whitespace-nowrap text-base">{formatCurrency(booking.total)}</span>
                                    
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if (onEditBooking) onEditBooking(booking); }} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Sửa"
                                        >
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, booking.id, 'booking')} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Xóa"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                     ))
                )}
              </div>
            </div>
          ))}
          
          {/* Skeleton Loader / Observer Target */}
          <div ref={observerTarget} className="py-4 space-y-4">
             {isLoadingMore && (
                <>
                    <BillSkeleton />
                    <BillSkeleton />
                </>
             )}
          </div>

          {!hasMore && currentList.length > PAGE_SIZE && (
              <p className="text-center text-text-light text-sm italic">Đã hiển thị hết danh sách.</p>
          )}
        </div>
      ) : (
        <div className="text-center py-20 px-6">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-floating">
            <MagnifyingGlassIcon className="w-10 h-10 text-primary/50" />
          </div>
          <p className="text-xl font-bold text-text-main">Không tìm thấy {activeTab === 'bills' ? 'hóa đơn' : 'lịch hẹn'}</p>
          <p className="text-text-light mt-2 max-w-xs mx-auto">
             Hãy thử tìm kiếm với từ khóa khác hoặc tạo mới.
          </p>
        </div>
      )}

      {viewingBill && (
        <BillViewModal bill={viewingBill} onClose={() => setViewingBill(null)} shopName={shopName} billTheme={billTheme} />
      )}
      
      {/* Scroll To Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-28 right-6 z-40 bg-white text-primary p-3 rounded-full shadow-floating hover:bg-gray-50 transition-all duration-300 animate-bounce-short border border-pink-100"
          aria-label="Lên đầu trang"
        >
          <ArrowUpIcon className="w-6 h-6" />
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-floating p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-text-main mb-2">Xác nhận xóa</h3>
                <p className="text-text-light mb-6">
                    Bạn có chắc chắn muốn xóa {deleteType === 'bill' ? 'hóa đơn' : 'lịch hẹn'} này không? Hành động này không thể hoàn tác.
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setDeleteConfirmId(null)} 
                        className="px-5 py-2.5 bg-gray-100 text-text-main rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="px-5 py-2.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                    >
                        Xóa
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BillList;

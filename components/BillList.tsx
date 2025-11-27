
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Bill } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, CalendarDaysIcon, XMarkIcon, ArrowUpIcon, BillIcon } from './icons';
import { formatCurrency, formatDateTime, getBillDateCategory } from '../utils/dateUtils';
import BillViewModal from './BillViewModal';
import { useShopSettings } from '../hooks/useShopSettings';

interface BillListProps {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  shopName: string;
  initialDate?: string | null;
  onClearTargetDate?: () => void;
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

const BillList: React.FC<BillListProps> = ({ bills, onEdit, onDelete, onAddNew, shopName, initialDate, onClearTargetDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
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

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, filterDate, bills]);

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

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
      if (deleteConfirmId) {
          onDelete(deleteConfirmId);
          setDeleteConfirmId(null);
      }
  };

  // 1. Filter and Sort ALL bills
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchName = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = filterDate ? bill.date.startsWith(filterDate) : true;
      return matchName && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills, searchTerm, filterDate]);

  // 2. Slice bills for display
  const visibleBills = useMemo(() => {
    return filteredBills.slice(0, visibleCount);
  }, [filteredBills, visibleCount]);

  // 3. Group the visible bills
  const groupedBills = useMemo(() => {
    return visibleBills.reduce((acc, bill) => {
        const category = getBillDateCategory(bill.date);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(bill);
        return acc;
    }, {} as Record<string, Bill[]>);
  }, [visibleBills]);

  const categories = Object.keys(groupedBills);
  const hasMore = visibleCount < filteredBills.length;

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

  return (
    <div className="space-y-6 pb-[40px]">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-text-main tracking-tight">Hóa Đơn</h2>
          <p className="text-text-light mt-1">Danh sách khách hàng</p>
        </div>
        <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all transform hover:-translate-y-0.5 font-semibold"
            >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Tạo Mới</span>
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
        
        {/* Date Filter */}
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
      </div>


      {filteredBills.length > 0 ? (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{category}</h3>
              <div className="grid grid-cols-1 gap-3">
                {groupedBills[category].map(bill => (
                  <div key={bill.id} onClick={() => setViewingBill(bill)} className="group bg-white p-4 rounded-3xl shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer border border-transparent hover:border-orange-100 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        {/* Icon Avatar */}
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-orange-100 text-primary">
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
                                    onClick={(e) => handleDeleteClick(e, bill.id)} 
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Xóa"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                             </div>
                        </div>
                    </div>
                  </div>
                ))}
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

          {!hasMore && filteredBills.length > PAGE_SIZE && (
              <p className="text-center text-text-light text-sm italic">Đã hiển thị hết danh sách.</p>
          )}
        </div>
      ) : (
        <div className="text-center py-20 px-6">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-floating">
            <MagnifyingGlassIcon className="w-10 h-10 text-primary/50" />
          </div>
          <p className="text-xl font-bold text-text-main">Không tìm thấy hóa đơn</p>
          <p className="text-text-light mt-2 max-w-xs mx-auto">
             Hãy thử tìm kiếm với từ khóa khác hoặc tạo một hóa đơn mới.
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
          className="fixed bottom-28 right-6 z-40 bg-white text-primary p-3 rounded-full shadow-floating hover:bg-gray-50 transition-all duration-300 animate-bounce-short border border-orange-100"
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
                    Bạn có chắc chắn muốn xóa hóa đơn này không? Hành động này không thể hoàn tác.
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

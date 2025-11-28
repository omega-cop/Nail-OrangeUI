import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PredefinedService, ServiceCategory, PriceVariant } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, Bars2Icon } from './icons';
import { formatCurrency } from '../utils/dateUtils';

interface ServiceManagerProps {
  services: PredefinedService[];
  addService: (service: Omit<PredefinedService, 'id'>) => void;
  updateService: (service: PredefinedService) => void;
  deleteService: (id: string) => void;
  categories: ServiceCategory[];
  addCategory: (name: string) => void;
  updateCategory: (category: ServiceCategory) => void;
  deleteCategory: (id: string) => void;
  reorderCategories?: (categories: ServiceCategory[]) => void;
}

type Tab = 'services' | 'categories';

const ServiceManager: React.FC<ServiceManagerProps> = ({ 
    services, addService, updateService, deleteService,
    categories, addCategory, updateCategory, deleteCategory, reorderCategories
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Local state for Drag and Drop to prevent jittering
  const [localCategories, setLocalCategories] = useState<ServiceCategory[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  
  // --- Modal States ---
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PredefinedService | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'service' | 'category' | null>(null);

  // --- DnD State ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // --- Form States ---
  // Service Form
  const [sName, setSName] = useState('');
  const [sPrice, setSPrice] = useState(0);
  const [sPriceType, setSPriceType] = useState<'fixed' | 'variable'>('fixed');
  const [sVariants, setSVariants] = useState<PriceVariant[]>([]);
  const [sAllowQuantity, setSAllowQuantity] = useState(false);
  const [sCategoryId, setSCategoryId] = useState('');

  // Variant Input States (temporary)
  const [tempVariantName, setTempVariantName] = useState('');
  const [tempVariantPrice, setTempVariantPrice] = useState(0);

  // Category Form
  const [cName, setCName] = useState('');

  // --- Handlers for Service ---
  const openAddService = () => {
      setEditingService(null);
      setSName('');
      setSPrice(0);
      setSPriceType('fixed');
      setSVariants([]);
      setSAllowQuantity(false);
      setSCategoryId(localCategories[0]?.id || ''); // Default to first category
      setIsServiceModalOpen(true);
  };

  const openEditService = (service: PredefinedService) => {
      setEditingService(service);
      setSName(service.name);
      setSPrice(service.price || 0);
      setSPriceType(service.priceType || 'fixed');
      setSVariants(service.variants || []);
      setSAllowQuantity(!!service.allowQuantity);
      setSCategoryId(service.categoryId || '');
      setIsServiceModalOpen(true);
  };

  const handleAddVariant = () => {
      if (!tempVariantName.trim()) return;
      const newVariant: PriceVariant = {
          id: `var-${Date.now()}`,
          name: tempVariantName,
          price: tempVariantPrice
      };
      setSVariants([...sVariants, newVariant]);
      setTempVariantName('');
      setTempVariantPrice(0);
  };

  const handleRemoveVariant = (id: string) => {
      setSVariants(sVariants.filter(v => v.id !== id));
  };

  const handleSaveService = (e: React.FormEvent) => {
      e.preventDefault();
      if (!sName.trim()) { alert("Vui lòng nhập tên dịch vụ"); return; }
      
      if (sPriceType === 'variable' && sVariants.length === 0) {
          alert("Vui lòng thêm ít nhất một mức giá cho dịch vụ tùy chọn.");
          return;
      }

      const serviceData = {
          name: sName,
          price: sPriceType === 'fixed' ? sPrice : 0,
          priceType: sPriceType,
          variants: sPriceType === 'variable' ? sVariants : [],
          allowQuantity: sAllowQuantity,
          categoryId: sCategoryId
      };

      if (editingService) {
          updateService({ ...editingService, ...serviceData });
      } else {
          addService(serviceData);
      }
      setIsServiceModalOpen(false);
  };

  const confirmDeleteService = (id: string) => {
      setDeleteConfirmId(id);
      setDeleteType('service');
  };

  // --- Handlers for Category ---
  const openAddCategory = () => {
      setEditingCategory(null);
      setCName('');
      setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: ServiceCategory) => {
      setEditingCategory(category);
      setCName(category.name);
      setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!cName.trim()) { alert("Vui lòng nhập tên loại dịch vụ"); return; }

      if (editingCategory) {
          updateCategory({ ...editingCategory, name: cName });
      } else {
          addCategory(cName);
      }
      setIsCategoryModalOpen(false);
  };

  const confirmDeleteCategory = (id: string) => {
      setDeleteConfirmId(id);
      setDeleteType('category');
  };

  // --- Execute Delete ---
  const executeDelete = () => {
      if (deleteType === 'service' && deleteConfirmId) {
          deleteService(deleteConfirmId);
      } else if (deleteType === 'category' && deleteConfirmId) {
          deleteCategory(deleteConfirmId);
      }
      setDeleteConfirmId(null);
      setDeleteType(null);
  };

  // --- DnD Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>, position: number) => {
      dragItem.current = position;
      // Necessary for Firefox
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
      // Optional: Add visual effect for dragging
      if (e.currentTarget.classList) {
          e.currentTarget.classList.add('opacity-50');
      }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>, position: number) => {
      e.preventDefault();
      dragOverItem.current = position;
      
      // Perform live reorder visualization locally
      if (dragItem.current !== null && dragItem.current !== position) {
          const _categories = [...localCategories];
          const draggedItemContent = _categories[dragItem.current];
          _categories.splice(dragItem.current, 1);
          _categories.splice(position, 0, draggedItemContent);
          
          dragItem.current = position; // Update drag index to new position
          setLocalCategories(_categories); // Update local state immediately
      }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement | HTMLTableRowElement>) => {
      // Reset visual opacity
      if (e.currentTarget.classList) {
          e.currentTarget.classList.remove('opacity-50');
      }
      
      // Commit changes to parent
      if (reorderCategories) {
          reorderCategories(localCategories);
      }
      
      dragItem.current = null;
      dragOverItem.current = null;
  };

  // Sort and Filter Data
  const filteredServices = useMemo(() => {
    let list = [...services];
    
    // Filter
    if (filterCategory !== 'all') {
        if (filterCategory === 'uncategorized') {
             list = list.filter(s => !s.categoryId || !localCategories.find(c => c.id === s.categoryId));
        } else {
             list = list.filter(s => s.categoryId === filterCategory);
        }
    }
    
    // Sort by name (keep services sorted by name)
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [services, filterCategory, localCategories]);

  return (
    <div className="pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-main">Quản Lý Dịch Vụ</h2>
            <p className="text-text-light mt-1 text-sm sm:text-base">Quản lý menu và danh mục dịch vụ.</p>
        </div>
        <button
            onClick={activeTab === 'services' ? openAddService : openAddCategory}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-hover transition-colors font-semibold text-sm sm:text-base"
        >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Thêm {activeTab === 'services' ? 'Dịch Vụ' : 'Loại'}</span>
            <span className="sm:hidden">Thêm Mới</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-2 mb-6 bg-secondary/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'services' ? 'bg-white text-primary shadow-sm' : 'text-text-light hover:text-text-main'}`}
          >
            Danh Sách Dịch Vụ
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-white text-primary shadow-sm' : 'text-text-light hover:text-text-main'}`}
          >
            Loại Dịch Vụ
          </button>
      </div>

      {/* --- SERVICES TAB CONTENT --- */}
      {activeTab === 'services' && (
        <div className="space-y-4">
            {/* Category Filter Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button 
                    onClick={() => setFilterCategory('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterCategory === 'all' ? 'bg-primary text-white border-primary' : 'bg-surface text-text-main border-secondary hover:bg-secondary'}`}
                >
                    Tất cả
                </button>
                {/* Use localCategories to respect drag order */}
                {localCategories.map(cat => (
                    <button 
                        key={cat.id} 
                        onClick={() => setFilterCategory(cat.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterCategory === cat.id ? 'bg-primary text-white border-primary' : 'bg-surface text-text-main border-secondary hover:bg-secondary'}`}
                    >
                        {cat.name}
                    </button>
                ))}
                 {/* Optional: Button for services without category */}
                 <button 
                    onClick={() => setFilterCategory('uncategorized')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterCategory === 'uncategorized' ? 'bg-primary text-white border-primary' : 'bg-surface text-text-main border-secondary hover:bg-secondary'}`}
                >
                    Khác
                </button>
            </div>

            <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-secondary">
                    {filteredServices.length > 0 ? filteredServices.map(service => {
                        const catName = localCategories.find(c => c.id === service.categoryId)?.name || 'Khác';
                        const displayPrice = service.priceType === 'variable' 
                            ? `${service.variants?.length || 0} mức giá`
                            : formatCurrency(service.price);

                        return (
                            <div key={service.id} className="p-4 flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-text-main">{service.name}</p>
                                    <p className="text-xs text-text-light mt-0.5">{catName}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <p className="text-primary font-semibold">{displayPrice}</p>
                                        {service.allowQuantity && <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium whitespace-nowrap">Đa số lượng</span>}
                                        {service.priceType === 'variable' && <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-primary rounded-full font-medium whitespace-nowrap">Giá tùy chọn</span>}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                    <button onClick={() => openEditService(service)} className="p-2 text-text-light hover:text-primary transition-colors rounded-full hover:bg-secondary">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => confirmDeleteService(service.id)} className="p-2 text-text-light hover:text-red-500 transition-colors rounded-full hover:bg-secondary">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-8 text-center text-text-light">Không có dịch vụ nào trong danh mục này.</div>
                    )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                        <tr className="border-b border-secondary/20">
                            <th className="p-4 font-semibold text-text-main text-sm">Tên Dịch Vụ</th>
                            <th className="p-4 font-semibold text-text-main text-sm">Loại Dịch Vụ</th>
                            <th className="p-4 font-semibold text-text-main text-sm text-right">Giá</th>
                            <th className="p-4 font-semibold text-text-main text-sm text-center">Tùy Chọn</th>
                            <th className="p-4 font-semibold text-text-main text-sm text-center">Hành Động</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary">
                        {filteredServices.length > 0 ? filteredServices.map(service => {
                            const catName = localCategories.find(c => c.id === service.categoryId)?.name || 'Khác';
                            const displayPrice = service.priceType === 'variable' 
                                ? `${service.variants?.length || 0} mức giá`
                                : formatCurrency(service.price);
                            return (
                                <tr key={service.id} className="hover:bg-secondary/30">
                                <td className="p-4 text-text-main">{service.name}</td>
                                <td className="p-4 text-text-light text-sm">{catName}</td>
                                <td className="p-4 text-right font-medium text-text-main">{displayPrice}</td>
                                <td className="p-4 text-center space-x-2">
                                    {service.allowQuantity && <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium">Đa số lượng</span>}
                                    {service.priceType === 'variable' && <span className="text-xs px-2 py-1 bg-pink-50 text-primary rounded-full font-medium">Giá tùy chọn</span>}
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center space-x-2">
                                        <button onClick={() => openEditService(service)} className="p-2 text-text-light hover:text-primary transition-colors rounded-full hover:bg-secondary">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => confirmDeleteService(service.id)} className="p-2 text-text-light hover:text-red-500 transition-colors rounded-full hover:bg-secondary">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                                </tr>
                            );
                        }) : (
                             <tr>
                                <td colSpan={5} className="p-8 text-center text-text-light">Không có dịch vụ nào trong danh mục này.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
      
      {/* --- CATEGORIES TAB CONTENT (With DnD) --- */}
      {activeTab === 'categories' && (
        <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
             {/* Mobile View */}
             <div className="md:hidden divide-y divide-secondary">
                {localCategories.length > 0 ? localCategories.map((category, index) => (
                    <div 
                        key={category.id} 
                        className="p-4 flex justify-between items-center transition-all bg-surface"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="cursor-move text-gray-400">
                                <Bars2Icon className="w-5 h-5" />
                            </div>
                            <div className="font-medium text-text-main">{category.name}</div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                            <button onClick={() => openEditCategory(category)} className="p-2 text-text-light hover:text-primary transition-colors rounded-full hover:bg-secondary">
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => confirmDeleteCategory(category.id)} className="p-2 text-text-light hover:text-red-500 transition-colors rounded-full hover:bg-secondary">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )) : (
                     <div className="p-8 text-center text-text-light">Chưa có loại dịch vụ nào.</div>
                )}
             </div>

             {/* Desktop View */}
             <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-secondary">
                        <tr className="border-b border-secondary/20">
                            <th className="p-4 font-semibold text-text-main text-sm w-10"></th>
                            <th className="p-4 font-semibold text-text-main text-sm w-full">Tên Loại Dịch Vụ</th>
                            <th className="p-4 font-semibold text-text-main text-sm text-center w-32">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary">
                        {localCategories.length > 0 ? localCategories.map((category, index) => (
                            <tr 
                                key={category.id} 
                                className="hover:bg-secondary/30 transition-all cursor-move bg-surface"
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <td className="p-4 text-center text-gray-400">
                                     <Bars2Icon className="w-5 h-5 mx-auto" />
                                </td>
                                <td className="p-4 text-text-main font-medium">{category.name}</td>
                                <td className="p-4">
                                    <div className="flex justify-center space-x-2">
                                        <button onClick={() => openEditCategory(category)} className="p-2 text-text-light hover:text-primary transition-colors rounded-full hover:bg-secondary">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => confirmDeleteCategory(category.id)} className="p-2 text-text-light hover:text-red-500 transition-colors rounded-full hover:bg-secondary">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-text-light">Chưa có loại dịch vụ nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            {/* Added max-h-[calc(100dvh-5rem)] to prevent overlap with bottom menu */}
            <div className="bg-surface w-full max-w-md rounded-lg shadow-xl overflow-hidden max-h-[calc(100dvh-5rem)] flex flex-col">
                <div className="px-6 py-4 border-b border-secondary flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-text-main">{editingService ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}</h3>
                    <button onClick={() => setIsServiceModalOpen(false)} className="text-text-light hover:text-text-main">&times;</button>
                </div>
                <form onSubmit={handleSaveService} className="p-6 space-y-4 overflow-y-auto flex-grow">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Tên Dịch Vụ</label>
                        <input type="text" value={sName} onChange={e => setSName(e.target.value)} required className="w-full px-3 py-2 bg-secondary rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-text-main" placeholder="VD: Sơn Gel" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Loại Dịch Vụ</label>
                        <select value={sCategoryId} onChange={e => setSCategoryId(e.target.value)} className="w-full px-3 py-2 bg-secondary rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-text-main">
                            <option value="">-- Chọn loại --</option>
                            {localCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Price Type Radio */}
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">Kiểu Giá</label>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="priceType" 
                                    value="fixed" 
                                    checked={sPriceType === 'fixed'} 
                                    onChange={() => setSPriceType('fixed')}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <span className="ml-2 text-text-main">Giá cố định</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="priceType" 
                                    value="variable" 
                                    checked={sPriceType === 'variable'} 
                                    onChange={() => setSPriceType('variable')}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <span className="ml-2 text-text-main">Giá tùy chọn</span>
                            </label>
                        </div>
                    </div>

                    {sPriceType === 'fixed' ? (
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Giá</label>
                            <input type="number" value={sPrice || ''} onChange={e => setSPrice(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-secondary rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-text-main" placeholder="0" />
                        </div>
                    ) : (
                        <div className="space-y-3 bg-secondary/20 p-3 rounded-lg border border-secondary">
                            <label className="block text-sm font-medium text-text-main">Danh sách mức giá</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {sVariants.map((variant, index) => (
                                    <div key={variant.id} className="flex justify-between items-center bg-white p-2 rounded-md border border-secondary shadow-sm">
                                        <div>
                                            <p className="text-sm font-medium text-text-main">{variant.name}</p>
                                            <p className="text-xs text-primary font-semibold">{formatCurrency(variant.price)}</p>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveVariant(variant.id)} className="text-text-light hover:text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 items-end">
                                <div className="flex-grow">
                                    <input type="text" value={tempVariantName} onChange={e => setTempVariantName(e.target.value)} className="w-full px-2 py-1 text-sm bg-white border border-secondary rounded mb-1 outline-none" placeholder="Tên (VD: Móng ngắn)" />
                                    <input type="number" value={tempVariantPrice || ''} onChange={e => setTempVariantPrice(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 text-sm bg-white border border-secondary rounded outline-none" placeholder="Giá" />
                                </div>
                                <button type="button" onClick={handleAddVariant} className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover mb-[2px]">Thêm</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="py-2">
                        <label className="relative inline-flex items-center cursor-pointer group">
                            <div className="relative">
                                <input type="checkbox" checked={sAllowQuantity} onChange={(e) => setSAllowQuantity(e.target.checked)} className="sr-only peer" />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shrink-0"></div>
                            </div>
                            <div className="ml-3 flex flex-col">
                                <span className="text-sm font-medium text-text-main">Cho phép nhập số lượng</span>
                                <span className="text-xs text-text-light">(Dùng cho dịch vụ tính theo cái/ngón)</span>
                            </div>
                        </label>
                    </div>
                </form>
                <div className="flex justify-end gap-3 p-6 border-t border-secondary bg-surface shrink-0">
                    <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-4 py-2 bg-secondary text-text-main rounded-lg font-medium hover:bg-secondary/80">Hủy</button>
                    <button onClick={handleSaveService} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover">Lưu</button>
                </div>
            </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            {/* Added max-h-[calc(100dvh-5rem)] to prevent overlap with bottom menu */}
            <div className="bg-surface w-full max-w-sm rounded-lg shadow-xl overflow-hidden max-h-[calc(100dvh-5rem)] flex flex-col">
                <div className="px-6 py-4 border-b border-secondary">
                    <h3 className="text-lg font-bold text-text-main">{editingCategory ? 'Sửa Loại Dịch Vụ' : 'Thêm Loại Dịch Vụ'}</h3>
                </div>
                <form onSubmit={handleSaveCategory} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Tên Loại</label>
                        <input type="text" value={cName} onChange={e => setCName(e.target.value)} required className="w-full px-3 py-2 bg-secondary rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-text-main" placeholder="VD: Chăm Sóc Móng" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 bg-secondary text-text-main rounded-lg font-medium hover:bg-secondary/80">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-surface w-full max-w-sm rounded-lg shadow-xl p-6 max-h-[calc(100dvh-5rem)] overflow-y-auto">
                <h3 className="text-lg font-bold text-text-main mb-2">Xác nhận xóa</h3>
                <p className="text-text-light mb-6">
                    Bạn có chắc chắn muốn xóa {deleteType === 'service' ? 'dịch vụ' : 'loại dịch vụ'} này không? Hành động này không thể hoàn tác.
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 bg-secondary text-text-main rounded-lg font-medium hover:bg-secondary/80">Hủy</button>
                    <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Xóa</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManager;

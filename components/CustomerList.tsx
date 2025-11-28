import React, { useMemo, useState, useEffect } from 'react';
import type { Bill, Customer } from '../types';
import { formatCurrency, formatDateTime } from '../utils/dateUtils';
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, UserPlusIcon, PhoneIcon, CakeIcon, PencilIcon, TrashIcon } from './icons';

interface VisitRecord {
    date: string;
    amount: number;
}

export interface CustomerStat {
    id?: string; // ID from manually added customer
    name: string;
    phone?: string;
    dob?: string;
    totalSpent: number;
    visitCount: number;
    lastVisitDate: string;
    visitHistory: VisitRecord[];
}

interface CustomerListProps {
    bills: Bill[];
    customers: Customer[];
    onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
    onUpdateCustomer: (customer: Customer) => void;
    onDeleteCustomer: (customer: CustomerStat) => void;
}

// Helper to display date only (DD/MM/YYYY) avoiding TZ issues
const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
        const [year, month, day] = dateStr.split('-');
        if(year && month && day) return `${day}/${month}/${year}`;
        return dateStr;
    } catch {
        return dateStr;
    }
};

const CustomerList: React.FC<CustomerListProps> = ({ 
    bills, customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer 
}) => {
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerStat | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // Logic: Merge bills data (stats) with manual customer data (info)
    const customerStats = useMemo(() => {
        const statsMap = new Map<string, { totalSpent: number; visits: VisitRecord[] }>();

        // 1. Aggregate Bills
        if (bills) {
            bills.forEach(bill => {
                const customerName = bill.customerName.trim();
                if (!customerName) return; 
                
                const lowerName = customerName.toLowerCase();
                const existingStat = statsMap.get(lowerName) || { totalSpent: 0, visits: [] };
                
                statsMap.set(lowerName, {
                    totalSpent: existingStat.totalSpent + bill.total,
                    visits: [...existingStat.visits, { date: bill.date, amount: bill.total }],
                });
            });
        }

        // 2. Map Manual Customers & Merge
        // First, create a set of names that are already processed from bills
        const processedNames = new Set(statsMap.keys());
        
        const mergedStats: CustomerStat[] = [];

        // Add manual customers (some might have bills, some not)
        customers.forEach(cust => {
            const lowerName = cust.name.trim().toLowerCase();
            const billStats = statsMap.get(lowerName);
            
            const visits = billStats ? billStats.visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

            mergedStats.push({
                id: cust.id,
                name: cust.name, // Keep original casing from record
                phone: cust.phone,
                dob: cust.dob,
                totalSpent: billStats ? billStats.totalSpent : 0,
                visitCount: visits.length,
                lastVisitDate: visits[0]?.date || '',
                visitHistory: visits,
            });

            processedNames.delete(lowerName); // Mark as processed
        });

        // Add remaining customers found in bills but not in manual list
        // Note: These won't have phone/dob or ID
        Array.from(processedNames).forEach(lowerName => {
             // Find original name casing from bills (a bit tricky, just take first match)
             const originalName = bills.find(b => b.customerName.toLowerCase() === lowerName)?.customerName || lowerName;
             const billStats = statsMap.get(lowerName);
             if (billStats) {
                 const visits = billStats.visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                 mergedStats.push({
                     name: originalName,
                     totalSpent: billStats.totalSpent,
                     visitCount: visits.length,
                     lastVisitDate: visits[0]?.date || '',
                     visitHistory: visits
                 });
             }
        });

        // Sort by Total Spent descending
        mergedStats.sort((a, b) => b.totalSpent - a.totalSpent);

        return mergedStats;
    }, [bills, customers]);

    // Handle saving new customer
    const handleSaveNewCustomer = (data: {name: string, phone: string, dob: string}) => {
        onAddCustomer(data);
        setIsAddModalOpen(false);
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text-main tracking-tight">Khách Hàng</h2>
                    <p className="text-text-light mt-1">Xếp hạng & Quản lý khách hàng</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all transform hover:-translate-y-0.5 font-semibold"
                >
                    <UserPlusIcon className="w-5 h-5" />
                    <span>Thêm khách hàng</span>
                </button>
            </div>

            {customerStats.length > 0 ? (
                <div className="space-y-4">
                    {customerStats.map((stat, index) => (
                        <button 
                            key={index} 
                            onClick={() => setSelectedCustomer(stat)}
                            className="w-full text-left bg-white p-4 rounded-3xl shadow-card hover:shadow-lg transition-all duration-300 flex items-center space-x-4 border border-transparent hover:border-pink-200 group relative overflow-hidden"
                        >
                             <div className="w-12 h-12 flex items-center justify-center shrink-0 relative z-10">
                                {index === 0 ? <GoldMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 index === 1 ? <SilverMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 index === 2 ? <BronzeMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500`}>
                                     {index + 1}
                                 </div>
                                }
                            </div>
                            
                            <div className="flex-grow min-w-0 z-10">
                                <h3 className="text-lg font-bold text-text-main truncate">{stat.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs bg-pink-50 text-primary px-2 py-0.5 rounded-md font-medium">
                                        {stat.visitCount} lần
                                    </span>
                                    {stat.lastVisitDate ? (
                                        <span className="text-xs text-gray-400 truncate">
                                            {formatDateTime(stat.lastVisitDate).split(',')[0]}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 truncate italic">Chưa ghé thăm</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="text-right shrink-0 z-10">
                                <p className="text-lg font-bold text-primary">{formatCurrency(stat.totalSpent)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 px-6 bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
                    <p className="text-text-light font-medium">Chưa có dữ liệu khách hàng.</p>
                </div>
            )}

            {/* Modal Detail / Edit */}
            {selectedCustomer && (
                <CustomerDetailModal
                    customerStat={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onUpdate={onUpdateCustomer}
                    onDelete={onDeleteCustomer}
                    // If customer doesn't have ID, we need to create it when they edit
                    onCreate={(data) => onAddCustomer(data)}
                />
            )}

            {/* Modal Add New */}
            {isAddModalOpen && (
                <CustomerEditModal 
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleSaveNewCustomer}
                    title="Thêm Khách Hàng"
                />
            )}
        </div>
    );
};

// --- Sub-components for Modals ---

interface CustomerEditModalProps {
    onClose: () => void;
    onSave: (data: {name: string, phone: string, dob: string}) => void;
    initialData?: {name: string, phone: string, dob: string};
    title: string;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({ onClose, onSave, initialData, title }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [dob, setDob] = useState(initialData?.dob || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim()) {
            alert("Tên khách hàng là bắt buộc");
            return;
        }
        onSave({name, phone, dob});
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
             <div className="bg-white w-full max-w-sm rounded-3xl shadow-floating overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-text-main">{title}</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                     <div>
                         <label className="block text-sm font-medium text-text-main mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                         <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" placeholder="VD: Nguyễn Văn A" required />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-text-main mb-1">Số điện thoại</label>
                         <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" placeholder="0901234567" />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-text-main mb-1">Ngày sinh</label>
                         <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" />
                     </div>
                     <div className="pt-2 flex gap-3">
                         <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded-2xl font-bold text-gray-600">Hủy</button>
                         <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover shadow-lg shadow-primary/30">Lưu</button>
                     </div>
                 </form>
             </div>
        </div>
    );
}

interface CustomerDetailModalProps {
    customerStat: CustomerStat;
    onClose: () => void;
    onUpdate: (customer: Customer) => void;
    onDelete: (customer: CustomerStat) => void;
    onCreate: (data: {name: string, phone: string, dob: string}) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customerStat, onClose, onUpdate, onDelete, onCreate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSaveEdit = (data: {name: string, phone: string, dob: string}) => {
        if (customerStat.id) {
            // Update existing
            onUpdate({ id: customerStat.id, ...data });
        } else {
            // Create new (because this customer existed only in bills)
            onCreate(data);
        }
        setIsEditing(false);
        // We close the main modal because the list needs to refresh to show new data passed via props
        onClose(); 
    };

    const handleDelete = () => {
        onDelete(customerStat);
        setShowDeleteConfirm(false);
        onClose();
    };

    if (isEditing) {
        return (
            <CustomerEditModal
                title="Sửa Thông Tin"
                initialData={{ name: customerStat.name, phone: customerStat.phone || '', dob: customerStat.dob || '' }}
                onClose={() => setIsEditing(false)}
                onSave={handleSaveEdit}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-3xl shadow-floating flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                {/* Header Info Section */}
                <div className="bg-pink-50 p-6 rounded-t-3xl relative">
                     <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                     
                     <div className="text-center">
                         <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-primary shadow-sm border-2 border-white">
                             {customerStat.name.charAt(0).toUpperCase()}
                         </div>
                         <h3 className="text-2xl font-bold text-text-main">{customerStat.name}</h3>
                         <div className="flex items-center justify-center gap-4 mt-2 text-sm text-text-light">
                             <div className="flex items-center gap-1">
                                 <PhoneIcon className="w-4 h-4" />
                                 <span>{customerStat.phone || '---'}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                 <CakeIcon className="w-4 h-4" />
                                 {/* Use formatDateOnly here to remove time */}
                                 <span>{formatDateOnly(customerStat.dob || '')}</span>
                             </div>
                         </div>
                     </div>

                     <div className="flex justify-center gap-3 mt-6">
                         <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-semibold text-text-main hover:bg-gray-50">
                             <PencilIcon className="w-4 h-4 text-primary" /> Sửa
                         </button>
                         {/* Always allow delete, even if just virtual customer */}
                         <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-semibold text-red-500 hover:bg-red-50">
                             <TrashIcon className="w-4 h-4" /> Xóa
                         </button>
                     </div>
                </div>

                {/* Body History Section */}
                <div className="flex-grow overflow-y-auto p-6 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-text-main">Lịch sử ghé thăm</h4>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">{customerStat.visitCount} lần</span>
                    </div>

                    {customerStat.visitHistory.length > 0 ? (
                        <div className="space-y-3">
                            {customerStat.visitHistory.map((visit, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-pink-100 transition-colors">
                                    <span className="text-sm text-text-main">{formatDateTime(visit.date)}</span>
                                    <span className="font-bold text-primary">{formatCurrency(visit.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 italic py-4">Chưa có lịch sử giao dịch.</p>
                    )}
                </div>

                {/* Footer Total */}
                <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl">
                     <div className="flex justify-between items-center">
                         <span className="text-gray-500 font-medium">Tổng chi tiêu</span>
                         <span className="text-2xl font-bold text-primary">{formatCurrency(customerStat.totalSpent)}</span>
                     </div>
                </div>
            </div>

            {/* Delete Confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-floating">
                        <h3 className="text-xl font-bold text-red-600 mb-2">CẢNH BÁO XÓA</h3>
                        <p className="text-text-main mb-6 font-medium">
                            Hành động này sẽ xóa vĩnh viễn hồ sơ khách hàng, <span className="text-red-600 font-bold uppercase">TẤT CẢ hóa đơn</span> và <span className="text-red-600 font-bold uppercase">lịch hẹn</span> liên quan đến khách hàng này.
                            <br/><br/>
                            Bạn có chắc chắn muốn tiếp tục không?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 bg-gray-100 rounded-2xl font-bold text-text-main">Hủy</button>
                            <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-600/30">Xóa Tất Cả</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerList;

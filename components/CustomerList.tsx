import React, { useMemo, useState } from 'react';
import type { Bill } from '../types';
import { formatCurrency, formatDateTime } from '../utils/dateUtils';
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from './icons';
import CustomerHistoryModal from './CustomerHistoryModal';

interface VisitRecord {
    date: string;
    amount: number;
}

export interface CustomerStat {
    name: string;
    totalSpent: number;
    visitCount: number;
    lastVisitDate: string;
    visitHistory: VisitRecord[];
}

interface CustomerListProps {
    bills: Bill[];
}

const CustomerList: React.FC<CustomerListProps> = ({ bills }) => {
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerStat | null>(null);

    const customerStats = useMemo(() => {
        if (!bills || bills.length === 0) {
            return [];
        }

        const statsMap = new Map<string, { totalSpent: number; visits: VisitRecord[] }>();

        bills.forEach(bill => {
            const customerName = bill.customerName.trim();
            if (!customerName) return; 
            
            const existingStat = statsMap.get(customerName) || { totalSpent: 0, visits: [] };
            
            statsMap.set(customerName, {
                totalSpent: existingStat.totalSpent + bill.total,
                visits: [...existingStat.visits, { date: bill.date, amount: bill.total }],
            });
        });

        const statsArray: CustomerStat[] = Array.from(statsMap.entries()).map(([name, data]) => {
            const sortedVisits = data.visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return {
                name,
                totalSpent: data.totalSpent,
                visitCount: data.visits.length,
                lastVisitDate: sortedVisits[0]?.date || '',
                visitHistory: sortedVisits,
            };
        });

        statsArray.sort((a, b) => b.totalSpent - a.totalSpent);

        return statsArray;
    }, [bills]);
    
    return (
        <div className="space-y-6 pb-10">
            <div>
                <h2 className="text-3xl font-bold text-text-main tracking-tight">Khách Hàng</h2>
                <p className="text-text-light mt-1">Xếp hạng khách hàng thân thiết</p>
            </div>

            {customerStats.length > 0 ? (
                <div className="space-y-4">
                    {customerStats.map((stat, index) => (
                        <button 
                            key={stat.name} 
                            onClick={() => setSelectedCustomer(stat)}
                            className="w-full text-left bg-white p-4 rounded-3xl shadow-card hover:shadow-lg transition-all duration-300 flex items-center space-x-4 border border-transparent hover:border-pink-200 group"
                        >
                             <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
                                {index === 0 ? <GoldMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 index === 1 ? <SilverMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 index === 2 ? <BronzeMedalIcon className="w-12 h-12 drop-shadow-sm" /> :
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500`}>
                                     {index + 1}
                                 </div>
                                }
                            </div>
                            
                            <div className="flex-grow min-w-0">
                                <h3 className="text-lg font-bold text-text-main truncate">{stat.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs bg-pink-50 text-primary px-2 py-0.5 rounded-md font-medium">
                                        {stat.visitCount} lần
                                    </span>
                                    <span className="text-xs text-gray-400 truncate">
                                        {formatDateTime(stat.lastVisitDate).split(',')[0]}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right shrink-0">
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
            {selectedCustomer && (
                <CustomerHistoryModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
};

export default CustomerList;

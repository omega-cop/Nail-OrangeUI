import React, { useMemo } from 'react';
import type { Bill } from '../types';
import { isToday, isWithinThisWeek, isWithinThisMonth, formatCurrency } from '../utils/dateUtils';
import { ChartBarIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  bills: Bill[];
  onViewRevenueHistory: () => void;
}

interface SummaryCardProps {
    title: string;
    amount: number;
    description: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
    chartData?: any[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, description, variant = 'secondary', chartData }) => {
    
    let containerClasses = "p-6 rounded-3xl shadow-card relative overflow-hidden transition-transform hover:scale-[1.02] duration-300";
    let titleColor = "text-gray-500";
    let amountColor = "text-gray-800";
    let descColor = "text-gray-400";

    if (variant === 'primary') {
        // Updated to Pink Gradient
        containerClasses = "p-6 rounded-3xl shadow-lg relative overflow-hidden bg-gradient-to-br from-[#f25fd2] to-[#ec4899] text-white";
        titleColor = "text-pink-50";
        amountColor = "text-white";
        descColor = "text-pink-100";
    } else {
        containerClasses += " bg-white";
    }

    return (
        <div className={containerClasses}>
            {variant === 'primary' && (
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            )}
            <div className="relative z-10">
                <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>
                <p className={`text-3xl font-bold mt-2 font-sans tracking-tight ${amountColor}`}>{formatCurrency(amount)}</p>
                <p className={`text-xs mt-1 ${descColor}`}>{description}</p>
                
                {variant === 'primary' && chartData && (
                    <div className="w-full h-16 mt-4 -mb-4 -ml-2 filter drop-shadow-sm">
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="revenue" stroke="#FFFFFF" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper to get local YYYY-MM-DD string from a date object or string
const getLocalDateKey = (dateInput: string | Date): string => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Dashboard: React.FC<DashboardProps> = ({ bills, onViewRevenueHistory }) => {
    
  const dailyRevenueData = useMemo(() => {
    const data: { [key: string]: number } = {};
    bills.forEach(bill => {
        if(isWithinThisWeek(bill.date)) {
            const dateKey = getLocalDateKey(bill.date);
            data[dateKey] = (data[dateKey] || 0) + bill.total;
        }
    });
    return Object.entries(data).map(([date, revenue]) => ({ date, revenue })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bills]);

  const revenueToday = useMemo(() => 
    bills.filter(bill => isToday(bill.date)).reduce((sum, bill) => sum + bill.total, 0),
    [bills]
  );

  const revenueThisWeek = useMemo(() => 
    bills.filter(bill => isWithinThisWeek(bill.date)).reduce((sum, bill) => sum + bill.total, 0),
    [bills]
  );
  
  const revenueThisMonth = useMemo(() => 
    bills.filter(bill => isWithinThisMonth(bill.date)).reduce((sum, bill) => sum + bill.total, 0),
    [bills]
  );

  const weeklyChartData = useMemo(() => {
    const today = new Date();
    // Initialize array for last 7 days
    const data = Array(7).fill(null).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return {
            name: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
            date: getLocalDateKey(d), // Key format: YYYY-MM-DD
            revenue: 0
        };
    }).reverse();

    // Populate revenue
    bills.forEach(bill => {
        const billDateKey = getLocalDateKey(bill.date);
        const dayData = data.find(d => d.date === billDateKey);
        if(dayData) {
            dayData.revenue += bill.total;
        }
    });

    return data;
  }, [bills]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-text-main tracking-tight">Tổng Quan</h2>
          <p className="text-text-light mt-1">Xin chào, chúc bạn một ngày tốt lành!</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummaryCard 
            title="Hôm nay" 
            amount={revenueToday} 
            description="Doanh thu ngày" 
            variant="primary" 
            chartData={dailyRevenueData} 
        />
        <SummaryCard 
            title="Tuần này" 
            amount={revenueThisWeek} 
            description="Doanh thu tuần"
        />
        <SummaryCard 
            title="Tháng này" 
            amount={revenueThisMonth} 
            description="Doanh thu tháng"
        />
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-3xl shadow-card border border-gray-100">
        <h3 className="text-lg font-bold text-text-main mb-6 flex items-center justify-between">
            <span>Biểu đồ doanh thu</span>
            <button
              onClick={onViewRevenueHistory}
              className="text-xs font-semibold text-primary px-4 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 transition-colors"
            >
              Chi tiết
            </button>
        </h3>
        {bills.length > 0 ? (
          <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                      <XAxis 
                        dataKey="name" 
                        stroke="#9CA3AF" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10} 
                        fontWeight={500}
                      />
                      <YAxis 
                        stroke="#9CA3AF" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value)}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} 
                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', fontSize: '13px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                        cursor={{fill: '#FFF5FF', radius: 8}}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="#f25fd2" 
                        name="Doanh thu" 
                        radius={[6, 6, 6, 6]} 
                        barSize={24} 
                      />
                  </BarChart>
              </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <ChartBarIcon className="w-8 h-8 text-gray-300"/>
            </div>
            <p className="text-text-light font-medium">Chưa có dữ liệu biểu đồ</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

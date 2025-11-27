
import React, { useState, useMemo } from 'react';
import type { Bill } from '../types';
import { formatCurrency, formatCompactCurrency } from '../utils/dateUtils';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface RevenueCalendarProps {
  bills: Bill[];
  onBack: () => void;
  onSelectDate: (date: string) => void;
}

const MONTH_NAMES = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const RevenueCalendar: React.FC<RevenueCalendarProps> = ({ bills, onBack, onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const revenueByDay = useMemo(() => {
    const revenueMap = new Map<string, number>();
    bills.forEach(bill => {
      const billDate = new Date(bill.date);
      // Add timezone offset to prevent date from shifting to the previous day
      const userTimezoneOffset = billDate.getTimezoneOffset() * 60000;
      const correctedBillDate = new Date(billDate.getTime() + userTimezoneOffset);
        
      if (correctedBillDate.getFullYear() === year && correctedBillDate.getMonth() === month) {
        const day = correctedBillDate.getDate();
        const currentRevenue = revenueMap.get(String(day)) || 0;
        revenueMap.set(String(day), currentRevenue + bill.total);
      }
    });
    return revenueMap;
  }, [bills, year, month]);

  const totalMonthRevenue = useMemo(() => {
    return Array.from(revenueByDay.values()).reduce((sum: number, revenue: number) => sum + revenue, 0);
  }, [revenueByDay]);

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: ({ day: number; revenue: number } | null)[] = [];
    
    // Add padding for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      grid.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push({
        day,
        revenue: revenueByDay.get(String(day)) || 0,
      });
    }

    return grid;
  }, [year, month, revenueByDay]);

  const handleMonthChange = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };
  
  const handleSetDate = (newMonth: number, newYear: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
       <div className="flex items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-text-light hover:text-text-main transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-semibold text-sm sm:text-base">Quay Lại</span>
        </button>
      </div>

      <div className="bg-surface p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="order-2 sm:order-1 text-center sm:text-left">
                  <h3 className="text-xs sm:text-sm font-medium text-text-light">Tổng Doanh Thu Tháng</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(totalMonthRevenue)}</p>
              </div>

              <div className="order-1 sm:order-2 flex items-center gap-1 sm:gap-2">
                  <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                      <ChevronLeftIcon className="w-5 h-5 text-text-light"/>
                  </button>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-1 font-semibold text-base sm:text-lg text-text-main">
                      <select
                          value={month}
                          onChange={(e) => handleSetDate(parseInt(e.target.value), year)}
                          className="bg-transparent border-none focus:ring-0 font-semibold p-1 appearance-none text-center"
                      >
                          {MONTH_NAMES.map((name, index) => (
                              <option key={name} value={index}>{name}</option>
                          ))}
                      </select>
                      <select
                          value={year}
                          onChange={(e) => handleSetDate(month, parseInt(e.target.value))}
                          className="bg-transparent border-none focus:ring-0 font-semibold p-1 appearance-none text-center"
                      >
                          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                  </div>
                  
                  <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                      <ChevronRightIcon className="w-5 h-5 text-text-light"/>
                  </button>
              </div>
          </div>
      </div>
      
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-secondary/20">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center p-2 sm:p-3 font-semibold text-text-light text-xs sm:text-sm">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarGrid.map((cell, index) => {
            const isLastCol = (index + 1) % 7 === 0;

            if (!cell) {
              return <div key={`empty-${index}`} className={`border-b border-secondary/20 min-h-[80px] sm:min-h-[128px] ${!isLastCol ? 'border-r border-secondary/20' : ''}`}></div>;
            }
            
            const isToday = isCurrentMonth && cell.day === today.getDate();
            const hasRevenue = cell.revenue > 0;
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;

            return (
              <button
                key={cell.day}
                onClick={() => onSelectDate(dateString)}
                className={`p-1 sm:p-2 min-h-[80px] sm:min-h-[128px] flex flex-col justify-between text-left border-b border-secondary/20
                  ${!isLastCol ? 'border-r border-secondary/20' : ''}
                  ${hasRevenue ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-secondary/30'}
                  relative transition-colors cursor-pointer group outline-none focus:ring-1 focus:ring-inset focus:ring-primary/50`}
              >
                <span className={`text-xs sm:text-sm font-semibold ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center' : 'text-text-main group-hover:text-primary transition-colors'}`}>
                  {cell.day}
                </span>
                {hasRevenue && (
                  <span className="text-right font-bold text-[10px] sm:text-sm text-primary break-words leading-tight">
                    {formatCompactCurrency(cell.revenue)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevenueCalendar;

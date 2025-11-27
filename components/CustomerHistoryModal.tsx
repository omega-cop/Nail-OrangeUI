import React from 'react';
import { formatDateTime, formatCurrency } from '../utils/dateUtils';

interface VisitRecord {
    date: string;
    amount: number;
}

interface CustomerStat {
    name: string;
    visitHistory: VisitRecord[];
}

interface CustomerHistoryModalProps {
  customer: CustomerStat;
  onClose: () => void;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-text-main mb-1">Lịch Sử Ghé Thăm</h2>
          <p className="text-lg font-semibold text-primary mb-4">{customer.name}</p>
          
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {customer.visitHistory.map((visit, index) => (
              <li key={index} className="bg-secondary p-3 rounded-md text-sm text-text-main flex justify-between items-center">
                <span>{formatDateTime(visit.date)}</span>
                <span className="font-bold text-primary">{formatCurrency(visit.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-secondary flex justify-end border-t border-border">
            <button onClick={onClose} className="px-6 py-2 bg-white border border-border text-text-main rounded-lg hover:bg-gray-100 transition-colors font-semibold">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
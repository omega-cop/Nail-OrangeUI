import React, { useRef, useState } from 'react';
import type { Bill } from '../types';
import { formatCurrency, formatSpecificDateTime } from '../utils/dateUtils';
import html2canvas from 'html2canvas';
import { ArrowDownTrayIcon, PrinterIcon } from './icons';

interface BillViewModalProps {
  bill: Bill;
  onClose: () => void;
  shopName: string;
  billTheme?: string;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, onClose, shopName, billTheme = 'default' }) => {
  const printableContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const subTotal = bill.items.reduce((sum, item) => sum + item.price, 0);
  const discountAmount = bill.total < subTotal ? subTotal - bill.total : 0;
  const hasDiscount = discountAmount > 0;

  // New Modern Theme Logic
  // Structure is constant (Receipt Card), colors change
  const getThemeStyles = (theme: string) => {
    switch (theme) {
      case 'orange':
        return {
          iconGradient: 'from-orange-400 to-orange-600',
          iconShadow: 'shadow-orange-200',
          titleColor: 'text-gray-800',
          primaryColor: 'text-orange-600',
          accentBg: 'bg-orange-50',
          topBar: 'bg-orange-500'
        };
      case 'blue':
        return {
          iconGradient: 'from-blue-400 to-blue-600',
          iconShadow: 'shadow-blue-200',
          titleColor: 'text-gray-800',
          primaryColor: 'text-blue-600',
          accentBg: 'bg-blue-50',
          topBar: 'bg-blue-500'
        };
      case 'gold':
        return {
          iconGradient: 'from-yellow-400 to-yellow-600',
          iconShadow: 'shadow-yellow-200',
          titleColor: 'text-gray-800',
          primaryColor: 'text-yellow-600',
          accentBg: 'bg-yellow-50',
          topBar: 'bg-yellow-500'
        };
      case 'green':
        return {
            iconGradient: 'from-emerald-400 to-emerald-600',
            iconShadow: 'shadow-emerald-200',
            titleColor: 'text-gray-800',
            primaryColor: 'text-emerald-600',
            accentBg: 'bg-emerald-50',
            topBar: 'bg-emerald-500'
        };
      default: // Pink (Default Spa Theme)
        return {
          iconGradient: 'from-pink-400 to-pink-600',
          iconShadow: 'shadow-pink-200',
          titleColor: 'text-gray-800',
          primaryColor: 'text-pink-600',
          accentBg: 'bg-pink-50',
          topBar: 'bg-pink-500'
        };
    }
  };

  const themeStyles = getThemeStyles(billTheme);

  const handlePrint = () => {
    const content = printableContentRef.current;
    if (content) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Hóa Đơn</title>');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">');
        printWindow.document.write(`
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; font-family: 'Noto Sans', sans-serif; }
              .no-print { display: none; }
              .print-container { width: 100%; max-width: 400px; margin: 0 auto; padding: 20px; }
            }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="print-container">');
        printWindow.document.write(content.innerHTML);
        printWindow.document.write('</div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
           printWindow.print();
           printWindow.close();
        }, 500);
      }
    }
  };

  const handleDownloadImage = async () => {
    if (printableContentRef.current) {
        setIsDownloading(true);
        try {
            // Clone and setup for capture
            const originalElement = printableContentRef.current;
            const clone = originalElement.cloneNode(true) as HTMLElement;
            
            clone.style.position = 'absolute';
            clone.style.top = '-10000px';
            clone.style.left = '-10000px';
            clone.style.width = '420px'; // Fixed width for optimal receipt image
            clone.style.height = 'auto';
            clone.style.padding = '2rem';
            clone.style.backgroundColor = 'white';
            clone.style.borderRadius = '16px';
            
            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2.5, // Crisp high quality
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            const dateStr = new Date(bill.date).toISOString().split('T')[0];
            link.download = `HoaDon-${bill.customerName.replace(/\s+/g, '-')}-${dateStr}.png`;
            link.click();
            
            document.body.removeChild(clone);
        } catch (error) {
            console.error("Lỗi khi tải ảnh:", error);
            alert("Đã xảy ra lỗi khi tạo ảnh hóa đơn.");
        } finally {
            setIsDownloading(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] flex flex-col max-h-[90vh] overflow-hidden transition-all transform scale-100" onClick={(e) => e.stopPropagation()}>
        
        {/* Printable Receipt Area */}
        <div ref={printableContentRef} className="bg-white p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow relative">
           {/* Decorative top bar */}
           <div className={`absolute top-0 left-0 right-0 h-2 ${themeStyles.topBar}`} />

           {/* Header */}
           <div className="text-center mb-8 pt-6">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{shopName}</h1>
                <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-medium">Hóa Đơn Dịch Vụ</p>
           </div>

           {/* Info Box */}
           <div className={`${themeStyles.accentBg} rounded-2xl p-5 mb-6 text-sm`}>
                <div className="flex justify-between mb-2.5">
                    <span className="text-gray-500">Khách hàng</span>
                    <span className="font-bold text-gray-800">{bill.customerName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Thời gian</span>
                    <span className="font-semibold text-gray-800">{formatSpecificDateTime(bill.date)}</span>
                </div>
           </div>

           {/* Items List */}
           <div className="mb-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chi tiết dịch vụ</div>
                <div className="space-y-4">
                    {bill.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm group items-start">
                            <div className="pr-4">
                                <div className="font-semibold text-gray-800">{item.name}</div>
                                {(item.variantName || item.quantity > 1) && (
                                    <div className="text-gray-400 text-xs mt-0.5">
                                        {item.variantName} {item.quantity > 1 ? `x${item.quantity}` : ''}
                                    </div>
                                )}
                            </div>
                            <div className="font-bold text-gray-800 whitespace-nowrap">
                                {formatCurrency(item.price)}
                            </div>
                        </div>
                    ))}
                </div>
           </div>

           {/* Divider - Dashed Line */}
           <div className="border-t-2 border-dashed border-gray-200 mb-6"></div>

           {/* Totals */}
           <div className="space-y-3 text-sm mb-8">
                {hasDiscount && (
                    <>
                        <div className="flex justify-between text-gray-500">
                            <span>Tạm tính</span>
                            <span>{formatCurrency(subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                            <span>Giảm giá</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between items-end pt-2">
                    <span className="font-bold text-gray-800 text-base">Thành tiền</span>
                    <span className={`text-3xl font-bold ${themeStyles.primaryColor}`}>{formatCurrency(bill.total)}</span>
                </div>
           </div>

           {/* Footer */}
           <div className="text-center border-t border-gray-100 pt-6">
                <p className="text-gray-400 text-xs italic mb-2">Cảm ơn quý khách và hẹn gặp lại!</p>
                <p className="text-[10px] text-gray-300 mt-1 tracking-widest">{bill.id.toUpperCase().slice(-12)}</p>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex space-x-3 shrink-0">
            <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-100 transition-colors font-bold shadow-sm">
                Đóng
            </button>
            <button onClick={handleDownloadImage} disabled={isDownloading} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-100 transition-colors font-bold shadow-sm flex items-center justify-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>{isDownloading ? '...' : 'Lưu Ảnh'}</span>
            </button>
            <button onClick={handlePrint} className="flex-1 py-3 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-colors font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                <PrinterIcon className="w-5 h-5" />
                <span>In</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default BillViewModal;

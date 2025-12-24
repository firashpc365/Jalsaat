
// components/features/QuotationPreview.tsx
import React, { useMemo, forwardRef } from 'react';
import type { EventItem, CostTrackerItem, QuotationDetails } from '../../types';
import { CalendarIcon, MapPinIcon, UsersIcon } from '../common/icons';

interface QuotationPreviewProps {
    data: {
        details: QuotationDetails;
        event: EventItem;
        lineItems: CostTrackerItem[];
        showQRCode?: boolean;
    };
    layoutStyle?: 'modern' | 'minimal' | 'bold'; // New prop for visual variations
}

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(({ data, layoutStyle = 'modern' }, ref) => {
    const { details, event, lineItems } = data;

    const groupedItems = useMemo(() => {
        const groups: { [key: string]: CostTrackerItem[] } = {
            'Fixed Costs': [],
            'Variable Costs': [],
            'Mandatory Compliance Costs': [],
            'Other Items': []
        };
        lineItems.forEach(item => {
            if (item.costType === 'Fixed') {
                groups['Fixed Costs'].push(item);
            } else if (item.costType === 'Variable') {
                groups['Variable Costs'].push(item);
            } else if (item.costType === 'Compliance') {
                groups['Mandatory Compliance Costs'].push(item);
            } else {
                groups['Other Items'].push(item);
            }
        });
        
        const finalGroups: { [key: string]: CostTrackerItem[] } = {};
        for (const key in groups) {
            if (groups[key].length > 0) {
                finalGroups[key] = groups[key];
            }
        }
        return finalGroups;
    }, [lineItems]);

    const calculations = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + item.client_price_sar * item.quantity, 0);
        const salesTax = subtotal * (details.taxRate / 100);
        const other = details.otherCharges.amount || 0;
        const total = subtotal + salesTax + other;
        return { subtotal, salesTax, other, total };
    }, [lineItems, details.taxRate, details.otherCharges.amount]);

    const formatCurrency = (amount: number) => {
        return `SAR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- Modern Layout Components ---

    const renderModernHeader = () => (
        <header className="flex justify-between items-start mb-12">
            <div className="w-1/2">
                {details.companyLogo ? (
                    <img src={details.companyLogo} alt="Company Logo" className="max-h-20 object-contain mb-4" />
                ) : (
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900">{details.companyName}</h1>
                )}
                 <div className="text-gray-500 text-sm font-medium space-y-1">
                    {details.companyAddress && <p className="whitespace-pre-line">{details.companyAddress}</p>}
                    {details.website && <p>{details.website}</p>}
                    {details.contactEmail && <p>{details.contactEmail}</p>}
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-5xl font-black tracking-tight text-gray-100 mb-4 uppercase">Quote</h2>
                <div className="inline-block text-right space-y-2">
                    <div className="flex justify-end gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ref</span>
                        <span className="text-lg font-bold text-gray-800">{details.quotationId}</span>
                    </div>
                    <div className="flex justify-end gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</span>
                        <span className="text-sm font-medium">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                     <div className="flex justify-end gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valid</span>
                        <span className="text-sm font-medium">{details.validUntil}</span>
                    </div>
                </div>
            </div>
        </header>
    );

    const renderBoldHeader = () => (
        <>
            <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: details.primaryColor }}></div>
            <header className="flex justify-between items-center mb-8 pt-8">
                <div className="flex items-center gap-4">
                    {details.companyLogo && <img src={details.companyLogo} alt="Logo" className="max-h-24 object-contain" />}
                    {!details.companyLogo && <h1 className="text-3xl font-black uppercase tracking-tight">{details.companyName}</h1>}
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ color: details.primaryColor }}>Quotation</h2>
                    <p className="text-gray-500 font-mono mt-1">{details.quotationId}</p>
                </div>
            </header>
            <div className="flex justify-between bg-gray-50 p-6 rounded-lg mb-10 border-l-4" style={{ borderColor: details.primaryColor }}>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-2">From</h3>
                    <p className="font-bold text-gray-800">{details.companyName}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{details.companyAddress}</p>
                    <p className="text-sm text-gray-600">{details.contactEmail}</p>
                </div>
                <div className="text-right space-y-1">
                     <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-2">Bill To</h3>
                     <p className="font-bold text-gray-800">{event.clientName}</p>
                     <p className="text-sm text-gray-600">{event.clientContact}</p>
                     <p className="text-sm text-gray-600 mt-2">{event.location}</p>
                </div>
            </div>
        </>
    );

    const renderItemsTable = (title: string, items: CostTrackerItem[]) => {
        if (items.length === 0) return null;
        
        const isBold = layoutStyle === 'bold';

        return (
            <div key={title} className="proposal-item mb-8 break-inside-avoid">
                {title !== 'Other Items' && (
                    <div className="mb-3 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${isBold ? '' : 'bg-gray-300'}`} style={isBold ? { backgroundColor: details.primaryColor } : {}}></div>
                        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: isBold ? details.primaryColor : 'inherit' }}>{title}</h3>
                    </div>
                )}
                
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`${isBold ? 'bg-gray-100 text-gray-700' : 'border-b-2 border-gray-100 text-gray-500'} text-xs font-bold uppercase tracking-wide`}>
                            <th className={`px-4 py-3 text-left ${isBold ? 'rounded-l' : ''}`}>Description</th>
                            <th className="px-4 py-3 text-center">Qty</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className={`px-4 py-3 text-right ${isBold ? 'rounded-r' : ''}`}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.itemId + index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 align-top">
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    {item.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>}
                                </td>
                                <td className="px-4 py-3 text-center align-top text-gray-600 font-medium">{item.quantity}</td>
                                <td className="px-4 py-3 text-right align-top text-gray-600">{formatCurrency(item.client_price_sar)}</td>
                                <td className="px-4 py-3 text-right align-top font-bold text-gray-800">{formatCurrency(item.client_price_sar * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div ref={ref} className="bg-white text-gray-800 flex flex-col mx-auto shadow-2xl relative overflow-hidden" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Inter', sans-serif" }}>
            
            <div className="p-12 flex flex-col flex-grow relative z-10 pb-0">
                
                {layoutStyle === 'bold' ? renderBoldHeader() : renderModernHeader()}

                {layoutStyle !== 'bold' && (
                    <section className="grid grid-cols-2 gap-12 mb-12 pb-8 border-b border-gray-100">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                                <UsersIcon className="h-3 w-3" /> Prepared For
                            </p>
                            <p className="text-xl font-bold text-gray-900">{event.clientName}</p>
                            <p className="text-sm text-gray-500 mt-1">{event.clientContact}</p>
                        </div>
                        
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2 justify-end">
                                <CalendarIcon className="h-3 w-3" /> Event Details
                            </p>
                            <p className="text-xl font-bold text-gray-900">{event.name}</p>
                            <div className="text-sm text-gray-500 mt-1 flex flex-col items-end">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3 opacity-50"/> {event.date}</span>
                                <span className="flex items-center gap-1.5"><MapPinIcon className="h-3 w-3 opacity-50"/> {event.location}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* Line Items Table */}
                <section className="flex-grow">
                    {Object.entries(groupedItems).map(([title, items]) => renderItemsTable(title, items as CostTrackerItem[]))}
                </section>
                
                {/* Financial Summary */}
                <section className="flex justify-end mb-12 break-inside-avoid">
                     <div className={`w-full max-w-sm rounded-xl p-6 ${layoutStyle === 'bold' ? 'bg-gray-100' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(calculations.subtotal)}</span>
                            </div>
                             <div className="flex justify-between text-gray-600">
                                <span>VAT ({details.taxRate}%)</span>
                                <span>{formatCurrency(calculations.salesTax)}</span>
                            </div>
                            {details.otherCharges.amount !== 0 && (
                                 <div className="flex justify-between text-gray-600">
                                    <span>{details.otherCharges.description}</span>
                                    <span>{formatCurrency(calculations.other)}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-end">
                                <span className="font-bold text-lg text-gray-900">Grand Total</span>
                                <span className="font-black text-2xl" style={{ color: details.primaryColor }}>{formatCurrency(calculations.total)}</span>
                            </div>
                        </div>
                     </div>
                </section>

                {/* Terms & Footer */}
                <div className="mt-auto break-inside-avoid pb-8">
                    <section className="grid grid-cols-2 gap-12 text-xs text-gray-500 border-t border-gray-200 pt-8 mb-8">
                        <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wide mb-2">Terms & Conditions</h4>
                            <p className="whitespace-pre-line leading-relaxed">{details.termsAndConditions}</p>
                        </div>
                        <div className="flex flex-col justify-end">
                                <div className="border-b-2 border-gray-200 h-16 w-full mb-2"></div>
                                <div className="flex justify-between font-medium text-gray-400">
                                    <span>Authorized Signature</span>
                                    <span>Date</span>
                                </div>
                        </div>
                    </section>

                    {/* JAG/Bold Footer Style */}
                    {layoutStyle === 'bold' && (
                         <div className="w-full h-12 flex items-center justify-center text-white font-bold tracking-widest uppercase text-xs" style={{ backgroundColor: details.primaryColor }}>
                             {details.website || 'Thank You'}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
});

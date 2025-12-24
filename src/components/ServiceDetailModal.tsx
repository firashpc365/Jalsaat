
import React, { useRef, useState, useEffect } from 'react';
import type { ServiceItem } from '../types';
import { SparkleIcon, DocumentTextIcon, XIcon, ChevronDownIcon, CheckCircleIcon, BoltIcon } from './common/icons';

interface ServiceDetailModalProps {
  service: ServiceItem;
  onClose: () => void;
  overridePriceVisibility?: boolean;
  overrideShowMenu?: boolean;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop";

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ service, onClose, overridePriceVisibility, overrideShowMenu }) => {
    const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : service.displayPrice !== false;
    const showMenu = overrideShowMenu !== undefined ? overrideShowMenu : true;
    
    const contentRef = useRef<HTMLDivElement>(null);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);

    const checkScroll = () => {
        if (contentRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            // Show indicator if content is scrollable and not near bottom
            const isScrollable = scrollHeight > clientHeight;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 20;
            setShowScrollIndicator(isScrollable && !isNearBottom);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    const handleScrollDown = () => {
        if (contentRef.current) {
            contentRef.current.scrollBy({ top: 200, behavior: 'smooth' });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in-item" onClick={onClose}>
            <div 
                className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border max-h-[90vh] md:max-h-[85vh] h-full"
                style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}
                onClick={(e) => e.stopPropagation()}
            >
                 <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition shadow-lg backdrop-blur-sm group"
                    title="Close"
                 >
                    <XIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </button>

                {/* Image Section (40% width on Desktop) */}
                <div className="w-full md:w-2/5 relative h-64 md:h-auto group bg-black flex-shrink-0">
                    <img 
                        src={service.imageUrl || PLACEHOLDER_IMAGE} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        alt={service.name}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden pointer-events-none"></div>
                    
                    {/* Floating Badges on Image */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {service.isFeatured && (
                            <div className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-bold uppercase flex items-center gap-1 shadow-lg backdrop-blur-md">
                                <SparkleIcon className="h-3 w-3"/> Featured
                            </div>
                        )}
                        <div className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold uppercase border border-white/10 backdrop-blur-md">
                            {service.category}
                        </div>
                    </div>
                </div>

                {/* Content Section Wrapper (60% width) */}
                <div className="w-full md:w-3/5 relative flex flex-col bg-[var(--card-container-color)] h-full overflow-hidden">
                    
                    {/* Header - Sticky on Desktop inside the col if needed, but static here for simplicity */}
                    <div className="p-6 md:p-8 border-b border-white/5 pb-6 bg-gradient-to-b from-white/5 to-transparent">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary-color)] mb-2 leading-tight">{service.name}</h2>
                        <div className="flex items-center gap-3 mt-3">
                             <div className="flex items-baseline gap-1">
                                 <span className="text-2xl font-mono font-bold text-green-400 tracking-tight">
                                     {showPrice && (service.basePrice || service.basePrice === 0) ? `SAR ${(service.basePrice || 0).toLocaleString()}` : 'Price on Request'}
                                 </span>
                                 {showPrice && service.pricingType && <span className="text-sm text-[var(--text-secondary-color)] font-medium">/ {service.pricingType}</span>}
                             </div>
                             {service.minQuantity && service.minQuantity > 1 && (
                                 <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                     Min Qty: {service.minQuantity}
                                 </span>
                             )}
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div 
                        className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8"
                        ref={contentRef}
                        onScroll={checkScroll}
                    >
                         {/* Description */}
                         <section>
                             <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)] mb-3 flex items-center gap-2 opacity-70">
                                About this Service
                             </h4>
                             <div className="prose prose-sm text-[var(--text-primary-color)] leading-relaxed opacity-90">
                                 <p>{service.description}</p>
                             </div>
                         </section>

                         {/* Features Grid */}
                         {service.keyFeatures && service.keyFeatures.length > 0 && (
                             <section className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
                                 <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-4 flex items-center gap-2">
                                     <BoltIcon className="h-4 w-4"/> Highlights
                                 </h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                     {service.keyFeatures.map((feature, idx) => (
                                         <div key={idx} className="flex items-start gap-2.5">
                                             <SparkleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0 opacity-70" />
                                             <span className="text-sm text-[var(--text-primary-color)]">{feature}</span>
                                         </div>
                                     ))}
                                 </div>
                             </section>
                         )}

                         {/* Menu Options (Collapsible or Card) */}
                         {showMenu && service.menuOptions && service.menuOptions.length > 0 && (
                             <section className="bg-white/5 p-5 rounded-2xl border border-white/10">
                                 <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary-color)] mb-4 flex items-center gap-2">
                                     <DocumentTextIcon className="h-4 w-4 text-[var(--primary-accent-color)]"/> What's Included
                                 </h4>
                                 <ul className="space-y-3">
                                     {service.menuOptions.map((option, i) => (
                                         <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary-color)] group">
                                             <CheckCircleIcon className="h-5 w-5 text-green-500/50 group-hover:text-green-400 transition-colors flex-shrink-0" />
                                             <span className="group-hover:text-white transition-colors">{option}</span>
                                         </li>
                                     ))}
                                 </ul>
                             </section>
                         )}
                             
                         {/* Tags */}
                         {service.tags && service.tags.length > 0 && (
                             <section>
                                 <div className="flex flex-wrap gap-2">
                                     {service.tags.map((tag, idx) => (
                                         <span key={idx} className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary-color)] bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-1 hover:bg-black/40 transition-colors cursor-default">
                                             <span className="opacity-30">#</span>{tag}
                                         </span>
                                     ))}
                                 </div>
                             </section>
                         )}
                         
                         {/* Spacing for bottom scrolling */}
                         <div className="h-4"></div>
                    </div>

                    {/* Scroll Indicator */}
                    <div 
                        className={`absolute bottom-24 left-1/2 -translate-x-1/2 transition-all duration-500 z-10 pointer-events-none ${showScrollIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    >
                         <button 
                            onClick={handleScrollDown}
                            className="bg-[var(--primary-accent-color)] p-2 rounded-full text-white animate-bounce shadow-lg pointer-events-auto hover:bg-opacity-80 transition-colors"
                            aria-label="Scroll Down"
                        >
                             <ChevronDownIcon className="h-5 w-5" />
                         </button>
                    </div>
                     
                     {/* Sticky Footer Actions */}
                     <div className="p-4 md:p-6 border-t border-white/10 bg-[var(--card-container-color)] z-20 mt-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        <button 
                            onClick={onClose} 
                            className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] bg-[var(--primary-accent-color)] hover:brightness-110 flex items-center justify-center gap-2"
                        >
                            <span>Close Details</span>
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

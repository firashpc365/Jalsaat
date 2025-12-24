
import React, { useState, useMemo } from 'react';
import type { ServiceItem, AppSettings } from '../types';
import { ServiceDetailModal } from './ServiceDetailModal';
import { SparkleIcon, Squares2X2Icon, ListBulletIcon, EyeIcon } from './common/icons';

interface ServiceCatalogueProps {
    services: ServiceItem[];
    settings: AppSettings;
    isSelectionMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    forcedLayout?: 'boutique' | 'ledger' | 'spotlight';
    hideControls?: boolean;
    customTitle?: string;
    coverImage?: string;
    introText?: string;
    overridePriceVisibility?: boolean;
    overrideShowMenu?: boolean;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop";

export const ServiceCatalogue: React.FC<ServiceCatalogueProps> = ({
    services,
    settings,
    isSelectionMode = false,
    selectedIds = new Set(),
    onToggleSelect,
    forcedLayout,
    hideControls = false,
    customTitle,
    coverImage,
    introText,
    overridePriceVisibility,
    overrideShowMenu
}) => {
    const [layout, setLayout] = useState<'boutique' | 'ledger' | 'spotlight'>(forcedLayout || 'boutique');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

    const categories = useMemo(() => ['All', ...Array.from(new Set(services.map(s => s.category))).sort()], [services]);

    const filteredServices = useMemo(() => {
        return activeCategory === 'All' ? services : services.filter(s => s.category === activeCategory);
    }, [services, activeCategory]);

    React.useEffect(() => {
        if (forcedLayout) setLayout(forcedLayout);
    }, [forcedLayout]);

    const handleCardClick = (service: ServiceItem) => {
        if (isSelectionMode && onToggleSelect) {
            onToggleSelect(service.id);
        } else {
            setSelectedService(service);
        }
    };

    // --- High-End Card Components ---

    const BoutiqueCard: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;
        
        return (
            <div 
                onClick={() => handleCardClick(item)}
                className={`group relative overflow-hidden cursor-pointer transition-all duration-500 ease-out bg-black ${isSelected ? 'ring-2 ring-[var(--primary-accent-color)]' : 'hover:shadow-2xl'}`}
                style={{ borderRadius: settings.layout.borderRadius }}
            >
                <div className="aspect-[3/4] w-full relative overflow-hidden">
                    <img 
                        src={item.imageUrl || PLACEHOLDER_IMAGE} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                    
                    {/* Featured Tag */}
                    {item.isFeatured && (
                        <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2 py-1 rounded border border-white/20">
                            Featured
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 w-full p-5 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary-accent-color)] mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">{item.category}</p>
                        <h3 className="text-xl font-bold text-white mb-1 font-serif leading-tight">{item.name}</h3>
                        
                        <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-500">
                            <p className="text-xs text-gray-300 line-clamp-2 mt-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity delay-100">{item.description}</p>
                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity delay-150">
                                <span className="text-white/60 text-[10px] uppercase font-medium">{item.pricingType}</span>
                                <span className="text-white font-mono font-bold text-sm">
                                    {showPrice && (item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isSelectionMode && (
                        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)] scale-110' : 'border-white/50 bg-black/20'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const LedgerRow: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;

        return (
            <div 
                 onClick={() => handleCardClick(item)}
                 className={`group flex items-center p-4 border-b border-white/5 cursor-pointer transition-all duration-300 hover:bg-white/5 relative ${isSelected ? 'bg-[var(--primary-accent-color)]/10' : ''}`}
            >
                <div className="w-16 h-16 flex-shrink-0 mr-4 relative overflow-hidden rounded-lg bg-black/40">
                    <img 
                        src={item.imageUrl || PLACEHOLDER_IMAGE} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                </div>
                
                <div className="flex-grow min-w-0 pr-4">
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-[var(--primary-accent-color)] transition-colors">{item.name}</h3>
                        {item.isFeatured && <SparkleIcon className="h-3 w-3 text-yellow-400" />}
                     </div>
                     <p className="text-xs text-slate-400 truncate">{item.description}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 px-1.5 py-0.5 rounded">{item.category}</span>
                        {item.keyFeatures && item.keyFeatures[0] && <span className="text-[10px] text-slate-500">• {item.keyFeatures[0]}</span>}
                     </div>
                </div>

                <div className="text-right flex-shrink-0">
                     <p className="font-mono font-bold text-white text-sm">
                        {showPrice && (item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : <span className="text-xs italic opacity-50">Custom</span>}
                     </p>
                     <p className="text-[10px] text-slate-500 uppercase">{item.pricingType}</p>
                </div>

                {isSelectionMode && (
                     <div className={`ml-4 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'border-slate-600'}`}>
                         {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                     </div>
                )}
            </div>
        );
    };

    const SpotlightCard: React.FC<{ item: ServiceItem }> = ({ item }) => {
        const isSelected = selectedIds.has(item.id);
        const showPrice = overridePriceVisibility !== undefined ? overridePriceVisibility : item.displayPrice !== false;

        return (
            <div 
                onClick={() => handleCardClick(item)}
                className={`group relative col-span-1 md:col-span-2 overflow-hidden cursor-pointer min-h-[400px] shadow-2xl transition-all duration-500 ${isSelected ? 'ring-4 ring-[var(--primary-accent-color)]' : 'hover:-translate-y-1'}`}
                style={{ borderRadius: settings.layout.borderRadius }}
            >
                 <div className="absolute inset-0 bg-black">
                     <img 
                        src={item.imageUrl || PLACEHOLDER_IMAGE} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 opacity-80"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                 </div>

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-20 flex flex-col items-start">
                     <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-[0.2em] text-white uppercase bg-[var(--primary-accent-color)]/90 backdrop-blur-md rounded-full border border-white/20">
                        {item.category}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg font-serif leading-none tracking-tight">{item.name}</h2>
                    <p className="text-lg text-gray-200 max-w-2xl line-clamp-2 drop-shadow-md font-light mb-6">{item.description}</p>
                    
                    <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all duration-700 transform translate-y-4 group-hover:translate-y-0">
                         {showPrice && (
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Starting From</p>
                                <p className="text-2xl font-mono text-[var(--primary-accent-color)] font-bold">
                                    {(item.basePrice || item.basePrice === 0) ? `SAR ${(item.basePrice || 0).toLocaleString()}` : 'Price on Request'}
                                </p>
                            </div>
                        )}
                         <div className="h-8 w-px bg-white/20"></div>
                         <button className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors text-sm uppercase tracking-wide">
                            View Details
                        </button>
                    </div>
                </div>
                
                 {isSelectionMode && (
                     <div className={`absolute top-6 right-6 w-8 h-8 rounded-full border-2 flex items-center justify-center z-30 ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'border-white bg-black/30'}`}>
                        {isSelected && <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="w-full h-full flex flex-col bg-[#020617] text-white overflow-hidden relative">
            
            {/* Hero Section */}
            <div className="relative w-full h-64 md:h-80 flex-shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
                <div 
                    className="absolute inset-0 bg-cover bg-center z-0 scale-105 blur-sm opacity-60" 
                    style={{ backgroundImage: `url(${coverImage || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'})` }}
                ></div>
                
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-transparent to-[#020617]">
                    <p className="text-[10px] md:text-xs font-bold tracking-[0.4em] text-[var(--primary-accent-color)] uppercase mb-4 md:mb-6 animate-fade-in-up">
                        Kanchana Events Hub
                    </p>
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 max-w-4xl leading-tight animate-fade-in-up drop-shadow-2xl" style={{ animationDelay: '0.1s' }}>
                        {customTitle || "Curated Service Collection"}
                    </h1>
                    {introText && (
                        <div className="relative">
                            <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--primary-accent-color)]"></div>
                            <p className="text-sm md:text-lg text-gray-300 max-w-2xl animate-fade-in-up leading-relaxed font-light italic pl-4" style={{ animationDelay: '0.2s' }}>
                                "{introText}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Controls Bar */}
                {!hideControls && (
                    <div className="absolute bottom-0 left-0 w-full z-30 p-4 flex flex-col md:flex-row justify-between items-center md:items-end gap-4 border-t border-white/5 bg-black/40 backdrop-blur-md">
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto justify-center md:justify-start mask-linear-fade">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white text-black border-white shadow-glow-white' : 'bg-black/30 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
                            {[
                                { id: 'boutique', icon: <Squares2X2Icon className="h-4 w-4"/>, label: 'Grid' },
                                { id: 'ledger', icon: <ListBulletIcon className="h-4 w-4"/>, label: 'List' },
                                { id: 'spotlight', icon: <EyeIcon className="h-4 w-4"/>, label: 'Hero' }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => setLayout(opt.id as any)}
                                    className={`p-2 rounded-md transition-all flex items-center gap-2 ${layout === opt.id ? 'bg-[var(--primary-accent-color)] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    title={opt.label}
                                >
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#020617] relative">
                 {/* Subtle Grid Background */}
                 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

                {filteredServices.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 animate-in-item">
                        <SparkleIcon className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-light">No services found in this category.</p>
                    </div>
                ) : (
                    <div className="relative z-10 max-w-7xl mx-auto">
                        {layout === 'boutique' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {filteredServices.map(service => <BoutiqueCard key={service.id} item={service} />)}
                            </div>
                        )}
                        
                        {layout === 'ledger' && (
                            <div className="flex flex-col gap-2">
                                {filteredServices.map(service => <LedgerRow key={service.id} item={service} />)}
                            </div>
                        )}

                        {layout === 'spotlight' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {filteredServices.map(service => <SpotlightCard key={service.id} item={service} />)}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-24 mb-12 text-center">
                    <div className="inline-flex items-center gap-4 text-slate-600">
                        <div className="w-12 h-px bg-slate-800"></div>
                        <span className="text-[10px] uppercase tracking-[0.3em] font-medium">End of Collection</span>
                        <div className="w-12 h-px bg-slate-800"></div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedService && (
                <ServiceDetailModal 
                    service={selectedService} 
                    onClose={() => setSelectedService(null)}
                    overridePriceVisibility={overridePriceVisibility}
                    overrideShowMenu={overrideShowMenu}
                />
            )}
        </div>
    );
};

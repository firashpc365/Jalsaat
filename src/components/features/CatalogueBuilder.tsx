
// components/features/CatalogueBuilder.tsx
import React, { useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal } from '../common/Modal';
import { ServiceCatalogue } from '../ServiceCatalogue';
import { InputField } from '../common/InputField';
import { InlineSpinner } from '../common/LoadingSpinner';
import { ImageUploader } from '../common/ImageUploader';
import { SparkleIcon, DownloadIcon, EyeIcon, Squares2X2Icon, ListBulletIcon, EditIcon, XIcon, RefreshIcon, HeartIcon, BriefcaseIcon, CakeIcon } from '../common/icons';
import type { ServiceItem, AppSettings, SavedCatalogue, AIInteraction } from '../../types';
import { curateServiceCollection, generateCatalogueConfig } from '../../services/geminiService';

interface CatalogueBuilderProps {
  services: ServiceItem[];
  settings: AppSettings;
  onClose: () => void;
  onSave: (catalogue: SavedCatalogue) => void;
  setError: (message: any) => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

const TEMPLATES = [
    {
        id: 'wedding-luxury',
        name: 'Luxury Wedding',
        icon: <HeartIcon className="h-5 w-5 text-pink-400" />,
        title: 'Eternal Vows Collection',
        intro: 'A curation of our finest services designed to make your special day unforgettable. Elegant, timeless, and bespoke.',
        layout: 'spotlight',
        keywords: ['wedding', 'luxury', 'decor', 'flower', 'cake', 'venue'],
        coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'corp-summit',
        name: 'Corporate Summit',
        icon: <BriefcaseIcon className="h-5 w-5 text-blue-400" />,
        title: 'Global Tech Summit 2024',
        intro: 'Professional AV, seamless logistics, and premium catering solutions for high-impact executive meetings.',
        layout: 'ledger',
        keywords: ['corporate', 'av', 'screen', 'projector', 'coffee', 'lunch'],
        coverImage: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'birthday-bash',
        name: 'Birthday Bash',
        icon: <CakeIcon className="h-5 w-5 text-orange-400" />,
        title: 'Ultimate Birthday Package',
        intro: 'Fun, food, and festivities! Everything you need to celebrate another amazing year.',
        layout: 'boutique',
        keywords: ['birthday', 'party', 'cake', 'entertainment', 'balloon', 'kids'],
        coverImage: 'https://images.unsplash.com/photo-1464349153912-6584a2630758?q=80&w=2070&auto=format&fit=crop'
    }
];

export const CatalogueBuilder: React.FC<CatalogueBuilderProps> = ({ services, settings, onClose, onSave, setError, onLogAIInteraction }) => {
    // State
    const [activeTab, setActiveTab] = useState<'select' | 'design' | 'preview'>('select');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [layout, setLayout] = useState<'boutique' | 'ledger' | 'spotlight'>('boutique');
    const [customTitle, setCustomTitle] = useState('Exclusive Collection');
    const [introText, setIntroText] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [showPrices, setShowPrices] = useState(true);
    const [showMenuDetails, setShowMenuDetails] = useState(true);
    
    // Advanced Design State
    const [force4K, setForce4K] = useState(false);
    const [gridDensity, setGridDensity] = useState< 'compact' | 'standard' | 'spacious' >('standard');
    const [borderRadiusOverride, setBorderRadiusOverride] = useState<number>(settings.layout.borderRadius);
    const [shadowIntensity, setShadowIntensity] = useState<number>(0.5);

    // AI
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isMagicContentLoading, setIsMagicContentLoading] = useState(false);
    
    // Export
    const [isExporting, setIsExporting] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    
    // Presentation Mode
    const [isPresentationMode, setIsPresentationMode] = useState(false);

    // Filter logic for selection tab
    const [filterTerm, setFilterTerm] = useState('');
    const filteredSelectionList = services.filter(s => 
        s.name.toLowerCase().includes(filterTerm.toLowerCase()) || 
        s.category.toLowerCase().includes(filterTerm.toLowerCase())
    );

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };
    
    const handleLoadTemplate = (template: typeof TEMPLATES[0]) => {
        // Smart select based on keywords
        const matchingIds = new Set<string>();
        services.forEach(s => {
            const text = `${s.name} ${s.category} ${s.description}`.toLowerCase();
            if (template.keywords.some(k => text.includes(k))) {
                matchingIds.add(s.id);
            }
        });
        
        // If no matches, pick random 4 for demo
        if (matchingIds.size === 0) {
            services.slice(0, 4).forEach(s => matchingIds.add(s.id));
        }

        setSelectedIds(matchingIds);
        setCustomTitle(template.title);
        setIntroText(template.intro);
        setLayout(template.layout as any);
        setCoverImage(template.coverImage);
        setActiveTab('design'); // Auto-advance
    };

    const handleAiCurate = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiLoading(true);
        try {
            const { serviceIds, fullPrompt } = await curateServiceCollection(aiPrompt, services);
            onLogAIInteraction({
                feature: 'curate_catalogue',
                promptSummary: `Curate for: ${aiPrompt}`,
                fullPrompt: fullPrompt,
                response: JSON.stringify(serviceIds)
            });
            setSelectedIds(new Set(serviceIds));
            setActiveTab('design'); // Move to design step
        } catch (e) {
            setError(e);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleMagicContent = async () => {
        if (selectedIds.size === 0) {
            setError("Please select some services first.");
            return;
        }
        setIsMagicContentLoading(true);
        try {
            const { title, intro, fullPrompt } = await generateCatalogueConfig(Array.from(selectedIds), services);
            onLogAIInteraction({
                feature: 'catalogue_content',
                promptSummary: `Generate catalogue title/intro`,
                fullPrompt: fullPrompt,
                response: JSON.stringify({ title, intro })
            });
            setCustomTitle(title);
            setIntroText(intro);
        } catch (e) {
            setError(e);
        } finally {
            setIsMagicContentLoading(false);
        }
    };

    const handleDownloadPdf = useCallback(async () => {
        const element = previewRef.current;
        if (!element) return;
        
        const originalHeight = element.style.height;
        const originalOverflow = element.style.overflow;
        element.style.height = 'auto';
        element.style.overflow = 'visible';

        setIsExporting(true);
        try {
            const bg = layout === 'ledger' ? '#0f172a' : settings.colors.background; // Dark background for PDF consistency
            const scale = force4K ? 3 : 2; 

            const canvas = await html2canvas(element, { 
                scale: scale, 
                useCORS: true, 
                backgroundColor: bg,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${customTitle.replace(/[^a-z0-9]/gi, '_')}_Catalogue.pdf`);
        } catch (e) {
            console.error(e);
            setError("Failed to generate PDF. Please try again.");
        } finally {
            element.style.height = originalHeight;
            element.style.overflow = originalOverflow;
            setIsExporting(false);
        }
    }, [layout, settings, customTitle, setError, force4K]);

    const handleSaveCatalogue = () => {
        const catalogue: SavedCatalogue = {
            id: `cat-${Date.now()}`,
            name: customTitle,
            layout,
            serviceIds: Array.from(selectedIds),
            config: { showPrices, showMenuDetails, customTitle, coverImage, introText },
            createdAt: new Date().toISOString()
        };
        onSave(catalogue);
        onClose();
    };

    const selectedServices = services.filter(s => selectedIds.has(s.id));
    const previewSettings = { ...settings, layout: { ...settings.layout, borderRadius: borderRadiusOverride } };

    if (isPresentationMode) {
        return (
            <div className="fixed inset-0 z-[200] bg-slate-900 overflow-hidden flex flex-col animate-in-item">
                <button onClick={() => setIsPresentationMode(false)} className="absolute top-6 right-6 z-50 p-3 bg-white/10 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-md shadow-lg group border border-white/10">
                    <XIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </button>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-0" ref={previewRef}>
                    <ServiceCatalogue 
                        services={selectedServices} 
                        settings={previewSettings}
                        forcedLayout={layout}
                        hideControls={true}
                        customTitle={customTitle}
                        coverImage={coverImage}
                        introText={introText}
                        overridePriceVisibility={showPrices}
                        overrideShowMenu={showMenuDetails}
                    />
                </div>
            </div>
        );
    }

    return (
        <Modal title="Catalogue Studio" onClose={onClose} size="full" footer={null}>
            <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-xl border border-[var(--border-color)] bg-[#0f172a]">
                
                {/* CONTROLS SIDEBAR */}
                <div className="w-1/3 min-w-[340px] flex flex-col border-r border-white/5 bg-[#1e293b]">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        <button onClick={() => setActiveTab('select')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'select' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)] bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>Selection</button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'design' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)] bg-white/5' : 'text-slate-400 hover:bg-white/5'}`}>Design</button>
                    </div>

                    {/* Controls Scroll Area */}
                    <div className="flex-grow overflow-y-auto p-5 custom-scrollbar">
                        {activeTab === 'select' && (
                            <div className="space-y-6 animate-in-item">
                                {/* Templates Section */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Load Template</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {TEMPLATES.map(t => (
                                            <button 
                                                key={t.id}
                                                onClick={() => handleLoadTemplate(t)}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                                            >
                                                <div className="p-2 bg-black/20 rounded-lg group-hover:scale-110 transition-transform">{t.icon}</div>
                                                <div>
                                                    <span className="block text-sm font-bold text-white">{t.name}</span>
                                                    <span className="text-[10px] text-slate-400">{t.layout} layout</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-white/10"></div>

                                {/* AI Curator */}
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 shadow-lg">
                                    <h3 className="text-sm font-bold text-purple-200 mb-2 flex items-center gap-2"><SparkleIcon className="h-4 w-4"/> AI Curator</h3>
                                    <p className="text-xs text-purple-300/70 mb-3 leading-relaxed">Tell me your event theme, and I'll pick the perfect services for you.</p>
                                    <textarea 
                                        rows={2}
                                        placeholder="e.g. High-End Summer Wedding with floral theme..."
                                        className="w-full text-xs p-3 rounded-lg bg-black/40 border border-purple-500/30 focus:ring-1 focus:ring-purple-500 outline-none mb-3 text-white placeholder-purple-400/30 resize-none"
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAiCurate}
                                        disabled={isAiLoading}
                                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                                    >
                                        {isAiLoading ? <InlineSpinner/> : 'Curate Selection'}
                                    </button>
                                </div>

                                {/* Manual List */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                         <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Library</h4>
                                         <span className="text-xs bg-[var(--primary-accent-color)] text-white px-2 py-0.5 rounded-full font-bold">{selectedIds.size} Selected</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Filter services..." 
                                        className="w-full p-3 mb-3 text-xs bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-[var(--primary-accent-color)] text-white"
                                        value={filterTerm}
                                        onChange={e => setFilterTerm(e.target.value)}
                                    />
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {filteredSelectionList.map(s => (
                                            <div key={s.id} onClick={() => handleToggleSelect(s.id)} className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${selectedIds.has(s.id) ? 'bg-[var(--primary-accent-color)]/10 border-[var(--primary-accent-color)]/30' : 'bg-black/20 border-transparent hover:bg-white/5'}`}>
                                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(s.id) ? 'bg-[var(--primary-accent-color)] border-transparent' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                                    {selectedIds.has(s.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                                                </div>
                                                <div className="overflow-hidden flex-grow">
                                                    <p className="text-sm font-medium truncate text-slate-200">{s.name}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{s.category}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedIds.size > 0 && (
                                        <button onClick={() => setSelectedIds(new Set())} className="mt-3 text-xs text-red-400 hover:text-red-300 w-full text-right flex items-center justify-end gap-1"><RefreshIcon className="h-3 w-3"/> Reset Selection</button>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="space-y-8 animate-in-item">
                                {/* Layout Selector */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-3 block text-slate-400">Layout</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'boutique', icon: <Squares2X2Icon className="h-6 w-6"/>, label: 'Boutique' },
                                            { id: 'ledger', icon: <ListBulletIcon className="h-6 w-6"/>, label: 'Ledger' },
                                            { id: 'spotlight', icon: <EyeIcon className="h-6 w-6"/>, label: 'Spotlight' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => setLayout(opt.id as any)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${layout === opt.id ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)] text-white shadow-lg scale-105' : 'bg-black/20 border-white/5 hover:bg-white/5 text-slate-400'}`}
                                            >
                                                {opt.icon}
                                                <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Config */}
                                <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Content</h4>
                                        <button onClick={handleMagicContent} disabled={isMagicContentLoading} className="text-xs text-purple-400 flex items-center gap-1 hover:text-purple-300 font-bold uppercase tracking-wide">
                                            {isMagicContentLoading ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3"/> Magic Write</>}
                                        </button>
                                    </div>
                                    <InputField label="Collection Title" value={customTitle} onChange={e => setCustomTitle(e.target.value)} />
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary-color)'}}>Introduction</label>
                                        <textarea 
                                            rows={3} 
                                            className="w-full p-3 rounded-lg border bg-black/30 text-sm focus:outline-none focus:border-[var(--primary-accent-color)] resize-none"
                                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                            value={introText}
                                            onChange={e => setIntroText(e.target.value)}
                                            placeholder="Write a compelling introduction..."
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider mb-3 block text-slate-400">Cover Visual</label>
                                    <ImageUploader label="Upload High-Res Cover" onImageSelected={b64 => setCoverImage(b64)} initialImage={coverImage} maxSize={3840} />
                                </div>

                                {/* Styling Tweaks */}
                                <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Fine Tuning</h4>
                                    <div>
                                        <div className="flex justify-between text-xs mb-2">
                                            <label className="text-slate-300">Corner Radius</label>
                                            <span className="font-mono text-slate-500">{borderRadiusOverride}px</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="32" step="4" 
                                            value={borderRadiusOverride} 
                                            onChange={e => setBorderRadiusOverride(Number(e.target.value))}
                                            className="w-full h-1.5 rounded-full bg-slate-700 appearance-none cursor-pointer accent-[var(--primary-accent-color)]"
                                        />
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Show Pricing</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${showPrices ? 'bg-[var(--primary-accent-color)]' : 'bg-slate-700'}`}>
                                                <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} className="sr-only" />
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showPrices ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Show Menu Details</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${showMenuDetails ? 'bg-[var(--primary-accent-color)]' : 'bg-slate-700'}`}>
                                                <input type="checkbox" checked={showMenuDetails} onChange={e => setShowMenuDetails(e.target.checked)} className="sr-only" />
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showMenuDetails ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Force 4K Export</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${force4K ? 'bg-[var(--primary-accent-color)]' : 'bg-slate-700'}`}>
                                                <input type="checkbox" checked={force4K} onChange={e => setForce4K(e.target.checked)} className="sr-only" />
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${force4K ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-5 border-t border-white/5 bg-[#162032]">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button onClick={() => window.print()} className="py-2.5 border border-white/10 hover:bg-white/5 rounded-lg text-xs font-bold uppercase text-slate-300 transition-colors">Print</button>
                            <button onClick={handleSaveCatalogue} disabled={selectedIds.size === 0} className="py-2.5 bg-white text-black rounded-lg text-xs font-bold uppercase hover:bg-slate-200 transition-colors disabled:opacity-50">Save</button>
                        </div>
                        <button onClick={() => setIsPresentationMode(true)} className="w-full py-3 mb-3 text-sm font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition rounded-lg flex items-center justify-center gap-2 border border-blue-500/20">
                            <EyeIcon className="h-4 w-4" /> Live Presentation
                        </button>
                        <button onClick={handleDownloadPdf} disabled={isExporting || selectedIds.size === 0} className="w-full py-3 bg-[var(--primary-accent-color)] text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-[var(--primary-accent-color)]/25 hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                            {isExporting ? <InlineSpinner/> : <><DownloadIcon className="h-4 w-4"/> Export High-Res PDF</>}
                        </button>
                    </div>
                </div>

                {/* PREVIEW CANVAS */}
                <div className="flex-grow bg-[#0f172a] relative flex flex-col overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[#0f172a]/80 to-transparent z-10 pointer-events-none"></div>
                     <div className="absolute top-4 right-6 z-20 flex items-center gap-2 pointer-events-none">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Preview</span>
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     </div>
                     
                     <div className="flex-grow overflow-y-auto custom-scrollbar p-0" ref={previewRef}>
                         {selectedServices.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                 <SparkleIcon className="h-16 w-16 mb-4 opacity-20" />
                                 <p className="text-lg font-light">Select services to begin.</p>
                             </div>
                         ) : (
                            <div className="min-h-full">
                                <ServiceCatalogue 
                                    services={selectedServices} 
                                    settings={previewSettings}
                                    forcedLayout={layout}
                                    hideControls={true}
                                    customTitle={customTitle}
                                    coverImage={coverImage}
                                    introText={introText}
                                    overridePriceVisibility={showPrices}
                                    overrideShowMenu={showMenuDetails}
                                />
                            </div>
                         )}
                     </div>
                </div>
            </div>
        </Modal>
    );
};

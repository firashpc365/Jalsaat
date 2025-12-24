
// components/features/QuotationGenerator.tsx
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { Modal } from '../common/Modal';
import { InputField } from '../common/InputField';
import { InlineSpinner } from '../common/LoadingSpinner';
import { QuotationPreview } from './QuotationPreview';
import { PromptItemEditor } from './PromptItemEditor';
import { generateTermsAndConditions } from '../../services/geminiService';
import type { EventItem, ServiceItem, CostTrackerItem, QuotationTemplate, QuotationDetails, AIInteraction, AppSettings } from '../../types';
import { DownloadIcon, SparkleIcon, EditIcon, TrashIcon, EyeIcon, DocumentTextIcon, CheckCircleIcon, Squares2X2Icon, BriefcaseIcon, StarIcon } from '../common/icons';
import { ImageUploader } from '../common/ImageUploader';

interface QuotationGeneratorProps {
  event: EventItem;
  services: ServiceItem[];
  templates: QuotationTemplate[];
  appSettings: AppSettings;
  onClose: () => void;
  setError: (error: any) => void;
  setSuccess: (message: string) => void;
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
  onAddTemplate: (templateData: Omit<QuotationTemplate, 'templateId'>) => void;
  onUpdateTemplate: (templateId: string, data: Partial<QuotationTemplate>) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const initialDetails: Omit<QuotationDetails, 'quotationId' | 'validUntil' | 'primaryColor'> = {
    companyName: 'Elitepro Events and Advertising',
    companyAddress: 'Al Souq, Dammam 32242',
    contactPerson: 'Firash',
    contactEmail: 'firash@eliteproeventsksa.com',
    website: 'www.eliteproeventsksa.com',
    termsAndConditions: '1. 50% advance payment required to confirm the booking.\n2. Cancellation within 14 days of the event is non-refundable.',
    taxRate: 15,
    otherCharges: { description: 'Service Charge', amount: 0 }
};

export const QuotationGenerator: React.FC<QuotationGeneratorProps> = ({
    event, services, templates, appSettings, onClose, setError, setSuccess, onUpdateEvent, onLogInteraction, onAddTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'details' | 'items' | 'branding'>('templates');
  const [details, setDetails] = useState<QuotationDetails>({
    ...initialDetails,
    primaryColor: appSettings.colors.primaryAccent,
    quotationId: event.quotationId || `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  
  // Layout Style State for Preview (Modern, Minimal, Bold/JAG)
  const [layoutStyle, setLayoutStyle] = useState<'modern' | 'minimal' | 'bold'>('modern');

  const [lineItems, setLineItems] = useState<CostTrackerItem[]>(event.cost_tracker || []);
  const [includedItems, setIncludedItems] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      (event.cost_tracker || []).forEach(item => {
          initial[item.itemId] = true;
      });
      return initial;
  });

  const [editingItem, setEditingItem] = useState<CostTrackerItem | null>(null);
  const [isGeneratingTerms, setIsGeneratingTerms] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Mobile Responsiveness State
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  const handleDetailChange = (field: keyof QuotationDetails, value: any) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateTerms = useCallback(async () => {
    setIsGeneratingTerms(true);
    setError(null);
    try {
        const { result, fullPrompt } = await generateTermsAndConditions(event);
        handleDetailChange('termsAndConditions', result);
        onLogInteraction({
            feature: 'terms', promptSummary: `Generate T&Cs for ${event.name}`,
            fullPrompt, response: result, model: 'gemini-2.5-flash',
        });
    } catch(e) { setError(e); } finally { setIsGeneratingTerms(false); }
  }, [event, setError, onLogInteraction]);

  const filteredLineItems = useMemo(() => {
      return lineItems.filter(item => includedItems[item.itemId]);
  }, [lineItems, includedItems]);

  const handleDownloadPdf = useCallback(async () => {
    const element = previewRef.current;
    if (!element) {
      setError(new Error("Quotation content not found."));
      return;
    }

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const data = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = position - pdf.internal.pageSize.getHeight();
        pdf.addPage();
        pdf.addImage(data, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`Quotation-${details.quotationId}.pdf`);
      setSuccess('PDF downloaded successfully!');
    } catch (e) {
      setError(new Error('Failed to generate PDF.'));
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  }, [details.quotationId, setError, setSuccess]);
  
  const handleSaveChanges = () => {
      onUpdateEvent(event.eventId, { quotationId: details.quotationId });
      setSuccess(`Quotation #${details.quotationId} details updated.`);
      onClose();
  };
  
  const handleSaveTemplate = () => {
    if (!templateName) { setError(new Error('Please provide a name for the template.')); return; }
    
    onAddTemplate({ 
        templateName, 
        details, 
        lineItems: filteredLineItems 
    });
    setTemplateName('');
    setSuccess(`Template "${templateName}" saved.`);
  };
  
  const handleLoadTemplate = (template: QuotationTemplate) => {
      setDetails(prev => ({ ...prev, ...template.details }));
      // Special Handling for JAG Template to set the Bold Layout
      if (template.templateName.includes('JAG')) {
          setLayoutStyle('bold');
      } else {
          setLayoutStyle('modern');
      }

      if (template.lineItems?.length) {
        const newItems: CostTrackerItem[] = template.lineItems.map(li => {
            const service = services.find(s => s.id === li.masterServiceId);
            return {
                itemId: li.itemId || `custom-${Date.now()}-${Math.random()}`,
                masterServiceId: li.masterServiceId,
                name: li.name || service?.name || 'Custom Item',
                description: li.description || service?.description,
                quantity: li.quantity || 1,
                unit_cost_sar: li.unit_cost_sar ?? (service?.basePrice || 0) * 0.6,
                client_price_sar: li.client_price_sar ?? service?.basePrice ?? 0,
                imageUrl: li.imageUrl || service?.imageUrl,
            };
        });
        setLineItems(newItems);
        const newIncluded: Record<string, boolean> = {};
        newItems.forEach(i => newIncluded[i.itemId] = true);
        setIncludedItems(newIncluded);
      }
      setSuccess(`Template "${template.templateName}" loaded.`);
      setActiveTab('details'); // Move to details after load
  };

  const handleUpdateItem = (updatedItem: CostTrackerItem) => {
    setLineItems(prev => prev.map(item => item.itemId === updatedItem.itemId ? { ...updatedItem } : item));
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setLineItems(prev => prev.filter(item => item.itemId !== itemId));
    const newIncluded = { ...includedItems };
    delete newIncluded[itemId];
    setIncludedItems(newIncluded);
  };

  const toggleItemInclusion = (itemId: string) => {
      setIncludedItems(prev => ({
          ...prev,
          [itemId]: !prev[itemId]
      }));
  };

  const customFooter = (
    <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3 bg-[var(--card-container-color)]">
        <button
            onClick={onClose}
            className="px-4 py-3 text-sm font-medium hover:bg-black/20 transition rounded-xl flex-grow sm:flex-grow-0"
            style={{ 
              color: 'var(--text-primary-color)',
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
        >
            Cancel
        </button>
        <button 
            onClick={handleDownloadPdf} 
            disabled={isDownloading} 
            className="px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-green-800 disabled:cursor-not-allowed flex-grow sm:flex-grow-0"
        >
            {isDownloading ? 'Processing...' : <><DownloadIcon className="h-5 w-5"/> Export PDF</>}
        </button>
        <button
            onClick={handleSaveChanges}
            className="px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition rounded-xl flex-grow sm:flex-grow-0"
            style={{ 
              backgroundColor: 'var(--primary-accent-color)',
            }}
        >
            Save Quote
        </button>
    </div>
  );

  return (
    <>
        <Modal title="Quotation Studio" onClose={onClose} size="full" footer={customFooter}>
            <div className="flex flex-col h-[calc(100vh-140px)]">
                
                {/* Mobile Tab Switcher */}
                <div className="flex lg:hidden border-b border-white/10 mb-4 shrink-0">
                    <button
                        onClick={() => setMobileTab('editor')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${mobileTab === 'editor' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)]'}`}
                    >
                        <EditIcon className="inline h-4 w-4 mr-2" /> Editor
                    </button>
                    <button
                        onClick={() => setMobileTab('preview')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${mobileTab === 'preview' ? 'border-[var(--primary-accent-color)] text-[var(--primary-accent-color)]' : 'border-transparent text-[var(--text-secondary-color)]'}`}
                    >
                        <EyeIcon className="inline h-4 w-4 mr-2" /> Preview
                    </button>
                </div>

                <div className="flex-grow lg:grid lg:grid-cols-12 lg:gap-8 overflow-hidden relative">
                    {/* Editor Panel */}
                    <div className={`h-full flex flex-col lg:col-span-4 pb-4 ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
                        
                        {/* Editor Tabs */}
                        <div className="flex border-b border-white/10 mb-4 shrink-0">
                            <button onClick={() => setActiveTab('templates')} className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'templates' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Templates</button>
                            <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'details' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Info</button>
                            <button onClick={() => setActiveTab('items')} className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'items' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Items</button>
                            <button onClick={() => setActiveTab('branding')} className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${activeTab === 'branding' ? 'text-[var(--primary-accent-color)] border-b-2 border-[var(--primary-accent-color)]' : 'text-[var(--text-secondary-color)] hover:text-white'}`}>Style</button>
                        </div>

                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-5">
                            
                            {/* Templates Tab */}
                            {activeTab === 'templates' && (
                                <div className="space-y-4 animate-in-item">
                                    <h3 className="font-bold text-sm text-[var(--text-primary-color)]">Start from a Template</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {/* System Templates */}
                                        {templates.map(t => (
                                            <button 
                                                key={t.templateId}
                                                onClick={() => handleLoadTemplate(t)}
                                                className="group p-4 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 hover:border-[var(--primary-accent-color)] transition-all text-left flex items-start gap-3"
                                            >
                                                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-[var(--primary-accent-color)]/20 transition-colors">
                                                    {t.templateName.includes('JAG') ? <BriefcaseIcon className="h-5 w-5 text-yellow-400"/> : <Squares2X2Icon className="h-5 w-5 text-[var(--primary-accent-color)]"/>}
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-bold text-white">{t.templateName}</span>
                                                    <span className="text-xs text-[var(--text-secondary-color)]">
                                                        {t.templateName.includes('JAG') ? 'Specific layout for Al-Janoub Al-Gharbi.' : 'Standard template.'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="border-t border-white/10 pt-4 mt-2">
                                        <h3 className="font-bold text-sm text-[var(--text-primary-color)] mb-3">Layout Style</h3>
                                        <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                                            <button onClick={() => setLayoutStyle('modern')} className={`flex-1 py-2 text-xs font-bold rounded ${layoutStyle === 'modern' ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}>Modern</button>
                                            <button onClick={() => setLayoutStyle('minimal')} className={`flex-1 py-2 text-xs font-bold rounded ${layoutStyle === 'minimal' ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}>Minimal</button>
                                            <button onClick={() => setLayoutStyle('bold')} className={`flex-1 py-2 text-xs font-bold rounded ${layoutStyle === 'bold' ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}>Bold</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Details Tab */}
                            {activeTab === 'details' && (
                                <div className="space-y-4 animate-in-item">
                                    <InputField label="Quotation ID" value={details.quotationId} onChange={e => handleDetailChange('quotationId', e.target.value)} />
                                    <InputField label="Valid Until" type="date" value={details.validUntil} onChange={e => handleDetailChange('validUntil', e.target.value)} />
                                    <InputField label="Company Name" value={details.companyName} onChange={e => handleDetailChange('companyName', e.target.value)} />
                                    <div className="grid grid-cols-1 gap-3">
                                        <InputField label="Address" value={details.companyAddress || ''} onChange={e => handleDetailChange('companyAddress', e.target.value)} />
                                        <InputField label="Website" value={details.website || ''} onChange={e => handleDetailChange('website', e.target.value)} />
                                        <InputField label="Email" value={details.contactEmail || ''} onChange={e => handleDetailChange('contactEmail', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary-color)' }}>Terms & Conditions</label>
                                        <textarea rows={5} value={details.termsAndConditions} onChange={e => handleDetailChange('termsAndConditions', e.target.value)} 
                                            className="mt-1 block w-full p-3 border rounded-xl text-sm"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                                        />
                                        <button onClick={handleGenerateTerms} disabled={isGeneratingTerms} className="text-xs text-purple-400 flex items-center gap-1 mt-2 hover:text-purple-300 transition-colors">
                                            {isGeneratingTerms ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3"/> AI Enhance Terms</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Items Tab */}
                            {activeTab === 'items' && (
                                <div className="space-y-4 animate-in-item">
                                     <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-bold text-sm text-[var(--text-primary-color)]">
                                            Quotation Items ({filteredLineItems.length})
                                        </h3>
                                        <span className="text-xs text-[var(--text-secondary-color)]">Total: {filteredLineItems.length}</span>
                                    </div>
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {lineItems.map(item => (
                                            <div key={item.itemId} className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${includedItems[item.itemId] ? 'bg-white/5 border-white/10' : 'bg-black/10 border-transparent opacity-60'}`}>
                                                <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!includedItems[item.itemId]} 
                                                        onChange={() => toggleItemInclusion(item.itemId)}
                                                        className="w-4 h-4 rounded text-[var(--primary-accent-color)] focus:ring-0 bg-black/20 border-white/20 flex-shrink-0"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium truncate text-white">{item.name}</p>
                                                        <p className="text-xs opacity-60">Qty: {item.quantity} &times; SAR {item.client_price_sar.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button onClick={() => setEditingItem(item)} className="p-1.5 hover:bg-white/10 rounded text-blue-300" title="Edit Item"><EditIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleRemoveItem(item.itemId)} className="p-1.5 hover:bg-white/10 rounded text-red-400" title="Remove Item"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {lineItems.length === 0 && <p className="text-xs text-center opacity-50 p-4 border border-dashed border-white/10 rounded">No items found.</p>}
                                    </div>
                                </div>
                            )}

                            {/* Branding Tab */}
                            {activeTab === 'branding' && (
                                <div className="space-y-4 animate-in-item">
                                    <ImageUploader label="Company Logo" onImageSelected={base64 => handleDetailChange('companyLogo', base64)} initialImage={details.companyLogo} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <ImageUploader label="Partner Logo 1" onImageSelected={base64 => handleDetailChange('partnerLogo1', base64)} initialImage={details.partnerLogo1} />
                                        <ImageUploader label="Partner Logo 2" onImageSelected={base64 => handleDetailChange('partnerLogo2', base64)} initialImage={details.partnerLogo2} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Primary Color" type="color" value={details.primaryColor} onChange={e => handleDetailChange('primaryColor', e.target.value)} className="h-10 p-1 cursor-pointer" />
                                        <InputField label="Tax Rate (%)" type="number" value={details.taxRate} onChange={e => handleDetailChange('taxRate', Number(e.target.value))} />
                                    </div>
                                    
                                    <div className="border-t pt-4 border-white/10 bg-black/20 p-4 rounded-xl mt-4">
                                        <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary-color)'}}>Save as Template</h3>
                                        <div className="flex gap-2">
                                            <InputField label="" placeholder="New Template Name" value={templateName} onChange={e => setTemplateName(e.target.value)} className="text-sm" />
                                            <button onClick={handleSaveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold h-[42px] mt-1 hover:bg-blue-700 transition">Save</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className={`h-full overflow-hidden bg-slate-200/90 rounded-xl border border-white/10 flex flex-col lg:col-span-8 shadow-inner ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                        <div className="flex-grow overflow-auto custom-scrollbar p-4 md:p-8 flex justify-center items-start">
                            <QuotationPreview 
                                ref={previewRef} 
                                data={{ details, event, lineItems: filteredLineItems }} 
                                layoutStyle={layoutStyle}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
        {editingItem && (
            <PromptItemEditor
                item={editingItem}
                event={event}
                onClose={() => setEditingItem(null)}
                setError={setError}
                onUpdateItem={handleUpdateItem}
                onLogInteraction={onLogInteraction}
            />
        )}
    </>
  );
};

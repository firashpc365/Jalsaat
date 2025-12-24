
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { extractEventItemsFromInput } from '../../services/geminiService';
import type { CostTrackerItem, AIInteraction } from '../../types';
import { TrashIcon, DocumentTextIcon, NetworkIcon, SparkleIcon, UploadIcon, ChartBarIcon, RefreshIcon } from '../common/icons';
import { ProgressBar } from '../common/ProgressBar';

interface SmartItemImporterProps {
  onClose: () => void;
  onAddItems: (items: CostTrackerItem[]) => void;
  setError: (error: any) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const SmartItemImporter: React.FC<SmartItemImporterProps> = ({ onClose, onAddItems, setError, onLogInteraction }) => {
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ name: string; data: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedItems, setParsedItems] = useState<CostTrackerItem[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(true);

  // Totals Calculation
  const totals = useMemo(() => {
      if (!parsedItems) return { count: 0, revenue: 0, cost: 0 };
      return parsedItems.reduce((acc, item) => ({
          count: acc.count + 1,
          revenue: acc.revenue + ((item.client_price_sar || 0) * (item.quantity || 0)),
          cost: acc.cost + ((item.unit_cost_sar || 0) * (item.quantity || 0))
      }), { count: 0, revenue: 0, cost: 0 });
  }, [parsedItems]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 5 : prev));
      }, 800);
    } else if (!isLoading && progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const processFiles = (fileList: FileList | null) => {
    if (fileList) {
        const newFiles = Array.from(fileList);
        setFiles(prev => [...prev, ...newFiles]);

        newFiles.forEach((file: File) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => [...prev, { name: file.name, data: reader.result as string }]);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviews(prev => [...prev, { name: file.name, data: null }]);
            }
        });
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => processFiles(event.target.files);
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(false); processFiles(event.dataTransfer.files);
  };
  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    event.preventDefault(); event.stopPropagation(); setIsDragging(isEntering);
  };
  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAnalyze = useCallback(async () => {
    if (!inputText && files.length === 0) {
      setError(new Error('Please provide text or a file to analyze.'));
      return;
    }
    setIsLoading(true);
    setParsedItems(null);
    setError(null);
    try {
      const { items, interaction } = await extractEventItemsFromInput({ text: inputText, files: files }, useDeepThinking);
      onLogInteraction(interaction as any);
      setParsedItems(items);
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, files, useDeepThinking, setError, onLogInteraction]);

  const handleUpdateItem = (index: number, field: keyof CostTrackerItem, value: any) => {
      setParsedItems(prev => {
          if (!prev) return null;
          const updated = [...prev];
          updated[index] = { ...updated[index], [field]: value };
          return updated;
      });
  };
  
  const handleRemoveItem = (index: number) => {
      setParsedItems(prev => prev ? prev.filter((_, i) => i !== index) : null);
  };

  const handleConfirm = () => {
    if (parsedItems && Array.isArray(parsedItems)) {
        onAddItems(parsedItems);
        onClose();
    } else {
        setError("Invalid item data. Please retry extraction.");
    }
  };
  
  // Render Views
  const renderInputView = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
          <p className="text-sm text-slate-300">Import items from invoices, quotes, or menus.</p>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${useDeepThinking ? 'bg-purple-900/30 border-purple-500/50' : 'bg-slate-800/30 border-slate-600/30'}`} onClick={() => setUseDeepThinking(!useDeepThinking)}>
              <NetworkIcon className={`h-4 w-4 ${useDeepThinking ? 'text-purple-300' : 'text-slate-400'}`} />
              <span className={`text-xs font-bold ${useDeepThinking ? 'text-purple-200' : 'text-slate-400'}`}>Deep Think</span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useDeepThinking ? 'bg-purple-500' : 'bg-slate-600'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${useDeepThinking ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
          </div>
      </div>

      <textarea
        rows={6}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="w-full p-4 border rounded-xl shadow-inner focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:border-transparent transition-all outline-none"
        placeholder="Paste text here (e.g., '2x LED Screen 5x3m @ SAR 1500')..."
        style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
      />
      
      <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR Upload Documents</span>
          <div className="flex-grow border-t border-white/10"></div>
      </div>

      <div
        onDragEnter={e => handleDragEvents(e, true)}
        onDragOver={e => handleDragEvents(e, true)}
        onDragLeave={e => handleDragEvents(e, false)}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center px-6 py-12 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? 'border-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 scale-[1.02]' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
      >
        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} multiple />
        <div className={`p-4 rounded-full bg-black/30 mb-3 transition-transform group-hover:scale-110 shadow-lg`}>
                <UploadIcon className={`h-8 w-8 ${isDragging ? 'text-[var(--primary-accent-color)]' : 'text-slate-400'}`} />
        </div>
        <p className="text-sm font-medium text-center" style={{color: 'var(--text-primary-color)'}}>
            <span className="text-[var(--primary-accent-color)] font-bold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs mt-1 text-slate-500">PDF, Images (PNG, JPG), DOCX, TXT</p>
      </div>
      
      {previews.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {previews.map((preview, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/20 animate-in-item">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {preview.data ? (
                            <img src={preview.data} alt="Preview" className="h-10 w-10 rounded-md object-cover border border-white/10" />
                        ) : (
                            <div className="h-10 w-10 bg-slate-800 rounded-md flex items-center justify-center border border-white/10">
                                <DocumentTextIcon className="h-5 w-5 text-slate-400"/>
                            </div>
                        )}
                        <span className="text-xs font-medium truncate text-slate-300">{preview.name}</span>
                    </div>
                    <button onClick={() => handleRemoveFile(index)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><TrashIcon className="h-4 w-4"/></button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
  
  const renderConfirmationView = () => (
    <div className="flex flex-col h-full overflow-hidden">
        {/* Header Summary */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-white/10 rounded-xl mb-4 shadow-lg shrink-0">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-full text-green-400">
                    <SparkleIcon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">Extraction Successful</h3>
                    <p className="text-xs text-slate-400">Review and refine the extracted items below.</p>
                </div>
            </div>
            <div className="flex gap-4 text-right">
                <div>
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Items</p>
                    <p className="text-xl font-bold text-white">{totals.count}</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div>
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Est. Revenue</p>
                    <p className="text-xl font-bold text-green-400">SAR {totals.revenue.toLocaleString()}</p>
                </div>
            </div>
        </div>

        {/* Smart Grid Headers */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/10 bg-black/20 shrink-0 rounded-t-lg">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Item Description</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Cost (SAR)</div>
            <div className="col-span-2 text-right">Price (SAR)</div>
            <div className="col-span-1 text-center"></div>
        </div>
        
        {/* Smart Grid Body */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-black/10 rounded-b-lg border-x border-b border-white/5">
            {Array.isArray(parsedItems) && parsedItems.map((item, index) => {
                const isPriceMissing = !item.client_price_sar;
                const isNameMissing = !item.name;
                
                return (
                <div key={index} className="grid grid-cols-12 gap-2 p-2 border-b border-white/5 hover:bg-white/5 transition-colors items-start group">
                    <div className="col-span-1 text-center text-xs text-slate-500 py-2">{index + 1}</div>
                    
                    <div className="col-span-5 space-y-1">
                        <input 
                            value={item.name} 
                            onChange={e => handleUpdateItem(index, 'name', e.target.value)} 
                            className={`w-full bg-transparent text-sm font-semibold text-white focus:outline-none placeholder-slate-600 ${isNameMissing ? 'border-b border-red-500/50' : 'border-transparent'}`}
                            placeholder="Item Name (Required)"
                        />
                        <input 
                            value={item.description || ''} 
                            onChange={e => handleUpdateItem(index, 'description', e.target.value)} 
                            className="w-full bg-transparent text-xs text-slate-400 focus:outline-none placeholder-slate-700"
                            placeholder="Description..."
                        />
                    </div>

                    <div className="col-span-1">
                        <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                            className="w-full bg-black/20 rounded p-1 text-center text-xs text-white focus:ring-1 focus:ring-[var(--primary-accent-color)] outline-none"
                        />
                    </div>

                    <div className="col-span-2">
                        <input 
                            type="number" 
                            value={item.unit_cost_sar} 
                            onChange={e => handleUpdateItem(index, 'unit_cost_sar', Number(e.target.value))}
                            className="w-full bg-black/20 rounded p-1 text-right text-xs text-red-300 focus:ring-1 focus:ring-[var(--primary-accent-color)] outline-none"
                        />
                    </div>

                    <div className="col-span-2">
                        <input 
                            type="number" 
                            value={item.client_price_sar} 
                            onChange={e => handleUpdateItem(index, 'client_price_sar', Number(e.target.value))}
                            className={`w-full bg-black/20 rounded p-1 text-right text-xs text-green-300 focus:ring-1 focus:ring-[var(--primary-accent-color)] outline-none ${isPriceMissing ? 'ring-1 ring-yellow-500/50' : ''}`}
                        />
                    </div>

                    <div className="col-span-1 text-center">
                        <button onClick={() => handleRemoveItem(index)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            )})}
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 shrink-0">
            <button onClick={() => setParsedItems(null)} className="text-xs text-slate-500 hover:text-white flex items-center gap-1">
                <RefreshIcon className="h-3 w-3"/> Re-analyze
            </button>
            <div className="text-xs text-slate-500">
                {parsedItems?.filter(i => !i.client_price_sar).length || 0} items with missing price
            </div>
        </div>
    </div>
  );

  return (
    <Modal
      title="Smart Item Importer"
      onClose={onClose}
      onSave={parsedItems ? handleConfirm : handleAnalyze}
      saveText={isLoading ? 'Thinking...' : parsedItems ? `Import ${totals.count} Items` : (useDeepThinking ? 'Deep Extract' : 'Analyze')}
      size="lg"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse"></div>
              <InlineSpinner />
          </div>
          <h3 className="mt-8 text-xl font-bold text-white tracking-tight">
              {useDeepThinking ? "Gemini Pro Reasoning..." : "Analyzing Document..."}
          </h3>
          <p className="mt-2 text-sm text-slate-400 max-w-xs text-center leading-relaxed">
              {useDeepThinking 
                ? "Structuring complex tables, merging context, and verifying pricing models." 
                : "Scanning visual layout and extracting line items..."}
          </p>
          <div className="w-72 mt-6">
              <ProgressBar progress={progress} label="AI Processing" className="h-1" />
          </div>
        </div>
      ) : parsedItems ? (
        renderConfirmationView()
      ) : (
        renderInputView()
      )}
    </Modal>
  );
};

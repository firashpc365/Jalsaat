
// components/features/PromptItemEditor.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { InlineSpinner } from '../common/LoadingSpinner';
import { InputField } from '../common/InputField';
import type { CostTrackerItem, EventItem, AIInteraction } from '../../types';
import { enhanceLineItem, analyzeMarketRate } from '../../services/geminiService';
import { SparkleIcon, TrendingUpIcon, ChartBarIcon, RefreshIcon } from '../common/icons';

interface PromptItemEditorProps {
  item: CostTrackerItem;
  event: EventItem;
  onClose: () => void;
  setError: (error: any) => void;
  onUpdateItem: (updatedItem: CostTrackerItem) => void;
  onLogInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

export const PromptItemEditor: React.FC<PromptItemEditorProps> = ({ item, event, onClose, setError, onUpdateItem, onLogInteraction }) => {
  const [localItem, setLocalItem] = useState<CostTrackerItem>(item);
  const [isLoading, setIsLoading] = useState<'description' | 'pricing' | 'market' | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<{ priceRange: string, reasoning: string } | null>(null);

  // Real-time Margin Calculation
  const marginStats = useMemo(() => {
      const cost = localItem.unit_cost_sar || 0;
      const price = localItem.client_price_sar || 0;
      const profit = price - cost;
      const marginPercent = price > 0 ? (profit / price) * 100 : 0;
      return { profit, marginPercent };
  }, [localItem.unit_cost_sar, localItem.client_price_sar]);

  const handleEnhance = useCallback(async (enhancementType: 'description' | 'pricing') => {
    setIsLoading(enhancementType);
    setError(null);
    try {
      const { result, fullPrompt } = await enhanceLineItem(localItem, event, enhancementType);
      
      onLogInteraction({
          feature: enhancementType,
          promptSummary: `Enhance ${enhancementType} for ${localItem.name}`,
          fullPrompt: fullPrompt,
          response: result,
          model: 'gemini-2.5-flash',
      });

      if (enhancementType === 'description') {
        setLocalItem(prev => ({ ...prev, description: result }));
      } else {
        const cleanNumber = result.replace(/[^0-9.]/g, '');
        const newPrice = parseFloat(cleanNumber);
        
        if (!isNaN(newPrice)) {
          setLocalItem(prev => ({ ...prev, client_price_sar: newPrice }));
        } else {
          setError(new Error(`Gemini returned an invalid price format: "${result}". Please try again.`));
        }
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(null);
    }
  }, [localItem, event, setError, onLogInteraction]);

  const handleCheckMarketRate = useCallback(async () => {
      if (!localItem.name) return;
      setIsLoading('market');
      setMarketAnalysis(null);
      try {
          const { priceRange, reasoning, fullPrompt } = await analyzeMarketRate(localItem.name, event.location);
          setMarketAnalysis({ priceRange, reasoning });
          onLogInteraction({
              feature: 'pricing_suggestion',
              promptSummary: `Check market rate for ${localItem.name} in ${event.location}`,
              fullPrompt,
              response: priceRange,
              model: 'gemini-2.5-flash (Search)',
          });
      } catch (e: any) {
          setError(e);
      } finally {
          setIsLoading(null);
      }
  }, [localItem.name, event.location, setError, onLogInteraction]);
  
  const handleSave = () => {
      if (!localItem.name) {
          setError("Item name is required.");
          return;
      }
      const finalItem = {
          ...localItem,
          quantity: Number(localItem.quantity) || 0,
          unit_cost_sar: Number(localItem.unit_cost_sar) || 0,
          client_price_sar: Number(localItem.client_price_sar) || 0,
      };
      onUpdateItem(finalItem);
  };

  // Determine Gauge Color
  const getGaugeColor = (percent: number) => {
      if (percent < 0) return '#ef4444'; // Red
      if (percent < 20) return '#f59e0b'; // Amber
      return '#22c55e'; // Green
  };

  return (
    <Modal title={`Edit Item: ${item.name}`} onClose={onClose} onSave={handleSave} saveText="Apply Changes" size="lg">
      <div className="space-y-6">
        <InputField label="Item Name" value={localItem.name} onChange={e => setLocalItem(prev => ({...prev, name: e.target.value}))} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Financials */}
            <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-black/20 border border-white/5 relative overflow-hidden">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-[var(--text-secondary-color)]">
                        <ChartBarIcon className="h-4 w-4"/> Profitability Engine
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <InputField label="Unit Cost (SAR)" type="number" min={0} value={localItem.unit_cost_sar} onChange={e => setLocalItem(prev => ({...prev, unit_cost_sar: parseFloat(e.target.value)}))} />
                        <InputField label="Client Price (SAR)" type="number" min={0} value={localItem.client_price_sar} onChange={e => setLocalItem(prev => ({...prev, client_price_sar: parseFloat(e.target.value)}))} />
                    </div>
                    <div className="mb-4">
                        <InputField label="Quantity" type="number" min={1} value={localItem.quantity} onChange={e => setLocalItem(prev => ({...prev, quantity: parseFloat(e.target.value)}))} />
                    </div>

                    {/* Visual Gauge */}
                    <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase text-slate-400 font-bold">Projected Profit</p>
                            <p className={`text-lg font-mono font-bold ${marginStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {marginStats.profit >= 0 ? '+' : ''}SAR {(marginStats.profit * localItem.quantity).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex flex-col items-end">
                             <div className="relative w-12 h-12 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                     <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                                     <circle 
                                        cx="24" cy="24" r="20" 
                                        stroke={getGaugeColor(marginStats.marginPercent)} 
                                        strokeWidth="4" fill="none" 
                                        strokeDasharray={125} 
                                        strokeDashoffset={125 - (Math.min(Math.max(marginStats.marginPercent, 0), 100) / 100) * 125} 
                                        className="transition-all duration-500"
                                     />
                                 </svg>
                                 <span className="absolute text-[10px] font-bold">{marginStats.marginPercent.toFixed(0)}%</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: AI & Description */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary-color)'}}>Description (Proposal Ready)</label>
                    <div className="relative">
                        <textarea
                        rows={6}
                        value={localItem.description || ''}
                        onChange={(e) => setLocalItem(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 block w-full p-3 border rounded-xl shadow-inner focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:outline-none resize-none text-sm"
                        style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                        />
                        <button
                        onClick={() => handleEnhance('description')}
                        disabled={!!isLoading}
                        className="absolute bottom-3 right-3 flex items-center px-3 py-1.5 bg-purple-600/20 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-purple-600/40 transition-colors border border-purple-500/20"
                        >
                        {isLoading === 'description' ? <InlineSpinner/> : <><SparkleIcon className="h-3 w-3 mr-1"/> AI Enhance</>}
                        </button>
                    </div>
                </div>

                {/* AI Market Tools */}
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-3 text-blue-300/70">Market Intelligence</label>
                    <div className="flex gap-2 mb-3">
                        <button onClick={handleCheckMarketRate} disabled={!!isLoading || !localItem.name} className="flex-1 py-2 bg-blue-600/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-600/30 transition-colors border border-blue-500/30">
                            {isLoading === 'market' ? <InlineSpinner/> : 'Check Market Rate'}
                        </button>
                        <button onClick={() => handleEnhance('pricing')} disabled={!!isLoading || !localItem.name} className="flex-1 py-2 bg-indigo-600/20 text-indigo-300 text-xs font-bold rounded-lg hover:bg-indigo-600/30 transition-colors border border-indigo-500/30">
                            {isLoading === 'pricing' ? <InlineSpinner/> : 'Suggest Price'}
                        </button>
                    </div>
                    {marketAnalysis ? (
                        <div className="bg-black/20 p-3 rounded-lg border border-white/5 animate-in-item">
                            <p className="text-sm font-bold text-white mb-1">{marketAnalysis.priceRange}</p>
                            <p className="text-xs text-slate-400 italic leading-relaxed">{marketAnalysis.reasoning}</p>
                        </div>
                    ) : (
                        <p className="text-center text-xs text-slate-500 py-2">Use AI to validate pricing against market data.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </Modal>
  );
};

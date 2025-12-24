
// components/FinancialStudio.tsx
import React, { useState, useMemo } from 'react';
import type { EventItem, ServiceItem, User, AIInteraction, Permissions } from '../types';
import { MenuIcon, SparkleIcon, TrendingUpIcon, TrendingDownIcon, UsersIcon, ChartBarIcon } from './common/icons';
import { getFinancialAnalysis, getPricingSuggestion } from '../services/geminiService';
import { Modal } from './common/Modal';
import { InlineSpinner } from './common/LoadingSpinner';
import { BarChart } from './common/BarChart';

interface FinancialStudioProps {
  events: EventItem[];
  services: ServiceItem[];
  users: User[];
  currentUser: User & { permissions: Permissions };
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  onUpdateService: (serviceId: string, data: Partial<ServiceItem>) => void;
  onMenuClick: () => void;
  onLogAIInteraction: (interactionData: Omit<AIInteraction, 'interactionId' | 'timestamp'>) => void;
}

const StatCard: React.FC<{ title: string; value: string; subValue?: string; color?: string }> = ({ title, value, subValue, color }) => (
    <div className="p-5 rounded-xl border backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300" style={{ backgroundColor: 'var(--card-container-color)', borderColor: 'var(--border-color)' }}>
        <p className="text-sm font-bold opacity-70 uppercase tracking-wide" style={{ color: 'var(--text-secondary-color)' }}>{title}</p>
        <p className="text-3xl font-extrabold mt-2" style={{ color: color || 'var(--text-primary-color)' }}>{value}</p>
        {subValue && <p className="text-xs mt-2 opacity-60 font-medium" style={{ color: 'var(--text-secondary-color)' }}>{subValue}</p>}
    </div>
);

type Suggestion = { suggestedPrice: number; suggestedMargin: number };

export const FinancialStudio: React.FC<FinancialStudioProps> = ({ events, services, users, onUpdateEvent, onUpdateService, onMenuClick, onLogAIInteraction, currentUser }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });
  
  // State for pricing analysis tab
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | null>>({});
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);

  const themedContainerStyle = {
    backgroundColor: 'var(--card-container-color)',
    borderColor: 'var(--border-color)',
    borderRadius: 'var(--border-radius)',
  };

  const eventFinancials = useMemo(() => {
    return events.map(event => {
      const revenue = (event.cost_tracker || []).reduce((sum, item) => sum + (item.client_price_sar || 0) * (item.quantity || 0), 0);
      const cost = (event.cost_tracker || []).reduce((sum, item) => sum + (item.unit_cost_sar || 0) * (item.quantity || 0), 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { ...event, revenue, cost, profit, margin };
    });
  }, [events]);

  const sortedEvents = useMemo(() => {
    let sortableItems = [...eventFinancials];
    if (sortConfig && (activeTab === 'event deep dive')) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key as keyof typeof a;
        if (a[key] < b[key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [eventFinancials, sortConfig, activeTab]);
  
  const sortedServices = useMemo(() => {
    let sortableItems = [...services];
     if (sortConfig && activeTab === 'pricing & margin analysis') {
        sortableItems.sort((a,b) => {
            const key = sortConfig.key as keyof typeof a;
            let valA = a[key] || 0;
            let valB = b[key] || 0;
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
     }
     return sortableItems;
  }, [services, sortConfig, activeTab]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const overallFinancials = useMemo(() => {
    return eventFinancials.reduce((acc, event) => {
        acc.totalRevenue += event.revenue;
        acc.totalCost += event.cost;
        acc.totalProfit += event.profit;
        return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  }, [eventFinancials]);
  const overallMargin = overallFinancials.totalRevenue > 0 ? (overallFinancials.totalProfit / overallFinancials.totalRevenue) * 100 : 0;
  
  // Commission Logic
  const commissionData = useMemo(() => {
    const salesUsers = users.filter(u => u.role === 'Sales');
    
    const summary = salesUsers.map(user => {
        const userEvents = eventFinancials.filter(e => e.salespersonId === user.userId);
        let totalCommission = 0;
        let paidCommission = 0;
        
        userEvents.forEach(event => {
             if (event.profit > 0) {
                const commissionRate = (event.commissionRate ?? user.commissionRate ?? 0) / 100;
                const amount = event.profit * commissionRate;
                totalCommission += amount;
                if (event.commissionPaid) {
                    paidCommission += amount;
                }
             }
        });
        
        return {
            user,
            totalCommission,
            paidCommission,
            pendingCommission: totalCommission - paidCommission,
            eventCount: userEvents.length
        };
    });

    const detailedLedger: any[] = [];
    salesUsers.forEach(user => {
      const userEvents = eventFinancials.filter(e => e.salespersonId === user.userId);
      userEvents.forEach(event => {
        if (event.profit > 0) {
            const commissionRate = (event.commissionRate ?? user.commissionRate ?? 0) / 100;
            const commissionAmount = event.profit * commissionRate;
            if (commissionAmount > 0) {
              detailedLedger.push({
                user,
                event,
                commissionAmount,
                commissionRate: commissionRate * 100,
                isPaid: event.commissionPaid,
              });
            }
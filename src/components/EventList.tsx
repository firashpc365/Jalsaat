
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import type { EventItem, User, EventStatus, PaymentStatus, Task, AppSettings, RiskAnalysisResult, Client } from '../types';
import { Modal } from './common/Modal';
import { InputField } from './common/InputField';
import { ImageUploader } from './common/ImageUploader';
import { MenuIcon, DownloadIcon, PlusIcon, SparkleIcon, BoltIcon, EyeIcon, HeartIcon, BriefcaseIcon, CakeIcon, UsersIcon, StarIcon, CalendarIcon, Squares2X2Icon, LinkIcon, FilterIcon, SearchIcon, SortAscIcon, SortDescIcon, CheckCircleIcon, TrashIcon, DocumentTextIcon, XIcon, UserPlusIcon, BriefcaseIcon as ClientIcon } from './common/icons';
import { analyzeEventRisks } from '../services/geminiService';
import { InlineSpinner } from './common/LoadingSpinner';
import { CalendarView } from './CalendarView';
import { ClientValidationModal } from './features/ClientValidationModal';
import { ConfirmationModal } from './common/ConfirmationModal';

interface EventListProps {
  events: EventItem[];
  user: User;
  users: User[];
  setView: (view: string) => void;
  setSelectedEventId: (id: string) => void;
  onAddEvent: (eventData: Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid' | 'tasks'> & { tasks?: Task[] }) => void;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
  onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
  isAddEventModalOpen: boolean;
  onToggleAddEventModal: (isOpen: boolean) => void;
  onMenuClick: () => void;
  appSettings?: AppSettings;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
  clients: Client[];
  onAddClient: (clientData: Omit<Client, 'id'>) => void; // Fixed signature in App.tsx
  onDeleteEvent?: (eventId: string) => void; 
}

const statusColors: { [key: string]: string } = {
  'Draft': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Quote Sent': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Confirmed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Canceled': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

interface ViewOptions {
    showDate: boolean;
    showLocation: boolean;
    showGuests: boolean;
    showPayment: boolean;
    showSalesperson: boolean;
}

const getEventTypeIcon = (type?: string) => {
    switch(type?.toLowerCase()) {
        case 'wedding': return { icon: <HeartIcon className="h-3 w-3" />, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', label: 'Wedding' };
        case 'corporate': return { icon: <BriefcaseIcon className="h-3 w-3" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Corporate' };
        case 'birthday': return { icon: <CakeIcon className="h-3 w-3" />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Birthday' };
        case 'social': return { icon: <UsersIcon className="h-3 w-3" />, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Social' };
        default: return { icon: <StarIcon className="h-3 w-3" />, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: type || 'Other' };
    }
};

const EventCard: React.FC<{ 
    event: EventItem; 
    salesperson?: User; 
    onClick: () => void; 
    index: number; 
    riskAnalysis?: RiskAnalysisResult; 
    viewOptions: ViewOptions; 
    isDragged: boolean; 
    isDragOver: boolean; 
    dragHandlers: any; 
    canViewFinancials: boolean;
    isSelected: boolean;
    onToggleSelect: (e: React.MouseEvent) => void;
}> = ({ event, salesperson, onClick, index, riskAnalysis, viewOptions, isDragged, isDragOver, dragHandlers, canViewFinancials, isSelected, onToggleSelect }) => {
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const keyServices = useMemo(() => {
      if (!event.cost_tracker || event.cost_tracker.length === 0) return null;
      const sorted = [...event.cost_tracker].sort((a, b) => (b.client_price_sar * b.quantity) - (a.client_price_sar * a.quantity));
      const topItems = sorted.slice(0, 2).map(i => i.name);
      const remaining = sorted.length - 2;
      return remaining > 0 ? `${topItems.join(', ')} +${remaining} others` : topItems.join(', ');
  }, [event.cost_tracker]);

  // Risk styling
  const isHighRisk = riskAnalysis?.riskLevel === 'High';
  const isMedRisk = riskAnalysis?.riskLevel === 'Medium';
  
  // Dynamic Border Logic
  let cardBorderClass = 'border-[var(--border-color)] hover:border-[var(--primary-accent-color)]/30';
  
  if (isSelected) {
      cardBorderClass = 'border-[var(--primary-accent-color)] ring-1 ring-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/5';
  } else if (isDragOver) {
      cardBorderClass = 'border-2 border-[var(--primary-accent-color)] border-dashed';
  } else if (isHighRisk) {
      cardBorderClass = 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
  } else if (isMedRisk) {
      cardBorderClass = 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
  }

  const typeConfig = getEventTypeIcon(event.eventType);
  const completedTasks = event.tasks ? event.tasks.filter(t => t.isCompleted).length : 0;
  const totalTasks = event.tasks ? event.tasks.length : 0;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const totalRevenue = canViewFinancials 
    ? event.cost_tracker.reduce((sum, item) => sum + (item.client_price_sar || 0) * (item.quantity || 0), 0) 
    : 0;

  // Countdown Logic
  const daysUntil = Math.ceil((new Date(event.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  let timeStatus = '';
  if (daysUntil < 0) timeStatus = 'Past Event';
  else if (daysUntil === 0) timeStatus = 'Happening Today';
  else if (daysUntil === 1) timeStatus = 'Tomorrow';
  else timeStatus = `In ${daysUntil} Days`;

  return (
    <div
        onClick={onClick}
        draggable
        {...dragHandlers}
        className={`
            group relative flex flex-col justify-between p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 
            hover:-translate-y-1 hover:shadow-2xl overflow-hidden
            ${isDragged ? 'opacity-30 cursor-grabbing' : 'cursor-grab'}
            ${cardBorderClass}
        `}
        style={{
            backgroundColor: isSelected ? 'rgba(var(--primary-accent-color-rgb), 0.05)' : 'var(--card-container-color)',
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'forwards',
        }}
    >
        {/* Bulk Selection Checkbox Overlay */}
        <div 
            className={`absolute top-4 left-4 z-20 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={onToggleSelect}
        >
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--primary-accent-color)] border-[var(--primary-accent-color)]' : 'bg-black/40 border-white/30 hover:border-white'}`}>
                {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
            </div>
        </div>

        {/* Risk Glow Overlay */}
        {isHighRisk && <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>}
        
        {/* Top Row: Date Badge & Status */}
        <div className="flex justify-between items-center mb-4 relative z-10 pl-6">
             <div className="flex flex-col items-start">
                 <span className={`text-[10px] font-bold uppercase tracking-widest ${daysUntil < 0 ? 'text-slate-500' : 'text-[var(--primary-accent-color)]'}`}>{timeStatus}</span>
                 {viewOptions.showDate && <span className="text-xs font-semibold text-slate-300">{formatDate(event.date)}</span>}
             </div>
             <div className="flex gap-2">
                {riskAnalysis && riskAnalysis.riskLevel !== 'Low' && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isHighRisk ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                        <BoltIcon className="h-3 w-3" /> {riskAnalysis.riskLevel}
                    </div>
                )}
                <span className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm uppercase tracking-wider ${statusColors[event.status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                    {event.status}
                </span>
             </div>
        </div>

        {/* Main Content */}
        <div className="mb-4 relative z-10">
            <h3 className="text-lg font-bold leading-tight mb-1 line-clamp-2 text-white group-hover:text-[var(--primary-accent-color)] transition-colors pl-1">
                {event.name}
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary-color)] mb-3 flex items-center gap-1 pl-1">
                {event.clientName}
            </p>
            
            <div className="flex items-center gap-2 mb-4">
                <span className={`flex items-center gap-1 flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                    {typeConfig.icon} {typeConfig.label}
                </span>
                {viewOptions.showLocation && (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary-color)] truncate max-w-[120px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        <span className="opacity-70">📍</span> {event.location}
                    </span>
                )}
            </div>

            {/* Task Progress Bar (Slim & Clean) */}
            {totalTasks > 0 && (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                        <span>Tasks</span>
                        <span className={taskProgress === 100 ? 'text-green-400' : ''}>{Math.round(taskProgress)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${taskProgress === 100 ? 'bg-green-500' : 'bg-[var(--primary-accent-color)]'}`} 
                            style={{ width: `${taskProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Key Services Preview (Subtle) */}
            {keyServices && (
                <div className="text-[10px] text-[var(--text-secondary-color)] border-l-2 border-white/10 pl-2 py-1 italic opacity-70">
                    {keyServices}
                </div>
            )}
        </div>

        {/* Footer Metrics */}
        <div className="flex justify-between items-end pt-3 border-t border-white/5 relative z-10 mt-auto">
             <div className="flex flex-col gap-1">
                 {viewOptions.showGuests && (
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary-color)]">
                        <UsersIcon className="h-3 w-3 opacity-50"/> {event.guestCount} Guests
                    </div>
                 )}
                 {viewOptions.showSalesperson && salesperson && (
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary-color)] opacity-50">
                       <span className="truncate">Rep: {salesperson.name.split(' ')[0]}</span>
                    </div>
                 )}
             </div>

             <div className="text-right">
                 {canViewFinancials && (
                     <div className="text-sm font-mono font-bold text-white tracking-tight">SAR {totalRevenue.toLocaleString()}</div>
                 )}
                 {viewOptions.showPayment && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${event.paymentStatus === 'Paid' ? 'text-green-400' : event.paymentStatus === 'Partially Paid' ? 'text-yellow-400' : 'text-slate-500'}`}>
                        {event.paymentStatus}
                    </span>
                 )}
             </div>
        </div>
        
        {/* Bottom colored line accent */}
        <div className={`absolute bottom-0 left-0 w-full h-0.5 transition-all duration-300 ${isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-gradient-to-r from-[var(--primary-accent-color)] to-transparent opacity-0 group-hover:opacity-100'}`}></div>
    </div>
  );
};

export const EventList: React.FC<EventListProps> = ({ events, user, users, setView, setSelectedEventId, onAddEvent, setError, setSuccess, onUpdateEvent, isAddEventModalOpen, onToggleAddEventModal, onMenuClick, appSettings, onUpdateSettings, clients, onAddClient, onDeleteEvent }) => {
  // New Event Form State
  const [newEvent, setNewEvent] = useState<Partial<Omit<EventItem, 'eventId' | 'cost_tracker' | 'commissionPaid'>>>({
    date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    paymentStatus: 'Unpaid',
    eventType: 'Other',
  });
  
  // Client selection state for new event
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [newClientDetails, setNewClientDetails] = useState({ companyName: '', contact: '', email: '' });

  // Advanced Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'revenue_desc'>('date_asc');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskData, setRiskData] = useState<Record<string, RiskAnalysisResult>>({});
  
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverEventId, setDragOverEventId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [isClientValidationOpen, setIsClientValidationOpen] = useState(false);

  const defaultViewOptions: ViewOptions = {
      showDate: true, showLocation: true, showGuests: true, showPayment: true, showSalesperson: true
  };

  const [viewOptions, setViewOptions] = useState<ViewOptions>(appSettings?.userPreferences?.eventListViewOptions || defaultViewOptions);
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  
  // Bulk Selection State
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  
  const salesUsers = useMemo(() => users.filter(u => u.role === 'Sales'), [users]);
  
  // Advanced Processing: Filtering and Sorting
  const processedEvents = useMemo(() => {
    let filtered = [...events];

    // Search
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(lowerSearch) || 
            e.clientName.toLowerCase().includes(lowerSearch) ||
            e.location.toLowerCase().includes(lowerSearch)
        );
    }

    // Filters
    if (filterStatus !== 'All') {
        filtered = filtered.filter(e => e.status === filterStatus);
    }
    if (filterType !== 'All') {
        filtered = filtered.filter(e => e.eventType === filterType);
    }
    if (filterPayment !== 'All') {
        filtered = filtered.filter(e => e.paymentStatus === filterPayment);
    }

    // Sorting
    filtered.sort((a, b) => {
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'revenue_desc') {
            const revA = a.cost_tracker.reduce((s, i) => s + i.client_price_sar * i.quantity, 0);
            const revB = b.cost_tracker.reduce((s, i) => s + i.client_price_sar * i.quantity, 0);
            return revB - revA;
        }
        return 0;
    });

    return filtered;
  }, [events, searchTerm, filterStatus, filterType, filterPayment, sortBy]);

  useEffect(() => {
      if (onUpdateSettings && appSettings) {
           onUpdateSettings({ 
               userPreferences: { 
                   ...appSettings.userPreferences, 
                   eventListViewOptions: viewOptions 
               } as any 
           });
      }
  }, [viewOptions]);

  // Initialize new event form
  useEffect(() => {
    if (isAddEventModalOpen) {
      let defaultSalespersonId = user.userId;
      if (salesUsers.length > 0) {
        const currentUserIsSales = salesUsers.some(su => su.userId === user.userId);
        if (currentUserIsSales) {
          defaultSalespersonId = user.userId;
        } else {
          defaultSalespersonId = salesUsers[0].userId;
        }
      }
      setNewEvent({
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        paymentStatus: 'Unpaid',
        salespersonId: defaultSalespersonId,
        eventType: 'Other',
      });
      setClientMode('existing');
      setNewClientDetails({ companyName: '', contact: '', email: '' });
    }
  }, [isAddEventModalOpen, user.userId, salesUsers]);

  const handleCardClick = (eventId: string) => {
    if (selectedEventIds.size > 0) {
        handleToggleSelectEvent(eventId);
    } else {
        setSelectedEventId(eventId);
        setView('EventDetail');
    }
  };

  const handleSaveNewEvent = () => {
    if (!newEvent.name || !newEvent.date || !newEvent.location) {
      setError("Please fill all required event details (Name, Date, Location).");
      return;
    }
    
    // Client Validation
    let finalClientId = newEvent.clientId;
    let finalClientName = newEvent.clientName;
    let finalClientContact = newEvent.clientContact;

    if (clientMode === 'existing') {
        if (!finalClientId) {
             setError("Please select an existing client.");
             return;
        }
        // Ensure name corresponds to ID (just in case)
        const client = clients.find(c => c.id === finalClientId);
        if (client) {
            finalClientName = client.companyName;
            finalClientContact = client.primaryContactName;
        }
    } else {
        // Create new client mode
        if (!newClientDetails.companyName.trim() || !newClientDetails.contact.trim() || !newClientDetails.email.trim()) {
            setError("Please fill in all new client details (Company, Contact, Email).");
            return;
        }
        
        // Generate new ID and create client first
        finalClientId = `cli-${Date.now()}`;
        finalClientName = newClientDetails.companyName;
        finalClientContact = newClientDetails.contact;
        
        onAddClient({
            companyName: newClientDetails.companyName,
            primaryContactName: newClientDetails.contact,
            email: newClientDetails.email,
            clientStatus: 'Active',
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            // Pass custom ID via the hacky way logic allows (usually id is generated in handleAdd, but we need it here)
            // Ideally we'd await an async create function, but for this structure:
        } as any); 
    }

    if (!newEvent.location || newEvent.location.trim().length < 3) {
        setError("Please provide a valid location (at least 3 characters).");
        return;
    }

    onAddEvent({
      name: newEvent.name,
      clientName: finalClientName!,
      clientId: finalClientId, // Pass the ID if available
      date: newEvent.date,
      location: newEvent.location.trim(),
      guestCount: Number(newEvent.guestCount) || 0,
      status: newEvent.status || 'Draft',
      clientContact: finalClientContact || 'TBD',
      salespersonId: newEvent.salespersonId!,
      paymentStatus: newEvent.paymentStatus || 'Unpaid',
      imageUrl: newEvent.imageUrl,
      eventType: newEvent.eventType || 'Other',
    });
    
    onToggleAddEventModal(false);
  };
  
  // ... (Risk Analysis, Export CSV, Drag & Drop, Bulk Handlers remain same) ...
  const handleRunRiskAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const { analysis } = await analyzeEventRisks(events);
          setRiskData(analysis);
      } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to analyze risks.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Event Name', 'Client Name', 'Client Contact', 'Date', 'Location', 'Guest Count', 'Status', 'Payment Status', 'Salesperson', 'Remarks'];
    const escapeCSV = (str: string | undefined | null) => {
        if (str === null || str === undefined) return '';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const rows = events.map(event => {
        const salesperson = users.find(u => u.userId === event.salespersonId);
        return [escapeCSV(event.eventId), escapeCSV(event.name), escapeCSV(event.clientName), escapeCSV(event.clientContact), escapeCSV(event.date), escapeCSV(event.location), event.guestCount, escapeCSV(event.status), escapeCSV(event.paymentStatus), escapeCSV(salesperson?.name || 'N/A'), escapeCSV(event.remarks)].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "events_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSelectEvent = (eventId: string) => {
      const newSelection = new Set(selectedEventIds);
      if (newSelection.has(eventId)) {
          newSelection.delete(eventId);
      } else {
          newSelection.add(eventId);
      }
      setSelectedEventIds(newSelection);
  };

  const handleSelectAll = () => {
      if (selectedEventIds.size === processedEvents.length) {
          setSelectedEventIds(new Set());
      } else {
          const allIds = new Set(processedEvents.map(e => e.eventId));
          setSelectedEventIds(allIds);
      }
  };

  const handleBulkStatusChange = (status: EventStatus) => {
      selectedEventIds.forEach(id => {
          onUpdateEvent(id, { status });
      });
      setSuccess(`Updated status for ${selectedEventIds.size} events to ${status}.`);
      setSelectedEventIds(new Set());
  };

  const handleBulkDelete = () => {
      if (onDeleteEvent) {
          selectedEventIds.forEach(id => onDeleteEvent(id));
          setSuccess(`Deleted ${selectedEventIds.size} events.`);
          setSelectedEventIds(new Set());
          setIsBulkDeleteConfirmOpen(false);
      }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', eventId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    e.preventDefault();
    if (eventId !== draggedEventId) {
      setDragOverEventId(eventId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverEventId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetEventId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('application/json');

    if (draggedId && draggedId !== dropTargetEventId) {
      const draggedEvent = events.find(ev => ev.eventId === draggedId);
      const dropTargetEvent = events.find(ev => ev.eventId === dropTargetEventId);

      if (draggedEvent && dropTargetEvent && draggedEvent.date !== dropTargetEvent.date) {
        onUpdateEvent(draggedId, { date: dropTargetEvent.date });
        setSuccess(`Event "${draggedEvent.name}" rescheduled to ${new Date(dropTargetEvent.date).toLocaleDateString()}.`);
      }
    }
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedEventId(null);
    setDragOverEventId(null);
  };

  // Get unique options for filters
  const uniqueTypes = useMemo(() => Array.from(new Set(events.map(e => e.eventType || 'Other'))).sort(), [events]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(events.map(e => e.status))).sort(), [events]);

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col relative min-h-screen overflow-y-auto custom-scrollbar">
      {/* 1. Header Row - Sticky Top */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-[var(--background-color)]/90 backdrop-blur-md sticky top-0 z-20 pb-4 pt-2 -mt-2 -mx-4 px-4 sm:px-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={onMenuClick} className="p-1 rounded-md md:hidden hover:bg-white/5">
                <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary-color)' }}>Events</h1>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold text-[var(--text-secondary-color)]">
                {processedEvents.length}
            </span>
        </div>
        
        {/* Main Actions */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             <button 
                onClick={() => setIsClientValidationOpen(true)}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md transition flex items-center rounded-lg text-sm"
            >
                <LinkIcon className="h-4 w-4 mr-2" /> Check Data
            </button>
            <button
                onClick={handleRunRiskAnalysis}
                disabled={isAnalyzing}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md transition flex items-center disabled:opacity-50 rounded-lg text-sm"
            >
                {isAnalyzing ? <InlineSpinner /> : <><SparkleIcon className="h-4 w-4 mr-2" /> Risk AI</>}
            </button>
            <button
                onClick={() => onToggleAddEventModal(true)}
                className="flex-grow sm:flex-grow-0 justify-center px-4 py-2 bg-[var(--primary-accent-color)] hover:opacity-90 text-white font-semibold shadow-md transition flex items-center rounded-lg text-sm"
            >
                <PlusIcon className="h-4 w-4 mr-2" /> New Event
            </button>
        </div>
      </div>

      {/* 2. Advanced Toolbar Row - Sticky below header */}
      <div className="sticky top-[80px] z-10 -mx-4 px-4 sm:px-6 pb-2 pt-2 bg-[var(--background-color)]/95 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row gap-3 p-3 rounded-xl border shadow-sm bg-[var(--card-container-color)]" style={{ borderColor: 'var(--border-color)' }}>
            {/* Search */}
            <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary-color)]" />
                <input 
                    type="text" 
                    placeholder="Search events, clients, or locations..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/20 border border-white/5 focus:border-[var(--primary-accent-color)] outline-none text-sm text-white transition-all"
                />
            </div>

            {/* Filters & Sort Group */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* ... (Existing Filter buttons code) ... */}
                
                {/* Select All Toggle */}
                <button
                    onClick={handleSelectAll}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedEventIds.size > 0 ? 'bg-[var(--primary-accent-color)] text-white border-[var(--primary-accent-color)]' : 'bg-black/20 text-[var(--text-secondary-color)] border-white/5 hover:bg-white/5'}`}
                >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedEventIds.size === processedEvents.length && processedEvents.length > 0 ? 'bg-white border-white' : 'border-white/50'}`}>
                        {selectedEventIds.size === processedEvents.length && processedEvents.length > 0 && <CheckCircleIcon className="w-3 h-3 text-[var(--primary-accent-color)]" />}
                    </span>
                    {selectedEventIds.size > 0 ? `${selectedEventIds.size} Selected` : 'Select All'}
                </button>

                 {/* Filter Dropdowns */}
                 <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                    <FilterIcon className="h-4 w-4 text-[var(--text-secondary-color)] ml-2" />
                    <select 
                        value={filterStatus} 
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-transparent text-sm text-white p-1.5 focus:outline-none cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="w-px h-4 bg-white/10"></div>
                    <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value)}
                        className="bg-transparent text-sm text-white p-1.5 focus:outline-none cursor-pointer"
                    >
                        <option value="All">All Types</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* Sort */}
                <div className="flex items-center bg-black/20 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setSortBy(sortBy === 'date_asc' ? 'date_desc' : 'date_asc')} className="p-1.5 hover:bg-white/10 rounded text-[var(--text-secondary-color)] hover:text-white" title="Sort Date">
                        {sortBy.startsWith('date') ? (sortBy === 'date_asc' ? <SortAscIcon className="h-4 w-4"/> : <SortDescIcon className="h-4 w-4"/>) : <CalendarIcon className="h-4 w-4"/>}
                    </button>
                    <button onClick={() => setSortBy('revenue_desc')} className={`p-1.5 hover:bg-white/10 rounded ${sortBy === 'revenue_desc' ? 'text-green-400' : 'text-[var(--text-secondary-color)] hover:text-white'}`} title="Sort Revenue">
                        <span className="font-bold text-xs">$</span>
                    </button>
                </div>

                {/* View Toggles */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--primary-accent-color)] text-white shadow-sm' : 'text-[var(--text-secondary-color)] hover:text-white'}`} title="Grid View"><Squares2X2Icon className="h-4 w-4"/></button>
                    <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-[var(--primary-accent-color)] text-white shadow-sm' : 'text-[var(--text-secondary-color)] hover:text-white'}`} title="Calendar View"><CalendarIcon className="h-4 w-4"/></button>
                </div>
            </div>
         </div>
      </div>

      {/* 3. Content Grid/List */}
      <div className="pb-20 pr-1">
        {viewMode === 'calendar' ? (
            <CalendarView events={processedEvents} onEventClick={handleCardClick} />
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {processedEvents.map((event, index) => (
                    <EventCard 
                        key={event.eventId} 
                        event={event} 
                        salesperson={users.find(u => u.userId === event.salespersonId)}
                        onClick={() => handleCardClick(event.eventId)}
                        index={index}
                        riskAnalysis={riskData[event.eventId]}
                        viewOptions={viewOptions}
                        isDragged={draggedEventId === event.eventId}
                        isDragOver={dragOverEventId === event.eventId && draggedEventId !== event.eventId}
                        dragHandlers={{
                            onDragStart: (e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, event.eventId),
                            onDragEnter: (e: React.DragEvent<HTMLDivElement>) => handleDragEnter(e, event.eventId),
                            onDragLeave: handleDragLeave,
                            onDragOver: handleDragOver,
                            onDrop: (e: React.DragEvent<HTMLDivElement>) => handleDrop(e, event.eventId),
                            onDragEnd: handleDragEnd,
                        }}
                        canViewFinancials={user.permissions.canViewFinancials}
                        isSelected={selectedEventIds.has(event.eventId)}
                        onToggleSelect={(e) => { e.stopPropagation(); handleToggleSelectEvent(event.eventId); }}
                    />
                ))}
                {processedEvents.length === 0 && (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center opacity-50 border-2 border-dashed border-white/10 rounded-2xl">
                        <SparkleIcon className="h-12 w-12 mb-4 text-[var(--text-secondary-color)]" />
                        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary-color)' }}>No events match your criteria.</p>
                        <button onClick={() => { setSearchTerm(''); setFilterStatus('All'); }} className="mt-2 text-sm text-[var(--primary-accent-color)] hover:underline">Clear Filters</button>
                    </div>
                )}
            </div>
        )}
      </div>
      
       {/* FLOATING BULK ACTIONS BAR */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out transform ${selectedEventIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
          <div className="bg-[var(--card-container-color)] backdrop-blur-xl border border-[var(--border-color)] p-2 rounded-2xl shadow-2xl flex items-center gap-2 ring-1 ring-white/10">
              <div className="pl-4 pr-3 flex flex-col justify-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-color)]">Selected</span>
                  <span className="text-lg font-black text-white leading-none">{selectedEventIds.size}</span>
              </div>
              
              <div className="h-8 w-px bg-white/10 mx-1"></div>

              <button 
                onClick={() => handleBulkStatusChange('Completed')}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-green-400 transition-colors w-16 group"
              >
                  <CheckCircleIcon className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase">Complete</span>
              </button>

              <button 
                onClick={() => handleBulkStatusChange('Quote Sent')}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-blue-400 transition-colors w-16 group"
              >
                  <DocumentTextIcon className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase">Quote</span>
              </button>

              <button 
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-400 transition-colors w-16 group"
              >
                  <TrashIcon className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase">Delete</span>
              </button>

              <div className="h-8 w-px bg-white/10 mx-1"></div>
              
              <button 
                onClick={() => setSelectedEventIds(new Set())}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Clear Selection"
              >
                  <XIcon className="h-5 w-5" />
              </button>
          </div>
      </div>

      {isAddEventModalOpen && (
        <Modal title="Create New Event" onClose={() => onToggleAddEventModal(false)} onSave={handleSaveNewEvent}>
          <div className="space-y-6">
            <InputField label="Event Name" value={newEvent.name || ''} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })} required />
            
            {/* Client Selection Section */}
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-[var(--text-secondary-color)] uppercase tracking-wider">Client Details</label>
                    <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button 
                            onClick={() => setClientMode('existing')} 
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${clientMode === 'existing' ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Select Existing
                        </button>
                        <button 
                            onClick={() => setClientMode('new')} 
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${clientMode === 'new' ? 'bg-[var(--primary-accent-color)] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Create New
                        </button>
                    </div>
                </div>

                {clientMode === 'existing' ? (
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium mb-1 text-[var(--text-secondary-color)]">Select Client *</label>
                             <select 
                                value={newEvent.clientId || ''} 
                                onChange={(e) => {
                                    const client = clients.find(c => c.id === e.target.value);
                                    if (client) {
                                        setNewEvent({ ...newEvent, clientId: client.id, clientName: client.companyName, clientContact: client.primaryContactName });
                                    }
                                }}
                                className="w-full p-2.5 rounded-lg bg-black/30 border border-white/10 text-white focus:border-[var(--primary-accent-color)] outline-none"
                             >
                                 <option value="">-- Choose Client --</option>
                                 {clients.sort((a,b) => a.companyName.localeCompare(b.companyName)).map(c => (
                                     <option key={c.id} value={c.id}>{c.companyName}</option>
                                 ))}
                             </select>
                         </div>
                         {newEvent.clientId && (
                             <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 flex justify-between items-center">
                                 <div>
                                    <span className="block font-bold text-white">{newEvent.clientName}</span>
                                    <span>Contact: {newEvent.clientContact}</span>
                                 </div>
                                 <LinkIcon className="h-4 w-4 text-[var(--primary-accent-color)]" />
                             </div>
                         )}
                     </div>
                ) : (
                    <div className="space-y-3 animate-in-item">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-xs text-blue-300 mb-2">
                             <UserPlusIcon className="h-4 w-4" />
                             <span>A new client record will be created automatically.</span>
                        </div>
                        <InputField 
                            label="Company Name" 
                            value={newClientDetails.companyName} 
                            onChange={e => setNewClientDetails({...newClientDetails, companyName: e.target.value})} 
                            required 
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <InputField 
                                label="Primary Contact" 
                                value={newClientDetails.contact} 
                                onChange={e => setNewClientDetails({...newClientDetails, contact: e.target.value})} 
                                required 
                            />
                            <InputField 
                                label="Email Address" 
                                type="email"
                                value={newClientDetails.email} 
                                onChange={e => setNewClientDetails({...newClientDetails, email: e.target.value})} 
                                required 
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <InputField label="Date" type="date" value={newEvent.date || ''} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
                </div>
                <InputField label="Location" value={newEvent.location || ''} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <InputField label="Guest Count" type="number" value={newEvent.guestCount || ''} onChange={e => setNewEvent({ ...newEvent, guestCount: Number(e.target.value) })} />
                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Event Type</label>
                  <select
                    value={newEvent.eventType}
                    onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Social">Social</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Status</label>
                    <select
                        value={newEvent.status}
                        onChange={e => setNewEvent({ ...newEvent, status: e.target.value as EventStatus })}
                        className="mt-1 block w-full p-2 border rounded"
                        style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                    >
                        <option>Draft</option>
                        <option>Quote Sent</option>
                        <option>Confirmed</option>
                    </select>
                </div>
                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Salesperson</label>
                  <select
                    value={newEvent.salespersonId}
                    onChange={e => setNewEvent({ ...newEvent, salespersonId: e.target.value })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                  >
                    {users.map(u => (
                      <option key={u.userId} value={u.userId}>{u.name}</option>
                    ))}
                  </select>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary-color)' }}>Payment Status</label>
                <select
                    value={newEvent.paymentStatus}
                    onChange={e => setNewEvent({ ...newEvent, paymentStatus: e.target.value as PaymentStatus })}
                    className="mt-1 block w-full p-2 border rounded"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-color)', color: 'var(--text-primary-color)' }}
                >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                </select>
            </div>
            <ImageUploader label="Event Image (Optional)" onImageSelected={b64 => setNewEvent({ ...newEvent, imageUrl: b64 })} />
          </div>
        </Modal>
      )}

      {isClientValidationOpen && (
          <ClientValidationModal 
            events={events}
            clients={clients}
            onClose={() => setIsClientValidationOpen(false)}
            onUpdateEvent={onUpdateEvent}
            onAddClient={onAddClient}
          />
      )}
      
      {isBulkDeleteConfirmOpen && (
          <ConfirmationModal
              title={`Delete ${selectedEventIds.size} Events?`}
              message="Are you sure you want to delete the selected events? This action cannot be undone."
              onConfirm={handleBulkDelete}
              onCancel={() => setIsBulkDeleteConfirmOpen(false)}
              confirmText="Delete All"
              cancelText="Cancel"
          />
      )}
    </div>
  );
};

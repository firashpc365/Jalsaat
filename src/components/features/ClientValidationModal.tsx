
import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CheckCircleIcon, LinkIcon, UserPlusIcon, RefreshIcon, UsersIcon, MapPinIcon } from '../common/icons';
import type { EventItem, Client } from '../../types';

interface ClientValidationModalProps {
    events: EventItem[];
    clients: Client[];
    onClose: () => void;
    onUpdateEvent: (eventId: string, data: Partial<EventItem>) => void;
    onAddClient: (clientData: Omit<Client, 'id'>) => void;
}

interface UnlinkedEvent {
    event: EventItem;
    suggestedMatch?: Client;
    matchScore: number;
}

export const ClientValidationModal: React.FC<ClientValidationModalProps> = ({ events, clients, onClose, onUpdateEvent, onAddClient }) => {
    const [unlinkedEvents, setUnlinkedEvents] = useState<UnlinkedEvent[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());

    // Enhanced Fuzzy Matching
    const calculateMatchScore = (target: string, candidate: string): number => {
        const s1 = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        const s2 = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (s1 === s2) return 1.0;
        if (s1.includes(s2) || s2.includes(s1)) return 0.8;
        
        // Simple token overlap
        const tokens1 = new Set(target.toLowerCase().split(/\s+/));
        const tokens2 = new Set(candidate.toLowerCase().split(/\s+/));
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        
        if (intersection.size > 0) {
            return 0.5 + (intersection.size / Math.max(tokens1.size, tokens2.size)) * 0.4;
        }

        return 0;
    };

    const findBestMatch = (name: string, clientList: Client[]): { client?: Client, score: number } => {
        let bestMatch: Client | undefined;
        let bestScore = 0;

        clientList.forEach(client => {
            const score = calculateMatchScore(name, client.companyName);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = client;
            }
        });
        return { client: bestMatch, score: bestScore };
    };

    useEffect(() => {
        const unlinked: UnlinkedEvent[] = [];
        events.forEach(event => {
            // Check if exact match exists in clients DB
            const exactMatch = clients.find(c => c.companyName.trim().toLowerCase() === event.clientName.trim().toLowerCase());
            
            // If no exact match and not previously ignored
            if (!exactMatch && !ignoredIds.has(event.eventId)) {
                const { client, score } = findBestMatch(event.clientName, clients);
                unlinked.push({
                    event,
                    suggestedMatch: client,
                    matchScore: score
                });
            }
        });
        setUnlinkedEvents(unlinked);
        if (unlinked.length === 0 && events.length > 0) setIsComplete(true);
    }, [events, clients, ignoredIds]);

    const currentItem = unlinkedEvents[currentIndex];

    const handleLink = (clientName: string) => {
        if (!currentItem) return;
        
        const existingClient = clients.find(c => c.companyName === clientName);

        onUpdateEvent(currentItem.event.eventId, { 
            clientName: clientName,
            // Auto-update contact if it was generic
            clientContact: (currentItem.event.clientContact === 'TBD' || !currentItem.event.clientContact) && existingClient
                ? existingClient.primaryContactName 
                : currentItem.event.clientContact
        });
        
        next();
    };

    const handleCreate = () => {
        if (!currentItem) return;
        
        onAddClient({
            companyName: currentItem.event.clientName,
            primaryContactName: currentItem.event.clientContact || 'Primary Contact',
            email: 'pending@update.com',
            clientStatus: 'Active',
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
            internalNotes: `Auto-created from event: ${currentItem.event.name}`,
            address: currentItem.event.location !== 'TBD' ? currentItem.event.location : undefined
        });
        
        // No need to update event, strictly speaking, as it now matches the new client name exactly
        next();
    };

    const handleIgnore = () => {
        if (currentItem) {
            setIgnoredIds(prev => new Set(prev).add(currentItem.event.eventId));
        }
        next();
    };

    const next = () => {
        if (currentIndex < unlinkedEvents.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsComplete(true);
        }
    };

    const handleRefresh = () => {
        setCurrentIndex(0);
        setIsComplete(false);
        setIgnoredIds(new Set());
    };

    if (isComplete || unlinkedEvents.length === 0) {
        return (
            <Modal title="Data Validation" onClose={onClose} size="md">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.1)]">
                        <CheckCircleIcon className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary-color)]">Database Clean</h3>
                    <p className="text-[var(--text-secondary-color)] mt-2 max-w-xs mx-auto">
                        All events are linked to valid client records.
                    </p>
                    <div className="flex gap-3 mt-8">
                        <button onClick={handleRefresh} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-[var(--text-secondary-color)] flex items-center gap-2">
                             <RefreshIcon className="h-4 w-4"/> Re-scan
                        </button>
                        <button onClick={onClose} className="px-6 py-2 bg-[var(--primary-accent-color)] text-white rounded-lg font-bold shadow-lg hover:opacity-90">
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    if (!currentItem) return null;

    return (
        <Modal title={`Client Data Validation (${currentIndex + 1}/${unlinkedEvents.length})`} onClose={onClose} size="lg">
            <div className="space-y-8">
                {/* Context Card */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-white/10 shadow-inner">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary-color)] mb-1">Unlinked Event</div>
                            <h3 className="text-xl font-bold text-white">{currentItem.event.name}</h3>
                        </div>
                        <div className="text-right">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary-color)] mb-1 block">Event Date</span>
                             <span className="text-white">{new Date(currentItem.event.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-lg border border-white/5">
                        <div>
                            <span className="text-xs opacity-60 block mb-1">Client Name on Record</span>
                            <span className="text-lg font-mono text-yellow-400 font-bold">{currentItem.event.clientName}</span>
                        </div>
                        <div>
                            <span className="text-xs opacity-60 block mb-1">Contact Person</span>
                            <span className="text-lg text-white flex items-center gap-2">
                                <UsersIcon className="h-4 w-4 opacity-70"/> {currentItem.event.clientContact}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-700 rounded-full p-2 border border-slate-600 shadow-xl">
                        <span className="text-xs font-bold text-white uppercase">OR</span>
                    </div>

                    {/* Option A: Link to Existing */}
                    <div className="flex flex-col h-full p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 transition-all hover:bg-blue-500/10">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1 text-blue-300 font-bold text-lg">
                                <LinkIcon className="h-5 w-5" /> Link to Existing
                            </div>
                            <p className="text-xs text-blue-200/60">Connect this event to an established client profile.</p>
                        </div>
                        
                        <div className="flex-grow space-y-4">
                            {currentItem.suggestedMatch && currentItem.matchScore > 0.4 ? (
                                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300">AI Suggested Match</p>
                                        <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">{(currentItem.matchScore * 100).toFixed(0)}% Match</span>
                                    </div>
                                    <p className="font-bold text-lg text-white mb-3">{currentItem.suggestedMatch.companyName}</p>
                                    <button 
                                        onClick={() => handleLink(currentItem.suggestedMatch!.companyName)}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
                                    >
                                        Confirm Match
                                    </button>
                                </div>
                            ) : (
                                <p className="text-xs text-center opacity-40 italic py-4">No close matches found.</p>
                            )}

                            <div>
                                <p className="text-xs uppercase tracking-wider text-[var(--text-secondary-color)] mb-2 font-bold">Search Database</p>
                                <select 
                                    onChange={(e) => { if(e.target.value) handleLink(e.target.value); }}
                                    className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-blue-500 text-white cursor-pointer"
                                    value=""
                                >
                                    <option value="" disabled>Select a client...</option>
                                    {clients.sort((a,b) => a.companyName.localeCompare(b.companyName)).map(c => (
                                        <option key={c.id} value={c.companyName}>{c.companyName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Option B: Create New */}
                    <div className="flex flex-col h-full p-5 rounded-2xl border border-green-500/20 bg-green-500/5 transition-all hover:bg-green-500/10">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-1 text-green-400 font-bold text-lg">
                                <UserPlusIcon className="h-5 w-5" /> Create New Client
                            </div>
                            <p className="text-xs text-green-200/60">Add "{currentItem.event.clientName}" as a new entity.</p>
                        </div>
                        
                        <div className="flex-grow flex flex-col justify-end">
                            <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/10 mb-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="opacity-60">Company:</span>
                                        <span className="font-bold text-white">{currentItem.event.clientName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-60">Contact:</span>
                                        <span className="font-medium text-white">{currentItem.event.clientContact}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-60">Location:</span>
                                        <span className="font-medium text-white">{currentItem.event.location}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={handleCreate}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <UserPlusIcon className="h-4 w-4"/> Create Record
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-2">
                    <button onClick={handleIgnore} className="text-xs text-[var(--text-secondary-color)] hover:text-white underline opacity-60 hover:opacity-100 transition-opacity">
                        Skip this event for now
                    </button>
                </div>
            </div>
        </Modal>
    );
};

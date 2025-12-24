
import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import type { User, EventItem, ServiceItem, RFQItem, QuotationTemplate, ProposalTemplate, Client, ProcurementDocument, AppSettings, Notification } from '../types';
import { DEFAULT_APP_STATE } from '../constants';
import { Sidebar } from '../components/Sidebar';
import { Dashboard } from '../components/Dashboard';
import { EventList } from '../components/EventList';
import { EventDetail } from '../components/EventDetail';
import { Services } from '../components/Services';
import { RFQList } from '../components/RFQList';
import { UserManagement } from '../components/UserManagement';
import { ClientList } from '../components/ClientList';
import { FinancialStudio } from '../components/FinancialStudio';
import { AppSettingsComponent } from '../components/AppSettings';
import { Reports } from '../components/Reports';
import { Portfolio } from '../components/Portfolio';
import { SupplierManagement } from '../components/SupplierManagement';
import { IntelligentCreator } from '../components/features/IntelligentCreator';
import { ImageGenerator } from '../components/features/ImageGenerator';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { SuccessBanner } from '../components/common/SuccessBanner';
import { QuotaErrorModal } from '../components/common/QuotaErrorModal';
import { LandingPage } from '../components/LandingPage';
import { HomePage } from '../components/HomePage';
import { QuotaExceededError } from '../services/geminiService';
import { MotionGraphicsOverlay } from '../components/common/MotionGraphicsOverlay';

interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
                    <div className="max-w-xl w-full">
                        <h2 className="text-4xl font-bold mb-4 text-red-400">System Error</h2>
                        <p className="mb-4 text-slate-300">Something went wrong in the application. Please try reloading.</p>
                        <pre className="bg-black/30 p-4 rounded text-left text-xs font-mono overflow-auto max-h-64 mx-auto mb-6 border border-white/10">
                            {String(this.state.error)}
                        </pre>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-6 py-2 bg-red-600/20 text-red-300 border border-red-500/50 rounded-lg text-sm font-bold hover:bg-red-600/30">Hard Reset (Clear Data)</button>
                            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition">Reboot System</button>
                        </div>
                    </div>
                </div>
            );
        }
        return (this as any).props.children;
    }
}

export const App: React.FC = () => {
    const [appState, setAppState, refreshState] = usePersistentState(DEFAULT_APP_STATE);

    // Destructure with safety defaults to prevent "undefined" access
    const {
        users = [],
        events = [],
        services = [],
        clients = [],
        rfqs = [],
        quotationTemplates = [],
        proposalTemplates = [],
        roles = {},
        currentUserId = '',
        settings = DEFAULT_APP_STATE.settings,
        isLoggedIn = false,
        customThemes = [],
        notifications = [],
        suppliers = [],
        procurementDocuments = []
    } = appState || DEFAULT_APP_STATE;

    const [view, setView] = useState('Home');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [showIntelligentCreator, setShowIntelligentCreator] = useState(false);
    const [showImageGenerator, setShowImageGenerator] = useState(false);
    const [aiError, setAiError] = useState<QuotaExceededError | null>(null);
    const [isAIFallbackActive, setIsAIFallbackActive] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const currentUser = useMemo(() => {
        const found = users.find((u: User) => u.userId === currentUserId);
        return found || users[0] || { userId: 'guest', name: 'Guest', role: 'Sales' };
    }, [users, currentUserId]);

    const userPermissions = useMemo(() => roles[currentUser.role] || roles['Sales'], [roles, currentUser.role]);
    const currentUserWithPermissions = { ...currentUser, permissions: userPermissions };
    const selectedEvent = useMemo(() => events.find((e: EventItem) => e.eventId === selectedEventId), [events, selectedEventId]);

    useEffect(() => {
        const root = document.documentElement;
        const colors = settings.colors || DEFAULT_APP_STATE.settings.colors;
        root.style.setProperty('--primary-accent-color', colors.primaryAccent);

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '8, 145, 178';
        }
        root.style.setProperty('--primary-accent-color-rgb', hexToRgb(colors.primaryAccent));
        root.style.setProperty('--background-color', colors.background);
        root.style.setProperty('--card-container-color', colors.cardContainer);
        root.style.setProperty('--text-primary-color', colors.primaryText);
        root.style.setProperty('--text-secondary-color', colors.secondaryText);
        root.style.setProperty('--border-color', colors.borderColor);
        root.style.setProperty('--border-radius', `${settings.layout.borderRadius}px`);
        root.style.setProperty('--font-family', settings.typography.applicationFont);
        root.style.setProperty('--glass-blur', `${settings.layout.glassIntensity || 15}px`);

        if (settings.themeMode === 'dark') {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
        } else {
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
        }
    }, [settings]);

    // Scroll to top when view changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [view]);

    const handleUpdate = (key: keyof typeof appState, data: any) => {
        setAppState((prev: any) => ({ ...prev, [key]: data }));
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            refreshState();
            setIsRefreshing(false);
            setSuccess("System synced.");
        }, 800);
    };

    const setErrorWithSound = (err: any) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof QuotaExceededError) {
            setAiError(err);
        } else {
            setError(msg);
            const audio = document.getElementById('error-sound') as HTMLAudioElement;
            if (audio) audio.play().catch(() => { });
        }
    };

    const setSuccessWithSound = (msg: string | null) => {
        setSuccess(msg);
        if (msg) {
            const audio = document.getElementById('success-sound') as HTMLAudioElement;
            if (audio) audio.play().catch(() => { });
        }
    };

    const handleLogAIInteraction = (interaction: any) => {
        // Stub for logging to analytics service or local debug
        console.debug("AI Interaction Logged:", interaction);
    };

    const handleBackup = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `kanchana_backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            setSuccessWithSound("System backup created successfully.");
        } catch (e) {
            console.error(e);
            setErrorWithSound("Failed to create backup.");
        }
    };

    const handleRestore = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const data = JSON.parse(json);

                // Basic validation
                if (!data || typeof data !== 'object') {
                    throw new Error("Invalid file format");
                }

                // Handle potential wrapper from direct LS dump vs App State dump
                const stateToRestore = data.data || data;

                // Check for critical keys to ensure it's a valid backup
                if (!Array.isArray(stateToRestore.users) || !Array.isArray(stateToRestore.events)) {
                    throw new Error("Missing critical data fields");
                }

                setAppState(stateToRestore);
                setSuccessWithSound("System restored successfully.");
            } catch (err) {
                console.error(err);
                setErrorWithSound("Failed to restore: Invalid backup file.");
            }
        };
        reader.readAsText(file);
    };

    // Wrapper for LandingPage Login to actually set logged in state
    const handleLogin = (id: string) => {
        setAppState((prev: any) => ({ ...prev, currentUserId: id, isLoggedIn: true }));
        setView('Home');
    };

    if (!isLoggedIn) {
        return (
            <ErrorBoundary>
                <LandingPage
                    users={users}
                    defaultUserId={currentUserId}
                    onLogin={handleLogin}
                    settings={settings}
                    isExiting={false}
                />
            </ErrorBoundary>
        );
    }

    const renderContent = () => {
        switch (view) {
            case 'Home':
                return <HomePage user={currentUserWithPermissions} setView={setView} onRequestNewEvent={() => setIsAddEventModalOpen(true)} onShowIntelligentCreator={() => setShowIntelligentCreator(true)} onShowImageGenerator={() => setShowImageGenerator(true)} />;
            case 'Dashboard':
                return <Dashboard user={currentUserWithPermissions} events={events} services={services} clients={clients} setView={setView} setSelectedEventId={setSelectedEventId} onRequestNewEvent={() => setIsAddEventModalOpen(true)} onShowIntelligentCreator={() => setShowIntelligentCreator(true)} onShowImageGenerator={() => setShowImageGenerator(true)} onMenuClick={() => setIsSidebarOpen(true)} appSettings={settings} onUpdateSettings={(s) => handleUpdate('settings', { ...settings, ...s })} />;
            case 'Events':
                return <EventList
                    events={events}
                    user={currentUserWithPermissions}
                    users={users}
                    setView={setView}
                    setSelectedEventId={setSelectedEventId}
                    onAddEvent={(e) => handleUpdate('events', [...events, { ...e, eventId: `evt-${Date.now()}` }])}
                    setError={setErrorWithSound}
                    setSuccess={setSuccessWithSound}
                    onUpdateEvent={(id, data) => handleUpdate('events', events.map((e: EventItem) => e.eventId === id ? { ...e, ...data } : e))}
                    isAddEventModalOpen={isAddEventModalOpen}
                    onToggleAddEventModal={setIsAddEventModalOpen}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    appSettings={settings}
                    onUpdateSettings={(s) => handleUpdate('settings', { ...settings, ...s })}
                    clients={clients}
                    onAddClient={(c) => handleUpdate('clients', [...clients, { ...c, id: `cli-${Date.now()}` }])}
                    onDeleteEvent={(id) => handleUpdate('events', events.filter((e: EventItem) => e.eventId !== id))}
                />;
            case 'EventDetail':
                return selectedEvent ? (
                    <EventDetail
                        event={selectedEvent}
                        services={services}
                        user={currentUserWithPermissions}
                        users={users}
                        clients={clients}
                        appSettings={settings}
                        setView={setView}
                        setError={setErrorWithSound}
                        setSuccess={setSuccessWithSound}
                        onUpdateEvent={(id, data) => handleUpdate('events', events.map((e: EventItem) => e.eventId === id ? { ...e, ...data } : e))}
                        onDeleteEvent={(id) => { handleUpdate('events', events.filter((e: EventItem) => e.eventId !== id)); setView('Events'); }}
                        onLogAIInteraction={(id, data) => handleLogAIInteraction(data)}
                        quotationTemplates={quotationTemplates}
                        onAddTemplate={(t) => handleUpdate('quotationTemplates', [...quotationTemplates, { ...t, templateId: `qt-${Date.now()}` }])}
                        onUpdateTemplate={(id, d) => handleUpdate('quotationTemplates', quotationTemplates.map((t: QuotationTemplate) => t.templateId === id ? { ...t, ...d } : t))}
                        onDeleteTemplate={(id) => handleUpdate('quotationTemplates', quotationTemplates.filter((t: QuotationTemplate) => t.templateId !== id))}
                        proposalTemplates={proposalTemplates}
                        onAddProposalTemplate={(t) => handleUpdate('proposalTemplates', [...proposalTemplates, { ...t, id: `pt-${Date.now()}` }])}
                        onDeleteProposalTemplate={(id) => handleUpdate('proposalTemplates', proposalTemplates.filter((t: ProposalTemplate) => t.id !== id))}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onAddClient={(c) => handleUpdate('clients', [...clients, { ...c, id: `cli-${Date.now()}` }])}
                        onUpdateClient={(id, d) => handleUpdate('clients', clients.map((c: Client) => c.id === id ? { ...c, ...d } : c))}
                    />
                ) : <div className="p-8 text-center text-[var(--text-secondary-color)]">Event not found.</div>;
            case 'Services':
                return <Services
                    services={services}
                    events={events}
                    user={currentUserWithPermissions}
                    setError={setErrorWithSound}
                    setSuccess={setSuccessWithSound}
                    onAddItem={(s) => handleUpdate('services', [...services, { ...s, id: `svc-${Date.now()}` }])}
                    onUpdateService={(id, d) => handleUpdate('services', services.map((s: ServiceItem) => s.id === id ? { ...s, ...d } : s))}
                    onDeleteService={(id) => handleUpdate('services', services.filter((s: ServiceItem) => s.id !== id))}
                    onBulkAddServices={(items) => handleUpdate('services', [...services, ...items.map((i: any) => ({ ...i, id: `svc-${Date.now()}-${Math.random()}` }))])}
                    onBulkUpdateServices={(updates) => handleUpdate('services', services.map((s: ServiceItem) => {
                        const update = updates.find(u => u.id === s.id);
                        return update ? { ...s, ...update.data } : s;
                    }))}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onLogAIInteraction={handleLogAIInteraction}
                    settings={settings}
                    onAIFallback={setIsAIFallbackActive}
                />;
            case 'Clients':
                return <ClientList clients={clients} events={events} onAddClient={(c) => handleUpdate('clients', [...clients, { ...c, id: `cli-${Date.now()}` }])} onUpdateClient={(id, d) => handleUpdate('clients', clients.map((c: Client) => c.id === id ? { ...c, ...d } : c))} onMenuClick={() => setIsSidebarOpen(true)} setError={setErrorWithSound} setSuccess={setSuccessWithSound} />;
            case 'RFQs':
                return <RFQList rfqs={rfqs} user={currentUserWithPermissions} onAddRfq={(r) => handleUpdate('rfqs', [...rfqs, { ...r, rfqId: `rfq-${Date.now()}`, status: 'New', createdDate: new Date().toISOString() }])} onUpdateRfq={(id, d) => handleUpdate('rfqs', rfqs.map((r: RFQItem) => r.rfqId === id ? { ...r, ...d } : r))} onConvertToEvent={(e) => { handleUpdate('events', [...events, { ...e, eventId: `evt-${Date.now()}` }]); setView('Events'); }} setError={setErrorWithSound} setSuccess={setSuccessWithSound} onMenuClick={() => setIsSidebarOpen(true)} services={services} clients={clients} onLogAIInteraction={handleLogAIInteraction} />;
            case 'SupplierManagement':
                return <SupplierManagement suppliers={suppliers} documents={procurementDocuments} events={events} user={currentUserWithPermissions} settings={settings} onMenuClick={() => setIsSidebarOpen(true)} onAddDocument={(d) => handleUpdate('procurementDocuments', [...procurementDocuments, d])} onUpdateDocument={(id, d) => handleUpdate('procurementDocuments', procurementDocuments.map((doc: ProcurementDocument) => doc.document_id === id ? { ...doc, ...d } : doc))} onUpdateEvent={(id, d) => handleUpdate('events', events.map((e: EventItem) => e.eventId === id ? { ...e, ...d } : e))} onLogAIInteraction={handleLogAIInteraction} setError={setErrorWithSound} setSuccess={setSuccessWithSound} />;
            case 'FinancialStudio':
                return <FinancialStudio events={events} services={services} users={users} currentUser={currentUserWithPermissions} onUpdateEvent={(id, d) => handleUpdate('events', events.map((e: EventItem) => e.eventId === id ? { ...e, ...d } : e))} onUpdateService={(id, d) => handleUpdate('services', services.map((s: ServiceItem) => s.id === id ? { ...s, ...d } : s))} onMenuClick={() => setIsSidebarOpen(true)} onLogAIInteraction={handleLogAIInteraction} />;
            case 'Reports':
                return <Reports events={events} services={services} users={users} currentUser={currentUserWithPermissions} onMenuClick={() => setIsSidebarOpen(true)} onBackup={handleBackup} onRestore={handleRestore} />;
            case 'Portfolio':
                return <Portfolio events={events} services={services} setView={setView} onMenuClick={() => setIsSidebarOpen(true)} />;
            case 'Profile':
                return <UserManagement currentUser={currentUserWithPermissions} users={users} roles={roles} onUpdateUser={(id, d) => handleUpdate('users', users.map((u: User) => u.userId === id ? { ...u, ...d } : u))} onAddUser={(u) => handleUpdate('users', [...users, { ...u, userId: `u-${Date.now()}` }])} onUpdateRolePermissions={(r, p) => handleUpdate('roles', { ...roles, [r]: p })} events={events} setError={setErrorWithSound} setSuccess={setSuccessWithSound} onMenuClick={() => setIsSidebarOpen(true)} onBackup={handleBackup} onRestore={handleRestore} />;
            case 'Settings':
                return <AppSettingsComponent settings={settings} currentUser={currentUserWithPermissions} customThemes={customThemes} onUpdateSettings={(s) => handleUpdate('settings', { ...settings, ...s })} onLogAIInteraction={handleLogAIInteraction} onMenuClick={() => setIsSidebarOpen(true)} onSaveTheme={(name) => handleUpdate('customThemes', [...customThemes, { id: `th-${Date.now()}`, name, settings, createdAt: new Date().toISOString() }])} onDeleteTheme={(id) => handleUpdate('customThemes', customThemes.filter((t: any) => t.id !== id))} onApplyTheme={(t) => handleUpdate('settings', t.settings)} />;
            default:
                return <Dashboard user={currentUserWithPermissions} events={events} services={services} clients={clients} setView={setView} setSelectedEventId={setSelectedEventId} onRequestNewEvent={() => setIsAddEventModalOpen(true)} onShowIntelligentCreator={() => setShowIntelligentCreator(true)} onShowImageGenerator={() => setShowImageGenerator(true)} onMenuClick={() => setIsSidebarOpen(true)} appSettings={settings} onUpdateSettings={(s) => handleUpdate('settings', { ...settings, ...s })} />;
        }
    };

    return (
        <ErrorBoundary>
            <div className="flex min-h-screen bg-[var(--background-color)] text-[var(--text-primary-color)] font-sans transition-colors duration-300 relative">
                {/* Global Liquid Overlay for the entire app (subtle) - Fixed position for scrolling support */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <MotionGraphicsOverlay
                        type="liquid"
                        color={settings.colors.primaryAccent}
                        opacity={0.15} // Very subtle global effect
                    />
                </div>

                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    collapsed={isSidebarCollapsed}
                    setCollapsed={setIsSidebarCollapsed}
                    currentView={view}
                    setView={setView}
                    currentUser={currentUserWithPermissions}
                    users={users}
                    onUserSwitch={(id) => handleUpdate('currentUserId', id)}
                    onLogout={() => handleUpdate('isLoggedIn', false)}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    appSettings={settings}
                    notifications={notifications}
                    onMarkAsRead={(id) => handleUpdate('notifications', notifications.map((n: Notification) => n.id === id ? { ...n, read: true } : n))}
                    onClearAllNotifications={() => handleUpdate('notifications', [])}
                    onViewNotification={(id) => console.log('View', id)}
                />

                {/* Main Content - No internal overflow for global scrolling compatibility */}
                <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'} relative z-10 min-h-screen`}>
                    {renderContent()}
                </main>

                {showIntelligentCreator && (
                    <IntelligentCreator
                        services={services}
                        clients={clients}
                        onClose={() => setShowIntelligentCreator(false)}
                        onConfirm={(data, createClient) => {
                            handleUpdate('events', [...events, { ...data, eventId: `evt-${Date.now()}`, status: 'Draft', paymentStatus: 'Unpaid', salespersonId: currentUserId }]);
                            if (createClient && data.clientName) {
                                handleUpdate('clients', [...clients, { id: `cli-${Date.now()}`, companyName: data.clientName, primaryContactName: data.clientContact || 'TBD', email: 'tbd@example.com', clientStatus: 'Lead', createdAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString() }]);
                            }
                            setSuccessWithSound("Event created from intelligence.");
                        }}
                        setError={setErrorWithSound}
                    />
                )}

                {showImageGenerator && (
                    <ImageGenerator
                        onClose={() => setShowImageGenerator(false)}
                        setError={setErrorWithSound}
                        onLogAIInteraction={handleLogAIInteraction}
                    />
                )}

                <ErrorBanner message={error} clearError={() => setError(null)} />
                <SuccessBanner message={success} clearSuccess={() => setSuccess(null)} />
                {aiError && <QuotaErrorModal error={aiError} onClose={() => setAiError(null)} />}
            </div>
        </ErrorBoundary>
    );
};

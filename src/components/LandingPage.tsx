
// components/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import type { User, AppSettings } from '../types';
import { QuoteOfTheDay } from './common/QuoteOfTheDay';
import { MotionGraphicsOverlay } from './common/MotionGraphicsOverlay';
import { Modal } from './common/Modal';
import { LockClosedIcon, SparkleIcon, UserCircleIcon, BoltIcon, DocumentTextIcon, TrendingUpIcon, EyeIcon } from './common/icons';

interface LandingPageProps {
    users: User[];
    defaultUserId: string;
    onLogin: (userId: string) => void;
    settings: AppSettings;
    isExiting?: boolean;
}

// --- Typewriter Effect Component ---
const TypewriterEffect: React.FC<{ text: string; delay?: number }> = ({ text, delay = 50 }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(timer);
            }
        }, delay);
        return () => clearInterval(timer);
    }, [text, delay]);

    return <span>{displayedText}<span className="animate-pulse">|</span></span>;
};

// --- Live Activity Ticker ---
const ActivityTicker = () => {
    return (
        <div className="overflow-hidden whitespace-nowrap w-full py-3 bg-black/40 backdrop-blur-md border-t border-white/10 z-20 relative">
            <div className="inline-block animate-marquee">
                <span className="mx-8 text-xs font-mono text-cyan-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div> SYSTEM: AI Agent 'Gemini-Pro' active</span>
                <span className="mx-8 text-xs font-mono text-purple-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div> EVENT: Neom Gala proposal generated (2m ago)</span>
                <span className="mx-8 text-xs font-mono text-green-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div> FINANCE: Q3 Revenue Forecast Updated</span>
                <span className="mx-8 text-xs font-mono text-blue-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div> ALERT: Vendor cost analysis complete</span>
            </div>
             <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
            `}</style>
        </div>
    )
}

export const LandingPage: React.FC<LandingPageProps> = ({ users, defaultUserId, onLogin, settings, isExiting }) => {
    const [selectedUserId, setSelectedUserId] = useState(defaultUserId);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [bgImageIndex, setBgImageIndex] = useState(0);
    const [isLoginHovered, setIsLoginHovered] = useState(false);

    // Background Image Rotation
    useEffect(() => {
        const imagePool = settings.landingPage?.background?.imagePool || [];
        if (imagePool.length > 1) {
            const interval = setInterval(() => {
                setBgImageIndex(prev => (prev + 1) % imagePool.length);
            }, 8000); 
            return () => clearInterval(interval);
        }
    }, [settings]);

    const handleLoginClick = () => {
        const user = users.find(u => u.userId === selectedUserId);
        if (user?.role === 'Admin') {
            setShowPinModal(true);
            setPinInput('');
            setPinError(null);
        } else {
            onLogin(selectedUserId);
        }
    };

    const handlePinVerify = () => {
        const adminPin = settings.adminPin || '1234';
        if (pinInput === adminPin) {
            onLogin(selectedUserId);
            setShowPinModal(false);
        } else {
            setPinError('Incorrect PIN');
            setPinInput('');
        }
    };
    
    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      setPinInput(val);
      setPinError(null);
      const adminPin = settings.adminPin || '1234';
      if (val.length === 4) {
          if (val === adminPin) {
             onLogin(selectedUserId);
             setShowPinModal(false);
          } else {
              setTimeout(() => { setPinError('Incorrect PIN'); setPinInput(''); }, 300);
          }
      }
    };

    const selectedUser = users.find(u => u.userId === selectedUserId);

    return (
        <div className={`relative min-h-screen w-full flex flex-col overflow-hidden text-white font-sans selection:bg-[var(--primary-accent-color)] selection:text-white ${isExiting ? 'animate-warp-out' : ''}`}>
            
            {/* --- Liquid Background Layer --- */}
            <div className="absolute inset-0 z-0 bg-[#0f172a]">
                 {/* Motion Graphics Overlay in Liquid Mode */}
                 <MotionGraphicsOverlay 
                    type="liquid"
                    color={settings.colors.primaryAccent}
                    opacity={0.8}
                 />
                 
                 {/* Image Overlay (Low Opacity) */}
                 {settings.landingPage?.background?.imagePool?.map((img, index) => (
                    <div 
                        key={img}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out mix-blend-overlay ${index === bgImageIndex ? 'opacity-20' : 'opacity-0'}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                 ))}
                 
                 {/* Darkening Gradients for readability */}
                 <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/90" />
                 <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-900/80" />
            </div>

            {/* --- Main Content Container --- */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 py-12">
                
                <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    
                    {/* LEFT COLUMN: Brand & Value Prop */}
                    <div className="text-center lg:text-left space-y-8 animate-in-item" style={{ animationDelay: '0ms' }}>
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-white/10 transition-colors cursor-default group">
                            <SparkleIcon className="h-4 w-4 text-[var(--primary-accent-color)] group-hover:rotate-12 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200 group-hover:text-white transition-colors">Powered by Gemini 1.5 Pro</span>
                        </div>

                        <div>
                            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-white drop-shadow-2xl">
                                Elitepro <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent-color)] via-cyan-400 to-purple-400 animate-gradient-x">
                                    Events
                                </span>
                            </h1>
                            <p className="mt-8 text-lg sm:text-xl text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                                <span className="text-white font-medium">Orchestrate the extraordinary.</span> Elitepro Events Hub fuses elite management with generative AI to automate proposals, forecast profits, and visualize concepts instantly.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Login & Features */}
                    <div className="w-full max-w-md mx-auto lg:mr-0 space-y-8">
                        
                        {/* Login Card */}
                        <div 
                            className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] p-8 animate-in-item relative overflow-hidden group hover:border-white/20 transition-colors duration-500" 
                            style={{ animationDelay: '150ms' }}
                        >
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <UserCircleIcon className="h-6 w-6 text-[var(--primary-accent-color)]"/> Access Portal
                                </h2>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="relative group/select">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 pl-1">Select Profile</label>
                                    <select
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        className="w-full pl-4 pr-10 py-4 bg-black/40 border border-white/10 rounded-2xl text-white appearance-none focus:ring-2 focus:ring-[var(--primary-accent-color)] focus:border-transparent outline-none transition-all cursor-pointer hover:bg-black/60 font-medium text-lg"
                                    >
                                        {users.map(u => (
                                            <option key={u.userId} value={u.userId} className="bg-slate-900 text-white">
                                                {u.name} &mdash; {u.role}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-[42px] text-slate-500 pointer-events-none group-hover/select:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>

                                <button
                                    onClick={handleLoginClick}
                                    onMouseEnter={() => setIsLoginHovered(true)}
                                    onMouseLeave={() => setIsLoginHovered(false)}
                                    className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-white shadow-xl shadow-[var(--primary-accent-color)]/20 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 relative overflow-hidden group/btn"
                                    style={{ 
                                        background: `linear-gradient(135deg, var(--primary-accent-color), #0d9488)` 
                                    }}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-3">
                                        {selectedUser?.role === 'Admin' ? 'Authenticate' : 'Enter Dashboard'}
                                        {selectedUser?.role === 'Admin' ? <LockClosedIcon className="h-5 w-5"/> : <BoltIcon className="h-5 w-5"/>}
                                    </span>
                                    {/* Liquid Button Effect */}
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out rounded-2xl"></div>
                                </button>
                            </div>
                        </div>

                        {/* Feature Pills */}
                        <div className="flex justify-between gap-2 animate-in-item" style={{ animationDelay: '300ms' }}>
                            {[
                                { icon: DocumentTextIcon, label: 'Smart Proposals' },
                                { icon: TrendingUpIcon, label: 'Profit Forecast' },
                                { icon: EyeIcon, label: 'Visual AI' }
                            ].map((feature, i) => (
                                <div key={i} className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors cursor-default group">
                                    <feature.icon className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-300 transition-colors text-center leading-tight">{feature.label}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* Footer Area */}
            <div className="relative z-20 w-full">
                <ActivityTicker />
                <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                             &copy; {new Date().getFullYear()} Elitepro Events & Advertising. All rights reserved.
                        </div>
                        <div className="flex items-center gap-2">
                            <QuoteOfTheDay quotes={settings.landingPage?.motivationalQuotes || []} />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Admin PIN Modal --- */}
            {showPinModal && (
                <Modal title="" onClose={() => setShowPinModal(false)} footer={null}>
                    <div className="flex flex-col items-center p-8">
                        <div className="w-20 h-20 rounded-full bg-[var(--primary-accent-color)]/10 flex items-center justify-center mb-6 text-[var(--primary-accent-color)] ring-1 ring-[var(--primary-accent-color)]/30 shadow-[0_0_30px_rgba(var(--primary-accent-color-rgb),0.2)]">
                            <LockClosedIcon className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Admin Access</h3>
                        <p className="text-sm mb-8 text-center text-slate-400 max-w-xs">
                            This area is restricted. Please enter your 4-digit security PIN.
                        </p>

                        <div className="relative w-full max-w-[280px] mb-6">
                            <div className="flex justify-between gap-3">
                                {[0, 1, 2, 3].map((index) => (
                                    <div 
                                        key={index}
                                        className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                                            pinInput.length === index 
                                                ? 'border-[var(--primary-accent-color)] bg-[var(--primary-accent-color)]/10 shadow-[0_0_15px_rgba(var(--primary-accent-color-rgb),0.3)] scale-110 text-white' 
                                                : pinInput.length > index 
                                                    ? 'border-[var(--primary-accent-color)]/50 bg-[var(--primary-accent-color)]/5 text-[var(--primary-accent-color)]' 
                                                    : 'border-white/10 bg-white/5 text-slate-500'
                                        } ${pinError ? 'border-red-500 animate-shake' : ''}`}
                                    >
                                        {pinInput.length > index ? '●' : ''}
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                autoComplete="one-time-code"
                                value={pinInput}
                                onChange={handlePinChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                autoFocus
                                onKeyDown={(e) => { if(e.key === 'Enter') handlePinVerify(); }}
                            />
                        </div>

                        <div className="h-6 mb-2 text-center w-full">
                            {pinError && <p className="text-red-400 text-xs font-bold uppercase tracking-wide bg-red-900/20 py-1 px-3 rounded-full inline-block border border-red-500/20">{pinError}</p>}
                        </div>

                        <button
                            onClick={handlePinVerify}
                            disabled={pinInput.length !== 4}
                            className="w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 bg-[var(--primary-accent-color)] hover:bg-opacity-90"
                        >
                            Verify Credentials
                        </button>
                    </div>
                </Modal>
            )}
            
            <style>{`
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 5s ease infinite;
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50% }
                    50% { background-position: 100% 50% }
                    100% { background-position: 0% 50% }
                }
            `}</style>
        </div>
    );
};

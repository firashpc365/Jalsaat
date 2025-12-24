
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ReactLenis, useLenis } from '@studio-freight/react-lenis';
import { 
  motion, 
  AnimatePresence, 
  useScroll, 
  useVelocity, 
  useSpring, 
  useTransform 
} from 'framer-motion';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Printer, 
  ArrowRight, 
  Layers, 
  Zap, 
  MapPin, 
  FileText, 
  Hexagon, 
  Aperture, 
  Phone, 
  Mail, 
  Globe,
  Sparkles
} from 'lucide-react';

// --- 1. GLOBAL CONFIGURATION & SOURCE OF TRUTH ---

const BRAND_CONFIG = {
  industrial: {
    id: 'industrial',
    name: 'JAG ARABIA',
    legal: 'Al-Janoub Al-Gharbi Trading Est.',
    cr: '7012235367',
    address: 'Prince Mohammed Street, Al-Khobar, Saudi Arabia',
    phone: '+966 13 864 0000',
    email: 'sales@jagarabia.com',
    color: '#d32f2f', // Deep Red
    accent: 'border-red-600',
    bgGradient: 'from-red-900/40 to-black',
    font: 'font-mono', 
    icon: Hexagon
  },
  creative: {
    id: 'creative',
    name: 'ELITEPRO',
    tagline: 'Events & Advertising',
    legal: 'ElitePro Creative Solutions',
    cr: '1010101010',
    address: 'King Fahd Road, Riyadh, Saudi Arabia',
    color: '#2ecc71', // Green
    accent: 'border-green-500',
    bgGradient: 'from-green-900/30 to-yellow-900/30',
    font: 'font-serif', 
    icon: Aperture
  }
};

const PRODUCT_MASTER = [
  { id: 101, name: 'Industrial Valve - Series A', price: 450.00, sku: 'IV-A-100' },
  { id: 102, name: 'Hydraulic Pump X500', price: 1250.00, sku: 'HP-X-500' },
  { id: 103, name: 'Safety Harness Pro', price: 85.50, sku: 'SH-PRO-1' },
  { id: 104, name: 'Steel Piping (Per Meter)', price: 32.00, sku: 'SP-PM-01' },
  { id: 105, name: 'Gasket Seal Kit', price: 15.00, sku: 'GS-K-005' },
  { id: 106, name: 'Heavy Duty Flange', price: 120.00, sku: 'HDF-200' },
  { id: 107, name: 'Pressure Gauge', price: 45.00, sku: 'PG-ANA-1' },
];

const PORTFOLIO_ITEMS = [
  { id: 1, title: 'Neon Nights Gala', cat: 'Event', date: 'Oct 2023', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80' },
  { id: 2, title: 'Future Tech Summit', cat: 'Corporate', date: 'Nov 2023', img: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80' },
  { id: 3, title: 'Luxe Brand Launch', cat: 'Brand Activation', date: 'Dec 2023', img: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80' },
  { id: 4, title: 'Desert Sound Festival', cat: 'Concert', date: 'Jan 2024', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80' },
  { id: 5, title: 'Aramco Exhibtion', cat: 'Exhibition', date: 'Feb 2024', img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80' },
  { id: 6, title: 'Riyadh Season Booth', cat: 'Design', date: 'Mar 2024', img: 'https://images.unsplash.com/photo-1560439514-e960a3ef5019?auto=format&fit=crop&q=80' },
];

// --- 2. UI PRIMITIVES (THE GLASS CORE) ---

const GlassPanel = ({ children, className, hoverEffect = true }: { children?: React.ReactNode, className?: string, hoverEffect?: boolean }) => (
  <motion.div 
    className={`
      relative overflow-hidden
      bg-white/5 backdrop-blur-2xl 
      border border-white/10 rounded-2xl 
      shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
      ${className}
    `}
    whileHover={hoverEffect ? { y: -5, boxShadow: "0 12px 40px 0 rgba(0,0,0,0.5)" } : {}}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {/* Noise Texture Overlay */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const LiquidButton = ({ onClick, label, icon: Icon, brand }: any) => (
  <button 
    onClick={onClick}
    className="relative group px-6 py-3 rounded-full overflow-hidden border border-white/20 font-bold tracking-widest uppercase text-xs text-white transition-all hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
  >
    <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out ${brand === 'industrial' ? 'bg-red-700' : 'bg-emerald-600'}`} />
    <span className="relative flex items-center gap-2">
      {Icon && <Icon size={14} />}
      {label}
    </span>
  </button>
);

// --- 3. FEATURE: INTERACTIVE QUOTE BUILDER (INDUSTRIAL) ---

const QuoteBuilder = () => {
  const [items, setItems] = useState<{ id: number; productId: number; name: string; sku: string; qty: number; price: number; total: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(PRODUCT_MASTER[0].id);

  const addItem = () => {
    const product = PRODUCT_MASTER.find(p => p.id === selectedProductId);
    if (!product) return;
    
    const newItem = {
      id: Date.now(), // Unique Row ID
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: 1,
      price: product.price,
      total: product.price
    };
    setItems([...items, newItem]);
  };

  const updateQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(item => 
      item.id === id ? { ...item, qty: newQty, total: newQty * item.price } : item
    ));
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
  const vat = grandTotal * 0.15;
  const totalDue = grandTotal + vat;

  const handlePrint = () => {
    window.print();
  };

  return (
    <GlassPanel className="p-8 w-full max-w-5xl mx-auto min-h-[600px] flex flex-col" hoverEffect={false}>
      
      {/* --- INVOICE HEADER (PRINT & VIEW) --- */}
      <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6 print:border-black print:text-black">
        <div>
          <h2 className="text-3xl font-bold text-red-500 mb-2 tracking-tighter print:text-red-700">{BRAND_CONFIG.industrial.name}</h2>
          <div className="text-white/60 text-xs space-y-1 font-mono print:text-black">
            <p className="font-bold">{BRAND_CONFIG.industrial.legal}</p>
            <p>CR: {BRAND_CONFIG.industrial.cr}</p>
            <p className="flex items-center gap-2"><MapPin size={10} /> {BRAND_CONFIG.industrial.address}</p>
            <p className="flex items-center gap-2"><Phone size={10} /> {BRAND_CONFIG.industrial.phone}</p>
          </div>
        </div>
        <div className="text-right print:text-black">
          <h1 className="text-5xl font-thin tracking-tighter mb-2 text-white print:text-black">QUOTATION</h1>
          <div className="text-sm font-mono text-white/50 print:text-black space-y-1">
            <p>REF: #Q-{Date.now().toString().slice(-6)}</p>
            <p>DATE: {new Date().toLocaleDateString()}</p>
            <p>VALID UNTIL: {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* --- CONTROL BAR (HIDDEN ON PRINT) --- */}
      <div className="flex flex-wrap gap-4 mb-8 print:hidden bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-white/40 mb-1 block uppercase tracking-wider">Select Product</label>
            <select 
              className="w-full bg-black/40 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 font-mono text-sm appearance-none"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
            >
              {PRODUCT_MASTER.map(p => (
                <option key={p.id} value={p.id}>{p.sku} | {p.name} — ${p.price.toFixed(2)}</option>
              ))}
            </select>
        </div>
        <div className="flex items-end gap-2">
            <LiquidButton onClick={addItem} label="Add to Quote" icon={Plus} brand="industrial" />
            <button 
                onClick={handlePrint} 
                className="p-3 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                title="Print Quote"
            >
              <Printer size={18} />
            </button>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="flex-grow overflow-hidden rounded-lg border border-white/10 print:border-black/20">
        <table className="w-full text-left text-sm print:text-black">
          <thead className="bg-white/5 text-white/70 uppercase tracking-wider font-mono text-xs print:bg-gray-100 print:text-black border-b border-white/10 print:border-black/20">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4">Description</th>
              <th className="p-4 w-24 text-center">Qty</th>
              <th className="p-4 w-32 text-right">Unit Price</th>
              <th className="p-4 w-32 text-right">Total</th>
              <th className="p-4 w-16 text-center print:hidden">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 print:divide-gray-300">
            <AnimatePresence mode='popLayout'>
              {items.map((item) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, x: -20, backgroundColor: "rgba(255,255,255,0.1)" }}
                  animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                  exit={{ opacity: 0, x: 20, backgroundColor: "rgba(255,0,0,0.1)" }}
                  transition={{ duration: 0.3 }}
                  className="group hover:bg-white/5 print:hover:bg-transparent"
                >
                  <td className="p-4 font-mono text-xs opacity-70">{item.sku}</td>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-center">
                    <input 
                      type="number" 
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                      className="w-16 bg-transparent border-b border-white/20 focus:border-red-500 outline-none text-center print:border-none print:w-auto"
                    />
                  </td>
                  <td className="p-4 text-right font-mono">${item.price.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono font-bold text-red-400 print:text-black">${item.total.toFixed(2)}</td>
                  <td className="p-4 text-center print:hidden">
                    <button 
                        onClick={() => removeItem(item.id)} 
                        className="text-white/20 hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-white/30 italic border-none">
                    <div className="flex flex-col items-center gap-4">
                        <Hexagon size={48} className="opacity-20" />
                        <span>No items added. Use the control bar above.</span>
                    </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- FOOTER / TOTALS --- */}
      <div className="flex justify-between mt-8 print:mt-12 print:text-black items-start">
        <div className="w-1/2 text-xs text-white/40 print:text-gray-500 space-y-2 pt-2">
             <p className="font-bold uppercase tracking-wider text-white/60 print:text-black">Terms & Conditions:</p>
             <p>1. Prices are valid for 15 days from quotation date.</p>
             <p>2. Payment Terms: 50% Advance, 50% on Delivery.</p>
             <p>3. Delivery lead time: 3-5 Business Days.</p>
        </div>
        <div className="w-80 space-y-3 bg-black/20 p-6 rounded-xl border border-white/5 print:bg-transparent print:border-none print:p-0">
          <div className="flex justify-between text-sm text-white/60 print:text-black">
            <span>Subtotal</span>
            <span className="font-mono">${grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60 print:text-black">
            <span>VAT (15%)</span>
            <span className="font-mono">${vat.toFixed(2)}</span>
          </div>
          <div className="h-px bg-white/20 print:bg-black my-2" />
          <div className="flex justify-between text-2xl font-bold font-mono text-white print:text-black">
            <span>Total</span>
            <span className="text-red-400 print:text-black">${totalDue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

// --- 4. FEATURE: CREATIVE PORTFOLIO (CREATIVE) ---

const PortfolioGrid = () => (
    <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto pb-20"
    >
        {PORTFOLIO_ITEMS.map((item, i) => (
        <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
        >
            <GlassPanel className="group cursor-pointer h-full flex flex-col">
            <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                    src={item.img} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                {/* Hover Reveal Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm bg-black/30">
                    <button className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                        View Project
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">{item.cat} • {item.date}</span>
                    <h3 className="text-2xl font-serif text-white leading-none">{item.title}</h3>
                </div>
            </div>
            </GlassPanel>
        </motion.div>
        ))}
    </motion.div>
);

// --- 5. MAIN LAYOUT & APP ROOT ---

export default function ProjectGeminiLink() {
  const [activeBrand, setActiveBrand] = useState<'industrial' | 'creative'>('industrial');
  
  // -- PHYSICS: MOUSE PARALLAX --
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth) * 20, 
        y: (e.clientY / window.innerHeight) * 20 
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // -- PHYSICS: VELOCITY SKEW --
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const skewY = useTransform(smoothVelocity, [-1000, 1000], [-5, 5]);

  const currentConfig = BRAND_CONFIG[activeBrand];

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <div className={`min-h-screen text-white overflow-hidden transition-colors duration-700 ${currentConfig.font} selection:bg-${activeBrand === 'industrial' ? 'red-500' : 'emerald-500'} selection:text-white`}>
        
        {/* --- GLOBAL BACKGROUND SYSTEM --- */}
        <div className="fixed inset-0 z-0">
          {/* Base Layer */}
          <div className="absolute inset-0 bg-[#050505]" />
          
          {/* Architectural Overlay Image (Fixed & Subtle) */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale mix-blend-overlay" />
          
          {/* Dynamic Gradients (The Orbs) */}
          <motion.div 
            className={`absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-30 mix-blend-screen transition-colors duration-1000 ${activeBrand === 'industrial' ? 'bg-red-900' : 'bg-emerald-900'}`}
            animate={{ x: mousePos.x * -2, y: mousePos.y * -2 }}
          />
          <motion.div 
            className={`absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-20 mix-blend-screen transition-colors duration-1000 ${activeBrand === 'industrial' ? 'bg-orange-900' : 'bg-blue-900'}`}
            animate={{ x: mousePos.x * 2, y: mousePos.y * 2 }}
          />
          
          {/* Vignette & Grain */}
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80" />
        </div>

        {/* --- NAVIGATION & TOGGLE --- */}
        <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center print:hidden backdrop-blur-sm bg-black/10 border-b border-white/5">
          <div className="flex items-center gap-6">
            <motion.div 
              key={activeBrand} // Triggers animation on change
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tracking-tight flex items-center gap-3"
            >
              <currentConfig.icon className={`w-8 h-8 ${activeBrand === 'industrial' ? 'text-red-500' : 'text-emerald-400'}`} />
              <div className="flex flex-col">
                <span className="leading-none tracking-tighter">{currentConfig.name}</span>
                {activeBrand === 'creative' && <span className="text-[10px] font-sans font-normal opacity-60 tracking-widest uppercase">Creative</span>}
                {activeBrand === 'industrial' && <span className="text-[10px] font-sans font-normal opacity-60 tracking-widest uppercase">Industrial</span>}
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-4 text-xs font-bold uppercase tracking-widest opacity-50">
                <span className="hover:text-white cursor-pointer transition-colors">About</span>
                <span className="hover:text-white cursor-pointer transition-colors">Services</span>
                <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>

            <div className="h-8 w-px bg-white/20 hidden md:block"></div>

            <div className="bg-black/40 backdrop-blur-md rounded-full p-1 flex border border-white/10 shadow-lg">
              {['industrial', 'creative'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveBrand(mode as any)}
                  className={`
                    px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-500
                    ${activeBrand === mode 
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                      : 'text-white/40 hover:text-white'}
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* --- MAIN CONTENT AREA WITH PHYSICS --- */}
        <motion.main 
            className="relative z-10 pt-32 pb-20 px-4 min-h-screen flex flex-col items-center"
            style={{ skewY }} // The Lenis Velocity Effect
        >
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBrand}
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-7xl"
            >
              {activeBrand === 'industrial' ? (
                <div className="w-full flex flex-col items-center">
                  <div className="text-center mb-16 max-w-3xl">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Zap size={12} fill="currentColor" /> Industrial Division
                    </motion.div>
                    <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter text-white">
                      PRECISION <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">ENGINEERING</span>
                    </h1>
                    <p className="text-white/50 text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed">
                      Advanced procurement, heavy machinery, and industrial supply chain solutions for the Kingdom's mega-projects.
                    </p>
                  </div>
                  
                  {/* THE ACTIVE COMPONENT */}
                  <QuoteBuilder />
                  
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                   <div className="text-center mb-16 max-w-4xl">
                     <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Sparkles size={12} /> Creative Division
                    </motion.div>
                    <h1 className="text-7xl md:text-9xl font-serif italic mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-yellow-200">
                      Elite Experiences.
                    </h1>
                    <p className="text-white/60 text-lg md:text-xl font-sans max-w-2xl mx-auto leading-relaxed">
                      Curating unforgettable moments through high-end event management, brand activation, and immersive design.
                    </p>
                  </div>
                  
                  {/* THE ACTIVE COMPONENT */}
                  <PortfolioGrid />
                  
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </motion.main>
      </div>
      
      {/* Global CSS for Print Logic & Scrollbar Hide */}
      <style>{`
        /* Hide Scrollbar for clean look */
        ::-webkit-scrollbar { width: 0px; background: transparent; }
        
        @media print {
          @page { margin: 0; size: auto; }
          body { 
            background: white !important; 
            color: black !important; 
            -webkit-print-color-adjust: exact; 
          }
          /* Hide non-printable elements */
          nav, button, select, .print\\:hidden { display: none !important; }
          
          /* Ensure text is black and sharp */
          * { 
            text-shadow: none !important; 
            color: black !important; 
            box-shadow: none !important;
          }
          
          /* Show print-only */
          .print\\:block { display: block !important; }
          
          /* Reset container widths for paper */
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; padding: 2cm !important; }
          
          /* Remove Glass effects for crisp printing */
          .backdrop-blur-2xl { 
            backdrop-filter: none !important; 
            background: white !important; 
            border: none !important; 
            box-shadow: none !important; 
          }
          
          /* Typography Resets for Paper */
          h1 { font-size: 24pt !important; color: black !important; }
          h2 { font-size: 18pt !important; color: #d32f2f !important; }
          p, td, th { font-size: 10pt !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th { border-bottom: 2px solid black !important; text-transform: uppercase !important; font-weight: bold !important; }
          td { border-bottom: 1px solid #ddd !important; }
        }
      `}</style>
    </ReactLenis>
  );
}

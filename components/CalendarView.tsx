
import React, { useState, useMemo } from 'react';
import type { EventItem } from '../types';
import { CalendarIcon } from './common/icons';

interface CalendarViewProps {
  events: EventItem[];
  onEventClick: (eventId: string) => void;
}

const statusColors: { [key: string]: string } = {
  'Draft': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Quote Sent': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'Confirmed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Completed': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Canceled': 'bg-red-500/20 text-red-300 border-red-500/30',
};

// Icons created locally to avoid circular deps if icons.tsx is missing them
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { days, monthLabel } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start if preferred, currently Sunday start (0)
    const paddingDays = firstDayOfMonth; 
    
    const daysArray = [];
    for (let i = 0; i < paddingDays; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(new Date(year, month, i));
    }

    return {
      days: daysArray,
      monthLabel: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/5 backdrop-blur-xl overflow-hidden animate-in-item">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <h2 className="text-xl font-bold text-[var(--text-primary-color)] flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[var(--primary-accent-color)]"/>
          {monthLabel}
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronLeft />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-white/10 rounded border border-white/10 transition-colors text-white">
            Today
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold uppercase text-[var(--text-secondary-color)] tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-grow auto-rows-fr bg-black/10">
        {days.map((date, index) => {
          if (!date) return <div key={`padding-${index}`} className="border-b border-r border-white/5 bg-black/20 min-h-[100px]" />;
          
          const dayEvents = getEventsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div key={date.toISOString()} className={`border-b border-r border-white/5 p-2 min-h-[120px] flex flex-col relative transition-colors hover:bg-white/5 ${isToday ? 'bg-[var(--primary-accent-color)]/5' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--primary-accent-color)] text-white' : 'text-[var(--text-secondary-color)]'}`}>
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-500">{dayEvents.length} events</span>
                )}
              </div>
              
              <div className="flex-grow space-y-1 overflow-y-auto custom-scrollbar max-h-[100px]">
                {dayEvents.map(event => (
                  <div 
                    key={event.eventId}
                    onClick={() => onEventClick(event.eventId)}
                    className={`text-[10px] p-1.5 rounded border cursor-pointer hover:brightness-110 transition-all shadow-sm ${statusColors[event.status] || 'bg-slate-700 text-white'}`}
                  >
                    <p className="font-bold truncate">{event.name}</p>
                    <p className="opacity-80 truncate text-[9px]">{event.clientName}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

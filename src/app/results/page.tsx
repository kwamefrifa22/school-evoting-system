
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trophy, AlertCircle, Timer, TrendingUp, Medal } from 'lucide-react';
import Image from 'next/image';
import { Class, Candidate, Position, SystemConfig } from '@/lib/types';

export default function ResultsPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [justOvertook, setJustOvertook] = useState<Set<string>>(new Set());

  const flipRefs = useRef<Map<string, { ref: HTMLDivElement; positions: Map<string, DOMRect> }>>(new Map());

  const snapshotPosition = (posId: string) => {
    const container = document.querySelector<HTMLDivElement>(`[data-pos-container="${posId}"]`);
    if (!container) return;
    const map = new Map<string, DOMRect>();
    container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach(el => {
      map.set(el.dataset.flipKey!, el.getBoundingClientRect());
    });
    flipRefs.current.set(posId, { ref: container, positions: map });
  };

  const animatePosition = (posId: string) => {
    const entry = flipRefs.current.get(posId);
    if (!entry) return;
    const container = document.querySelector<HTMLDivElement>(`[data-pos-container="${posId}"]`);
    if (!container) return;
    container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach(el => {
      const key = el.dataset.flipKey!;
      const prev = entry.positions.get(key);
      if (!prev) return;
      const curr = el.getBoundingClientRect();
      const dy = prev.top - curr.top;
      if (Math.abs(dy) < 1) return;
      el.style.transform = `translateY(${dy}px)`;
      el.style.transition = 'none';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.65s cubic-bezier(0.34, 1.4, 0.64, 1)';
          el.style.transform = 'translateY(0)';
        });
      });
    });
  };

  const fetchData = async () => {
    document.querySelectorAll<HTMLElement>('[data-pos-container]').forEach(el => {
      snapshotPosition(el.dataset.posContainer!);
    });

    const { data: cls } = await supabase.from('classes').select('*').order('name');
    const { data: pos } = await supabase.from('positions').select('*').order('order_index');
    const { data: cand } = await supabase.from('candidates').select('*');
    const { data: cfg } = await supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle();

    if (cand && pos) {
      const newOvertook = new Set<string>();
      pos.forEach(p => {
        const sorted = [...cand]
          .filter(c => c.position_id === p.id)
          .sort((a, b) => (b.votes || 0) - (a.votes || 0));
        sorted.forEach((c, idx) => {
          const prevRank = prevRanks.current.get(c.id);
          if (prevRank !== undefined && idx < prevRank) {
            newOvertook.add(c.id);
          }
          prevRanks.current.set(c.id, idx);
        });
      });

      if (newOvertook.size > 0) {
        setJustOvertook(newOvertook);
        setTimeout(() => setJustOvertook(new Set()), 2000);
      }
    }

    if (cls) setClasses(cls);
    if (pos) setPositions(pos);
    if (cand) setCandidates(cand);
    if (cfg) setConfig(cfg);

    setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-pos-container]').forEach(el => {
        animatePosition(el.dataset.posContainer!);
      });
    }, 0);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('results_live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!config?.is_open || !config?.opened_at) {
      setElapsedTime("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      const start = new Date(config.opened_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [config?.is_open, config?.opened_at]);

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes, eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  const getCandidateStyles = (rank: number, votes: number, overtook: boolean) => {
    if (overtook) return 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40';
    if (votes === 0) return 'bg-white/50 border-gray-100 opacity-70';
    if (rank === 0) return 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-500/10';
    return 'bg-white border-gray-100 shadow-sm';
  };

  const getRankColor = (rank: number, votes: number) => {
    if (votes === 0) return 'bg-gray-200 text-gray-500';
    if (rank === 0) return 'bg-emerald-500 text-white';
    if (rank === 1) return 'bg-blue-500 text-white';
    return 'bg-secondary text-white';
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-body pb-12">
      <header className="bg-secondary text-white py-4 px-4 sm:px-6 lg:px-10 sticky top-0 z-50 border-b-4 border-accent shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-accent p-2.5 rounded-2xl rotate-3 shadow-lg">
            <Trophy className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none">Live Scoreboard</h1>
            <p className="text-[9px] font-bold text-accent tracking-[0.3em] uppercase opacity-80">CIS Sovereign Electoral Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="bg-white/10 flex-1 sm:flex-none px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 text-center min-w-[100px]">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 flex items-center justify-center gap-1 mb-0.5"><Timer className="w-3 h-3" /> Timer</p>
            <p className="text-lg font-black text-accent font-mono tracking-tight leading-none">{elapsedTime}</p>
          </div>
          <div className="bg-white/10 flex-1 sm:flex-none px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 text-center min-w-[90px]">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Turnout</p>
            <p className="text-lg font-black text-accent leading-none">{totals.turnout}%</p>
          </div>
          <div className="bg-white/10 flex-1 sm:flex-none px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 text-center min-w-[90px]">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Tally</p>
            <p className="text-lg font-black text-white leading-none">{totals.votes}</p>
          </div>
        </div>
      </header>

      <main className="max-w-[2560px] mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {positions.map(pos => {
            const posCandidates = candidates
              .filter(c => c.position_id === pos.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            return (
              <div key={pos.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-secondary text-white px-4 py-2 rounded-xl font-black uppercase tracking-tight text-sm skew-x-[-6deg] shadow-md border-l-4 border-accent whitespace-nowrap">
                    {pos.name}
                  </div>
                  <div className="h-px bg-gray-200 flex-1 rounded-full" />
                </div>

                <div data-pos-container={pos.id} className="bg-white/40 backdrop-blur-sm rounded-2xl p-2.5 flex-1 flex flex-col gap-2">
                  {posCandidates.map((cand, idx) => {
                    const isWinner = idx === 0 && (cand.votes || 0) > 0;
                    const overtook = justOvertook.has(cand.id);
                    const styles = getCandidateStyles(idx, cand.votes || 0, overtook);
                    const rankColor = getRankColor(idx, cand.votes || 0);

                    return (
                      <div key={cand.id} data-flip-key={cand.id} className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-3 ${styles} hover:scale-[1.01]`}>
                        {overtook && <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest z-10 animate-bounce shadow-md">↑ Up</div>}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${rankColor}`}>
                          {isWinner ? <Medal className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 shadow-md ${isWinner ? 'border-emerald-400' : overtook ? 'border-amber-400' : 'border-white'}`}>
                          <Image src={cand.photo_url} alt={cand.full_name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black text-sm uppercase tracking-tight leading-tight truncate ${isWinner ? 'text-emerald-900' : overtook ? 'text-amber-900' : 'text-secondary'}`}>
                            {cand.full_name}
                          </h4>
                          {isWinner && !overtook && <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full"><TrendingUp className="w-2.5 h-2.5" /><span className="text-[8px] font-black uppercase tracking-widest">Frontrunner</span></div>}
                          {overtook && <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"><TrendingUp className="w-2.5 h-2.5" /><span className="text-[8px] font-black uppercase tracking-widest">Moving up!</span></div>}
                        </div>
                        <div className="text-right shrink-0 pl-1">
                          <p className={`text-2xl font-black tracking-tighter tabular-nums leading-none ${isWinner ? 'text-emerald-600' : overtook ? 'text-amber-600' : 'text-secondary'}`}>
                            {cand.votes || 0}
                          </p>
                          <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Votes</p>
                        </div>
                      </div>
                    );
                  })}
                  {posCandidates.length === 0 && <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-20"><AlertCircle className="w-10 h-10 mb-3" /><p className="text-xs font-black uppercase tracking-[0.3em] text-center">Uncontested</p></div>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

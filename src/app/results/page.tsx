
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/badge';
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

  const fetchData = async () => {
    const { data: cls } = await supabase.from('classes').select('*').order('name');
    const { data: pos } = await supabase.from('positions').select('*').order('order_index');
    const { data: cand } = await supabase.from('candidates').select('*');
    const { data: cfg } = await supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle();

    if (cls) setClasses(cls);
    if (pos) setPositions(pos);
    if (cand) setCandidates(cand);
    if (cfg) setConfig(cfg);
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

  // Timer Effect
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

      setElapsedTime(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.is_open, config?.opened_at]);

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes,
      eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  const getCandidateStyles = (rank: number, votes: number) => {
    if (votes === 0) return 'bg-white/50 border-gray-100 opacity-70';
    if (rank === 0) return 'bg-emerald-50 border-emerald-400 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/10';
    return 'bg-white border-gray-100 shadow-sm';
  };

  const getRankColor = (rank: number, votes: number) => {
    if (votes === 0) return 'bg-gray-200 text-gray-500';
    if (rank === 0) return 'bg-emerald-500 text-white shadow-emerald-200';
    if (rank === 1) return 'bg-blue-500 text-white';
    return 'bg-secondary text-white';
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-body">
      {/* Dynamic Header */}
      <header className="bg-secondary text-white py-10 px-8 lg:px-12 flex flex-col xl:flex-row items-center justify-between sticky top-0 z-50 border-b-8 border-accent shadow-2xl space-y-8 xl:space-y-0">
        <div className="flex items-center gap-8">
          <div className="bg-accent p-4 rounded-[2rem] rotate-3 shadow-2xl scale-110">
            <Trophy className="w-12 h-12 text-secondary" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">Live Scoreboard</h1>
            <p className="text-sm font-bold text-accent tracking-[0.4em] uppercase opacity-90">CIS Sovereign Electoral Hub</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full xl:w-auto">
          <div className="bg-white/10 px-10 py-4 rounded-[2.5rem] backdrop-blur-xl border border-white/20 text-center min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" /> Live Timer
            </p>
            <p className="text-4xl font-black text-accent font-mono tracking-tight">{elapsedTime}</p>
          </div>
          <div className="bg-white/10 px-10 py-4 rounded-[2.5rem] backdrop-blur-xl border border-white/20 text-center min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Participation</p>
            <p className="text-4xl font-black text-accent">{totals.turnout}%</p>
          </div>
          <div className="bg-white/10 px-10 py-4 rounded-[2.5rem] backdrop-blur-xl border border-white/20 text-center min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Tally</p>
            <p className="text-4xl font-black text-white">{totals.votes}</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-[2560px] mx-auto px-6 md:px-12 py-16 space-y-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-x-10 gap-y-20">
          {positions.map(pos => {
            const posCandidates = candidates
              .filter(c => c.position_id === pos.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            return (
              <div key={pos.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Position Title Bar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="bg-secondary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-tighter text-lg skew-x-[-8deg] shadow-xl border-l-8 border-accent">
                    {pos.name}
                  </div>
                  <div className="h-1 bg-gray-200 flex-1 rounded-full" />
                </div>

                {/* Candidates List Container */}
                <div className="bg-white/40 backdrop-blur-sm rounded-[3.5rem] p-4 flex-1 flex flex-col space-y-6">
                  {posCandidates.map((cand, idx) => {
                    const styles = getCandidateStyles(idx, cand.votes || 0);
                    const rankColor = getRankColor(idx, cand.votes || 0);
                    const isWinner = idx === 0 && (cand.votes || 0) > 0;

                    return (
                      <div 
                        key={cand.id} 
                        className={`group relative p-5 rounded-[2.5rem] border transition-all duration-500 flex items-center gap-5 ${styles} hover:scale-[1.02] hover:shadow-xl`}
                      >
                        {/* Rank Badge */}
                        <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-xl border-b-4 shrink-0 transition-all ${rankColor}`}>
                          {isWinner ? <Medal className="w-6 h-6" /> : idx + 1}
                        </div>

                        {/* Candidate Avatar */}
                        <div className={`relative w-24 h-24 rounded-[2rem] overflow-hidden shrink-0 border-4 shadow-xl transition-all duration-500 group-hover:rotate-2 ${isWinner ? 'border-emerald-400 scale-105' : 'border-white'}`}>
                          <Image src={cand.photo_url} alt={cand.full_name} fill className="object-cover" />
                        </div>

                        {/* Name & Status */}
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className={`font-black text-xl uppercase truncate tracking-tight transition-colors ${isWinner ? 'text-emerald-900' : 'text-secondary'}`}>
                            {cand.full_name}
                          </h4>
                          {isWinner && (
                            <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Frontrunner</span>
                            </div>
                          )}
                        </div>

                        {/* Vote Display */}
                        <div className="text-right shrink-0">
                          <p className={`text-4xl font-black tracking-tighter tabular-nums leading-none ${isWinner ? 'text-emerald-600' : 'text-secondary'}`}>
                            {cand.votes || 0}
                          </p>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Votes Cast</p>
                        </div>
                      </div>
                    );
                  })}

                  {posCandidates.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 opacity-20">
                      <AlertCircle className="w-16 h-16 mb-6" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-center">Uncontested</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      
      <footer className="py-12 text-center text-muted-foreground">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">© 2026 Country International School • Sovereign Electoral Data</p>
      </footer>
    </div>
  );
}

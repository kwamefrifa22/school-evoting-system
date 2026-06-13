
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ElectionHeader } from '@/components/shared/ElectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, CheckCircle, BarChart3, TrendingUp, Medal } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { Class, Candidate, Position } from '@/lib/types';

const chartConfig = {
  votes: {
    label: "Votes",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function ResultsPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const fetchData = async () => {
    const { data: cls } = await supabase.from('classes').select('*').order('name');
    const { data: pos } = await supabase.from('positions').select('*').order('order_index');
    const { data: cand } = await supabase.from('candidates').select('*');

    if (cls) setClasses(cls);
    if (pos) setPositions(pos);
    if (cand) setCandidates(cand);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('results_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes,
      eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  // Dynamic color function based on rank
  const getRankColor = (rank: number, total: number) => {
    if (rank === 0) return 'bg-emerald-500 text-white border-emerald-600'; // Winner
    if (rank === 1) return 'bg-lime-400 text-secondary border-lime-500'; // Second
    if (rank === 2) return 'bg-yellow-400 text-secondary border-yellow-500'; // Third
    if (rank >= total - 1) return 'bg-rose-500 text-white border-rose-600'; // Last
    return 'bg-orange-400 text-secondary border-orange-500'; // Middle
  };

  const getBarColor = (rank: number, total: number) => {
    if (rank === 0) return '#10b981'; // emerald-500
    if (rank === 1) return '#a3e635'; // lime-400
    if (rank >= total - 1) return '#f43f5e'; // rose-500
    return '#fbbf24'; // amber-400
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-secondary text-white py-6 px-8 flex items-center justify-between sticky top-0 z-50 border-b-4 border-accent">
        <div className="flex items-center gap-4">
          <Medal className="w-10 h-10 text-accent animate-bounce" />
          <h1 className="text-3xl font-headline font-black uppercase tracking-tighter">Live Electoral Scoreboard</h1>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Turnout</p>
            <p className="text-2xl font-black text-accent">{totals.turnout}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Votes Counted</p>
            <p className="text-2xl font-black text-primary-foreground">{totals.votes}</p>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-16">
        {positions.map(pos => {
          const posCandidates = candidates
            .filter(c => c.position_id === pos.id)
            .sort((a, b) => (b.votes || 0) - (a.votes || 0));

          const chartData = posCandidates.map((c, idx) => ({
            name: c.full_name,
            votes: c.votes || 0,
            rank: idx
          }));

          return (
            <section key={pos.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-6">
                <div className="bg-secondary text-white px-6 py-2 rounded-full font-black uppercase tracking-tighter text-xl skew-x-[-12deg] shadow-lg">
                  {pos.name}
                </div>
                <div className="h-1 bg-secondary/10 flex-1 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-1/3 animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leaderboard Card */}
                <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
                  <div className="divide-y divide-gray-100">
                    {posCandidates.map((cand, idx) => (
                      <div 
                        key={cand.id} 
                        className={`p-6 flex items-center gap-6 transition-all duration-500 relative ${idx === 0 ? 'bg-emerald-50/50' : 'bg-white'}`}
                      >
                        {/* Rank Badge */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border-b-4 shrink-0 shadow-md ${getRankColor(idx, posCandidates.length)}`}>
                          {idx + 1}
                        </div>

                        {/* Photo */}
                        <div className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-4 shadow-xl ${idx === 0 ? 'border-emerald-500 scale-110' : 'border-white'}`}>
                          <Image src={cand.photo_url} alt="" fill className="object-cover" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-black text-xl uppercase tracking-tight ${idx === 0 ? 'text-emerald-700' : 'text-secondary'}`}>
                              {cand.full_name}
                            </h4>
                            {idx === 0 && (cand.votes || 0) > 0 && (
                              <Badge className="bg-emerald-500 text-white animate-pulse font-black px-3 py-1 text-[10px] rounded-full uppercase">Leading Candidate</Badge>
                            )}
                          </div>
                          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden border">
                            <div 
                              className={`h-full transition-all duration-1000 ${idx === 0 ? 'bg-emerald-500' : 'bg-secondary/40'}`} 
                              style={{ width: `${posCandidates[0].votes! > 0 ? ((cand.votes || 0) / posCandidates[0].votes!) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Vote Tally */}
                        <div className="text-right shrink-0 bg-secondary/5 px-6 py-3 rounded-2xl border">
                          <p className="text-4xl font-black text-secondary tracking-tighter tabular-nums leading-none">
                            {cand.votes || 0}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Votes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Performance Chart */}
                <Card className="border-none shadow-2xl bg-white p-8 rounded-3xl flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-primary" /> Margin of Victory
                    </CardTitle>
                    <Badge variant="outline" className="border-secondary/20 font-bold">LIVE DATA FEED</Badge>
                  </div>
                  
                  <ChartContainer config={chartConfig} className="flex-1 min-h-[400px]">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        width={120} 
                        style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', fill: 'hsl(var(--secondary))' }} 
                      />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="votes" radius={[0, 10, 10, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getBarColor(index, chartData.length)} 
                            className="transition-all duration-700"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </Card>
              </div>
            </section>
          );
        })}

        <section className="space-y-6 pb-20">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-headline font-black text-secondary uppercase tracking-tighter shrink-0">Class Participation Breakdown</h2>
            <div className="h-1 bg-secondary/5 flex-1 rounded-full" />
          </div>
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border-b-8 border-secondary">
            <Table>
              <TableHeader className="bg-secondary text-white">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase text-xs">Class Group</TableHead>
                  <TableHead className="font-black uppercase text-xs">Eligible</TableHead>
                  <TableHead className="font-black uppercase text-xs">Voted</TableHead>
                  <TableHead className="font-black uppercase text-xs">Engagement Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(cls => {
                  const progress = cls.population > 0 ? Math.round(((cls.votes_cast || 0) / cls.population) * 100) : 0;
                  return (
                    <TableRow key={cls.id} className="hover:bg-secondary/5 border-none">
                      <TableCell className="font-black text-secondary text-lg">{cls.name}</TableCell>
                      <TableCell className="font-bold">{cls.population}</TableCell>
                      <TableCell className="font-bold text-primary">{cls.votes_cast || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border">
                            <div 
                              className={`h-full transition-all duration-1000 ${progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                          <span className={`text-sm font-black w-12 ${progress >= 80 ? 'text-emerald-600' : progress >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
}

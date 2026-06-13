
"use client";

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ElectionHeader } from '@/components/shared/ElectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, CheckCircle, BarChart3, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import Image from 'next/image';
import { Class, Candidate, Position } from '@/lib/types';

export default function ResultsPage() {
  const db = useFirestore();
  const { data: classes = [] } = useCollection<Class>(collection(db!, 'classes'));
  const { data: positions = [] } = useCollection<Position>(collection(db!, 'positions'));
  const { data: candidates = [] } = useCollection<Candidate>(collection(db!, 'candidates'));

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes,
      eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <ElectionHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md bg-white">
            <CardContent className="pt-6 flex items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Votes Cast</p>
                <h3 className="text-3xl font-headline font-black text-secondary">{totals.votes}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white">
            <CardContent className="pt-6 flex items-center gap-6">
              <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Eligible</p>
                <h3 className="text-3xl font-headline font-black text-secondary">{totals.eligible}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardContent className="pt-6 flex items-center gap-6">
              <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Turnout %</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-3xl font-headline font-black text-secondary">{totals.turnout}%</h3>
                  <div className="flex-1 pb-2">
                    <Progress value={totals.turnout} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-16">
          {positions.sort((a,b) => a.order_index - b.order_index).map(pos => {
            const posCandidates = candidates
              .filter(c => c.position_id === pos.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            const chartData = posCandidates.map(c => ({
              name: c.full_name,
              votes: c.votes || 0
            }));

            return (
              <section key={pos.id} className="space-y-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-headline font-black text-secondary uppercase tracking-tight shrink-0">{pos.name}</h2>
                  <div className="h-px bg-border flex-1" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" /> Leaderboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {posCandidates.map((cand, idx) => (
                          <div key={cand.id} className={`p-4 flex items-center gap-6 transition-colors ${idx === 0 ? 'bg-primary/5' : ''}`}>
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                              <Image src={cand.photo_url} alt="" fill className="object-cover" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-secondary">{cand.full_name}</h4>
                                {idx === 0 && (cand.votes || 0) > 0 && (
                                  <Badge className="bg-accent text-secondary hover:bg-accent font-black text-[10px] py-0 px-2 uppercase">Leading</Badge>
                                )}
                              </div>
                              <Progress value={totals.votes > 0 ? ((cand.votes || 0) / totals.votes) * 100 : 0} className={`h-1.5 ${idx === 0 ? 'bg-primary/10' : ''}`} />
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-secondary leading-none">{cand.votes || 0}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Votes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-xl bg-white p-6">
                    <CardTitle className="text-lg mb-8 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" /> Vote Distribution
                    </CardTitle>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={24}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </section>
            );
          })}
        </div>

        <section className="space-y-6 pt-12">
           <div className="flex items-center gap-4">
            <h2 className="text-2xl font-headline font-black text-secondary uppercase tracking-tight shrink-0">Class Engagement</h2>
            <div className="h-px bg-border flex-1" />
          </div>
          <Card className="border-none shadow-xl bg-white">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold text-secondary uppercase text-xs">Class</TableHead>
                  <TableHead className="font-bold text-secondary uppercase text-xs">Pop</TableHead>
                  <TableHead className="font-bold text-secondary uppercase text-xs">Votes</TableHead>
                  <TableHead className="font-bold text-secondary uppercase text-xs">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(cls => {
                  const progress = cls.population > 0 ? Math.round(((cls.votes_cast || 0) / cls.population) * 100) : 0;
                  return (
                    <TableRow key={cls.id}>
                      <TableCell className="font-bold text-secondary">{cls.name}</TableCell>
                      <TableCell>{cls.population}</TableCell>
                      <TableCell>{cls.votes_cast || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs font-bold w-10">{progress}%</span>
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

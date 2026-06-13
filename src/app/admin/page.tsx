
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, doc, setDoc, updateDoc, increment, query, where, orderBy, limit, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, LayoutDashboard, BrainCircuit, Key, Download, Activity, Sparkles, RefreshCcw, Trash2, CheckCircle2, Lock, Settings2, Users } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Class, Candidate, Position, VoterToken, SystemConfig } from '@/lib/types';
import { realtimeElectionInsightGeneration, RealtimeElectionInsightGenerationOutput } from '@/ai/flows/realtime-election-insight-generation';
import { Progress } from '@/components/ui/progress';

export default function AdminPage() {
  const db = useFirestore();
  const { data: classes = [] } = useCollection<Class>(collection(db!, 'classes'));
  const { data: positions = [] } = useCollection<Position>(collection(db!, 'positions'));
  const { data: candidates = [] } = useCollection<Candidate>(collection(db!, 'candidates'));
  const { data: allTokens = [] } = useCollection<VoterToken>(collection(db!, 'voter_tokens'));
  const { data: config } = useDoc<SystemConfig>(doc(db!, 'system_config', 'election_status'));

  // Activity Feed
  const activityQuery = useMemo(() => 
    db ? query(collection(db, 'voter_tokens'), where('status', '==', 'used'), orderBy('used_at', 'desc'), limit(10)) : null
  , [db]);
  const { data: recentVotes = [] } = useCollection<VoterToken>(activityQuery);

  const [activeTab, setActiveTab] = useState('onboarding');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<RealtimeElectionInsightGenerationOutput | null>(null);

  // Form States
  const [newPosition, setNewPosition] = useState('');
  const [newCandidate, setNewCandidate] = useState({ name: '', positionId: '', photoUrl: '' });
  const [newClass, setNewClass] = useState({ name: '', population: 0 });

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((acc, curr) => acc + curr.population, 0);
    const totalVotes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    return {
      totalVotes,
      totalStudents,
      totalClasses: classes.length,
      totalPositions: positions.length,
      turnout: totalStudents > 0 ? Math.round((totalVotes / totalStudents) * 100) : 0
    };
  }, [classes, positions]);

  const toggleElection = async () => {
    const statusRef = doc(db!, 'system_config', 'election_status');
    await setDoc(statusRef, { is_open: !config?.is_open }, { merge: true });
  };

  const handleAddPosition = async () => {
    if (!newPosition) return;
    await addDoc(collection(db!, 'positions'), {
      name: newPosition,
      order_index: positions.length
    });
    setNewPosition('');
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.positionId) return;
    await addDoc(collection(db!, 'candidates'), {
      full_name: newCandidate.name,
      position_id: newCandidate.positionId,
      photo_url: newCandidate.photoUrl || 'https://picsum.photos/seed/placeholder/400/400',
      votes: 0
    });
    setNewCandidate({ name: '', positionId: '', photoUrl: '' });
  };

  const handleAddClass = async () => {
    if (!newClass.name || newClass.population <= 0) return;
    await addDoc(collection(db!, 'classes'), {
      name: newClass.name,
      population: newClass.population,
      votes_cast: 0
    });
    setNewClass({ name: '', population: 0 });
  };

  const generateTokens = (cls: Class) => {
    const count = cls.population + 5;
    const existingTokens = allTokens.filter(t => t.class_id === cls.id);
    
    if (existingTokens.length >= count) {
      alert("Tokens already generated for this class.");
      return;
    }

    const prefix = cls.name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const newTokensNeeded = count - existingTokens.length;

    for (let i = 0; i < newTokensNeeded; i++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const tokenId = `${prefix}-${randomPart}`;
      const tokenRef = doc(db!, 'voter_tokens', tokenId);
      setDoc(tokenRef, {
        id: tokenId,
        class_id: cls.id,
        status: 'unused'
      });
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const hourMap: Record<number, number> = {};
      allTokens.filter(t => t.status === 'used' && t.used_at).forEach(t => {
        const date = t.used_at instanceof Timestamp ? t.used_at.toDate() : new Date(t.used_at!);
        const hour = date.getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      });

      const trendData = Object.entries(hourMap).map(([hour, count]) => ({
        hour: parseInt(hour),
        votesInHour: count
      }));

      const result = await realtimeElectionInsightGeneration({
        totalEligibleVoters: stats.totalStudents,
        totalVotesCast: stats.totalVotes,
        votingTrendData: trendData.length > 0 ? trendData : [{ hour: new Date().getHours(), votesInHour: 0 }],
        classVotingProgress: classes.map(c => ({
          className: c.name,
          population: c.population,
          votesCast: c.votes_cast || 0
        })),
        electionStatus: config?.is_open ? 'open' : 'closed'
      });
      setAiInsight(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportTokens = (cls: Class) => {
    const tokens = allTokens.filter(t => t.class_id === cls.id);
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Token,Status\n" 
      + tokens.map(e => `${e.id},${e.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tokens_${cls.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SidebarProvider>
      <Sidebar className="bg-secondary text-white border-none">
        <SidebarHeader className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">Sovereign Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('onboarding')} isActive={activeTab === 'onboarding'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <Settings2 className="w-5 h-5 mr-3" /> System Setup
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('overview')} isActive={activeTab === 'overview'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('insights')} isActive={activeTab === 'insights'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <BrainCircuit className="w-5 h-5 mr-3" /> AI Insights
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-[#F5F5F5]">
        <header className="h-20 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-headline font-black text-secondary uppercase tracking-tight">Electoral Control Center</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={config?.is_open ? "default" : "secondary"} className={config?.is_open ? "bg-emerald-500 animate-pulse" : ""}>
              {config?.is_open ? "ELECTION LIVE" : "ELECTION CLOSED"}
            </Badge>
            <Button size="sm" variant={config?.is_open ? "destructive" : "default"} onClick={toggleElection}>
              {config?.is_open ? <Lock className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {config?.is_open ? "Close Polls" : "Open Election"}
            </Button>
          </div>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="onboarding" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1: Positions */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> 1. Define Positions</CardTitle>
                    <CardDescription>Add roles that students will contest for.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="e.g., Head Prefect" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
                      <Button onClick={handleAddPosition}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {positions.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                          <span className="font-bold">{p.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db!, 'positions', p.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Candidates */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> 2. Register Candidates</CardTitle>
                    <CardDescription>Assign candidates to positions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Candidate Full Name" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
                    <select 
                      className="w-full h-10 px-3 rounded-md border"
                      value={newCandidate.positionId}
                      onChange={e => setNewCandidate({...newCandidate, positionId: e.target.value})}
                    >
                      <option value="">Select Position</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Input placeholder="Photo URL (Optional)" value={newCandidate.photoUrl} onChange={e => setNewCandidate({...newCandidate, photoUrl: e.target.value})} />
                    <Button className="w-full" onClick={handleAddCandidate}>Add Candidate</Button>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {candidates.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                          <div className="flex flex-col">
                            <span className="font-bold">{c.full_name}</span>
                            <span className="text-xs text-muted-foreground">{positions.find(p => p.id === c.position_id)?.name}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc(db!, 'candidates', c.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Classes & Token Prep */}
                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> 3. Class Management & Token Generation</CardTitle>
                    <CardDescription>Set population and generate unique prefixed tokens (Population + 5).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Class Name (e.g., Grade A1)" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                      <Input type="number" placeholder="Class Size" value={newClass.population} onChange={e => setNewClass({...newClass, population: parseInt(e.target.value)})} />
                      <Button onClick={handleAddClass}>Add Class</Button>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Population</TableHead>
                          <TableHead>Target Tokens</TableHead>
                          <TableHead>Current Count</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map(cls => {
                          const tokens = allTokens.filter(t => t.class_id === cls.id);
                          const isGenerated = tokens.length >= cls.population + 5;
                          return (
                            <TableRow key={cls.id}>
                              <TableCell className="font-bold">{cls.name}</TableCell>
                              <TableCell>{cls.population}</TableCell>
                              <TableCell>{cls.population + 5}</TableCell>
                              <TableCell>
                                <Badge variant={isGenerated ? "default" : "outline"}>
                                  {tokens.length}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => generateTokens(cls)} disabled={isGenerated}>
                                  Generate Tokens
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportTokens(cls)} disabled={tokens.length === 0}>
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteDoc(doc(db!, 'classes', cls.id))}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Live Votes', val: stats.totalVotes, sub: `${stats.turnout}% Turnout`, color: 'text-primary' },
                  { label: 'Active Classes', val: stats.totalClasses, sub: 'Registered Groups', color: 'text-secondary' },
                  { label: 'Eligible Students', val: stats.totalStudents, sub: 'Total Population', color: 'text-secondary' },
                  { label: 'Electoral Roles', val: stats.totalPositions, sub: 'Contested Seats', color: 'text-accent' }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                      <h3 className={`text-3xl font-headline font-black ${stat.color}`}>{stat.val}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-white border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" /> Class Participation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase">Class</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-bold">{cls.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Progress value={((cls.votes_cast || 0) / cls.population) * 100} className="h-2 flex-1" />
                                <span className="text-xs font-bold">{Math.round(((cls.votes_cast || 0) / cls.population) * 100)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" /> Live Activity Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentVotes.length === 0 ? (
                      <p className="text-sm text-center text-muted-foreground py-10 italic">Awaiting first votes...</p>
                    ) : (
                      recentVotes.map((vote, i) => {
                        const cls = classes.find(c => c.id === vote.class_id);
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl animate-in slide-in-from-right duration-500">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-bold text-sm">{cls?.name || 'Class'}</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Vote Cast
                            </span>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-black text-secondary uppercase">AI Strategic Insights</h2>
                  <p className="text-muted-foreground">Real-time trends analysis and turnout predictions</p>
                </div>
                <Button onClick={runAiAnalysis} disabled={isAnalyzing} className="bg-primary hover:bg-primary/90">
                  {isAnalyzing ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Analysis
                </Button>
              </div>

              {aiInsight ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Turnout Prediction</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-6">
                        <span className="text-6xl font-black text-primary">{aiInsight.predictedFinalTurnoutPercentage}%</span>
                        <p className="text-sm text-muted-foreground mt-2">Predicted Final Participation</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest">Peak Voting Hours</p>
                        <div className="flex gap-2">
                          {aiInsight.peakVotingHours.map(h => (
                            <Badge key={h} variant="secondary">{h}:00</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Summary Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{aiInsight.summaryAnalysis}</p>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg">Voter Engagement Strategies</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiInsight.engagementStrategies.map((strategy, i) => (
                        <div key={i} className="flex gap-4 p-4 border rounded-xl hover:bg-accent/5 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm font-medium">{strategy}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
                  <BrainCircuit className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">Click "Generate Analysis" to run the AI engine on current data.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

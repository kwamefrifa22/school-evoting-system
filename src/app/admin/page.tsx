
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, updateDoc, increment, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, LayoutDashboard, BrainCircuit, Key, Download, Activity, Sparkles, RefreshCcw } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Class, Candidate, Position, VoterToken } from '@/lib/types';
import { realtimeElectionInsightGeneration, RealtimeElectionInsightGenerationOutput } from '@/ai/flows/realtime-election-insight-generation';
import { Progress } from '@/components/ui/progress';

export default function AdminPage() {
  const db = useFirestore();
  const { data: classes = [] } = useCollection<Class>(collection(db!, 'classes'));
  const { data: positions = [] } = useCollection<Position>(collection(db!, 'positions'));
  const { data: allTokens = [] } = useCollection<VoterToken>(collection(db!, 'voter_tokens'));
  
  // Real-time Activity Feed (last 10 votes)
  const activityQuery = useMemo(() => 
    db ? query(collection(db, 'voter_tokens'), where('status', '==', 'used'), orderBy('used_at', 'desc'), limit(10)) : null
  , [db]);
  const { data: recentVotes = [] } = useCollection<VoterToken>(activityQuery);

  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<RealtimeElectionInsightGenerationOutput | null>(null);

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

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare trend data (votes per hour)
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
        electionStatus: 'open'
      });
      setAiInsight(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateTokens = (cls: Class) => {
    const count = cls.population + 5;
    const existingTokens = allTokens.filter(t => t.class_id === cls.id);
    
    if (existingTokens.length >= count) {
      alert("Tokens already generated for this class.");
      return;
    }

    const newTokensNeeded = count - existingTokens.length;
    for (let i = 0; i < newTokensNeeded; i++) {
      const tokenId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tokenRef = doc(db!, 'voter_tokens', tokenId);
      setDoc(tokenRef, {
        id: tokenId,
        class_id: cls.id,
        status: 'unused'
      });
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
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">Sovereign Live</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
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
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('tokens')} isActive={activeTab === 'tokens'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <Key className="w-5 h-5 mr-3" /> Voter Tokens
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
          <Badge variant="outline" className="animate-pulse bg-emerald-50 text-emerald-700 border-emerald-200">
            ● Live System Connected
          </Badge>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
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

            <TabsContent value="tokens" className="space-y-8 m-0">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-black text-secondary uppercase">Voter Tokens</h2>
                  <p className="text-muted-foreground">Manage and export unique IDs for each student</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => {
                  const tokens = allTokens.filter(t => t.class_id === cls.id);
                  const isGenerated = tokens.length >= cls.population + 5;
                  return (
                    <Card key={cls.id} className="border-none shadow-sm overflow-hidden group">
                      <div className={`h-1.5 w-full ${isGenerated ? 'bg-primary' : 'bg-muted'}`} />
                      <CardHeader>
                        <CardTitle className="text-md flex justify-between items-center">
                          {cls.name}
                          <Badge variant={isGenerated ? "default" : "outline"}>{tokens.length} / {cls.population + 5}</Badge>
                        </CardTitle>
                        <CardDescription>Target: {cls.population + 5} tokens</CardDescription>
                      </CardHeader>
                      <CardContent className="flex gap-2">
                        <Button className="flex-1" variant={isGenerated ? "outline" : "secondary"} onClick={() => generateTokens(cls)}>
                          {isGenerated ? "Top Up" : "Generate"}
                        </Button>
                        <Button className="flex-1" variant="outline" onClick={() => exportTokens(cls)} disabled={tokens.length === 0}>
                          <Download className="w-4 h-4 mr-2" /> Export
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


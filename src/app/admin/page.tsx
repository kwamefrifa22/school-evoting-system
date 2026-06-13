
"use client";

import { useState } from 'react';
import { MOCK_POSITIONS, MOCK_CANDIDATES, MOCK_CLASSES } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Power, Settings, Users, UserPlus, Eye, EyeOff, LayoutDashboard, BrainCircuit } from 'lucide-react';
import Image from 'next/image';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export default function AdminPage() {
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const totalClasses = MOCK_CLASSES.length;
  const totalStudents = MOCK_CLASSES.reduce((acc, curr) => acc + curr.population, 0);
  const totalVotes = MOCK_CLASSES.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);

  return (
    <SidebarProvider>
      <Sidebar className="bg-secondary text-white border-none">
        <SidebarHeader className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Power className="w-5 h-5" />
            </div>
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">Sovereign Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setActiveTab('overview')} 
                isActive={activeTab === 'overview'}
                className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"
              >
                <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setActiveTab('candidates')} 
                isActive={activeTab === 'candidates'}
                className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"
              >
                <UserPlus className="w-5 h-5 mr-3" /> Candidates
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setActiveTab('classes')} 
                isActive={activeTab === 'classes'}
                className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"
              >
                <Users className="w-5 h-5 mr-3" /> Classes
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setActiveTab('insights')} 
                isActive={activeTab === 'insights'}
                className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"
              >
                <BrainCircuit className="w-5 h-5 mr-3" /> AI Insights
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => setActiveTab('settings')} 
                isActive={activeTab === 'settings'}
                className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"
              >
                <Settings className="w-5 h-5 mr-3" /> Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-[#F5F5F5]">
        <header className="h-20 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-headline font-black text-secondary uppercase tracking-tight">
              Electoral Management Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Election Status</span>
              <Badge className={isVotingOpen ? 'bg-primary' : 'bg-destructive'}>
                {isVotingOpen ? 'OPEN' : 'CLOSED'}
              </Badge>
            </div>
          </div>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="overview" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Votes', value: totalVotes, sub: `${Math.round(totalVotes/totalStudents*100)}% Turnout`, color: 'text-primary' },
                  { label: 'Total Classes', value: totalClasses, sub: 'All Grades Registered', color: 'text-secondary' },
                  { label: 'Total Eligible', value: totalStudents, sub: 'Projected Population', color: 'text-secondary' },
                  { label: 'Positions', value: MOCK_POSITIONS.length, sub: 'Active Contests', color: 'text-accent' },
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm">
                    <CardContent className="pt-6">
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                      <h3 className={`text-3xl font-headline font-black ${stat.color}`}>{stat.value}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Real-time Class Progress</CardTitle>
                      <CardDescription>Monitoring live submissions per group</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase">Class</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Progress</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_CLASSES.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-bold">{cls.name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                  <span>{cls.votes_cast} / {cls.population}</span>
                                  <span>{Math.round((cls.votes_cast || 0) / cls.population * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${(cls.votes_cast || 0) / cls.population * 100}%` }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Election Controls</CardTitle>
                    <CardDescription>Manage global availability</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-secondary">VOTING PORTAL</p>
                        <p className="text-xs text-muted-foreground">Enable/Disable student voting</p>
                      </div>
                      <Switch 
                        checked={isVotingOpen} 
                        onCheckedChange={setIsVotingOpen}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-secondary">PUBLIC RESULTS</p>
                        <p className="text-xs text-muted-foreground">Show live counts on results page</p>
                      </div>
                      <Switch 
                        checked={showResults} 
                        onCheckedChange={setShowResults}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <Button variant="destructive" className="w-full h-12 font-bold uppercase tracking-widest text-xs">
                      Reset All Data
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="candidates" className="m-0 space-y-8">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-black text-secondary">MANAGE CANDIDATES</h2>
                  <p className="text-muted-foreground">Add or edit student candidates and positions</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 rounded-xl h-12 px-6">
                  <Plus className="w-4 h-4 mr-2" /> Add Candidate
                </Button>
              </header>

              <div className="space-y-12">
                {MOCK_POSITIONS.map(pos => (
                  <div key={pos.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-headline font-black text-primary uppercase tracking-tight">{pos.name}</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-xs">Reorder Candidates</Button>
                        <Button variant="ghost" size="sm" className="text-xs"><Edit2 className="w-3 h-3 mr-2" /> Edit Position</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {MOCK_CANDIDATES.filter(c => c.position_id === pos.id).map(cand => (
                        <Card key={cand.id} className="border-none shadow-sm overflow-hidden group">
                          <div className="aspect-[4/5] relative">
                            <Image src={cand.photo_url} alt="" fill className="object-cover" />
                            <div className="absolute inset-0 bg-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <Button size="icon" variant="secondary" className="rounded-full h-10 w-10">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="destructive" className="rounded-full h-10 w-10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-4 text-center">
                            <h4 className="font-bold text-secondary">{cand.full_name}</h4>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">ID: {cand.id}</p>
                          </CardContent>
                        </Card>
                      ))}
                      <button className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-muted-foreground hover:text-primary hover:border-primary transition-all gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-xs uppercase tracking-widest">New {pos.name}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="m-0 space-y-8">
               <header>
                <h2 className="text-2xl font-headline font-black text-secondary uppercase">AI Electoral Analysis</h2>
                <p className="text-muted-foreground">Generative trends and turnout optimization strategies</p>
              </header>

              <Card className="border-none shadow-xl overflow-hidden bg-white">
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-6 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-headline font-black text-primary">CIS AI Insight Tool</h4>
                      <p className="text-muted-foreground">Running analysis on real-time voting speed, class demographics, and historic turnout patterns.</p>
                    </div>
                    <Button className="ml-auto bg-primary text-white">Refresh Analysis</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="font-bold text-secondary uppercase tracking-widest text-sm">Engagement Strategies</h5>
                      <ul className="space-y-3">
                        {[
                          "Target Grade 7B: Currently underperforming with only 12% turnout. Schedule a voting reminder during their lunch break.",
                          "Peak Period Alert: Voting velocity typically spikes between 1:00 PM and 2:00 PM. Ensure staff are present at the voting booths.",
                          "Gamify the process: Offer a 'Top Turnout Class' certificate to the classroom that hits 100% first (Currently: Grade 6B)."
                        ].map((strat, i) => (
                          <li key={i} className="flex gap-3 text-sm p-4 bg-white rounded-xl border shadow-sm">
                            <span className="w-6 h-6 rounded-full bg-accent text-secondary flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                            <p>{strat}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                       <h5 className="font-bold text-secondary uppercase tracking-widest text-sm">Turnout Prediction</h5>
                       <div className="p-6 bg-secondary text-white rounded-2xl space-y-6">
                         <div className="flex justify-between items-end">
                           <div>
                             <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Predicted Final Turnout</p>
                             <h3 className="text-5xl font-headline font-black">92%</h3>
                           </div>
                           <Badge className="bg-primary text-white mb-2">High Confidence</Badge>
                         </div>
                         <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-accent w-[92%]" />
                         </div>
                         <p className="text-xs text-white/60 leading-relaxed italic">
                           "Based on current linear growth and the 100% completion of Grade 6B, the school is on track for a record-breaking electoral turnout."
                         </p>
                       </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

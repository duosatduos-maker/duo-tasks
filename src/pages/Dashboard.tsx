import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Clock, CheckCircle2, History, Plus, UserPlus } from "lucide-react";
import TaskList from "@/components/TaskList";
import AlarmList from "@/components/AlarmList";
import PairingDialog from "@/components/PairingDialog";
import AddTaskDialog from "@/components/AddTaskDialog";
import AddAlarmDialog from "@/components/AddAlarmDialog";
import TaskCalendar from "@/components/TaskCalendar";
import TaskHistory from "@/components/TaskHistory";
import PartnerSelector from "@/components/PartnerSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Partner {
  pairId: string;
  partnerId: string;
  partnerUsername: string;
  acceptedAt: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pairingOpen, setPairingOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadPairData(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadPairData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Subscribe to task changes for selected pair
  useEffect(() => {
    if (!selectedPairId) return;

    const channel = supabase
      .channel("dashboard-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `pair_id=eq.${selectedPairId}`,
        },
        () => {
          loadTasks(selectedPairId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPairId]);

  const loadPairData = async (userId: string) => {
    try {
      // Load current user's profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      setUserProfile(myProfile);

      // Load ALL accepted pairs for this user
      const { data: pairs, error } = await supabase
        .from("pairs")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq("status", "accepted");

      if (error) throw error;

      if (pairs && pairs.length > 0) {
        // Get all partner IDs
        const partnerIds = pairs.map(p => 
          p.user_id_1 === userId ? p.user_id_2 : p.user_id_1
        );

        // Fetch all partner profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

        // Build partners array
        const partnersList: Partner[] = pairs.map(pair => {
          const partnerId = pair.user_id_1 === userId ? pair.user_id_2 : pair.user_id_1;
          return {
            pairId: pair.id,
            partnerId,
            partnerUsername: profileMap.get(partnerId) || "Partner",
            acceptedAt: pair.accepted_at || pair.created_at,
          };
        });

        setPartners(partnersList);
        
        // Select first partner by default
        if (partnersList.length > 0) {
          setSelectedPairId(partnersList[0].pairId);
          setSelectedPartner(partnersList[0]);
          await loadTasks(partnersList[0].pairId);
        }
      }
    } catch (error: any) {
      console.error("Error loading pairs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPartner = (pairId: string) => {
    setSelectedPairId(pairId);
    const partner = partners.find(p => p.pairId === pairId);
    setSelectedPartner(partner || null);
    if (pairId) loadTasks(pairId);
  };

  const loadTasks = async (pairId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("pair_id", pairId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error loading tasks:", error);
      return;
    }

    // Fetch usernames separately for assigned users
    const userIds = [...new Set(data?.map(t => t.assigned_to).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const tasksWithProfiles = (data || []).map(task => ({
      ...task,
      profiles: task.assigned_to ? profileMap.get(task.assigned_to) : null
    }));

    setTasks(tasksWithProfiles as any);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Duos
                </h1>
                {userProfile && (
                  <p className="text-[10px] text-muted-foreground -mt-0.5">@{userProfile.username}</p>
                )}
              </div>
            </div>

            {/* Partner Selector - Compact dropdown */}
            {partners.length > 0 && (
              <PartnerSelector 
                partners={partners} 
                selectedPairId={selectedPairId} 
                onSelectPartner={handleSelectPartner}
                onAddPartner={() => setPairingOpen(true)}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Add Partner Button - Compact */}
            {partners.length === 0 && (
              <Button 
                size="sm" 
                onClick={() => setPairingOpen(true)}
                className="gap-2 bg-gradient-to-r from-primary to-accent"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Find Partner</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hidden Pairing Dialog */}
      <PairingDialog 
        userId={user?.id || ""} 
        onPairCreated={() => loadPairData(user?.id || "")}
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        trigger={<span />}
      />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Empty State */}
        {partners.length === 0 ? (
          <Card className="text-center py-16 shadow-[var(--shadow-soft)] max-w-md mx-auto mt-12">
            <CardContent className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Find Your Duo Partner</h2>
                <p className="text-muted-foreground mb-6">
                  Connect with a friend to start sharing tasks and accountability
                </p>
                <Button 
                  onClick={() => setPairingOpen(true)}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Partner
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedPairId && selectedPartner ? (
          <div className="space-y-6">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-semibold">
                  {selectedPartner.partnerUsername.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">Working with @{selectedPartner.partnerUsername}</p>
                  <p className="text-xs text-muted-foreground">
                    Partners since {new Date(selectedPartner.acceptedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <AddTaskDialog 
                  pairId={selectedPairId} 
                  userId={user?.id || ""} 
                  partnerId={selectedPartner.partnerId}
                  myUsername={userProfile?.username || "Me"}
                  partnerUsername={selectedPartner.partnerUsername}
                />
                <AddAlarmDialog pairId={selectedPairId} userId={user?.id || ""} />
              </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList className="grid w-full max-w-sm grid-cols-3 h-10">
                <TabsTrigger value="list" className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Tasks Section - Takes more space */}
                  <Card className="lg:col-span-2 shadow-[var(--shadow-soft)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Active Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskList pairId={selectedPairId} currentUserId={user?.id || ""} />
                    </CardContent>
                  </Card>

                  {/* Alarms - Sidebar */}
                  <Card className="shadow-[var(--shadow-soft)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-4 w-4 text-accent" />
                        Alarms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AlarmList pairId={selectedPairId} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <TaskCalendar tasks={tasks} currentUserId={user?.id || ""} />
              </TabsContent>

              <TabsContent value="history">
                <TaskHistory 
                  userId={user?.id || ""} 
                  pairIds={partners.map(p => p.pairId)} 
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Dashboard;

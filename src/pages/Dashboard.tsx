import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, UserPlus, Plus, Clock, CheckCircle2 } from "lucide-react";
import TaskList from "@/components/TaskList";
import AlarmList from "@/components/AlarmList";
import PairingDialog from "@/components/PairingDialog";
import AddTaskDialog from "@/components/AddTaskDialog";
import AddAlarmDialog from "@/components/AddAlarmDialog";
import TaskCalendar from "@/components/TaskCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePair, setActivePair] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
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

  // Subscribe to task changes
  useEffect(() => {
    if (!activePair) return;

    const channel = supabase
      .channel("dashboard-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `pair_id=eq.${activePair.id}`,
        },
        () => {
          loadTasks(activePair.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePair]);

  const loadPairData = async (userId: string) => {
    try {
      // Load current user's profile
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      setUserProfile(myProfile);

      // Load pair data
      const { data: pairs, error } = await supabase
        .from("pairs")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (pairs) {
        setActivePair(pairs);
        const partnerId = pairs.user_id_1 === userId ? pairs.user_id_2 : pairs.user_id_1;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("id", partnerId)
          .maybeSingle();
        
        setPartnerProfile(profile);
        
        // Load tasks for the calendar
        await loadTasks(pairs.id);
      }
    } catch (error: any) {
      console.error("Error loading pair:", error);
    } finally {
      setLoading(false);
    }
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-warm-light rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Duos
              </h1>
              {userProfile && (
                <p className="text-xs text-muted-foreground">@{userProfile.username}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {!activePair ? (
          <Card className="text-center py-12 shadow-[var(--shadow-soft)]">
            <CardContent className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-secondary to-cool rounded-2xl flex items-center justify-center">
                <UserPlus className="w-10 h-10 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Find Your Duo Partner</h2>
                <p className="text-muted-foreground mb-6">
                  Connect with a friend to start sharing tasks and alarms
                </p>
                <PairingDialog userId={user?.id || ""} onPairCreated={() => loadPairData(user?.id || "")} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-[var(--shadow-soft)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Paired with{" "}
                      <span className="text-primary">{partnerProfile?.username || "Partner"}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connected since {new Date(activePair.accepted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <AddTaskDialog 
                      pairId={activePair.id} 
                      userId={user?.id || ""} 
                      partnerId={partnerProfile?.id || null}
                      myUsername={userProfile?.username || "Me"}
                      partnerUsername={partnerProfile?.username || "Partner"}
                    />
                    <AddAlarmDialog pairId={activePair.id} userId={user?.id || ""} />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="list">Task List</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-[var(--shadow-soft)]">
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <CardTitle>Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskList pairId={activePair.id} currentUserId={user?.id || ""} />
                    </CardContent>
                  </Card>

                  <Card className="shadow-[var(--shadow-soft)]">
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                      <Clock className="h-5 w-5 text-accent" />
                      <CardTitle>Alarms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AlarmList pairId={activePair.id} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <TaskCalendar tasks={tasks} currentUserId={user?.id || ""} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

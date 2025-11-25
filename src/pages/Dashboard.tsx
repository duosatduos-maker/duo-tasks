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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePair, setActivePair] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
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

  const loadPairData = async (userId: string) => {
    try {
      const { data: pairs, error } = await supabase
        .from("pairs")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq("status", "accepted")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (pairs) {
        setActivePair(pairs);
        const partnerId = pairs.user_id_1 === userId ? pairs.user_id_2 : pairs.user_id_1;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", partnerId)
          .single();
        
        setPartnerProfile(profile);
      }
    } catch (error: any) {
      console.error("Error loading pair:", error);
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Duos
            </h1>
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
                    <AddTaskDialog pairId={activePair.id} userId={user?.id || ""} />
                    <AddAlarmDialog pairId={activePair.id} userId={user?.id || ""} />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-[var(--shadow-soft)]">
                <CardHeader className="flex flex-row items-center gap-2 pb-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <CardTitle>Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList pairId={activePair.id} />
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
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

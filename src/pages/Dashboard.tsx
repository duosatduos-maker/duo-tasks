import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, UserPlus } from "lucide-react";
import PairingDialog from "@/components/PairingDialog";
import AddTaskDialog from "@/components/AddTaskDialog";
import AddAlarmDialog from "@/components/AddAlarmDialog";
import BottomNav from "@/components/BottomNav";
import PartnerCard from "@/components/PartnerCard";
import TaskScreen from "@/components/TaskScreen";
import AlarmScreen from "@/components/AlarmScreen";
import SettingsScreen from "@/components/SettingsScreen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Screen = "tasks" | "alarms" | "settings";

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
  const [pairingOpen, setPairingOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addAlarmOpen, setAddAlarmOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<Screen>("tasks");
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      setUserProfile(myProfile);

      const { data: pairs, error } = await supabase
        .from("pairs")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq("status", "accepted");

      if (error) throw error;

      if (pairs && pairs.length > 0) {
        const partnerIds = pairs.map(p => 
          p.user_id_1 === userId ? p.user_id_2 : p.user_id_1
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", partnerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

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
        
        if (partnersList.length > 0) {
          setSelectedPairId(partnersList[0].pairId);
          setSelectedPartner(partnersList[0]);
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
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddClick = () => {
    if (!selectedPairId) {
      setPairingOpen(true);
      return;
    }
    if (activeScreen === "tasks") {
      setAddTaskOpen(true);
    } else if (activeScreen === "alarms") {
      setAddAlarmOpen(true);
    } else {
      setPairingOpen(true);
    }
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
      {/* Main Content */}
      <main className="px-4 pt-6 pb-24 max-w-lg mx-auto">
        {/* Partner Card with Dropdown */}
        {partners.length > 0 && selectedPartner ? (
          <div className="mb-6">
            {partners.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full">
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                          <span className="text-xl font-bold">
                            {selectedPartner.partnerUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <p className="text-xs opacity-90 uppercase tracking-wide font-medium">Synced with</p>
                          </div>
                          <p className="font-bold text-xl">{selectedPartner.partnerUsername}</p>
                          <p className="text-sm opacity-80">@{selectedPartner.partnerUsername.toLowerCase().replace(/\s/g, '')} 💛</p>
                        </div>
                        <ChevronDown className="h-5 w-5 opacity-80" />
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-72">
                  {partners.map((partner) => (
                    <DropdownMenuItem
                      key={partner.pairId}
                      onClick={() => handleSelectPartner(partner.pairId)}
                      className="py-3"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {partner.partnerUsername.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{partner.partnerUsername}</span>
                        {partner.pairId === selectedPairId && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => setPairingOpen(true)} className="py-3">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Add Partner</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <PartnerCard partner={selectedPartner} />
            )}
          </div>
        ) : (
          <div className="mb-6">
            <PartnerCard partner={null} onAddPartner={() => setPairingOpen(true)} />
          </div>
        )}

        {/* Screen Content */}
        {selectedPairId && selectedPartner && (
          <>
            {activeScreen === "tasks" && (
              <TaskScreen 
                pairId={selectedPairId} 
                currentUserId={user?.id || ""} 
                partnerName={selectedPartner.partnerUsername}
              />
            )}
            {activeScreen === "alarms" && (
              <AlarmScreen pairId={selectedPairId} />
            )}
          </>
        )}
        
        {activeScreen === "settings" && (
          <SettingsScreen 
            userProfile={userProfile}
            partners={partners}
            onSignOut={handleSignOut}
            onAddPartner={() => setPairingOpen(true)}
            userId={user?.id || ""}
          />
        )}
        
        {!selectedPairId && activeScreen !== "settings" && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Connect with a partner to start sharing tasks and alarms</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeScreen={activeScreen} 
        onScreenChange={setActiveScreen}
        onAddClick={handleAddClick}
      />

      {/* Dialogs */}
      <PairingDialog 
        userId={user?.id || ""} 
        onPairCreated={() => loadPairData(user?.id || "")}
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        trigger={<span />}
      />

      {selectedPairId && selectedPartner && (
        <>
          <AddTaskDialog 
            pairId={selectedPairId} 
            userId={user?.id || ""} 
            partnerId={selectedPartner.partnerId}
            myUsername={userProfile?.username || "Me"}
            partnerUsername={selectedPartner.partnerUsername}
            open={addTaskOpen}
            onOpenChange={setAddTaskOpen}
          />
          <AddAlarmDialog 
            pairId={selectedPairId} 
            userId={user?.id || ""}
            open={addAlarmOpen}
            onOpenChange={setAddAlarmOpen}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
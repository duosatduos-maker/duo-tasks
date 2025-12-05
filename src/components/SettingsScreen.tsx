import { Button } from "@/components/ui/button";
import { LogOut, User, Users, History, Shield, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import TaskHistory from "./TaskHistory";

interface Partner {
  pairId: string;
  partnerId: string;
  partnerUsername: string;
  acceptedAt: string;
}

interface SettingsScreenProps {
  userProfile: { username: string } | null;
  partners: Partner[];
  onSignOut: () => void;
  onAddPartner: () => void;
  userId: string;
}

const SettingsScreen = ({ userProfile, partners, onSignOut, onAddPartner, userId }: SettingsScreenProps) => {
  return (
    <div className="space-y-6 pb-24">
      {/* Profile Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          Profile
        </h2>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {userProfile?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{userProfile?.username || "User"}</p>
              <p className="text-sm text-muted-foreground">@{userProfile?.username?.toLowerCase().replace(/\s/g, '') || "user"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Partners Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Partners
          </h2>
          <Button variant="outline" size="sm" onClick={onAddPartner}>
            Add Partner
          </Button>
        </div>
        <Card className="divide-y divide-border">
          {partners.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No partners yet. Add one to start sharing tasks!
            </div>
          ) : (
            partners.map((partner) => (
              <div key={partner.pairId} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {partner.partnerUsername.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{partner.partnerUsername}</p>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(partner.acceptedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Task History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Task History
        </h2>
        <TaskHistory userId={userId} pairIds={partners.map(p => p.pairId)} />
      </div>

      {/* Sign Out */}
      <Button 
        variant="outline" 
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default SettingsScreen;
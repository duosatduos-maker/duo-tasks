import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface PairingDialogProps {
  userId: string;
  onPairCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const PairingDialog = ({ userId, onPairCreated, open: controlledOpen, onOpenChange, trigger }: PairingDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [partnerUsername, setPartnerUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePair = async () => {
    if (!partnerUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: partnerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", partnerUsername.trim())
        .single();

      if (profileError || !partnerProfile) {
        toast({
          title: "User not found",
          description: "No user found with that username",
          variant: "destructive",
        });
        return;
      }

      if (partnerProfile.id === userId) {
        toast({
          title: "Error",
          description: "You cannot pair with yourself",
          variant: "destructive",
        });
        return;
      }

      const user1 = userId < partnerProfile.id ? userId : partnerProfile.id;
      const user2 = userId > partnerProfile.id ? userId : partnerProfile.id;

      const { error } = await supabase.from("pairs").insert({
        user_id_1: user1,
        user_id_2: user2,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already paired",
            description: "You are already paired with this user",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success!",
        description: `You are now paired with ${partnerUsername}`,
      });
      setOpen(false);
      setPartnerUsername("");
      onPairCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
            <UserPlus className="h-4 w-4 mr-2" />
            Find Partner
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find Your Duo Partner</DialogTitle>
          <DialogDescription>Enter your friend's username to pair up</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Partner's Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePair()}
            />
          </div>
          <Button
            onClick={handleCreatePair}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            {loading ? "Pairing..." : "Create Pair"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PairingDialog;

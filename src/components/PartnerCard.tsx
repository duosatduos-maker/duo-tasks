import { Users, Sparkles } from "lucide-react";

interface Partner {
  pairId: string;
  partnerId: string;
  partnerUsername: string;
  acceptedAt: string;
}

interface PartnerCardProps {
  partner: Partner | null;
  onAddPartner?: () => void;
}

const PartnerCard = ({ partner, onAddPartner }: PartnerCardProps) => {
  if (!partner) {
    return (
      <button
        onClick={onAddPartner}
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-xs opacity-80 uppercase tracking-wide">No partner yet</p>
            <p className="font-semibold text-lg">Tap to find a partner</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Users className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs opacity-90 uppercase tracking-wide font-medium">Synced with</p>
          </div>
          <p className="font-bold text-xl">{partner.partnerUsername}</p>
          <p className="text-sm opacity-80">@{partner.partnerUsername.toLowerCase().replace(/\s/g, '')} 💛</p>
        </div>
        <Sparkles className="h-6 w-6 opacity-80" />
      </div>
    </div>
  );
};

export default PartnerCard;
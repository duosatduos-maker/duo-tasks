import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Partner {
  pairId: string;
  partnerId: string;
  partnerUsername: string;
  acceptedAt: string;
}

interface PartnerSelectorProps {
  partners: Partner[];
  selectedPairId: string | null;
  onSelectPartner: (pairId: string) => void;
}

const PartnerSelector = ({ partners, selectedPairId, onSelectPartner }: PartnerSelectorProps) => {
  if (partners.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {partners.map((partner) => (
        <Button
          key={partner.pairId}
          variant={selectedPairId === partner.pairId ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectPartner(partner.pairId)}
          className={cn(
            "gap-2 transition-all",
            selectedPairId === partner.pairId && "ring-2 ring-primary/30"
          )}
        >
          <span className="font-medium">@{partner.partnerUsername}</span>
        </Button>
      ))}
    </div>
  );
};

export default PartnerSelector;

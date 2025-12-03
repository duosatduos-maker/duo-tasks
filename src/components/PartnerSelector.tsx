import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown, UserPlus, Check } from "lucide-react";
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
  onAddPartner: () => void;
}

const PartnerSelector = ({ partners, selectedPairId, onSelectPartner, onAddPartner }: PartnerSelectorProps) => {
  const selectedPartner = partners.find(p => p.pairId === selectedPairId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 h-9 px-3">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {selectedPartner ? `@${selectedPartner.partnerUsername}` : "Select Partner"}
          </span>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {partners.length}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Your Partners
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {partners.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No partners yet
          </div>
        ) : (
          partners.map((partner) => (
            <DropdownMenuItem
              key={partner.pairId}
              onClick={() => onSelectPartner(partner.pairId)}
              className={cn(
                "cursor-pointer gap-2",
                selectedPairId === partner.pairId && "bg-accent"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-medium">
                {partner.partnerUsername.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium">@{partner.partnerUsername}</p>
                <p className="text-xs text-muted-foreground">
                  Since {new Date(partner.acceptedAt).toLocaleDateString()}
                </p>
              </div>
              {selectedPairId === partner.pairId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddPartner} className="cursor-pointer gap-2 text-primary">
          <UserPlus className="h-4 w-4" />
          <span>Add New Partner</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PartnerSelector;

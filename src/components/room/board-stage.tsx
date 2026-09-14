import { MonopolyBoard } from "@/components/room/monopoly-board";
import { PixelFrame } from "@/components/ui/pixel-frame";
import { cn } from "@/lib/utils";

/**
 * Square frame that holds the Monopoly board. `overlay` spans the whole board
 * (pawns, dice, effects) and `center` fills its middle panel.
 */
export function BoardStage({
  className,
  owners,
  overlay,
  center,
  activeTile,
}: {
  className?: string;
  owners?: Record<number, number>;
  overlay?: React.ReactNode;
  center?: React.ReactNode;
  activeTile?: number;
}) {
  return (
    <PixelFrame
      className={cn(
        "scanlines relative mx-auto aspect-square w-full",
        className,
      )}
    >
      <MonopolyBoard
        owners={owners}
        overlay={overlay}
        center={center}
        activeTile={activeTile}
      />
    </PixelFrame>
  );
}

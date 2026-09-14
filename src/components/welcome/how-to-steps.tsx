import { GuideActionBar } from "@/components/welcome/guide-action-bar";
import { HOW_TO_STEPS, type HowToStep } from "@/lib/mock/how-to";
import { cn } from "@/lib/utils";

export function HowToSteps({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-0", className)}>
      <ol className="space-y-0">
        {HOW_TO_STEPS.map((step, index) => (
          <HowToStepRow
            key={step.id}
            step={step}
            isLast={index === HOW_TO_STEPS.length - 1}
          />
        ))}
      </ol>

      <GuideActionBar className="mt-10" />
    </div>
  );
}

function HowToStepRow({
  step,
  isLast,
}: {
  step: HowToStep;
  isLast: boolean;
}) {
  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:gap-x-6">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "pixel-corners grid size-11 shrink-0 place-items-center border-2 border-gold-deep bg-gold font-pixel text-[12px] text-void shadow-pixel-sm",
          )}
          aria-hidden
        >
          {step.number}
        </span>
        {!isLast ? (
          <span
            aria-hidden
            className="mt-1 w-0.5 flex-1 min-h-8 bg-edge"
          />
        ) : null}
      </div>

      <div className={cn("pb-8", isLast && "pb-0")}>
        <h2 className="font-pixel text-[11px] leading-relaxed text-parchment sm:text-xs">
          <span className="sr-only">Step {step.number}. </span>
          {step.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {step.body}
        </p>
      </div>
    </li>
  );
}

import { Sprout, Activity, Wheat, BadgeIndianRupee, Landmark, Crown, Brain } from "lucide-react";
import { useTranslation } from "react-i18next";

const PHASES = [
  { key: "planning", tKey: "nav.phase1", label: "Phase 1: Planning", icon: Sprout },
  { key: "health", tKey: "nav.phase2", label: "Phase 2: Health", icon: Activity },
  { key: "harvesting", tKey: "nav.phase3", label: "Phase 3: Harvesting", icon: Wheat },
  { key: "selling", tKey: "nav.phase4", label: "Phase 4: Selling", icon: BadgeIndianRupee },
  { key: "prediction", tKey: "nav.prediction", label: "Phase 5: Yield AI", icon: Brain },
  { key: "schemes", tKey: "nav.phase5", label: "Phase 6: Schemes", icon: Landmark },
  { key: "subscription", label: "Subscription", icon: Crown },
];

function PhaseNavigation({ currentPhase, onPhaseChange, className = "" }) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <div className="mb-2 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-400">{t("nav.workspace")}</p>
        </div>
        <div className="space-y-1.5">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            const active = currentPhase === phase.key;

            return (
              <button
                key={phase.key}
                type="button"
                onClick={() => onPhaseChange(phase.key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-900/30"
                    : "text-brand-200 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-white/[0.06]"}`}>
                  <Icon size={16} />
                </span>
                <span>{phase.tKey ? t(phase.tKey) : phase.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PhaseNavigation;

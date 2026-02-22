import QuickLinks from '@/components/QuickLinks';
import FocusWidget from '@/components/FocusWidget';
import UnifiedCalendar from '@/components/UnifiedCalendar';
import HabitsWidget from '@/components/HabitsWidget';
import Scratchpad from '@/components/Scratchpad';

import GreetingSection from '@/components/GreetingSection';
import BannerWidget from '@/components/BannerWidget';
import QuoteWidget from '@/components/QuoteWidget';

export default function Home() {
  return (
    <div className="p-4 md:p-8 space-y-4 min-h-screen flex flex-col max-w-[1800px] mx-auto w-full">
      {/* Mobile Header */}
      <div className="md:hidden pb-4 flex flex-col gap-4 overflow-y-auto">
        <BannerWidget />
        <GreetingSection hideGreeting={true} />
        <FocusWidget mode="goals" />
        <HabitsWidget />
        <UnifiedCalendar />
        <FocusWidget mode="projects" />
        <Scratchpad />
      </div>

      {/* Desktop Command Center */}
      <div className="hidden md:flex flex-col gap-4">

        {/* Row 0: Aesthetic Header */}
        <div className="grid grid-cols-12 gap-4 shrink-0 min-h-[140px]">
          <div className="col-span-3">
            <GreetingSection />
          </div>
          <div className="col-span-6">
            <BannerWidget />
          </div>
          <div className="col-span-3">
            <QuoteWidget />
          </div>
        </div>

        {/* Row 1: North Star Header (Goals) */}
        <div className="shrink-0">
          <FocusWidget mode="goals" />
        </div>

        {/* Main Split: Action Deck & Context Stack */}
        <div className="flex-[1.5] flex gap-4 overflow-hidden min-h-0 max-h-[500px]">

          {/* Left Side: Action Deck (Links & Habits) */}
          <div className="flex-[3] flex flex-col gap-4 overflow-hidden">
            {/* Split within Action Deck: Links (Access) vs Habits (Action) */}
            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
              {/* Left Column (Access): Quick Links */}
              <div className="col-span-4 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <QuickLinks />
                </div>
              </div>

              {/* Right Column (Action): Today's Habits */}
              <div className="col-span-8 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <HabitsWidget />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Context Stack (Sidebar) */}
          <div className="flex-[1.2] flex flex-col gap-4 overflow-hidden min-w-[320px]">
            {/* Top Slot: Quick Notes (Primary Input) */}
            <div className="flex-1 overflow-hidden min-h-0">
              <Scratchpad />
            </div>

            {/* Middle Slot: Active Projects */}
            <div className="shrink-0">
              <FocusWidget mode="projects" />
            </div>
          </div>

        </div>

        {/* Row 3: Bottom Full-Width Calendar */}
        <div>
          <UnifiedCalendar />
        </div>
      </div>
    </div>
  );
}

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
    <div className="p-4 md:p-12 space-y-6 md:space-y-8 h-screen overflow-y-auto custom-scrollbar pb-24 md:pb-0">
      {/* Mobile Greeting */}
      <div className="md:hidden pb-4">
        <GreetingSection />
      </div>

      {/* Row 1: Header Section (Desktop Only) */}
      <div className="hidden md:grid grid-cols-3 items-center gap-8 h-[120px]">
        <GreetingSection />
        <div className="flex justify-center">
          <BannerWidget />
        </div>
        <div className="flex justify-end">
          <QuoteWidget />
        </div>
      </div>

      {/* Main Content: Flex Column on Mobile (Ordered via display:contents), Grid on Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-4 gap-6">

        {/* Row 1: Goals Progress (Mobile Order 2, Desktop Full Width) */}
        <div className="order-2 md:order-none md:col-span-4">
          <FocusWidget mode="goals" />
        </div>

        {/* Left Column Container (Mobile: Unwrapped, Desktop: Col Span 3) */}
        <div className="contents md:block md:col-span-3 space-y-6">
          {/* QuickLinks (Hidden on Mobile) */}
          <div className="hidden md:block">
            <QuickLinks />
          </div>

          {/* Calendar (Mobile Order 5) */}
          <div className="order-5 md:order-none h-[500px]">
            <UnifiedCalendar />
          </div>
        </div>

        {/* Right Column Container (Mobile: Unwrapped, Desktop: Col Span 1) */}
        <div className="contents md:block md:col-span-1 space-y-6">
          {/* Habits Widget (Mobile Order 1) */}
          <div className="order-1 md:order-none">
            <HabitsWidget />
          </div>

          {/* Projects Progress (Mobile Order 3) */}
          <div className="order-3 md:order-none">
            <FocusWidget mode="projects" />
          </div>

          {/* Scratchpad (Mobile Order 4) */}
          <div className="order-4 md:order-none">
            <Scratchpad />
          </div>
        </div>

      </div>
    </div>
  );
}

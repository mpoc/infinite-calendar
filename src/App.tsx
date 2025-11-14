import "./index.css"
import { useState, useCallback, useRef, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useInView } from 'react-intersection-observer';
import { cn } from './cn';

type Week = {
  id: string;
  startDate: DateTime;
  days: DateTime[];
}

const WEEKS_TO_LOAD = 20;
const MAX_WEEKS_IN_MEMORY = 60;

const generateWeek = (startDate: DateTime): Week => {
  const days = Array.from({ length: 7 }, (_, i) => startDate.plus({ days: i }));
  return {
    id: startDate.toISODate()!,
    startDate,
    days,
  };
};

const getMonthLabel = (week: Week): string | null => {
  const monthStart = week.days.find(day => day.day === 1);

  if (monthStart) {
    return monthStart.toFormat('MMMM yyyy');
  }

  return null;
};

export const App = () => {
  const [weeks, setWeeks] = useState<Week[]>(() => {
    const today = DateTime.now().startOf('week');
    return Array.from({ length: MAX_WEEKS_IN_MEMORY }, (_, i) =>
      generateWeek(today.plus({ weeks: i - Math.floor(MAX_WEEKS_IN_MEMORY / 2) }))
    );
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const rootMargin = useMemo(() => {
    const margin = Math.max(800, window.innerHeight / 1.5);
    return `${margin}px`;
  }, []);

  const loadMoreAbove = useCallback(() => {
    setWeeks(prev => {
      const firstWeek = prev.at(0).startDate;
      const newWeeks = Array.from({ length: WEEKS_TO_LOAD }, (_, i) =>
        generateWeek(firstWeek.minus({ weeks: WEEKS_TO_LOAD - i }))
      );

      const updated = [...newWeeks, ...prev];
      const result = updated.length > MAX_WEEKS_IN_MEMORY
        ? updated.slice(0, MAX_WEEKS_IN_MEMORY)
        : updated;

      return result;
    });
  }, []);

  const loadMoreBelow = useCallback(() => {
    setWeeks(prev => {
      const lastWeek = prev.at(-1).startDate;
      const newWeeks = Array.from({ length: WEEKS_TO_LOAD }, (_, i) =>
        generateWeek(lastWeek.plus({ weeks: i + 1 }))
      );

      const updated = [...prev, ...newWeeks];
      return updated.length > MAX_WEEKS_IN_MEMORY
        ? updated.slice(-MAX_WEEKS_IN_MEMORY)
        : updated;
    });
  }, []);

  const { ref: topSentinelRef } = useInView({
    onChange: (inView) => {
      if (inView) loadMoreAbove();
    },
    rootMargin: `${rootMargin} 0px 0px 0px`,
  });

  const { ref: bottomSentinelRef } = useInView({
    onChange: (inView) => {
      if (inView) loadMoreBelow();
    },
    rootMargin: `0px 0px ${rootMargin} 0px`,
  });

  const today = DateTime.now().startOf('day');

  return (
    <div ref={containerRef} className="min-h-screen bg-white font-light">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-black">
        <div className="grid grid-cols-7 md:grid-cols-[140px_repeat(7,1fr)]">
          <div className="hidden md:block border-r border-black" />
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => (
            <div
              key={day}
              className={cn(
                "px-2 py-3 md:px-6 md:py-5 text-center text-xs md:text-base",
                "border-r border-gray-300 last:border-r-0"
              )}
            >
              <span className="md:hidden">{day.slice(0, 3)}</span>
              <span className="hidden md:inline">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        <div ref={topSentinelRef} className="h-px" />

        {weeks.map((week, weekIndex) => {
          const monthLabel = getMonthLabel(week);
          const nextWeek = weeks[weekIndex + 1];

          return (
            <div key={week.id}>
              {/* Month label as full-width row on mobile, column on desktop */}
              {monthLabel && (
                <div className="md:hidden px-4 py-1 bg-gray-50 border-b border-gray-400">
                  <div className="text-sm text-gray-700">
                    {monthLabel}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-7 md:grid-cols-[140px_repeat(7,1fr)]">
                {/* Month label column - desktop only */}
                <div className="hidden md:flex px-6 py-8 border-r border-gray-400 items-start justify-end">
                  {monthLabel && (
                    <div className="text-sm text-gray-700 text-right leading-tight">
                      {monthLabel}
                    </div>
                  )}
                </div>

                {/* Day cells */}
               {week.days.map((day, dayIndex) => <Day key={day.toISODate()} day={day} today={today} week={week} dayIndex={dayIndex} nextWeek={nextWeek} />)}
              </div>
            </div>
          );
        })}

        <div ref={bottomSentinelRef} className="h-px" />
      </div>
    </div>
  );
};

const Day = ({
  day,
  today,
  week,
  dayIndex,
  nextWeek
}: {
  day: DateTime;
  today: DateTime;
  week: Week;
  dayIndex: number;
  nextWeek?: Week;
}) => {
  const isToday = day.hasSame(today, 'day');
  const isWeekend = day.weekday === 6 || day.weekday === 7;

  const nextDay = week.days[dayIndex + 1];
  const hasMonthBoundaryAfter = nextDay && day.month !== nextDay.month;

  const dayBelow = nextWeek?.days[dayIndex];
  const hasMonthBoundaryBelow = dayBelow && day.month !== dayBelow.month;

  return (
    <div
      key={day.toISODate()}
      className={cn(
        "px-2 py-4 md:px-6 md:py-8 min-h-20 md:min-h-[140px]",
        "transition-all duration-200 hover:duration-0 cursor-pointer",
        // Right border (vertical)
        hasMonthBoundaryAfter
          ? "border-r-2 border-r-black"
          : "border-r border-r-gray-400 last:border-r-0",
        // Bottom border (horizontal)
        hasMonthBoundaryBelow
          ? "border-b-2 border-b-black"
          : "border-b border-b-gray-400",
        // Background and text colors
        isToday && "bg-gray-600 text-white",
        !isToday && isWeekend && "bg-gray-200 hover:bg-gray-500 hover:text-white",
        !isToday && !isWeekend && "hover:bg-gray-500 hover:text-white"
      )}
    >
      <div className="text-lg md:text-2xl leading-none">{day.day}</div>
    </div>
  );
};

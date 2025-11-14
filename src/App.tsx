import "./index.css"
import { useState, useCallback, useRef, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useInView } from 'react-intersection-observer';

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

const hasMonthBoundaryBetweenWeeks = (currentWeek: Week, nextWeek: Week | undefined): boolean => {
  if (!nextWeek) return false;

  // Check if any corresponding day (same weekday position) crosses a month boundary
  for (let i = 0; i < 7; i++) {
    const currentDay = currentWeek.days[i];
    const nextDay = nextWeek.days[i];
    if (currentDay.month !== nextDay.month) {
      return true;
    }
  }

  return false;
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
              className="px-2 py-3 md:px-6 md:py-5 text-center border-r border-gray-300 last:border-r-0 text-xs md:text-base"
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
          const hasMonthBoundary = hasMonthBoundaryBetweenWeeks(week, nextWeek);

          return (
            <div key={week.id}>
              {/* Month label as full-width row on mobile, column on desktop */}
              {monthLabel && (
                <div className="md:hidden px-4 py-1 bg-gray-50 border-b border-gray-300">
                  <div className="text-sm text-gray-600">
                    {monthLabel}
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-7 md:grid-cols-[140px_repeat(7,1fr)] ${
                hasMonthBoundary ? 'border-b-2 border-gray-600' : 'border-b border-gray-300'
              }`}>
                {/* Month label column - desktop only */}
                <div className="hidden md:flex px-6 py-8 border-r border-gray-300 items-start justify-end">
                  {monthLabel && (
                    <div className="text-sm text-gray-600 text-right leading-tight">
                      {monthLabel}
                    </div>
                  )}
                </div>

                {/* Day cells */}
                {week.days.map((day, dayIndex) => {
                  const isToday = day.hasSame(today, 'day');
                  const isWeekend = day.weekday === 6 || day.weekday === 7;
                  const nextDay = week.days[dayIndex + 1];
                  const hasMonthBoundaryAfter = nextDay && day.month !== nextDay.month;

                  return (
                    <div
                      key={day.toISODate()}
                      className={`px-2 py-4 md:px-6 md:py-8 min-h-[80px] md:min-h-[140px] transition-all duration-200 cursor-pointer ${
                        hasMonthBoundaryAfter
                          ? 'border-r-2 border-gray-600'
                          : 'border-r border-gray-300 last:border-r-0'
                      } ${
                        isToday
                          ? 'bg-black text-white'
                          : isWeekend
                          ? 'bg-gray-50 hover:bg-black hover:text-white'
                          : 'hover:bg-black hover:text-white'
                      }`}
                    >
                      <div className="text-lg md:text-2xl leading-none">{day.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div ref={bottomSentinelRef} className="h-px" />
      </div>
    </div>
  );
};

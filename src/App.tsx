import "./index.css"
import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { DateTime } from 'luxon';
import { useInView } from 'react-intersection-observer';

type Week = {
  id: string;
  startDate: DateTime;
  days: DateTime[];
}

const WEEKS_TO_LOAD = 12;
const MAX_WEEKS_IN_MEMORY = 32;

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
    return Array.from({ length: 20 }, (_, i) =>
      generateWeek(today.plus({ weeks: i - 10 }))
    );
  });

  const scrollAdjustmentRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollAdjustmentRef.current !== 0 && containerRef.current) {
      window.scrollBy(0, scrollAdjustmentRef.current);
      scrollAdjustmentRef.current = 0;
    }
  }, [weeks]);

  const loadMoreAbove = useCallback(() => {
    const scrollHeightBefore = document.documentElement.scrollHeight;

    setWeeks(prev => {
      const firstWeek = prev.at(0).startDate;
      const newWeeks = Array.from({ length: WEEKS_TO_LOAD }, (_, i) =>
        generateWeek(firstWeek.minus({ weeks: WEEKS_TO_LOAD - i }))
      );

      const updated = [...newWeeks, ...prev];
      const result = updated.length > MAX_WEEKS_IN_MEMORY
        ? updated.slice(0, MAX_WEEKS_IN_MEMORY)
        : updated;

      requestAnimationFrame(() => {
        const scrollHeightAfter = document.documentElement.scrollHeight;
        scrollAdjustmentRef.current = scrollHeightAfter - scrollHeightBefore;
      });

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
    rootMargin: '400px 0px 0px 0px',
  });

  const { ref: bottomSentinelRef } = useInView({
    onChange: (inView) => {
      if (inView) loadMoreBelow();
    },
    rootMargin: '0px 0px 400px 0px',
  });

  const today = DateTime.now().startOf('day');

  return (
    <div ref={containerRef} className="min-h-screen bg-white font-light">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-black">
        <div className="grid grid-cols-[140px_repeat(7,1fr)]">
          <div className="border-r border-black" />
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div
              key={day}
              className="px-6 py-5 text-center border-r border-gray-300 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        <div ref={topSentinelRef} className="h-px" />

        {weeks.map((week) => {
          const monthLabel = getMonthLabel(week);

          return (
            <div key={week.id} className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-gray-300">
              {/* Month label column */}
              <div className="px-6 py-8 border-r border-gray-300 flex items-start justify-end">
                {monthLabel && (
                  <div className="text-sm text-gray-600 text-right leading-tight">
                    {monthLabel}
                  </div>
                )}
              </div>

              {/* Day cells */}
              {week.days.map((day) => {
                const isToday = day.hasSame(today, 'day');
                const isWeekend = day.weekday === 6 || day.weekday === 7;

                return (
                  <div
                    key={day.toISODate()}
                    className={`px-6 py-8 border-r border-gray-300 last:border-r-0 min-h-[140px] transition-all duration-200 cursor-pointer ${
                      isToday
                        ? 'bg-black text-white'
                        : isWeekend
                        ? 'bg-gray-50 hover:bg-black hover:text-white'
                        : 'hover:bg-black hover:text-white'
                    }`}
                  >
                    <div className="text-2xl leading-none">{day.day}</div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div ref={bottomSentinelRef} className="h-px" />
      </div>
    </div>
  );
};

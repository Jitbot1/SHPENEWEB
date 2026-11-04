import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isHappeningNow: boolean;
  nextMeetingDate: Date;
}

function getNextWednesdayMeeting(): { nextDate: Date; isHappeningNow: boolean } {
  const now = new Date();
  
  // Calculate day difference to next Wednesday (day 3)
  const currentDay = now.getDay();
  const daysUntilWednesday = (3 - currentDay + 7) % 7;
  
  const candidate = new Date(now);
  candidate.setDate(now.getDate() + daysUntilWednesday);
  candidate.setHours(18, 30, 0, 0); // 6:30 PM

  // Meeting duration: 18:30 to 19:45 (1h 15m)
  const meetingEndTime = new Date(candidate);
  meetingEndTime.setMinutes(candidate.getMinutes() + 75);

  if (daysUntilWednesday === 0) {
    if (now >= candidate && now <= meetingEndTime) {
      return { nextDate: candidate, isHappeningNow: true };
    }
    if (now > meetingEndTime) {
      // Wednesday meeting already ended today, advance to next week
      candidate.setDate(candidate.getDate() + 7);
      return { nextDate: candidate, isHappeningNow: false };
    }
  }

  return { nextDate: candidate, isHappeningNow: false };
}

function calculateTimeLeft(): TimeLeft {
  const { nextDate, isHappeningNow } = getNextWednesdayMeeting();
  const difference = nextDate.getTime() - new Date().getTime();

  if (isHappeningNow || difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isHappeningNow: true,
      nextMeetingDate: nextDate,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    isHappeningNow: false,
    nextMeetingDate: nextDate,
  };
}

export const OpeningMeetingCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTargetDate = timeLeft.nextMeetingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white py-10 border-y border-primary-700/50 shadow-inner relative overflow-hidden">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Column: Meeting Info */}
          <div className="text-center lg:text-left space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-accent-300 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-accent-400" />
              <span>Next General Meeting</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {formattedTargetDate} @ 6:30 PM
            </h3>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-primary-100 font-medium pt-1">
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <span>Ingram Hall 3202</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <span>Every Wednesday @ 6:30 PM CT</span>
              </span>
            </div>
          </div>

          {/* Right Column: Countdown Cards or Active Alert */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {timeLeft.isHappeningNow ? (
              <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-8 py-5 text-center space-y-2 backdrop-blur-sm">
                <div className="flex items-center justify-center space-x-2 text-emerald-300 font-extrabold text-sm uppercase tracking-wider">
                  <Sparkles className="w-5 h-5 text-emerald-300 animate-spin" />
                  <span>General Meeting Happening Now!</span>
                </div>
                <p className="text-xs text-white/90">
                  Meeting in session right now at Ingram Hall 4101. Join us!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[84px] shadow-lg">
                  <span className="text-2xl sm:text-4xl font-black text-white block leading-none font-mono">
                    {timeLeft.days}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-accent-300 uppercase tracking-wider mt-1.5 block">
                    Days
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[84px] shadow-lg">
                  <span className="text-2xl sm:text-4xl font-black text-white block leading-none font-mono">
                    {timeLeft.hours.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-accent-300 uppercase tracking-wider mt-1.5 block">
                    Hours
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[84px] shadow-lg">
                  <span className="text-2xl sm:text-4xl font-black text-white block leading-none font-mono">
                    {timeLeft.minutes.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-accent-300 uppercase tracking-wider mt-1.5 block">
                    Mins
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[84px] shadow-lg">
                  <span className="text-2xl sm:text-4xl font-black text-accent-400 block leading-none font-mono">
                    {timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-accent-300 uppercase tracking-wider mt-1.5 block">
                    Secs
                  </span>
                </div>
              </div>
            )}

            {/* Quick Action Button */}
            <div className="flex sm:flex-col gap-2">
              <a
                href="https://calendar.google.com/calendar/r?cid=c2hwZXR4c3RAZ21haWwuY29t"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-3 bg-white text-primary-900 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <span>Add to Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

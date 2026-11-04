import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Utensils, 
  Plane, 
  Users, 
  Briefcase, 
  ExternalLink, 
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export const MembershipDuesPage: React.FC = () => {
  const { user, isDuePaying, isPaidMember } = useAuth();
  const [formLoading, setFormLoading] = useState(true);

  const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeRJ1KB662OmKDcHe-CJMfSr6LsUlEp0gGGW1hCI4UNO7EmbA/viewform?pli=1";

  const benefits = [
    {
      icon: <Utensils className="w-5 h-5 text-primary-600" />,
      title: "Catered Meeting Meals",
      description: "Free hot food passes at every bi-weekly general meeting, workshop, and study night.",
    },
    {
      icon: <Plane className="w-5 h-5 text-blue-600" />,
      title: "Convention Travel Stipends",
      description: "Eligibility for chapter-funded grants to attend the SHPE National Convention and RLDC.",
    },
    {
      icon: <Award className="w-5 h-5 text-amber-500" />,
      title: "Merit Points & Leaderboard",
      description: "Only due-paying members can score merit points, win end-of-year awards, and earn travel prizes.",
    },
    {
      icon: <Users className="w-5 h-5 text-purple-600" />,
      title: "8 Committee Leadership Roles",
      description: "Join and lead committees including Technology, SHPEtinas, Athletics, Media, and Fundraising.",
    },
    {
      icon: <Briefcase className="w-5 h-5 text-emerald-600" />,
      title: "Exclusive Sponsor Resume Drop",
      description: "Direct placement in the official chapter Resume Book delivered to Dell, UFCU, LCRA, and more.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-rose-600" />,
      title: "Chapter Voting Rights",
      description: "Cast official ballots in Executive Board officer elections and constitutional referendums.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20 animate-fade-in">
      {/* Hero Header */}
      <div className="bg-[#501214] text-white py-16 px-4 shadow-md border-b-4 border-[#C4A47C]">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-black/40 px-3.5 py-1.5 rounded-full text-xs font-black text-[#C4A47C] border border-[#C4A47C]">
            <CreditCard className="w-3.5 h-3.5 text-[#C4A47C]" />
            <span>Academic Year 2026–2027 Registration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            SHPE Texas State Membership Dues
          </h1>
          <p className="text-sm md:text-base text-gray-100 max-w-2xl leading-relaxed font-bold">
            Invest in your engineering future. Chapter dues directly fund student travel stipends, technical workshop hardware, meeting refreshments, athletic tournament jerseys, and networking banquets.
          </p>

          {user && (
            <div className="pt-2">
              {isDuePaying || isPaidMember ? (
                <div className="inline-flex items-center space-x-2 bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Your chapter dues are currently verified as Active Paid Member!</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 bg-[#C4A47C] text-[#501214] px-4 py-2 rounded-xl text-xs font-black shadow-sm">
                  <Sparkles className="w-4 h-4 text-[#501214]" />
                  <span>Submit the official Google Form below to complete your chapter dues registration.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Dues Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Semester Dues */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-gray-100 shadow-sm hover:border-primary-300 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
                  Single Semester
                </span>
                <span className="text-xs text-gray-400 font-medium">Valid for Fall or Spring</span>
              </div>

              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">$30</span>
                  <span className="text-sm text-gray-500 font-medium">/ semester</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mt-2">Semester Dues</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ideal for graduating seniors or exchange students seeking active membership for a single semester term.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Free food at all bi-weekly chapter meetings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Eligible to earn merit points and leaderboard rank</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Join committee projects and athletic teams</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Access to chapter study nights and resume workshops</span>
                </li>
              </ul>
            </div>

            <a
              href="#dues-form"
              className="w-full text-center py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>Pay Semester Dues ($30)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Full Year Dues */}
          <div className="bg-gradient-to-b from-primary-50/50 to-white rounded-3xl p-6 sm:p-8 border-2 border-primary-500 shadow-md relative flex flex-col justify-between space-y-6">
            <div className="absolute -top-3.5 right-6 bg-primary-600 text-white text-[10px] uppercase tracking-widest font-black px-3.5 py-1 rounded-full shadow-sm">
              Best Value &bull; Save $20
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-primary-800 bg-primary-100 px-3 py-1 rounded-full border border-primary-300">
                  Full Academic Year
                </span>
                <span className="text-xs text-primary-700 font-bold">Fall 2026 & Spring 2027</span>
              </div>

              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl sm:text-5xl font-black text-primary-950 tracking-tight">$40</span>
                  <span className="text-sm text-gray-500 font-medium">/ full year</span>
                </div>
                <h3 className="text-lg font-bold text-primary-950 mt-2">Full Year Dues</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Comprehensive membership for both Fall and Spring semesters. Maximum savings and highest funding priority!
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-700 pt-2 border-t border-primary-100">
                <li className="flex items-center space-x-2 font-bold text-primary-900">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Full Fall & Spring academic year coverage ($40 vs $60)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Priority for SHPE National Convention travel stipends</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Official voting privileges in Executive Board elections</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Direct corporate sponsor resume book distribution</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>All general meetings, food passes, and socials included</span>
                </li>
              </ul>
            </div>

            <a
              href="#dues-form"
              className="w-full text-center py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Pay Full Year Dues ($40)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider block">
              Member Perks & Impact
            </span>
            <h2 className="text-2xl font-black text-gray-900">
              Why Pay Chapter Dues?
            </h2>
            <p className="text-xs text-gray-500">
              Your dues unlock essential professional and personal advantages throughout your time at Texas State.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="p-2 bg-white rounded-xl shadow-2xs w-fit border border-gray-200">
                  {b.icon}
                </div>
                <h4 className="font-bold text-sm text-gray-900">{b.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Embedded Google Form Section */}
        <div id="dues-form" className="bg-white rounded-3xl p-4 sm:p-8 border border-gray-200 shadow-md space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-primary-50 text-primary-800 text-[11px] font-bold px-3 py-1 rounded-full border border-primary-200 mb-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Official Dues Submission Form</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                Pay Chapter Dues Online
              </h2>
              <p className="text-xs text-gray-500">
                Complete the Google Form below with your information and payment confirmation.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={googleFormUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors"
              >
                <span>Open in New Window</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              </a>
            </div>
          </div>

          {/* Verification Notice */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-950 flex items-start space-x-3">
            <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">How Dues Verification Works</p>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Once submitted, chapter officers confirm your payment against chapter records. Your account on this website will be granted active status, enabling your personalized QR code check-in pass and merit points scoring.
              </p>
            </div>
          </div>

          {/* Form Container */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 bg-white min-h-[750px] shadow-inner">
            {formLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10 space-y-3">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-gray-600">Loading Google Form for Chapter Dues...</p>
              </div>
            )}
            <iframe
              src={googleFormUrl}
              title="SHPE Texas State Dues Payment Google Form"
              className="w-full min-h-[850px] sm:min-h-[950px] border-0"
              onLoad={() => setFormLoading(false)}
              allowFullScreen
            >
              Loading…
            </iframe>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              Having trouble viewing the embedded form?{' '}
              <a 
                href={googleFormUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-primary-700 font-bold underline hover:text-primary-800"
              >
                Click here to open the Google Form directly
              </a>
            </p>
          </div>
        </div>

        {/* Next Steps / Profile Link */}
        <div className="bg-gradient-to-r from-gray-900 to-primary-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold">Already paid your chapter dues?</h3>
            <p className="text-xs text-gray-300 max-w-lg">
              Check your verified status on your personalized profile dashboard, or display your QR code check-in pass at the next meeting.
            </p>
          </div>
          <Link
            to="/profile"
            className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-primary-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 whitespace-nowrap"
          >
            <span>Go to My Profile &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MembershipDuesPage;

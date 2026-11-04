import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import { WeeklyAnnouncementsSlideshow } from './components/WeeklyAnnouncementsSlideshow';
import EventsSection from './components/EventsSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import Carousel from './components/Carousel';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import SHPEtinas from './components/pages/SHPEtinas';
import Athletics from './components/pages/Athletics';
import Merits from './components/pages/Merits';
import Officers from "./components/Officers";
import ProfileDashboard from "./components/pages/ProfileDashboard";
import { CommitteesPage } from './components/pages/CommitteesPage';
import MembershipDuesPage from './components/pages/MembershipDuesPage';
import AdminScanner from './components/AdminScanner';
import { MentorSHPE } from './components/pages/MentorSHPE';
import { AdminAnalytics } from './components/pages/AdminAnalytics';
import { AdminImageManagement } from './components/pages/AdminImageManagement';
import { AdminHub } from './components/pages/AdminHub';
import { CheckInPage } from './components/pages/CheckInPage';
import { OpeningMeetingCountdown } from './components/OpeningMeetingCountdown';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Home page component
const HomePage = () => (
  <main className="animate-fade-in">
    <Hero />
    <OpeningMeetingCountdown />
    <WeeklyAnnouncementsSlideshow />
    <EventsSection />
    <AboutSection />
    <ContactSection />
    <Carousel 
      title="Thank you to our sponsors!"
      description="We're grateful for the support of our partners who help us achieve our mission"
    />
  </main>
);

// AppContent component
const AppContent = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programs/mentorshpe" element={<MentorSHPE />} />
        <Route path="/mentorshpe" element={<MentorSHPE />} />
        <Route path="/programs/shpetinas" element={<SHPEtinas />} />
        <Route path="/programs/athletics" element={<Athletics />} />
        <Route path="/programs/merits" element={<Merits />} />
        <Route path="/merits" element={<Merits />} />
        <Route path="/leaderboard" element={<Merits />} />
        <Route path="/officers" element={<Officers />} />
        <Route path="/committees" element={<CommitteesPage />} />
        <Route path="/membership" element={<MembershipDuesPage />} />
        <Route path="/dues" element={<MembershipDuesPage />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/attendance" element={<CheckInPage />} />
        <Route path="/admin" element={<AdminHub />} />
        <Route path="/admin/hub" element={<AdminHub />} />
        <Route path="/admin/scanner" element={<AdminScanner />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/images" element={<AdminImageManagement />} />
        <Route path="/admin/mentorshpe" element={<MentorSHPE />} />
        <Route path="/profile" element={<ProfileDashboard />} />
        <Route path="/contact" element={<ContactSection />} />
      </Routes>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
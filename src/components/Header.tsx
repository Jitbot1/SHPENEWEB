import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, Shield, UserCheck, User as UserIcon, LogIn } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/useAuth';
import { AuthModal } from './AuthModal';
import { CommitteesModal } from './CommitteesModal';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [committeesModalOpen, setCommitteesModalOpen] = useState(false);
  
  const { user, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleContactClick = () => {
    setMobileMenuOpen(false);
    navigate('/');
    setTimeout(() => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const menuItems = [
    { name: 'Home', href: '/' },
    { 
      name: 'Programs', 
      href: '#',
      submenu: [
        { name: 'MentorSHPE', href: '/programs/mentorshpe' },
        { name: 'SHPEtinas', href: '/programs/shpetinas' },
        { name: 'Athletics', href: '/programs/athletics' },
        { name: 'Merits', href: '/programs/merits' }
      ]
    },
    { 
      name: 'Committees', 
      href: '/committees',
      submenu: [
        { name: 'All 6 Committees', href: '/committees' },
        { name: 'Athletics', href: '/committees?tab=athletics' },
        { name: 'Events', href: '/committees?tab=events' },
        { name: 'Fundraising', href: '/committees?tab=fundraising' },
        { name: 'Media', href: '/committees?tab=media' },
        { name: 'SHPEtinas', href: '/committees?tab=shpetinas' },
        { name: 'Technology', href: '/committees?tab=technology' }
      ]
    },
    { name: 'Officers', href: '/officers' },
    { name: 'Membership & Dues', href: '/membership' },
    ...(user ? [{ name: 'My Profile', href: '/profile' }] : []),
    ...(isAdmin ? [
      { 
        name: 'Admin Hub', 
        href: '/admin',
        submenu: [
          { name: '1. Live Event Attendance & QR', href: '/admin?tab=attendance' },
          { name: '2. Analytics & Export', href: '/admin?tab=analytics' },
          { name: '3. Content & Media Manager', href: '/admin?tab=media' },
          { name: '4. Member & Dues Roster', href: '/admin?tab=roster' },
        ]
      }
    ] : []),
    { name: 'Contact', href: '#contact', isContact: true }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isSubpage = location.pathname !== '/';
  const isLightHeader = isScrolled || isSubpage;
  const textColor = isLightHeader ? 'text-gray-800' : 'text-white';
  const headerBgClass = isLightHeader ? 'bg-white shadow-md py-2' : 'bg-transparent py-4';

  return (
    <>
      <header 
        className={`fixed w-full z-50 transition-all duration-300 ${headerBgClass}`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" onClick={handleHomeClick} className="flex-shrink-0 z-10 block">
            <Logo isScrolled={isLightHeader} />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <div key={item.name} className="relative group">
                {item.submenu ? (
                  <>
                    <button
                      type="button"
                      className={`inline-flex items-center font-medium text-sm transition-colors duration-200 cursor-pointer px-3 py-2 rounded-md ${
                        isLightHeader
                          ? 'hover:bg-primary-50 hover:text-primary-700'
                          : 'hover:bg-white/20 hover:text-white'
                      } ${textColor}`}
                    >
                      {item.name}
                      <ChevronDown className="ml-1 h-4 w-4 transition-transform group-hover:rotate-180" />
                    </button>

                    <div className="absolute left-0 top-full mt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 bg-white rounded-md shadow-lg py-1">
                      {item.submenu.map((subitem) => (
                        <Link
                          key={subitem.name}
                          to={subitem.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                        >
                          {subitem.name}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : item.isCommittees ? (
                  <button
                    onClick={() => setCommitteesModalOpen(true)}
                    className={`font-medium text-sm transition-all duration-200 px-3 py-2 rounded-md ${
                      isLightHeader 
                        ? 'hover:bg-primary-50 hover:text-primary-700' 
                        : 'hover:bg-white/20 hover:text-white'
                    } ${textColor}`}
                  >
                    Committees
                  </button>
                ) : item.isContact ? (
                  <button 
                    onClick={handleContactClick}
                    className={`font-medium text-sm transition-all duration-200 px-3 py-2 rounded-md ${
                      isLightHeader 
                        ? 'hover:bg-primary-50 hover:text-primary-700' 
                        : 'hover:bg-white/20 hover:text-white'
                    } ${textColor}`}
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link 
                    to={item.href || '/'}
                    onClick={item.name === 'Home' ? handleHomeClick : undefined}
                    className={`font-medium text-sm transition-all duration-200 px-3 py-2 rounded-md ${
                      isLightHeader 
                        ? 'hover:bg-primary-50 hover:text-primary-700' 
                        : 'hover:bg-white/20 hover:text-white'
                    } ${textColor}`}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}

            <div className="flex items-center space-x-3">
              {/* Google Account Login / Profile Trigger */}
              {user ? (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isLightHeader
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                      : 'bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-sm'
                  }`}
                  title="View Profile and Role"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">
                    {(userProfile?.fullName || userProfile?.displayName || user.displayName)?.split(' ')[0] || 'Account'}
                  </span>
                  {isAdmin ? (
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center shadow-xs">
                      <Shield className="w-2.5 h-2.5 mr-0.5 text-accent-300" /> Admin
                    </span>
                  ) : userProfile?.role === 'officer' ? (
                    <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center">
                      <Shield className="w-2.5 h-2.5 mr-0.5" /> Officer
                    </span>
                  ) : userProfile?.role === 'member' ? (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center">
                      <UserCheck className="w-2.5 h-2.5 mr-0.5" /> Member
                    </span>
                  ) : (
                    <span className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center">
                      <UserIcon className="w-2.5 h-2.5 mr-0.5" /> Guest
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    isLightHeader
                      ? 'border-gray-300 text-gray-800 hover:bg-gray-100'
                      : 'border-white/40 text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Google Sign In</span>
                </button>
              )}

              {/* Join Us Button */}
              <button
                onClick={handleContactClick}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm"
              >
                Join Us
              </button>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`p-2 rounded-full ${textColor}`}
              title="Account"
            >
              <UserIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${textColor}`} />
              ) : (
                <Menu className={`h-6 w-6 ${textColor}`} />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <div className="px-3 pt-2 pb-4 space-y-1 sm:px-4">
              {menuItems.map((item) => (
                <React.Fragment key={item.name}>
                  {item.isContact ? (
                    <button
                      onClick={handleContactClick}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-900 hover:bg-primary-50 hover:text-primary-700 rounded-md"
                    >
                      {item.name}
                    </button>
                  ) : (
                    <Link
                      to={item.href || '/'}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (item.name === 'Home') handleHomeClick();
                      }}
                      className="block px-3 py-2 text-base font-medium text-gray-900 hover:bg-primary-50 hover:text-primary-700 rounded-md"
                    >
                      {item.name}
                    </Link>
                  )}
                  {item.submenu && item.submenu.map((subitem) => (
                    <Link
                      key={subitem.name}
                      to={subitem.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block pl-6 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-700 rounded-md"
                    >
                      {subitem.name}
                    </Link>
                  ))}
                </React.Fragment>
              ))}

              <div className="pt-3 space-y-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-800 py-2.5 rounded-xl font-semibold text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {user ? `Account (${isAdmin ? 'Admin' : userProfile?.role || 'Guest'})` : 'Sign in with Google'}
                  </span>
                </button>
                <button
                  onClick={handleContactClick}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200"
                >
                  Join Us
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onOpenCommitteesModal={() => setCommitteesModalOpen(true)}
      />

      {/* Committees Manager Modal */}
      <CommitteesModal
        isOpen={committeesModalOpen}
        onClose={() => setCommitteesModalOpen(false)}
      />
    </>
  );
};

export default Header;
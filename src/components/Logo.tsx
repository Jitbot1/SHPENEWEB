import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  isScrolled?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '',
  isScrolled = false
}) => {
  const [imageError, setImageError] = useState(false);

  // RGB PNG for white/light header backgrounds, KO PNG for dark hero backgrounds
  const darkBgLogo = "/assets/icons/SHPE_logo_horiz_Bobcat_KO.png";
  const lightBgLogo = "/assets/icons/SHPE_logo_horiz_Bobcat_RGB.png";

  return (
    <div className="flex items-center space-x-2">
      <div className="relative h-10 md:h-12 flex items-center min-w-[160px] sm:min-w-[200px]">
        {!imageError ? (
          <img 
            src={isScrolled ? lightBgLogo : darkBgLogo}
            alt="SHPE Texas State Bobcats"
            className={`h-8 sm:h-9 md:h-10 w-auto max-w-[210px] sm:max-w-[260px] md:max-w-[300px] object-contain transition-all duration-200 ${className}`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center space-x-2">
            <img src="/assets/icons/logo.svg" alt="SHPE Logo" className="h-8 w-auto flex-shrink-0" />
            <div className={`h-6 w-px ${isScrolled ? 'bg-gray-300' : 'bg-white/40'} mx-1`} />
            <img 
              src="/assets/images/headshots/bobcat.png" 
              alt="Texas State Bobcats" 
              className="h-8 w-auto object-contain flex-shrink-0" 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Logo;

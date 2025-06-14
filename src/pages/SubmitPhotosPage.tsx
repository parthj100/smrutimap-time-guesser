import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubmitPhotosPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e8e2d4' }}>
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        {/* SmrutiMap Logo - Clickable */}
        <div className="mb-16">
          <img 
            src="/Smruti-map.png" 
            alt="SmrutiMap Icon" 
            className="w-80 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          />
        </div>

        {/* Content */}
        <div className="text-center space-y-12 text-gray-800 max-w-6xl">
          <p className="text-5xl leading-tight font-semibold">
            If you have photos you would like to be featured in
            SmrutiMap please send them in an email to{' '}
            <a 
              href="mailto:smrutimap@gmail.com" 
              className="text-[#ea384c] hover:underline"
            >
              smrutimap@gmail.com
            </a>{' '}with a note on the
            year/location and a short description. There should be
            clues of some sort to help work out the year/location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubmitPhotosPage; 
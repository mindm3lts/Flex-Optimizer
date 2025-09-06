import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      <style>{`
        .route-line {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: draw-route 2s ease-in-out infinite;
        }
        @keyframes draw-route {
          to {
            stroke-dashoffset: 0;
          }
        }
        .map-pin {
            animation: drop-pin 2s ease-in-out infinite;
            transform-origin: 50% 95%;
        }
        @keyframes drop-pin {
            0%, 20% {
                transform: scale(0) translateY(-30px);
                opacity: 0;
            }
            40%, 60% {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
            80%, 100% {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
        }
      `}</style>
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 6v14l7-4 8 4 7-4V2l-7 4-8-4-7 4z" className="text-gray-300 dark:text-gray-700" />
        <path d="M8 2v14" className="text-gray-300 dark:text-gray-700" />
        <path d="M16 6v14" className="text-gray-300 dark:text-gray-700" />
        <path
          d="M5.5 5C4 7, 8 10, 10 12s4 2, 6 2c2.5 0, 4-2.5, 2.5-4.5"
          className="route-line text-cyan-600 dark:text-cyan-500"
          strokeWidth="2"
        />
         <g className="map-pin">
            <path d="M18.5 10c0 4.142-6.5 10.25-6.5 10.25S5.5 14.142 5.5 10a6.5 6.5 0 1113 0z" className="fill-cyan-600 dark:fill-cyan-500 stroke-gray-100 dark:stroke-white" strokeWidth="1"/>
            <circle cx="12" cy="10" r="2" className="fill-gray-100 dark:fill-white" strokeWidth="0"/>
        </g>
      </svg>
      <p className="mt-4 text-cyan-600 dark:text-cyan-300 font-semibold tracking-wider">ANALYZING SCREENSHOTS...</p>
    </div>
  );
};

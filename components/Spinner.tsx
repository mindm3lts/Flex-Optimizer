import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
      <p className="mt-4 text-cyan-300 font-semibold">Analyzing Screenshots...</p>
    </div>
  );
};
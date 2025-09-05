
import React from 'react';
import { RouteIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-center text-center flex-col">
      <div className="bg-cyan-500 p-3 rounded-full mb-3 shadow-lg">
        <RouteIcon className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">
        Flex Route <span className="text-cyan-400">Optimizer</span>
      </h1>
      <p className="text-gray-400 mt-1">Upload your route screenshot to get started.</p>
    </header>
  );
};

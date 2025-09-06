import React, { useState, useEffect } from 'react';
import { RouteIcon } from './icons';

const LiveClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="text-center text-sm text-gray-400 font-mono">
            <span>{formattedDate}</span>
            <span className="mx-2">|</span>
            <span>{formattedTime}</span>
        </div>
    );
};


export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-center text-center flex-col">
      <div className="bg-cyan-500 p-3 rounded-full mb-3 shadow-lg">
        <RouteIcon className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">
        Flex Route <span className="text-cyan-400">Optimizer</span>
      </h1>
      <p className="text-gray-400 mt-1 mb-3">Upload your route screenshot to get started.</p>
      <LiveClock />
    </header>
  );
};
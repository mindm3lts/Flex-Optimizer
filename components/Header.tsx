import React, { useState, useEffect } from 'react';
import { RouteIcon, UserCircleIcon, SunIcon, MoonIcon } from './icons';

interface HeaderProps {
  onOpenSubModal: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const LiveClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return <div className="text-sm font-mono bg-gray-100 dark:bg-gray-900/50 px-2 py-1 rounded-md">{formattedTime}</div>;
};

export const Header: React.FC<HeaderProps> = ({ onOpenSubModal, theme, toggleTheme }) => {
    return (
        <header className="flex items-center justify-between">
          <div className="flex items-center">
            <RouteIcon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-xl font-bold ml-3">Flex Route Optimizer</h1>
          </div>
          <div className="flex items-center space-x-2">
            <LiveClock />
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                {theme === 'light' ? <MoonIcon className="w-6 h-6 text-gray-700" /> : <SunIcon className="w-6 h-6 text-yellow-400" />}
            </button>
            <button 
              onClick={onOpenSubModal} 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Open subscription settings"
            >
              <UserCircleIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </header>
    );
};
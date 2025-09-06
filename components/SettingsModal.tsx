import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon, WarningIcon } from './icons';
import type { AiSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AiSettings) => void;
  currentSettings: AiSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<AiSettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Provider Settings</h3>
          <button onClick={onClose} aria-label="Close modal" className="p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Provider</label>
            <select
              id="aiProvider"
              value={settings.provider}
              onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
            >
              <option value="gemini">Google Gemini</option>
              {/* Add other providers here in the future */}
            </select>
          </div>
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
            <input
              type="password"
              id="apiKey"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Enter your API key"
            />
          </div>
          <div>
            <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model Name</label>
            <input
              type="text"
              id="modelName"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="e.g., gemini-2.5-flash"
            />
          </div>
          <div className="mt-3 p-3 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/50">
            <div className="flex items-start">
              <WarningIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Your API key is stored in your browser's local storage. Do not use this app on a shared or public computer.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            <SaveIcon className="w-5 h-5 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import type { User } from '../types';
import { CloseIcon, CheckIcon, StarIcon } from './icons';

interface SubscriptionModalProps {
  user: User;
  onClose: () => void;
  onSubscriptionChange: (newTier: 'Free' | 'Pro') => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ user, onClose, onSubscriptionChange }) => {
  const isPro = user.tier === 'Pro';

  const handleUpgrade = () => {
    // In a real app, this would trigger a payment flow
    onSubscriptionChange('Pro');
  };

  const handleDowngrade = () => {
    // In a real app, this would manage the subscription cancellation
    onSubscriptionChange('Free');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 relative">
        <button onClick={onClose} aria-label="Close modal" className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="text-center">
          <StarIcon className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isPro ? 'You are a Pro!' : 'Upgrade to Pro'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {isPro
              ? 'Enjoy unlimited route processing and all premium features.'
              : 'Unlock the full power of Flex Route Optimizer.'}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Free Plan */}
            <div className={`p-4 rounded-lg border-2 ${!isPro ? 'border-cyan-600 dark:border-cyan-500' : 'border-gray-200 dark:border-gray-700'}`}>
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Free Plan</h4>
                <ul className="mt-3 space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /> Route Extraction from Screenshot</li>
                    <li className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /> AI-Powered Route Optimization</li>
                    <li className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /> <span className="font-bold">5 Routes</span> per Month</li>
                </ul>
            </div>

            {/* Pro Plan */}
             <div className={`p-4 rounded-lg border-2 ${isPro ? 'border-yellow-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-900/50`}>
                <h4 className="font-bold text-lg text-yellow-500 dark:text-yellow-400">Pro Plan</h4>
                 <p className="text-2xl font-bold text-gray-900 dark:text-white my-2">$1.99 <span className="text-base font-normal text-gray-500 dark:text-gray-400">/ month</span></p>
                <ul className="mt-3 space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start"><StarIcon className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" /> All Free features, plus:</li>
                    <li className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /> <span className="font-bold">Unlimited</span> Route Processing</li>
                    <li className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /> Priority Support (simulated)</li>
                </ul>
            </div>
        </div>

        <div className="mt-6">
          {isPro ? (
            <button
              onClick={handleDowngrade}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white font-bold py-3 px-4 rounded-lg transition duration-300"
            >
              Manage Subscription (Downgrade to Free)
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105"
            >
              Upgrade to Pro
            </button>
          )}
          <p className="text-xs text-gray-500 text-center mt-2">
              This is a simulation. No real payment will be processed.
          </p>
        </div>
      </div>
    </div>
  );
};
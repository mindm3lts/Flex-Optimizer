import React, { useMemo, useState, useRef } from 'react';
import type { RouteStop, PackageType } from '../types';
import { GoogleMapsIcon, AppleMapsIcon, DragHandleIcon, TrashIcon, BoxIcon, EnvelopeIcon, PackageIcon, SortIcon, WarningIcon, SparklesIcon } from './icons';

interface RouteDisplayProps {
  route: RouteStop[];
  onRouteUpdate: (newRoute: RouteStop[]) => void;
  onAiOptimize: () => Promise<void>;
  isOptimizing: boolean;
}

const packageTypes: PackageType[] = ["Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown"];

const getPackageIcon = (packageType: PackageType) => {
    switch (packageType) {
        case "Box":
        case "Custom Sized":
            return <BoxIcon className="w-6 h-6 text-cyan-400" />;
        case "Envelope":
            return <EnvelopeIcon className="w-6 h-6 text-cyan-400" />;
        case "Plastic Bag":
            return <PackageIcon className="w-6 h-6 text-cyan-400" />;
        default:
            return <PackageIcon className="w-6 h-6 text-gray-500" />;
    }
}

const generateMapsUrl = (platform: 'google' | 'apple', stops: RouteStop[]): string => {
  if (stops.length === 0) return '#';

  const encodedAddresses = stops.map(stop =>
    encodeURIComponent(`${stop.street}, ${stop.city}, ${stop.state} ${stop.zip}`)
  );

  if (stops.length === 1) {
    return platform === 'google'
      ? `https://www.google.com/maps/search/?api=1&query=${encodedAddresses[0]}`
      : `https://maps.apple.com/?q=${encodedAddresses[0]}`;
  }

  const origin = encodedAddresses[0];
  const destination = encodedAddresses[encodedAddresses.length - 1];
  const waypoints = encodedAddresses.slice(1, -1);
  
  if (platform === 'google') {
    const waypointsString = waypoints.join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypointsString}`;
  } else { // apple
    const waypointsString = waypoints.join('+to:');
    const daddr = waypoints.length > 0 ? `${waypointsString}+to:${destination}` : destination;
    return `https://maps.apple.com/?saddr=${origin}&daddr=${daddr}`;
  }
};

export const RouteDisplay: React.FC<RouteDisplayProps> = ({ route, onRouteUpdate, onAiOptimize, isOptimizing }) => {
  const googleMapsUrl = useMemo(() => generateMapsUrl('google', route), [route]);
  const appleMapsUrl = useMemo(() => generateMapsUrl('apple', route), [route]);

  const draggedItemIndex = useRef<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [stopToDeleteIndex, setStopToDeleteIndex] = useState<number | null>(null);

  const handleFieldChange = (index: number, field: keyof RouteStop, value: string) => {
    const newRoute = [...route];
    (newRoute[index] as any)[field] = value;
    onRouteUpdate(newRoute);
  };

  const handleDragStart = (index: number) => {
    draggedItemIndex.current = index;
  };
  
  const handleDragEnter = (index: number) => {
    if (index !== draggedItemIndex.current) {
      setDraggedOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedItemIndex.current === null || draggedItemIndex.current === index) {
      setDraggedOverIndex(null);
      return;
    }

    const newRoute = [...route];
    const [removed] = newRoute.splice(draggedItemIndex.current, 1);
    newRoute.splice(index, 0, removed);
    onRouteUpdate(newRoute);
    
    draggedItemIndex.current = null;
    setDraggedOverIndex(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  const handleDeleteRequest = (index: number) => {
    setStopToDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (stopToDeleteIndex === null) return;
    
    const newRoute = route.filter((_, i) => i !== stopToDeleteIndex);
    onRouteUpdate(newRoute);
    setStopToDeleteIndex(null);
  };

  const handleCancelDelete = () => {
    setStopToDeleteIndex(null);
  };

  const handleResetOrder = () => {
    const sortedRoute = [...route].sort((a, b) => a.originalStopNumber - b.originalStopNumber);
    onRouteUpdate(sortedRoute);
  };

  return (
    <div className="mt-6 bg-gray-800 rounded-lg p-4 shadow-lg animate-fade-in flex flex-col flex-grow">
      <div className="mb-4">
          <h2 className="text-xl font-bold text-cyan-400 text-center">Optimize Your Route</h2>
          <div className="flex items-center space-x-2 mt-3">
             <button
                onClick={onAiOptimize}
                disabled={isOptimizing || route.length < 2}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                aria-label="Optimize route with AI"
              >
                <SparklesIcon className={`w-5 h-5 mr-2 ${isOptimizing ? 'animate-pulse' : ''}`} />
                {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
              </button>
              <button
                onClick={handleResetOrder}
                disabled={isOptimizing}
                className="flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
                aria-label="Reset to original order"
              >
                <SortIcon className="w-5 h-5 mr-2" />
                Reset Order
              </button>
          </div>
      </div>
      
      <div 
        className="space-y-3 overflow-y-auto pr-2 flex-grow"
        onDragOver={handleDragOver}
      >
        {route.map((stop, index) => (
          <div
            key={stop.originalStopNumber}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            className={`relative flex items-start bg-gray-700/50 p-3 rounded-md transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing ${draggedItemIndex.current === index ? 'opacity-50' : ''}`}
          >
            <DragHandleIcon className="w-6 h-6 text-gray-500 mr-3 mt-1 flex-shrink-0" />
            <div className="flex-grow">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-gray-400">Original: #{stop.originalStopNumber}</span>
                    <span className="font-bold text-cyan-400 text-sm">New: #{index + 1}</span>
                </div>
              <p className="font-semibold text-gray-100">{stop.street}</p>
              <p className="text-sm text-gray-400">{`${stop.city}, ${stop.state} ${stop.zip}`}</p>
              
              <textarea
                value={stop.label}
                onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                placeholder="Add a delivery note..."
                rows={2}
                className="mt-3 w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
              />

              <div className="mt-3 pt-3 border-t border-gray-600/50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Package Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                   <div className="flex items-center space-x-2 bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5">
                      {getPackageIcon(stop.packageType)}
                      <select
                          value={stop.packageType}
                          onChange={(e) => handleFieldChange(index, 'packageType', e.target.value)}
                          className="bg-transparent w-full text-gray-200 focus:outline-none"
                      >
                          {packageTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                      </select>
                  </div>
                   <input
                    type="text"
                    value={stop.packageLabel}
                    onChange={(e) => handleFieldChange(index, 'packageLabel', e.target.value)}
                    placeholder="Package Label (A.1Z)"
                    className="bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5 text-gray-200 placeholder-gray-500 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                   <input
                    type="text"
                    value={stop.tba}
                    onChange={(e) => handleFieldChange(index, 'tba', e.target.value)}
                    placeholder="TBA..."
                    className="md:col-span-2 bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5 text-gray-200 placeholder-gray-500 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDeleteRequest(index)}
              className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label={`Delete stop ${index + 1}`}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
            {draggedOverIndex === index && (
              <div className="absolute left-0 right-0 h-1 bg-cyan-500 bottom-0 rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          <GoogleMapsIcon className="w-6 h-6 mr-2" />
          Open in Google Maps
        </a>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          <AppleMapsIcon className="w-6 h-6 mr-2" />
          Open in Apple Maps
        </a>
      </div>
      
      {stopToDeleteIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" aria-labelledby="modal-title">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
             <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <WarningIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-bold text-white" id="modal-title">
                        Confirm Deletion
                    </h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          Are you sure you want to delete stop #{stopToDeleteIndex + 1} ({route[stopToDeleteIndex].street})? This action cannot be undone.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
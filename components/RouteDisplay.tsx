import React, { useMemo, useState, useRef, useCallback } from 'react';
import type { RouteStop, PackageType, RouteSummary, TrafficInfo, TrafficStatus, StopType } from '../types';
import { GoogleMapsIcon, DragHandleIcon, TrashIcon, BoxIcon, EnvelopeIcon, PackageIcon, SortIcon, WarningIcon, SparklesIcon, LocationPinIcon, ClockIcon, RoadIcon, HashtagIcon, TrafficIcon, CloseIcon, LinkIcon, MyLocationIcon, NoLeftTurnIcon, BuildingOfficeIcon, TimeConstraintIcon, PriorityIcon, HouseIcon, ApartmentIcon, LockerIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

interface RouteDisplayProps {
  route: RouteStop[];
  summary: RouteSummary | null;
  trafficInfo: TrafficInfo | null;
  onRouteUpdate: (newRoute: RouteStop[]) => void;
  onAiOptimize: (useLocation: boolean, avoidLeftTurns: boolean) => Promise<void>;
  isOptimizing: boolean;
}

const packageTypes: PackageType[] = ["Box", "Envelope", "Plastic Bag", "Custom Sized", "Unknown"];
const stopTypes: StopType[] = ["House", "Apartment", "Business", "Locker", "Unknown"];


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

const getStopTypeIcon = (stopType: StopType) => {
    switch(stopType) {
        case "House":
            return <HouseIcon className="w-4 h-4 mr-1"/>;
        case "Apartment":
            return <ApartmentIcon className="w-4 h-4 mr-1"/>;
        case "Business":
            return <BuildingOfficeIcon className="w-4 h-4 mr-1"/>;
        case "Locker":
            return <LockerIcon className="w-4 h-4 mr-1" />;
        default:
            return null;
    }
}


const getTrafficColor = (status: TrafficStatus) => {
  switch (status) {
    case 'Light': return 'text-green-400';
    case 'Moderate': return 'text-yellow-400';
    case 'Heavy': return 'text-red-400';
    default: return 'text-gray-500';
  }
};

const GOOGLE_MAPS_WAYPOINT_LIMIT = 20;

interface GoogleMapsLink {
  label: string;
  url: string;
}

const formatTimeToAMPM = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedMinutes = minute < 10 ? `0${minute}` : minute;
    return `${formattedHour}:${formattedMinutes} ${ampm}`;
}


const generateGoogleMapsLinks = (stops: RouteStop[]): GoogleMapsLink[] => {
  const deliveryStops = stops.filter(s => s.type !== 'location');
  if (deliveryStops.length === 0) return [];

  if (deliveryStops.length <= GOOGLE_MAPS_WAYPOINT_LIMIT) {
    const encodedAddresses = deliveryStops.map(stop => encodeURIComponent(`${stop.street}, ${stop.city}, ${stop.state} ${stop.zip}`));
    if (deliveryStops.length === 1) {
      return [{ label: 'Open in Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodedAddresses[0]}` }];
    }
    const origin = encodedAddresses[0];
    const destination = encodedAddresses[encodedAddresses.length - 1];
    const waypoints = encodedAddresses.slice(1, -1).join('|');
    return [{ label: 'Open in Google Maps', url: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}` }];
  }
  
  const links: GoogleMapsLink[] = [];
  for (let i = 0; i < deliveryStops.length; i += GOOGLE_MAPS_WAYPOINT_LIMIT) {
    const chunk = deliveryStops.slice(i, i + GOOGLE_MAPS_WAYPOINT_LIMIT);
    const encodedAddresses = chunk.map(stop => encodeURIComponent(`${stop.street}, ${stop.city}, ${stop.state} ${stop.zip}`));
    
    const origin = encodedAddresses[0];
    const destination = encodedAddresses[encodedAddresses.length - 1];
    const waypoints = encodedAddresses.slice(1, -1).join('|');
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
    const label = `Open Route (Stops ${i + 1} - ${i + chunk.length})`;
    links.push({ label, url });
  }
  return links;
};

const SummaryItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number; isLoading: boolean }> = ({ icon, label, value, isLoading }) => (
  <div className="flex flex-col items-center justify-center p-2 bg-gray-700/50 rounded-lg text-center h-full">
    {isLoading ? (
      <>
        <div className="w-6 h-6 bg-gray-600 rounded-full animate-pulse"></div>
        <div className="h-4 w-16 bg-gray-600 rounded mt-2 animate-pulse"></div>
        <div className="h-3 w-12 bg-gray-600 rounded mt-1 animate-pulse"></div>
      </>
    ) : (
      <>
        <div className="text-cyan-400">{icon}</div>
        <span className="mt-1 text-lg font-bold text-white">{value}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </>
    )}
  </div>
);

const LocationStopDisplay: React.FC<{ stop: RouteStop }> = ({ stop }) => (
  <div className="relative flex items-start bg-blue-900/50 border border-blue-700 p-3 rounded-md">
    <MyLocationIcon className="w-6 h-6 text-blue-400 mr-3 mt-1 flex-shrink-0" />
    <div className="flex-grow">
      <div className="flex justify-between items-center text-xs font-mono mb-1">
        <span className="font-bold text-blue-300 text-sm">START: #{1}</span>
      </div>
      <p className="font-semibold text-gray-100">{stop.street}</p>
      <p className="text-sm text-gray-400">{stop.city}</p>
    </div>
  </div>
);

export const RouteDisplay: React.FC<RouteDisplayProps> = ({ route, summary, trafficInfo, onRouteUpdate, onAiOptimize, isOptimizing }) => {
  const googleMapsLinks = useMemo(() => generateGoogleMapsLinks(route), [route]);
  
  const isSummaryLoading = !summary?.totalDistance || summary.totalDistance === '...';
  const isTrafficLoading = !trafficInfo;

  const draggedItemIndex = useRef<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [stopToDeleteIndex, setStopToDeleteIndex] = useState<number | null>(null);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [useLocation, setUseLocation] = useState(false);
  const [avoidLeftTurns, setAvoidLeftTurns] = useState(false);
  
  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);


  const locationStop = useMemo(() => route.find(s => s.type === 'location'), [route]);
  const deliveryStops = useMemo(() => route.filter(s => s.type !== 'location'), [route]);

  const handleFieldChange = (index: number, field: keyof RouteStop, value: string) => {
    const newDeliveryStops = [...deliveryStops];
    (newDeliveryStops[index] as any)[field] = value;
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
  };
  
  const handleOpenConstraintModal = (stop: RouteStop, index: number) => {
      setEditingStop({ ...stop });
      setEditingStopIndex(index);
  }
  
  const handleConstraintChange = (field: keyof RouteStop, value: boolean | string | undefined) => {
      if (!editingStop) return;
      
      if (field === 'deliveryWindowEnd' && value === '') {
          const newStop = { ...editingStop };
          delete newStop.deliveryWindowEnd;
          setEditingStop(newStop);
      } else {
          setEditingStop({ ...editingStop, [field]: value });
      }
  };

  const handleSaveConstraints = () => {
    if (editingStop === null || editingStopIndex === null) return;
    const newDeliveryStops = [...deliveryStops];
    newDeliveryStops[editingStopIndex] = editingStop;
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
    setEditingStop(null);
    setEditingStopIndex(null);
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
    const newDeliveryStops = [...deliveryStops];
    const [removed] = newDeliveryStops.splice(draggedItemIndex.current, 1);
    newDeliveryStops.splice(index, 0, removed);
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
    
    draggedItemIndex.current = null;
    setDraggedOverIndex(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newDeliveryStops = [...deliveryStops];
    const item = newDeliveryStops[index];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newDeliveryStops.length) {
      return; 
    }

    newDeliveryStops.splice(index, 1);
    newDeliveryStops.splice(newIndex, 0, item);
    
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
  };

  const handleDeleteRequest = (index: number) => {
    setStopToDeleteIndex(index);
  };

  const handleConfirmDelete = () => {
    if (stopToDeleteIndex === null) return;
    
    const newDeliveryStops = deliveryStops.filter((_, i) => i !== stopToDeleteIndex);
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
    setStopToDeleteIndex(null);
  };

  const handleCancelDelete = () => {
    setStopToDeleteIndex(null);
  };

  const handleResetOrder = () => {
    const sortedDeliveryStops = [...deliveryStops].sort((a, b) => a.originalStopNumber - b.originalStopNumber);
    const newRoute = locationStop ? [locationStop, ...sortedDeliveryStops] : sortedDeliveryStops;
    onRouteUpdate(newRoute);
  };
  
  const handleGoogleMapsClick = () => {
    if (googleMapsLinks.length === 1) {
      window.open(googleMapsLinks[0].url, '_blank', 'noopener,noreferrer');
    } else if (googleMapsLinks.length > 1) {
      setIsMapsModalOpen(true);
    }
  };

  return (
    <div className="mt-6 bg-gray-800 rounded-lg p-4 shadow-lg animate-fade-in flex flex-col flex-grow">
      <div className="mb-4 bg-gray-900/50 rounded-lg p-3">
          <h2 className="text-xl font-bold text-cyan-400 text-center mb-3">Optimize Your Route</h2>
          
          <div className="flex items-center justify-between bg-gray-800 p-2 rounded-md mb-2">
              <label htmlFor="useLocationToggle" className="flex items-center flex-grow text-sm font-medium text-gray-200">
                <MyLocationIcon className="w-5 h-5 mr-2 text-blue-400"/> Start from my location
              </label>
              <button
                id="useLocationToggle"
                role="switch"
                aria-checked={useLocation}
                onClick={() => setUseLocation(!useLocation)}
                className={`${useLocation ? 'bg-blue-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500`}
              ><span className={`${useLocation ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} /></button>
          </div>
          
           <div className="flex items-center justify-between bg-gray-800 p-2 rounded-md mb-3">
              <label htmlFor="avoidLeftTurnsToggle" className="flex items-center flex-grow text-sm font-medium text-gray-200">
                <NoLeftTurnIcon className="w-5 h-5 mr-2 text-yellow-400"/> Prefer fewer left turns
              </label>
              <button
                id="avoidLeftTurnsToggle"
                role="switch"
                aria-checked={avoidLeftTurns}
                onClick={() => setAvoidLeftTurns(!avoidLeftTurns)}
                className={`${avoidLeftTurns ? 'bg-yellow-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-yellow-500`}
              ><span className={`${avoidLeftTurns ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} /></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <button
                onClick={() => onAiOptimize(useLocation, avoidLeftTurns)}
                disabled={isOptimizing}
                className="col-span-2 flex items-center justify-center px-3 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                aria-label="Optimize route with AI"
              >
                <SparklesIcon className={`w-5 h-5 mr-2 ${isOptimizing ? 'animate-pulse' : ''}`} />
                {isOptimizing ? 'Optimizing...' : 'AI Optimize Route'}
              </button>
              <button
                onClick={handleResetOrder}
                disabled={isOptimizing}
                className="col-span-2 flex items-center justify-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
                aria-label="Reset to original order"
              >
                <SortIcon className="w-5 h-5 mr-2" />
                Reset to Original Order
              </button>
          </div>
      </div>
      
       <div 
        className="space-y-3 overflow-y-auto pr-2 flex-grow"
        onDragOver={handleDragOver}
      >
        {locationStop && <LocationStopDisplay stop={locationStop} />}

        {deliveryStops.map((stop, index) => (
          <div
            key={`${stop.originalStopNumber}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            className={`relative flex items-start bg-gray-700/50 p-3 rounded-md transition-all duration-200 ease-in-out ${draggedItemIndex.current === index ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center self-start pt-1">
              <div className="flex flex-col mr-1">
                  <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      aria-label={`Move stop up`}
                  >
                      <ArrowUpIcon className="w-4 h-4" />
                  </button>
                  <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === deliveryStops.length - 1}
                      className="p-0.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                      aria-label={`Move stop down`}
                  >
                      <ArrowDownIcon className="w-4 h-4" />
                  </button>
              </div>
              <DragHandleIcon className="w-6 h-6 text-gray-500 cursor-grab active:cursor-grabbing" />
            </div>
            <div className="flex-grow ml-3">
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-gray-400">Original: #{stop.originalStopNumber}</span>
                    <span className="font-bold text-cyan-400 text-sm">New: #{index + (locationStop ? 2 : 1)}</span>
                </div>
              <p className="font-semibold text-gray-100">{stop.street}</p>
              <p className="text-sm text-gray-400">{`${stop.city}, ${stop.state} ${stop.zip}`}</p>
              
              <div className="mt-3 flex items-center space-x-3 flex-wrap gap-y-2">
                {stop.isPriority && (
                    <div className="flex items-center text-yellow-300 bg-yellow-900/50 px-2 py-1 rounded-md" title="Priority Delivery">
                        <PriorityIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-bold uppercase">Priority</span>
                    </div>
                )}
                 {stop.deliveryWindowEnd && (
                     <div className="flex items-center text-red-400 bg-red-900/50 px-2 py-1 rounded-md" title={`Deliver by ${formatTimeToAMPM(stop.deliveryWindowEnd)}`}>
                        <ClockIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">by {formatTimeToAMPM(stop.deliveryWindowEnd)}</span>
                    </div>
                )}
                 <div className="flex items-center text-gray-300 bg-gray-800 px-2 py-1 rounded-md" title={`Stop Type: ${stop.stopType}`}>
                    {getStopTypeIcon(stop.stopType)}
                    <span className="text-xs font-medium">{stop.stopType}</span>
                </div>
                 <button onClick={() => handleOpenConstraintModal(stop, index)} className="flex items-center text-xs text-cyan-400 hover:text-cyan-300 font-semibold py-1 px-2 bg-cyan-900/50 hover:bg-cyan-900 rounded-md transition-colors">
                    <TimeConstraintIcon className="w-4 h-4 mr-1"/>
                    Edit Details
                </button>
              </div>

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
                          onChange={(e) => handleFieldChange(index, 'packageType', e.target.value as PackageType)}
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
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Route Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
             <SummaryItem
                icon={<HashtagIcon className="w-6 h-6" />}
                label="Block Code"
                value={summary?.routeBlockCode ?? 'N/A'}
                isLoading={isSummaryLoading && !summary?.routeBlockCode}
            />
            <SummaryItem
                icon={<LocationPinIcon className="w-6 h-6" />}
                label="Stops"
                value={summary?.totalStops ?? 0}
                isLoading={isSummaryLoading}
            />
            <SummaryItem
                icon={<RoadIcon className="w-6 h-6" />}
                label="Distance"
                value={summary?.totalDistance ?? '...'}
                isLoading={isSummaryLoading}
            />
            <SummaryItem
                icon={<ClockIcon className="w-6 h-6" />}
                label="Time"
                value={summary?.totalTime ?? '...'}
                isLoading={isSummaryLoading}
            />
        </div>
      </div>

       <div className="mt-4 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Live Traffic</h3>
        <div className="space-y-3">
             {isTrafficLoading ? (
                <div className="p-3 bg-gray-700/50 rounded-lg animate-pulse h-20" />
            ) : trafficInfo && (
                <div className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-start">
                        <TrafficIcon className={`w-6 h-6 mr-3 flex-shrink-0 ${getTrafficColor(trafficInfo.status)}`} />
                        <div className="flex-grow">
                            <div className="flex justify-between items-center">
                                <p className={`font-bold ${getTrafficColor(trafficInfo.status)}`}>{trafficInfo.status} Traffic</p>
                                <p className="text-xs text-gray-500">As of {trafficInfo.lastUpdated}</p>
                            </div>
                            <p className="text-sm text-gray-300 mt-1">{trafficInfo.summary}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleGoogleMapsClick}
          className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          <GoogleMapsIcon className="w-6 h-6 mr-2" />
          Open in Google Maps
        </button>
      </div>
      
      {stopToDeleteIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" aria-labelledby="delete-modal-title">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
             <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <WarningIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-bold text-white" id="delete-modal-title">Confirm Deletion</h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          Are you sure you want to delete stop #{stopToDeleteIndex + (locationStop ? 2 : 1)} ({deliveryStops[stopToDeleteIndex].street})? This action cannot be undone.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={handleCancelDelete} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">Cancel</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
      
      {isMapsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" aria-labelledby="maps-modal-title">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white" id="maps-modal-title">Split Route for Google Maps</h3>
              <button onClick={() => setIsMapsModalOpen(false)} aria-label="Close modal" className="p-1 text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <p className="text-sm text-gray-300 mt-2 mb-4">Your route is too long for a single link. Use the buttons below to open it in chunks.</p>
            <div className="space-y-3">
              {googleMapsLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                  <LinkIcon className="w-5 h-5 mr-2" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {editingStop && (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" aria-labelledby="constraint-modal-title">
             <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white" id="constraint-modal-title">Edit Stop Details</h3>
                    <button onClick={() => setEditingStop(null)} aria-label="Close modal" className="p-1 text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                 </div>
                 <p className="text-sm text-gray-400 mt-1">For stop #{editingStopIndex !== null ? editingStopIndex + (locationStop ? 2: 1) : ''}</p>
                 <div className="mt-4 space-y-4">
                    <label htmlFor="isPriorityToggle" className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center text-gray-200">
                          <PriorityIcon className="w-5 h-5 mr-2 text-yellow-400" />
                          Priority Delivery
                        </span>
                        <button
                            id="isPriorityToggle"
                            role="switch"
                            aria-checked={!!editingStop.isPriority}
                            onClick={() => handleConstraintChange('isPriority', !editingStop.isPriority)}
                            className={`${editingStop.isPriority ? 'bg-yellow-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                        ><span className={`${editingStop.isPriority ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} /></button>
                    </label>

                    <div className="space-y-1">
                        <label htmlFor="stopType" className="flex items-center text-gray-200 mb-1">
                             <ApartmentIcon className="w-5 h-5 mr-2 text-gray-400"/>
                             Stop Type
                        </label>
                         <select
                            id="stopType"
                            value={editingStop.stopType}
                            onChange={(e) => handleConstraintChange('stopType', e.target.value as StopType)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
                         >
                          {stopTypes.map(st => <option key={st} value={st}>{st}</option>)}
                         </select>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="deliveryTime" className="flex items-center text-gray-200">
                             <ClockIcon className="w-5 h-5 mr-2 text-red-400"/>
                             Deliver By
                        </label>
                         <input
                            id="deliveryTime"
                            type="time"
                            value={editingStop.deliveryWindowEnd || ''}
                            onChange={(e) => handleConstraintChange('deliveryWindowEnd', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
                         />
                    </div>
                 </div>
                 <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setEditingStop(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-200 font-semibold rounded-md transition-colors">Cancel</button>
                    <button onClick={handleSaveConstraints} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md transition-colors">Save Details</button>
                 </div>
             </div>
         </div>
      )}

    </div>
  );
};
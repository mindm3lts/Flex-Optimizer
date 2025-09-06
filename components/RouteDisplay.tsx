import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, Modal, Switch, Platform } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import type { RouteStop, PackageType, RouteSummary, TrafficInfo, TrafficStatus } from '../types';
import { GoogleMapsIcon, AppleMapsIcon, DragHandleIcon, TrashIcon, BoxIcon, EnvelopeIcon, PackageIcon, SortIcon, WarningIcon, SparklesIcon, LocationPinIcon, ClockIcon, RoadIcon, HashtagIcon, TrafficIcon, CloseIcon, LinkIcon, MyLocationIcon } from './icons';
import { styled } from 'nativewind';
import { Picker } from '@react-native-picker/picker';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);


interface RouteDisplayProps {
  route: RouteStop[];
  summary: RouteSummary | null;
  trafficInfo: TrafficInfo | null;
  isSummaryLoading: boolean;
  isTrafficLoading: boolean;
  onRouteUpdate: (newRoute: RouteStop[]) => void;
  onAiOptimize: (useLocation: boolean) => Promise<void>;
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

const getTrafficColor = (status: TrafficStatus) => {
  switch (status) {
    case 'Light': return 'text-green-400';
    case 'Moderate': return 'text-yellow-400';
    case 'Heavy': return 'text-red-400';
    default: return 'text-gray-500';
  }
};

const GOOGLE_MAPS_WAYPOINT_LIMIT = 10; // Mobile URLs are more limited

interface GoogleMapsLink {
  label: string;
  url: string;
}

const generateGoogleMapsLinks = (stops: RouteStop[]): GoogleMapsLink[] => {
  const deliveryStops = stops.filter(s => s.type !== 'location');
  if (deliveryStops.length === 0) return [];

  const createUrl = (chunk: RouteStop[]) => {
    const encodedAddresses = chunk.map(stop => encodeURIComponent(`${stop.street}, ${stop.city}, ${stop.state} ${stop.zip}`));
    if (chunk.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddresses[0]}`;
    }
    const origin = encodedAddresses[0];
    const destination = encodedAddresses[encodedAddresses.length - 1];
    const waypoints = encodedAddresses.slice(1, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
  };

  if (deliveryStops.length <= GOOGLE_MAPS_WAYPOINT_LIMIT) {
     return [{ label: 'Open in Google Maps', url: createUrl(deliveryStops) }];
  }
  
  const links: GoogleMapsLink[] = [];
  for (let i = 0; i < deliveryStops.length; i += GOOGLE_MAPS_WAYPOINT_LIMIT) {
    const chunk = deliveryStops.slice(i, i + GOOGLE_MAPS_WAYPOINT_LIMIT);
    const url = createUrl(chunk);
    const label = `Open Route (Stops ${i + 1} - ${i + chunk.length})`;
    links.push({ label, url });
  }
  return links;
};

const generateAppleMapsUrl = (stops: RouteStop[]): string => {
  const firstStop = stops.find(s => s.type !== 'location');
  if (!firstStop) return '#';
  const firstStopEncoded = encodeURIComponent(`${firstStop.street}, ${firstStop.city}, ${firstStop.state} ${firstStop.zip}`);
  return `http://maps.apple.com/?daddr=${firstStopEncoded}`;
};

const SummaryItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number; isLoading: boolean }> = ({ icon, label, value, isLoading }) => (
  <StyledView className="flex-1 flex-col items-center justify-center p-2 bg-gray-700/50 rounded-lg text-center h-full min-h-[80px]">
    {isLoading ? (
      <>
        <StyledView className="w-6 h-6 bg-gray-600 rounded-full"></StyledView>
        <StyledView className="h-4 w-16 bg-gray-600 rounded mt-2"></StyledView>
        <StyledView className="h-3 w-12 bg-gray-600 rounded mt-1"></StyledView>
      </>
    ) : (
      <>
        <StyledView className="text-cyan-400">{icon}</StyledView>
        <StyledText className="mt-1 text-lg font-bold text-white">{value}</StyledText>
        <StyledText className="text-xs text-gray-400">{label}</StyledText>
      </>
    )}
  </StyledView>
);

const LocationStopDisplay: React.FC<{ stop: RouteStop }> = ({ stop }) => (
  <StyledView className="relative flex-row items-start bg-blue-900/50 border border-blue-700 p-3 rounded-md mb-3">
    <MyLocationIcon className="w-6 h-6 text-blue-400 mr-3 mt-1 shrink-0" />
    <StyledView className="flex-1">
      <StyledView className="flex-row justify-between items-center mb-1">
        <StyledText className="font-bold text-blue-300 text-sm">START: #{1}</StyledText>
      </StyledView>
      <StyledText className="font-semibold text-gray-100">{stop.street}</StyledText>
      <StyledText className="text-sm text-gray-400">{stop.city}</StyledText>
    </StyledView>
  </StyledView>
);


export const RouteDisplay: React.FC<RouteDisplayProps> = ({ route, summary, trafficInfo, isSummaryLoading, isTrafficLoading, onRouteUpdate, onAiOptimize, isOptimizing }) => {
  const googleMapsLinks = useMemo(() => generateGoogleMapsLinks(route), [route]);
  const appleMapsUrl = useMemo(() => generateAppleMapsUrl(route), [route]);

  const [stopToDelete, setStopToDelete] = useState<RouteStop | null>(null);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [useLocation, setUseLocation] = useState(false);

  const locationStop = useMemo(() => route.find(s => s.type === 'location'), [route]);
  const deliveryStops = useMemo(() => route.filter(s => s.type !== 'location'), [route]);

  const handleFieldChange = (originalStopNum: number, field: keyof RouteStop, value: string) => {
    const newDeliveryStops = deliveryStops.map(s => {
      if (s.originalStopNumber === originalStopNum) {
        return { ...s, [field]: value };
      }
      return s;
    });
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
  };
  
  const handleDragEnd = ({ data }: { data: RouteStop[] }) => {
    const newRoute = locationStop ? [locationStop, ...data] : data;
    onRouteUpdate(newRoute);
  };

  const handleDeleteRequest = (stop: RouteStop) => {
    setStopToDelete(stop);
  };

  const handleConfirmDelete = () => {
    if (!stopToDelete) return;
    const newDeliveryStops = deliveryStops.filter(s => s.originalStopNumber !== stopToDelete.originalStopNumber);
    const newRoute = locationStop ? [locationStop, ...newDeliveryStops] : newDeliveryStops;
    onRouteUpdate(newRoute);
    setStopToDelete(null);
  };

  const handleResetOrder = () => {
    const sortedDeliveryStops = [...deliveryStops].sort((a, b) => a.originalStopNumber - b.originalStopNumber);
    const newRoute = locationStop ? [locationStop, ...sortedDeliveryStops] : sortedDeliveryStops;
    onRouteUpdate(newRoute);
  };
  
  const handleGoogleMapsClick = () => {
    if (googleMapsLinks.length === 1) {
      Linking.openURL(googleMapsLinks[0].url);
    } else if (googleMapsLinks.length > 1) {
      setIsMapsModalOpen(true);
    }
  };
  
  const renderStop = useCallback(({ item: stop, drag, isActive }: RenderItemParams<RouteStop>) => {
    const index = deliveryStops.findIndex(s => s.originalStopNumber === stop.originalStopNumber);
    return (
     <ScaleDecorator>
      <StyledTouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        className={`flex-row items-start bg-gray-700/50 p-3 rounded-md mb-3 ${isActive ? 'shadow-xl bg-gray-600' : ''}`}
      >
        <DragHandleIcon className="w-6 h-6 text-gray-500 mr-3 mt-1 shrink-0" />
        <StyledView className="flex-1">
            <StyledView className="flex-row justify-between items-center mb-2">
                <StyledText className="text-xs font-mono text-gray-400">Original: #{stop.originalStopNumber}</StyledText>
                <StyledText className="text-sm font-bold text-cyan-400">New: #{index + (locationStop ? 2 : 1)}</StyledText>
            </StyledView>
          <StyledText className="font-semibold text-gray-100">{stop.street}</StyledText>
          <StyledText className="text-sm text-gray-400">{`${stop.city}, ${stop.state} ${stop.zip}`}</StyledText>
          
          <StyledTextInput
            value={stop.label}
            onChangeText={(value) => handleFieldChange(stop.originalStopNumber, 'label', value)}
            placeholder="Add a delivery note..."
            placeholderTextColor="#6b7280"
            multiline
            className="mt-3 w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-gray-200 h-16"
          />

          <StyledView className="mt-3 pt-3 border-t border-gray-600/50">
            <StyledText className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Package Details</StyledText>
            <StyledView className="space-y-2">
               <StyledView className="flex-row items-center space-x-2 bg-gray-800 border border-gray-600 rounded-md px-2 h-10">
                  {getPackageIcon(stop.packageType)}
                  <Picker
                      selectedValue={stop.packageType}
                      onValueChange={(value) => handleFieldChange(stop.originalStopNumber, 'packageType', value as string)}
                      style={{ flex: 1, color: 'white' }}
                      dropdownIconColor="white"
                  >
                      {packageTypes.map(pt => <Picker.Item key={pt} label={pt} value={pt}/>)}
                  </Picker>
              </StyledView>
               <StyledTextInput
                value={stop.packageLabel}
                onChangeText={(value) => handleFieldChange(stop.originalStopNumber, 'packageLabel', value)}
                placeholder="Package Label (A.1Z)"
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-600 rounded-md px-2 py-2 text-gray-200"
              />
               <StyledTextInput
                value={stop.tba}
                onChangeText={(value) => handleFieldChange(stop.originalStopNumber, 'tba', value)}
                placeholder="TBA..."
                placeholderTextColor="#6b7280"
                className="bg-gray-800 border border-gray-600 rounded-md px-2 py-2 text-gray-200"
              />
            </StyledView>
          </StyledView>
        </StyledView>
        <StyledTouchableOpacity
          onPress={() => handleDeleteRequest(stop)}
          className="ml-2 p-1 shrink-0"
        >
          <TrashIcon className="w-5 h-5 text-gray-400" />
        </StyledTouchableOpacity>
      </StyledTouchableOpacity>
      </ScaleDecorator>
    );
  }, [deliveryStops, locationStop]);

  return (
    <StyledView className="mt-6 bg-gray-800 rounded-lg p-4 shadow-lg flex-1">
       <StyledView className="mb-4 bg-gray-900/50 rounded-lg p-3">
          <StyledText className="text-xl font-bold text-cyan-400 text-center mb-3">Optimize Your Route</StyledText>
          <StyledView className="flex-row items-center justify-between bg-gray-800 p-2 rounded-md mb-3">
              <StyledText className="flex-1 text-sm font-medium text-gray-200">
                Start from my location
              </StyledText>
              <Switch
                trackColor={{ false: "#4b5563", true: "#2563eb" }}
                thumbColor={useLocation ? "#f4f4f5" : "#f4f4f5"}
                onValueChange={setUseLocation}
                value={useLocation}
              />
          </StyledView>

          <StyledView className="space-y-2">
             <StyledTouchableOpacity
                onPress={() => onAiOptimize(useLocation)}
                disabled={isOptimizing}
                className="flex-row items-center justify-center px-3 py-3 bg-purple-600 active:bg-purple-700 rounded-md disabled:bg-gray-600"
              >
                <SparklesIcon className={`w-5 h-5 mr-2 text-white ${isOptimizing ? 'opacity-50' : ''}`} />
                <StyledText className="text-white text-sm font-semibold">{isOptimizing ? 'Optimizing...' : 'AI Optimize Route'}</StyledText>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                onPress={handleResetOrder}
                disabled={isOptimizing}
                className="flex-row items-center justify-center px-3 py-2 bg-gray-600 active:bg-gray-700 rounded-md disabled:opacity-50"
              >
                <SortIcon className="w-5 h-5 mr-2 text-gray-200" />
                <StyledText className="text-gray-200 text-sm font-semibold">Reset to Original Order</StyledText>
              </StyledTouchableOpacity>
          </StyledView>
      </StyledView>
      
      <DraggableFlatList
        data={deliveryStops}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.originalStopNumber.toString()}
        renderItem={renderStop}
        ListHeaderComponent={locationStop ? <LocationStopDisplay stop={locationStop} /> : null}
      />
      
      <StyledView className="mt-auto pt-4 border-t border-gray-700">
          <StyledView className="mt-2 pt-4 border-t border-gray-700">
            <StyledText className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Route Summary</StyledText>
            <StyledView className="flex-row gap-3">
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
            </StyledView>
          </StyledView>
          
          <StyledView className="mt-4 pt-4 border-t border-gray-700">
            <StyledText className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Live Traffic</StyledText>
              {isTrafficLoading && !trafficInfo ? (
                <StyledView className="p-3 bg-gray-700/50 rounded-lg h-20" />
              ) : trafficInfo && (
                 <StyledView className="p-3 bg-gray-700/50 rounded-lg">
                    <StyledView className="flex-row items-start">
                        <TrafficIcon className={`w-6 h-6 mr-3 shrink-0 ${getTrafficColor(trafficInfo.status)}`} />
                        <StyledView className="flex-1">
                            <StyledView className="flex-row justify-between items-center">
                                <StyledText className={`font-bold ${getTrafficColor(trafficInfo.status)}`}>
                                    {trafficInfo.status} Traffic
                                </StyledText>
                                <StyledText className="text-xs text-gray-500">
                                    As of {trafficInfo.lastUpdated}
                                </StyledText>
                            </StyledView>
                            <StyledText className="text-sm text-gray-300 mt-1">{trafficInfo.summary}</StyledText>
                        </StyledView>
                    </StyledView>
                </StyledView>
              )}
          </StyledView>


          <StyledView className="mt-6 space-y-3">
            <StyledTouchableOpacity
              onPress={handleGoogleMapsClick}
              className="w-full flex-row items-center justify-center bg-blue-600 active:bg-blue-700 py-3 px-4 rounded-lg shadow-lg"
            >
              <GoogleMapsIcon className="w-6 h-6 mr-2 text-white" />
              <StyledText className="text-white font-bold">Open in Google Maps</StyledText>
            </StyledTouchableOpacity>
            <StyledTouchableOpacity
              onPress={() => Linking.openURL(appleMapsUrl)}
              className="w-full flex-row items-center justify-center bg-gray-200 active:bg-gray-300 py-3 px-4 rounded-lg shadow-lg"
            >
              <AppleMapsIcon className="w-6 h-6 mr-2 text-black" />
              <StyledText className="text-black font-bold">Navigate to First Stop (Apple Maps)</StyledText>
            </StyledTouchableOpacity>
          </StyledView>
      </StyledView>
      
       <Modal
          animationType="fade"
          transparent={true}
          visible={stopToDelete !== null}
          onRequestClose={() => setStopToDelete(null)}
        >
          <StyledView className="flex-1 items-center justify-center bg-black/75">
            <StyledView className="bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm">
                <StyledView className="sm:flex-row sm:items-start">
                    <StyledView className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <WarningIcon className="h-6 w-6 text-red-400" />
                    </StyledView>
                    <StyledView className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <StyledText className="text-lg font-bold text-white">Confirm Deletion</StyledText>
                        <StyledView className="mt-2">
                            <StyledText className="text-sm text-gray-300">
                              Are you sure you want to delete this stop ({stopToDelete?.street})? This action cannot be undone.
                            </StyledText>
                        </StyledView>
                    </StyledView>
                </StyledView>
                <StyledView className="mt-6 flex-row justify-end space-x-3">
                  <StyledTouchableOpacity onPress={() => setStopToDelete(null)} className="px-4 py-2 bg-gray-600 active:bg-gray-700 rounded-md">
                    <StyledText className="text-gray-200 font-semibold">Cancel</StyledText>
                  </StyledTouchableOpacity>
                  <StyledTouchableOpacity onPress={handleConfirmDelete} className="px-4 py-2 bg-red-600 active:bg-red-700 rounded-md">
                    <StyledText className="text-white font-semibold">Delete</StyledText>
                  </StyledTouchableOpacity>
                </StyledView>
            </StyledView>
          </StyledView>
        </Modal>
      
      <Modal
          animationType="fade"
          transparent={true}
          visible={isMapsModalOpen}
          onRequestClose={() => setIsMapsModalOpen(false)}
        >
            <StyledView className="flex-1 items-center justify-center bg-black/75">
                <StyledView className="bg-gray-800 rounded-lg shadow-xl p-6 w-11/12 max-w-sm">
                    <StyledView className="flex-row justify-between items-center">
                        <StyledText className="text-lg font-bold text-white">Split Route for Google Maps</StyledText>
                        <StyledTouchableOpacity onPress={() => setIsMapsModalOpen(false)} className="p-1">
                            <CloseIcon className="w-6 h-6 text-gray-400" />
                        </StyledTouchableOpacity>
                    </StyledView>
                    <StyledText className="text-sm text-gray-300 mt-2 mb-4">
                        Your route is too long for a single link. Use the buttons below to open it in chunks.
                    </StyledText>
                    <StyledView className="space-y-3">
                        {googleMapsLinks.map((link) => (
                            <StyledTouchableOpacity
                                key={link.label}
                                onPress={() => Linking.openURL(link.url)}
                                className="w-full flex-row items-center justify-center bg-blue-600 active:bg-blue-700 py-3 px-4 rounded-lg"
                            >
                                <LinkIcon className="w-5 h-5 mr-2 text-white" />
                                <StyledText className="font-bold text-white">{link.label}</StyledText>
                            </StyledTouchableOpacity>
                        ))}
                    </StyledView>
                </StyledView>
            </StyledView>
        </Modal>
    </StyledView>
  );
};

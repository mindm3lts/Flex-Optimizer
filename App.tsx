import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Alert, Image, Platform, AppState } from 'react-native';
import { styled } from "nativewind";
import { Header } from './components/Header';
import { RouteDisplay } from './components/RouteDisplay';
import { Spinner } from './components/Spinner';
import { processRouteScreenshot, optimizeRouteOrder, getRouteSummary, getLiveTraffic } from './services/geminiService';
import type { RouteStop, RouteSummary, TrafficInfo } from './types';
import { InfoIcon, SaveIcon, LoadIcon, AndroidIcon, CheckIcon, WarningIcon, PlusCircleIcon, UploadIcon } from './components/icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';


const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledImage = styled(Image);
const StyledScrollView = styled(ScrollView);

const App: React.FC = () => {
  const [screenshotAssets, setScreenshotAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [isTrafficLoading, setIsTrafficLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedRoute, setHasSavedRoute] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  
  useEffect(() => {
    const checkSavedRoute = async () => {
        const savedRoute = await AsyncStorage.getItem('flex-optimizer-saved-route');
        setHasSavedRoute(!!savedRoute);
    };
    checkSavedRoute();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      const deliveryStops = route?.filter(s => s.type !== 'location') ?? [];
      if (deliveryStops.length > 0) {
        setIsSummaryLoading(true);
        const existingBlockCode = summary?.routeBlockCode;
        try {
          const summaryData = await getRouteSummary(deliveryStops);
          setSummary({ ...summaryData, routeBlockCode: existingBlockCode });
        } catch (err) {
          console.error("Failed to fetch route summary:", err);
          setSummary({ totalStops: deliveryStops.length, totalDistance: "N/A", totalTime: "N/A", routeBlockCode: existingBlockCode });
        } finally {
          setIsSummaryLoading(false);
        }
      } else if (route) {
        setSummary({ totalStops: 0, totalDistance: "N/A", totalTime: "N/A", routeBlockCode: summary?.routeBlockCode });
      } else {
        setSummary(null);
      }
    };
    fetchSummary();
  }, [route]);

  useEffect(() => {
    const deliveryStops = route?.filter(s => s.type !== 'location') ?? [];
    if (deliveryStops.length === 0) {
        setTrafficInfo(null);
        return;
    }

    let intervalId: number | undefined;

    const fetchTraffic = async () => {
      setIsTrafficLoading(true);
      try {
        const trafficData = await getLiveTraffic(deliveryStops);
        setTrafficInfo(trafficData);
      } catch (err) {
        console.error("Failed to fetch live traffic:", err);
        setTrafficInfo({
            status: 'Unknown',
            summary: 'Could not fetch live traffic data.',
            lastUpdated: new Date().toLocaleTimeString()
        });
      } finally {
        setIsTrafficLoading(false);
      }
    };
    
    fetchTraffic();
    intervalId = window.setInterval(fetchTraffic, 60000); 

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [route]);


  const handleSelectImages = async (mode: 'replace' | 'append' = 'replace') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant permission to access your photo library to select screenshots.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      if (mode === 'replace') {
        setScreenshotAssets(result.assets);
      } else {
        setScreenshotAssets(prev => [...prev, ...result.assets]);
      }
      setRoute(null);
      setError(null);
    }
  };
  
  const handleReset = () => {
    setScreenshotAssets([]);
    setRoute(null);
    setError(null);
    setIsLoading(false);
  };

  const handleProcessRoute = useCallback(async () => {
    if (screenshotAssets.length === 0) {
      setError('Please select one or more screenshots first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRoute(null);
    setSummary(null);

    try {
      const allResults = await Promise.all(
        screenshotAssets.map(asset => processRouteScreenshot(asset))
      );
      
      const allStops = allResults.flatMap(res => res.stops);
      const routeBlockCode = allResults.find(res => res.routeBlockCode)?.routeBlockCode;

      const uniqueStopsMap = new Map<number, RouteStop>();
      for (const stop of allStops) {
        if (!uniqueStopsMap.has(stop.originalStopNumber)) {
          uniqueStopsMap.set(stop.originalStopNumber, stop);
        }
      }
      
      const addresses = Array.from(uniqueStopsMap.values()).map(stop => ({...stop, type: 'delivery' as const}));
      
      if (addresses && addresses.length > 0) {
        const sortedAddresses = [...addresses].sort((a, b) => a.originalStopNumber - b.originalStopNumber);
        setRoute(sortedAddresses);
        setSummary({ totalStops: sortedAddresses.length, totalDistance: "...", totalTime: "...", routeBlockCode });
      } else {
        setError('Could not extract any addresses from the images. Please try other screenshots.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [screenshotAssets]);

  const handleSaveRoute = useCallback(async () => {
    if (route) {
      try {
        await AsyncStorage.setItem('flex-optimizer-saved-route', JSON.stringify(route));
        setHasSavedRoute(true);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Failed to save route:", e);
        setError("Could not save the route to device storage.");
      }
    }
  }, [route]);

  const handleLoadRoute = useCallback(async () => {
    const savedRouteJSON = await AsyncStorage.getItem('flex-optimizer-saved-route');
    if (savedRouteJSON) {
      try {
        const savedRoute = JSON.parse(savedRouteJSON) as RouteStop[];
        if (Array.isArray(savedRoute) && savedRoute.length > 0) {
            setRoute(savedRoute);
            setScreenshotAssets([]);
            setError(null);
            setIsLoading(false);
        } else {
            throw new Error("Saved data is not a valid route.");
        }
      } catch (e) {
        console.error("Failed to parse saved route:", e);
        setError("Could not load saved route. The data might be corrupted.");
        await AsyncStorage.removeItem('flex-optimizer-saved-route');
        setHasSavedRoute(false);
      }
    }
  }, []);
  
  const handleAiOptimize = useCallback(async (useLocation: boolean) => {
    const deliveryStops = route?.filter(s => s.type !== 'location') ?? [];
    if (deliveryStops.length < 1) return;

    setIsOptimizing(true);
    setError(null);

    const performOptimization = async (location?: { lat: number, lon: number }) => {
      try {
        const optimized = await optimizeRouteOrder(deliveryStops, location);
        if (location) {
          const currentLocationStop: RouteStop = {
            originalStopNumber: 0,
            street: 'Your Current Location',
            city: 'Start of route',
            state: '',
            zip: '',
            label: '',
            packageType: 'Unknown',
            tba: '',
            packageLabel: '',
            type: 'location',
          };
          setRoute([currentLocationStop, ...optimized]);
        } else {
          setRoute(optimized);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during optimization.');
      } finally {
        setIsOptimizing(false);
      }
    };

    if (useLocation) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Please grant location permission in your device settings.');
        setIsOptimizing(false);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        performOptimization({ lat: latitude, lon: longitude });
      } catch (geoError) {
          console.error("Geolocation error:", geoError);
          setError("Could not get your location. Please check your device's location settings and try again.");
          setIsOptimizing(false);
      }
    } else {
      performOptimization();
    }
  }, [route]);

  const showNativeFeatureInfo = () => {
    Alert.alert(
      "Automatic Route Sync",
      "A future native app version will automatically import your route—no screenshots needed! This version uses Android's Accessibility Service to securely read your route directly from the Flex app."
    );
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      <StyledView className="flex-1 p-4">
        <Header />
        <StyledView className="flex-1 mt-6">
          {screenshotAssets.length === 0 && !route && (
            <>
              <StyledTouchableOpacity
                className="flex-grow items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-12 hover:border-cyan-400"
                onPress={() => handleSelectImages('replace')}
              >
                <UploadIcon className="h-12 w-12 text-gray-500" />
                <StyledText className="mt-2 text-sm font-medium text-gray-300">
                  Tap to select screenshots
                </StyledText>
              </StyledTouchableOpacity>
              
              <StyledView className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <StyledView className="flex-row items-start">
                  <InfoIcon className="w-6 h-6 text-cyan-400 mr-3 shrink-0 mt-1" />
                  <StyledView>
                    <StyledText className="font-semibold text-cyan-400">Screenshot Tips</StyledText>
                    <StyledView className="list-disc list-inside text-gray-400 text-sm mt-1 space-y-1">
                      <StyledText className="text-gray-400 text-sm">● Upload multiple screenshots for your entire block.</StyledText>
                      <StyledText className="text-gray-400 text-sm">● Ensure all stops are visible on the screen.</StyledText>
                      <StyledText className="text-gray-400 text-sm">● Text must be clear and not blurry.</StyledText>
                      <StyledText className="text-gray-400 text-sm">● Avoid any screen glare or obstructions.</StyledText>
                    </StyledView>
                     <StyledView className="mt-3 pt-3 border-t border-dashed border-gray-700 flex-row items-start text-yellow-300/80">
                        <WarningIcon className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                        <StyledText className="text-xs shrink">
                            For long routes (>20 stops), Google Maps links will be split into multiple parts.
                        </StyledText>
                    </StyledView>
                  </StyledView>
                </StyledView>
              </StyledView>

              {hasSavedRoute && (
                <StyledTouchableOpacity
                  onPress={handleLoadRoute}
                  className="mt-4 w-full flex-row items-center justify-center bg-gray-600 active:bg-gray-700 py-3 px-4 rounded-lg"
                >
                  <LoadIcon className="w-5 h-5 mr-2 text-gray-200" />
                  <StyledText className="text-gray-200 font-bold">Load Saved Route</StyledText>
                </StyledTouchableOpacity>
              )}
              
              <StyledView className="mt-4 p-4 bg-gray-800 border-2 border-dashed border-green-500/50 rounded-lg">
                <StyledView className="flex-row items-start">
                  <AndroidIcon className="w-8 h-8 text-green-400 mr-3 shrink-0 mt-1" />
                  <StyledView className="flex-1">
                    <StyledText className="font-semibold text-green-400">Coming Soon: Automatic Sync</StyledText>
                    <StyledText className="text-gray-400 text-sm mt-1">
                      A future native Android app version will automatically import your route—no screenshots needed!
                    </StyledText>
                     <StyledTouchableOpacity
                        onPress={showNativeFeatureInfo}
                        className="mt-3 w-full flex-row items-center justify-center bg-green-600/50 py-2 px-4 rounded-lg"
                      >
                        <InfoIcon className="w-5 h-5 mr-2 text-green-200" />
                        <StyledText className="text-green-200 font-bold">Learn More</StyledText>
                      </StyledTouchableOpacity>
                  </StyledView>
                </StyledView>
              </StyledView>
            </>
          )}

          {screenshotAssets.length > 0 && !route && (
             <StyledView className="bg-gray-800 rounded-lg p-4 shadow-lg">
                <StyledText className="text-lg font-semibold text-cyan-400 mb-3 text-center">
                  {screenshotAssets.length} Screenshot{screenshotAssets.length > 1 ? 's' : ''} Selected
                </StyledText>
                <StyledScrollView className="max-h-80" contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {screenshotAssets.map((asset, index) => (
                    <StyledImage key={index} source={{ uri: asset.uri }} className="rounded-md w-24 h-40 object-cover m-1" />
                  ))}
                </StyledScrollView>
                <StyledTouchableOpacity
                  onPress={() => handleSelectImages('append')}
                  className="mt-4 w-full flex-row items-center justify-center bg-gray-600 active:bg-gray-700 py-3 px-4 rounded-lg"
                >
                  <PlusCircleIcon className="w-5 h-5 mr-2 text-gray-200" />
                  <StyledText className="text-gray-200 font-bold">Add More Screenshots</StyledText>
                </StyledTouchableOpacity>
              </StyledView>
          )}

          {isLoading && <Spinner />}

          {error && (
            <StyledView className="bg-red-900/50 border border-red-700 px-4 py-3 rounded-lg mt-6">
              <StyledText className="text-red-300"><StyledText className="font-bold">Error: </StyledText>{error}</StyledText>
            </StyledView>
          )}

          {route && !isLoading && (
            <RouteDisplay
              route={route}
              summary={summary}
              trafficInfo={trafficInfo}
              isSummaryLoading={isSummaryLoading}
              isTrafficLoading={isTrafficLoading}
              onRouteUpdate={setRoute}
              onAiOptimize={handleAiOptimize}
              isOptimizing={isOptimizing}
            />
          )}

          <StyledView className="mt-auto pt-6 space-y-3">
              {screenshotAssets.length > 0 && !isLoading && !route && (
                  <StyledTouchableOpacity
                    onPress={handleProcessRoute}
                    disabled={isLoading}
                    className="w-full bg-cyan-500 active:bg-cyan-600 py-3 px-4 rounded-lg shadow-lg flex-row items-center justify-center disabled:bg-gray-600"
                  >
                    <StyledText className="text-white font-bold">Process Route</StyledText>
                  </StyledTouchableOpacity>
              )}
              
              {route && !isLoading && (
                <StyledTouchableOpacity
                  onPress={handleSaveRoute}
                  disabled={saveStatus === 'saved'}
                  className={`w-full font-bold py-3 px-4 rounded-lg shadow-lg flex-row items-center justify-center ${
                    saveStatus === 'saved' 
                      ? 'bg-green-700' 
                      : 'bg-green-600 active:bg-green-700'
                  }`}
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckIcon className="w-6 h-6 mr-2 text-white" />
                      <StyledText className="text-white font-bold">Route Saved!</StyledText>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-5 h-5 mr-2 text-white" />
                      <StyledText className="text-white font-bold">Save Optimized Route</StyledText>
                    </>
                  )}
                </StyledTouchableOpacity>
              )}

              {(screenshotAssets.length > 0 || route) && (
                <StyledTouchableOpacity
                  onPress={handleReset}
                  className="w-full bg-gray-600 active:bg-gray-700 py-3 px-4 rounded-lg"
                >
                  <StyledText className="text-gray-200 font-bold text-center">Start Over</StyledText>
                </StyledTouchableOpacity>
              )}
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
};

export default App;

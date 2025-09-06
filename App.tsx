import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { RouteDisplay } from './components/RouteDisplay';
import { Spinner } from './components/Spinner';
import { processRouteScreenshot, optimizeRouteOrder, getRouteSummary, getLiveTraffic } from './services/geminiService';
import type { RouteStop, RouteSummary, TrafficInfo } from './types';
import { InfoIcon, SaveIcon, LoadIcon, AndroidIcon, CheckIcon, WarningIcon, PlusCircleIcon } from './components/icons';

const App: React.FC = () => {
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
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
  
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedRoute = localStorage.getItem('flex-optimizer-saved-route');
    setHasSavedRoute(!!savedRoute);
  }, []);
  
  // Clean up preview URLs when component unmounts or previews change
  useEffect(() => {
    return () => {
      screenshotPreviews.forEach(URL.revokeObjectURL);
    };
  }, [screenshotPreviews]);

  // Effect to fetch route summary whenever the route changes
  useEffect(() => {
    const fetchSummary = async () => {
      // Filter out the location stop before sending to summary service
      const deliveryStops = route?.filter(s => s.type !== 'location') ?? [];
      if (deliveryStops.length > 0) {
        setIsSummaryLoading(true);
        // Preserve existing block code while fetching new summary
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
      } else if (route) { // Case where only location stop exists
        setSummary({ totalStops: 0, totalDistance: "N/A", totalTime: "N/A", routeBlockCode: summary?.routeBlockCode });
      }
      else {
        setSummary(null);
      }
    };

    fetchSummary();
  }, [route]);

  // Effect to fetch and poll for live traffic data
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


  const handleFileChange = (files: File[], mode: 'replace' | 'append' = 'replace') => {
    if (files.length === 0) return;

    if (mode === 'replace') {
        screenshotPreviews.forEach(URL.revokeObjectURL); // clean up old ones
        setScreenshotFiles(files);
        setScreenshotPreviews(files.map(file => URL.createObjectURL(file)));
    } else { // append
        setScreenshotFiles(prev => [...prev, ...files]);
        setScreenshotPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    }

    setRoute(null);
    setError(null);
  };
  
  const handleAddMoreClick = () => {
    addMoreInputRef.current?.click();
  };

  const handleAddMoreFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileChange(Array.from(files), 'append');
    }
    if (addMoreInputRef.current) {
      addMoreInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    screenshotPreviews.forEach(URL.revokeObjectURL);
    setScreenshotFiles([]);
    setScreenshotPreviews([]);
    setRoute(null);
    setError(null);
    setIsLoading(false);
  };

  const handleProcessRoute = useCallback(async () => {
    if (screenshotFiles.length === 0) {
      setError('Please upload one or more screenshots first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRoute(null);
    setSummary(null);

    try {
      const allResults = await Promise.all(
        screenshotFiles.map(file => processRouteScreenshot(file))
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
  }, [screenshotFiles]);

  const handleSaveRoute = useCallback(() => {
    if (route) {
      try {
        localStorage.setItem('flex-optimizer-saved-route', JSON.stringify(route));
        setHasSavedRoute(true);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Failed to save route:", e);
        setError("Could not save the route to local storage. It might be full.");
      }
    }
  }, [route]);

  const handleLoadRoute = useCallback(() => {
    const savedRouteJSON = localStorage.getItem('flex-optimizer-saved-route');
    if (savedRouteJSON) {
      try {
        const savedRoute = JSON.parse(savedRouteJSON) as RouteStop[];
        if (Array.isArray(savedRoute) && savedRoute.length > 0) {
            setRoute(savedRoute);
            setScreenshotFiles([]);
            setScreenshotPreviews([]);
            setError(null);
            setIsLoading(false);
        } else {
            throw new Error("Saved data is not a valid route.");
        }
      } catch (e) {
        console.error("Failed to parse saved route:", e);
        setError("Could not load saved route. The data might be corrupted.");
        localStorage.removeItem('flex-optimizer-saved-route');
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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          performOptimization({ lat: latitude, lon: longitude });
        },
        (geoError) => {
          console.error("Geolocation error:", geoError);
          let errorMessage = "Could not get your location. ";
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage += "Please grant location permission and try again.";
              break;
            default:
              errorMessage += "Please check your device's location settings.";
              break;
          }
          setError(errorMessage);
          setIsOptimizing(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      performOptimization();
    }
  }, [route]);

  const showNativeFeatureInfo = () => {
    alert(
      "Automatic Route Sync\n\n" +
      "This feature requires our native Android app.\n\n" +
      "The native app uses Android's Accessibility Service to securely read your route directly from the Flex app, eliminating the need for screenshots. This feature is not possible in a web app for security reasons."
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans flex flex-col items-center">
      <div className="w-full max-w-md mx-auto p-4 flex flex-col flex-grow">
        <Header />
        <main className="flex-grow flex flex-col mt-6">
          {screenshotPreviews.length === 0 && !route && (
            <>
              <FileUpload onFileChange={handleFileChange} />
              
              <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-start">
                  <InfoIcon className="w-6 h-6 text-cyan-400 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-cyan-400">Screenshot Tips</h3>
                    <ul className="list-disc list-inside text-gray-400 text-sm mt-1 space-y-1">
                      <li>Upload multiple screenshots for your entire block.</li>
                      <li>Ensure all stops are visible on the screen.</li>
                      <li>Text must be clear and not blurry.</li>
                      <li>Avoid any screen glare or obstructions.</li>
                    </ul>
                     <div className="mt-3 pt-3 border-t border-dashed border-gray-700 flex items-start text-yellow-300/80">
                        <WarningIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">
                            For long routes (>20 stops), Google Maps links will be split into multiple parts.
                        </p>
                    </div>
                  </div>
                </div>
              </div>

              {hasSavedRoute && (
                <button
                  onClick={handleLoadRoute}
                  className="mt-4 w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  <LoadIcon className="w-5 h-5 mr-2" />
                  Load Saved Route
                </button>
              )}
              
              <div className="mt-4 p-4 bg-gray-800 border-2 border-dashed border-green-500/50 rounded-lg">
                <div className="flex items-start">
                  <AndroidIcon className="w-8 h-8 text-green-400 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-400">Coming Soon: Automatic Sync</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      A future native Android app version will automatically import your route—no screenshots needed!
                    </p>
                     <button
                        onClick={showNativeFeatureInfo}
                        className="mt-3 w-full flex items-center justify-center bg-green-600/50 text-green-200 font-bold py-2 px-4 rounded-lg transition duration-300 cursor-help"
                      >
                        <InfoIcon className="w-5 h-5 mr-2" />
                        Learn More
                      </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {screenshotPreviews.length > 0 && !route && (
             <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
                <h2 className="text-lg font-semibold text-cyan-400 mb-3 text-center">
                  {screenshotPreviews.length} Screenshot{screenshotPreviews.length > 1 ? 's' : ''} Selected
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2">
                  {screenshotPreviews.map((previewUrl, index) => (
                    <img key={index} src={previewUrl} alt={`Screenshot preview ${index + 1}`} className="rounded-md w-full h-auto object-cover" />
                  ))}
                </div>
                 <input
                  type="file"
                  ref={addMoreInputRef}
                  onChange={handleAddMoreFiles}
                  multiple
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
                <button
                  onClick={handleAddMoreClick}
                  className="mt-4 w-full flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Add More Screenshots
                </button>
              </div>
          )}

          {isLoading && <Spinner />}

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mt-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
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

          <div className="mt-auto pt-6 flex flex-col space-y-3">
              {screenshotFiles.length > 0 && !isLoading && !route && (
                  <button
                    onClick={handleProcessRoute}
                    disabled={isLoading}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Process Route
                  </button>
              )}
              
              {route && !isLoading && (
                <button
                  onClick={handleSaveRoute}
                  disabled={saveStatus === 'saved'}
                  className={`w-full font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out shadow-lg flex items-center justify-center ${
                    saveStatus === 'saved' 
                      ? 'bg-green-700 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
                  }`}
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckIcon className="w-6 h-6 mr-2" />
                      Route Saved!
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-5 h-5 mr-2" />
                      Save Optimized Route
                    </>
                  )}
                </button>
              )}

              {(screenshotFiles.length > 0 || route) && (
                <button
                  onClick={handleReset}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  Start Over
                </button>
              )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
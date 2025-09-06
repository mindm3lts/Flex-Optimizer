import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { RouteDisplay } from './components/RouteDisplay';
import { Spinner } from './components/Spinner';
import { LiveConditions } from './components/LiveConditions';
import { SubscriptionModal } from './components/SubscriptionModal';
import { processRouteScreenshot, optimizeRouteOrder, getRouteSummary, getLiveTraffic } from './services/geminiService';
import type { RouteStop, RouteSummary, TrafficInfo, WeatherInfo, User } from './types';
import { InfoIcon, SaveIcon, LoadIcon, CheckIcon, WarningIcon, PlusCircleIcon } from './components/icons';

const App: React.FC = () => {
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [appStatus, setAppStatus] = useState<'idle' | 'processing' | 'optimizing'>('idle');
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [isTrafficLoading, setIsTrafficLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedRoute, setHasSavedRoute] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const [user, setUser] = useState<User>({ tier: 'Free' });
  const [routeCount, setRouteCount] = useState<number>(0);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
        const savedTheme = localStorage.getItem('flex-optimizer-theme') as 'light' | 'dark' | null;
        if (savedTheme) return savedTheme;
    } catch (e) {
        console.error("Could not load theme from localStorage", e);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const addMoreInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
        localStorage.setItem('flex-optimizer-theme', theme);
    } catch (e) {
        console.error("Could not save theme to localStorage", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const updateRouteAndCurrentStop = (newRoute: RouteStop[] | null) => {
    if (!newRoute) {
        setRoute(null);
        return;
    }
    let currentStopFound = false;
    const updatedRoute = newRoute.map(stop => {
        const isCompleted = stop.status && stop.status !== 'pending';
        if (stop.type === 'location' || isCompleted) {
            return { ...stop, isCurrentStop: false };
        }
        if (!currentStopFound) {
            currentStopFound = true;
            return { ...stop, isCurrentStop: true };
        }
        return { ...stop, isCurrentStop: false };
    });
    setRoute(updatedRoute);
  };


  useEffect(() => {
    try {
        const savedTier = localStorage.getItem('flex-optimizer-tier') as 'Free' | 'Pro' | null;
        const savedCount = localStorage.getItem('flex-optimizer-count');
        const savedRoute = localStorage.getItem('flex-optimizer-saved-route');

        if (savedTier) {
            setUser({ tier: savedTier });
        }
        if (savedCount) {
            setRouteCount(parseInt(savedCount, 10));
        }
        setHasSavedRoute(!!savedRoute);
    } catch (e) {
        console.error("Could not load user data from localStorage", e);
    }


    const urlParams = new URLSearchParams(window.location.search);
    const routeData = urlParams.get('routeData');

    if (routeData) {
      try {
        const decodedData = atob(decodeURIComponent(routeData));
        const parsedRoute = JSON.parse(decodedData) as RouteStop[];

        if (Array.isArray(parsedRoute) && parsedRoute.length > 0 && 'street' in parsedRoute[0]) {
          updateRouteAndCurrentStop(parsedRoute);
          setScreenshotFiles([]);
          setScreenshotPreviews([]);
          setError(null);
        } else {
          throw new Error("Invalid route data in URL.");
        }
      } catch (e) {
        console.error("Failed to load route from URL:", e);
        setError("Could not load shared route. The link may be corrupted or expired.");
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);
  
  useEffect(() => {
    return () => {
      screenshotPreviews.forEach(URL.revokeObjectURL);
    };
  }, [screenshotPreviews]);

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
      }
      else {
        setSummary(null);
      }
    };

    fetchSummary();
  }, [route, summary?.routeBlockCode]);

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
        screenshotPreviews.forEach(URL.revokeObjectURL);
        setScreenshotFiles(files);
        setScreenshotPreviews(files.map(file => URL.createObjectURL(file)));
    } else {
        setScreenshotFiles(prev => [...prev, ...files]);
        setScreenshotPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    }

    updateRouteAndCurrentStop(null);
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
    updateRouteAndCurrentStop(null);
    setError(null);
    setAppStatus('idle');
  };

  const handleProcessRoute = useCallback(async () => {
    if (screenshotFiles.length === 0) {
      setError('Please upload one or more screenshots first.');
      return;
    }
    
    if (user.tier === 'Free' && routeCount >= 5) {
        setError("You've reached your free limit of 5 routes per month. Please upgrade to Pro.");
        setIsSubModalOpen(true);
        return;
    }

    setAppStatus('processing');
    setError(null);
    updateRouteAndCurrentStop(null);
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
        updateRouteAndCurrentStop(sortedAddresses);
        setSummary({ totalStops: sortedAddresses.length, totalDistance: "...", totalTime: "...", routeBlockCode });
        
        if (user.tier === 'Free') {
          const newCount = routeCount + 1;
          setRouteCount(newCount);
          localStorage.setItem('flex-optimizer-count', newCount.toString());
        }
      } else {
        setError('Could not extract any addresses from the images. Please try other screenshots.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setAppStatus('idle');
    }
  }, [screenshotFiles, user, routeCount]);

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
            updateRouteAndCurrentStop(savedRoute);
            setScreenshotFiles([]);
            setScreenshotPreviews([]);
            setError(null);
            setAppStatus('idle');
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
  
  const handleAiOptimize = useCallback(async (useLocation: boolean, avoidLeftTurns: boolean) => {
    const deliveryStops = route?.filter(s => s.type !== 'location') ?? [];
    if (deliveryStops.length < 1) return;

    setAppStatus('optimizing');
    setError(null);

    const performOptimization = async (location?: { lat: number, lon: number }) => {
      try {
        const optimized = await optimizeRouteOrder(deliveryStops, location, avoidLeftTurns);
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
            stopType: 'Unknown',
            status: 'delivered'
          };
          updateRouteAndCurrentStop([currentLocationStop, ...optimized]);
        } else {
          updateRouteAndCurrentStop(optimized);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during optimization.');
      } finally {
        setAppStatus('idle');
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
          setAppStatus('idle');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      performOptimization();
    }
  }, [route]);

  const handleSubscriptionChange = (newTier: 'Free' | 'Pro') => {
      setUser({ tier: newTier });
      localStorage.setItem('flex-optimizer-tier', newTier);
      if (newTier === 'Pro') {
          setIsSubModalOpen(false); 
          setError(null); 
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col items-center text-gray-900 dark:text-white transition-colors duration-300">
      <div className="w-full max-w-md mx-auto p-4 flex flex-col flex-grow">
        <Header 
          onOpenSubModal={() => setIsSubModalOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main className="flex-grow flex flex-col mt-6">
          {screenshotPreviews.length === 0 && !route && (
            <>
              <FileUpload onFileChange={handleFileChange} />
              
              <LiveConditions />

              <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start">
                  <InfoIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-cyan-600 dark:text-cyan-400">Screenshot Tips</h3>
                    <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 text-sm mt-1 space-y-1">
                      <li>Upload multiple screenshots for your entire block.</li>
                      <li>For best results, use standard screenshots instead of one long, scrolling screenshot.</li>
                      <li>Ensure all stops are visible on the screen.</li>
                      <li>Text must be clear and not blurry.</li>
                      <li>Avoid any screen glare or obstructions.</li>
                    </ul>
                     <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 flex items-start text-yellow-600 dark:text-yellow-300/80">
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
                  className="mt-4 w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  <LoadIcon className="w-5 h-5 mr-2" />
                  Load Saved Route
                </button>
              )}
            </>
          )}

          {screenshotPreviews.length > 0 && !route && (
             <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
                <h2 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-3 text-center">
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
                  className="mt-4 w-full flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Add More Screenshots
                </button>
              </div>
          )}

          {appStatus === 'processing' && <Spinner />}

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mt-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {route && appStatus !== 'processing' && (
            <RouteDisplay
              route={route}
              summary={summary}
              trafficInfo={trafficInfo}
              onRouteUpdate={updateRouteAndCurrentStop}
              onAiOptimize={handleAiOptimize}
              isOptimizing={appStatus === 'optimizing'}
            />
          )}

          <div className="mt-auto pt-6 flex flex-col space-y-3">
              {screenshotFiles.length > 0 && !route && (
                  <button
                    onClick={handleProcessRoute}
                    disabled={appStatus === 'processing'}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center justify-center disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50"
                  >
                    Process Route
                  </button>
              )}
              
              {route && appStatus !== 'processing' && (
                <button
                  onClick={handleSaveRoute}
                  disabled={saveStatus === 'saved'}
                  className={`w-full font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out shadow-lg flex items-center justify-center ${
                    saveStatus === 'saved' 
                      ? 'bg-green-600 dark:bg-green-700 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transform hover:scale-105'
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
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition duration-300"
                >
                  Start Over
                </button>
              )}
          </div>
        </main>
      </div>
      {isSubModalOpen && (
          <SubscriptionModal
              user={user}
              onClose={() => setIsSubModalOpen(false)}
              onSubscriptionChange={handleSubscriptionChange}
          />
      )}
    </div>
  );
};

export default App;
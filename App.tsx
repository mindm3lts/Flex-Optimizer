import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { RouteDisplay } from './components/RouteDisplay';
import { Spinner } from './components/Spinner';
import { processRouteScreenshot } from './services/geminiService';
import type { RouteStop } from './types';
import { InfoIcon, SaveIcon, LoadIcon, AndroidIcon, CheckIcon } from './components/icons';

const App: React.FC = () => {
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedRoute, setHasSavedRoute] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

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


  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      // Clean up old previews before creating new ones
      screenshotPreviews.forEach(URL.revokeObjectURL);

      setScreenshotFiles(files);
      setScreenshotPreviews(files.map(file => URL.createObjectURL(file)));
      setRoute(null);
      setError(null);
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

    try {
      // Process all screenshots in parallel
      const allResults = await Promise.all(
        screenshotFiles.map(file => processRouteScreenshot(file))
      );

      // Flatten the array of arrays and deduplicate based on originalStopNumber
      const allStops = allResults.flat();
      const uniqueStopsMap = new Map<number, RouteStop>();

      for (const stop of allStops) {
        // The map ensures that we only keep the first occurrence of each stop number
        if (!uniqueStopsMap.has(stop.originalStopNumber)) {
          uniqueStopsMap.set(stop.originalStopNumber, stop);
        }
      }

      const addresses = Array.from(uniqueStopsMap.values());
      
      if (addresses && addresses.length > 0) {
        const sortedAddresses = [...addresses].sort((a, b) => a.originalStopNumber - b.originalStopNumber);
        setRoute(sortedAddresses);
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
        setTimeout(() => setSaveStatus('idle'), 2000); // Reset after 2 seconds
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
            <RouteDisplay route={route} onRouteUpdate={setRoute} />
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
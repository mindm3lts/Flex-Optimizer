# Flex Route Optimizer

An open-source, AI-powered tool for Amazon Flex drivers to optimize their delivery routes. Upload screenshots of your itinerary, and the app extracts addresses to generate the most efficient route for Google Maps. This project is completely free, with no ads or paywalls.

![Main screen of the application showing the file upload area](https://placehold.co/800x450/1e293b/93c5fd/png?text=Flex+Route+Optimizer\nMain+Screen)
_Caption: The main interface, ready for you to upload your route screenshots._

## ✨ Features

-   **⚙️ AI-Powered:** Uses Google Gemini for fast and accurate route processing and optimization.
-   **📄 Screenshot to Route:** Upload one or more screenshots of your Amazon Flex itinerary.
-   **🤖 AI-Powered Optimization:** Uses AI to intelligently parse addresses and calculate the most efficient delivery order.
-   **📍 Start From Anywhere:** Optionally use your current GPS location as the starting point for the route.
-   **↪️ Avoid Left Turns:** An option to generate routes that prefer fewer left turns, saving time and increasing safety.
-   **👆 Drag & Drop Reordering:** Manually adjust the optimized route to your preference with an intuitive drag-and-drop interface.
-   **📝 Edit & Annotate:** Add notes, edit package details, and update stop information directly in the app.
-   **🌦️ Live Conditions:** Get real-time weather and traffic summaries for your route area.
-   **🗺️ Google Maps Integration:** Generates direct links to Google Maps for navigation. Long routes are automatically split into manageable chunks.
-   **💾 Save & Load:** Save your optimized route to your device and load it back later.
-   **☀️ Dark & Light Mode:** A sleek, modern interface that adapts to your preference.
-   **📱 Installable App (PWA & APK):** Can be installed on your phone's home screen or compiled into a native Android app.
-   **🔓 100% Free & Open Source:** No subscriptions, no limits, no ads.

![Optimized route displayed in the app](https://placehold.co/800x600/1e293b/93c5fd/png?text=Optimized+Route\nDisplay)
_Caption: An example of a processed and optimized route, ready for navigation._

---

## 🚀 Build and Compile to APK

Follow these instructions to set up the project and compile it into an Android APK file that you can install on your device.

### Prerequisites

1.  **Node.js:** You need Node.js (which includes npm) to install dependencies and run build scripts. Download it from [nodejs.org](https://nodejs.org/).
2.  **Android Studio:** You need Android Studio to build the native Android app. Download it from the [Android Developer website](https://developer.android.com/studio). During installation, make sure you install the **Android SDK** and **Command-line Tools**.

### Step 1: Clone the Repository & Install Dependencies

First, get the code and install all the required packages.

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/flex-route-optimizer.git

# Navigate into the project directory
cd flex-route-optimizer

# Install all project dependencies
npm install
```

### Step 2: Configure Your API Key

This application requires a Google Gemini API key to function. The key must be provided as an environment variable.

1.  Create a file named `.env` in the root of the project directory.
2.  Add your API key to this file:

    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

    *Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.* The build process will automatically make this variable available to the application.

### Step 3: Initialize Capacitor

Capacitor is the tool that wraps our web app in a native Android shell.

```bash
# Initialize Capacitor. You will be prompted for an App Name and App ID.
# App Name: Flex Route Optimizer
# App ID: com.flexoptimizer.app (or your own unique ID)
npx cap init

# Add the Android platform to your project
npx cap add android
```
This will create a native `android` folder in your project.

### Step 4: Build the Web App & Sync with Android

Now, we compile the web app and copy the finished files into the native Android project.

```bash
# Build the web app. This creates a 'dist' folder with optimized files.
npm run build

# Sync the web build with the Android project
npx cap sync
```

### Step 5: Build the APK in Android Studio

1.  Open Android Studio.
2.  In the welcome menu, choose **"Open an Existing Project"**.
3.  Navigate to your `flex-route-optimizer` folder and select the `android` directory inside it.
4.  Wait for Android Studio to load and sync the project (this can take a few minutes).
5.  From the top menu bar, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6.  Once the build is complete, a notification will appear in the bottom-right corner. Click **"locate"** to find the generated `app-debug.apk` file.

You can now transfer this APK file to your Android device and install it.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please open an issue or submit a pull request.

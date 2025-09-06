# Flex Route Optimizer

An open-source, AI-powered tool for Amazon Flex drivers to optimize their delivery routes. Upload screenshots of your itinerary, and the app extracts addresses to generate the most efficient route for Google Maps. This project is completely free, with no ads or paywalls.

![Main screen of the application showing the file upload area](https://placehold.co/800x450/1e293b/93c5fd/png?text=Flex+Route+Optimizer\nMain+Screen)
_Caption: The main interface, ready for you to upload your route screenshots._

## ✨ Features

-   **⚙️ Configurable AI:** Choose your AI provider. Support for Google Gemini is built-in, and the architecture is ready for more providers.
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
-   **🔓 100% Free & Open Source:** No subscriptions, no limits, no ads.

![Optimized route displayed in the app](https://placehold.co/800x600/1e293b/93c5fd/png?text=Optimized+Route\nDisplay)
_Caption: An example of a processed and optimized route, ready for navigation._

---

## 🚀 Getting Started

This application requires an API key from an AI provider to function. Setup is simple and requires no code changes.

### Step 1: Get an API Key

First, you need an API key. Google Gemini is supported out of the box.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click on **"Get API key"** and then **"Create API key in new project"**.
4.  Copy the generated API key. Keep it safe.

### Step 2: Local Setup (Desktop)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR-USERNAME/flex-route-optimizer.git
    cd flex-route-optimizer
    ```

2.  **Run a local server:**
    Since the app uses modern web technologies, you need to serve the files from a local web server. A simple way is to use a VS Code extension like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or a command-line tool.
    
    Using Python:
    ```bash
    python -m http.server
    ```
    
    Using Node.js (requires the `serve` package):
    ```bash
    npm install -g serve
    serve .
    ```
    Now, open your browser and navigate to the local address provided (e.g., `http://localhost:8000` or `http://localhost:3000`).

3.  **Configure the App:**
    -   Once the app loads, click the **Settings icon (⚙️)** in the header.
    -   Select your AI Provider (e.g., "Google Gemini").
    -   Paste your API key into the "API Key" field.
    -   The model name (`gemini-2.5-flash`) is pre-filled for Gemini.
    -   Click "Save Settings". The app is now ready to use!

### Step 3: Termux Setup (Android)

Run the optimizer directly on your Android device using Termux.

1.  **Install Termux and Tools:**
    -   Download and install Termux from [F-Droid](https://f-droid.org/en/packages/com.termux/).
    -   Open Termux and run:
    ```bash
    pkg update && pkg upgrade
    pkg install nodejs git
    ```

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR-USERNAME/flex-route-optimizer.git
    cd flex-route-optimizer
    ```

3.  **Start the server:**
    ```bash
    npx serve .
    ```
    `serve` will start a web server and give you a local URL, typically `http://localhost:3000`.

4.  **Configure and Use the App:**
    -   Open a web browser on your phone (like Chrome or Firefox) and navigate to `http://localhost:3000`.
    -   Follow **Step 3: Configure the App** from the desktop instructions above to enter your API key in the settings menu.
    -   You can now use the app directly on your device to upload screenshots and optimize routes.

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features (like adding a new AI provider), bug fixes, or improvements, please open an issue or submit a pull request.
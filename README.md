# Flex Route Optimizer

An open-source, AI-powered tool for Amazon Flex drivers to optimize their delivery routes. Upload screenshots of your itinerary, and the app extracts addresses to generate the most efficient route for Google Maps. This project is completely free, with no ads or paywalls.

![Main screen of the application showing the file upload area](./screenshot-1.png)
_Caption: The main interface, ready for you to upload your route screenshots._

## ✨ Features

-   **📄 Screenshot to Route:** Upload one or more screenshots of your Amazon Flex itinerary.
-   **🤖 AI-Powered Optimization:** Uses the Gemini API to intelligently parse addresses and calculate the most efficient delivery order.
-   **📍 Start From Anywhere:** Optionally use your current GPS location as the starting point for the route.
-   **↪️ Avoid Left Turns:** An option to generate routes that prefer fewer left turns, saving time and increasing safety.
-   **👆 Drag & Drop Reordering:** Manually adjust the optimized route to your preference with an intuitive drag-and-drop interface.
-   **📝 Edit & Annotate:** Add notes, edit package details, and update stop information directly in the app.
-   **🌦️ Live Conditions:** Get real-time weather and traffic summaries for your route area.
-   **🗺️ Google Maps Integration:** Generates direct links to Google Maps for navigation. Long routes are automatically split into manageable chunks.
-   **💾 Save & Load:** Save your optimized route to your device and load it back later.
-   **☀️ Dark & Light Mode:** A sleek, modern interface that adapts to your preference.
-   **🔓 100% Free & Open Source:** No subscriptions, no limits, no ads.

![Optimized route displayed in the app](./screenshot-2.png)
_Caption: An example of a processed and optimized route, ready for navigation._

---

## 🚀 Getting Started

To run this application, you will need a Google Gemini API key.

### Obtaining an API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account.
3.  Click on **"Get API key"** and then **"Create API key in new project"**.
4.  Copy the generated API key. Keep it safe and do not share it publicly.

### Local Setup (Desktop)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR-USERNAME/flex-route-optimizer.git
    cd flex-route-optimizer
    ```

2.  **Set up the API Key:**
    The application is configured to read the API key from `process.env.API_KEY`. To simulate this in a local environment without a build process, you can add a small script to your `index.html`.

    Open `index.html` and add this script tag inside the `<head>` section, **before** the other scripts:
    ```html
    <script>
      // WARNING: For local development only. Do not commit your API key.
      window.process = {
        env: {
          API_KEY: 'YOUR_GEMINI_API_KEY_HERE'
        }
      };
    </script>
    ```
    Replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.

3.  **Run a local server:**
    Since the app uses ES modules, you need to serve the files from a local web server. A simple way is to use a VS Code extension like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) or run a command-line server.
    
    Using Python:
    ```bash
    python -m http.server
    ```
    
    Using Node.js (requires `serve` package):
    ```bash
    npm install -g serve
    serve .
    ```
    Now, open your browser and navigate to the local address provided (e.g., `http://localhost:8000` or `http://localhost:3000`).

### Termux Setup (Android)

Run the optimizer directly on your Android device using Termux.

1.  **Install Termux:**
    Download and install Termux from [F-Droid](https://f-droid.org/en/packages/com.termux/).

2.  **Install necessary packages:**
    Open Termux and run:
    ```bash
    pkg update && pkg upgrade
    pkg install nodejs git
    ```

3.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR-USERNAME/flex-route-optimizer.git
    cd flex-route-optimizer
    ```

4.  **Set up the API Key:**
    As with the local setup, open `index.html` to add your API key. You can use a command-line editor like `nano` or `vim`.
    ```bash
    pkg install nano
    nano index.html 
    ```
    Add the same script block from the local setup instructions into the `<head>` of the HTML file. Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

5.  **Start the server:**
    ```bash
    npx serve .
    ```
    `serve` will start a web server and give you a local URL, typically `http://localhost:3000`.

6.  **Access the app:**
    Open a web browser on your phone (like Chrome or Firefox) and navigate to `http://localhost:3000`. You can now use the app directly on your device!

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please open an issue or submit a pull request.

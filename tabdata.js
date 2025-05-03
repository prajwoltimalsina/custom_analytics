// tabData.js - Updated to fetch data directly from Google Sheets API

// Define available tabs and exact ranges from your Google Sheet
const AVAILABLE_TABS = [
  { id: 'campaign', name: 'Campaign', range: 'Campaign!A:B' },
  { id: 'facebook', name: 'Facebook', range: 'Facebook!A:B' },
  { id: 'instagram', name: 'Instagram', range: 'Instagram!A:B' },
  { id: 'twitter', name: 'Twitter', range: 'Twitter!A:B' },
  { id: 'linkedin', name: 'Linkedin', range: 'Linkedin!A:B' }
];

// IndexedDB config
let tabsDB;
const TABS_DB_NAME = 'TabsDB';
const TABS_STORE_NAME = 'tabsData';
const TABS_DB_VERSION = 1;

// Init IndexedDB
function initTabsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TABS_DB_NAME, TABS_DB_VERSION);

    request.onupgradeneeded = (e) => {
      tabsDB = e.target.result;
      if (!tabsDB.objectStoreNames.contains(TABS_STORE_NAME)) {
        tabsDB.createObjectStore(TABS_STORE_NAME, { keyPath: 'tabId' });
      }
    };

    request.onsuccess = (e) => {
      tabsDB = e.target.result;
      console.log('Tabs DB initialized successfully');
      resolve(tabsDB);
    };

    request.onerror = (e) => {
      console.error('Error initializing tabs DB:', e.target.error);
      reject(e.target.error);
    };
  });
}

// Store tab data in IndexedDB
function storeTabData(tabId, data) {
  return new Promise((resolve, reject) => {
    const formattedData = {
      tabId: tabId,
      data: data,
      timestamp: new Date().getTime()
    };

    const transaction = tabsDB.transaction(TABS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TABS_STORE_NAME);

    const request = store.put(formattedData);

    request.onsuccess = () => {
      console.log(`Tab data for ${tabId} stored in IndexedDB`);
      resolve(true);
    };

    request.onerror = (e) => {
      console.error(`Error storing tab data for ${tabId}:`, e.target.error);
      reject(e.target.error);
    };
  });
}

// Get tab data from IndexedDB
function getTabData(tabId) {
  return new Promise((resolve, reject) => {
    if (!tabsDB) {
      reject(new Error('Tabs database not initialized'));
      return;
    }

    const transaction = tabsDB.transaction(TABS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TABS_STORE_NAME);
    const request = store.get(tabId);

    request.onsuccess = () => {
      if (request.result) {
        console.log(`Tab data for ${tabId} retrieved from IndexedDB`);
        resolve(request.result.data);
      } else {
        console.log(`No tab data for ${tabId} found in IndexedDB`);
        resolve(null);
      }
    };

    request.onerror = (e) => {
      console.error(`Error retrieving tab data for ${tabId}:`, e.target.error);
      reject(e.target.error);
    };
  });
}

// Fetch tab data using Google Sheets API
function fetchTabData(tabId, callback) {
  const tabConfig = AVAILABLE_TABS.find(tab => tab.id === tabId);

  if (!tabConfig) {
    console.error(`Tab ID ${tabId} not found in AVAILABLE_TABS`);
    callback(null, new Error(`Invalid tab ID: ${tabId}`));
    return;
  }

  if (!gapi.client || !gapi.client.sheets) {
    console.error("Google Sheets API not initialized");
    callback(null, new Error("Google Sheets API not initialized"));
    return;
  }

  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabConfig.range
  }).then(response => {
    const values = response.result.values || [];
    callback(values);
  }).catch(error => {
    console.error(`Failed to fetch data from ${tabConfig.name} tab:`, error);
    callback(null, error);
  });
}

// Fetch data with offline support
async function fetchTabDataWithOfflineSupport(tabId) {
  try {
    if (navigator.onLine && gapi.client && gapi.client.sheets) {
      // Try fetching fresh data online
      const onlineData = await new Promise((resolve, reject) => {
        fetchTabData(tabId, (data, error) => {
          if (error) reject(error);
          else resolve(data);
        });
      });

      if (onlineData && onlineData.length > 0) {
        await storeTabData(tabId, onlineData);
        return onlineData;
      }
    }

    // Fallback to IndexedDB
    const offlineData = await getTabData(tabId);
    if (offlineData) {
      return offlineData;
    }
  } catch (err) {
    console.error(`Error in fetchTabDataWithOfflineSupport for ${tabId}:`, err);
  }

  return [];
}
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

function gisLoaded() {
  // Optional: can be used for token client setup if needed
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: 'AIzaSyBoBMlw_eC3y88AzhbhNSVgLNZ-nz93n2A',
    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
  });
  console.log('Google Sheets API client initialized');
}

// tabData.js - Handles fetching and managing data from multiple spreadsheet tabs
// Add this file to your project

// List of available spreadsheet tabs
const AVAILABLE_TABS = [
    { id: 'campaign', name: 'Campaign', range: 'Campaign!A:B' },
    { id: 'facebook', name: 'Facebook', range: 'Facebook!A:B' },
    { id: 'instagram', name: 'Instagram', range: 'Instagram!A:B' },
    { id: 'twitter', name: 'Twitter', range: 'Twitter!A:B' },
    { id: 'linkedin', name: 'LinkedIn', range: 'LinkedIn!A:B' }
  ];
  
  // Database setup for multi-tab data
  let tabsDB;
  const TABS_DB_NAME = 'TabsDB';
  const TABS_STORE_NAME = 'tabsData';
  const TABS_DB_VERSION = 1;
  
  // Initialize the Tab IndexedDB
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
      // Format the data for storage
      const formattedData = {
        tabId: tabId,
        data: data,
        timestamp: new Date().getTime()
      };
      
      const transaction = tabsDB.transaction(TABS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(TABS_STORE_NAME);
      
      const request = store.put(formattedData); // Use put to update if exists
      
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
  
  // Retrieve tab data from IndexedDB
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
  
  // Fetch data from specific tab with Google Sheets API
  function fetchTabData(tabId, callback) {
    // Find the tab configuration
    const tabConfig = AVAILABLE_TABS.find(tab => tab.id === tabId);
    
    if (!tabConfig) {
      console.error(`Tab ID ${tabId} not found in configuration`);
      callback(null, new Error(`Tab ID ${tabId} not found`));
      return;
    }
  
    // Make sure gapi client is initialized and ready
    if (!gapi.client || !gapi.client.sheets) {
      console.error("Google API client not initialized");
      
      // Use Papa Parse as fallback for CSV
      const fallbackUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vShkyha9RUILD6tgutsA9KqriklzAITyydxblmfyYvRvC7lLS60JMsVM3am-8wwu5Kt5a9mHSDvoQgO/pub?output=csv";
      
      if (typeof Papa !== 'undefined') {
        Papa.parse(fallbackUrl, {
          download: true,
          header: false,
          complete: function(results) {
            callback(results.data);
          },
          error: function(error) {
            console.error("Error fetching CSV data:", error);
            callback(null, error);
          }
        });
      } else {
        callback(null, new Error("Neither Google API nor Papa Parse is available"));
      }
      return;
    }
  
    // Use Google Sheets API to fetch data from the specific tab
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: tabConfig.range,
    }).then(function(response) {
      const values = response.result.values || [];
      callback(values);
    }).catch(function(error) {
      console.error(`Error fetching data from ${tabConfig.name} tab:`, error);
      callback(null, error);
    });
  }
  
  // Fetch tab data with offline support
  async function fetchTabDataWithOfflineSupport(tabId) {
    // Try to fetch from network first
    if (navigator.onLine) {
      try {
        // Try Google Sheets API first
        const onlineData = await new Promise((resolve) => {
          fetchTabData(tabId, function(data, error) {
            if (data && data.length > 0) {
              resolve(data);
            } else {
              resolve(null);
            }
          });
        });
        
        if (onlineData) {
          // Store data for offline use
          await storeTabData(tabId, onlineData);
          return onlineData;
        }
      } catch (error) {
        console.error(`Error fetching online data for tab ${tabId}:`, error);
      }
    }
    
    // If we're offline or online fetching failed, try to get from IndexedDB
    try {
      const offlineData = await getTabData(tabId);
      if (offlineData) {
        return offlineData;
      }
    } catch (error) {
      console.error(`Error fetching offline data for tab ${tabId}:`, error);
    }
    
    // If all else fails, return null
    return null;
  }
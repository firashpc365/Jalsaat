
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { DATA_VERSION, runMigrations } from '../migrations';

const APP_STATE_KEY = 'kanchana-events-hub-state';

// --- Helper functions for the Three-Way Merge ---
const isObject = (item: any): item is object => {
  return (item && typeof item === 'object' && !Array.isArray(item));
};

const deepMerge = (target: any, source: any): any => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target) || !isObject(target[key])) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        if (!(key in target)) {
          output[key] = source[key];
        }
      }
    });
  }
  return output;
};

const mergeState = (userData: any, defaultData: any) => {
    // 1. Base Merge: Spread default, then user (user wins for primitives)
    const merged = { ...defaultData, ...userData };

    // 2. Arrays: Robust Merge with Strict Type Checking
    // Ensure we are working with arrays to prevent "is not iterable" errors
    const userServices = Array.isArray(userData?.services) ? userData.services : [];
    const defaultServices = Array.isArray(defaultData?.services) ? defaultData.services : [];
    
    // Merge logic: Keep user services, add new master services that user doesn't have
    const userServiceIds = new Set(userServices.map((s: any) => s.id));
    const newMasterServices = defaultServices.filter((s: any) => !userServiceIds.has(s.id));
    
    merged.services = [...userServices, ...newMasterServices];

    // 3. Roles: Deep merge to ensure new permissions are added to existing roles
    const userRoles = userData.roles || {};
    const defaultRoles = defaultData.roles || {};
    const finalRoles = { ...defaultRoles };
    
    Object.keys(defaultRoles).forEach(role => {
        if (userRoles[role]) {
            finalRoles[role as keyof typeof finalRoles] = { ...defaultRoles[role as keyof typeof finalRoles], ...userRoles[role] };
        }
    });
    merged.roles = finalRoles;

    // 4. Settings: Deep merge
    merged.settings = deepMerge(userData.settings || {}, defaultData.settings);
    
    // 5. Templates: Safe Array Merge
    const userTemplates = Array.isArray(userData?.proposalTemplates) ? userData.proposalTemplates : [];
    const defaultTemplates = Array.isArray(defaultData?.proposalTemplates) ? defaultData.proposalTemplates : [];
    
    const systemTemplates = defaultTemplates.filter((t: any) => t.templateType === 'system_default');
    const userTemplateIds = new Set(userTemplates.map((t: any) => t.id));
    const newSystemTemplates = systemTemplates.filter((t: any) => !userTemplateIds.has(t.id));
    
    merged.proposalTemplates = [...userTemplates, ...newSystemTemplates];

    // 6. Data Integrity Checks
    // Ensure critical arrays are never undefined
    merged.events = Array.isArray(userData?.events) ? userData.events : [];
    merged.clients = Array.isArray(userData?.clients) ? userData.clients : [];
    merged.users = Array.isArray(userData?.users) ? userData.users : defaultData.users;
    merged.rfqs = Array.isArray(userData?.rfqs) ? userData.rfqs : [];
    merged.suppliers = Array.isArray(userData?.suppliers) ? userData.suppliers : [];
    merged.procurementDocuments = Array.isArray(userData?.procurementDocuments) ? userData.procurementDocuments : [];

    return merged;
};

const loadStateFromStorage = (initialState: any) => {
    try {
      const item = localStorage.getItem(APP_STATE_KEY);
      if (!item) {
        return initialState;
      }
      
      let stored;
      try {
          stored = JSON.parse(item);
      } catch (e) {
          console.error("Failed to parse stored state, resetting.", e);
          return initialState;
      }

      // Legacy support: if stored data is the root object
      let userData = stored; 
      let storedVersion = 0;

      // Modern support: if data is nested under 'data' key
      if (stored && typeof stored === 'object' && 'data' in stored) {
          userData = stored.data;
          storedVersion = stored.version || 0;
      } else if (stored && typeof stored === 'object' && 'version' in stored) {
          storedVersion = stored.version || 0;
      }
      
      // Run Migrations
      if (storedVersion < DATA_VERSION) {
        console.log(`Migrating data from v${storedVersion} to v${DATA_VERSION}`);
        try {
            userData = runMigrations(userData, storedVersion);
        } catch (err) {
            console.error("Migration failed", err);
            // If migration fails, we might want to recover partial data or reset
            // For now, let's try to proceed with what we have
        }
      }
      
      return mergeState(userData, initialState);

    } catch (error) {
      console.error(`Error loading state, resetting to default:`, error);
      return initialState;
    }
};

export const usePersistentState = (initialState: any): [any, Dispatch<SetStateAction<any>>, () => void] => {
  const [state, setState] = useState(() => loadStateFromStorage(initialState));

  useEffect(() => {
    try {
      const itemToStore = {
        data: state, // Nest data to avoid confusion with metadata
        version: DATA_VERSION,
      };
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(itemToStore));
    } catch (error) {
      console.error(`Error saving state:`, error);
    }
  }, [state]);
  
  const refreshState = useCallback(() => {
    const refreshedState = loadStateFromStorage(initialState);
    setState(refreshedState);
  }, [initialState]);

  return [state, setState, refreshState];
};

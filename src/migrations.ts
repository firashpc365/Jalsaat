
// migrations.ts

import type { Role, Permissions } from "./types";

/**
 * The current version of the application's data structure.
 * Increment this number whenever a breaking change is made to the state shape.
 */
export const DATA_VERSION = 14;

/**
 * A map of migration functions.
 * Each key represents the version number to migrate TO.
 * The function receives the state from the previous version (key - 1)
 * and must return the state in the new version's shape.
 */
export const migrations: { [key: number]: (oldState: any) => any } = {
  2: (stateV1) => {
    // This migration removes the old, granular services that have been replaced
    // by the new high-level master service list.
    const servicesToRemove = [
      's-print-1', 's-print-2', 's-av-1', 's-av-2', 's-ent-1', 's-ent-2'
    ];
    
    // Ensure services exist before trying to filter
    const currentServices = stateV1.services || [];
    
    return {
      ...stateV1,
      services: currentServices.filter((service: any) => !servicesToRemove.includes(service.id)),
    };
  },
  3: (stateV2) => {
    // This migration adds a `roles` configuration to the root of the state
    // and removes the now-redundant `permissions` property from each user object.

    const PERMISSIONS_V2: { [key in Role]: Permissions } = {
      Admin: { canCreateEvents: true, canManageServices: true, canViewFinancials: true, canManageUsers: true, canManageRFQs: true },
      Sales: { canCreateEvents: true, canManageServices: false, canViewFinancials: false, canManageUsers: false, canManageRFQs: true },
      Operations: { canCreateEvents: false, canManageServices: true, canViewFinancials: true, canManageUsers: false, canManageRFQs: false },
    };

    const migratedState = {
      ...stateV2,
      // Add roles config, ensuring not to overwrite if it somehow already exists
      roles: stateV2.roles || PERMISSIONS_V2,
    };

    // Remove `permissions` property from each user in the users array
    if (migratedState.users && Array.isArray(migratedState.users)) {
      migratedState.users = migratedState.users.map((user: any) => {
        // Use object destructuring to omit the 'permissions' property
        const { permissions, ...restOfUser } = user;
        return restOfUser;
      });
    }

    return migratedState;
  },
  4: (stateV3) => {
      // Clean up legacy user names
      if (stateV3.users && Array.isArray(stateV3.users)) {
          stateV3.users = stateV3.users.map((user: any) => {
              if (user.userId === 'u1' || user.userId === 'u_admin') {
                  return { ...user, name: 'System Admin' };
              }
              return user;
          });
      }
      return stateV3;
  },
  5: (stateV4) => {
      // Reset users structure
      const newUsers = [
        { userId: 'u_admin', name: 'System Admin', role: 'Admin', commissionRate: 0 },
        { userId: 'u_sales', name: 'Sales Representative', role: 'Sales', commissionRate: 15 }
      ];
      
      return {
          ...stateV4,
          users: newUsers,
          currentUserId: 'u_sales',
      };
  },
  6: (stateV5) => {
      return stateV5;
  },
  7: (stateV6) => {
    return stateV6;
  },
  8: (stateV7) => {
    // Add 'tasks' array to all events if missing
    let updatedEvents = stateV7.events || [];
    if (Array.isArray(updatedEvents)) {
        updatedEvents = updatedEvents.map((event: any) => {
            return { ...event, tasks: event.tasks || [] };
        });
    }
    return {
        ...stateV7,
        events: updatedEvents
    };
  },
  9: (stateV8) => {
    // Add 'items' array to all RFQs if missing
    let updatedRFQs = stateV8.rfqs || [];
    if (Array.isArray(updatedRFQs)) {
        updatedRFQs = updatedRFQs.map((rfq: any) => {
            return { ...rfq, items: rfq.items || [] };
        });
    }
    return {
        ...stateV8,
        rfqs: updatedRFQs
    };
  },
  10: (stateV9) => {
      // Mock data injection removed.
      return stateV9;
  },
  11: (stateV10) => {
    // Mock data injection removed.
    return stateV10;
  },
  12: (stateV11) => {
    // Mock data injection removed.
    return stateV11;
  },
  13: (stateV12) => {
      // Mock data injection removed.
      return stateV12;
  },
  14: (stateV13) => {
      const jagTemplate = {
        templateId: 'qt-jag-arabia',
        templateName: 'JAG Arabia (Al-Janoub Al-Gharbi)',
        details: {
            companyName: 'Al-Janoub Al-Gharbi Trading Est.',
            companyAddress: 'Prince Mohammed Street, Al-Khobar, Eastern Province, Saudi Arabia\nCR: 70 12235367',
            contactPerson: 'Sales Department',
            contactEmail: 'info@jagarabia.com',
            website: 'www.jagarabia.com',
            primaryColor: '#0c4a6e',
            termsAndConditions: '1. Validity: This quotation is valid for 15 days from the date of issue.\n2. Payment Terms: 50% Advance, 50% upon completion.\n3. CR No: 70 12235367',
            taxRate: 15,
            otherCharges: { description: 'Shipping', amount: 0 }
        },
        lineItems: []
      };

      const currentTemplates = stateV13.quotationTemplates || [];
      // Prevent duplication if it already exists
      if (currentTemplates.some((t: any) => t.templateId === 'qt-jag-arabia')) {
          return stateV13;
      }

      return {
          ...stateV13,
          quotationTemplates: [...currentTemplates, jagTemplate]
      };
  }
};

/**
 * Runs all necessary migration functions sequentially to bring
 * the old state up to the current DATA_VERSION.
 */
export const runMigrations = (data: any, storedVersion: number) => {
  let migratedData = data;
  for (let v = storedVersion + 1; v <= DATA_VERSION; v++) {
    const migration = (migrations as any)[v];
    if (migration) {
      console.log(`Running migration to version ${v}...`);
      migratedData = migration(migratedData);
    }
  }
  return migratedData;
};

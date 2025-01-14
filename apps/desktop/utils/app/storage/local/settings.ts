import { debug, error } from '@/utils/logging';

import { User } from '@/types/auth';
import { SavedSettings, Settings } from '@/types/settings';

import { storageGetSecret, storageSetSecret } from './secret-storage';

const STORAGE_KEY = 'saved-settings';

export async function storageGetSavedSettings(
  settings: Settings,
  user: User,
  includeSecrets = false,
): Promise<SavedSettings> {
  let savedSettings: SavedSettings = {};
  try {
    const itemName = `${STORAGE_KEY}-${user.email}`;
    savedSettings = JSON.parse(
      localStorage.getItem(itemName) || '{}',
    ) as SavedSettings;
  } catch (e) {
    error(e);
  }

  if (includeSecrets) {
    for (const settingId in settings) {
      const setting = settings[settingId];
      if (setting) {
        if (setting.secret) {
          const secret = await storageGetSecret(settingId);
          if (secret) {
            savedSettings[settingId] = secret;
          }
        }
      }
    }
  }

  return savedSettings;
}

const storageSetSavedSettings = (user: User, savedSettings: SavedSettings) => {
  const itemName = `${STORAGE_KEY}-${user.email}`;
  localStorage.setItem(itemName, JSON.stringify(savedSettings));
};

export const getDefaultValue = (settings: Settings, settingId: string) => {
  const setting = settings[settingId];

  if (!setting) {
    console.error(`Setting ${settingId} not found`);
    return;
  }

  if (setting.type === 'choice') {
    if (setting.choices) {
      const defaultChoice = setting.choices.find((choice) => choice.default);
      return defaultChoice?.value;
    } else {
      console.error(`Setting ${settingId} has no choices`);
    }
  } else {
    return setting.defaultValue;
  }
};

export const storageGetSavedSettingValue = (
  savedSettings: SavedSettings,
  settingId: string,
  settings?: Settings,
) => {
  const savedSetting = savedSettings[settingId];
  if (savedSetting) {
    console.log(`value of ${settingId} is ${savedSetting}`);

    return savedSetting;
  }
  // Return default value if available
  else if (settings) {
    return getDefaultValue(settings, settingId);
  }

  return;
};

export async function storageSetSavedSetting(
  settings: Settings,
  user: User,
  settingId: string,
  value: any,
) {
  if (!settings[settingId]) {
    error(`Setting ${settingId} not found`);
    return await storageGetSavedSettings(settings, user, true);
  }

  let isSecret = false;
  if (settings[settingId]) {
    isSecret = settings[settingId].secret || false;
  }

  if (isSecret) {
    await storageSetSecret(settingId, value);
  } else {
    const publicSavedSettings = await storageGetSavedSettings(settings, user);
    publicSavedSettings[settingId] = value;
    storageSetSavedSettings(user, publicSavedSettings);
  }

  return await storageGetSavedSettings(settings, user, true);
}

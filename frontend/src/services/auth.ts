export const AUTH_TOKEN_KEY = 'huaningAuthToken';
export const AUTH_PROFILE_KEY = 'huaningAuthProfile';
export const ADMIN_AUTH_TOKEN_KEY = 'huaningAdminAuthToken';
export const ADMIN_AUTH_PROFILE_KEY = 'huaningAdminAuthProfile';
export const ENTERPRISE_AUTH_TOKEN_KEY = 'huaningEnterpriseAuthToken';
export const ENTERPRISE_AUTH_PROFILE_KEY = 'huaningEnterpriseAuthProfile';
export const AUTH_SESSION_EVENT = 'huaning-auth-session-change';

export type AuthRole = 'ADMIN' | 'ENTERPRISE';

export type AuthProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  statusCode: string;
  roleCode: AuthRole;
  roleName: string;
  enterprise: {
    id: string;
    name: string;
    certificationStatusCode: string;
    certificationStatus: string;
    isBlacklisted: boolean;
  } | null;
};

export type LoginResult = {
  accessToken: string;
  user: {
    id: string;
    username: string;
    role: AuthRole;
  };
  profile: AuthProfile;
};

type ApiAuthProfile = Omit<AuthProfile, 'enterprise'> & {
  enterprise: {
    id: string;
    name: string;
    certificationStatusCode?: string;
    certificationStatus?: string;
    isBlacklisted: boolean;
  } | null;
};

type AuthStorageKeys = {
  tokenKey: string;
  profileKey: string;
};

const AUTH_KEYS_BY_ROLE: Record<AuthRole, AuthStorageKeys> = {
  ADMIN: {
    tokenKey: ADMIN_AUTH_TOKEN_KEY,
    profileKey: ADMIN_AUTH_PROFILE_KEY,
  },
  ENTERPRISE: {
    tokenKey: ENTERPRISE_AUTH_TOKEN_KEY,
    profileKey: ENTERPRISE_AUTH_PROFILE_KEY,
  },
};

export function getAuthToken(role?: AuthRole): string | null {
  if (role) {
    return getStoredItem(sessionStorage, AUTH_KEYS_BY_ROLE[role].tokenKey)
      ?? getStoredItem(localStorage, AUTH_KEYS_BY_ROLE[role].tokenKey)
      ?? getLegacyAuthToken(role);
  }

  return getStoredItem(sessionStorage, ENTERPRISE_AUTH_TOKEN_KEY)
    ?? getStoredItem(sessionStorage, ADMIN_AUTH_TOKEN_KEY)
    ?? getStoredItem(localStorage, ENTERPRISE_AUTH_TOKEN_KEY)
    ?? getStoredItem(localStorage, ADMIN_AUTH_TOKEN_KEY)
    ?? getStoredItem(localStorage, AUTH_TOKEN_KEY);
}

export function getAuthProfile(role?: AuthRole): AuthProfile | null {
  if (role) {
    return readAuthProfile(sessionStorage, AUTH_KEYS_BY_ROLE[role].profileKey)
      ?? readAuthProfile(localStorage, AUTH_KEYS_BY_ROLE[role].profileKey)
      ?? getLegacyAuthProfile(role);
  }

  return readAuthProfile(sessionStorage, ENTERPRISE_AUTH_PROFILE_KEY)
    ?? readAuthProfile(sessionStorage, ADMIN_AUTH_PROFILE_KEY)
    ?? readAuthProfile(localStorage, ENTERPRISE_AUTH_PROFILE_KEY)
    ?? readAuthProfile(localStorage, ADMIN_AUTH_PROFILE_KEY)
    ?? readAuthProfile(localStorage, AUTH_PROFILE_KEY);
}

function getLegacyAuthToken(role: AuthRole): string | null {
  const profile = readAuthProfile(localStorage, AUTH_PROFILE_KEY);

  return profile?.roleCode === role ? getStoredItem(localStorage, AUTH_TOKEN_KEY) : null;
}

function getLegacyAuthProfile(role: AuthRole): AuthProfile | null {
  const profile = readAuthProfile(localStorage, AUTH_PROFILE_KEY);

  return profile?.roleCode === role ? profile : null;
}

function getStoredItem(storage: Storage, key: string): string | null {
  return storage.getItem(key);
}

function setStoredItem(storage: Storage, key: string, value: string): void {
  storage.setItem(key, value);
}

function removeStoredItem(storage: Storage, key: string): void {
  storage.removeItem(key);
}

function readAuthProfile(storage: Storage, key: string): AuthProfile | null {
  const raw = getStoredItem(storage, key);

  if (!raw) {
    return null;
  }

  try {
    return normalizeProfile(JSON.parse(raw) as ApiAuthProfile);
  } catch {
    return null;
  }
}

export function saveAuthSession(result: LoginResult): void {
  const profile = normalizeProfile(result.profile);
  const keys = AUTH_KEYS_BY_ROLE[profile.roleCode];
  const profileValue = JSON.stringify(profile);

  setStoredItem(sessionStorage, keys.tokenKey, result.accessToken);
  setStoredItem(sessionStorage, keys.profileKey, profileValue);
  setStoredItem(localStorage, keys.tokenKey, result.accessToken);
  setStoredItem(localStorage, keys.profileKey, profileValue);
  notifyAuthSessionChanged();
}

export function clearAuthSession(role?: AuthRole): void {
  if (role) {
    const keys = AUTH_KEYS_BY_ROLE[role];
    removeStoredItem(sessionStorage, keys.tokenKey);
    removeStoredItem(sessionStorage, keys.profileKey);
    removeStoredItem(localStorage, keys.tokenKey);
    removeStoredItem(localStorage, keys.profileKey);

    if (getLegacyAuthProfile(role)) {
      removeStoredItem(localStorage, AUTH_TOKEN_KEY);
      removeStoredItem(localStorage, AUTH_PROFILE_KEY);
    }

    if (role === 'ENTERPRISE') {
      removeStoredItem(localStorage, 'portalEnterpriseLoggedIn');
    }

    notifyAuthSessionChanged();
    return;
  }

  removeStoredItem(sessionStorage, AUTH_TOKEN_KEY);
  removeStoredItem(sessionStorage, AUTH_PROFILE_KEY);
  removeStoredItem(sessionStorage, ADMIN_AUTH_TOKEN_KEY);
  removeStoredItem(sessionStorage, ADMIN_AUTH_PROFILE_KEY);
  removeStoredItem(sessionStorage, ENTERPRISE_AUTH_TOKEN_KEY);
  removeStoredItem(sessionStorage, ENTERPRISE_AUTH_PROFILE_KEY);
  removeStoredItem(localStorage, AUTH_TOKEN_KEY);
  removeStoredItem(localStorage, AUTH_PROFILE_KEY);
  removeStoredItem(localStorage, ADMIN_AUTH_TOKEN_KEY);
  removeStoredItem(localStorage, ADMIN_AUTH_PROFILE_KEY);
  removeStoredItem(localStorage, ENTERPRISE_AUTH_TOKEN_KEY);
  removeStoredItem(localStorage, ENTERPRISE_AUTH_PROFILE_KEY);
  removeStoredItem(localStorage, 'portalEnterpriseLoggedIn');
  notifyAuthSessionChanged();
}

export function isLoggedInAs(role?: AuthRole): boolean {
  const profile = getAuthProfile(role);

  if (!getAuthToken(role) || !profile) {
    return false;
  }

  return role ? profile.roleCode === role : true;
}

export function notifyAuthSessionChanged(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function normalizeProfile(profile: ApiAuthProfile): AuthProfile {
  const certificationCode = profile.enterprise?.certificationStatusCode
    ?? profile.enterprise?.certificationStatus
    ?? 'NOT_SUBMITTED';

  return {
    ...profile,
    roleCode: profile.roleCode as AuthRole,
    enterprise: profile.enterprise
      ? {
          ...profile.enterprise,
          certificationStatusCode: certificationCode,
          certificationStatus: certificationStatusLabel(certificationCode),
        }
      : null,
  };
}

function certificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_SUBMITTED: '未提交',
    PENDING: '待审核',
    APPROVED: '审核通过',
    REJECTED: '审核驳回',
  };

  return labels[status] ?? status;
}

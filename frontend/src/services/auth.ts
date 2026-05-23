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
    return localStorage.getItem(AUTH_KEYS_BY_ROLE[role].tokenKey) ?? getLegacyAuthToken(role);
  }

  return localStorage.getItem(ENTERPRISE_AUTH_TOKEN_KEY)
    ?? localStorage.getItem(ADMIN_AUTH_TOKEN_KEY)
    ?? localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthProfile(role?: AuthRole): AuthProfile | null {
  if (role) {
    return readAuthProfile(AUTH_KEYS_BY_ROLE[role].profileKey) ?? getLegacyAuthProfile(role);
  }

  return readAuthProfile(ENTERPRISE_AUTH_PROFILE_KEY)
    ?? readAuthProfile(ADMIN_AUTH_PROFILE_KEY)
    ?? readAuthProfile(AUTH_PROFILE_KEY);
}

function getLegacyAuthToken(role: AuthRole): string | null {
  const profile = readAuthProfile(AUTH_PROFILE_KEY);

  return profile?.roleCode === role ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

function getLegacyAuthProfile(role: AuthRole): AuthProfile | null {
  const profile = readAuthProfile(AUTH_PROFILE_KEY);

  return profile?.roleCode === role ? profile : null;
}

function readAuthProfile(key: string): AuthProfile | null {
  const raw = localStorage.getItem(key);

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

  localStorage.setItem(keys.tokenKey, result.accessToken);
  localStorage.setItem(keys.profileKey, JSON.stringify(profile));
  notifyAuthSessionChanged();
}

export function clearAuthSession(role?: AuthRole): void {
  if (role) {
    const keys = AUTH_KEYS_BY_ROLE[role];
    localStorage.removeItem(keys.tokenKey);
    localStorage.removeItem(keys.profileKey);

    if (getLegacyAuthProfile(role)) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_PROFILE_KEY);
    }

    if (role === 'ENTERPRISE') {
      localStorage.removeItem('portalEnterpriseLoggedIn');
    }

    notifyAuthSessionChanged();
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_PROFILE_KEY);
  localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_AUTH_PROFILE_KEY);
  localStorage.removeItem(ENTERPRISE_AUTH_TOKEN_KEY);
  localStorage.removeItem(ENTERPRISE_AUTH_PROFILE_KEY);
  localStorage.removeItem('portalEnterpriseLoggedIn');
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

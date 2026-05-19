export const AUTH_TOKEN_KEY = 'huaningAuthToken';
export const AUTH_PROFILE_KEY = 'huaningAuthProfile';
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

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthProfile(): AuthProfile | null {
  const raw = localStorage.getItem(AUTH_PROFILE_KEY);

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
  localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalizeProfile(result.profile)));
  notifyAuthSessionChanged();
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_PROFILE_KEY);
  localStorage.removeItem('portalEnterpriseLoggedIn');
  notifyAuthSessionChanged();
}

export function isLoggedInAs(role?: AuthRole): boolean {
  const profile = getAuthProfile();

  if (!getAuthToken() || !profile) {
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

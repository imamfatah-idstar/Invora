export type Role = "admin" | "petugas" | "checker";

export type UserProfile = {
  email: string;
  nama: string;
  panggilan: string;
  roles: Role[];
  primaryRole: Role;
};

/**
 * Daftar pengguna resmi yang memiliki hak akses role INVORA:
 * 1. Checker (Hanya 2 email): dewi.ani@idstar.group, muhammad.miqdam@idstar.group
 * 2. Input/Petugas (Hanya 3 email): imam.fatah@idstar.group, nitia.cahyaningrum@idstar.group, rihhadatul.syam@idstar.group
 * 3. Admin (Hanya 2 email): dewi.ani@idstar.group, imam.fatah@idstar.group
 * Serta akun Demo: admin@contoh.local, checker@contoh.local, petugas@contoh.local
 */
export const AUTHORIZED_USERS: Record<string, UserProfile> = {
  "dewi.ani@idstar.group": {
    email: "dewi.ani@idstar.group",
    nama: "Dewi Ani",
    panggilan: "Dewi",
    roles: ["checker", "admin"],
    primaryRole: "checker",
  },
  "muhammad.miqdam@idstar.group": {
    email: "muhammad.miqdam@idstar.group",
    nama: "Muhammad Miqdam",
    panggilan: "Miqdam",
    roles: ["checker"],
    primaryRole: "checker",
  },
  "imam.fatah@idstar.group": {
    email: "imam.fatah@idstar.group",
    nama: "Imam Fatah",
    panggilan: "Imam",
    roles: ["petugas", "admin"],
    primaryRole: "admin",
  },
  "imam.fatah2@idstar.group": {
    email: "imam.fatah2@idstar.group",
    nama: "Imam Fatah",
    panggilan: "Imam",
    roles: ["petugas", "admin"],
    primaryRole: "admin",
  },
  "nitia.cahyaningrum@idstar.group": {
    email: "nitia.cahyaningrum@idstar.group",
    nama: "Nitia Cahyaningrum",
    panggilan: "Nitia",
    roles: ["petugas"],
    primaryRole: "petugas",
  },
  "rihhadatul.syam@idstar.group": {
    email: "rihhadatul.syam@idstar.group",
    nama: "Rihhadatul Syam",
    panggilan: "Riri",
    roles: ["petugas"],
    primaryRole: "petugas",
  },
  // Demo accounts (kata 'Contoh' dihilangkan sesuai permintaan user)
  "admin@contoh.local": {
    email: "admin@contoh.local",
    nama: "Admin",
    panggilan: "Admin",
    roles: ["admin"],
    primaryRole: "admin",
  },
  "checker@contoh.local": {
    email: "checker@contoh.local",
    nama: "Checker",
    panggilan: "Checker",
    roles: ["checker"],
    primaryRole: "checker",
  },
  "petugas@contoh.local": {
    email: "petugas@contoh.local",
    nama: "Petugas",
    panggilan: "Petugas",
    roles: ["petugas"],
    primaryRole: "petugas",
  },
  "multi@contoh.local": {
    email: "multi@contoh.local",
    nama: "Demo Multi-Role",
    panggilan: "Demo",
    roles: ["admin", "petugas", "checker"],
    primaryRole: "admin",
  },
};

export function parseRoles(roleStr?: string | null): Role[] {
  if (!roleStr) return ["petugas"];
  const list = roleStr
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r): r is Role => ["admin", "petugas", "checker"].includes(r));
  return list.length > 0 ? Array.from(new Set(list)) : ["petugas"];
}

export function getAllUserRoles(user: { email: string; role?: string | null }): Role[] {
  const profile = getAuthorizedProfile(user.email);
  const dbRoles = parseRoles(user.role);
  const combined = new Set<Role>();

  if (profile?.roles) {
    profile.roles.forEach((r) => combined.add(r));
  }
  dbRoles.forEach((r) => combined.add(r));

  return combined.size > 0 ? Array.from(combined) : ["petugas"];
}

export function getAuthorizedProfile(email?: string | null): UserProfile | null {
  if (!email) return null;
  return AUTHORIZED_USERS[email.toLowerCase().trim()] || null;
}

export function isAuthorizedForRole(
  target: string | { email: string; role?: string | null } | null | undefined,
  role: Role
): boolean {
  if (!target) return false;
  if (typeof target === "string") {
    const profile = getAuthorizedProfile(target);
    if (profile?.roles.includes(role)) return true;
    return false;
  }
  const allRoles = getAllUserRoles(target);
  return allRoles.includes(role);
}

export function getGreetingName(email?: string | null, rawName?: string | null): string {
  if (email) {
    const profile = getAuthorizedProfile(email);
    if (profile?.panggilan) return profile.panggilan;
  }
  if (!rawName) return "User";
  const cleaned = rawName.replace(/\b(Contoh|contoh)\b/gi, "").trim();
  const firstWord = cleaned.split(/\s+/)[0];
  return firstWord || "User";
}

export function getCleanDisplayName(email?: string | null, rawName?: string | null): string {
  if (email) {
    const profile = getAuthorizedProfile(email);
    if (profile?.nama) return profile.nama;
  }
  if (!rawName) return "User";
  return rawName.replace(/\b(Contoh|contoh)\b/gi, "").trim() || rawName;
}


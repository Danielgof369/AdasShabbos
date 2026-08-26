import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import type { Shul } from "@prisma/client";

// ---------- per-shul admin ----------
// Each shul has its own password; the cookie stores the shul's adminHash so
// logging into one shul grants nothing at any other shul.
const SHUL_COOKIE = "elul_admin";

export function shulAdminHash(slug: string, password: string): string {
  return createHash("sha256").update(`elul:${slug}:${password}`).digest("hex");
}

export async function isAdmin(shul: Shul): Promise<boolean> {
  const store = await cookies();
  return store.get(SHUL_COOKIE)?.value === shul.adminHash;
}

export async function grantAdmin(shul: Shul, password: string): Promise<boolean> {
  if (shulAdminHash(shul.slug, password) !== shul.adminHash) return false;
  const store = await cookies();
  store.set(SHUL_COOKIE, shul.adminHash, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return true;
}

export async function revokeAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(SHUL_COOKIE);
}

// ---------- platform admin (creates and manages shuls) ----------
const PLATFORM_COOKIE = "elul_platform";

function platformToken(): string {
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? "change-me";
  return createHash("sha256").update(`elul-platform:${password}`).digest("hex");
}

export async function isPlatformAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(PLATFORM_COOKIE)?.value === platformToken();
}

export async function grantPlatformAdmin(password: string): Promise<boolean> {
  if (password !== (process.env.PLATFORM_ADMIN_PASSWORD ?? "change-me")) return false;
  const store = await cookies();
  store.set(PLATFORM_COOKIE, platformToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return true;
}

export async function revokePlatformAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(PLATFORM_COOKIE);
}

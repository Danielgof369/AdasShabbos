import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Shul } from "@prisma/client";

/**
 * Tenant resolution. The platform lives at ROOT_DOMAIN (the national
 * landing page, /start, /shuls, /platform). Each shul lives at
 * <slug>.<ROOT_DOMAIN> or its own custom domain.
 *
 * Resolution order for an incoming host:
 *   1. exact customDomain match ("shabboswithadas.com")
 *   2. subdomain of ROOT_DOMAIN ("adas.kabbalasshabbos.com" -> "adas")
 *   3. the bare root domain (or www.) -> no shul: national pages
 *   4. anything else (localhost, *.vercel.app previews) -> DEFAULT_SHUL_SLUG
 *      if set, otherwise national pages
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kabbalasshabbos.com")
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const DEFAULT_SLUG = process.env.DEFAULT_SHUL_SLUG?.trim() || null;

function normalizeHost(host: string | null): string {
  return (host ?? "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

export function isRootHost(hostHeader: string | null): boolean {
  return normalizeHost(hostHeader) === ROOT_DOMAIN;
}

/** Subdomain slug for a host under ROOT_DOMAIN, or null. */
export function slugFromHost(hostHeader: string | null): string | null {
  const host = normalizeHost(hostHeader);
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
  return slug && !slug.includes(".") ? slug : null;
}

export async function findShulByHost(hostHeader: string | null): Promise<Shul | null> {
  const host = normalizeHost(hostHeader);
  if (host) {
    const byDomain = await prisma.shul.findFirst({
      where: { customDomain: host, active: true },
    });
    if (byDomain) return byDomain;

    const slug = slugFromHost(hostHeader);
    if (slug) {
      return prisma.shul.findFirst({ where: { slug, active: true } });
    }
    if (host === ROOT_DOMAIN) return null;
  }
  if (!DEFAULT_SLUG) return null;
  return prisma.shul.findFirst({ where: { slug: DEFAULT_SLUG, active: true } });
}

/** The current request's shul, or null on the national/root host. */
export const currentShul = cache(async (): Promise<Shul | null> => {
  const h = await headers();
  return findShulByHost(h.get("host"));
});

/** The current request's shul; shul-only pages bounce to the national
 * landing when there isn't one (root domain, unknown subdomain). */
export const getShul = cache(async (): Promise<Shul> => {
  const shul = await currentShul();
  if (!shul) redirect("/");
  return shul;
});

/** Was this request for a subdomain that doesn't exist (or is switched off)? */
export async function unknownSubdomain(): Promise<string | null> {
  const h = await headers();
  const slug = slugFromHost(h.get("host"));
  if (!slug) return null;
  return (await currentShul()) ? null : slug;
}

function devPort(): string {
  return process.env.PORT ?? "3000";
}

/** Public base URL of the national site. */
export function rootBaseUrl(): string {
  if (process.env.NODE_ENV !== "production" || ROOT_DOMAIN === "localhost") {
    return `http://${ROOT_DOMAIN}:${devPort()}`;
  }
  return `https://${ROOT_DOMAIN}`;
}

/** Public base URL for a shul (used in emails and blast texts). */
export function shulBaseUrl(shul: Pick<Shul, "slug" | "customDomain">): string {
  if (shul.customDomain) return `https://${shul.customDomain}`;
  if (process.env.NODE_ENV !== "production" || ROOT_DOMAIN === "localhost") {
    return `http://${shul.slug}.${ROOT_DOMAIN}:${devPort()}`;
  }
  return `https://${shul.slug}.${ROOT_DOMAIN}`;
}

export type { Shul };

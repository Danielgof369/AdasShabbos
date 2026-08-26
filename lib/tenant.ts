import { headers } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Shul } from "@prisma/client";

/**
 * v2 tenant resolution. Each shul lives at <slug>.<ROOT_DOMAIN> or its own
 * custom domain. Resolution order for an incoming host:
 *   1. exact customDomain match ("shabboswithadas.com")
 *   2. subdomain of ROOT_DOMAIN ("adas.theelulshabbosproject.com" -> "adas")
 *   3. DEFAULT_SHUL_SLUG fallback (root domain, previews, localhost)
 */
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "theelulshabbosproject.com")
  .toLowerCase()
  .replace(/\/$/, "");
const DEFAULT_SLUG = process.env.DEFAULT_SHUL_SLUG ?? "adas";

function normalizeHost(host: string | null): string {
  return (host ?? "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

export async function findShulByHost(hostHeader: string | null): Promise<Shul | null> {
  const host = normalizeHost(hostHeader);
  if (host) {
    const byDomain = await prisma.shul.findFirst({
      where: { customDomain: host, active: true },
    });
    if (byDomain) return byDomain;

    if (host.endsWith(`.${ROOT_DOMAIN}`)) {
      const slug = host.slice(0, -(ROOT_DOMAIN.length + 1));
      if (slug && !slug.includes(".")) {
        const bySlug = await prisma.shul.findFirst({ where: { slug, active: true } });
        if (bySlug) return bySlug;
      }
    }
  }
  return prisma.shul.findFirst({ where: { slug: DEFAULT_SLUG, active: true } });
}

/** The current request's shul (cached per render). Throws if none exists —
 * the platform admin must create the first shul at /platform. */
export const getShul = cache(async (): Promise<Shul> => {
  const h = await headers();
  const shul = await findShulByHost(h.get("host"));
  if (!shul) {
    throw new Error(
      "No shul configured for this domain — create one at /platform."
    );
  }
  return shul;
});

/** Public base URL for a shul (used in emails and blast texts). */
export function shulBaseUrl(shul: Shul): string {
  if (shul.customDomain) return `https://${shul.customDomain}`;
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT ?? "3000";
    return `http://${shul.slug}.localhost:${port}`;
  }
  return `https://${shul.slug}.${ROOT_DOMAIN}`;
}

export type { Shul };

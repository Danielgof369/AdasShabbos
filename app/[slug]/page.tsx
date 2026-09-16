import { prisma } from "@/lib/db";
import { PLATFORM } from "@/lib/platform";
import ShulPage from "@/components/national/ShulPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shul = await prisma.shul.findUnique({ where: { slug }, select: { name: true } });
  return { title: shul ? `${shul.name} | ${PLATFORM.name}` : PLATFORM.name };
}

/** A participating shul's own page: kabalosshabbos.com/<slug>. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ShulPage slug={(await params).slug} />;
}

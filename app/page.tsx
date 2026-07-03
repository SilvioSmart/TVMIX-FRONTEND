import { HomePage } from "@/components/HomePage";
import { getHomeContent } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await getHomeContent();

  return <HomePage content={content} />;
}

import { HomePage } from "@/components/HomePage";
import { getHomeContent } from "@/lib/api";

export default async function PreviewPage() {
  const content = await getHomeContent();
  return <HomePage content={content} />;
}

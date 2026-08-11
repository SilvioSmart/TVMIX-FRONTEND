import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("assistenza");

export default function Page() {
  return <StaticInfoPage slug="assistenza" />;
}

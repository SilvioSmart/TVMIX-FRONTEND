import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("privacy-policy");

export default function Page() {
  return <StaticInfoPage slug="privacy-policy" />;
}

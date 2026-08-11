import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("chi-siamo");

export default function Page() {
  return <StaticInfoPage slug="chi-siamo" />;
}

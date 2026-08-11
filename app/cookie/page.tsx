import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("cookie");

export default function Page() {
  return <StaticInfoPage slug="cookie" />;
}

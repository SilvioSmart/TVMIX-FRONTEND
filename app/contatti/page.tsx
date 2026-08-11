import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("contatti");

export default function Page() {
  return <StaticInfoPage slug="contatti" />;
}

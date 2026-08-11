import { StaticInfoPage, generateStaticInfoMetadata } from "@/components/StaticInfoPage";

export const dynamic = "force-dynamic";

export const generateMetadata = () => generateStaticInfoMetadata("lavora-con-noi");

export default function Page() {
  return <StaticInfoPage slug="lavora-con-noi" />;
}

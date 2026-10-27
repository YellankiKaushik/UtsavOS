import { Planner } from "@/components/planner";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return <Planner path={path} />;
}

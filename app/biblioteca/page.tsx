import { redirect } from "next/navigation";
import { buildBibliotecaStudioUrl } from "@/lib/biblioteca-routing";

type BibliotecaPageProps = {
  searchParams: Promise<{
    project?: string;
    asset?: string;
  }>;
};

export default async function BibliotecaPage({ searchParams }: BibliotecaPageProps) {
  const params = await searchParams;
  redirect(
    buildBibliotecaStudioUrl({
      projectId: params.project,
      assetId: params.asset,
    }),
  );
}

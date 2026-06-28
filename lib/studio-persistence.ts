import {
  buildAutoProjectName,
  createBibliotecaProject,
  saveBibliotecaAssets,
  updateBibliotecaAsset,
  updateBibliotecaProject,
  type BibliotecaAsset,
  type PersistStudioAssetInput,
  type StudioProjectMetadata,
} from "@/lib/biblioteca";
import {
  dataUrlToBlob,
  inferExtensionFromMime,
  uploadLibraryObject,
} from "@/lib/library-storage";

export type PersistStudioCreationInput = {
  userId: string;
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
  mode: PersistStudioAssetInput["mode"];
  projectMetadata: StudioProjectMetadata;
  existingProjectId?: string | null;
  existingAssetId?: string | null;
};

export type PersistStudioCreationResult = {
  projectId: string;
  assetId: string;
  asset: BibliotecaAsset;
};

export async function persistStudioCreation(
  input: PersistStudioCreationInput,
): Promise<PersistStudioCreationResult> {
  let projectId = input.existingProjectId ?? null;
  let assetId = input.existingAssetId ?? null;

  if (!projectId) {
    const project = await createBibliotecaProject(
      buildAutoProjectName(input.customerIntent),
      input.projectMetadata,
    );
    projectId = project.id;
  } else {
    await updateBibliotecaProject(projectId, input.projectMetadata);
  }

  const originalExtension =
    inferExtensionFromMime(input.originalFile.type || "image/jpeg") || "jpg";

  if (!assetId) {
    const [asset] = await saveBibliotecaAssets([
      {
        project_id: projectId,
        original_name: input.originalFile.name,
        image_url: input.enhancedDataUrl,
        mode: input.mode,
        ai_instructions: input.customerIntent || null,
        image_prompt: input.imagePrompt,
        video_prompt: input.videoPrompt,
        workflow_id: input.projectMetadata.workflow_id ?? null,
        industry: input.projectMetadata.industry ?? null,
        payment_status: "none",
      },
    ]);
    assetId = asset.id;
  }

  const originalUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId,
    assetId,
    kind: "original",
    file: input.originalFile,
    contentType: input.originalFile.type || "image/jpeg",
    extension: originalExtension,
  });

  const enhancedBlob = dataUrlToBlob(input.enhancedDataUrl);
  const enhancedUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId,
    assetId,
    kind: "enhanced",
    file: enhancedBlob,
    contentType: enhancedBlob.type || "image/png",
    extension: inferExtensionFromMime(enhancedBlob.type || "image/png"),
  });

  let teaserUpdates: Partial<BibliotecaAsset> = {
    original_path: originalUpload.path,
    image_path: enhancedUpload.path,
    image_url: input.enhancedDataUrl,
    image_prompt: input.imagePrompt,
    video_prompt: input.videoPrompt,
    ai_instructions: input.customerIntent || null,
  };

  if (input.teaserVideoBlob) {
    const teaserUpload = await uploadLibraryObject({
      userId: input.userId,
      projectId,
      assetId,
      kind: "teaser",
      file: input.teaserVideoBlob,
      contentType: "video/mp4",
      extension: "mp4",
    });

    teaserUpdates = {
      ...teaserUpdates,
      teaser_video_path: teaserUpload.path,
    };
  }

  const asset = await updateBibliotecaAsset(assetId, teaserUpdates);

  return { projectId, assetId, asset };
}

export async function persistPremiumVideo(
  input: {
    userId: string;
    projectId: string;
    assetId: string;
    premiumVideoBlob: Blob;
  },
): Promise<BibliotecaAsset> {
  const premiumUpload = await uploadLibraryObject({
    userId: input.userId,
    projectId: input.projectId,
    assetId: input.assetId,
    kind: "premium",
    file: input.premiumVideoBlob,
    contentType: "video/mp4",
    extension: "mp4",
  });

  return updateBibliotecaAsset(input.assetId, {
    premium_video_path: premiumUpload.path,
    payment_status: "paid",
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VIDEO_SRC =
  "/api/video-test/stream?projectId=51&assetId=45&mediaType=teaser";

export default function VideoTestPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Video Test — Project 51 / Asset 45</h1>
      <video controls playsInline src={VIDEO_SRC} style={{ maxWidth: "100%" }} />
    </main>
  );
}

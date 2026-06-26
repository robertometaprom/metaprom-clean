"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

export default function VideoTestPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "Cinematic product showcase with smooth camera movement and professional lighting.",
  );
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }

    setImageFile(file);
    setVideoUrl(null);
    setError(null);
    setStatusMessage(null);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
    event.target.value = "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!imageFile) {
      setError("Please upload an image.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Generating video with Veo 3.1. This usually takes 1–3 minutes...");
    setVideoUrl(null);

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt.trim());

      const response = await fetch("/api/video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = `Request failed (${response.status}).`;

        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // Response body is not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const nextVideoUrl = URL.createObjectURL(blob);
      videoUrlRef.current = nextVideoUrl;
      setVideoUrl(nextVideoUrl);
      setStatusMessage("Video generated successfully.");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Video generation failed.";

      setError(message);
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: "0 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Veo 3.1 Integration Test</h1>
      <p style={{ color: "#555" }}>
        Temporary POC page. Upload an image, enter a prompt, and generate a video.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span>Image</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        {imagePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreviewUrl}
            alt="Upload preview"
            style={{ maxWidth: "100%", borderRadius: 8 }}
          />
        ) : null}

        <label style={{ display: "grid", gap: 8 }}>
          <span>Prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button type="submit" disabled={loading || !imageFile}>
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </form>

      {statusMessage ? <p style={{ marginTop: 16 }}>{statusMessage}</p> : null}
      {error ? <p style={{ marginTop: 16, color: "#b00020" }}>{error}</p> : null}

      {videoUrl ? (
        <section style={{ marginTop: 24 }}>
          <h2>Generated Video</h2>
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{ width: "100%", borderRadius: 8, background: "#000" }}
          />
        </section>
      ) : null}
    </main>
  );
}

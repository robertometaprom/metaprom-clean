"use client";

import SocialPostCard from "@/components/studio/SocialPostCard";
import { SOCIAL_POSTS } from "@/lib/studio-atmosphere";

type StudioAtmosphereProps = {
  children?: React.ReactNode;
};

export default function StudioAtmosphere({ children }: StudioAtmosphereProps) {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 lg:min-h-[540px] lg:px-8">
      {SOCIAL_POSTS.map((post) => (
        <SocialPostCard key={post.id} post={post} />
      ))}
      {children}
    </div>
  );
}

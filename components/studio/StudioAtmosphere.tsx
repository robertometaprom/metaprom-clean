"use client";

type StudioAtmosphereProps = {
  children?: React.ReactNode;
};

export default function StudioAtmosphere({ children }: StudioAtmosphereProps) {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 lg:px-8">
      {children}
    </div>
  );
}

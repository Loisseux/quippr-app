import { useEffect } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      void navigate({ to: "/app", replace: true });
    }
  }, [isNative, navigate]);

  if (isNative) {
    return (
      <div className="fc-app-shell mx-auto flex w-full max-w-[430px] flex-col items-center justify-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl fc-gradient text-2xl">
          ✨
        </div>
        <p className="text-sm font-medium text-white/70">Opening Quippr…</p>
        {/* Fallback link if client navigation stalls */}
        <Navigate to="/app" replace />
      </div>
    );
  }

  return <LandingPage />;
}

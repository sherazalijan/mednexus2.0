import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PortalSkeleton } from "@/components/mednexus/PortalSkeleton";

export const Route = createFileRoute("/student/")({
  component: StudentIndex,
});

function StudentIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/student/dashboard", replace: true });
  }, [navigate]);
  return <PortalSkeleton />;
}

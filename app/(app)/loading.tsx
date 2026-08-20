import { LoadingScreen } from "@/components/ui/loading-screen";

// Streams while an (app) route's data resolves — e.g. the dashboard right
// after sign-in. The header shell in layout.tsx stays put around it.
export default function Loading() {
  return <LoadingScreen label="Loading your incidents…" />;
}

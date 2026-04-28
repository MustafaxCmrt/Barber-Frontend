import { Toaster } from "@/lib/toast";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}

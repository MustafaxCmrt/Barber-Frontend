import toast, { Toaster as HotToaster } from "react-hot-toast";

/**
 * react-hot-toast wrapper'ı. Tema: charcoal arka plan + oldGold accent (Bölüm 10.2).
 * Kullanım:
 *   import { notify } from "@/lib/toast";
 *   notify.success("Randevu oluşturuldu");
 */
export const notify = {
  success(message: string) {
    return toast.success(message);
  },
  error(message: string) {
    return toast.error(message);
  },
  info(message: string) {
    return toast(message);
  },
  loading(message: string) {
    return toast.loading(message);
  },
  dismiss(id?: string) {
    return toast.dismiss(id);
  },
};

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={12}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1A1A1A",
          color: "#FAFAFA",
          fontFamily: '"Montserrat", system-ui, sans-serif',
          fontSize: "0.875rem",
          padding: "12px 16px",
          borderRadius: "0.75rem",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.25)",
          maxWidth: "420px",
        },
        success: {
          iconTheme: {
            primary: "#16A34A",
            secondary: "#FFFFFF",
          },
        },
        error: {
          duration: 5500,
          iconTheme: {
            primary: "#DC2626",
            secondary: "#FFFFFF",
          },
        },
        loading: {
          iconTheme: {
            primary: "#D4AF37",
            secondary: "#1A1A1A",
          },
        },
      }}
    />
  );
}

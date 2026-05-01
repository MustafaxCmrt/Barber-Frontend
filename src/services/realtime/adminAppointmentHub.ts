import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

/**
 * Admin canlı randevu bildirimi — SignalR Hub bağlantı yöneticisi.
 *
 * Tek bir HubConnection instance tutuyoruz; login süresince ayakta.
 * Logout veya 401 sırasında stop + reset.
 *
 * Sözleşme (backend tarafından sabitlendi):
 *   Hub URL: ${VITE_API_BASE}/hubs/admin-appointments
 *   Auth:    accessTokenFactory (?access_token=<JWT> query string'i SignalR
 *            kütüphanesi otomatik ekler — manuel ekleme yok)
 *   Event:   "appointmentCreated" → AppointmentCreatedNotification
 *
 * Auto-reconnect [0, 2s, 5s, 10s, 30s] backoff. Reconnect sırasında
 * accessTokenFactory yeniden çağrılır; bu yüzden token store'undan canlı
 * okuyan callback geçirmek ŞART.
 */

export interface AppointmentCreatedNotification {
  appointmentId: string;
  barberName: string;
  customerFullName: string;
  /** LOCAL ISO datetime (Z'siz). formatLocalDateTime ile gösterilir. */
  startTime: string;
}

type AppointmentCreatedHandler = (
  payload: AppointmentCreatedNotification,
) => void;
type ReconnectedHandler = () => void;
type AuthErrorHandler = () => void;

let connection: HubConnection | null = null;
const appointmentCreatedHandlers = new Set<AppointmentCreatedHandler>();
const reconnectedHandlers = new Set<ReconnectedHandler>();
const authErrorHandlers = new Set<AuthErrorHandler>();

function buildConnection(getToken: () => string | null): HubConnection {
  // Aynı default'u axios client (api/client.ts) kullanıyor — env yoksa
  // dev backend'i. Yoksa relative URL olur ve Vite'ın 5173 portuna düşer.
  const baseUrl =
    (import.meta.env.VITE_API_BASE as string | undefined) ||
    "http://localhost:5157";
  const hubUrl = `${baseUrl}/hubs/admin-appointments`;

  const conn = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getToken() ?? "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();

  // Hub event'i tek noktadan dispatch; subscribe* fonksiyonları abonelik yönetir.
  conn.on("appointmentCreated", (payload: AppointmentCreatedNotification) => {
    appointmentCreatedHandlers.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.error("[realtime] appointmentCreated handler threw", err);
      }
    });
  });

  conn.onreconnected(() => {
    reconnectedHandlers.forEach((h) => {
      try {
        h();
      } catch (err) {
        console.error("[realtime] onreconnected handler threw", err);
      }
    });
  });

  // Reconnect denemeleri tükendiğinde veya server kapattığında çalışır.
  // 401 / Unauthorized → SecurityStamp rotate olmuş ya da token süresi dolmuş.
  conn.onclose((error) => {
    console.warn("[realtime] connection closed", error);
    const msg = error?.message ?? "";
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      authErrorHandlers.forEach((h) => {
        try {
          h();
        } catch (err) {
          console.error("[realtime] onclose auth handler threw", err);
        }
      });
    }
  });

  return conn;
}

export function getAdminAppointmentConnection(
  getToken: () => string | null,
): HubConnection {
  if (connection) return connection;
  connection = buildConnection(getToken);
  return connection;
}

export async function startAdminAppointmentConnection(
  conn: HubConnection,
): Promise<void> {
  if (conn.state === HubConnectionState.Disconnected) {
    await conn.start();
  }
}

export async function stopAdminAppointmentConnection(): Promise<void> {
  const conn = connection;
  connection = null;
  appointmentCreatedHandlers.clear();
  reconnectedHandlers.clear();
  authErrorHandlers.clear();
  if (conn && conn.state !== HubConnectionState.Disconnected) {
    try {
      await conn.stop();
    } catch (err) {
      console.warn("[realtime] stop failed", err);
    }
  }
}

export function subscribeAppointmentCreated(
  handler: AppointmentCreatedHandler,
): () => void {
  appointmentCreatedHandlers.add(handler);
  return () => {
    appointmentCreatedHandlers.delete(handler);
  };
}

export function subscribeReconnected(handler: ReconnectedHandler): () => void {
  reconnectedHandlers.add(handler);
  return () => {
    reconnectedHandlers.delete(handler);
  };
}

export function subscribeAuthError(handler: AuthErrorHandler): () => void {
  authErrorHandlers.add(handler);
  return () => {
    authErrorHandlers.delete(handler);
  };
}

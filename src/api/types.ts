/**
 * Referans: frontenddöküman.md — Bölüm 3, 5, 6, 7
 *
 * Önemli notlar:
 * - Backend listesi GET endpoint'lerinde QUERY parametreleri PascalCase
 *   (Page, PageSize, Search, IsActive, BarberId, ...).
 * - Body alanları camelCase (barberId, customerFullName, ...).
 * - Tarih alanları: appointment.startTime/endTime → LOCAL DateTime (Z'siz),
 *   createdAt/updatedAt/expiresAtUtc → UTC (Z'li).
 *   Detay: frontenddöküman.md Bölüm 9.
 */

// ============================================================
// Pagination
// ============================================================

export interface PagedRequest {
  Page?: number;
  PageSize?: number;
  Search?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================
// RFC 7807 — Problem Details
// ============================================================

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
  // ASP.NET bazen "extensions" yerine üst seviyede ek alanlar koyabiliyor
  [key: string]: unknown;
}

/**
 * Frontend interceptor 400 ValidationException'ı bu shape'e normalize eder.
 * react-hook-form ile entegre edilirken kullanılır.
 */
export interface FieldErrors {
  fieldErrors: Record<string, string[]>;
}

// ============================================================
// Auth (Bölüm 3)
// ============================================================

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface TokenResponseDto {
  accessToken: string;
  expiresAtUtc: string; // ISO UTC ("...Z")
  username: string;
}

export interface MeResponseDto {
  adminId: string;
  username: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeUsernameDto {
  currentPassword: string;
  newUsername: string;
}

export interface MessageResponse {
  message: string;
}

export interface CreatedResponse {
  message: string;
  id: string;
}

// ============================================================
// Public Barber / Service (Bölüm 6.1 – 6.4)
// ============================================================

export interface PublicBarberDto {
  id: string;
  fullName: string;
  specialty: string | null;
  photoUrl: string | null;
  bio: string | null;
}

export interface PublicServiceDto {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface PublicBarberDetailDto extends PublicBarberDto {
  services: PublicServiceDto[];
}

export interface PublicBarbersQuery extends PagedRequest {}
export interface PublicServicesQuery extends PagedRequest {}

// ============================================================
// Public Slot / Appointment (Bölüm 6.5 – 6.8)
// ============================================================

export interface SlotQueryDto {
  barberId: string;
  date: string; // "YYYY-MM-DD" (DateOnly)
  serviceIds: string[];
}

export interface AvailableSlotsDto {
  date: string; // "YYYY-MM-DD"
  totalDurationMinutes: number;
  /**
   * O tarihte berber çalışıyor mu? Cascade: leave > schedule > shop default.
   * false ise frontend tüm slotları CLOSED göstermelidir.
   */
  isWorking: boolean;
  /** Çalışma başlangıcı, TimeOnly. Default ".NET 8" → "HH:mm:ss" döner. */
  openTime: string;
  /** Çalışma bitişi, TimeOnly ("HH:mm:ss" / "HH:mm"). */
  closeTime: string;
  /** Slot adımı (default 15). */
  slotMinutes: number;
  /** Müsait slotlar, TimeOnly ("HH:mm:ss" / "HH:mm"). */
  slots: string[];
}

export interface CreateAppointmentDto {
  barberId: string;
  serviceIds: string[];
  /**
   * LOCAL ISO (Z OLMADAN) — örn. "2026-05-01T14:00:00".
   * Detay: frontenddöküman.md Bölüm 9.2.
   */
  startTime: string;
  customerFullName: string;
  customerPhone: string; // 11 hane, /^0[5][0-9]{9}$/
  notes?: string;
}

export interface AppointmentLookupRequestDto {
  phone: string;
}

export interface CancelAppointmentDto {
  phone: string;
}

/**
 * Lookup response — string status döner (Bölüm 6.7).
 * Admin endpoint'i ise int (Bölüm 7.3).
 */
export interface AppointmentLookupItemDto {
  id: string;
  barberName: string;
  startTime: string; // LOCAL
  endTime: string; // LOCAL
  totalPrice: number;
  totalDurationMinutes: number;
  status: AppointmentStatusName;
  serviceNames: string[];
}

// ============================================================
// Admin Barbers (Bölüm 7.1)
// ============================================================

export interface BarberSummaryDto {
  id: string;
  fullName: string;
  specialty: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

export interface BarberServiceDto {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface BarberDetailDto {
  id: string;
  fullName: string;
  specialty: string | null;
  photoUrl: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string; // UTC
  updatedAt: string | null; // UTC
  services: BarberServiceDto[];
}

export interface CreateBarberDto {
  fullName: string;
  specialty?: string;
  photoUrl?: string;
  bio?: string;
}

export interface UpdateBarberDto {
  fullName: string;
  specialty?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  isActive: boolean;
}

export interface AssignServicesDto {
  serviceIds: string[];
}

export interface AdminBarbersQuery extends PagedRequest {
  IsActive?: boolean;
}

// ============================================================
// Admin Barber Schedule (Bölüm 7.1)
// ============================================================

/**
 * .NET DayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday.
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface BarberScheduleDayDto {
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime: string | null; // "HH:mm"
  endTime: string | null; // "HH:mm"
}

export interface BarberScheduleDto {
  barberId: string;
  barberFullName: string;
  days: BarberScheduleDayDto[]; // 7 entry
}

export interface UpdateBarberScheduleDto {
  days: BarberScheduleDayDto[];
}

// ============================================================
// Admin Barber Leaves (Bölüm 7.1)
// ============================================================

export interface BarberLeaveDto {
  id: string;
  barberId: string;
  date: string; // "YYYY-MM-DD"
  reason: string | null;
  createdAt: string; // UTC
}

export interface CreateBarberLeaveDto {
  date: string; // "YYYY-MM-DD"
  reason?: string;
}

export interface BarberLeavesQuery {
  from?: string; // "YYYY-MM-DD"
  to?: string; // "YYYY-MM-DD"
}

// ============================================================
// Admin Services (Bölüm 7.2)
// ============================================================

export interface ServiceSummaryDto {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface ServiceDetailDto extends ServiceSummaryDto {
  createdAt: string; // UTC
  updatedAt: string | null; // UTC
}

export interface CreateServiceDto {
  name: string;
  price: number;
  durationMinutes: number;
}

export interface UpdateServiceDto {
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface AdminServicesQuery extends PagedRequest {
  IsActive?: boolean;
}

// ============================================================
// Appointment Status (Bölüm 7.3)
// ============================================================

/**
 * Backend'in admin endpoint'i int döner; lookup endpoint'i string döner.
 * Hem int hem string için iki tarafı da export ediyoruz.
 */
export const AppointmentStatus = {
  Pending: 0,
  Confirmed: 1,
  Cancelled: 2,
  Completed: 3,
  NoShow: 4,
} as const;

export type AppointmentStatusValue =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export type AppointmentStatusName = keyof typeof AppointmentStatus;

export const APPOINTMENT_STATUS_NAMES: Record<
  AppointmentStatusValue,
  AppointmentStatusName
> = {
  0: "Pending",
  1: "Confirmed",
  2: "Cancelled",
  3: "Completed",
  4: "NoShow",
};

export const APPOINTMENT_STATUS_TR: Record<AppointmentStatusName, string> = {
  Pending: "Beklemede",
  Confirmed: "Onaylandı",
  Cancelled: "İptal Edildi",
  Completed: "Tamamlandı",
  NoShow: "Gelmedi",
};

/**
 * Bölüm 7.3 — UI butonu disable etmek için izinli geçişler.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  AppointmentStatusName,
  AppointmentStatusName[]
> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled", "NoShow"],
  Cancelled: [],
  Completed: [],
  NoShow: [],
};

// ============================================================
// Admin Appointments (Bölüm 7.3)
// ============================================================

export interface AppointmentSummaryDto {
  id: string;
  barberId: string;
  barberFullName: string;
  customerFullName: string;
  customerPhone: string;
  startTime: string; // LOCAL
  endTime: string; // LOCAL
  totalPrice: number;
  totalDurationMinutes: number;
  status: AppointmentStatusValue;
}

export interface AppointmentServiceItemDto {
  serviceId: string;
  name: string;
  priceAtBooking: number;
  durationAtBookingMinutes: number;
}

export interface AppointmentDetailDto extends AppointmentSummaryDto {
  notes: string | null;
  services: AppointmentServiceItemDto[];
}

export interface UpdateAppointmentStatusDto {
  status: AppointmentStatusValue;
}

export interface AdminAppointmentsQuery extends PagedRequest {
  BarberId?: string;
  DateFrom?: string; // ISO datetime
  DateTo?: string;
  Status?: AppointmentStatusValue;
  CustomerPhone?: string;
}

// ============================================================
// Shop Settings (Bölüm 7.4)
// ============================================================

export interface ShopSettingsDto {
  defaultOpenTime: string; // "HH:mm"
  defaultCloseTime: string; // "HH:mm"
  closedDays: DayOfWeek[];
  slotMinutes: number;
  maxAppointmentsPerPhonePerDay: number;
  minCancellationHoursBefore: number;
}

export type UpdateShopSettingsDto = ShopSettingsDto;

// ============================================================
// Dashboard (Bölüm 7.5)
// ============================================================

export interface DashboardSummaryDto {
  todayAppointmentCount: number;
  todayPendingCount: number;
  todayConfirmedCount: number;
  todayCompletedCount: number;
  thisWeekAppointmentCount: number;
  thisMonthCompletedCount: number;
  thisMonthRevenue: number;
  activeBarberCount: number;
  activeServiceCount: number;
}

export interface TodayAppointmentItemDto {
  id: string;
  barberId: string;
  barberFullName: string;
  customerFullName: string;
  customerPhone: string;
  startTime: string; // LOCAL
  endTime: string; // LOCAL
  totalPrice: number;
  totalDurationMinutes: number;
  status: AppointmentStatusValue;
}

export interface RevenueTrendItemDto {
  date: string; // "YYYY-MM-DD"
  completedCount: number;
  revenue: number;
}

export interface TopServiceItemDto {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  totalRevenue: number;
}

export interface RevenueTrendQuery {
  days?: number; // default 30
}

export interface TopServicesQuery {
  limit?: number; // default 5
  days?: number; // default 30
}

// ============================================================
// Health (Bölüm 2)
// ============================================================

export interface HealthCheckEntry {
  name: string;
  status: "Healthy" | "Degraded" | "Unhealthy";
  description?: string | null;
  duration?: string;
}

export interface HealthCheckResponse {
  status: "Healthy" | "Degraded" | "Unhealthy";
  checks: HealthCheckEntry[];
  totalDuration: string;
}

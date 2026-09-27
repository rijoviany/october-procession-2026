import { StopStatus } from '../types/procession';

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch {
    return timeStr;
  }
}

export function getStatusBadge(status: StopStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'current':
      return {
        label: 'Statue Here Now',
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
      };
    case 'visited':
      return {
        label: 'Visited',
        bg: 'bg-slate-700/50',
        text: 'text-slate-400',
        border: 'border-slate-600/40',
      };
    case 'skipped':
      return {
        label: 'Skipped',
        bg: 'bg-rose-500/20',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
      };
    case 'pending':
    default:
      return {
        label: 'Upcoming',
        bg: 'bg-marian-500/20',
        text: 'text-marian-300',
        border: 'border-marian-500/40',
      };
  }
}

// Calculate distance between two coordinates in meters / km
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { meters: number; text: string } {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = Math.round(R * c);

  if (meters < 1000) {
    return { meters, text: `${meters} m` };
  }
  return { meters, text: `${(meters / 1000).toFixed(1)} km` };
}

import React from 'react';
import {
  List,
  Briefcase,
  ShoppingCart,
  BookOpen,
  Heart,
  Folder,
  Home,
  Star,
  Code,
  Coffee,
  Bookmark,
  Sparkles,
  Smile,
  Compass,
  Music,
  Film,
  Plane,
  Car,
  Trophy,
  Target,
  Zap,
  CheckSquare,
  Activity,
  Award,
  Box,
  Compass as CompassIcon,
  Flame,
  Globe,
  Headphones,
  Laptop,
  Lightbulb,
  Palette,
  Phone,
  Rocket,
  Shield,
  Smartphone,
  Tv,
  Users,
} from 'lucide-react';

export interface ListColorOption {
  id: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  textColor: string;
  bgActive: string;
  borderHover: string;
  accentBg: string;
  hex: string;
}

export const LIST_COLORS: ListColorOption[] = [
  {
    id: 'blue',
    name: 'Blue',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeText: 'text-blue-600',
    textColor: 'text-blue-600',
    bgActive: 'bg-blue-50 text-blue-800 font-semibold',
    borderHover: 'hover:border-blue-400',
    accentBg: 'bg-blue-600 text-white',
    hex: '#2563eb',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    badgeText: 'text-indigo-600',
    textColor: 'text-indigo-600',
    bgActive: 'bg-indigo-50 text-indigo-800 font-semibold',
    borderHover: 'hover:border-indigo-400',
    accentBg: 'bg-indigo-600 text-white',
    hex: '#4f46e5',
  },
  {
    id: 'violet',
    name: 'Purple',
    badgeBg: 'bg-purple-100 text-purple-800',
    badgeText: 'text-purple-600',
    textColor: 'text-purple-600',
    bgActive: 'bg-purple-50 text-purple-800 font-semibold',
    borderHover: 'hover:border-purple-400',
    accentBg: 'bg-purple-600 text-white',
    hex: '#9333ea',
  },
  {
    id: 'rose',
    name: 'Rose',
    badgeBg: 'bg-rose-100 text-rose-800',
    badgeText: 'text-rose-600',
    textColor: 'text-rose-600',
    bgActive: 'bg-rose-50 text-rose-800 font-semibold',
    borderHover: 'hover:border-rose-400',
    accentBg: 'bg-rose-600 text-white',
    hex: '#e11d48',
  },
  {
    id: 'amber',
    name: 'Amber',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeText: 'text-amber-600',
    textColor: 'text-amber-600',
    bgActive: 'bg-amber-50 text-amber-800 font-semibold',
    borderHover: 'hover:border-amber-400',
    accentBg: 'bg-amber-600 text-white',
    hex: '#d97706',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    badgeText: 'text-emerald-600',
    textColor: 'text-emerald-600',
    bgActive: 'bg-emerald-50 text-emerald-800 font-semibold',
    borderHover: 'hover:border-emerald-400',
    accentBg: 'bg-emerald-600 text-white',
    hex: '#059669',
  },
  {
    id: 'teal',
    name: 'Teal',
    badgeBg: 'bg-teal-100 text-teal-800',
    badgeText: 'text-teal-600',
    textColor: 'text-teal-600',
    bgActive: 'bg-teal-50 text-teal-800 font-semibold',
    borderHover: 'hover:border-teal-400',
    accentBg: 'bg-teal-600 text-white',
    hex: '#0d9488',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    badgeText: 'text-cyan-600',
    textColor: 'text-cyan-600',
    bgActive: 'bg-cyan-50 text-cyan-800 font-semibold',
    borderHover: 'hover:border-cyan-400',
    accentBg: 'bg-cyan-600 text-white',
    hex: '#0891b2',
  },
  {
    id: 'pink',
    name: 'Pink',
    badgeBg: 'bg-pink-100 text-pink-800',
    badgeText: 'text-pink-600',
    textColor: 'text-pink-600',
    bgActive: 'bg-pink-50 text-pink-800 font-semibold',
    borderHover: 'hover:border-pink-400',
    accentBg: 'bg-pink-600 text-white',
    hex: '#db2777',
  },
  {
    id: 'slate',
    name: 'Slate',
    badgeBg: 'bg-slate-200 text-slate-800',
    badgeText: 'text-slate-600',
    textColor: 'text-slate-600',
    bgActive: 'bg-slate-100 text-slate-900 font-semibold',
    borderHover: 'hover:border-slate-400',
    accentBg: 'bg-slate-700 text-white',
    hex: '#475569',
  },
];

export const LIST_ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  List,
  Briefcase,
  ShoppingCart,
  BookOpen,
  Heart,
  Folder,
  Home,
  Star,
  Code,
  Coffee,
  Bookmark,
  Sparkles,
  Smile,
  Compass,
  Music,
  Film,
  Plane,
  Car,
  Trophy,
  Target,
  Zap,
  CheckSquare,
  Activity,
  Award,
  Box,
  Flame,
  Globe,
  Headphones,
  Laptop,
  Lightbulb,
  Palette,
  Phone,
  Rocket,
  Shield,
  Smartphone,
  Tv,
  Users,
};

export const AVAILABLE_ICONS = Object.keys(LIST_ICONS_MAP);

export function getListColor(colorId?: string): ListColorOption {
  const found = LIST_COLORS.find((c) => c.id === colorId);
  return found || LIST_COLORS[0];
}

export function getListIcon(iconName?: string): React.ComponentType<{ className?: string }> {
  if (iconName && LIST_ICONS_MAP[iconName]) {
    return LIST_ICONS_MAP[iconName];
  }
  return List;
}

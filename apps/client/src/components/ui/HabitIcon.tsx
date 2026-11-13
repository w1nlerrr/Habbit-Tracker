import {
  Activity,
  BookOpen,
  Brain,
  Code2,
  Coffee,
  Droplet,
  Dumbbell,
  Heart,
  Music,
  Moon,
  PenLine,
  Sparkles,
  Star,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  star: Star,
  activity: Activity,
  'book-open': BookOpen,
  waves: Waves,
  droplet: Droplet,
  sun: Sun,
  moon: Moon,
  heart: Heart,
  brain: Brain,
  dumbbell: Dumbbell,
  coffee: Coffee,
  music: Music,
  pen: PenLine,
  code: Code2,
};

export const HABIT_ICON_NAMES = Object.keys(ICONS);

export const HABIT_COLORS = [
  '#6366F1',
  '#0EA5E9',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
] as const;

export function HabitIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}): React.ReactElement {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}

import Feather from '@expo/vector-icons/Feather';

const NAMES = {
  left: 'chevron-left',
  right: 'chevron-right',
  up: 'chevron-up',
  down: 'chevron-down',
} as const;

export type ChevronDirection = keyof typeof NAMES;

export function ChevronIcon({
  direction,
  color,
  size = 16,
}: {
  direction: ChevronDirection;
  color: string;
  size?: number;
}) {
  return <Feather name={NAMES[direction]} size={size} color={color} />;
}

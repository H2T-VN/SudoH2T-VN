import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Box,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  CircleX,
  Clock3,
  Download,
  ExternalLink,
  Facebook,
  Filter,
  Github,
  Grid2X2,
  Home,
  Layers3,
  Menu,
  Moon,
  MoreHorizontal,
  Play,
  RefreshCw,
  Scale,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Upload,
  type LucideIcon,
} from 'lucide-react'

export type IconName = 'grid' | 'home' | 'box' | 'layers' | 'target' | 'alert' | 'scale' | 'chart' | 'search' | 'bell' | 'sun' | 'moon' | 'arrow' | 'upload' | 'play' | 'chevron' | 'check' | 'close' | 'menu' | 'filter' | 'download' | 'external' | 'spark' | 'refresh' | 'settings' | 'github' | 'facebook' | 'clock' | 'dots'

interface IconProps extends Omit<React.ComponentProps<LucideIcon>, 'size'> {
  name: IconName
  size?: number
}

const icons: Record<IconName, LucideIcon> = {
  grid: Grid2X2,
  home: Home,
  box: Box,
  layers: Layers3,
  target: Target,
  alert: AlertTriangle,
  scale: Scale,
  chart: ChartNoAxesColumnIncreasing,
  search: Search,
  bell: Bell,
  sun: Sun,
  moon: Moon,
  arrow: ArrowRight,
  upload: Upload,
  play: Play,
  chevron: ChevronRight,
  check: Check,
  close: CircleX,
  menu: Menu,
  filter: Filter,
  download: Download,
  external: ExternalLink,
  spark: Sparkles,
  refresh: RefreshCw,
  settings: Settings2,
  github: Github,
  facebook: Facebook,
  clock: Clock3,
  dots: MoreHorizontal,
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  const LucideIcon = icons[name]
  return <LucideIcon aria-hidden="true" size={size} strokeWidth={1.8} {...props} />
}

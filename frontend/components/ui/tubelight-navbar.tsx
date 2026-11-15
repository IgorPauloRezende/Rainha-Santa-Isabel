import React, { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  name: string;
  url: string;
  icon?: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(items[0]?.name ?? '');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-mobile={isMobile ? 'true' : 'false'}
        className={cn(
          'fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6',
          className,
        )}
      >
        <div className="flex items-center gap-3 bg-background/80 border border-border backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <a
                key={item.name}
                href={item.url}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  'relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors',
                  'text-foreground/80 hover:text-primary',
                  isActive && 'bg-muted text-primary',
                )}
              >
                <span className={Icon ? 'hidden md:inline' : 'inline'}>{item.name}</span>
                {Icon && (
                  <span className="md:hidden">
                    <Icon size={18} strokeWidth={2.5} />
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="lamp-standalone"
                    className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#218838] rounded-t-full">
                      <div className="absolute w-12 h-6 bg-[#218838]/25 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-[#218838]/25 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-[#218838]/25 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </MotionConfig>
  );
}

interface TubelightNavLinksProps {
  items: { name: string; url: string }[];
  activeUrl: string;
  onSelect: (url: string) => void;
  className?: string;
  layoutId?: string;
}

export function TubelightNavLinks({
  items,
  activeUrl,
  onSelect,
  className,
  layoutId = 'lamp',
}: TubelightNavLinksProps) {
  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Navegação principal"
        className={cn('hidden lg:flex items-center gap-0.5 text-[13px] font-medium', className)}
      >
        {items.map((item) => {
          const isActive = activeUrl === item.url;

          return (
            <a
              key={item.url}
              href={item.url}
              onClick={() => onSelect(item.url)}
              aria-current={isActive ? 'location' : undefined}
              className={cn(
                'relative cursor-pointer px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap select-none',
                isActive
                  ? 'text-[#1D1D1F] dark:text-white'
                  : 'text-[#424245] hover:text-[#1D1D1F] hover:bg-black/[0.03] dark:text-[#A1A1A6] dark:hover:text-white dark:hover:bg-white/[0.06]',
              )}
            >
              <span className="relative z-10">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 w-full bg-black/[0.055] dark:bg-white/[0.11] rounded-full z-0 pointer-events-none"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-[#218838] dark:bg-[#30D158] rounded-t-full">
                    <div className="absolute w-11 h-5 bg-[#218838]/25 dark:bg-[#30D158]/35 rounded-full blur-md -top-1.5 -left-2" />
                    <div className="absolute w-7 h-5 bg-[#218838]/25 dark:bg-[#30D158]/35 rounded-full blur-md -top-0.5 left-0" />
                    <div className="absolute w-4 h-3.5 bg-[#218838]/30 dark:bg-[#30D158]/45 rounded-full blur-sm top-0 left-1.5" />
                  </div>
                </motion.div>
              )}
            </a>
          );
        })}
      </nav>
    </MotionConfig>
  );
}

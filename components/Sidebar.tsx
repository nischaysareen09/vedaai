'use client';

import {
  Home,
  Users,
  FileText,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTeacherProfile } from '@/lib/teacher-profile';
import { useSidebar } from '@/lib/sidebar-state';

const navItems = [
  {
    icon: Home,
    label: 'Home',
    href: '/dashboard',
  },
  {
    icon: Users,
    label: 'My Classroom',
    href: '/classroom',
  },
  {
    icon: ClipboardList,
    label: 'Assignments',
    href: '/assignments',
  },
  {
    icon: FileText,
    label: 'Exams',
    href: '/',
  },
  {
    icon: BookOpen,
    label: 'My Library',
    href: '/library',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Wraps a collapsed-state nav/action item with a small floating tooltip
 * that only renders when the sidebar is collapsed — expanded mode already
 * shows the label inline, so no tooltip is needed there.
 */
function CollapsedTooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return <>{children}</>;

  return (
    <div className="group/tooltip relative">
      {children}
      <span
        className="
          pointer-events-none
          absolute
          left-full
          top-1/2
          -translate-y-1/2
          ml-3
          whitespace-nowrap
          rounded-md
          bg-gray-900
          px-2.5
          py-1.5
          text-xs
          font-medium
          text-white
          opacity-0
          scale-95
          shadow-lg
          transition-all
          duration-150
          group-hover/tooltip:opacity-100
          group-hover/tooltip:scale-100
          z-50
        "
      >
        {label}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, openEditor } = useTeacherProfile();
  const { isCollapsed, isReady, toggleCollapsed } = useSidebar();

  // Avoid rendering the collapsed layout before we've read localStorage —
  // prevents a one-frame flash of the wrong width on load.
  const collapsed = isReady && isCollapsed;

  return (
    <aside
      className={`
        hidden
        md:flex
        ${collapsed ? 'w-20' : 'w-64'}
        shrink-0
        bg-white
        border-r
        border-gray-200
        flex-col
        h-screen
        fixed
        left-0
        top-0
        z-40
        transition-[width]
        duration-300
        ease-in-out
      `}
    >
      {/* =====================================================
          TOGGLE BUTTON — floats on the sidebar's right edge
          ===================================================== */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="
          absolute
          -right-3
          top-8
          z-50
          flex
          h-6
          w-6
          items-center
          justify-center
          rounded-full
          border
          border-gray-200
          bg-white
          text-gray-500
          shadow-sm
          transition-all
          hover:border-gray-300
          hover:text-gray-900
          hover:shadow-md
          active:scale-90
        "
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>

      {/* =====================================================
          LOGO
          ===================================================== */}
      <div
        className={`
          border-b border-gray-200 transition-[padding] duration-300
          ${collapsed ? 'p-4' : 'p-6'}
        `}
      >
        <div
          className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>

          <span
            className={`
              font-bold text-xl text-gray-900 whitespace-nowrap
              transition-all duration-200
              ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}
            `}
          >
            VedaAI
          </span>
        </div>
      </div>

      {/* =====================================================
          AI TEACHER'S TOOLKIT
          ===================================================== */}
      <div className={`transition-[padding] duration-300 ${collapsed ? 'p-3' : 'p-4'}`}>
        <CollapsedTooltip label="AI Teacher's Toolkit" show={collapsed}>
          <button
            type="button"
            className={`
              w-full
              bg-gradient-to-r
              from-red-500
              to-orange-500
              text-white
              rounded-lg
              font-medium
              text-sm
              flex
              items-center
              justify-center
              gap-2
              hover:from-red-600
              hover:to-orange-600
              transition-all
              shadow-md
              hover:shadow-lg
              active:scale-[0.98]
              ${collapsed ? 'h-10 px-0' : 'px-4 py-2.5'}
            `}
          >
            <span className="text-lg shrink-0" aria-hidden="true">
              ✨
            </span>

            {!collapsed && "AI Teacher's Toolkit"}
          </button>
        </CollapsedTooltip>
      </div>

      {/* =====================================================
          NAVIGATION
          ===================================================== */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <CollapsedTooltip label={item.label} show={collapsed}>
                  <Link
                    href={item.href}
                    className={`
                      flex
                      items-center
                      gap-3
                      py-2.5
                      rounded-lg
                      transition-all
                      ${collapsed ? 'justify-center px-0' : 'px-4'}
                      ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />

                    <span
                      className={`
                        font-medium text-sm whitespace-nowrap
                        transition-all duration-200
                        ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}
                      `}
                    >
                      {item.label}
                    </span>
                  </Link>
                </CollapsedTooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* =====================================================
          TEACHER / SCHOOL PROFILE
          ===================================================== */}
      <CollapsedTooltip
        label={profile ? `${profile.teacherName} · ${profile.schoolName}` : 'Add your name & school'}
        show={collapsed}
      >
        <button
          type="button"
          onClick={openEditor}
          className={`
            group
            m-4
            bg-gray-50
            hover:bg-orange-50
            rounded-lg
            border
            border-dashed
            border-gray-300
            hover:border-orange-300
            transition-colors
            text-left
            shrink-0
            w-[calc(100%-2rem)]
            ${collapsed ? 'p-2 flex justify-center' : 'p-3'}
          `}
        >
          {profile ? (
            <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'gap-0' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {initials(profile.teacherName)}
              </div>

              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {profile.teacherName}
                    </p>

                    <p className="text-xs text-gray-500 truncate">
                      {profile.schoolName}
                      {profile.schoolArea ? ` · ${profile.schoolArea}` : ''}
                    </p>
                  </div>

                  <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-500 shrink-0 transition-colors" />
                </>
              )}
            </div>
          ) : (
            <div className={`flex items-center gap-3 ${collapsed ? 'gap-0' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-gray-400" />
              </div>

              {!collapsed && (
                <p className="text-sm text-gray-500">Add your name &amp; school</p>
              )}
            </div>
          )}
        </button>
      </CollapsedTooltip>
    </aside>
  );
}
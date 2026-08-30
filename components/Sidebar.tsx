'use client';

import { Home, Users, FileText, ClipboardList, BookOpen, GraduationCap, Pencil } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTeacherProfile } from '@/lib/teacher-profile';

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Users, label: 'My Classroom', href: '/classroom' },
  { icon: ClipboardList, label: 'Assignments', href: '/assignments' },
  { icon: FileText, label: 'Exams', href: '/' },
  { icon: BookOpen, label: 'My Library', href: '/library' },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, openEditor } = useTeacherProfile();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-xl text-gray-900">VedaAI</span>
        </div>
      </div>

      {/* AI Teacher's Toolkit Button */}
      <div className="p-4">
        <button className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
          <span className="text-lg">✨</span>
          AI Teacher's Toolkit
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Teacher / school identity — click to edit */}
      <button
        onClick={openEditor}
        className="group m-4 p-3 bg-gray-50 hover:bg-orange-50 rounded-lg border border-dashed border-gray-300 hover:border-orange-300 transition-colors text-left"
      >
        {profile ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {initials(profile.teacherName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{profile.teacherName}</p>
              <p className="text-xs text-gray-500 truncate">
                {profile.schoolName}
                {profile.schoolArea ? ` · ${profile.schoolArea}` : ''}
              </p>
            </div>
            <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-500 shrink-0 transition-colors" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Add your name &amp; school</p>
          </div>
        )}
      </button>
    </aside>
  );
}
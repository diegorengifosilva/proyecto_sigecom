import { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './projects.css';

export function ProjectsModuleBootstrap({ children }: PropsWithChildren) {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const names = user.fullName?.trim().split(/\s+/) ?? [];
    localStorage.setItem('usuario_pm', JSON.stringify({
      first_name: names[0] ?? user.username,
      last_name: names.slice(1).join(' '),
      rol: user.role,
      timezone: 'America/Lima',
    }));
  }, [user]);
  return <div className="projects-module-scope">{children}</div>;
}

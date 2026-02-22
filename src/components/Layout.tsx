import React from 'react';
import AppSidebar from './AppSidebar';
import CommandPalette from './CommandPalette';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen mesh-bg noise-overlay">
      <AppSidebar />
      <CommandPalette />
      <main className="flex-1 ml-64 p-6 transition-all duration-300 relative z-[1]">
        {children}
      </main>
    </div>
  );
};

export default Layout;

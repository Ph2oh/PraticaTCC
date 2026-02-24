import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { GlobalSearch } from "./GlobalSearch";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Header Global */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:px-8 shrink-0 justify-between shadow-sm">
          <div className="flex-1" />
          <GlobalSearch />
        </header>

        <div className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

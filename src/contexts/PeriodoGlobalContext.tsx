import React, { createContext, useContext, useState, ReactNode } from "react";

interface PeriodoGlobalContextType {
  mesAnoGlobal: Date;
  setMesAnoGlobal: (date: Date) => void;
}

const PeriodoGlobalContext = createContext<PeriodoGlobalContextType | undefined>(undefined);

export function PeriodoGlobalProvider({ children }: { children: ReactNode }) {
  // Inicializamos a data global como o momento atual
  const [mesAnoGlobal, setMesAnoGlobal] = useState<Date>(new Date());

  return (
    <PeriodoGlobalContext.Provider value={{ mesAnoGlobal, setMesAnoGlobal }}>
      {children}
    </PeriodoGlobalContext.Provider>
  );
}

export function usePeriodoGlobal() {
  const context = useContext(PeriodoGlobalContext);
  if (context === undefined) {
    throw new Error("usePeriodoGlobal deve ser usado dentro de um PeriodoGlobalProvider");
  }
  return context;
}

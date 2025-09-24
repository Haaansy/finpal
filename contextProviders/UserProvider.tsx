// theme-context.tsx
import { getUser } from "@/database/userinfo";
import React, { createContext, useContext, useEffect, useState } from "react";

type UserContextType = {
  user: string;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getUser();
      setUser(data?.name);
    })();
  }, []);

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx)
    throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
}

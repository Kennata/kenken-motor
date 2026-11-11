import { createContext, useContext } from 'react'

export const UserContext = createContext(null)

export function useCurrentUser() {
  return useContext(UserContext)
}

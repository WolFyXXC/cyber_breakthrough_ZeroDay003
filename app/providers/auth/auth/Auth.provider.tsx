import { createContext, FC, PropsWithChildren, useEffect, useState } from 'react';
import { View } from 'react-native';
import { IContext, TypeUserState } from './auth-provider.inteface';
import * as SplashScreeen from 'expo-splash-screen'
import { IUser } from '@/types/user.interface';

export const AuthContext = createContext({} as IContext)

let ignore = SplashScreeen.preventAutoHideAsync( )
const AuthProvider : FC<PropsWithChildren<unknown>> = ({ children }) => {
    const [user, setUser] = useState<TypeUserState>({} as IUser) 


    useEffect (() => {
        let mounted = true 

        const checkAccessToken =  async  () => {
            try 
            {
                
            } catch 
            {
                
            } finally 
            {
                await SplashScreeen.hideAsync()

            }
        } 
        let ignore = checkAccessToken()
        return () => { mounted = false }
    }, [])

    return <AuthContext.Provider value={{user, setUser}}> 
    {children}
    </AuthContext.Provider>
}

export default AuthProvider
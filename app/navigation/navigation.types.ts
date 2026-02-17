import { ComponentType } from "react"

export type TypeRootStackParamList = {
    Home: undefined
    Profile: undefined
}

export interface IROUTE {
    name: keyof TypeRootStackParamList 
    component: ComponentType 
}
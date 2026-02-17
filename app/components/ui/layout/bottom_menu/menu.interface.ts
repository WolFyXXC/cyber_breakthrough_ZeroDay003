import { TypeRootStackParamList } from "@/navigation/navigation.types";
import { TypeFeatherIconNames } from "@/types/icon.interface";

export type TabName = keyof TypeRootStackParamList;

export interface ITab {
    name: TabName;
    label: string;
}

export interface IMenuItem {
    icon: TypeFeatherIconNames,
    path: keyof TypeRootStackParamList
}

export type TypeNavigate = (screenName: keyof TypeRootStackParamList) => void
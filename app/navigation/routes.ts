import { Component } from "react";
import { IROUTE } from "./navigation.types";
import Home from "@/components/screens/home/Home";
import Profile from "@/components/screens/profile/Profile";
export const routes:IROUTE[] = [
    
    {
        name: 'Home',
        component: Home
    },
    {
        name: 'Profile',
        component: Profile
    }

]
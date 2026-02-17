import {FC} from 'react';
import { View, Text, Pressable } from 'react-native';
import { IMenuItem, TypeNavigate } from './menu.interface';
import {Feather} from '@expo/vector-icons'

interface IMenuItemProps {
  item: IMenuItem
  nav: TypeNavigate
  currentRoute ?: string
}

const MenuItem: FC<IMenuItemProps> = ({ item, nav, currentRoute }) => {

  const isActive = currentRoute === item.path

  return (
    <Pressable 
    onPress={() => nav(item.path)} 
    className='items-center w-[20%]'
    >
       <Feather
       name={item.icon}
       size={26}
       color={isActive ? '#FFD700' : '#374151'}
       />
    </Pressable>
  )
}

export default MenuItem 
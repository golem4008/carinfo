/**
 * 能源类型配置
 * 此文件用于集中管理所有能源类型的配置信息
 */

// 定义能源类型接口
export interface EnergyType {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

// 能源类型配置数据
export const energyTypes: EnergyType[] = [
  {
    id: 'pureElectric',
    name: '纯电',
    color: '#3b82f6',
    icon: 'fa-bolt'
  },
  {
    id: 'plugInHybrid',
    name: '插混',
    color: '#10b981',
    icon: 'fa-plug'
  },
  {
    id: 'extendedRange',
    name: '增程',
    color: '#8b5cf6',
    icon: 'fa-battery-full'
  },
  {
    id: 'fuel',
    name: '燃油',
    color: '#ef4444',
    icon: 'fa-fire'
  }
];

// 获取所有能源类型名称
export const getEnergyTypeNames = (): string[] => {
  return energyTypes.map(type => type.name);
};

// 根据能源类型名称获取颜色
export const getEnergyTypeColor = (name: string): string => {
  const energyType = energyTypes.find(type => type.name === name);
  return energyType?.color || '#6b7280';
};

// 根据能源类型名称获取图标
export const getEnergyTypeIcon = (name: string): string => {
  const energyType = energyTypes.find(type => type.name === name);
  return energyType?.icon || 'fa-question';
};